import { z } from 'zod';

/**
 * Zod schema for reinsurance data contract
 * Based on the specification: UY, Ext Type, Broker, Cedant, Org.Insured/Trty Name, Max Liability (FC), Gross UW Prem, Gross Actual Acq., Gross paid claims, Gross os loss, Country Name, Region, Hub
 */
export const ReinsuranceDataSchema = z.object({
  // Display fields (for names, not calculations)
  uy: z.string().min(1, 'UY is required'),
  extType: z.string().min(1, 'Ext Type is required'),
  srl: z.string().optional(), // Serial Number
  loc: z.string().optional(), // Loc
  className: z.string().optional(), // UW_CLASS
  subClass: z.string().optional(), // SUB_CLASS (0 or empty = "Other")
  cedTerritory: z.string().optional(),
  broker: z.string().min(1, 'Broker is required'), // Display only
  cedant: z.string().min(1, 'Cedant is required'), // Display only
  orgInsuredTrtyName: z.string().min(1, 'Org.Insured/Trty Name is required'), // Display only
  
  // Calculation fields (from specified columns only)
  countryName: z.string().min(1, 'Country Name is required'), // Column 62
  region: z.string().min(1, 'Region is required'), // Column 63
  hub: z.string().min(1, 'Hub is required'), // Column 64
  office: z.string().optional(), // Column 44
  grsPremKD: z.number().min(0, 'GRS_PREM (KD) must be non-negative'), // Column 66
  acqCostKD: z.number().min(0, 'ACQ_COST (KD) must be non-negative'), // Column 67
  paidClaimsKD: z.number().min(0, 'PAID_CLAIMS (KD) must be non-negative'), // Column 69
  osClaimKD: z.number().min(0, 'OS_CLAIM (KD) must be non-negative'), // Column 70
  incClaimKD: z.number().min(0, 'INC_CLAIM (KD) must be non-negative'), // Column 71
  maxLiabilityKD: z.number().min(0, 'MaxLiability (KD) must be non-negative'), // Column 73
  signSharePct: z.number().min(0).max(100, 'SignShare% must be 0-100'), // Column 74
  writtenSharePct: z.number().min(0).max(100, 'WrittenShare% must be 0-100').optional(), // Column 75
  
  // Date fields
  inceptionDay: z.number().optional(), // Column 76
  inceptionMonth: z.number().optional(), // Column 77
  inceptionQuarter: z.number().optional(), // Column 78
  inceptionYear: z.number().optional(), // Column 79
  expiryDay: z.number().optional(), // Column 80
  expiryMonth: z.number().optional(), // Column 81
  expiryQuarter: z.number().optional(), // Column 82
  expiryYear: z.number().optional(), // Column 83
  renewalDate: z.string().optional(), // Column 84
  renewalDay: z.number().optional(), // Column 85
  renewalMonth: z.number().optional(), // Column 86
  renewalQuarter: z.number().optional(), // Column 87
  renewalYear: z.number().optional(), // Column 88
  
  // Additional fields
  source: z.string().optional(), // Column 31
  policyStatus: z.string().optional(), // Column 35
  channel: z.string().optional(), // Column 5 (Kuwait/Malaysia/Consultant)
  arrangement: z.string().optional(), // Column 9 (Proportional/Non-proportional)
  
  // Legacy fields for backward compatibility (deprecated, use KD columns instead)
  maxLiabilityFC: z.number().min(0).optional(), // Deprecated
  grossUWPrem: z.number().min(0).optional(), // Deprecated
  grossBookPrem: z.number().min(0).optional(), // Deprecated
  grossActualAcq: z.number().min(0).optional(), // Deprecated
  grossPaidClaims: z.number().min(0).optional(), // Deprecated
  grossOsLoss: z.number().min(0).optional(), // Deprecated
  comDate: z.string().optional(), // Deprecated
  expiryDate: z.string().optional(), // Deprecated
});

export type ReinsuranceData = z.infer<typeof ReinsuranceDataSchema>;

/**
 * Schema for aggregated KPI data
 */
export const KPIDataSchema = z.object({
  premium: z.number().min(0),
  paidClaims: z.number().min(0),
  outstandingClaims: z.number().min(0),
  incurredClaims: z.number().min(0),
  expense: z.number().min(0),
  lossRatio: z.number().min(0),
  expenseRatio: z.number().min(0),
  combinedRatio: z.number().min(0),
  numberOfAccounts: z.number().min(0),
  avgMaxLiability: z.number().min(0),
});

export type KPIData = z.infer<typeof KPIDataSchema>;

/**
 * Schema for filter options
 */
export const FilterOptionsSchema = z.object({
  uy: z.array(z.string()).optional(),
  extType: z.array(z.string()).optional(),
  broker: z.array(z.string()).optional(),
  cedant: z.array(z.string()).optional(),
  orgInsuredTrtyName: z.array(z.string()).optional(),
  countryName: z.array(z.string()).optional(),
  region: z.array(z.string()).optional(),
  hub: z.array(z.string()).optional(),
});

export type FilterOptions = z.infer<typeof FilterOptionsSchema>;

/**
 * Schema for chart data points
 */
export const ChartDataPointSchema = z.object({
  name: z.string(),
  value: z.number(),
  label: z.string().optional(),
});

export type ChartDataPoint = z.infer<typeof ChartDataPointSchema>;

/**
 * Schema for UY performance table row
 */
export const UYPerformanceRowSchema = z.object({
  uy: z.string(),
  premium: z.number(),
  paidClaims: z.number(),
  outstandingClaims: z.number(),
  incurredClaims: z.number(),
  expense: z.number(),
  lossRatio: z.number(),
  expenseRatio: z.number(),
  combinedRatio: z.number(),
  numberOfAccounts: z.number(),
  avgMaxLiability: z.number(),
});

export type UYPerformanceRow = z.infer<typeof UYPerformanceRowSchema>;

