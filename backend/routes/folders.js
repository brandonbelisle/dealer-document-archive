// routes/folders.js
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { requireAuth, requirePermission } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

const router = express.Router();

// ── GET /api/folders ──────────────────────────────────────
// Query params: ?departmentId=xxx&parentId=xxx (null for root)
router.get('/', requireAuth, async (req, res) => {
  try {
    let sql = `SELECT f.*, l.name AS location_name, d.name AS department_name
               FROM folders f
               JOIN locations l ON f.location_id = l.id
               JOIN departments d ON f.department_id = d.id`;
    const params = [];
    const conditions = [];

    if (req.query.departmentId) {
      conditions.push('f.department_id = ?');
      params.push(req.query.departmentId);
    }
    if (req.query.locationId) {
      conditions.push('f.location_id = ?');
      params.push(req.query.locationId);
    }
    if (req.query.parentId === 'null' || req.query.parentId === '') {
      conditions.push('f.parent_id IS NULL');
    } else if (req.query.parentId) {
      conditions.push('f.parent_id = ?');
      params.push(req.query.parentId);
    }

    if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ' ORDER BY f.name';

    const [rows] = await db.execute(sql, params);

    // Attach file count and subfolder count for each folder
    for (const folder of rows) {
      const [fc] = await db.execute('SELECT COUNT(*) AS cnt FROM files WHERE folder_id = ?', [folder.id]);
      const [sc] = await db.execute('SELECT COUNT(*) AS cnt FROM folders WHERE parent_id = ?', [folder.id]);
      folder.fileCount = Number(fc[0].cnt || 0);
      folder.subfolderCount = Number(sc[0].cnt || 0);
    }

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /api/folders/:id ──────────────────────────────────
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT f.*, l.name AS location_name, d.name AS department_name
       FROM folders f
       JOIN locations l ON f.location_id = l.id
       JOIN departments d ON f.department_id = d.id
       WHERE f.id = ?`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });

    const folder = rows[0];

    // Breadcrumb trail
    const breadcrumb = [];
    let current = folder;
    while (current) {
      breadcrumb.unshift({ id: current.id, name: current.name });
      if (current.parent_id) {
        const [parent] = await db.execute('SELECT id, name, parent_id FROM folders WHERE id = ?', [current.parent_id]);
        current = parent[0] || null;
      } else {
        current = null;
      }
    }
    folder.breadcrumb = breadcrumb;

    res.json(folder);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /api/folders ─────────────────────────────────────
router.post('/', requireAuth, requirePermission('createFolders'), async (req, res) => {
  try {
    const { name, locationId, departmentId, parentId } = req.body;
    if (!name?.trim() || !locationId || !departmentId) {
      return res.status(400).json({ error: 'name, locationId, departmentId required' });
    }

    const id = uuidv4();
    await db.execute(
      'INSERT INTO folders (id, name, location_id, department_id, parent_id, created_by) VALUES (?, ?, ?, ?, ?, ?)',
      [id, name.trim(), locationId, departmentId, parentId || null, req.user.id]
    );

    const detail = parentId
      ? `"${name.trim()}" (subfolder)`
      : `"${name.trim()}"`;
    await logAudit(parentId ? 'Subfolder Created' : 'Folder Created', detail, req.user, req.ip);

    const [rows] = await db.execute(
      `SELECT f.*, l.name AS location_name, d.name AS department_name
       FROM folders f JOIN locations l ON f.location_id = l.id JOIN departments d ON f.department_id = d.id
       WHERE f.id = ?`,
      [id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── DELETE /api/folders/:id ───────────────────────────────
router.delete('/:id', requireAuth, requirePermission('deleteFolders'), async (req, res) => {
  try {
    const [existing] = await db.execute('SELECT name FROM folders WHERE id = ?', [req.params.id]);
    if (existing.length === 0) return res.status(404).json({ error: 'Not found' });

    await db.execute('DELETE FROM folders WHERE id = ?', [req.params.id]);
    await logAudit('Folder Deleted', `"${existing[0].name}"`, req.user, req.ip);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
