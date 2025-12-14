const COUNTRY_ALIASES: Record<string, string> = {
  // Middle East
  'ksa': 'Saudi Arabia',
  'saudi': 'Saudi Arabia',
  'saudi arabia': 'Saudi Arabia',
  'kingdom of saudi arabia': 'Saudi Arabia',
  'uae': 'United Arab Emirates',
  'u.a.e': 'United Arab Emirates',
  'united arab emirates': 'United Arab Emirates',
  'kurdistan': 'Iraq',
  'state of qatar': 'Qatar',

  // Americas
  'usa': 'United States of America',
  'u.s.a': 'United States of America',
  'us': 'United States of America',
  'u.s': 'United States of America',
  'united states': 'United States of America',
  'united states of america': 'United States of America',
  'america': 'United States of America',
  'uk': 'United Kingdom',
  'u.k': 'United Kingdom',
  'united kingdom': 'United Kingdom',
  'england': 'United Kingdom',

  // Other common shorthands
  'ivory coast': "Côte d'Ivoire",
  'cote divoire': "Côte d'Ivoire",
  'cote d ivoire': "Côte d'Ivoire",
  'drc': 'Democratic Republic of the Congo',
  'congo': 'Republic of the Congo',
  'south korea': 'South Korea',
  'korea republic of': 'South Korea',
  'north korea': 'North Korea',
  'peoples republic of china': 'China',
  'hongkong': 'Hong Kong',
  'hk': 'Hong Kong',
  'burma': 'Myanmar',
};

function cleanKey(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[().,']/g, '')
    .replace(/\s+/g, ' ');
}

function toTitleCase(value: string): string {
  return value
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function normalizeCountryName(value?: string | null): string {
  if (!value) return 'Unknown';

  const cleanedKey = cleanKey(value);
  if (COUNTRY_ALIASES[cleanedKey]) {
    return COUNTRY_ALIASES[cleanedKey];
  }

  return toTitleCase(value.trim());
}

