// routes/azure.js
// Azure Storage settings management
const express = require('express');
const db = require('../config/db');
const { requireAuth, requirePermission } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');
const crypto = require('crypto');

const router = express.Router();

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
    console.error('Failed to decrypt Azure settings:', err.message);
    return '';
  }
}

// ── GET /api/azure/settings ───────────────────────────────────
router.get('/settings', requireAuth, requirePermission('manageSettings'), async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM azure_settings WHERE id = 1');
    if (rows.length === 0) {
      return res.json({ enabled: true, container_name: 'documents', hasConnectionString: false });
    }
    const settings = rows[0];
    res.json({
      enabled: !!settings.enabled,
      container_name: settings.container_name || 'documents',
      hasConnectionString: !!settings.connection_string_encrypted,
      // Never send the actual connection string to the client
    });
  } catch (err) {
    console.error('Failed to get Azure settings:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /api/azure/settings ──────────────────────────────────
router.post('/settings', requireAuth, requirePermission('manageSettings'), async (req, res) => {
  try {
    const { enabled, connectionString, containerName } = req.body;

    // Get current settings to check if connection string changed
    const [rows] = await db.execute('SELECT connection_string_encrypted FROM azure_settings WHERE id = 1');
    let connectionStringEncrypted = rows.length > 0 ? rows[0].connection_string_encrypted : '';

    // Only encrypt if a new connection string is provided
    if (connectionString && connectionString !== '••••••••••••••••' && connectionString !== '') {
      connectionStringEncrypted = encrypt(connectionString);
    }

    await db.execute(`
      INSERT INTO azure_settings (id, enabled, connection_string_encrypted, container_name)
      VALUES (1, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        enabled = VALUES(enabled),
        connection_string_encrypted = VALUES(connection_string_encrypted),
        container_name = VALUES(container_name)
    `, [
      enabled ? 1 : 0,
      connectionStringEncrypted,
      containerName || 'documents',
    ]);

    // Clear the cached blob service client so it will reinitialize with new settings
    const azureStorage = require('../config/azure-storage');
    azureStorage.clearCache?.();

    logAudit('Azure Settings Updated', 'Azure Storage settings were updated', req.user, req.ip);

    res.json({ success: true });
  } catch (err) {
    console.error('Failed to save Azure settings:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /api/azure/test ───────────────────────────────────────
// Test the Azure Storage connection
router.post('/test', requireAuth, requirePermission('manageSettings'), async (req, res) => {
  try {
    const { connectionString, containerName } = req.body;

    // If not provided, use stored settings
    let connStr = connectionString;
    let container = containerName;

    if (connStr && connStr !== '••••••••••••••••') {
      // Use provided connection string (testing new settings)
    } else {
      // Use stored connection string
      const [rows] = await db.execute('SELECT connection_string_encrypted, container_name FROM azure_settings WHERE id = 1');
      if (rows.length === 0 || !rows[0].connection_string_encrypted) {
        return res.status(400).json({ error: 'No Azure connection configured' });
      }
      connStr = decrypt(rows[0].connection_string_encrypted);
      container = rows[0].container_name || 'documents';
    }

    if (!connStr) {
      return res.status(400).json({ error: 'No connection string provided' });
    }

    // Test the connection
    const { BlobServiceClient } = require('@azure/storage-blob');
    const client = BlobServiceClient.fromConnectionString(connStr);
    const containerClient = client.getContainerClient(container);

    // Try to access the container
    const exists = await containerClient.exists();
    
    res.json({ success: true, containerExists: exists });
  } catch (err) {
    console.error('Azure connection test failed:', err);
    res.status(400).json({ error: err.message || 'Connection failed' });
  }
});

// ── GET /api/azure/status ─────────────────────────────────────
// Public endpoint - returns whether Azure is configured
router.get('/status', async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT enabled, connection_string_encrypted FROM azure_settings WHERE id = 1');
    if (rows.length === 0) {
      return res.json({ configured: false, enabled: false });
    }
    const settings = rows[0];
    res.json({
      configured: !!settings.connection_string_encrypted,
      enabled: !!settings.enabled,
    });
  } catch (err) {
    console.error('Failed to get Azure status:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;