// routes/locations.js
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { requireAuth, requirePermission } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

const router = express.Router();

// ── GET /api/locations ────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT id, name, location_code, created_at, updated_at FROM locations ORDER BY name'
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /api/locations ───────────────────────────────────
router.post('/', requireAuth, requirePermission('manageLocations'), async (req, res) => {
  try {
    const { name, locationCode } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Name required' });

    // Validate location code format if provided
    if (locationCode && !/^R\d{3}$/.test(locationCode.trim())) {
      return res.status(400).json({ error: 'Location code must be R followed by 3 digits (e.g., R001)' });
    }

    const id = uuidv4();
    const code = locationCode?.trim() || null;
    
    // Check for duplicate location code
    if (code) {
      const [dup] = await db.execute('SELECT id FROM locations WHERE location_code = ?', [code]);
      if (dup.length > 0) {
        return res.status(400).json({ error: 'Location code already exists' });
      }
    }

    await db.execute(
      'INSERT INTO locations (id, name, location_code, created_by) VALUES (?, ?, ?, ?)',
      [id, name.trim(), code, req.user.id]
    );
    await logAudit('Location Created', `"${name.trim()}"${code ? ` (${code})` : ''}`, req.user, req.ip);

    const [rows] = await db.execute('SELECT * FROM locations WHERE id = ?', [id]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── PUT /api/locations/:id ────────────────────────────────
router.put('/:id', requireAuth, requirePermission('manageLocations'), async (req, res) => {
  try {
    const { name, locationCode } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Name required' });

    // Validate location code format if provided
    if (locationCode && !/^R\d{3}$/.test(locationCode.trim())) {
      return res.status(400).json({ error: 'Location code must be R followed by 3 digits (e.g., R001)' });
    }

    const [existing] = await db.execute('SELECT name, location_code FROM locations WHERE id = ?', [req.params.id]);
    if (existing.length === 0) return res.status(404).json({ error: 'Not found' });

    const code = locationCode?.trim() || null;
    
    // Check for duplicate location code (excluding current location)
    if (code) {
      const [dup] = await db.execute('SELECT id FROM locations WHERE location_code = ? AND id != ?', [code, req.params.id]);
      if (dup.length > 0) {
        return res.status(400).json({ error: 'Location code already exists' });
      }
    }

    await db.execute(
      'UPDATE locations SET name = ?, location_code = ? WHERE id = ?',
      [name.trim(), code, req.params.id]
    );
    
    const oldCode = existing[0].location_code;
    const codeChange = oldCode !== code ? ` (${oldCode || 'none'} → ${code || 'none'})` : '';
    await logAudit('Location Updated', `"${existing[0].name}"${codeChange}`, req.user, req.ip);

    const [rows] = await db.execute('SELECT * FROM locations WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── DELETE /api/locations/:id ─────────────────────────────
router.delete('/:id', requireAuth, requirePermission('manageLocations'), async (req, res) => {
  try {
    const [existing] = await db.execute('SELECT name, location_code FROM locations WHERE id = ?', [req.params.id]);
    if (existing.length === 0) return res.status(404).json({ error: 'Not found' });

    await db.execute('DELETE FROM locations WHERE id = ?', [req.params.id]);
    await logAudit('Location Deleted', `"${existing[0].name}"${existing[0].location_code ? ` (${existing[0].location_code})` : ''}`, req.user, req.ip);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
