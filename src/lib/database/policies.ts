/**
 * Policies Database Queries
 * 
 * Handles all database operations for policy/reinsurance data.
 * Replaces CSV file loading with database queries.
 * 
 * @module database/policies
 */

import { getDb } from './connection';
import type { ReinsuranceData } from '../validation/schema';

/**
 * Load all policy data from database
 * 
 * @param {object} options - Loading options
 * @param {boolean} options.forceReload - Force reload from database (ignore cache)
 * @returns {Promise<ReinsuranceData[]>} Array of policy records
 */
export async function loadPoliciesFromDb(options?: { forceReload?: boolean }): Promise<ReinsuranceData[]> {
  const db = getDb();
  
  const result = await db.query<{
    id: number;
    uy: string;
    ext_type: string | null;
    srl: string | null;
    loc: string | null;
    class_name: string | null;
    sub_class: string | null;
    ced_territory: string | null;
    broker: string;
    cedant: string;
    org_insured_trty_name: string;
    country_name: string;
    region: string;
    hub: string;
    office: string | null;
    grs_prem_kd: number;
    acq_cost_kd: number;
    paid_claims_kd: number;
    os_claim_kd: number;
    inc_claim_kd: number;
    max_liability_kd: number;
    sign_share_pct: number;
    written_share_pct: number | null;
    inception_day: number | null;
    inception_month: number | null;
    inception_quarter: number | null;
    inception_year: number | null;
    expiry_day: number | null;
    expiry_month: number | null;
    expiry_quarter: number | null;
    expiry_year: number | null;
    renewal_date: string | null;
    renewal_day: number | null;
    renewal_month: number | null;
    renewal_quarter: number | null;
    renewal_year: number | null;
    source: string | null;
    policy_status: string | null;
    channel: string | null;
    arrangement: string | null;
    com_date: Date | null;
    expiry_date: Date | null;
  }>(`
    SELECT 
      id, uy, ext_type, srl, loc, class_name, sub_class, ced_territory,
      broker, cedant, org_insured_trty_name,
      country_name, region, hub, office,
      grs_prem_kd, acq_cost_kd, paid_claims_kd, os_claim_kd, inc_claim_kd,
      max_liability_kd, sign_share_pct, written_share_pct,
      inception_day, inception_month, inception_quarter, inception_year,
      expiry_day, expiry_month, expiry_quarter, expiry_year,
      renewal_date, renewal_day, renewal_month, renewal_quarter, renewal_year,
      source, policy_status, channel, arrangement,
      com_date, expiry_date
    FROM policies
    ORDER BY inception_year DESC, id ASC
  `);

  return result.rows.map(row => ({
    // Display fields
    uy: row.uy,
    extType: row.ext_type || 'Unknown',
    srl: row.srl || undefined,
    loc: row.loc || undefined,
    className: row.class_name || undefined,
    subClass: row.sub_class || undefined,
    cedTerritory: row.ced_territory || undefined,
    broker: row.broker,
    cedant: row.cedant,
    orgInsuredTrtyName: row.org_insured_trty_name,
    
    // Calculation fields
    countryName: row.country_name,
    region: row.region,
    hub: row.hub,
    office: row.office || undefined,
    grsPremKD: Number(row.grs_prem_kd) || 0,
    acqCostKD: Number(row.acq_cost_kd) || 0,
    paidClaimsKD: Number(row.paid_claims_kd) || 0,
    osClaimKD: Number(row.os_claim_kd) || 0,
    incClaimKD: Number(row.inc_claim_kd) || 0,
    maxLiabilityKD: Number(row.max_liability_kd) || 0,
    signSharePct: Number(row.sign_share_pct) || 0,
    writtenSharePct: row.written_share_pct ? Number(row.written_share_pct) : undefined,
    
    // Date fields
    inceptionDay: row.inception_day || undefined,
    inceptionMonth: row.inception_month || undefined,
    inceptionQuarter: row.inception_quarter || undefined,
    inceptionYear: row.inception_year || undefined,
    expiryDay: row.expiry_day || undefined,
    expiryMonth: row.expiry_month || undefined,
    expiryQuarter: row.expiry_quarter || undefined,
    expiryYear: row.expiry_year || undefined,
    renewalDate: row.renewal_date || undefined,
    renewalDay: row.renewal_day || undefined,
    renewalMonth: row.renewal_month || undefined,
    renewalQuarter: row.renewal_quarter || undefined,
    renewalYear: row.renewal_year || undefined,
    
    // Additional fields
    source: row.source || undefined,
    policyStatus: row.policy_status || undefined,
    channel: row.channel || undefined,
    arrangement: row.arrangement || undefined,
    
    // Legacy fields for backward compatibility
    comDate: row.com_date ? row.com_date.toISOString().split('T')[0] : undefined,
    expiryDate: row.expiry_date ? row.expiry_date.toISOString().split('T')[0] : undefined,
    maxLiabilityFC: Number(row.max_liability_kd) || 0,
    grossUWPrem: Number(row.grs_prem_kd) || 0,
    grossActualAcq: Number(row.acq_cost_kd) || 0,
    grossPaidClaims: Number(row.paid_claims_kd) || 0,
    grossOsLoss: Number(row.os_claim_kd) || 0,
  }));
}

/**
 * Insert a policy record into the database
 * 
 * @param {ReinsuranceData} data - Policy data to insert
 * @returns {Promise<number>} ID of inserted record
 */
export async function insertPolicy(data: ReinsuranceData): Promise<number> {
  const db = getDb();
  
  const result = await db.query<{ id: number }>(`
    INSERT INTO policies (
      uy, ext_type, srl, loc, class_name, sub_class, ced_territory,
      broker, cedant, org_insured_trty_name,
      country_name, region, hub, office,
      grs_prem_kd, acq_cost_kd, paid_claims_kd, os_claim_kd, inc_claim_kd,
      max_liability_kd, sign_share_pct, written_share_pct,
      inception_day, inception_month, inception_quarter, inception_year,
      expiry_day, expiry_month, expiry_quarter, expiry_year,
      renewal_date, renewal_day, renewal_month, renewal_quarter, renewal_year,
      source, policy_status, channel, arrangement,
      com_date, expiry_date
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
      $11, $12, $13, $14, $15, $16, $17, $18, $19,
      $20, $21, $22, $23, $24, $25, $26,
      $27, $28, $29, $30, $31, $32, $33, $34, $35,
      $36, $37, $38, $39, $40, $41
    ) RETURNING id
  `, [
    data.uy,
    data.extType || null,
    data.srl || null,
    data.loc || null,
    data.className || null,
    data.subClass || null,
    data.cedTerritory || null,
    data.broker,
    data.cedant,
    data.orgInsuredTrtyName,
    data.countryName,
    data.region,
    data.hub,
    data.office || null,
    data.grsPremKD || 0,
    data.acqCostKD || 0,
    data.paidClaimsKD || 0,
    data.osClaimKD || 0,
    data.incClaimKD || 0,
    data.maxLiabilityKD || 0,
    data.signSharePct || 0,
    data.writtenSharePct || null,
    data.inceptionDay || null,
    data.inceptionMonth || null,
    data.inceptionQuarter || null,
    data.inceptionYear || null,
    data.expiryDay || null,
    data.expiryMonth || null,
    data.expiryQuarter || null,
    data.expiryYear || null,
    data.renewalDate || null,
    data.renewalDay || null,
    data.renewalMonth || null,
    data.renewalQuarter || null,
    data.renewalYear || null,
    data.source || null,
    data.policyStatus || null,
    data.channel || null,
    data.arrangement || null,
    data.comDate ? new Date(data.comDate) : null,
    data.expiryDate ? new Date(data.expiryDate) : null,
  ]);
  
  return result.rows[0].id;
}

/**
 * Bulk insert policies (for CSV import)
 * 
 * @param {ReinsuranceData[]} policies - Array of policies to insert
 * @returns {Promise<number>} Number of records inserted
 */
export async function bulkInsertPolicies(policies: ReinsuranceData[]): Promise<number> {
  if (policies.length === 0) return 0;
  
  const db = getDb();
  const client = await db.connect();
  
  try {
    await client.query('BEGIN');
    
    // Clear existing data (optional - comment out if you want to keep existing)
    // await client.query('TRUNCATE TABLE policies RESTART IDENTITY CASCADE');
    
    let inserted = 0;
    const batchSize = 1000;
    
    for (let i = 0; i < policies.length; i += batchSize) {
      const batch = policies.slice(i, i + batchSize);
      const values: string[] = [];
      const params: unknown[] = [];
      let paramCount = 1;
      
      for (const data of batch) {
        const valuePlaceholders: string[] = [];
        for (let j = 0; j < 41; j++) {
          valuePlaceholders.push(`$${paramCount++}`);
        }
        values.push(`(${valuePlaceholders.join(', ')})`);
        
        params.push(
          data.uy,
          data.extType || null,
          data.srl || null,
          data.loc || null,
          data.className || null,
          data.subClass || null,
          data.cedTerritory || null,
          data.broker,
          data.cedant,
          data.orgInsuredTrtyName,
          data.countryName,
          data.region,
          data.hub,
          data.office || null,
          data.grsPremKD || 0,
          data.acqCostKD || 0,
          data.paidClaimsKD || 0,
          data.osClaimKD || 0,
          data.incClaimKD || 0,
          data.maxLiabilityKD || 0,
          data.signSharePct || 0,
          data.writtenSharePct || null,
          data.inceptionDay || null,
          data.inceptionMonth || null,
          data.inceptionQuarter || null,
          data.inceptionYear || null,
          data.expiryDay || null,
          data.expiryMonth || null,
          data.expiryQuarter || null,
          data.expiryYear || null,
          data.renewalDate || null,
          data.renewalDay || null,
          data.renewalMonth || null,
          data.renewalQuarter || null,
          data.renewalYear || null,
          data.source || null,
          data.policyStatus || null,
          data.channel || null,
          data.arrangement || null,
          data.comDate ? new Date(data.comDate) : null,
          data.expiryDate ? new Date(data.expiryDate) : null,
        );
      }
      
      await client.query(`
        INSERT INTO policies (
          uy, ext_type, srl, loc, class_name, sub_class, ced_territory,
          broker, cedant, org_insured_trty_name,
          country_name, region, hub, office,
          grs_prem_kd, acq_cost_kd, paid_claims_kd, os_claim_kd, inc_claim_kd,
          max_liability_kd, sign_share_pct, written_share_pct,
          inception_day, inception_month, inception_quarter, inception_year,
          expiry_day, expiry_month, expiry_quarter, expiry_year,
          renewal_date, renewal_day, renewal_month, renewal_quarter, renewal_year,
          source, policy_status, channel, arrangement,
          com_date, expiry_date
        ) VALUES ${values.join(', ')}
        ON CONFLICT DO NOTHING
      `, params);
      
      inserted += batch.length;
    }
    
    await client.query('COMMIT');
    return inserted;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get policy count
 * 
 * @returns {Promise<number>} Total number of policies
 */
export async function getPolicyCount(): Promise<number> {
  const db = getDb();
  const result = await db.query<{ count: string }>('SELECT COUNT(*) as count FROM policies');
  return parseInt(result.rows[0].count, 10);
}

