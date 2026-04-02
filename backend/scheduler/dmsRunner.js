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

      const query = `SELECT SlsId, ${dateColumn}, CusId, EmpId FROM dbo.${table} WHERE ${dateColumn} >= DATEADD(hour, -${lookbackHours}, GETDATE())`;
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

        const cusId = record.CusId ? String(record.CusId).substring(0, 100) : null;
        const empId = record.EmpId ? String(record.EmpId).substring(0, 100) : null;

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
          'INSERT INTO folders (id, name, location_id, department_id, cus_id, emp_id, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
          [folderId, slsId, locationId, deptId, cusId, empId]
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
    } else if (taskType === 'CUSTOMER_SYNC') {
      // Query all records from COCUS table in DMS
      const query = `SELECT 
        CusId, Name, Addr1, Addr2, City, County, State, Post, Country,
        BillCusId, BillAddr1, BillAddr2, BillCity, BillCounty, BillState, BillPost, BillCountry,
        PhoneHome, PhoneWork, PhoneOther, EmailHome, EmailWork, EmailOther,
        EmpId, DateCreate, DateUpdate
        FROM dbo.COCUS`;
      const dmsResult = await pool.request().query(query);
      const records = dmsResult.recordset;

      // Get all existing customer CusIds from MySQL
      const [existingCustomers] = await db.execute('SELECT id, cus_id FROM company_customer');
      const existingCusIds = new Map(existingCustomers.map(c => [c.cus_id, c.id]));
      const dmsCusIds = new Set(records.map(r => r.CusId));

      let createdCount = 0;
      let updatedCount = 0;
      let deletedCount = 0;
      let skippedCount = 0;

      // Process each record from DMS
      for (const record of records) {
        const cusId = String(record.CusId || '').trim();
        if (!cusId) {
          skippedCount++;
          continue;
        }

        const existingId = existingCusIds.get(cusId);

        const customerData = {
          cus_id: cusId,
          name: String(record.Name || '').substring(0, 255) || null,
          addr1: String(record.Addr1 || '').substring(0, 255) || null,
          addr2: String(record.Addr2 || '').substring(0, 255) || null,
          city: String(record.City || '').substring(0, 100) || null,
          county: String(record.County || '').substring(0, 100) || null,
          state: String(record.State || '').substring(0, 100) || null,
          post: String(record.Post || '').substring(0, 50) || null,
          country: String(record.Country || '').substring(0, 100) || null,
          bill_cus_id: String(record.BillCusId || '').substring(0, 100) || null,
          bill_addr1: String(record.BillAddr1 || '').substring(0, 255) || null,
          bill_addr2: String(record.BillAddr2 || '').substring(0, 255) || null,
          bill_city: String(record.BillCity || '').substring(0, 100) || null,
          bill_county: String(record.BillCounty || '').substring(0, 100) || null,
          bill_state: String(record.BillState || '').substring(0, 100) || null,
          bill_post: String(record.BillPost || '').substring(0, 50) || null,
          bill_country: String(record.BillCountry || '').substring(0, 100) || null,
          phone_home: String(record.PhoneHome || '').substring(0, 50) || null,
          phone_work: String(record.PhoneWork || '').substring(0, 50) || null,
          phone_other: String(record.PhoneOther || '').substring(0, 50) || null,
          email_home: String(record.EmailHome || '').substring(0, 255) || null,
          email_work: String(record.EmailWork || '').substring(0, 255) || null,
          email_other: String(record.EmailOther || '').substring(0, 255) || null,
          emp_id: String(record.EmpId || '').substring(0, 100) || null,
          date_create: record.DateCreate || null,
          date_update: record.DateUpdate || null,
          dms_deleted: false,
          dms_deleted_at: null,
        };

        if (existingId) {
          // Update existing customer and clear deleted flag
          await db.execute(`
            UPDATE company_customer SET
              name = ?, addr1 = ?, addr2 = ?, city = ?, county = ?, state = ?, post = ?, country = ?,
              bill_cus_id = ?, bill_addr1 = ?, bill_addr2 = ?, bill_city = ?, bill_county = ?, bill_state = ?, bill_post = ?, bill_country = ?,
              phone_home = ?, phone_work = ?, phone_other = ?, email_home = ?, email_work = ?, email_other = ?,
              emp_id = ?, date_create = ?, date_update = ?, dms_deleted = FALSE, dms_deleted_at = NULL, updated_at = NOW()
            WHERE id = ?
          `, [
            customerData.name, customerData.addr1, customerData.addr2, customerData.city, customerData.county, customerData.state, customerData.post, customerData.country,
            customerData.bill_cus_id, customerData.bill_addr1, customerData.bill_addr2, customerData.bill_city, customerData.bill_county, customerData.bill_state, customerData.bill_post, customerData.bill_country,
            customerData.phone_home, customerData.phone_work, customerData.phone_other, customerData.email_home, customerData.email_work, customerData.email_other,
            customerData.emp_id, customerData.date_create, customerData.date_update,
            existingId
          ]);
          updatedCount++;
        } else {
          // Insert new customer
          const newId = uuidv4();
          await db.execute(`
            INSERT INTO company_customer (
              id, cus_id, name, addr1, addr2, city, county, state, post, country,
              bill_cus_id, bill_addr1, bill_addr2, bill_city, bill_county, bill_state, bill_post, bill_country,
              phone_home, phone_work, phone_other, email_home, email_work, email_other,
              emp_id, date_create, date_update, dms_deleted, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE, NOW())
          `, [
            newId, customerData.cus_id, customerData.name, customerData.addr1, customerData.addr2, customerData.city, customerData.county, customerData.state, customerData.post, customerData.country,
            customerData.bill_cus_id, customerData.bill_addr1, customerData.bill_addr2, customerData.bill_city, customerData.bill_county, customerData.bill_state, customerData.bill_post, customerData.bill_country,
            customerData.phone_home, customerData.phone_work, customerData.phone_other, customerData.email_home, customerData.email_work, customerData.email_other,
            customerData.emp_id, customerData.date_create, customerData.date_update
          ]);
          createdCount++;
        }
      }

      // Mark records as deleted if they no longer exist in DMS
      for (const [cusId, existingId] of existingCusIds) {
        if (!dmsCusIds.has(cusId)) {
          await db.execute(
            'UPDATE company_customer SET dms_deleted = TRUE, dms_deleted_at = NOW(), updated_at = NOW() WHERE id = ? AND dms_deleted = FALSE',
            [existingId]
          );
          deletedCount++;
        }
      }

      result.success = true;
      result.count = createdCount + updatedCount;
      result.message = `Processed ${records.length} DMS records. Created: ${createdCount}, Updated: ${updatedCount}, Skipped: ${skippedCount}, Marked deleted: ${deletedCount}`;
    } else if (taskType === 'CUSTOMER_SYNC_24HR') {
      // Query records from COCUS table created in the last 24 hours
      const query = `SELECT 
        CusId, Name, Addr1, Addr2, City, County, State, Post, Country,
        BillCusId, BillAddr1, BillAddr2, BillCity, BillCounty, BillState, BillPost, BillCountry,
        PhoneHome, PhoneWork, PhoneOther, EmailHome, EmailWork, EmailOther,
        EmpId, DateCreate, DateUpdate
        FROM dbo.COCUS 
        WHERE DateCreate >= DATEADD(hour, -24, GETDATE())`;
      const dmsResult = await pool.request().query(query);
      const records = dmsResult.recordset;

      // Get all existing customer CusIds from MySQL for records in this batch
      const cusIds = records.map(r => String(r.CusId || '').trim()).filter(id => id);
      const placeholders = cusIds.map(() => '?').join(',');
      const [existingCustomers] = cusIds.length > 0 
        ? await db.execute(`SELECT id, cus_id FROM company_customer WHERE cus_id IN (${placeholders})`, cusIds)
        : [[]];
      const existingCusIds = new Map(existingCustomers.map(c => [c.cus_id, c.id]));

      let createdCount = 0;
      let updatedCount = 0;
      let skippedCount = 0;

      // Process each record from DMS
      for (const record of records) {
        const cusId = String(record.CusId || '').trim();
        if (!cusId) {
          skippedCount++;
          continue;
        }

        const existingId = existingCusIds.get(cusId);

        const customerData = {
          cus_id: cusId,
          name: String(record.Name || '').substring(0, 255) || null,
          addr1: String(record.Addr1 || '').substring(0, 255) || null,
          addr2: String(record.Addr2 || '').substring(0, 255) || null,
          city: String(record.City || '').substring(0, 100) || null,
          county: String(record.County || '').substring(0, 100) || null,
          state: String(record.State || '').substring(0, 100) || null,
          post: String(record.Post || '').substring(0, 50) || null,
          country: String(record.Country || '').substring(0, 100) || null,
          bill_cus_id: String(record.BillCusId || '').substring(0, 100) || null,
          bill_addr1: String(record.BillAddr1 || '').substring(0, 255) || null,
          bill_addr2: String(record.BillAddr2 || '').substring(0, 255) || null,
          bill_city: String(record.BillCity || '').substring(0, 100) || null,
          bill_county: String(record.BillCounty || '').substring(0, 100) || null,
          bill_state: String(record.BillState || '').substring(0, 100) || null,
          bill_post: String(record.BillPost || '').substring(0, 50) || null,
          bill_country: String(record.BillCountry || '').substring(0, 100) || null,
          phone_home: String(record.PhoneHome || '').substring(0, 50) || null,
          phone_work: String(record.PhoneWork || '').substring(0, 50) || null,
          phone_other: String(record.PhoneOther || '').substring(0, 50) || null,
          email_home: String(record.EmailHome || '').substring(0, 255) || null,
          email_work: String(record.EmailWork || '').substring(0, 255) || null,
          email_other: String(record.EmailOther || '').substring(0, 255) || null,
          emp_id: String(record.EmpId || '').substring(0, 100) || null,
          date_create: record.DateCreate || null,
          date_update: record.DateUpdate || null,
          dms_deleted: false,
          dms_deleted_at: null,
        };

        if (existingId) {
          // Update existing customer and clear deleted flag
          await db.execute(`
            UPDATE company_customer SET
              name = ?, addr1 = ?, addr2 = ?, city = ?, county = ?, state = ?, post = ?, country = ?,
              bill_cus_id = ?, bill_addr1 = ?, bill_addr2 = ?, bill_city = ?, bill_county = ?, bill_state = ?, bill_post = ?, bill_country = ?,
              phone_home = ?, phone_work = ?, phone_other = ?, email_home = ?, email_work = ?, email_other = ?,
              emp_id = ?, date_create = ?, date_update = ?, dms_deleted = FALSE, dms_deleted_at = NULL, updated_at = NOW()
            WHERE id = ?
          `, [
            customerData.name, customerData.addr1, customerData.addr2, customerData.city, customerData.county, customerData.state, customerData.post, customerData.country,
            customerData.bill_cus_id, customerData.bill_addr1, customerData.bill_addr2, customerData.bill_city, customerData.bill_county, customerData.bill_state, customerData.bill_post, customerData.bill_country,
            customerData.phone_home, customerData.phone_work, customerData.phone_other, customerData.email_home, customerData.email_work, customerData.email_other,
            customerData.emp_id, customerData.date_create, customerData.date_update,
            existingId
          ]);
          updatedCount++;
        } else {
          // Insert new customer
          const newId = uuidv4();
          await db.execute(`
            INSERT INTO company_customer (
              id, cus_id, name, addr1, addr2, city, county, state, post, country,
              bill_cus_id, bill_addr1, bill_addr2, bill_city, bill_county, bill_state, bill_post, bill_country,
              phone_home, phone_work, phone_other, email_home, email_work, email_other,
              emp_id, date_create, date_update, dms_deleted, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE, NOW())
          `, [
            newId, customerData.cus_id, customerData.name, customerData.addr1, customerData.addr2, customerData.city, customerData.county, customerData.state, customerData.post, customerData.country,
            customerData.bill_cus_id, customerData.bill_addr1, customerData.bill_addr2, customerData.bill_city, customerData.bill_county, customerData.bill_state, customerData.bill_post, customerData.bill_country,
            customerData.phone_home, customerData.phone_work, customerData.phone_other, customerData.email_home, customerData.email_work, customerData.email_other,
            customerData.emp_id, customerData.date_create, customerData.date_update
          ]);
          createdCount++;
        }
      }

      result.success = true;
      result.count = createdCount + updatedCount;
      result.message = `Processed ${records.length} DMS records (last 24 hours). Created: ${createdCount}, Updated: ${updatedCount}, Skipped: ${skippedCount}`;
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