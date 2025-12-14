/**
 * Password Security Utilities
 * Provides secure password hashing, validation, and verification
 */

import bcrypt from 'bcryptjs';

// Security configuration
export const PASSWORD_CONFIG = {
  // Bcrypt salt rounds (12 is recommended for 2024+)
  // Higher rounds = more secure but slower
  // 12 rounds takes ~300ms, which is acceptable for login
  SALT_ROUNDS: 12,
  
  // Password requirements
  MIN_LENGTH: 8,
  MAX_LENGTH: 128,
  REQUIRE_UPPERCASE: true,
  REQUIRE_LOWERCASE: true,
  REQUIRE_NUMBER: true,
  REQUIRE_SPECIAL: true,
  
  // Special characters allowed
  SPECIAL_CHARS: '!@#$%^&*()_+-=[]{}|;:,.<>?',
} as const;

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];
  
  if (!password || typeof password !== 'string') {
    return {
      isValid: false,
      errors: ['Password is required'],
    };
  }
  
  const trimmed = password.trim();
  
  // Check minimum length
  if (trimmed.length < PASSWORD_CONFIG.MIN_LENGTH) {
    errors.push(`Password must be at least ${PASSWORD_CONFIG.MIN_LENGTH} characters long`);
  }
  
  // Check maximum length
  if (trimmed.length > PASSWORD_CONFIG.MAX_LENGTH) {
    errors.push(`Password must be no more than ${PASSWORD_CONFIG.MAX_LENGTH} characters long`);
  }
  
  // Check for uppercase
  if (PASSWORD_CONFIG.REQUIRE_UPPERCASE && !/[A-Z]/.test(trimmed)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  // Check for lowercase
  if (PASSWORD_CONFIG.REQUIRE_LOWERCASE && !/[a-z]/.test(trimmed)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  // Check for number
  if (PASSWORD_CONFIG.REQUIRE_NUMBER && !/[0-9]/.test(trimmed)) {
    errors.push('Password must contain at least one number');
  }
  
  // Check for special character
  if (PASSWORD_CONFIG.REQUIRE_SPECIAL) {
    const specialRegex = new RegExp(`[${PASSWORD_CONFIG.SPECIAL_CHARS.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`);
    if (!specialRegex.test(trimmed)) {
      errors.push(`Password must contain at least one special character (${PASSWORD_CONFIG.SPECIAL_CHARS})`);
    }
  }
  
  // Check for common weak passwords
  const commonPasswords = [
    'password', 'password123', 'admin', 'admin123',
    '12345678', 'qwerty', 'letmein', 'welcome',
  ];
  if (commonPasswords.some(weak => trimmed.toLowerCase().includes(weak))) {
    errors.push('Password is too common or weak');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Hash password securely using bcrypt with salt
 * This automatically generates a unique salt for each password
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password || typeof password !== 'string' || password.trim().length === 0) {
    throw new Error('Password cannot be empty');
  }
  
  // Validate password before hashing
  const validation = validatePassword(password);
  if (!validation.isValid) {
    throw new Error(`Invalid password: ${validation.errors.join(', ')}`);
  }
  
  // Hash with bcrypt (automatically includes salt)
  const hash = await bcrypt.hash(password.trim(), PASSWORD_CONFIG.SALT_ROUNDS);
  return hash;
}

/**
 * Verify password against hash
 * Uses constant-time comparison to prevent timing attacks
 */
export async function verifyPassword(
  plainPassword: string,
  hashedPassword: string
): Promise<boolean> {
  if (!plainPassword || !hashedPassword) {
    return false;
  }
  
  try {
    // bcrypt.compare uses constant-time comparison internally
    return await bcrypt.compare(plainPassword, hashedPassword);
  } catch (error) {
    console.error('Password verification error:', error);
    return false;
  }
}

/**
 * Check if a password hash needs to be rehashed (e.g., if salt rounds increased)
 */
export function needsRehash(hash: string): boolean {
  // Extract the rounds from the bcrypt hash
  // Format: $2a$rounds$salt+hash
  const match = hash.match(/^\$2[aby]\$(\d+)\$/);
  if (!match) {
    return true; // Invalid hash format, needs rehash
  }
  
  const currentRounds = parseInt(match[1], 10);
  return currentRounds < PASSWORD_CONFIG.SALT_ROUNDS;
}

/**
 * Generate a secure random password (for admin use)
 */
export function generateSecurePassword(length: number = 16): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = PASSWORD_CONFIG.SPECIAL_CHARS;
  
  const allChars = uppercase + lowercase + numbers + special;
  
  // Ensure at least one of each required type
  let password = '';
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];
  
  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  return password
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('');
}

