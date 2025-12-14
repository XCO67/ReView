/**
 * Rate Limiting and Account Lockout
 * Prevents brute force attacks by limiting login attempts
 */

interface AttemptRecord {
  count: number;
  firstAttempt: number;
  lockedUntil?: number;
}

// In-memory store (use Redis in production for distributed systems)
const attemptStore = new Map<string, AttemptRecord>();

// Configuration
const RATE_LIMIT_CONFIG = {
  MAX_ATTEMPTS: 5,
  WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  LOCKOUT_DURATION_MS: 30 * 60 * 1000, // 30 minutes lockout
  CLEANUP_INTERVAL_MS: 60 * 60 * 1000, // Clean up old records every hour
} as const;

/**
 * Get identifier for rate limiting (IP + username/email)
 */
function getRateLimitKey(identifier: string, ip: string): string {
  return `login:${identifier}:${ip}`;
}

/**
 * Get identifier for account lockout (username/email only)
 */
function getLockoutKey(identifier: string): string {
  return `lockout:${identifier}`;
}

/**
 * Check if account is locked
 */
export function isAccountLocked(identifier: string): { locked: boolean; unlockAt?: number } {
  const key = getLockoutKey(identifier);
  const record = attemptStore.get(key);
  
  if (!record?.lockedUntil) {
    return { locked: false };
  }
  
  const now = Date.now();
  if (now < record.lockedUntil) {
    return { locked: true, unlockAt: record.lockedUntil };
  }
  
  // Lockout expired, clear it
  attemptStore.delete(key);
  return { locked: false };
}

/**
 * Record a failed login attempt
 */
export function recordFailedAttempt(identifier: string, ip: string): {
  allowed: boolean;
  remainingAttempts: number;
  lockedUntil?: number;
} {
  const rateLimitKey = getRateLimitKey(identifier, ip);
  const lockoutKey = getLockoutKey(identifier);
  const now = Date.now();
  
  // Check if account is already locked
  const lockoutStatus = isAccountLocked(identifier);
  if (lockoutStatus.locked) {
    return {
      allowed: false,
      remainingAttempts: 0,
      lockedUntil: lockoutStatus.unlockAt,
    };
  }
  
  // Get or create attempt record
  let record = attemptStore.get(rateLimitKey);
  
  if (!record) {
    record = {
      count: 0,
      firstAttempt: now,
    };
  }
  
  // Reset if window expired
  if (now - record.firstAttempt > RATE_LIMIT_CONFIG.WINDOW_MS) {
    record.count = 0;
    record.firstAttempt = now;
  }
  
  // Increment attempt count
  record.count++;
  
  const remainingAttempts = Math.max(0, RATE_LIMIT_CONFIG.MAX_ATTEMPTS - record.count);
  
  // Check if we should lock the account
  if (record.count >= RATE_LIMIT_CONFIG.MAX_ATTEMPTS) {
    const lockedUntil = now + RATE_LIMIT_CONFIG.LOCKOUT_DURATION_MS;
    
    // Store lockout record
    attemptStore.set(lockoutKey, {
      count: record.count,
      firstAttempt: record.firstAttempt,
      lockedUntil,
    });
    
    // Clean up rate limit record
    attemptStore.delete(rateLimitKey);
    
    return {
      allowed: false,
      remainingAttempts: 0,
      lockedUntil,
    };
  }
  
  // Store updated record
  attemptStore.set(rateLimitKey, record);
  
  return {
    allowed: true,
    remainingAttempts,
  };
}

/**
 * Clear failed attempts (on successful login)
 */
export function clearFailedAttempts(identifier: string, ip: string): void {
  const rateLimitKey = getRateLimitKey(identifier, ip);
  const lockoutKey = getLockoutKey(identifier);
  attemptStore.delete(rateLimitKey);
  attemptStore.delete(lockoutKey);
}

/**
 * Get remaining attempts for an identifier
 */
export function getRemainingAttempts(identifier: string, ip: string): number {
  const rateLimitKey = getRateLimitKey(identifier, ip);
  const record = attemptStore.get(rateLimitKey);
  
  if (!record) {
    return RATE_LIMIT_CONFIG.MAX_ATTEMPTS;
  }
  
  const now = Date.now();
  if (now - record.firstAttempt > RATE_LIMIT_CONFIG.WINDOW_MS) {
    return RATE_LIMIT_CONFIG.MAX_ATTEMPTS;
  }
  
  return Math.max(0, RATE_LIMIT_CONFIG.MAX_ATTEMPTS - record.count);
}

/**
 * Cleanup old records (call periodically)
 */
export function cleanupOldRecords(): void {
  const now = Date.now();
  const keysToDelete: string[] = [];
  
  for (const [key, record] of attemptStore.entries()) {
    const isLockout = key.startsWith('lockout:');
    const expiryTime = isLockout 
      ? (record.lockedUntil || 0)
      : (record.firstAttempt + RATE_LIMIT_CONFIG.WINDOW_MS);
    
    if (now > expiryTime) {
      keysToDelete.push(key);
    }
  }
  
  keysToDelete.forEach(key => attemptStore.delete(key));
}

// Auto-cleanup every hour
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupOldRecords, RATE_LIMIT_CONFIG.CLEANUP_INTERVAL_MS);
}

