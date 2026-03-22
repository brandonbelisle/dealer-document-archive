// scheduler/dmsRunner.js
// DMS task execution logic (separated from express routes for scheduler use)
const sql = require('mssql');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');

// Encryption helper for DMS password
const crypto = require('crypto');
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-encryption-key-32-chars!!';
const ALGORITHM = 'aes-256-cbc';

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

async function runDmsTask(taskType, queryConfig) {
  const result = { success: false, message: '', count: 0 };
  let pool = null;
  
  try {
    const config = await getDmsConfig();
    if (!config || !config.server) {
      result.message = 'DMS connection not configured';
      return result;
    }

    pool = new sql.ConnectionPool(config);
    await pool.connect();

    if (taskType === 'DMS_TO_DDA') {
      const cfg = typeof queryConfig === 'string' ? JSON.parse(queryConfig) : queryConfig;
      const table = cfg.table || 'SVSLS';
      const dateColumn = cfg.dateColumn || 'DateOpen';
      const lookbackHours = cfg.lookbackHours || 48;

      const query = `SELECT SlsId, ${dateColumn} FROM dbo.${table} WHERE ${dateColumn} >= DATEADD(hour, -${lookbackHours}, GETDATE())`;
      const dmsResult = await pool.request().query(query);
      const records = dmsResult.recordset;

      const [locations] = await db.execute('SELECT id, name, location_code FROM locations WHERE location_code IS NOT NULL');
      const locationMap = {};
      for (const loc of locations) {
        locationMap[loc.location_code] = loc.id;
      }

      const [departments] = await db.execute('SELECT id, name, location_id FROM departments WHERE name = ?', ['Service']);
      const serviceDeptMap = {};
      for (const dept of departments) {
        serviceDeptMap[dept.location_id] = dept.id;
      }

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

        let deptId = serviceDeptMap[locationId];
        if (!deptId) {
          await db.execute(
            'INSERT INTO departments (id, name, location_id, created_by) VALUES (UUID(), ?, ?, ?)',
            ['Service', locationId, null]
          );
          const [newDept] = await db.execute('SELECT id FROM departments WHERE name = ? AND location_id = ?', ['Service', locationId]);
          if (newDept.length > 0) {
            deptId = newDept[0].id;
            serviceDeptMap[locationId] = deptId;
          }
        }

        if (!deptId) {
          errors.push(`No Service department for location ${locationCode}`);
          continue;
        }

        const folderKey = `${deptId}:${slsId}`;
        if (existingFolderNames.has(folderKey)) {
          skippedCount++;
          continue;
        }

        const [existing] = await db.execute(
          'SELECT id FROM folders WHERE department_id = ? AND name = ?',
          [deptId, slsId]
        );

        if (existing.length > 0) {
          existingFolderNames.add(folderKey);
          skippedCount++;
          continue;
        }

        const folderId = uuidv4();
        await db.execute(
          'INSERT INTO folders (id, name, location_id, department_id, created_at) VALUES (?, ?, ?, ?, NOW())',
          [folderId, slsId, locationId, deptId]
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
  } catch (err) {
    console.error('DMS task execution failed:', err);
    result.message = err.message;
  } finally {
    if (pool) {
      try {
        await pool.close();
      } catch (e) {
        console.error('Failed to close MSSQL pool:', e.message);
      }
    }
  }

  return result;
}

module.exports = { runDmsTask, getDmsConfig };