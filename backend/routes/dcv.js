// DCV routes - Dealer Customer Vision
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { requireAuth, requirePermission } = require('../middleware/auth');

// Get customer by cus_id (DMS ID)
router.get('/by-cus-id/:cusId', requireAuth, requirePermission('view_dcv'), async (req, res) => {
  try {
    const { cusId } = req.params;
    
    const [rows] = await db.execute(
      `SELECT id, cus_id, name, addr1, addr2, city, county, state, post, country,
              bill_cus_id, bill_addr1, bill_addr2, bill_city, bill_county, bill_state, bill_post, bill_country,
              phone_home, phone_work, phone_other, email_home, email_work, email_other,
              emp_id, date_create, date_update
       FROM company_customer 
       WHERE cus_id = ? AND dms_deleted = FALSE
       LIMIT 1`,
      [cusId]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    const row = rows[0];
    res.json({
      id: row.id,
      cusId: row.cus_id,
      name: row.name,
      addr1: row.addr1,
      addr2: row.addr2,
      city: row.city,
      county: row.county,
      state: row.state,
      post: row.post,
      country: row.country,
      billCusId: row.bill_cus_id,
      billAddr1: row.bill_addr1,
      billAddr2: row.bill_addr2,
      billCity: row.bill_city,
      billCounty: row.bill_county,
      billState: row.bill_state,
      billPost: row.bill_post,
      billCountry: row.bill_country,
      phoneHome: row.phone_home,
      phoneWork: row.phone_work,
      phoneOther: row.phone_other,
      emailHome: row.email_home,
      emailWork: row.email_work,
      emailOther: row.email_other,
      empId: row.emp_id,
      dateCreate: row.date_create,
      dateUpdate: row.date_update,
    });
  } catch (err) {
    console.error('[DCV] Get customer by cus_id error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Search customers by Cus_Id or Name (fuzzy search)
router.get('/search', requireAuth, requirePermission('view_dcv'), async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.trim().length < 1) {
      return res.json([]);
    }
    
    const searchTerm = `%${q.trim()}%`;
    
    const [rows] = await db.execute(
      `SELECT id, cus_id, name, addr1, addr2, city, county, state, post, country,
              bill_cus_id, bill_addr1, bill_addr2, bill_city, bill_county, bill_state, bill_post, bill_country,
              phone_home, phone_work, phone_other, email_home, email_work, email_other,
              emp_id, date_create, date_update
       FROM company_customer 
       WHERE dms_deleted = FALSE AND (cus_id LIKE ? OR name LIKE ?)
       ORDER BY 
         CASE WHEN cus_id = ? THEN 0 ELSE 1 END,
         CASE WHEN name = ? THEN 0 ELSE 1 END,
         CASE WHEN cus_id LIKE ? THEN 0 ELSE 1 END,
         CASE WHEN name LIKE ? THEN 0 ELSE 1 END,
         name ASC
       LIMIT 20`,
      [searchTerm, searchTerm, q.trim(), q.trim(), `${q.trim()}%`, `${q.trim()}%`]
    );
    
    console.log(`[DCV] Search for "${q}" returned ${rows.length} results`);
    
    res.json(rows.map(row => ({
      id: row.id,
      cusId: row.cus_id,
      name: row.name,
      addr1: row.addr1,
      addr2: row.addr2,
      city: row.city,
      county: row.county,
      state: row.state,
      post: row.post,
      country: row.country,
      billCusId: row.bill_cus_id,
      billAddr1: row.bill_addr1,
      billAddr2: row.bill_addr2,
      billCity: row.bill_city,
      billCounty: row.bill_county,
      billState: row.bill_state,
      billPost: row.bill_post,
      billCountry: row.bill_country,
      phoneHome: row.phone_home,
      phoneWork: row.phone_work,
      phoneOther: row.phone_other,
      emailHome: row.email_home,
      emailWork: row.email_work,
      emailOther: row.email_other,
      empId: row.emp_id,
      dateCreate: row.date_create,
      dateUpdate: row.date_update,
    })));
  } catch (err) {
    console.error('[DCV] Search error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get customer timeline (folders, files, etc.)
router.get('/:id/timeline', requireAuth, requirePermission('view_dcv'), async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, pageSize = 20, filterType } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    
    // Build date filter condition
    let dateCondition = '';
    const now = new Date();
    if (filterType === 'day') {
      dateCondition = ` AND timestamp >= DATE_SUB(NOW(), INTERVAL 1 DAY)`;
    } else if (filterType === 'month') {
      dateCondition = ` AND timestamp >= DATE_SUB(NOW(), INTERVAL 1 MONTH)`;
    } else if (filterType === 'year') {
      dateCondition = ` AND timestamp >= DATE_SUB(NOW(), INTERVAL 1 YEAR)`;
    }
    
    // Get the cus_id first to avoid collation issues
    const [customerRows] = await db.execute(
      'SELECT cus_id FROM company_customer WHERE id = ?',
      [id]
    );
    
    if (customerRows.length === 0) {
      return res.json({ events: [], total: 0, page: parseInt(page), pageSize: parseInt(pageSize) });
    }
    
    const cusId = customerRows[0].cus_id;
    
    if (!cusId) {
      return res.json({ events: [], total: 0, page: parseInt(page), pageSize: parseInt(pageSize) });
    }
    
    const events = [];
    
    // Get folders with cus_id matching the customer
    const [folders] = await db.execute(
      `SELECT f.id, f.name, f.created_at as timestamp, l.name as location_name, d.name as department_name, 'folder' as event_type
       FROM folders f
       LEFT JOIN locations l ON f.location_id = l.id
       LEFT JOIN departments d ON f.department_id = d.id
       WHERE f.cus_id = ?
       ORDER BY f.created_at DESC`,
      [cusId]
    );
    
    for (const folder of folders) {
      events.push({
        id: folder.id,
        type: 'folder_created',
        title: 'Folder Created',
        description: `${folder.name} - ${folder.department_name || 'Department'} at ${folder.location_name || 'Location'}`,
        timestamp: folder.timestamp,
        metadata: {
          folderId: folder.id,
          folderName: folder.name,
          location: folder.location_name,
          department: folder.department_name,
        },
      });
    }
    
    // Get files in folders with cus_id matching the customer
    const [files] = await db.execute(
      `SELECT fi.id, fi.name, fi.uploaded_at as timestamp, fi.folder_id, f.name as folder_name, l.name as location_name, 'file' as event_type
       FROM files fi
       JOIN folders f ON fi.folder_id = f.id
       LEFT JOIN locations l ON f.location_id = l.id
       WHERE f.cus_id = ? AND fi.status != 'deleted'
       ORDER BY fi.uploaded_at DESC`,
      [cusId]
    );
    
    for (const file of files) {
      events.push({
        id: file.id,
        type: 'file_uploaded',
        title: 'File Uploaded',
        description: `${file.name} in ${file.folder_name || 'Folder'}`,
        timestamp: file.timestamp,
        metadata: {
          fileId: file.id,
          fileName: file.name,
          folderId: file.folder_id,
          folderName: file.folder_name,
          location: file.location_name,
        },
      });
    }
    
    // Sort all events by timestamp (newest first)
    events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Apply date filter
    let filteredEvents = events;
    if (dateCondition) {
      const nowTime = now.getTime();
      let cutoffTime;
      if (filterType === 'day') {
        cutoffTime = nowTime - (24 * 60 * 60 * 1000);
      } else if (filterType === 'month') {
        cutoffTime = nowTime - (30 * 24 * 60 * 60 * 1000);
      } else if (filterType === 'year') {
        cutoffTime = nowTime - (365 * 24 * 60 * 60 * 1000);
      }
      if (cutoffTime) {
        filteredEvents = events.filter(e => new Date(e.timestamp).getTime() >= cutoffTime);
      }
    }
    
    const total = filteredEvents.length;
    const paginatedEvents = filteredEvents.slice(offset, offset + parseInt(pageSize));
    
    console.log(`[DCV] Timeline for customer ${id}: ${total} events (page ${page})`);
    
    res.json({
      events: paginatedEvents,
      total,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      totalPages: Math.ceil(total / parseInt(pageSize)),
    });
  } catch (err) {
    console.error('[DCV] Timeline error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get customer by ID
router.get('/:id', requireAuth, requirePermission('view_dcv'), async (req, res) => {
  try {
    const { id } = req.params;
    
    const [rows] = await db.execute(
      `SELECT id, cus_id, name, addr1, addr2, city, county, state, post, country,
              bill_cus_id, bill_addr1, bill_addr2, bill_city, bill_county, bill_state, bill_post, bill_country,
              phone_home, phone_work, phone_other, email_home, email_work, email_other,
              emp_id, date_create, date_update
       FROM company_customer 
       WHERE id = ? AND dms_deleted = FALSE`,
      [id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    const row = rows[0];
    res.json({
      id: row.id,
      cusId: row.cus_id,
      name: row.name,
      addr1: row.addr1,
      addr2: row.addr2,
      city: row.city,
      county: row.county,
      state: row.state,
      post: row.post,
      country: row.country,
      billCusId: row.bill_cus_id,
      billAddr1: row.bill_addr1,
      billAddr2: row.bill_addr2,
      billCity: row.bill_city,
      billCounty: row.bill_county,
      billState: row.bill_state,
      billPost: row.bill_post,
      billCountry: row.bill_country,
      phoneHome: row.phone_home,
      phoneWork: row.phone_work,
      phoneOther: row.phone_other,
      emailHome: row.email_home,
      emailWork: row.email_work,
      emailOther: row.email_other,
      empId: row.emp_id,
      dateCreate: row.date_create,
      dateUpdate: row.date_update,
    });
  } catch (err) {
    console.error('[DCV] Get customer error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get VIN details from NHTSA vPIC API
router.get('/vin/:vin', requireAuth, requirePermission('view_dcv'), async (req, res) => {
  try {
    const { vin } = req.params;
    
    if (!vin || vin.length < 11) {
      return res.status(400).json({ error: 'Invalid VIN' });
    }
    
    const response = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues/${vin}?format=json`);
    const data = await response.json();
    
    if (data.Results && data.Results.length > 0) {
      const result = data.Results[0];
      res.json({
        make: result.Make || null,
        model: result.Model || null,
        modelYear: result.ModelYear || null,
        bodyClass: result.BodyClass || null,
        vehicleType: result.VehicleType || null,
        engineModel: result.EngineModel || null,
        engineCylinders: result.EngineCylinders || null,
        displacementL: result.DisplacementL || null,
        fuelTypePrimary: result.FuelTypePrimary || null,
        manufacturer: result.Manufacturer || null,
        plantCountry: result.PlantCountry || null,
        plantState: result.PlantState || null,
        trim: result.Trim || null,
        doors: result.Doors || null,
        error: result.ErrorCode || null,
      });
    } else {
      res.json({
        make: null,
        model: null,
        modelYear: null,
        error: 'VIN not found',
      });
    }
  } catch (err) {
    console.error('[DCV] VIN lookup error:', err.message);
    res.status(500).json({ error: 'Failed to lookup VIN' });
  }
});

// Get repair orders for a customer
router.get('/:id/repair-orders', requireAuth, requirePermission('view_dcv'), async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, pageSize = 20, filterType, search } = req.query;
    const limitVal = Math.max(1, Math.min(100, parseInt(pageSize) || 20));
    const pageVal = Math.max(1, parseInt(page) || 1);
    const offsetVal = (pageVal - 1) * limitVal;
    const searchParam = search ? search.trim() : null;
    
    // Get the cus_id first
    const [customerRows] = await db.execute(
      'SELECT cus_id FROM company_customer WHERE id = ?',
      [id]
    );
    
    if (customerRows.length === 0) {
      return res.json({ repairOrders: [], total: 0, page: pageVal, pageSize: limitVal, totalPages: 0 });
    }
    
    const cusId = customerRows[0].cus_id;
    
    if (!cusId) {
      return res.json({ repairOrders: [], total: 0, page: pageVal, pageSize: limitVal, totalPages: 0 });
    }
    
    // Build date filter
    let dateCondition = '';
    if (filterType === 'day') {
      dateCondition = ' AND sro.date_create >= DATE_SUB(NOW(), INTERVAL 1 DAY)';
    } else if (filterType === 'month') {
      dateCondition = ' AND sro.date_create >= DATE_SUB(NOW(), INTERVAL 1 MONTH)';
    } else if (filterType === 'year') {
      dateCondition = ' AND sro.date_create >= DATE_SUB(NOW(), INTERVAL 1 YEAR)';
    }
    
    // Build search condition (fuzzy search on sls_id, vin, tag)
    let searchCondition = '';
    const searchParams = [cusId];
    if (searchParam) {
      searchCondition = ' AND (sro.sls_id LIKE ? OR sro.vin LIKE ? OR sro.tag LIKE ?)';
      const searchPattern = `%${searchParam}%`;
      searchParams.push(searchPattern, searchPattern, searchPattern);
    }
    
    // Get all matching repair orders (we need to filter in code for the suffix pattern)
    const allOrdersQuery = `SELECT sro.id, sro.sls_id, sro.vin, sro.odom_in, sro.odom_out, sro.tag, sro.cus_id, sro.emp_id, sro.emp_id_writer, sro.date_create, sro.folder_id,
              f.name as folder_name, l.name as location_name
       FROM service_repairorders sro
       LEFT JOIN folders f ON sro.folder_id = f.id
       LEFT JOIN locations l ON f.location_id = l.id
       WHERE sro.cus_id = ?${dateCondition}${searchCondition}
       ORDER BY sro.date_create DESC`;
    const [allRepairOrders] = await db.execute(allOrdersQuery, searchParams);
    
    // Filter repair orders: if multiple share same first 10 chars of sls_id,
    // keep only the one with highest suffix number (e.g., :04 over :01, :02, :03)
    const prefixMap = new Map();
    allRepairOrders.forEach((ro) => {
      const slsId = ro.sls_id || '';
      if (slsId.length > 10) {
        const prefix = slsId.substring(0, 10);
        const suffix = slsId.substring(10);
        const match = suffix.match(/:(\d+)/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!prefixMap.has(prefix) || prefixMap.get(prefix).num < num) {
            prefixMap.set(prefix, { num, ro });
          }
          return;
        }
      }
      // For orders without the pattern, use the sls_id as key directly
      const key = slsId.length > 10 ? slsId.substring(0, 10) : slsId;
      if (!prefixMap.has(key)) {
        prefixMap.set(key, { num: 0, ro });
      }
    });
    
    const filteredOrders = Array.from(prefixMap.values()).map(item => item.ro);
    const total = filteredOrders.length;
    
    // Apply pagination to filtered results
    const paginatedOrders = filteredOrders.slice(offsetVal, offsetVal + limitVal);
    
    console.log(`[DCV] Repair orders for customer ${id}: ${paginatedOrders.length} of ${total} total (after filtering${searchParam ? ' with search' : ''})`);
    
    res.json({
      repairOrders: paginatedOrders.map(ro => ({
        id: ro.id,
        slsId: ro.sls_id,
        vin: ro.vin,
        odomIn: ro.odom_in,
        odomOut: ro.odom_out,
        tag: ro.tag,
        cusId: ro.cus_id,
        empId: ro.emp_id,
        empIdWriter: ro.emp_id_writer,
        dateCreate: ro.date_create,
        folderId: ro.folder_id,
        folderName: ro.folder_name,
        locationName: ro.location_name,
      })),
      total,
      page: pageVal,
      pageSize: limitVal,
      totalPages: Math.ceil(total / limitVal),
    });
  } catch (err) {
    console.error('[DCV] Repair orders error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;