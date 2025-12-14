import { getDb } from './connection';
import { hashPassword } from '../auth/password';

type SeedUserOptions = {
  username: string;
  email: string;
  password: string;
  name: string;
  roles: string[];
};

async function upsertUserWithRoles({ username, email, password, name, roles }: SeedUserOptions) {
  const db = getDb();
  // Hash password securely with salt
  const passwordHash = await hashPassword(password);

  const result = await db.query<{ id: number }>(
    `
    INSERT INTO users (username, email, password_hash, name, is_active)
    VALUES ($1, $2, $3, $4, true)
    ON CONFLICT (email) 
    DO UPDATE SET 
      username = EXCLUDED.username,
      password_hash = EXCLUDED.password_hash,
      name = EXCLUDED.name,
      is_active = EXCLUDED.is_active,
      updated_at = CURRENT_TIMESTAMP
    RETURNING id
  `,
    [username, email, passwordHash, name]
  );

  const userId = result.rows[0]?.id;
  if (!userId || roles.length === 0) {
    return;
  }

  await db.query(
    `
    INSERT INTO user_roles (user_id, role_id)
    SELECT $1, r.id
    FROM roles r
    WHERE r.name = ANY($2::text[])
    ON CONFLICT (user_id, role_id) DO NOTHING
  `,
    [userId, roles]
  );
}

function resolveCredential({
  value,
  fallback,
  name,
}: {
  value?: string;
  fallback: string;
  name: string;
}): string {
  if (value && value.trim().length >= 8) {
    return value.trim();
  }

  console.warn(
    `[setup-admin] ${name} is not set or too short; using fallback value. Update your .env to override this default.`
  );
  return fallback;
}

export async function setupDefaultAdmin() {
  const adminUsername = process.env.DEFAULT_ADMIN_USERNAME ?? 'mainadmin';
  const adminEmail = process.env.DEFAULT_ADMIN_EMAIL ?? 'admin@kuwaitre.com';
  const adminPassword = resolveCredential({
    value: process.env.DEFAULT_ADMIN_PASSWORD,
    fallback: 'KuwaitRe2024!Secure',
    name: 'DEFAULT_ADMIN_PASSWORD',
  });

  await upsertUserWithRoles({
    username: adminUsername,
    email: adminEmail,
    password: adminPassword,
    name: 'System Administrator',
    roles: ['admin'],
  });

  // Old viewer and developer roles removed - no longer needed
}

