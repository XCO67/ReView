/**
 * Database Connection Module
 * 
 * Manages PostgreSQL connection pooling and initialization.
 * Provides a singleton database connection pool for the application.
 * 
 * @module database/connection
 */

import { Pool } from 'pg';

let pool: Pool | null = null;

/**
 * Constructs the database connection string from environment variables.
 * 
 * Supports two formats:
 * 1. DATABASE_URL - Full connection string
 * 2. Individual DB_* variables (DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD)
 * 
 * @returns {string} PostgreSQL connection string
 * @throws {Error} If no valid database configuration is found
 */
function getConnectionString(): string {
  const connectionString = process.env.DATABASE_URL;
  if (connectionString) {
    // Validate that it's not pointing to localhost in production
    if ((process.env.NODE_ENV === 'production' || process.env.VERCEL) && connectionString.includes('localhost')) {
      throw new Error(
        'DATABASE_URL cannot point to localhost in production. Please use a cloud database (Supabase, AWS RDS, etc.) and update your DATABASE_URL in Vercel environment variables.'
      );
    }
    return connectionString;
  }

  const { DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD } = process.env;

  if (DB_HOST && DB_NAME && DB_USER && DB_PASSWORD) {
    const host = DB_HOST.trim();
    
    // Validate that host is not localhost in production
    if ((process.env.NODE_ENV === 'production' || process.env.VERCEL) && 
        (host === 'localhost' || host === '127.0.0.1' || host.startsWith('localhost:'))) {
      throw new Error(
        'DB_HOST cannot be localhost in production. Please use a cloud database hostname and update your environment variables in Vercel.'
      );
    }
    
    const port = DB_PORT ? DB_PORT.trim() : '5432';
    const database = DB_NAME.trim();
    const user = encodeURIComponent(DB_USER.trim());
    const password = encodeURIComponent(DB_PASSWORD.trim());
    return `postgres://${user}:${password}@${host}:${port}/${database}`;
  }

  throw new Error(
    'DATABASE_URL or DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD environment variables must be set. ' +
    'For Vercel deployment, you must use a cloud database (not localhost).'
  );
}

/**
 * Gets or creates the database connection pool.
 * 
 * Uses singleton pattern to ensure only one pool instance exists.
 * Configures connection pooling with environment-based settings.
 * 
 * @returns {Pool} PostgreSQL connection pool
 */
export function getDb(): Pool {
  if (pool) {
    return pool;
  }

  const connectionString = getConnectionString();

  pool = new Pool({
    connectionString,
    max: Number(process.env.DB_POOL_MAX ?? '10'),
    idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS ?? '30000'),
    connectionTimeoutMillis: Number(process.env.DB_CONN_TIMEOUT_MS ?? '20000'), // Increased timeout for cloud DBs
    ssl: process.env.NODE_ENV === 'production' || process.env.VERCEL ? { rejectUnauthorized: false } : false,
  });

  return pool;
}

/**
 * Initializes the database by creating required tables and setting up default roles.
 * 
 * This function:
 * - Creates roles, users, user_roles, and audit_logs tables if they don't exist
 * - Cleans up duplicate or old roles (viewer, developer, main-admin)
 * - Inserts default roles (admin, Super User, business roles)
 * 
 * Safe to call multiple times - uses IF NOT EXISTS and ON CONFLICT clauses.
 * 
 * @returns {Promise<void>}
 */
export async function initDb() {
  const db = getDb();
  
  // Create tables if they don't exist
  await db.query(`
    CREATE TABLE IF NOT EXISTS roles (
      id SERIAL PRIMARY KEY,
      name VARCHAR(50) UNIQUE NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(100) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Backfill username column for environments created before username support
  await db.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS username VARCHAR(100)
  `);

  // Ensure usernames exist for all records
  await db.query(`
    UPDATE users
    SET username = CONCAT('user_', id)
    WHERE (username IS NULL OR TRIM(username) = '')
  `);

  // Enforce NOT NULL once values are backfilled
  await db.query(`
    ALTER TABLE users
    ALTER COLUMN username SET NOT NULL
  `);

  await db.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username)
  `);

  await db.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email)
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS user_roles (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, role_id)
    )
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id)
  `);
  
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id)
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      event_type VARCHAR(50) NOT NULL,
      ip_address VARCHAR(100),
      user_agent TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at)
  `);

  // Clean up old roles (viewer, developer, main-admin) and duplicate Super User roles
  await db.query(`
    DELETE FROM roles 
    WHERE LOWER(name) IN ('viewer', 'developer', 'main-admin', 'super-user', 'super user')
  `);
  
  // Clean up duplicate 'Super User' entries if there are multiple
  await db.query(`
    DELETE FROM roles 
    WHERE name = 'Super User' 
    AND id NOT IN (SELECT MIN(id) FROM roles WHERE name = 'Super User')
  `);
  
  // Insert default roles if they don't exist
  await db.query(`
    INSERT INTO roles (name, description) 
    VALUES 
      ('admin', 'Main Admin'),
      ('Super User', 'Super User'),
      ('fi', 'Property (FI)'),
      ('eg', 'Energy (EG)'),
      ('ca', 'Cargo (CA)'),
      ('hu', 'Hull (HU)'),
      ('marine', 'Marine umbrella role (CA + HU)'),
      ('ac', 'Casualty (AC)'),
      ('en', 'Engineering (EN)'),
      ('li', 'Life (LI)')
    ON CONFLICT (name) DO NOTHING
  `);

  // Setup default admin will be done separately to ensure proper password hashing
}

