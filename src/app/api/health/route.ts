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
    await db.query('SELECT 1');
    health.checks.database = 'connected';
  } catch (error) {
    health.status = 'degraded';
    health.checks.database = `error: ${error instanceof Error ? error.message : 'unknown'}`;
  }

  const statusCode = health.status === 'ok' ? 200 : 503;
  return NextResponse.json(health, { status: statusCode });
}
