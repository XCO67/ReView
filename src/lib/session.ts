import { cookies } from 'next/headers';
import { JWTPayload, SignJWT, jwtVerify } from 'jose';

const SESSION_COOKIE = 'app_session';
const SESSION_MAX_AGE = 60 * 60; // 1 hour

const secret = process.env.SESSION_SECRET;

if (!secret) {
  throw new Error('Missing SESSION_SECRET environment variable.');
}

const secretKey = new TextEncoder().encode(secret);

export interface AppSession extends JWTPayload {
  sub: string;
  email?: string;
  name?: string;
  roles: string[];
  idToken?: string;
}

export async function createSessionToken(payload: AppSession, expiresInSeconds = SESSION_MAX_AGE) {
  const jwt = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + expiresInSeconds)
    .sign(secretKey);

  return jwt;
}

export async function verifySessionToken(token?: string) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return payload as AppSession;
  } catch {
    return null;
  }
}

export async function getSession() {
  const store = cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  return verifySessionToken(token);
}

export function setSessionCookie(token: string) {
  cookies().set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
}

export function clearSessionCookie() {
  cookies().delete(SESSION_COOKIE);
}

export function getSessionCookieName() {
  return SESSION_COOKIE;
}


