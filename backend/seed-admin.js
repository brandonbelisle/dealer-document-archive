// seed-admin.js
// Run once after schema import to create the initial admin user.
// Usage: node seed-admin.js
// Set ADMIN_PASSWORD env var for a custom password, or one will be generated.
require('dotenv').config();

const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const mysql = require('mysql2/promise');
const crypto = require('crypto');

function generateSecurePassword(length = 16) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
  let password = '';
  const randomBytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    password += chars[randomBytes[i] % chars.length];
  }
  return password;
}

async function seed() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'dealer_document_archive',
  });

  try {
    // Check if admin already exists
    const [existing] = await pool.execute("SELECT id FROM users WHERE username = 'admin'");
    if (existing.length > 0) {
      console.log('Admin user already exists. Skipping.');
      process.exit(0);
    }

    const id = uuidv4();
    const password = process.env.ADMIN_PASSWORD || generateSecurePassword(20);
    
    // Validate password meets requirements
    if (password.length <8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      console.error('Password must be at least 8 characters with uppercase, lowercase, and numbers.');
      process.exit(1);
    }
    
    const hash = await bcrypt.hash(password, 12);

    await pool.execute(
      'INSERT INTO users (id, username, email, password_hash, display_name) VALUES (?, ?, ?, ?, ?)',
      [id, 'admin', 'admin@dealer.com', hash, 'Admin User']
    );

    // Assign to Administrator group
    const [adminGroup] = await pool.execute("SELECT id FROM security_groups WHERE name = 'Administrator'");
    if (adminGroup.length > 0) {
      await pool.execute(
        'INSERT INTO user_group_memberships (user_id, group_id) VALUES (?, ?)',
        [id, adminGroup[0].id]
      );
    }

    // Also assign to User group
    const [userGroup] = await pool.execute("SELECT id FROM security_groups WHERE name = 'User'");
    if (userGroup.length > 0) {
      await pool.execute(
        'INSERT INTO user_group_memberships (user_id, group_id) VALUES (?, ?)',
        [id, userGroup[0].id]
      );
    }

    console.log('');
    console.log('  ┌─────────────────────────────────────────────────────┐');
    console.log('  │  Admin user created successfully                    │');
    console.log('  │                                                     │');
    console.log('  │  Username: admin');
    console.log(`  │  Password: ${password}`);
    console.log('  │                                                     │');
    console.log('  │  ⚠  SAVE THIS PASSWORD SECURELY!                   │');
    console.log('  │  ⚠  Change it immediately after first login!       │');
    console.log('  └─────────────────────────────────────────────────────┘');
    console.log('');
  } catch (err) {
    console.error('Seed failed:', err.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

seed();
