// seed-admin.js
// Run once after schema import to create the initial admin user.
// Usage: node seed-admin.js
require('dotenv').config();

const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const mysql = require('mysql2/promise');

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
    const hash = await bcrypt.hash('admin', 12); // Change this password!

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

    console.log('✓ Admin user created successfully');
    console.log('  Username: admin');
    console.log('  Password: admin');
    console.log('  ⚠ Change this password immediately!');
  } catch (err) {
    console.error('Seed failed:', err.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

seed();
