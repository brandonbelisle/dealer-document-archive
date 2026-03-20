// config/db.js
// MySQL connection pool using mysql2/promise
const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'dealer_document_archive',
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  // Return dates as strings to avoid timezone issues
  dateStrings: true,
  // Return BIGINT as regular JavaScript numbers instead of BigInt objects.
  // This prevents React error #310 ("Objects are not valid as a React child")
  // when rendering COUNT(*) results directly.
  supportBigNumbers: true,
  bigNumberStrings: false,
});

// Test connection on startup
pool.getConnection()
  .then(conn => {
    console.log('✓ MySQL connected:', process.env.DB_NAME);
    conn.release();
  })
  .catch(err => {
    console.error('✗ MySQL connection failed:', err.message);
    process.exit(1);
  });

module.exports = pool;
