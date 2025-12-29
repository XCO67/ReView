/**
 * Script to clean up duplicate admin users
 * Keeps only the first admin user (by ID) and removes admin role from others
 */

import { getDb } from '../src/lib/database/connection';
import { initDb } from '../src/lib/db';

async function cleanupDuplicateAdmins() {
  try {
    await initDb();
    const db = getDb();

    console.log('🔍 Finding admin users...');

    // Get all users with admin role
    const adminUsersResult = await db.query(`
      SELECT DISTINCT u.id, u.username, u.email, u.name, u.created_at
      FROM users u
      JOIN user_roles ur ON u.id = ur.user_id
      JOIN roles r ON ur.role_id = r.id
      WHERE LOWER(r.name) = 'admin'
      ORDER BY u.id ASC
    `);

    if (adminUsersResult.rows.length === 0) {
      console.log('✅ No admin users found.');
      return;
    }

    console.log(`📊 Found ${adminUsersResult.rows.length} admin user(s):`);
    adminUsersResult.rows.forEach((user, index) => {
      console.log(`   ${index + 1}. ID: ${user.id}, Name: ${user.name}, Email: ${user.email}, Created: ${user.created_at}`);
    });

    if (adminUsersResult.rows.length === 1) {
      console.log('✅ Only one admin user exists. No cleanup needed.');
      return;
    }

    // Keep the first admin (lowest ID)
    const mainAdmin = adminUsersResult.rows[0];
    const duplicateAdmins = adminUsersResult.rows.slice(1);

    console.log(`\n✅ Keeping main admin: ID ${mainAdmin.id} (${mainAdmin.name})`);
    console.log(`🗑️  Removing admin role from ${duplicateAdmins.length} duplicate admin(s):`);

    // Get admin role ID
    const adminRoleResult = await db.query(
      "SELECT id FROM roles WHERE LOWER(name) = 'admin' LIMIT 1"
    );

    if (adminRoleResult.rows.length === 0) {
      console.log('❌ Admin role not found in database.');
      return;
    }

    const adminRoleId = adminRoleResult.rows[0].id;

    // Remove admin role from duplicate users
    for (const duplicate of duplicateAdmins) {
      console.log(`   - Removing admin role from user ID ${duplicate.id} (${duplicate.name})`);
      
      await db.query(
        'DELETE FROM user_roles WHERE user_id = $1 AND role_id = $2',
        [duplicate.id, adminRoleId]
      );
    }

    console.log('\n✅ Cleanup completed successfully!');
    console.log(`📌 Main admin user: ID ${mainAdmin.id} (${mainAdmin.name})`);
    console.log(`📌 Removed admin role from ${duplicateAdmins.length} user(s)`);
  } catch (error) {
    console.error('❌ Error cleaning up duplicate admins:', error);
    throw error;
  }
}

// Run cleanup
cleanupDuplicateAdmins()
  .then(() => {
    console.log('\n✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

