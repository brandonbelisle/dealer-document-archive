// routes/dms.js
// DMS (Document Management System) connection settings for Microsoft SQL Server
const express = require('express');
const sql = require('mssql');
const { v4: uuidv4 } = require('uuid');
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

// Helper to get DMS connection config
async function getDmsConfig() {
  const [rows] = await db.execute('SELECT * FROM dms_settings WHERE id = 1');
  if (rows.length === 0) return null;
  
  const settings = rows[0];
  return {
    user: settings.username || '',
    password: decrypt(settings.password_encrypted) || '',
    server: settings.server || '',
    port: settings.port || 1433,
    database: settings.database_name || '',
    options: {
      encrypt: Boolean(settings.encrypt_connection),
      trustServerCertificate: Boolean(settings.trust_certificate),
      enableArithAbort: true,
    },
    connectionTimeout: 30000,
    requestTimeout: 60000,
  };
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
      'SELECT id, name, description, task_type, query_config, enabled, interval_minutes, last_run_at, last_run_status, last_run_message, last_run_count, created_at, updated_at FROM dms_schedules ORDER BY name'
    );
    res.json(rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      taskType: row.task_type,
      queryConfig: typeof row.query_config === 'string' ? JSON.parse(row.query_config) : row.query_config,
      enabled: Boolean(row.enabled),
      intervalMinutes: row.interval_minutes || 0,
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
    const { enabled, intervalMinutes } = req.body;

    await db.execute(
      'UPDATE dms_schedules SET enabled = ?, interval_minutes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [enabled ? 1 : 0, intervalMinutes || 0, id]
    );

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
    
    // Run the task
    const result = await runDmsTask(schedule.task_type, schedule.query_config);
    
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

// ── DMS Task Execution ────────────────────────────────────────
async function runDmsTask(taskType, queryConfig) {
  const result = { success: false, message: '', count: 0 };
  
  try {
    // Get DMS connection config
    const config = await getDmsConfig();
    if (!config || !config.server) {
      result.message = 'DMS connection not configured';
      return result;
    }

    const pool = new sql.ConnectionPool(config);
    await pool.connect();

    if (taskType === 'DMS_TO_DDA') {
      const config = typeof queryConfig === 'string' ? JSON.parse(queryConfig) : queryConfig;
      const table = config.table || 'SVSLS';
      const dateColumn = config.dateColumn || 'DateOpen';
      const lookbackHours = config.lookbackHours || 48;

      const query = `SELECT SlsId, ${dateColumn} FROM dbo.${table} WHERE ${dateColumn} >= DATEADD(hour, -${lookbackHours}, GETDATE())`;
      const dmsResult = await pool.request().query(query);
      const records = dmsResult.recordset;

      // Get locations with their codes
      const [locations] = await db.execute('SELECT id, name, location_code FROM locations WHERE location_code IS NOT NULL');
      const locationMap = {};
      for (const loc of locations) {
        locationMap[loc.location_code] = loc.id;
      }

      // Get "Service" department for each location
      const [departments] = await db.execute('SELECT id, name, location_id FROM departments WHERE name = ?', ['Service']);
      const serviceDeptMap = {};
      for (const dept of departments) {
        serviceDeptMap[dept.location_id] = dept.id;
      }

      // Get existing folders under Service departments
      const [existingFolders] = await db.execute(`
        SELECT f.name, f.department_id FROM folders f
        JOIN departments d ON f.department_id = d.id
        WHERE d.name = ?
      `, ['Service']);
      const existingFolderNames = new Set(existingFolders.map(f => `${f.department_id}:${f.name}`));

      let createdCount = 0;
      let skippedCount = 0;
      const errors = [];

      for (const record of records) {
        const slsId = String(record.SlsId || '').substring(0, 10);
        if (!slsId) {
          skippedCount++;
          continue;
        }

        const locationCode = slsId.substring(0, 4);
        const locationId = locationMap[locationCode];
        
        if (!locationId) {
          skippedCount++;
          continue;
        }

        const serviceDeptId = serviceDeptMap[locationId];
        if (!serviceDeptId) {
          // Create Service department if it doesn't exist
          const [deptResult] = await db.execute(
            'INSERT INTO departments (id, name, location_id, created_by) VALUES (UUID(), ?, ?, ?)',
            ['Service', locationId, null]
          );
          const [newDept] = await db.execute('SELECT id FROM departments WHERE name = ? AND location_id = ?', ['Service', locationId]);
          if (newDept.length > 0) {
            serviceDeptMap[locationId] = newDept[0].id;
          }
        }

        const deptId = serviceDeptMap[locationId];
        if (!deptId) {
          errors.push(`No Service department for location ${locationCode}`);
          continue;
        }

        // Check if folder already exists
        const folderKey = `${deptId}:${slsId}`;
        if (existingFolderNames.has(folderKey)) {
          skippedCount++;
          continue;
        }

        // Check database for existing folder
        const [existing] = await db.execute(
          'SELECT id FROM folders WHERE department_id = ? AND name = ?',
          [deptId, slsId]
        );

        if (existing.length > 0) {
          existingFolderNames.add(folderKey);
          skippedCount++;
          continue;
        }

        // Create the folder
        const folderId = uuidv4();
        await db.execute(
          'INSERT INTO folders (id, name, department_id, created_at) VALUES (?, ?, ?, NOW())',
          [folderId, slsId, deptId]
        );
        
        existingFolderNames.add(folderKey);
        createdCount++;
      }

      result.success = true;
      result.count = createdCount;
      result.message = `Successfully processed ${records.length} records. Created ${createdCount} folders, skipped ${skippedCount} existing/invalid.`;
      if (errors.length > 0) {
        result.message += ` Errors: ${errors.slice(0, 3).join('; ')}`;
      }
    } else {
      result.message = `Unknown task type: ${taskType}`;
    }

    await pool.close();
  } catch (err) {
    console.error('DMS task execution failed:', err);
    result.message = err.message;
  }

  return result;
}

module.exports = router;