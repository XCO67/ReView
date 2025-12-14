/**
 * Utility functions for normalizing and extracting state/territory names
 * Handles special cases like UAE states (Dubai, Abu Dhabi, etc.)
 */

// UAE state names and their variations
const UAE_STATES: Record<string, string> = {
  'dubai': 'Dubai',
  'abu dhabi': 'Abu Dhabi',
  'abudhabi': 'Abu Dhabi',
  'abu-dhabi': 'Abu Dhabi',
  'sharjah': 'Sharjah',
  'ajman': 'Ajman',
  // Ras Al Khaimah variations (including common misspellings)
  'ras al khaimah': 'Ras Al Khaimah',
  'ras al-khaimah': 'Ras Al Khaimah',
  'ras alkhaimah': 'Ras Al Khaimah',
  'rasal khaimah': 'Ras Al Khaimah',
  'ras al kheimah': 'Ras Al Khaimah',
  'ras al-kheimah': 'Ras Al Khaimah',
  'ras alkheimah': 'Ras Al Khaimah',
  'rasal kheimah': 'Ras Al Khaimah',
  'ras al khaymah': 'Ras Al Khaimah',
  'ras al-khaymah': 'Ras Al Khaimah',
  'ras alkhaymah': 'Ras Al Khaimah',
  'rasal khaymah': 'Ras Al Khaimah',
  'rak': 'Ras Al Khaimah',
  'r.a.k': 'Ras Al Khaimah',
  'r a k': 'Ras Al Khaimah',
  'fujairah': 'Fujairah',
  'umm al quwain': 'Umm Al Quwain',
  'umm al-quwain': 'Umm Al Quwain',
  'umm alquwain': 'Umm Al Quwain',
  'uaq': 'Umm Al Quwain',
};

// Common country names to filter out from state lists
// These should not appear as states/territories
const COUNTRY_NAMES = new Set([
  // Middle East & Gulf
  'bahrain', 'kuwait', 'lebanon', 'qatar', 'singapore', 'united kingdom', 'uk',
  'saudi arabia', 'ksa', 'kingdom of saudi arabia', 'oman', 'jordan', 'egypt', 'iraq', 'syria', 'yemen',
  'united arab emirates', 'uae', 'u.a.e', // These are countries, not states
  
  // Asia
  'india', 'pakistan', 'bangladesh', 'sri lanka', 'nepal', 'afghanistan',
  'china', 'japan', 'south korea', 'north korea', 'thailand', 'malaysia', 'indonesia',
  'philippines', 'vietnam', 'myanmar', 'cambodia', 'laos', 'hong kong', 'hk',
  
  // Americas
  'united states', 'usa', 'us', 'u.s.a', 'u.s', 'america', 'united states of america',
  'canada', 'mexico', 'brazil', 'argentina',
  
  // Europe
  'france', 'germany', 'italy', 'spain', 'portugal', 'netherlands', 'belgium',
  'switzerland', 'austria', 'sweden', 'norway', 'denmark', 'finland', 'poland',
  'russia', 'turkey', 'greece', 'england',
  
  // Other
  'israel', 'iran', 'australia', 'new zealand',
  'south africa', 'nigeria', 'kenya', 'morocco', 'algeria', 'tunisia', 'libya',
]);

/**
 * Checks if a value is a country name (not a state/territory)
 */
function isCountryName(value: string): boolean {
  const normalized = value.toLowerCase().trim();
  return COUNTRY_NAMES.has(normalized);
}

/**
 * Extracts and normalizes state name from cedTerritory value
 * Handles formats like "Dubai", "Dubai, UAE", "Dubai - UAE", etc.
 * Filters out country names to only return actual states/territories
 */
export function extractStateName(cedTerritory: string | null | undefined, countryName?: string): string | null {
  if (!cedTerritory) return null;
  
  const trimmed = cedTerritory.trim();
  if (!trimmed) return null;
  
  // Check if this is UAE
  const isUAE = countryName && (
    countryName.toLowerCase().includes('uae') ||
    countryName.toLowerCase().includes('united arab emirates')
  );
  
  if (isUAE) {
    // Extract state name from various formats
    // Examples: "Dubai", "Dubai, UAE", "Dubai - UAE", "Dubai,UAE", etc.
    let stateName = trimmed;
    
    // Remove country suffix patterns
    stateName = stateName
      .replace(/[,;]\s*uae$/i, '')
      .replace(/[,;]\s*united arab emirates$/i, '')
      .replace(/\s*-\s*uae$/i, '')
      .replace(/\s*-\s*united arab emirates$/i, '')
      .trim();
    
    // Normalize to standard UAE state name
    const normalized = stateName.toLowerCase().trim();
    
    // For UAE, ONLY return known UAE states - be strict
    if (UAE_STATES[normalized]) {
      return UAE_STATES[normalized];
    }
    
    // If it's not a known UAE state, return null (don't include unknown values or country names)
    // This ensures we only show valid UAE states
    return null;
  }
  
  // For other countries, check if the territory is actually a country name
  // If it is, return null (don't include country names as states)
  if (isCountryName(trimmed)) {
    return null;
  }
  
  // For other countries, return as-is (trimmed) if it's not a country name
  return trimmed;
}

/**
 * Normalizes a state name for fuzzy matching (removes spaces, special chars, case-insensitive)
 */
function normalizeForMatching(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[-\s,;]/g, '') // Remove spaces, hyphens, commas, semicolons
    .replace(/uae$/, '') // Remove trailing UAE
    .replace(/unitedarabemirates$/, ''); // Remove trailing United Arab Emirates
}

/**
 * Checks if a record's territory matches the selected state
 * Handles normalization and variations, including fuzzy matching
 * This function is more lenient to catch all variations in the CSV
 */
export function matchesState(
  recordTerritory: string | null | undefined,
  selectedState: string,
  countryName?: string
): boolean {
  if (selectedState === 'all') return true;
  if (!recordTerritory) return false;
  
  const territoryLower = recordTerritory.toLowerCase().trim();
  const selectedLower = selectedState.toLowerCase().trim();
  
  // First, try exact extraction and matching
  const extractedState = extractStateName(recordTerritory, countryName);
  if (extractedState) {
    const extractedLower = extractedState.toLowerCase().trim();
    if (extractedLower === selectedLower) return true;
  }
  
  // For UAE, use comprehensive fuzzy matching to catch all variations
  const isUAE = countryName && (
    countryName.toLowerCase().includes('uae') ||
    countryName.toLowerCase().includes('united arab emirates')
  );
  
  if (isUAE) {
    // Get all possible variations of the selected state
    const stateVariations: string[] = [selectedLower];
    
    // Add known variations from UAE_STATES map
    Object.entries(UAE_STATES).forEach(([key, value]) => {
      if (value.toLowerCase() === selectedLower) {
        stateVariations.push(key);
      }
    });
    
    // Special handling for "Ras Al Khaimah" - add common misspellings
    if (selectedLower.includes('ras') && selectedLower.includes('khaimah')) {
      stateVariations.push(
        'ras al khaimah', 'ras al-khaimah', 'ras alkhaimah', 'rasal khaimah',
        'ras al kheimah', 'ras al-kheimah', 'ras alkheimah', 'rasal kheimah',
        'ras al khaymah', 'ras al-khaymah', 'ras alkhaymah', 'rasal khaymah',
        'rak', 'r.a.k', 'r a k'
      );
    }
    
    // Check if territory matches any variation (comprehensive matching)
    for (const variation of stateVariations) {
      // Remove UAE suffix from territory for comparison
      let cleanTerritory = territoryLower
        .replace(/[,;]\s*uae$/i, '')
        .replace(/[,;]\s*united arab emirates$/i, '')
        .replace(/\s*-\s*uae$/i, '')
        .replace(/\s*-\s*united arab emirates$/i, '')
        .trim();
      
      // Direct match
      if (cleanTerritory === variation) return true;
      
      // Check if territory starts with the variation (handles "Ras Al Khaimah, UAE")
      if (cleanTerritory.startsWith(variation) || 
          cleanTerritory.includes(variation) ||
          variation.includes(cleanTerritory)) {
        return true;
      }
      
      // Fuzzy match: normalize both and check
      const normalizedTerritory = normalizeForMatching(cleanTerritory);
      const normalizedVariation = normalizeForMatching(variation);
      
      if (normalizedTerritory.includes(normalizedVariation) || 
          normalizedVariation.includes(normalizedTerritory)) {
        return true;
      }
    }
    
    // Also check the raw territory directly (in case extractStateName missed it)
    const normalizedTerritory = normalizeForMatching(territoryLower);
    const normalizedSelected = normalizeForMatching(selectedLower);
    
    if (normalizedTerritory.includes(normalizedSelected) || 
        normalizedSelected.includes(normalizedTerritory)) {
      return true;
    }
  }
  
  // For other countries, use fuzzy matching
  const normalizedTerritory = normalizeForMatching(territoryLower);
  const normalizedSelected = normalizeForMatching(selectedLower);
  
  if (normalizedTerritory.includes(normalizedSelected) || 
      normalizedSelected.includes(normalizedTerritory) ||
      territoryLower.includes(selectedLower) ||
      selectedLower.includes(territoryLower)) {
    return true;
  }
  
  return false;
}

/**
 * Gets unique normalized states for a country from records
 * Filters out country names and only returns actual states/territories
 * For UAE, tries to normalize to known states, but also includes valid variations
 */
export function getNormalizedStates(
  records: Array<{ cedTerritory?: string | null }>,
  countryName?: string
): string[] {
  const stateSet = new Set<string>();
  const isUAE = countryName && (
    countryName.toLowerCase().includes('uae') ||
    countryName.toLowerCase().includes('united arab emirates')
  );
  
  records.forEach(record => {
    if (!record.cedTerritory) return;
    
    const trimmed = record.cedTerritory.trim();
    if (!trimmed) return;
    
    // Try extraction first
    const extractedState = extractStateName(trimmed, countryName);
    if (extractedState && !isCountryName(extractedState)) {
      stateSet.add(extractedState);
      return;
    }
    
    // For UAE, if extraction failed, try to match against known states manually
    if (isUAE) {
      const territoryLower = trimmed.toLowerCase()
        .replace(/[,;]\s*uae$/i, '')
        .replace(/[,;]\s*united arab emirates$/i, '')
        .replace(/\s*-\s*uae$/i, '')
        .replace(/\s*-\s*united arab emirates$/i, '')
        .trim();
      
      // Check if it matches any known UAE state (including variations)
      for (const [key, value] of Object.entries(UAE_STATES)) {
        if (territoryLower === key || 
            territoryLower.includes(key) || 
            key.includes(territoryLower)) {
          stateSet.add(value);
          return;
        }
      }
      
      // If it doesn't match a known state and isn't a country name, include it as-is
      // (might be a valid state we don't know about, or a variation)
      if (!isCountryName(trimmed)) {
        // Use title case for consistency
        const titleCase = trimmed
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
        stateSet.add(titleCase);
      }
    } else {
      // For other countries, if it's not a country name, include it
      if (!isCountryName(trimmed)) {
        const titleCase = trimmed
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
        stateSet.add(titleCase);
      }
    }
  });
  
  return Array.from(stateSet).sort();
}

