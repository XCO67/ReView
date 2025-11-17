import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/session';

function hasRole(roles: string[] | undefined, required: string) {
  if (!roles) return false;
  return roles.some((role) => role.toLowerCase() === required.toLowerCase());
}

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('app_session')?.value;
  const session = await verifySessionToken(token);

  if (!session) {
    const loginUrl = new URL('/login', request.nextUrl.origin);
    loginUrl.searchParams.set('next', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (!hasRole(session.roles, 'main-admin')) {
    return NextResponse.redirect(new URL('/', request.nextUrl.origin));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};


