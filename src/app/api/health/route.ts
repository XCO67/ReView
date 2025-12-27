import { NextResponse } from 'next/server';
import { getDb } from '@/lib/database/connection';

/**
 * Health check endpoint for Railway
 * Returns status of the application and database connection
 */
export async function GET() {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'unknown',
    port: process.env.PORT || '3000',
    hostname: process.env.HOSTNAME || 'unknown',
    checks: {
      database: 'unknown',
      sessionSecret: !!process.env.SESSION_SECRET,
      databaseUrl: !!process.env.DATABASE_URL,
    },
  };

  // Test database connection
  try {
    const db = getDb();
    const result = await db.query('SELECT 1 as test, NOW() as current_time');
    health.checks.database = 'connected';
    health.checks.databaseTime = result.rows[0]?.current_time;
  } catch (error) {
    health.status = 'degraded';
    const errorMsg = error instanceof Error ? error.message : String(error);
    health.checks.database = `error: ${errorMsg}`;
    
    // Add helpful error details
    if (errorMsg.includes('timeout')) {
      health.checks.databaseError = 'Connection timeout - check network/firewall';
    } else if (errorMsg.includes('password') || errorMsg.includes('authentication')) {
      health.checks.databaseError = 'Authentication failed - check DATABASE_URL credentials';
    } else if (errorMsg.includes('ENOTFOUND') || errorMsg.includes('getaddrinfo')) {
      health.checks.databaseError = 'DNS resolution failed - check DATABASE_URL hostname';
    } else if (errorMsg.includes('SSL') || errorMsg.includes('certificate')) {
      health.checks.databaseError = 'SSL connection issue - Supabase requires SSL';
    }
  }

  const statusCode = health.status === 'ok' ? 200 : 503;
  return NextResponse.json(health, { status: statusCode });
}
