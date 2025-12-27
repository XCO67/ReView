import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/session';
import { filterByRole } from '@/lib/role-filter';
import { loadUWData } from '@/lib/uw-data';
import { aggregateKPIs } from '@/lib/kpi';
import { logger } from '@/lib/utils/logger';
import type { KPIData, ReinsuranceData } from '@/lib/validation/schema';

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
        content: `You are an expert AI assistant for Kuwait Reinsurance Company. You have complete access to all reinsurance data in the PostgreSQL database. Answer questions accurately using the detailed data provided below.

RESPONSE RULES:
- Answer questions directly and accurately using the provided data
- Use specific numbers, percentages, and metrics from the data
- If asked about specific entities (brokers, cedants, countries, etc.), provide exact numbers
- Be professional, factual, and helpful
- Never reveal API keys, passwords, or system internals
- You can answer questions about ANY aspect of the data: premiums, claims, loss ratios, brokers, cedants, countries, regions, hubs, extension types, classes, channels, arrangements, years, quarters, months, and more

DATABASE OVERVIEW:
- Total Policies: ${filteredData.length}
- Total Premium (KD): ${kpis.premium.toLocaleString()}
- Total Claims (KD): ${kpis.incurredClaims.toLocaleString()}
- Paid Claims (KD): ${kpis.paidClaims.toLocaleString()}
- Outstanding Claims (KD): ${kpis.outstandingClaims.toLocaleString()}
- Acquisition Cost (KD): ${kpis.expense.toLocaleString()}
- Loss Ratio: ${kpis.lossRatio.toFixed(2)}%
- Acquisition Ratio: ${kpis.expenseRatio.toFixed(2)}%
- Combined Ratio: ${kpis.combinedRatio.toFixed(2)}%
- Technical Result: ${(kpis.premium - kpis.incurredClaims - kpis.expense).toLocaleString()} KD
- Average Premium per Policy: ${(kpis.premium / filteredData.length).toLocaleString()} KD
- Average Claims per Policy: ${(kpis.incurredClaims / filteredData.length).toLocaleString()} KD

${dataContext}

You have access to comprehensive data including:
- Detailed breakdowns by broker, cedant, country, region, hub
- Extension types, classes, channels, and arrangements
- Yearly, quarterly, and monthly analysis
- Loss ratios, premiums, claims for any dimension
- Policy counts, averages, and statistics

Answer any question about the data with specific numbers and insights.`
      },
      ...(conversationHistory as ConversationMessage[]).slice(-10).map((msg): ChatMessage => ({
        role: (msg.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
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
        max_tokens: 500,
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

  // Helper function to aggregate data
  function aggregateBy(field: keyof ReinsuranceData, limit = 20) {
    const map = new Map<string, { 
      premium: number; 
      claims: number; 
      paidClaims: number;
      osClaims: number;
      policies: number;
      expense: number;
    }>();
    
    data.forEach(record => {
      const key = String(record[field] || 'Unknown');
      if (!map.has(key)) {
        map.set(key, { premium: 0, claims: 0, paidClaims: 0, osClaims: 0, policies: 0, expense: 0 });
      }
      const stats = map.get(key)!;
      stats.premium += record.grsPremKD || 0;
      stats.claims += record.incClaimKD || 0;
      stats.paidClaims += record.paidClaimsKD || 0;
      stats.osClaims += record.osClaimKD || 0;
      stats.expense += record.acqCostKD || 0;
      stats.policies += 1;
    });
    
    return Array.from(map.entries())
      .map(([name, stats]) => ({
        name,
        premium: stats.premium,
        claims: stats.claims,
        paidClaims: stats.paidClaims,
        osClaims: stats.osClaims,
        expense: stats.expense,
        policies: stats.policies,
        lossRatio: stats.premium > 0 ? (stats.claims / stats.premium) * 100 : 0,
        expenseRatio: stats.premium > 0 ? (stats.expense / stats.premium) * 100 : 0,
        combinedRatio: stats.premium > 0 ? ((stats.claims + stats.expense) / stats.premium) * 100 : 0
      }))
      .sort((a, b) => b.premium - a.premium)
      .slice(0, limit);
  }

  // Aggregate by various dimensions
  const topBrokers = aggregateBy('broker', 20);
  const topCedants = aggregateBy('cedant', 20);
  const topCountries = aggregateBy('countryName', 25);
  const topRegions = aggregateBy('region', 15);
  const topHubs = aggregateBy('hub', 15);
  const topExtTypes = aggregateBy('extType', 15);
  const topChannels = aggregateBy('channel', 10);
  const topArrangements = aggregateBy('arrangement', 10);
  const topClasses = aggregateBy('className', 15);

  // Yearly breakdown
  const yearData = new Map<number, { premium: number; claims: number; policies: number; expense: number }>();
  data.forEach(record => {
    const year = record.inceptionYear;
    if (!year) return;
    if (!yearData.has(year)) {
      yearData.set(year, { premium: 0, claims: 0, policies: 0, expense: 0 });
    }
    const stats = yearData.get(year)!;
    stats.premium += record.grsPremKD || 0;
    stats.claims += record.incClaimKD || 0;
    stats.expense += record.acqCostKD || 0;
    stats.policies += 1;
  });
  const yearStats = Array.from(yearData.entries())
    .map(([year, stats]) => ({
      year,
      premium: stats.premium,
      claims: stats.claims,
      expense: stats.expense,
      policies: stats.policies,
      lossRatio: stats.premium > 0 ? (stats.claims / stats.premium) * 100 : 0,
      expenseRatio: stats.premium > 0 ? (stats.expense / stats.premium) * 100 : 0,
      combinedRatio: stats.premium > 0 ? ((stats.claims + stats.expense) / stats.premium) * 100 : 0
    }))
    .sort((a, b) => b.year - a.year);

  // Quarterly breakdown
  const quarterData = new Map<string, { premium: number; claims: number; policies: number }>();
  data.forEach(record => {
    if (!record.inceptionYear || !record.inceptionQuarter) return;
    const key = `${record.inceptionYear}-Q${record.inceptionQuarter}`;
    if (!quarterData.has(key)) {
      quarterData.set(key, { premium: 0, claims: 0, policies: 0 });
    }
    const stats = quarterData.get(key)!;
    stats.premium += record.grsPremKD || 0;
    stats.claims += record.incClaimKD || 0;
    stats.policies += 1;
  });
  const quarterStats = Array.from(quarterData.entries())
    .map(([quarter, stats]) => ({
      quarter,
      premium: stats.premium,
      claims: stats.claims,
      policies: stats.policies,
      lossRatio: stats.premium > 0 ? (stats.claims / stats.premium) * 100 : 0
    }))
    .sort((a, b) => b.quarter.localeCompare(a.quarter))
    .slice(0, 12);

  // Statistical summaries
  const premiums = data.map(d => d.grsPremKD || 0).filter(p => p > 0);
  const claims = data.map(d => d.incClaimKD || 0).filter(c => c > 0);
  const avgPremium = premiums.length > 0 ? premiums.reduce((a, b) => a + b, 0) / premiums.length : 0;
  const avgClaims = claims.length > 0 ? claims.reduce((a, b) => a + b, 0) / claims.length : 0;
  const maxPremium = premiums.length > 0 ? Math.max(...premiums) : 0;
  const maxClaims = claims.length > 0 ? Math.max(...claims) : 0;

  // Get unique values
  const years = [...new Set(data.map(d => d.inceptionYear).filter(Boolean))].sort((a, b) => (b || 0) - (a || 0));
  const regions = [...new Set(data.map(d => d.region).filter(Boolean))].sort();
  const hubs = [...new Set(data.map(d => d.hub).filter(Boolean))].sort();
  const extTypes = [...new Set(data.map(d => d.extType).filter(Boolean))].sort();
  const channels = [...new Set(data.map(d => d.channel).filter(Boolean))].filter(Boolean).sort();
  const arrangements = [...new Set(data.map(d => d.arrangement).filter(Boolean))].filter(Boolean).sort();

  const totalPolicies = data.length;
  const technicalResult = kpis.premium - kpis.incurredClaims - kpis.expense;

  // Build summaries
  const formatSummary = (items: typeof topBrokers, label: string) => {
    if (items.length === 0) return '';
    return `\n${label}:\n${items.map(item => 
      `  ${item.name}: ${item.premium.toLocaleString()} KD premium, ${item.policies} policies, ${item.lossRatio.toFixed(1)}% loss ratio, ${item.combinedRatio.toFixed(1)}% combined ratio`
    ).join('\n')}`;
  };

  return `
COMPREHENSIVE DATABASE CONTEXT:

OVERALL METRICS:
- Total Policies: ${totalPolicies.toLocaleString()}
- Total Premium: ${kpis.premium.toLocaleString()} KD
- Total Incurred Claims: ${kpis.incurredClaims.toLocaleString()} KD
- Total Paid Claims: ${kpis.paidClaims.toLocaleString()} KD
- Total Outstanding Claims: ${kpis.outstandingClaims.toLocaleString()} KD
- Total Acquisition Cost: ${kpis.expense.toLocaleString()} KD
- Loss Ratio: ${kpis.lossRatio.toFixed(2)}%
- Acquisition Ratio: ${kpis.expenseRatio.toFixed(2)}%
- Combined Ratio: ${kpis.combinedRatio.toFixed(2)}%
- Technical Result: ${technicalResult.toLocaleString()} KD ${technicalResult > 0 ? '(Profitable)' : '(Loss)'}
- Average Premium per Policy: ${avgPremium.toLocaleString()} KD
- Average Claims per Policy: ${avgClaims.toLocaleString()} KD
- Maximum Single Policy Premium: ${maxPremium.toLocaleString()} KD
- Maximum Single Policy Claims: ${maxClaims.toLocaleString()} KD

${formatSummary(topBrokers, 'TOP BROKERS (by premium)')}
${formatSummary(topCedants, 'TOP CEDANTS (by premium)')}
${formatSummary(topCountries, 'TOP COUNTRIES (by premium)')}
${formatSummary(topRegions, 'REGIONS (by premium)')}
${formatSummary(topHubs, 'HUBS (by premium)')}
${formatSummary(topExtTypes, 'EXTENSION TYPES (by premium)')}
${topChannels.length > 0 ? formatSummary(topChannels, 'CHANNELS (by premium)') : ''}
${topArrangements.length > 0 ? formatSummary(topArrangements, 'ARRANGEMENTS (by premium)') : ''}
${topClasses.length > 0 ? formatSummary(topClasses, 'CLASSES (by premium)') : ''}

YEARLY BREAKDOWN:
${yearStats.map(y => 
  `  ${y.year}: ${y.premium.toLocaleString()} KD premium, ${y.policies} policies, ${y.lossRatio.toFixed(1)}% loss ratio, ${y.combinedRatio.toFixed(1)}% combined ratio`
).join('\n')}

${quarterStats.length > 0 ? `\nQUARTERLY BREAKDOWN (Recent):\n${quarterStats.map(q => 
  `  ${q.quarter}: ${q.premium.toLocaleString()} KD premium, ${q.policies} policies, ${q.lossRatio.toFixed(1)}% loss ratio`
).join('\n')}` : ''}

AVAILABLE DIMENSIONS:
- Years: ${years.join(', ')}
- Regions: ${regions.join(', ')}
- Hubs: ${hubs.join(', ')}
- Extension Types: ${extTypes.join(', ')}
${channels.length > 0 ? `- Channels: ${channels.join(', ')}` : ''}
${arrangements.length > 0 ? `- Arrangements: ${arrangements.join(', ')}` : ''}

DATA FIELDS AVAILABLE:
Each policy record contains: broker, cedant, country, region, hub, extension type, class, sub-class, channel, arrangement, premium (KD), acquisition cost (KD), paid claims (KD), outstanding claims (KD), incurred claims (KD), max liability (KD), sign share %, written share %, inception date, expiry date, renewal date, policy status, source, and more.

You can answer questions about any combination of these dimensions. All amounts are in KD (Kuwaiti Dinar). Use exact numbers from this data when answering questions.
`;
}

