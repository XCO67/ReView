/**
 * Security Utilities
 * Prevents information disclosure and protects against common attacks
 */

/**
 * Sanitize error messages to prevent information disclosure
 */
export function sanitizeError(error: unknown, isProduction: boolean): string {
  if (isProduction) {
    // In production, return generic error messages
    if (error instanceof Error) {
      // Don't expose stack traces or internal details
      if (error.message.includes('password') || error.message.includes('secret')) {
        return 'Authentication failed';
      }
      if (error.message.includes('database') || error.message.includes('SQL')) {
        return 'Database error occurred';
      }
      if (error.message.includes('session') || error.message.includes('token')) {
        return 'Session error occurred';
      }
      return 'An error occurred. Please try again.';
    }
    return 'An error occurred. Please try again.';
  }
  
  // In development, show full error for debugging
  return error instanceof Error ? error.message : String(error);
}

/**
 * Remove sensitive data from objects before logging
 */
export function sanitizeForLogging(data: unknown): unknown {
  if (!data || typeof data !== 'object') {
    return data;
  }
  
  const sensitiveKeys = [
    'password',
    'secret',
    'token',
    'apiKey',
    'apikey',
    'auth',
    'authorization',
    'session',
    'cookie',
    'creditCard',
    'ssn',
    'password_hash',
    'passwordHash',
  ];
  
  const sanitized: unknown = Array.isArray(data) ? [...data] : { ...data };
  
  if (typeof sanitized === 'object' && sanitized !== null) {
    for (const key in sanitized as Record<string, unknown>) {
      const lowerKey = key.toLowerCase();
      if (sensitiveKeys.some(sk => lowerKey.includes(sk))) {
        (sanitized as Record<string, unknown>)[key] = '[REDACTED]';
      } else if (typeof (sanitized as Record<string, unknown>)[key] === 'object' && (sanitized as Record<string, unknown>)[key] !== null) {
        (sanitized as Record<string, unknown>)[key] = sanitizeForLogging((sanitized as Record<string, unknown>)[key]);
      }
    }
  }
  
  return sanitized;
}

/**
 * Safe console.log that sanitizes sensitive data
 */
export function safeLog(message: string, data?: unknown): void {
  if (process.env.NODE_ENV === 'production') {
    // In production, don't log sensitive information
    return;
  }
  
  if (data) {
    const sanitized = sanitizeForLogging(data);
    console.log(message, sanitized);
  } else {
    console.log(message);
  }
}

/**
 * Safe console.error that sanitizes sensitive data
 */
export function safeError(message: string, error?: unknown): void {
  if (error) {
    const sanitized = sanitizeError(error, process.env.NODE_ENV === 'production');
    console.error(message, sanitized);
  } else {
    console.error(message);
  }
}

