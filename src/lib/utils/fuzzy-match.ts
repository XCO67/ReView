/**
 * Fuzzy matching utilities for typo tolerance
 */

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,     // deletion
          dp[i][j - 1] + 1,     // insertion
          dp[i - 1][j - 1] + 1  // substitution
        );
      }
    }
  }

  return dp[m][n];
}

/**
 * Calculate similarity score between two strings (0-1, where 1 is identical)
 */
function similarity(str1: string, str2: string): number {
  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 1;
  const distance = levenshteinDistance(str1, str2);
  return 1 - (distance / maxLen);
}

/**
 * Normalize string for matching (lowercase, remove extra spaces, punctuation)
 */
function normalize(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '');
}

/**
 * Check if query matches any of the keywords with typo tolerance
 * @param query - User input query
 * @param keywords - Array of keywords to match against
 * @param threshold - Similarity threshold (0-1), default 0.7
 * @returns true if match found, false otherwise
 */
export function fuzzyMatch(
  query: string,
  keywords: string[],
  threshold: number = 0.7
): boolean {
  const normalizedQuery = normalize(query);
  
  // First try exact match (after normalization)
  for (const keyword of keywords) {
    const normalizedKeyword = normalize(keyword);
    if (normalizedQuery.includes(normalizedKeyword) || normalizedKeyword.includes(normalizedQuery)) {
      return true;
    }
  }

  // Then try fuzzy matching
  for (const keyword of keywords) {
    const normalizedKeyword = normalize(keyword);
    const sim = similarity(normalizedQuery, normalizedKeyword);
    
    // Also check if query contains a substring of keyword (or vice versa) with high similarity
    if (sim >= threshold) {
      return true;
    }
    
    // Check word-by-word for multi-word keywords
    const queryWords = normalizedQuery.split(' ');
    const keywordWords = normalizedKeyword.split(' ');
    
    for (const queryWord of queryWords) {
      for (const keywordWord of keywordWords) {
        if (queryWord.length >= 3 && keywordWord.length >= 3) {
          const wordSim = similarity(queryWord, keywordWord);
          if (wordSim >= threshold) {
            return true;
          }
        }
      }
    }
  }

  return false;
}

/**
 * Find the best matching keyword from an array
 * @param query - User input query
 * @param keywords - Array of keywords to match against
 * @returns The best matching keyword or null
 */
export function findBestMatch(
  query: string,
  keywords: string[]
): string | null {
  const normalizedQuery = normalize(query);
  let bestMatch: string | null = null;
  let bestScore = 0;

  for (const keyword of keywords) {
    const normalizedKeyword = normalize(keyword);
    
    // Exact substring match gets highest score
    if (normalizedQuery.includes(normalizedKeyword) || normalizedKeyword.includes(normalizedQuery)) {
      return keyword;
    }
    
    const sim = similarity(normalizedQuery, normalizedKeyword);
    if (sim > bestScore) {
      bestScore = sim;
      bestMatch = keyword;
    }
  }

  return bestScore >= 0.7 ? bestMatch : null;
}

