// routes/departments.js
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { requireAuth, requirePermission } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');
const socket = require('../socket');

const router = express.Router();

// ── GET /api/departments ──────────────────────────────────
// Optional query: ?locationId=xxx
router.get('/', requireAuth, async (req, res) => {
  try {
    let sql = 'SELECT d.*, l.name AS location_name FROM departments d JOIN locations l ON d.location_id = l.id';
    const params = [];
    if (req.query.locationId) {
      sql += ' WHERE d.location_id = ?';
      params.push(req.query.locationId);
    }
    sql += ' ORDER BY l.name, d.name';
    const [rows] = await db.execute(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /api/departments ─────────────────────────────────
router.post('/', requireAuth, requirePermission('manageDepartments'), async (req, res) => {
  try {
    const { name, locationId } = req.body;
    if (!name?.trim() || !locationId) return res.status(400).json({ error: 'Name and locationId required' });

    const [loc] = await db.execute('SELECT name FROM locations WHERE id = ?', [locationId]);
    if (loc.length === 0) return res.status(404).json({ error: 'Location not found' });

    const id = uuidv4();
    await db.execute(
      'INSERT INTO departments (id, name, location_id, created_by) VALUES (?, ?, ?, ?)',
      [id, name.trim(), locationId, req.user.id]
    );
    await logAudit('Department Created', `"${name.trim()}" in ${loc[0].name}`, req.user, req.ip);
    socket.departmentsChanged(locationId);

    const [rows] = await db.execute(
      'SELECT d.*, l.name AS location_name FROM departments d JOIN locations l ON d.location_id = l.id WHERE d.id = ?',
      [id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── PUT /api/departments/:id ──────────────────────────────
router.put('/:id', requireAuth, requirePermission('manageDepartments'), async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Name required' });

    const [existing] = await db.execute('SELECT d.name, d.location_id, l.name AS loc_name FROM departments d JOIN locations l ON d.location_id = l.id WHERE d.id = ?', [req.params.id]);
    if (existing.length === 0) return res.status(404).json({ error: 'Not found' });

    await db.execute('UPDATE departments SET name = ? WHERE id = ?', [name.trim(), req.params.id]);
    await logAudit('Department Renamed', `"${existing[0].name}" → "${name.trim()}" (${existing[0].loc_name})`, req.user, req.ip);
    socket.departmentsChanged(existing[0].location_id);

    const [rows] = await db.execute(
      'SELECT d.*, l.name AS location_name FROM departments d JOIN locations l ON d.location_id = l.id WHERE d.id = ?',
      [req.params.id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── DELETE /api/departments/:id ───────────────────────────
router.delete('/:id', requireAuth, requirePermission('manageDepartments'), async (req, res) => {
  try {
    const [existing] = await db.execute('SELECT name, location_id FROM departments WHERE id = ?', [req.params.id]);
    if (existing.length === 0) return res.status(404).json({ error: 'Not found' });

    await db.execute('DELETE FROM departments WHERE id = ?', [req.params.id]);
    await logAudit('Department Deleted', `"${existing[0].name}"`, req.user, req.ip);
    socket.departmentsChanged(existing[0].location_id);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
