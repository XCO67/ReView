export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { ReinsuranceData } from '@/lib/schema';
import { aggregateKPIs } from '@/lib/kpi';
import { loadUWData } from '@/lib/uw-data';
import { loadRenewals } from '@/lib/renewals';
import { normalizeCountryName } from '@/lib/country-normalization';
import { getNormalizedStates } from '@/lib/state-normalization';
import { getSessionFromRequest } from '@/lib/session';
import { filterByRole, filterRenewalsByRole } from '@/lib/role-filter';

interface CountryDetailRecord {
  uy: string;
  srl?: string;
  extType: string;
  insuredName: string;
  broker: string;
  cedant: string;
  cedTerritory?: string;
  maxLiability: number;
  premium: number;
  acquisition: number;
  paidClaims: number;
  osLoss: number;
  incurredClaims: number;
  lossRatioPct: number;
  isNearExpiry: boolean;
}

interface CountrySummary {
  country: string;
  policyCount: number;
  premium: number;
  maxLiability: number;
  acquisition: number;
  paidClaims: number;
  osLoss: number;
  incurredClaims: number;
  technicalResult: number;
  lossRatioPct: number;
  acquisitionPct: number;
  combinedRatioPct: number;
  nearExpiryCount: number;
  nearExpiryPct: number;
  brokers: string[];
  cedants: string[];
  regions: string[];
  hubs: string[];
  states: string[];
  records: CountryDetailRecord[];
  yearly: CountryYearSummary[];
}

interface CountryYearSummary {
  year: number;
  policyCount: number;
  premium: number;
  acquisition: number;
  paidClaims: number;
  osLoss: number;
  incurredClaims: number;
  technicalResult: number;
  lossRatioPct: number;
  acquisitionPct: number;
  combinedRatioPct: number;
  nearExpiryCount: number;
  nearExpiryPct: number;
  records: CountryDetailRecord[];
}

function extractYear(value?: string | null): number | null {
  if (!value) return null;
  const match = value.match(/\d{4}/);
  return match ? Number(match[0]) : null;
}

export async function GET(req: NextRequest) {
  try {
    // Get user session for role-based filtering
    const session = await getSessionFromRequest(req);
    
    const url = new URL(req.url);
    const parseYearFilter = (param: string | null) => {
      if (!param) return null;
      const num = Number(param);
      return Number.isFinite(num) ? num : null;
    };

    const minYearFilter = parseYearFilter(url.searchParams.get('minYear'));
    const maxYearFilter = parseYearFilter(url.searchParams.get('maxYear'));

    const allData = await loadUWData();
    
    // Apply role-based filtering
    const roleFilteredData = filterByRole(allData, session?.roles);
    const allRenewals = await loadRenewals();
    
    // Apply role-based filtering to renewals
    const renewals = filterRenewalsByRole(allRenewals, session?.roles);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nearExpiryWindowDays = 90;

    const isNearExpiry = (record: ReinsuranceData) => {
      const dateString = record.expiryDate || record.renewalDate;
      if (!dateString) return false;
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return false;
      const diffDays = (date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
      return diffDays >= 0 && diffDays <= nearExpiryWindowDays;
    };

    const renewalStats: Record<string, { total: number; upcoming: number }> = {};
    const renewalYearStats: Record<string, { total: number; upcoming: number }> = {};
    renewals.forEach((record) => {
      // Use ONLY countryName (from Country Name column 62), no fallback
      const keyRaw = record.countryName || '';
      if (!keyRaw) return;
      const key = normalizeCountryName(keyRaw).toLowerCase();
      if (!renewalStats[key]) {
        renewalStats[key] = { total: 0, upcoming: 0 };
      }
      renewalStats[key].total += 1;
      if (record.statusFlag === 'upcoming-renewal') {
        renewalStats[key].upcoming += 1;
      }

      const renewalYear =
        extractYear(record.year) ??
        extractYear(record.renYear) ??
        extractYear(record.normalizedYear);
      if (renewalYear !== null) {
        const mapKey = `${key}-${renewalYear}`;
        if (!renewalYearStats[mapKey]) {
          renewalYearStats[mapKey] = { total: 0, upcoming: 0 };
        }
        renewalYearStats[mapKey].total += 1;
        if (record.statusFlag === 'upcoming-renewal') {
          renewalYearStats[mapKey].upcoming += 1;
        }
      }
    });

    const availableYearsSet = new Set<number>();
    const filteredData: ReinsuranceData[] = [];

    roleFilteredData.forEach(record => {
      const yearNum = extractYear(record.uy);
      if (yearNum !== null) {
        availableYearsSet.add(yearNum);
      }
      if (yearNum !== null) {
        if (minYearFilter !== null && yearNum < minYearFilter) {
          return;
        }
        if (maxYearFilter !== null && yearNum > maxYearFilter) {
          return;
        }
      }
      filteredData.push(record);
    });

    // Group data by country
    const countryGroups: Record<string, ReinsuranceData[]> = {};
    const countryYearGroups: Record<string, Record<number, ReinsuranceData[]>> = {};

    filteredData.forEach(record => {
      if (record.countryName) {
        const originalCountryName = record.countryName; // Preserve original country name from CSV
        const normalizedName = normalizeCountryName(record.countryName);
        if (!countryGroups[normalizedName]) {
          countryGroups[normalizedName] = [];
        }
        countryGroups[normalizedName].push({
          ...record,
          countryName: normalizedName, // Use normalized for grouping
          originalCountryName, // Preserve original for display
        });

        const yearNum = extractYear(record.uy);
        if (yearNum !== null) {
          if (!countryYearGroups[normalizedName]) {
            countryYearGroups[normalizedName] = {};
          }
          if (!countryYearGroups[normalizedName][yearNum]) {
            countryYearGroups[normalizedName][yearNum] = [];
          }
          countryYearGroups[normalizedName][yearNum].push(record);
        }
      }
    });

    // Calculate country metrics using aggregateKPIs
    const countries: CountrySummary[] = [];

    let totalPolicyCount = 0;
    let totalPremium = 0;
    let totalAcquisition = 0;
    let totalPaidClaims = 0;
    let totalOsLoss = 0;

    // Process each country
    Object.entries(countryGroups).forEach(([countryName, countryData]) => {
      const kpis = aggregateKPIs(countryData);
      
      const policyCount = countryData.length;
      const premium = kpis.premium;
      // Use KD columns from specified columns only
      const maxLiability = countryData.reduce((sum, r) => sum + (r.maxLiabilityKD || 0), 0);
      const acquisition = kpis.expense;
      const paidClaims = kpis.paidClaims;
      const osLoss = kpis.outstandingClaims;
      const incurredClaims = kpis.incurredClaims;
      const technicalResult = premium - incurredClaims - acquisition;
      
      const lossRatioPct = kpis.lossRatio;
      const acquisitionPct = kpis.expenseRatio;
      const combinedRatioPct = kpis.combinedRatio;

      // Get unique brokers, cedants, regions, hubs
      const brokers = [...new Set(countryData.map(r => r.broker).filter(b => b && b.trim()))];
      const cedants = [...new Set(countryData.map(r => r.cedant).filter(c => c && c.trim()))];
      const regions = [...new Set(countryData.map(r => r.region).filter(r => r && r.trim()))];
      const hubs = [...new Set(countryData.map(r => r.hub).filter(h => h && h.trim()))];

      const renewalKey = countryName.toLowerCase();
      const renewalStat = renewalStats[renewalKey];
      const nearExpiryCount = renewalStat?.upcoming ?? 0;
      const nearExpiryPct = renewalStat && renewalStat.total > 0
        ? (renewalStat.upcoming / renewalStat.total) * 100
        : 0;

      // Get normalized states for this country
      const states = getNormalizedStates(
        countryData.map(r => ({ cedTerritory: r.cedTerritory })),
        countryName
      );

      // Use KD columns from specified columns only
      const recordEntries = countryData.map((record) => {
        const premium = record.grsPremKD || 0;
        const paidClaims = record.paidClaimsKD || 0;
        const osLoss = record.osClaimKD || 0;
        const incurred = record.incClaimKD || (paidClaims + osLoss);
        // Use original country name from CSV if available, otherwise use normalized
        const originalCountryName = (record as any).originalCountryName || record.countryName;
        return {
          uy: record.uy,
          srl: record.srl,
          extType: record.extType,
          insuredName: record.orgInsuredTrtyName,
          broker: record.broker,
          cedant: record.cedant,
          cedTerritory: record.cedTerritory,
          countryName: originalCountryName, // Use original country name from CSV
          maxLiability: record.maxLiabilityKD || 0,
          premium,
          acquisition: record.acqCostKD || 0,
          paidClaims,
          osLoss,
          incurredClaims: incurred,
          lossRatioPct: premium > 0 ? (incurred / premium) * 100 : 0,
          isNearExpiry: isNearExpiry(record),
          year: extractYear(record.uy),
        } as CountryDetailRecord & { year: number | null };
      });

      // Return all records (not limited) to allow proper state filtering on client side
      // The client will filter and paginate as needed
      const records = recordEntries
        .sort((a, b) => b.premium - a.premium)
        .map(({ year, ...rest }) => rest);

      const recordsByYear: Record<number, CountryDetailRecord[]> = {};
      recordEntries.forEach(({ year, ...entry }) => {
        if (year !== null) {
          if (!recordsByYear[year]) {
            recordsByYear[year] = [];
          }
          recordsByYear[year].push(entry);
        }
      });

      const yearlyEntries = countryYearGroups[countryName] || {};
      const yearly: CountryYearSummary[] = Object.entries(yearlyEntries).map(([yearString, arr]) => {
        const year = Number(yearString);
        const yearKpis = aggregateKPIs(arr);
        // Return all records for the year to allow proper state filtering
        const yearRecords = (recordsByYear[year] || [])
          .sort((a, b) => b.premium - a.premium);
        const renewalYearStat = renewalYearStats[`${countryName.toLowerCase()}-${year}`];
        const yearNearExpiryCount = renewalYearStat?.upcoming ?? 0;
        const yearNearExpiryPct =
          renewalYearStat && renewalYearStat.total > 0
            ? (renewalYearStat.upcoming / renewalYearStat.total) * 100
            : 0;

        return {
          year,
          policyCount: arr.length,
          premium: yearKpis.premium,
          acquisition: yearKpis.expense,
          paidClaims: yearKpis.paidClaims,
          osLoss: yearKpis.outstandingClaims,
          incurredClaims: yearKpis.incurredClaims,
          technicalResult: yearKpis.premium - yearKpis.incurredClaims - yearKpis.expense,
          lossRatioPct: yearKpis.lossRatio,
          acquisitionPct: yearKpis.expenseRatio,
          combinedRatioPct: yearKpis.combinedRatio,
          nearExpiryCount: yearNearExpiryCount,
          nearExpiryPct: yearNearExpiryPct,
          records: yearRecords,
        };
      });

      countries.push({
        country: countryName,
        policyCount,
        premium,
        maxLiability,
        acquisition,
        paidClaims,
        osLoss,
        incurredClaims,
        technicalResult,
        lossRatioPct,
        acquisitionPct,
        combinedRatioPct,
        brokers,
        cedants,
        regions,
        hubs,
        states,
        nearExpiryCount,
        nearExpiryPct,
        records,
        yearly: yearly.sort((a, b) => a.year - b.year),
      });

      // Accumulate totals
      totalPolicyCount += policyCount;
      totalPremium += premium;
      totalAcquisition += acquisition;
      totalPaidClaims += paidClaims;
      totalOsLoss += osLoss;
    });

    // Calculate totals
    const totalIncurredClaims = totalPaidClaims + totalOsLoss;
    const totalTechnicalResult = totalPremium - totalIncurredClaims - totalAcquisition;
    const totalLossRatioPct = totalPremium > 0 ? (totalIncurredClaims / totalPremium) * 100 : 0;
    const totalAcquisitionPct = totalPremium > 0 ? (totalAcquisition / totalPremium) * 100 : 0;
    const totalCombinedRatioPct = totalLossRatioPct + totalAcquisitionPct;

    const availableYears = Array.from(availableYearsSet).sort((a, b) => a - b);

    const result = {
      availableYears,
      countries,
      total: {
        policyCount: totalPolicyCount,
        premium: totalPremium,
        acquisition: totalAcquisition,
        paidClaims: totalPaidClaims,
        osLoss: totalOsLoss,
        incurredClaims: totalIncurredClaims,
        technicalResult: totalTechnicalResult,
        lossRatioPct: totalLossRatioPct,
        acquisitionPct: totalAcquisitionPct,
        combinedRatioPct: totalCombinedRatioPct
      }
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('World Map API - Error:', error);
    return NextResponse.json({ error: 'Failed to fetch world map data' }, { status: 500 });
  }
}
