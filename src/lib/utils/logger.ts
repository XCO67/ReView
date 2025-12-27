/**
 * Production-safe logging utility
 * 
 * Provides structured logging that:
 * - Only logs in development or when explicitly enabled
 * - Never exposes sensitive information
 * - Uses appropriate log levels
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private isLoggingEnabled = this.isDevelopment || process.env.ENABLE_LOGGING === 'true';

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(this.sanitizeContext(context))}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
  }

  private sanitizeContext(context: LogContext): LogContext {
    const sanitized: LogContext = {};
    const sensitiveKeys = ['password', 'secret', 'token', 'auth', 'credential', 'key', 'hash'];
    
    for (const [key, value] of Object.entries(context)) {
      const lowerKey = key.toLowerCase();
      if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }

  debug(message: string, context?: LogContext): void {
    if (this.isLoggingEnabled) {
      console.debug(this.formatMessage('debug', message, context));
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.isLoggingEnabled) {
      console.info(this.formatMessage('info', message, context));
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.isLoggingEnabled) {
      console.warn(this.formatMessage('warn', message, context));
    }
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    // Always log errors, but sanitize in production
    const errorContext: LogContext = { ...context };
    
    if (error instanceof Error) {
      if (this.isDevelopment) {
        errorContext.error = {
          message: error.message,
          stack: error.stack,
        };
      } else {
        errorContext.error = {
          message: error.message,
        };
      }
    } else if (error) {
      errorContext.error = String(error);
    }

    console.error(this.formatMessage('error', message, errorContext));
  }
}

export const logger = new Logger();
