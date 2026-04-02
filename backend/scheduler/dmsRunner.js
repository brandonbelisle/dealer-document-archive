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

      const query = `SELECT SlsId, ${dateColumn}, CusId, EmpId, Vin, OdomIn, OdomOut, Tag, EmpIdWriter, DateCreate FROM dbo.${table} WHERE ${dateColumn} >= DATEADD(hour, -${lookbackHours}, GETDATE())`;
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

      // Get existing repair orders to avoid duplicates
      const [existingRepairOrders] = await db.execute('SELECT sls_id FROM service_repairorders');
      const existingSlsIds = new Set(existingRepairOrders.map(r => r.sls_id));

      let createdCount = 0;
      let skippedCount = 0;
      let repairOrderCount = 0;
      const errors = [];

      for (const record of records) {
        const slsId = String(record.SlsId || '').substring(0, 10);
        if (!slsId) {
          skippedCount++;
          continue;
        }

        const cusId = record.CusId ? String(record.CusId).substring(0, 100) : null;
        const empId = record.EmpId ? String(record.EmpId).substring(0, 100) : null;
        const vin = record.Vin ? String(record.Vin).substring(0, 100) : null;
        const odomIn = record.OdomIn ? parseInt(record.OdomIn) : null;
        const odomOut = record.OdomOut ? parseInt(record.OdomOut) : null;
        const tag = record.Tag ? String(record.Tag).substring(0, 50) : null;
        const empIdWriter = record.EmpIdWriter ? String(record.EmpIdWriter).substring(0, 100) : null;
        const dateCreate = record.DateCreate || record[dateColumn] || null;

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

        // Check if folder already exists
        const [existing] = await db.execute(
          'SELECT id, cus_id, emp_id FROM folders WHERE department_id = ? AND name = ?',
          [deptId, slsId]
        );

        let folderId = null;

        if (existing.length > 0) {
          const existingFolder = existing[0];
          existingFolderNames.add(folderKey);
          folderId = existingFolder.id;
          
          // If cus_id or emp_id is null/empty in MySQL, update from DMS
          if ((!existingFolder.cus_id || !existingFolder.emp_id) && (cusId || empId)) {
            await db.execute(
              'UPDATE folders SET cus_id = COALESCE(?, cus_id), emp_id = COALESCE(?, emp_id), updated_at = NOW() WHERE id = ?',
              [cusId, empId, existingFolder.id]
            );
          }
          skippedCount++;
        } else {
          folderId = uuidv4();
          await db.execute(
            'INSERT INTO folders (id, name, location_id, department_id, cus_id, emp_id, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
            [folderId, slsId, locationId, deptId, cusId, empId]
          );
          
          existingFolderNames.add(folderKey);
          createdCount++;
        }

        // Create or update repair order record
        if (!existingSlsIds.has(slsId)) {
          const repairOrderId = uuidv4();
          try {
            await db.execute(
              `INSERT INTO service_repairorders (id, sls_id, vin, odom_in, odom_out, tag, cus_id, emp_id, emp_id_writer, date_create, folder_id, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
              [repairOrderId, slsId, vin, odomIn, odomOut, tag, cusId, empId, empIdWriter, dateCreate, folderId]
            );
            repairOrderCount++;
          } catch (insertErr) {
            console.error(`[DMS_TO_DDA] Failed to insert repair order ${slsId}:`, insertErr.message);
          }
        }
      }

      result.success = true;
      result.count = createdCount;
      result.message = `Successfully processed ${records.length} records. Created ${createdCount} folders, ${repairOrderCount} repair orders, skipped ${skippedCount} existing/invalid.`;
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
    } else if (taskType === 'FOLDER_BACKFILL') {
      // Get all folders that don't have cus_id or emp_id set
      const [folders] = await db.execute(
        'SELECT id, name FROM folders WHERE cus_id IS NULL OR emp_id IS NULL'
      );
      
      if (folders.length === 0) {
        result.success = true;
        result.message = 'No folders need backfilling - all folders already have CusId and EmpId.';
        return result;
      }
      
      console.log(`[FOLDER_BACKFILL] Found ${folders.length} folders to backfill`);
      
      // Query DMS for all SlsId, CusId, EmpId from SVSLS
      const table = 'SVSLS';
      const query = `SELECT SlsId, CusId, EmpId FROM dbo.${table}`;
      const dmsResult = await pool.request().query(query);
      
      // Build a map of SlsId -> { CusId, EmpId }
      const dmsData = new Map();
      for (const record of dmsResult.recordset) {
        const slsId = String(record.SlsId || '').trim();
        if (slsId) {
          dmsData.set(slsId, {
            cusId: record.CusId ? String(record.CusId).substring(0, 100) : null,
            empId: record.EmpId ? String(record.EmpId).substring(0, 100) : null,
          });
        }
      }
      
      console.log(`[FOLDER_BACKFILL] Loaded ${dmsData.size} records from DMS`);
      
      let updatedCount = 0;
      let fuzzyMatchCount = 0;
      let notFoundCount = 0;
      const notFoundIds = [];
      
      // Update each folder with CusId and EmpId
      for (const folder of folders) {
        const slsId = String(folder.name || '').trim();
        let dmsInfo = dmsData.get(slsId);
        
        // If exact match not found, try fuzzy search with first 10 characters
        if (!dmsInfo && slsId.length >= 10) {
          const fuzzyPrefix = slsId.substring(0, 10);
          const fuzzyQuery = `SELECT TOP 1 SlsId, CusId, EmpId FROM dbo.${table} WHERE SlsId LIKE '${fuzzyPrefix}%'`;
          try {
            const fuzzyResult = await pool.request().query(fuzzyQuery);
            if (fuzzyResult.recordset.length > 0) {
              const fuzzyRecord = fuzzyResult.recordset[0];
              dmsInfo = {
                cusId: fuzzyRecord.CusId ? String(fuzzyRecord.CusId).substring(0, 100) : null,
                empId: fuzzyRecord.EmpId ? String(fuzzyRecord.EmpId).substring(0, 100) : null,
              };
              console.log(`[FOLDER_BACKFILL] Fuzzy match: "${slsId}" -> "${fuzzyRecord.SlsId}"`);
            }
          } catch (fuzzyErr) {
            console.error(`[FOLDER_BACKFILL] Fuzzy search error for "${slsId}":`, fuzzyErr.message);
          }
        }
        
        if (dmsInfo) {
          await db.execute(
            'UPDATE folders SET cus_id = ?, emp_id = ?, updated_at = NOW() WHERE id = ?',
            [dmsInfo.cusId, dmsInfo.empId, folder.id]
          );
          updatedCount++;
          if (dmsInfo !== dmsData.get(slsId)) {
            fuzzyMatchCount++;
          }
        } else {
          notFoundCount++;
          if (notFoundIds.length < 10) {
            notFoundIds.push(slsId);
          }
        }
      }
      
      result.success = true;
      result.count = updatedCount;
      result.message = `Backfilled ${updatedCount} folders with CusId and EmpId from DMS.`;
      if (fuzzyMatchCount > 0) {
        result.message += ` (${fuzzyMatchCount} via fuzzy match)`;
      }
      if (notFoundCount > 0) {
        result.message += ` ${notFoundCount} folders had no matching DMS record.`;
        if (notFoundIds.length > 0) {
          result.message += ` Examples: ${notFoundIds.join(', ')}`;
        }
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