export const runtime = "nodejs";

import { NextResponse } from "next/server";

export async function GET() {
  try {
    return NextResponse.json({
      status: 'healthy',
      message: 'API server operational - database implementation removed',
      timestamp: new Date().toISOString(),
      database: 'removed',
      ready_for: 'PostgreSQL implementation'
    });
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Health check failed',
      timestamp: new Date().toISOString(),
      error: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
    }, { status: 500 });
  }
}
