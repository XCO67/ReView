/**
 * Metric Color Definitions
 * 
 * Centralized color definitions for all metrics across the dashboard
 */

export const METRIC_COLORS = {
  premium: '#2a9d8f',
  netPremium: '#95d5b2',
  acquisitionCost: '#00f5d4',
  paidClaims: '#ffd449',
  outstandingClaims: '#f4a261',
  incurredClaims: '#e76f51',
  lossRatio: '#dc2f02',
  fac: '#219ebc',
  tty: '#c1121f',
  xol: '#fca311',
} as const;

/**
 * Get color for extension type
 */
export function getExtensionTypeColor(extType: string | null | undefined): string {
  if (!extType) return '#6b7280'; // Default gray
  
  const normalized = extType.trim().toUpperCase();
  if (normalized === 'FAC') return METRIC_COLORS.fac;
  if (normalized === 'TTY') return METRIC_COLORS.tty;
  if (normalized === 'XOL') return METRIC_COLORS.xol;
  
  return '#6b7280'; // Default gray for unknown types
}

