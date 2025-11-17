import { z } from 'zod';

/**
 * Zod schema for reinsurance data contract
 * Based on the specification: UY, Ext Type, Broker, Cedant, Org.Insured/Trty Name, Max Liability (FC), Gross UW Prem, Gross Actual Acq., Gross paid claims, Gross os loss, Country Name, Region, Hub
 */
export const ReinsuranceDataSchema = z.object({
  uy: z.string().min(1, 'UY is required'),
  extType: z.string().min(1, 'Ext Type is required'),
  broker: z.string().min(1, 'Broker is required'),
  cedant: z.string().min(1, 'Cedant is required'),
  orgInsuredTrtyName: z.string().min(1, 'Org.Insured/Trty Name is required'),
  maxLiabilityFC: z.number().min(0, 'Max Liability must be non-negative'),
  grossUWPrem: z.number().min(0, 'Gross UW Prem must be non-negative'),
  grossBookPrem: z.number().min(0, 'Gross Book Prem must be non-negative').optional(),
  grossActualAcq: z.number().min(0, 'Gross Actual Acq. must be non-negative'),
  grossPaidClaims: z.number().min(0, 'Gross paid claims must be non-negative'),
  grossOsLoss: z.number().min(0, 'Gross os loss must be non-negative'),
  countryName: z.string().min(1, 'Country Name is required'),
  region: z.string().min(1, 'Region is required'),
  hub: z.string().min(1, 'Hub is required'),
  inceptionYear: z.number().optional(),
  inceptionQuarter: z.string().optional(),
  inceptionMonth: z.string().optional(),
  comDate: z.string().optional(),
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

