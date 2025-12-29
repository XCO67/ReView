import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getDb } from '@/lib/database/connection';
import { initDb } from '@/lib/db';
import { fuzzyMatch } from '@/lib/utils/fuzzy-match';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await initDb();
    const db = getDb();
    const { message } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const query = message.toLowerCase().trim();
    let response = '';
    let data: any = null;

    // Loss Ratio queries (with typo tolerance)
    if (fuzzyMatch(query, ['loss ratio', 'loss', 'ratio', 'lossratio', 'loos ratio', 'los ratio', 'lossratios'])) {
      const result = await db.query(`
        SELECT 
          SUM(grs_prem_kd) as total_premium,
          SUM(paid_claims_kd) as paid_claims,
          SUM(os_claim_kd) as outstanding_claims,
          COUNT(*) as policy_count
        FROM policies
        WHERE grs_prem_kd > 0
      `);
      
      const row = result.rows[0];
      const totalPremium = parseFloat(row.total_premium) || 0;
      const paidClaims = parseFloat(row.paid_claims) || 0;
      const osClaims = parseFloat(row.outstanding_claims) || 0;
      const incurredClaims = paidClaims + osClaims;
      const lossRatio = totalPremium > 0 ? (incurredClaims / totalPremium) * 100 : 0;

      response = `**Loss Ratio: ${lossRatio.toFixed(2)}%**\n\n` +
        `• Total Premium: ${(totalPremium / 1000).toFixed(1)}K KWD\n` +
        `• Incurred Claims: ${(incurredClaims / 1000).toFixed(1)}K KWD\n` +
        `• Policies: ${row.policy_count}\n\n` +
        `*Formula: (Paid + Outstanding Claims) / Premium × 100*`;
      
      data = { lossRatio, totalPremium, incurredClaims, policyCount: row.policy_count };
    }
    // Premium queries (with typo tolerance)
    else if (fuzzyMatch(query, ['premium', 'revenue', 'total premium', 'prem', 'premiums', 'premum', 'premiun'])) {
      const result = await db.query(`
        SELECT 
          SUM(grs_prem_kd) as total_premium,
          COUNT(*) as policy_count,
          COUNT(DISTINCT broker) as broker_count,
          COUNT(DISTINCT cedant) as cedant_count
        FROM policies
      `);
      
      const row = result.rows[0];
      const totalPremium = parseFloat(row.total_premium) || 0;

      response = `**Total Premium: ${(totalPremium / 1000000).toFixed(2)}M KWD**\n\n` +
        `• Policies: ${row.policy_count}\n` +
        `• Brokers: ${row.broker_count}\n` +
        `• Cedants: ${row.cedant_count}\n\n` +
        `View detailed premium trends in the Analytics dashboard.`;
      
      data = { totalPremium, policyCount: row.policy_count };
    }
    // Top brokers/cedants (with typo tolerance)
    else if (fuzzyMatch(query, ['broker', 'top broker', 'brokers', 'brokerage', 'brok', 'top brokers'])) {
      const result = await db.query(`
        SELECT 
          broker,
          SUM(grs_prem_kd) as premium,
          COUNT(*) as policies
        FROM policies
        WHERE broker IS NOT NULL
        GROUP BY broker
        ORDER BY premium DESC
        LIMIT 5
      `);
      
      response = `**Top 5 Brokers by Premium:**\n\n`;
      result.rows.forEach((row, idx) => {
        response += `${idx + 1}. ${row.broker}\n   ${(parseFloat(row.premium) / 1000).toFixed(1)}K KWD (${row.policies} policies)\n\n`;
      });
    }
    else if (fuzzyMatch(query, ['cedant', 'top cedant', 'cedants', 'cedent', 'ced', 'top cedants'])) {
      const result = await db.query(`
        SELECT 
          cedant,
          SUM(grs_prem_kd) as premium,
          COUNT(*) as policies
        FROM policies
        WHERE cedant IS NOT NULL
        GROUP BY cedant
        ORDER BY premium DESC
        LIMIT 5
      `);
      
      response = `**Top 5 Cedants by Premium:**\n\n`;
      result.rows.forEach((row, idx) => {
        response += `${idx + 1}. ${row.cedant}\n   ${(parseFloat(row.premium) / 1000).toFixed(1)}K KWD (${row.policies} policies)\n\n`;
      });
    }
    // Claims queries (with typo tolerance)
    else if (fuzzyMatch(query, ['claim', 'claims', 'claime', 'claimz', 'claimss'])) {
      const result = await db.query(`
        SELECT 
          SUM(paid_claims_kd) as paid_claims,
          SUM(os_claim_kd) as outstanding_claims,
          SUM(inc_claim_kd) as incurred_claims,
          COUNT(*) as policy_count
        FROM policies
      `);
      
      const row = result.rows[0];
      const paid = parseFloat(row.paid_claims) || 0;
      const os = parseFloat(row.outstanding_claims) || 0;
      const incurred = parseFloat(row.incurred_claims) || 0;

      response = `**Claims Summary:**\n\n` +
        `• Paid Claims: ${(paid / 1000).toFixed(1)}K KWD\n` +
        `• Outstanding: ${(os / 1000).toFixed(1)}K KWD\n` +
        `• Total Incurred: ${(incurred / 1000).toFixed(1)}K KWD\n` +
        `• Policies: ${row.policy_count}`;
    }
    // Region queries (with typo tolerance)
    else if (fuzzyMatch(query, ['region', 'geography', 'regions', 'regional', 'geographic', 'geo'])) {
      const result = await db.query(`
        SELECT 
          region,
          SUM(grs_prem_kd) as premium,
          COUNT(*) as policies
        FROM policies
        WHERE region IS NOT NULL
        GROUP BY region
        ORDER BY premium DESC
        LIMIT 5
      `);
      
      response = `**Top Regions by Premium:**\n\n`;
      result.rows.forEach((row, idx) => {
        response += `${idx + 1}. ${row.region}\n   ${(parseFloat(row.premium) / 1000).toFixed(1)}K KWD (${row.policies} policies)\n\n`;
      });
    }
    // Class queries (with typo tolerance)
    else if (fuzzyMatch(query, ['class', 'business class', 'classes', 'business classes', 'clas', 'clss'])) {
      const result = await db.query(`
        SELECT 
          class_name,
          SUM(grs_prem_kd) as premium,
          COUNT(*) as policies
        FROM policies
        WHERE class_name IS NOT NULL
        GROUP BY class_name
        ORDER BY premium DESC
        LIMIT 5
      `);
      
      response = `**Top Business Classes:**\n\n`;
      result.rows.forEach((row, idx) => {
        response += `${idx + 1}. ${row.class_name}\n   ${(parseFloat(row.premium) / 1000).toFixed(1)}K KWD (${row.policies} policies)\n\n`;
      });
    }
    // Help/General (with typo tolerance)
    else if (fuzzyMatch(query, ['help', 'what can you', 'capabilities', 'what can', 'helpp', 'hel', 'what you do', 'features'])) {
      response = `**I can help you with:**\n\n` +
        `📊 **Metrics & Ratios**\n` +
        `• Loss ratio calculations\n` +
        `• Premium analysis\n` +
        `• Claims breakdown\n\n` +
        `📈 **Data Insights**\n` +
        `• Top brokers & cedants\n` +
        `• Regional performance\n` +
        `• Business class analysis\n\n` +
        `💡 **Dashboard Features**\n` +
        `• Filtering & search\n` +
        `• Data export\n` +
        `• Chart interpretation\n\n` +
        `*Ask me anything about your reinsurance data!*`;
    }
    // Filter/Export help (with typo tolerance)
    else if (fuzzyMatch(query, ['filter', 'search', 'export', 'filters', 'filtering', 'seach', 'serch', 'exort', 'export data', 'download'])) {
      response = `**Data Management:**\n\n` +
        `🔍 **Filtering:** Use the filter panel to search by broker, cedant, region, class, or year.\n\n` +
        `📥 **Export:** Click "Export CSV" to download filtered data.\n\n` +
        `💾 **Search:** Type in any column header to find specific values.\n\n` +
        `*All filters work together for precise analysis.*`;
    }
    // Default response
    else {
      response = `I understand you're asking about "${message}".\n\n` +
        `I can help with:\n` +
        `• Loss ratios & metrics\n` +
        `• Premium & claims data\n` +
        `• Top performers (brokers/cedants)\n` +
        `• Regional & class analysis\n` +
        `• Dashboard features\n\n` +
        `*Try: "What's the loss ratio?" or "Show top brokers"*`;
    }

    return NextResponse.json({ 
      response,
      data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to process your question. Please try again.' },
      { status: 500 }
    );
  }
}

