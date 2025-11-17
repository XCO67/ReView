import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getKeycloakClient, getKeycloakRedirectUri, KEYCLOAK_CLIENT_ID } from '@/lib/auth';
import { createSessionToken, setSessionCookie } from '@/lib/session';

const PKCE_COOKIE = 'kc_pkce';
const REDIRECT_COOKIE = 'post_login_redirect';

function parseStoredVerifier(value?: string | null) {
  if (!value) return null;
  try {
    return JSON.parse(value) as { state: string; codeVerifier: string };
  } catch {
    return null;
  }
}

function sanitizeRedirect(nextUrl: string | undefined, fallback: string) {
  if (!nextUrl) return fallback;
  if (!nextUrl.startsWith('/')) return fallback;
  return nextUrl;
}

export async function GET(request: NextRequest) {
  const client = await getKeycloakClient();
  const params = client.callbackParams(request);
  const cookieStore = cookies();
  const storedVerifier = parseStoredVerifier(cookieStore.get(PKCE_COOKIE)?.value);

  if (!storedVerifier) {
    return NextResponse.redirect(new URL('/login?error=missing_pkce', request.nextUrl.origin));
  }

  if (params.state !== storedVerifier.state) {
    cookieStore.delete(PKCE_COOKIE);
    return NextResponse.redirect(new URL('/login?error=invalid_state', request.nextUrl.origin));
  }

  try {
    const tokenSet = await client.callback(
      getKeycloakRedirectUri(),
      params,
      {
        code_verifier: storedVerifier.codeVerifier,
        state: storedVerifier.state,
      },
      { exchangeBody: { client_id: KEYCLOAK_CLIENT_ID } },
    );

    const claims = tokenSet.claims();
    const realmRoles = (claims.realm_access?.roles ?? []) as string[];
    const resourceRoles =
      (claims.resource_access?.[KEYCLOAK_CLIENT_ID]?.roles as string[] | undefined) ?? [];
    const roles = Array.from(new Set([...realmRoles, ...resourceRoles]));

    const sessionToken = await createSessionToken({
      sub: claims.sub as string,
      email: claims.email as string | undefined,
      name: (claims.name as string | undefined) ?? [claims.given_name, claims.family_name].filter(Boolean).join(' '),
      roles,
      idToken: tokenSet.id_token ?? undefined,
    });

    setSessionCookie(sessionToken);
    cookieStore.delete(PKCE_COOKIE);
    const nextPath = sanitizeRedirect(cookieStore.get(REDIRECT_COOKIE)?.value, '/');
    cookieStore.delete(REDIRECT_COOKIE);
    return NextResponse.redirect(new URL(nextPath, request.nextUrl.origin));
  } catch (error) {
    console.error('Keycloak callback error', error);
    cookieStore.delete(PKCE_COOKIE);
    return NextResponse.redirect(new URL('/login?error=callback_failed', request.nextUrl.origin));
  }
}

