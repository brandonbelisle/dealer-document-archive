// routes/dms.js
// DMS (Document Management System) connection settings for Microsoft SQL Server
const express = require('express');
const sql = require('mssql');
const db = require('../config/db');
const { requireAuth, requirePermission } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

const router = express.Router();

// Encryption helper for sensitive fields
const crypto = require('crypto');
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-encryption-key-32-chars!!';
const ALGORITHM = 'aes-256-cbc';

function encrypt(text) {
  if (!text) return '';
  const iv = crypto.randomBytes(16);
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(encrypted) {
  if (!encrypted || !encrypted.includes(':')) return '';
  try {
    const [ivHex, data] = encrypted.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('Failed to decrypt DMS password:', err.message);
    return '';
  }
}

// ── GET /api/dms-settings ───────────────────────────────────
// Get current DMS connection settings (password masked)
router.get('/', requireAuth, requirePermission('manageSettings'), async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM dms_settings WHERE id = 1');
    if (rows.length === 0) {
      return res.json({
        server: '',
        port: 1433,
        database: '',
        username: '',
        password: '',
        trustCertificate: false,
        encryptConnection: true,
        queryIntervalMinutes: 5,
        lastQueryAt: null,
        lastQueryStatus: null,
      });
    }

    const settings = rows[0];
    res.json({
      server: settings.server || '',
      port: settings.port || 1433,
      database: settings.database_name || '',
      username: settings.username || '',
      password: settings.password_encrypted ? '••••••••••••' : '',
      trustCertificate: Boolean(settings.trust_certificate),
      encryptConnection: Boolean(settings.encrypt_connection),
      queryIntervalMinutes: settings.query_interval_minutes || 5,
      lastQueryAt: settings.last_query_at || null,
      lastQueryStatus: settings.last_query_status || null,
    });
  } catch (err) {
    console.error('Failed to get DMS settings:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /api/dms-settings ──────────────────────────────────
// Save DMS connection settings
router.post('/', requireAuth, requirePermission('manageSettings'), async (req, res) => {
  try {
    const {
      server,
      port,
      database,
      username,
      password,
      trustCertificate,
      encryptConnection,
      queryIntervalMinutes,
    } = req.body;

    // Validate required fields
    if (!server?.trim()) {
      return res.status(400).json({ error: 'Server address is required' });
    }

    // Get current settings to check if password changed
    const [current] = await db.execute('SELECT password_encrypted FROM dms_settings WHERE id = 1');
    let passwordEncrypted = current[0]?.password_encrypted || '';
    
    // Only update password if it's not the masked value
    if (password && password !== '••••••••••••') {
      passwordEncrypted = encrypt(password);
    }

    await db.execute(`
      INSERT INTO dms_settings (id, server, port, database_name, username, password_encrypted, trust_certificate, encrypt_connection, query_interval_minutes)
      VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        server = VALUES(server),
        port = VALUES(port),
        database_name = VALUES(database_name),
        username = VALUES(username),
        password_encrypted = VALUES(password_encrypted),
        trust_certificate = VALUES(trust_certificate),
        encrypt_connection = VALUES(encrypt_connection),
        query_interval_minutes = VALUES(query_interval_minutes),
        updated_at = CURRENT_TIMESTAMP
    `, [
      1,
      server.trim(),
      port || 1433,
      database?.trim() || '',
      username?.trim() || '',
      passwordEncrypted,
      trustCertificate ? 1 : 0,
      encryptConnection ? 1 : 0,
      queryIntervalMinutes || 5,
    ]);

    await logAudit('DMS Settings Updated', `Server: ${server}`, req.user, req.ip);
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to save DMS settings:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /api/dms-settings/test ──────────────────────────────
// Test the DMS connection
router.post('/test', requireAuth, requirePermission('manageSettings'), async (req, res) => {
  try {
    // Get settings from request body (for testing before saving)
    const {
      server,
      port,
      database,
      username,
      password,
      trustCertificate,
      encryptConnection,
    } = req.body;

    // If password is masked, get the stored password
    let actualPassword = password;
    if (password === '••••••••••••' || !password) {
      const [rows] = await db.execute('SELECT password_encrypted FROM dms_settings WHERE id = 1');
      if (rows.length > 0 && rows[0].password_encrypted) {
        actualPassword = decrypt(rows[0].password_encrypted);
      }
    }

    // Validate required fields
    if (!server?.trim()) {
      return res.status(400).json({ error: 'Server address is required' });
    }

    // Build connection config
    const config = {
      user: username?.trim() || '',
      password: actualPassword || '',
      server: server.trim(),
      port: parseInt(port) || 1433,
      database: database?.trim() || '',
      options: {
        encrypt: Boolean(encryptConnection),
        trustServerCertificate: Boolean(trustCertificate),
        enableArithAbort: true,
      },
      connectionTimeout: 30000,
      requestTimeout: 30000,
    };

    // Attempt connection
    const pool = new sql.ConnectionPool(config);
    await pool.connect();
    
    // Run a simple query to verify connection
    await pool.request().query('SELECT 1 AS test');
    
    await pool.close();

    // Update last query status
    await db.execute(
      'UPDATE dms_settings SET last_query_at = NOW(), last_query_status = ? WHERE id = 1',
      ['success']
    );

    res.json({ success: true, message: 'Connection successful' });
  } catch (err) {
    console.error('DMS connection test failed:', err);
    
    // Update last query status
    try {
      await db.execute(
        'UPDATE dms_settings SET last_query_at = NOW(), last_query_status = ? WHERE id = 1',
        [`failed: ${err.message}`]
      );
    } catch (dbErr) {
      // Ignore db errors
    }

    res.status(400).json({ 
      error: 'Connection failed', 
      message: err.message 
    });
  }
});

module.exports = router;