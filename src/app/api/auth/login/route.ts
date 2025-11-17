import { NextRequest, NextResponse } from 'next/server';
import { generators } from 'openid-client';
import { cookies } from 'next/headers';
import { getKeycloakClient, getKeycloakRedirectUri } from '@/lib/auth';

const PKCE_COOKIE = 'kc_pkce';
const REDIRECT_COOKIE = 'post_login_redirect';

export async function GET(request: NextRequest) {
  const client = await getKeycloakClient();
  const state = generators.state();
  const codeVerifier = generators.codeVerifier();
  const codeChallenge = generators.codeChallenge(codeVerifier);
  const scope = 'openid profile email';

  const authorizationUrl = client.authorizationUrl({
    scope,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    redirect_uri: getKeycloakRedirectUri(),
  });

  const cookieStore = cookies();
  cookieStore.set({
    name: PKCE_COOKIE,
    value: JSON.stringify({ state, codeVerifier }),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 5,
  });

  const nextParam = request.nextUrl.searchParams.get('next');
  if (nextParam) {
    cookieStore.set({
      name: REDIRECT_COOKIE,
      value: nextParam,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 10,
    });
  }

  return NextResponse.redirect(authorizationUrl);
}


