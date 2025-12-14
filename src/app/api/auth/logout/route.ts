import { NextRequest, NextResponse } from 'next/server';
import { clearSessionCookie, getSessionFromRequest } from '@/lib/session';
import { recordAuditEvent } from '@/lib/audit-log';

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);

  if (session) {
    await recordAuditEvent(
      session.userId,
      'logout',
      request.headers.get('x-forwarded-for') ?? request.ip ?? 'unknown'
    );
  }

  const response = NextResponse.json({ success: true });
  clearSessionCookie(response.cookies);
  return response;
}

