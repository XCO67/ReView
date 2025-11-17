// Database types for PostgreSQL implementation

export interface Policy {
  id: number;
  year: number;
  month?: number;
  quarter?: number;
  com_date?: Date;
  inception_year?: number;
  premium: number;
  gross_book_prem: number;
  gross_uw_prem: number;
  gross_actual_acq: number;
  gross_paid_claims: number;
  gross_os_loss: number;
  incurred: number;
  country_name?: string;
  hub?: string;
  region?: string;
  cedant?: string;
  insured?: string;
  country_name_norm?: string;
  hub_norm?: string;
  region_norm?: string;
  cedant_norm?: string;
  insured_norm?: string;
  created_at: Date;
  updated_at: Date;
}

export interface QueryFilters {
  year?: number;
  country?: string;
  hub?: string;
  region?: string;
  cedant?: string;
  insured?: string;
  limit?: number;
}

export interface AggregatedData {
  policyCount: number;
  premium: number;
  acq: number;
  incurred: number;
  acqPct: number;
  lossRatioPct: number;
  technicalResult: number;
  combinedRatioPct: number;
}

export interface Dimensions {
  years: number[];
  countries: Array<{ value: string; label: string }>;
  hubs: Array<{ value: string; label: string }>;
  regions: Array<{ value: string; label: string }>;
  cedants: Array<{ value: string; label: string }>;
  insureds: Array<{ value: string; label: string }>;
}

