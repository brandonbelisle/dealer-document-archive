// DCV routes - Dealer Customer Vision
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { requireAuth, requirePermission } = require('../middleware/auth');

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

module.exports = router;