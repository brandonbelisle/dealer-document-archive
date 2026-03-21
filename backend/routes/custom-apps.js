const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { requireAuth, requirePermission } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT id, name, abbreviation, link, created_at FROM custom_apps ORDER BY name'
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', requireAuth, requirePermission('manageSettings'), async (req, res) => {
  try {
    const { name, abbreviation, link } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Name required' });
    if (!abbreviation?.trim()) return res.status(400).json({ error: 'Abbreviation required' });
    if (!link?.trim()) return res.status(400).json({ error: 'Link required' });
    if (abbreviation.length > 4) return res.status(400).json({ error: 'Abbreviation must be 4 characters or less' });

    const id = uuidv4();
    await db.execute(
      'INSERT INTO custom_apps (id, name, abbreviation, link, created_by) VALUES (?, ?, ?, ?, ?)',
      [id, name.trim(), abbreviation.trim().toUpperCase(), link.trim(), req.user.id]
    );
    await logAudit('Custom App Created', `"${name.trim()}"`, req.user, req.ip);

    const [rows] = await db.execute('SELECT * FROM custom_apps WHERE id = ?', [id]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', requireAuth, requirePermission('manageSettings'), async (req, res) => {
  try {
    const { name, abbreviation, link } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Name required' });
    if (!abbreviation?.trim()) return res.status(400).json({ error: 'Abbreviation required' });
    if (!link?.trim()) return res.status(400).json({ error: 'Link required' });
    if (abbreviation.length > 4) return res.status(400).json({ error: 'Abbreviation must be 4 characters or less' });

    const [existing] = await db.execute('SELECT name FROM custom_apps WHERE id = ?', [req.params.id]);
    if (existing.length === 0) return res.status(404).json({ error: 'Not found' });

    await db.execute(
      'UPDATE custom_apps SET name = ?, abbreviation = ?, link = ? WHERE id = ?',
      [name.trim(), abbreviation.trim().toUpperCase(), link.trim(), req.params.id]
    );
    await logAudit('Custom App Updated', `"${existing[0].name}" → "${name.trim()}"`, req.user, req.ip);

    const [rows] = await db.execute('SELECT * FROM custom_apps WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', requireAuth, requirePermission('manageSettings'), async (req, res) => {
  try {
    const [existing] = await db.execute('SELECT name FROM custom_apps WHERE id = ?', [req.params.id]);
    if (existing.length === 0) return res.status(404).json({ error: 'Not found' });

    await db.execute('DELETE FROM custom_apps WHERE id = ?', [req.params.id]);
    await logAudit('Custom App Deleted', `"${existing[0].name}"`, req.user, req.ip);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;