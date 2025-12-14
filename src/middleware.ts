/**
 * Next.js Middleware - Authentication & Authorization
 * 
 * Handles route protection and role-based access control for all application routes.
 * Verifies JWT session tokens and enforces role-based permissions.
 * 
 * @module middleware
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/session';

/**
 * Public paths that don't require authentication
 */
const PUBLIC_PATHS = [
  '/login',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/me',
  '/api/health',
];

/**
 * Role definitions for access control
 */
const ADMIN_ROLES = ['admin']; // Only main admin role
const SUPER_USER_ROLE = 'Super User'; // Super user has all data access but no admin panel
const BUSINESS_ROLES = ['fi', 'eg', 'ca', 'hu', 'marine', 'ac', 'en', 'li'];
const ALL_ACCESS_ROLES = [...ADMIN_ROLES, SUPER_USER_ROLE, ...BUSINESS_ROLES];

/**
 * Route permission mapping - defines which roles can access which routes
 */
const ROUTE_PERMISSIONS = [
  { path: '/admin', roles: ['admin'] }, // Only admin can access admin panel
  { path: '/world-map', roles: [...ADMIN_ROLES, SUPER_USER_ROLE, ...BUSINESS_ROLES] },
  { path: '/api/world-map', roles: [...ADMIN_ROLES, SUPER_USER_ROLE, ...BUSINESS_ROLES] },
  { path: '/dashboard', roles: ALL_ACCESS_ROLES },
  { path: '/analytics', roles: ALL_ACCESS_ROLES },
  { path: '/visualization', roles: ALL_ACCESS_ROLES },
  { path: '/overview', roles: ALL_ACCESS_ROLES },
  { path: '/monthly-overview', roles: ALL_ACCESS_ROLES },
  { path: '/quarterly-overview', roles: ALL_ACCESS_ROLES },
  { path: '/yearly-overview', roles: ALL_ACCESS_ROLES },
  { path: '/client-overview', roles: ALL_ACCESS_ROLES },
  { path: '/renewals', roles: ALL_ACCESS_ROLES },
  { path: '/api/data', roles: ALL_ACCESS_ROLES },
  { path: '/api/dimensions', roles: ALL_ACCESS_ROLES },
  { path: '/api/monthly', roles: ALL_ACCESS_ROLES },
  { path: '/api/quarterly', roles: ALL_ACCESS_ROLES },
  { path: '/api/yearly', roles: ALL_ACCESS_ROLES },
  { path: '/api/renewals', roles: ALL_ACCESS_ROLES },
  { path: '/api/analytics', roles: ALL_ACCESS_ROLES },
];

const DEFAULT_PROTECTED_ROLES = ALL_ACCESS_ROLES;

/**
 * Checks if a user has at least one of the required roles (case-insensitive).
 * 
 * @param {string[] | undefined} userRoles - The user's roles
 * @param {string[]} required - The required roles to check against
 * @returns {boolean} True if user has at least one required role
 */
function hasRole(userRoles: string[] | undefined, required: string[]): boolean {
  if (!required.length) return true;
  if (!userRoles || !userRoles.length) return false;
  return required.some((role) =>
    userRoles.some((userRole) => userRole.toLowerCase() === role.toLowerCase())
  );
}

/**
 * Next.js middleware function - intercepts all requests to enforce authentication and authorization.
 * 
 * Flow:
 * 1. Allows public paths without authentication
 * 2. Verifies JWT session token for protected paths
 * 3. Checks role-based permissions against route requirements
 * 4. Redirects unauthorized users to login
 * 5. Redirects users to appropriate dashboard based on their role
 * 
 * @param {NextRequest} request - The incoming request
 * @returns {Promise<NextResponse>} Response with potential redirects
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths, static files, and Next.js internals
  const isPublic = PUBLIC_PATHS.some((path) => pathname.startsWith(path));

  if (
    isPublic ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon') ||
    pathname.match(/\.(.*)$/)
  ) {
    const response = NextResponse.next();
    addSecurityHeaders(response);
    return response;
  }

  // Check for session
  const token = request.cookies.get('app_session')?.value;
  const session = await verifySessionToken(token);

  // No session - redirect to login
  if (!session) {
    // Use HTTP in development, preserve protocol in production
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? request.url 
      : request.url.replace(/^https:/, 'http:');
    const loginUrl = new URL('/login', baseUrl);
    loginUrl.searchParams.set('next', pathname);
    const response = NextResponse.redirect(loginUrl);
    addSecurityHeaders(response);
    return response;
  }

  // Handle root path - let the page component handle redirects
  if (pathname === '/') {
    const response = NextResponse.next();
    addSecurityHeaders(response);
    return response;
  }

  // Check route permissions
  const permission = ROUTE_PERMISSIONS.find((entry) =>
    pathname.startsWith(entry.path)
  );
  const allowedRoles = permission ? permission.roles : DEFAULT_PROTECTED_ROLES;

  // User doesn't have required role
  if (!hasRole(session.roles, allowedRoles)) {
    // Determine where to redirect based on user's roles
    let target = '/login';
    
    // Use HTTP in development, preserve protocol in production
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? request.url 
      : request.url.replace(/^https:/, 'http:');
    
    // Users with any admin, super-user, or business role go to dashboard
    if (hasRole(session.roles, ALL_ACCESS_ROLES)) {
      target = '/dashboard';
    }
    // Users with no valid roles - redirect to login with error
    else {
      const loginUrl = new URL('/login', baseUrl);
      loginUrl.searchParams.set('error', 'insufficient_permissions');
      const response = NextResponse.redirect(loginUrl);
      addSecurityHeaders(response);
      return response;
    }
    
    // Only redirect if we're not already going to the target
    if (pathname !== target) {
      const response = NextResponse.redirect(new URL(target, baseUrl));
      addSecurityHeaders(response);
      return response;
    }
  }

  const response = NextResponse.next();
  addSecurityHeaders(response);
  return response;
}

/**
 * Add comprehensive security headers to prevent information disclosure
 */
function addSecurityHeaders(response: NextResponse) {
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Content Security Policy - Strict policy to prevent XSS and data injection
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Required for Next.js
    "style-src 'self' 'unsafe-inline'", // Required for Tailwind
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-src 'none'",
    "object-src 'none'",
    // Only upgrade to HTTPS in production
    ...(isProduction ? ["upgrade-insecure-requests"] : []),
  ].join('; ');

  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  response.headers.set('Content-Security-Policy', csp);
  
  // Prevent information disclosure
  response.headers.set('X-Powered-By', ''); // Remove X-Powered-By header
  response.headers.set('Server', ''); // Remove server identification
  
  // Strict Transport Security (HTTPS only in production)
  if (isProduction) {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  
  // Additional security
  response.headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  response.headers.set('Cross-Origin-Resource-Policy', 'same-origin');

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};

