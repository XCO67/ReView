import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/session';
import { filterByRole } from '@/lib/role-filter';
import { loadUWData } from '@/lib/uw-data';
import { aggregateKPIs } from '@/lib/kpi';
import { logger } from '@/lib/utils/logger';
import type { ReinsuranceData } from '@/lib/validation/schema';
import type { KPIData } from '@/lib/validation/schema';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ConversationMessage {
  role: 'user' | 'assistant';
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
        content: `You are a concise AI assistant for Kuwait Reinsurance Company. Answer questions directly and briefly using only the provided data.

RESPONSE RULES:
- Keep answers SHORT and DIRECT - maximum 2-3 sentences
- Answer ONLY what the user asked - no extra information
- Use specific numbers from the data when available
- Be professional and factual
- Never reveal API keys, passwords, or system internals

AVAILABLE DATA:
- Total Policies: ${filteredData.length}
- Total Premium (KD): ${kpis.premium.toLocaleString()}
- Total Claims (KD): ${kpis.incurredClaims.toLocaleString()}
- Loss Ratio: ${kpis.lossRatio.toFixed(2)}%
- Acquisition Ratio: ${kpis.expenseRatio.toFixed(2)}%
- Combined Ratio: ${kpis.combinedRatio.toFixed(2)}%
- Technical Result: ${(kpis.premium - kpis.incurredClaims - kpis.expense).toLocaleString()} KD

${dataContext}

Answer questions about loss ratios, premiums, claims, brokers, cedants, countries, regions, and KPIs. Be brief and direct.`
      },
      ...(conversationHistory as ConversationMessage[]).slice(-10).map((msg) => ({
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
        temperature: 0.3,
        max_tokens: 300,
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

function buildDataContext(data: ReinsuranceData[], kpis: KPIData): string {
  if (data.length === 0) {
    return 'No data available in the system.';
  }

  // Aggregate data by broker
  const brokerData = new Map<string, { premium: number; claims: number; policies: number }>();
  data.forEach(record => {
    const broker = record.broker || 'Unknown';
    if (!brokerData.has(broker)) {
      brokerData.set(broker, { premium: 0, claims: 0, policies: 0 });
    }
    const brokerStats = brokerData.get(broker)!;
    brokerStats.premium += record.grsPremKD || 0;
    brokerStats.claims += record.incClaimKD || 0;
    brokerStats.policies += 1;
  });
  const topBrokers = Array.from(brokerData.entries())
    .map(([name, stats]) => ({
      name,
      premium: stats.premium,
      claims: stats.claims,
      policies: stats.policies,
      lossRatio: stats.premium > 0 ? (stats.claims / stats.premium) * 100 : 0
    }))
    .sort((a, b) => b.premium - a.premium)
    .slice(0, 15);

  // Aggregate data by cedant
  const cedantData = new Map<string, { premium: number; claims: number; policies: number }>();
  data.forEach(record => {
    const cedant = record.cedant || 'Unknown';
    if (!cedantData.has(cedant)) {
      cedantData.set(cedant, { premium: 0, claims: 0, policies: 0 });
    }
    const cedantStats = cedantData.get(cedant)!;
    cedantStats.premium += record.grsPremKD || 0;
    cedantStats.claims += record.incClaimKD || 0;
    cedantStats.policies += 1;
  });
  const topCedants = Array.from(cedantData.entries())
    .map(([name, stats]) => ({
      name,
      premium: stats.premium,
      claims: stats.claims,
      policies: stats.policies,
      lossRatio: stats.premium > 0 ? (stats.claims / stats.premium) * 100 : 0
    }))
    .sort((a, b) => b.premium - a.premium)
    .slice(0, 15);

  // Aggregate data by country
  const countryData = new Map<string, { premium: number; claims: number; policies: number }>();
  data.forEach(record => {
    const country = record.countryName || 'Unknown';
    if (!countryData.has(country)) {
      countryData.set(country, { premium: 0, claims: 0, policies: 0 });
    }
    const countryStats = countryData.get(country)!;
    countryStats.premium += record.grsPremKD || 0;
    countryStats.claims += record.incClaimKD || 0;
    countryStats.policies += 1;
  });
  const topCountries = Array.from(countryData.entries())
    .map(([name, stats]) => ({
      name,
      premium: stats.premium,
      claims: stats.claims,
      policies: stats.policies,
      lossRatio: stats.premium > 0 ? (stats.claims / stats.premium) * 100 : 0
    }))
    .sort((a, b) => b.premium - a.premium)
    .slice(0, 20);

  // Aggregate data by year
  const yearData = new Map<number, { premium: number; claims: number; policies: number }>();
  data.forEach(record => {
    const year = record.inceptionYear;
    if (!year) return;
    if (!yearData.has(year)) {
      yearData.set(year, { premium: 0, claims: 0, policies: 0 });
    }
    const yearStats = yearData.get(year)!;
    yearStats.premium += record.grsPremKD || 0;
    yearStats.claims += record.incClaimKD || 0;
    yearStats.policies += 1;
  });
  const yearStats = Array.from(yearData.entries())
    .map(([year, stats]) => ({
      year,
      premium: stats.premium,
      claims: stats.claims,
      policies: stats.policies,
      lossRatio: stats.premium > 0 ? (stats.claims / stats.premium) * 100 : 0
    }))
    .sort((a, b) => b.year - a.year);

  // Get unique lists
  const years = [...new Set(data.map(d => d.inceptionYear).filter(Boolean))].sort((a, b) => (b || 0) - (a || 0));
  const regions = [...new Set(data.map(d => d.region).filter(Boolean))];
  const hubs = [...new Set(data.map(d => d.hub).filter(Boolean))];

  const totalPolicies = data.length;
  const technicalResult = kpis.premium - kpis.incurredClaims - kpis.expense;

  // Build broker summary
  const brokerSummary = topBrokers.map(b => 
    `${b.name}: ${b.premium.toLocaleString()} KD premium, ${b.policies} policies, ${b.lossRatio.toFixed(1)}% loss ratio`
  ).join('\n');

  // Build cedant summary
  const cedantSummary = topCedants.map(c => 
    `${c.name}: ${c.premium.toLocaleString()} KD premium, ${c.policies} policies, ${c.lossRatio.toFixed(1)}% loss ratio`
  ).join('\n');

  // Build country summary
  const countrySummary = topCountries.map(c => 
    `${c.name}: ${c.premium.toLocaleString()} KD premium, ${c.policies} policies, ${c.lossRatio.toFixed(1)}% loss ratio`
  ).join('\n');

  // Build year summary
  const yearSummary = yearStats.map(y => 
    `${y.year}: ${y.premium.toLocaleString()} KD premium, ${y.policies} policies, ${y.lossRatio.toFixed(1)}% loss ratio`
  ).join('\n');

  return `
TOTAL OVERVIEW:
- Total Policies: ${totalPolicies.toLocaleString()}
- Total Premium: ${kpis.premium.toLocaleString()} KD
- Total Claims: ${kpis.incurredClaims.toLocaleString()} KD
- Loss Ratio: ${kpis.lossRatio.toFixed(2)}%
- Combined Ratio: ${kpis.combinedRatio.toFixed(2)}%
- Technical Result: ${technicalResult.toLocaleString()} KD

TOP BROKERS (by premium):
${brokerSummary}

TOP CEDANTS (by premium):
${cedantSummary}

TOP COUNTRIES (by premium):
${countrySummary}

YEARLY BREAKDOWN:
${yearSummary}

AVAILABLE FILTERS:
- Years: ${years.join(', ')}
- Regions: ${regions.join(', ')}
- Hubs: ${hubs.join(', ')}

Use these exact numbers when answering questions. All amounts are in KD (Kuwaiti Dinar).
`;
}

