import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/session';
import { filterByRole } from '@/lib/role-filter';
import { loadUWData } from '@/lib/uw-data';
import { aggregateKPIs } from '@/lib/kpi';
import { logger } from '@/lib/utils/logger';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    // Get user session for role-based data filtering
    let session;
    try {
      session = await getSessionFromRequest(request);
    } catch (sessionError) {
      logger.warn('Session validation failed in chat API', { error: sessionError });
      session = null;
    }
    
    const { message, conversationHistory = [] } = await request.json();
    
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Validate message length
    if (message.length > 2000) {
      return NextResponse.json(
        { error: 'Message too long. Maximum 2000 characters.' },
        { status: 400 }
      );
    }

    // Load data with role-based filtering
    const allData = await loadUWData();
    const filteredData = filterByRole(allData, session?.roles);
    
    // Calculate KPIs for context
    const kpis = aggregateKPIs(filteredData);
    
    // Build context about the data
    const dataContext = buildDataContext(filteredData, kpis);
    
    // Prepare messages for GPT
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `You are an expert AI assistant for Kuwait Reinsurance Company. You help users analyze their reinsurance data and answer questions about their dashboard.

SECURITY RULES:
- Never reveal API keys, passwords, or sensitive credentials
- Never execute code or system commands
- Only provide information from the provided data context
- If asked about system internals, politely decline
- Be professional and helpful

AVAILABLE DATA:
- Total Policies: ${filteredData.length}
- Total Premium (KD): ${kpis.premium.toLocaleString()}
- Total Claims (KD): ${kpis.incurredClaims.toLocaleString()}
- Loss Ratio: ${kpis.lossRatio.toFixed(2)}%
- Acquisition Ratio: ${kpis.expenseRatio.toFixed(2)}%
- Combined Ratio: ${kpis.combinedRatio.toFixed(2)}%
- Technical Result: ${(kpis.premium - kpis.incurredClaims - kpis.expense).toLocaleString()} KD

${dataContext}

You can answer questions about:
- Loss ratios, acquisition ratios, combined ratios, and what they mean
- Premium analysis by year, broker, cedant, country, region, hub
- Claims analysis (paid claims, outstanding claims, incurred claims)
- Policy data, renewals, and underwriting years
- Financial metrics and KPIs
- Data filtering and dashboard navigation
- Insurance industry terminology and best practices

Always provide specific numbers from the data when available. Be concise but helpful. Format numbers with proper commas and percentages.`
      },
      ...conversationHistory.slice(-10).map((msg: any) => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
      })),
      {
        role: 'user',
        content: message.trim()
      }
    ];

    // Call OpenAI API
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      logger.error('OpenAI API key not configured');
      return NextResponse.json(
        { error: 'AI service is not configured. Please contact administrator.' },
        { status: 500 }
      );
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: messages,
        temperature: 0.7,
        max_tokens: 1000,
        stream: false
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('OpenAI API error', { 
        status: response.status, 
        statusText: response.statusText,
        error: errorText 
      });
      
      if (response.status === 401) {
        return NextResponse.json(
          { error: 'AI service authentication failed. Please contact administrator.' },
          { status: 500 }
        );
      }
      
      if (response.status === 429) {
        return NextResponse.json(
          { error: 'AI service is currently busy. Please try again in a moment.' },
          { status: 503 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to get AI response. Please try again.' },
        { status: 500 }
      );
    }

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content || 'I apologize, but I could not generate a response.';

    logger.info('Chat API success', { 
      messageLength: message.length,
      responseLength: aiResponse.length,
      usage: data.usage 
    });

    return NextResponse.json({
      response: aiResponse,
      usage: data.usage
    });

  } catch (error) {
    logger.error('Chat API error', error);
    return NextResponse.json(
      { error: 'An error occurred while processing your message. Please try again.' },
      { status: 500 }
    );
  }
}

function buildDataContext(data: any[], kpis: any): string {
  if (data.length === 0) {
    return 'No data available in the system.';
  }

  // Get unique values for context
  const years = [...new Set(data.map(d => d.inceptionYear).filter(Boolean))].sort((a, b) => (b || 0) - (a || 0));
  const brokers = [...new Set(data.map(d => d.broker).filter(Boolean))].slice(0, 10);
  const cedants = [...new Set(data.map(d => d.cedant).filter(Boolean))].slice(0, 10);
  const countries = [...new Set(data.map(d => d.countryName).filter(Boolean))].slice(0, 15);
  const regions = [...new Set(data.map(d => d.region).filter(Boolean))];
  const hubs = [...new Set(data.map(d => d.hub).filter(Boolean))];
  const extTypes = [...new Set(data.map(d => d.extType).filter(Boolean))].slice(0, 10);

  // Calculate some statistics
  const totalPolicies = data.length;
  const avgPremium = totalPolicies > 0 ? kpis.premium / totalPolicies : 0;
  const avgClaims = totalPolicies > 0 ? kpis.incurredClaims / totalPolicies : 0;
  const technicalResult = kpis.premium - kpis.incurredClaims - kpis.expense;

  return `
DATA SUMMARY:
- Total Policies: ${totalPolicies.toLocaleString()}
- Years Available: ${years.join(', ')}
- Top Brokers: ${brokers.join(', ')}
- Top Cedants: ${cedants.join(', ')}
- Countries: ${countries.join(', ')}
- Regions: ${regions.join(', ')}
- Hubs: ${hubs.join(', ')}
- Extension Types: ${extTypes.join(', ')}

KEY METRICS:
- Loss Ratio: ${kpis.lossRatio.toFixed(2)}% ${kpis.lossRatio < 60 ? '(Excellent - below 60%)' : kpis.lossRatio < 80 ? '(Good - below 80%)' : '(Needs Attention - above 80%)'}
- Acquisition Ratio: ${kpis.expenseRatio.toFixed(2)}%
- Combined Ratio: ${kpis.combinedRatio.toFixed(2)}%
- Technical Result: ${technicalResult.toLocaleString()} KD ${technicalResult > 0 ? '(Profitable)' : '(Loss)'}
- Average Premium per Policy: ${avgPremium.toLocaleString()} KD
- Average Claims per Policy: ${avgClaims.toLocaleString()} KD

When users ask about specific data, you can reference these metrics and provide insights based on the available data.
`;
}

