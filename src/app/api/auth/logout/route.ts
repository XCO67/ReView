import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getKeycloakClient, getPostLogoutRedirectUri } from '@/lib/auth';
import { getSessionCookieName, verifySessionToken, clearSessionCookie } from '@/lib/session';

export async function POST(request: NextRequest) {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get(getSessionCookieName());
  clearSessionCookie();

  if (!sessionCookie) {
    return NextResponse.redirect(new URL('/login', request.nextUrl.origin));
  }

  const session = await verifySessionToken(sessionCookie.value);
  if (!session?.idToken) {
    return NextResponse.redirect(new URL('/login', request.nextUrl.origin));
  }

  const client = await getKeycloakClient();
  const endSessionUrl = client.endSessionUrl({
    id_token_hint: session.idToken,
    post_logout_redirect_uri: getPostLogoutRedirectUri(),
  });

  return NextResponse.redirect(endSessionUrl);
}

export async function GET(request: NextRequest) {
  return POST(request);
}


