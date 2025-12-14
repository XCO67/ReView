import { NextRequest, NextResponse } from 'next/server';
import { getUserByUsername, getUserByEmail, verifyPassword, getUserWithRoles } from '@/lib/db-queries';
import { createSessionToken, setSessionCookie } from '@/lib/session';
import { initDb } from '@/lib/db';
import { setupDefaultAdmin } from '@/lib/setup-admin';
import { recordAuditEvent } from '@/lib/audit-log';
import { 
  isAccountLocked, 
  recordFailedAttempt, 
  clearFailedAttempts 
} from '@/lib/rate-limit';
import { safeError, sanitizeError } from '@/lib/security-utils';

export async function POST(request: NextRequest) {
  try {
    // Initialize database if needed
    await initDb();
    // Setup default admin user
    await setupDefaultAdmin();

    const { username, password } = await request.json();

    const identifier = typeof username === 'string' ? username.trim() : '';
    const secret = typeof password === 'string' ? password : '';
    
    // Get client IP address
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
            || request.headers.get('x-real-ip') 
            || 'unknown';

    if (!identifier || !secret) {
      return NextResponse.json(
        { error: 'Username (or email) and password are required' },
        { status: 400 }
      );
    }

    // Check if account is locked
    const lockoutStatus = isAccountLocked(identifier);
    if (lockoutStatus.locked) {
      const unlockTime = new Date(lockoutStatus.unlockAt!).toISOString();
      return NextResponse.json(
        { 
          error: 'Account temporarily locked due to too many failed login attempts. Please try again later.',
          unlockAt: unlockTime
        },
        { status: 423 } // 423 Locked
      );
    }

    // Get user from database
    let user = await getUserByUsername(identifier);

    // Backward-compatible: allow logging in with email if username lookup fails
    if (!user && identifier.includes('@')) {
      user = await getUserByEmail(identifier);
    }

    // Verify password (even if user doesn't exist, to prevent user enumeration)
    let isValid = false;
    if (user) {
      isValid = await verifyPassword(secret, user.password_hash);
    } else {
      // Fake password verification to prevent timing attacks and user enumeration
      await verifyPassword(secret, '$2a$12$fakehashforsecuritypurposesonly');
    }

    // If password is invalid, record failed attempt
    if (!isValid) {
      const attemptResult = recordFailedAttempt(identifier, ip);
      
      // Record failed login attempt in audit log (only if user exists)
      if (user) {
        await recordAuditEvent(user.id, 'login_failed', ip);
      }
      
      // Check if account is now locked
      if (!attemptResult.allowed) {
        const unlockTime = new Date(attemptResult.lockedUntil!).toISOString();
        return NextResponse.json(
          { 
            error: 'Too many failed login attempts. Account locked for 30 minutes.',
            unlockAt: unlockTime
          },
          { status: 423 }
        );
      }
      
      return NextResponse.json(
        { 
          error: 'Invalid username or password',
          remainingAttempts: attemptResult.remainingAttempts
        },
        { status: 401 }
      );
    }

    // User doesn't exist (but password check passed to prevent enumeration)
    if (!user) {
      // Still record failed attempt to prevent enumeration
      recordFailedAttempt(identifier, ip);
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    // Check if account is active
    if (!user.is_active) {
      return NextResponse.json(
        { error: 'Account is disabled. Please contact administrator.' },
        { status: 403 }
      );
    }

    // Successful login - clear failed attempts
    clearFailedAttempts(identifier, ip);

    // Get user with roles
    const userWithRoles = await getUserWithRoles(user.id);

    if (!userWithRoles) {
      return NextResponse.json(
        { error: 'Failed to load user data' },
        { status: 500 }
      );
    }

    // Create session token
    const sessionToken = await createSessionToken({
      userId: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      roles: userWithRoles.roles.map(r => r.name),
    });

    // Set session cookie
    const response = NextResponse.json({ success: true });
    setSessionCookie(sessionToken, response.cookies);

    // Record successful login audit
    await recordAuditEvent(user.id, 'login', ip);

    return response;
  } catch (error) {
    safeError('Login error:', error);
    const errorMessage = sanitizeError(error, false); // Always show detailed errors for debugging
    console.error('Login API Error:', errorMessage);
    
    // Check for specific error types
    if (error instanceof Error) {
      if (error.message.includes('SESSION_SECRET')) {
        return NextResponse.json(
          { error: 'Server configuration error: SESSION_SECRET is missing. Please contact administrator.' },
          { status: 500 }
        );
      }
      if (error.message.includes('DATABASE_URL') || error.message.includes('DB_HOST')) {
        return NextResponse.json(
          { error: 'Server configuration error: Database connection not configured. Please contact administrator.' },
          { status: 500 }
        );
      }
    }
    
    return NextResponse.json(
      { error: `Login failed: ${errorMessage}` },
      { status: 500 }
    );
  }
}

