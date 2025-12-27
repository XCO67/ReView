/**
 * Error Handling Utilities
 * 
 * Centralized error handling to avoid duplication
 */

/**
 * Validates API response structure
 * 
 * @param response - API response object
 * @returns True if response has valid data structure
 */
export function validateApiResponse(response: unknown): response is { data: unknown[] } {
  if (!response || typeof response !== 'object') {
    return false;
  }
  
  const resp = response as { data?: unknown };
  return Array.isArray(resp.data);
}

/**
 * Safe error handler for async operations
 * 
 * @param error - Error object
 * @param context - Context string for logging
 * @returns Sanitized error message
 */
export function handleError(error: unknown, context: string): string {
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  if (process.env.NODE_ENV === 'development') {
    console.error(`[${context}]`, error);
  }
  
  // Sanitize error messages in production
  if (process.env.NODE_ENV === 'production') {
    if (errorMessage.includes('password') || errorMessage.includes('secret')) {
      return 'Authentication failed';
    }
    if (errorMessage.includes('database') || errorMessage.includes('SQL')) {
      return 'Database error occurred';
    }
    if (errorMessage.includes('session') || errorMessage.includes('token')) {
      return 'Session error occurred';
    }
    return 'An error occurred. Please try again.';
  }
  
  return errorMessage;
}

/**
 * Wrapper for async operations with error handling
 * 
 * @param fn - Async function to execute
 * @param errorContext - Context for error messages
 * @returns Result or null if error
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  errorContext: string
): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    handleError(error, errorContext);
    return null;
  }
}

