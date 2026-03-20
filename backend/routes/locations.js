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
      'SELECT id, name, created_at, updated_at FROM locations ORDER BY name'
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
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Name required' });

    const id = uuidv4();
    await db.execute(
      'INSERT INTO locations (id, name, created_by) VALUES (?, ?, ?)',
      [id, name.trim(), req.user.id]
    );
    await logAudit('Location Created', `"${name.trim()}"`, req.user, req.ip);

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
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Name required' });

    const [existing] = await db.execute('SELECT name FROM locations WHERE id = ?', [req.params.id]);
    if (existing.length === 0) return res.status(404).json({ error: 'Not found' });

    await db.execute('UPDATE locations SET name = ? WHERE id = ?', [name.trim(), req.params.id]);
    await logAudit('Location Renamed', `"${existing[0].name}" → "${name.trim()}"`, req.user, req.ip);

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
    const [existing] = await db.execute('SELECT name FROM locations WHERE id = ?', [req.params.id]);
    if (existing.length === 0) return res.status(404).json({ error: 'Not found' });

    await db.execute('DELETE FROM locations WHERE id = ?', [req.params.id]);
    await logAudit('Location Deleted', `"${existing[0].name}"`, req.user, req.ip);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
