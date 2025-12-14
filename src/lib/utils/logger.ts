/**
 * Production-Ready Logging Utility
 * 
 * Provides structured logging that:
 * - Only logs in development mode
 * - Sanitizes sensitive data
 * - Uses proper log levels
 * 
 * @module utils/logger
 */

const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Log informational messages (development only)
 */
export function log(message: string, data?: unknown): void {
  if (isDevelopment && data !== undefined) {
    console.log(`[INFO] ${message}`, data);
  } else if (isDevelopment) {
    console.log(`[INFO] ${message}`);
  }
}

/**
 * Log error messages (always logged, sanitized in production)
 */
export function logError(message: string, error?: unknown): void {
  if (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[ERROR] ${message}`, isDevelopment ? error : errorMessage);
  } else {
    console.error(`[ERROR] ${message}`);
  }
}

/**
 * Log warning messages (development only)
 */
export function logWarning(message: string, data?: unknown): void {
  if (isDevelopment && data !== undefined) {
    console.warn(`[WARN] ${message}`, data);
  } else if (isDevelopment) {
    console.warn(`[WARN] ${message}`);
  }
}

/**
 * Log debug messages (development only)
 */
export function logDebug(message: string, data?: unknown): void {
  if (isDevelopment && data !== undefined) {
    console.debug(`[DEBUG] ${message}`, data);
  } else if (isDevelopment) {
    console.debug(`[DEBUG] ${message}`);
  }
}

