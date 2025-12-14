/**
 * Database Queries Module
 * 
 * Provides all database query functions for user and role management.
 * Handles CRUD operations for users, roles, and user-role assignments.
 * 
 * @module database/queries
 */

import { getDb } from './connection';
import type { User, Role, UserWithRoles, CreateUserInput, UpdateUserInput } from './types';
import { hashPassword, verifyPassword as verifyPasswordSecure, validatePassword } from '../auth/password';

/**
 * Retrieves a user by their email address.
 * 
 * @param {string} email - The email address to search for
 * @returns {Promise<User | null>} The user object if found, null otherwise
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  const db = getDb();
  const result = await db.query<User>(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );
  return result.rows[0] || null;
}

/**
 * Retrieves a user by their username (case-insensitive).
 * 
 * @param {string} username - The username to search for
 * @returns {Promise<User | null>} The user object if found, null otherwise
 */
export async function getUserByUsername(username: string): Promise<User | null> {
  const db = getDb();
  const result = await db.query<User>(
    'SELECT * FROM users WHERE LOWER(username) = LOWER($1)',
    [username]
  );
  return result.rows[0] || null;
}

/**
 * Retrieves a user by their unique ID.
 * 
 * @param {number} id - The user's unique identifier
 * @returns {Promise<User | null>} The user object if found, null otherwise
 */
export async function getUserById(id: number): Promise<User | null> {
  const db = getDb();
  const result = await db.query<User>(
    'SELECT * FROM users WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}

/**
 * Retrieves a user with all their associated roles.
 * 
 * @param {number} id - The user's unique identifier
 * @returns {Promise<UserWithRoles | null>} User object with roles array, or null if not found
 */
export async function getUserWithRoles(id: number): Promise<UserWithRoles | null> {
  const db = getDb();
  const result = await db.query<{
    id: number;
    username: string;
    email: string;
    name: string;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
    role_id: number;
    role_name: string;
    role_description: string | null;
  }>(
    `SELECT 
      u.id, u.username, u.email, u.name, u.is_active, u.created_at, u.updated_at,
      r.id as role_id, r.name as role_name, r.description as role_description
    FROM users u
    LEFT JOIN user_roles ur ON u.id = ur.user_id
    LEFT JOIN roles r ON ur.role_id = r.id
    WHERE u.id = $1`,
    [id]
  );

  if (result.rows.length === 0) return null;

  const firstRow = result.rows[0];
  const user: UserWithRoles = {
    id: firstRow.id,
    username: firstRow.username,
    email: firstRow.email,
    name: firstRow.name,
    is_active: firstRow.is_active,
    created_at: firstRow.created_at,
    updated_at: firstRow.updated_at,
    roles: [],
  };

  result.rows.forEach((row) => {
    if (row.role_id) {
      user.roles.push({
        id: row.role_id,
        name: row.role_name,
        description: row.role_description,
        created_at: firstRow.created_at,
      });
    }
  });

  return user;
}

export async function getAllUsers(): Promise<UserWithRoles[]> {
  const db = getDb();
  const result = await db.query<{
    id: number;
    username: string;
    email: string;
    name: string;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
    role_id: number | null;
    role_name: string | null;
    role_description: string | null;
  }>(
    `SELECT 
      u.id, u.username, u.email, u.name, u.is_active, u.created_at, u.updated_at,
      r.id as role_id, r.name as role_name, r.description as role_description
    FROM users u
    LEFT JOIN user_roles ur ON u.id = ur.user_id
    LEFT JOIN roles r ON ur.role_id = r.id
    ORDER BY u.created_at DESC`
  );

  const userMap = new Map<number, UserWithRoles>();

  result.rows.forEach((row) => {
    if (!userMap.has(row.id)) {
      userMap.set(row.id, {
        id: row.id,
        username: row.username,
        email: row.email,
        name: row.name,
        is_active: row.is_active,
        created_at: row.created_at,
        updated_at: row.updated_at,
        roles: [],
      });
    }

    const user = userMap.get(row.id)!;
    if (row.role_id) {
      user.roles.push({
        id: row.role_id,
        name: row.role_name!,
        description: row.role_description,
        created_at: row.created_at,
      });
    }
  });

  return Array.from(userMap.values());
}

export async function createUser(input: CreateUserInput): Promise<UserWithRoles> {
  const db = getDb();
  
  // Validate password before hashing
  const passwordValidation = validatePassword(input.password);
  if (!passwordValidation.isValid) {
    throw new Error(`Password validation failed: ${passwordValidation.errors.join(', ')}`);
  }
  
  // Hash password securely with salt
  const passwordHash = await hashPassword(input.password);

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const userResult = await client.query<User>(
      `INSERT INTO users (username, email, password_hash, name)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [input.username, input.email, passwordHash, input.name]
    );

    const user = userResult.rows[0];

    if (input.role_ids.length > 0) {
      const values = input.role_ids.map((roleId, idx) => 
        `($${idx * 2 + 1}, $${idx * 2 + 2})`
      ).join(', ');
      const params = input.role_ids.flatMap(roleId => [user.id, roleId]);
      
      await client.query(
        `INSERT INTO user_roles (user_id, role_id) VALUES ${values}`,
        params
      );
    }

    await client.query('COMMIT');

    const userWithRoles = await getUserWithRoles(user.id);
    return userWithRoles!;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function updateUser(id: number, input: UpdateUserInput): Promise<UserWithRoles> {
  const db = getDb();
  const client = await db.connect();
  
  try {
    await client.query('BEGIN');

    const updates: string[] = [];
    const params: unknown[] = [];
    let paramCount = 1;

    if (input.username !== undefined) {
      updates.push(`username = $${paramCount++}`);
      params.push(input.username);
    }
    if (input.email !== undefined) {
      updates.push(`email = $${paramCount++}`);
      params.push(input.email);
    }
    if (input.name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      params.push(input.name);
    }
    if (input.password !== undefined && input.password.trim() !== '') {
      // Validate password before hashing
      const passwordValidation = validatePassword(input.password);
      if (!passwordValidation.isValid) {
        throw new Error(`Password validation failed: ${passwordValidation.errors.join(', ')}`);
      }
      
      // Hash password securely with salt
      const passwordHash = await hashPassword(input.password);
      updates.push(`password_hash = $${paramCount++}`);
      params.push(passwordHash);
    }
    if (input.is_active !== undefined) {
      updates.push(`is_active = $${paramCount++}`);
      params.push(input.is_active);
    }
    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    if (updates.length > 1) {
      params.push(id);
      await client.query(
        `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount}`,
        params
      );
    }

    if (input.role_ids !== undefined) {
      await client.query('DELETE FROM user_roles WHERE user_id = $1', [id]);
      
      if (input.role_ids.length > 0) {
        const values = input.role_ids.map((roleId, idx) => 
          `($${idx * 2 + 1}, $${idx * 2 + 2})`
        ).join(', ');
        const roleParams = input.role_ids.flatMap(roleId => [id, roleId]);
        
        await client.query(
          `INSERT INTO user_roles (user_id, role_id) VALUES ${values}`,
          roleParams
        );
      }
    }

    await client.query('COMMIT');

    const userWithRoles = await getUserWithRoles(id);
    return userWithRoles!;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteUser(id: number): Promise<void> {
  const db = getDb();
  await db.query('DELETE FROM users WHERE id = $1', [id]);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return verifyPasswordSecure(password, hash);
}

/**
 * Clean up duplicate Super User roles (case variations)
 * This handles foreign key constraints by migrating user_roles first
 */
export async function cleanupDuplicateRoles(): Promise<void> {
  const db = getDb();
  
  try {
    // Step 1: Find the canonical Super User role (the one to keep)
    const canonicalResult = await db.query<{ id: number }>(`
      SELECT id FROM roles 
      WHERE name = 'Super User' 
      ORDER BY id ASC 
      LIMIT 1
    `);
    
    if (canonicalResult.rows.length === 0) {
      // No Super User exists, check for variations
      const variationResult = await db.query<{ id: number; name: string }>(`
        SELECT id, name FROM roles 
        WHERE LOWER(name) IN ('super-user', 'super user')
        ORDER BY id ASC 
        LIMIT 1
      `);
      
      if (variationResult.rows.length > 0) {
        // Rename the first variation to 'Super User'
        await db.query(`
          UPDATE roles 
          SET name = 'Super User',
              description = 'Super User'
          WHERE id = $1
        `, [variationResult.rows[0].id]);
      }
      return;
    }
    
    const canonicalId = canonicalResult.rows[0].id;
    
    // Ensure canonical Super User has correct description
    await db.query(`
      UPDATE roles 
      SET description = 'Super User'
      WHERE id = $1
    `, [canonicalId]);
    
    // Step 2: Migrate all user_roles from duplicate roles to the canonical one
    await db.query(`
      UPDATE user_roles 
      SET role_id = $1
      WHERE role_id IN (
        SELECT id FROM roles 
        WHERE (LOWER(name) IN ('super-user', 'super user') OR name = 'Super User')
        AND id != $1
      )
      AND NOT EXISTS (
        SELECT 1 FROM user_roles ur2 
        WHERE ur2.user_id = user_roles.user_id 
        AND ur2.role_id = $1
      )
    `, [canonicalId]);
    
    // Step 3: Delete duplicate roles (now safe since user_roles are migrated)
    await db.query(`
      DELETE FROM roles 
      WHERE (LOWER(name) IN ('super-user', 'super user') OR name = 'Super User')
      AND id != $1
    `, [canonicalId]);
    
  } catch (error) {
    console.error('Error cleaning up duplicate roles:', error);
    // Don't throw - allow the query to continue
  }
}

export async function getAllRoles(): Promise<Role[]> {
  const db = getDb();
  
  // Clean up duplicates before fetching
  await cleanupDuplicateRoles();
  
  const result = await db.query<Role>('SELECT * FROM roles ORDER BY name');
  return result.rows;
}

export async function createRole(name: string, description: string | null): Promise<Role> {
  const db = getDb();
  const result = await db.query<Role>(
    'INSERT INTO roles (name, description) VALUES ($1, $2) RETURNING *',
    [name, description]
  );
  return result.rows[0];
}

export async function deleteRole(id: number): Promise<void> {
  const db = getDb();
  
  // Check if it's a default role
  const result = await db.query<{ name: string }>('SELECT name FROM roles WHERE id = $1', [id]);
  const role = result.rows[0];
  
  if (role) {
    const defaultRoles = ['admin', 'Super User'];
    if (defaultRoles.includes(role.name.toLowerCase())) {
      throw new Error('Cannot delete default roles');
    }
  }
  
  await db.query('DELETE FROM roles WHERE id = $1', [id]);
}

export async function getActiveUserCounts(): Promise<{
  adminCount: number;
  nonAdminCount: number;
  totalActive: number;
}> {
  const db = getDb();
  const result = await db.query<{
    group_tag: 'admin' | 'non_admin';
    count: number;
  }>(
    `
    SELECT
      CASE
        WHEN EXISTS (
          SELECT 1
          FROM user_roles ur
          JOIN roles r ON ur.role_id = r.id
          WHERE ur.user_id = u.id
            AND LOWER(r.name) = 'admin'
        ) THEN 'admin'
        ELSE 'non_admin'
      END AS group_tag,
      COUNT(*)::int AS count
    FROM users u
    WHERE u.is_active = TRUE
    GROUP BY group_tag
    `
  );

  let adminCount = 0;
  let nonAdminCount = 0;
  result.rows.forEach((row) => {
    if (row.group_tag === 'admin') {
      adminCount = row.count;
    } else {
      nonAdminCount = row.count;
    }
  });

  return {
    adminCount,
    nonAdminCount,
    totalActive: adminCount + nonAdminCount,
  };
}

