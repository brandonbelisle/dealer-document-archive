// routes/dms.js
// DMS (Document Management System) connection settings for Microsoft SQL Server
const express = require('express');
const db = require('../config/db');
const { requireAuth, requirePermission } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');
const { runDmsTask } = require('../scheduler/dmsRunner');

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

    const serverVal = server.trim();
    const portVal = port || 1433;
    const databaseVal = database?.trim() || '';
    const usernameVal = username?.trim() || '';
    const trustCertVal = trustCertificate ? 1 : 0;
    const encryptConnVal = encryptConnection ? 1 : 0;
    const intervalVal = queryIntervalMinutes || 5;

    // Check if record exists
    const [existing] = await db.execute('SELECT id FROM dms_settings WHERE id = 1');
    
    if (existing.length === 0) {
      // Insert new record
      await db.execute(
        'INSERT INTO dms_settings (id, server, port, database_name, username, password_encrypted, trust_certificate, encrypt_connection, query_interval_minutes) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)',
        [serverVal, portVal, databaseVal, usernameVal, passwordEncrypted, trustCertVal, encryptConnVal, intervalVal]
      );
    } else {
      // Update existing record
      await db.execute(
        'UPDATE dms_settings SET server = ?, port = ?, database_name = ?, username = ?, password_encrypted = ?, trust_certificate = ?, encrypt_connection = ?, query_interval_minutes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1',
        [serverVal, portVal, databaseVal, usernameVal, passwordEncrypted, trustCertVal, encryptConnVal, intervalVal]
      );
    }

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

// ── GET /api/dms-settings/schedules ──────────────────────────
// Get all DMS schedules
router.get('/schedules', requireAuth, requirePermission('manageSettings'), async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT id, name, description, task_type, query_config, enabled, interval_minutes, schedule_day, schedule_time, last_run_at, last_run_status, last_run_message, last_run_count, created_at, updated_at FROM dms_schedules ORDER BY name'
    );
    console.log(`[Scheduler] API: Loaded ${rows.length} scheduled task(s)`);
    rows.forEach(row => {
      if (row.schedule_day && row.schedule_time) {
        console.log(`[Scheduler] API:   - "${row.name}" (ID: ${row.id}, enabled: ${row.enabled ? 'yes' : 'no'}, scheduled: ${row.schedule_day} ${row.schedule_time}, lastRun: ${row.last_run_at || 'never'})`);
      } else {
        console.log(`[Scheduler] API:   - "${row.name}" (ID: ${row.id}, enabled: ${row.enabled ? 'yes' : 'no'}, interval: ${row.interval_minutes || 0}min, lastRun: ${row.last_run_at || 'never'})`);
      }
    });
    res.json(rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      taskType: row.task_type,
      queryConfig: typeof row.query_config === 'string' ? JSON.parse(row.query_config) : row.query_config,
      enabled: Boolean(row.enabled),
      intervalMinutes: row.interval_minutes || 0,
      scheduleDay: row.schedule_day,
      scheduleTime: row.schedule_time,
      lastRunAt: row.last_run_at,
      lastRunStatus: row.last_run_status,
      lastRunMessage: row.last_run_message,
      lastRunCount: row.last_run_count || 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })));
  } catch (err) {
    console.error('Failed to get DMS schedules:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── PUT /api/dms-settings/schedules/:id ──────────────────────
// Update a DMS schedule
router.put('/schedules/:id', requireAuth, requirePermission('manageSettings'), async (req, res) => {
  try {
    const { id } = req.params;
    const { enabled, intervalMinutes, scheduleDay, scheduleTime } = req.body;

    const updates = [];
    const params = [];

    if (enabled !== undefined) {
      updates.push('enabled = ?');
      params.push(enabled ? 1 : 0);
    }
    if (intervalMinutes !== undefined) {
      updates.push('interval_minutes = ?');
      params.push(intervalMinutes);
    }
    if (scheduleDay !== undefined) {
      updates.push('schedule_day = ?');
      params.push(scheduleDay);
    }
    if (scheduleTime !== undefined) {
      updates.push('schedule_time = ?');
      params.push(scheduleTime);
    }

    if (updates.length === 0) {
      return res.json({ success: true });
    }

    params.push(id);
    await db.execute(
      `UPDATE dms_schedules SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      params
    );

    console.log(`[Scheduler] API: Updated schedule ID ${id}: ${updates.join(', ')}`);

    await logAudit('DMS Schedule Updated', `Schedule ID: ${id}`, req.user, req.ip);
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to update DMS schedule:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /api/dms-settings/schedules/:id/run ─────────────────
// Manually run a DMS schedule
router.post('/schedules/:id/run', requireAuth, requirePermission('manageSettings'), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get schedule info
    const [schedules] = await db.execute('SELECT * FROM dms_schedules WHERE id = ?', [id]);
    if (schedules.length === 0) {
      return res.status(404).json({ error: 'Schedule not found' });
    }
    
    const schedule = schedules[0];
    console.log(`[Scheduler] API: Manual run requested for "${schedule.name}" (ID: ${schedule.id}, type: ${schedule.task_type})`);
    
    // Run the task
    const result = await runDmsTask(schedule.task_type, schedule.query_config);
    
    console.log(`[Scheduler] API: Manual run of "${schedule.name}" completed: ${result.success ? 'success' : 'failed'} - ${result.message} (${result.count || 0} records)`);
    
    // Update last run info
    await db.execute(
      'UPDATE dms_schedules SET last_run_at = NOW(), last_run_status = ?, last_run_message = ?, last_run_count = ? WHERE id = ?',
      [result.success ? 'success' : 'failed', result.message, result.count, id]
    );

    await logAudit('DMS Schedule Run', `${schedule.name} - ${result.message}`, req.user, req.ip);
    
    res.json(result);
  } catch (err) {
    console.error('Failed to run DMS schedule:', err);
    res.status(500).json({ error: 'Internal server error', message: err.message });
  }
});

module.exports = router;