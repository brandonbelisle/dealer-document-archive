// routes/folders.js
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { requireAuth, requirePermission } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');
const socket = require('../socket');

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

// ── GET /api/folders/stats ──────────────────────────────
// Returns folder and file counts grouped by location and department
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const num = (val) => Number(val || 0);

    // Per-department: folder count and file count (including files in subfolders)
    const [deptRows] = await db.execute(
      `SELECT d.id AS department_id,
              d.location_id,
              COUNT(DISTINCT fld.id) AS folder_count,
              COUNT(DISTINCT f.id) AS file_count
       FROM departments d
       LEFT JOIN folders fld ON fld.department_id = d.id
       LEFT JOIN files f ON f.folder_id = fld.id AND f.status = 'done'
       GROUP BY d.id, d.location_id`
    );

    // Per-folder: direct file count and subfolder count (for top-level folders only)
    const [folderRows] = await db.execute(
      `SELECT fld.id AS folder_id,
              fld.department_id,
              fld.location_id,
              (SELECT COUNT(*) FROM files WHERE folder_id = fld.id) AS file_count,
              (SELECT COUNT(*) FROM folders WHERE parent_id = fld.id) AS subfolder_count
       FROM folders fld
       WHERE fld.parent_id IS NULL`
    );

    // Build recursive file counts per folder (all descendants)
    // First get ALL folders for recursive counting
    const [allFolders] = await db.execute('SELECT id, parent_id FROM folders');
    const [allFileCounts] = await db.execute(
      `SELECT folder_id, COUNT(*) AS cnt FROM files WHERE status = 'done' GROUP BY folder_id`
    );

    const fileCountMap = {};
    for (const r of allFileCounts) fileCountMap[r.folder_id] = num(r.cnt);

    const childrenMap = {};
    for (const f of allFolders) {
      if (f.parent_id) {
        if (!childrenMap[f.parent_id]) childrenMap[f.parent_id] = [];
        childrenMap[f.parent_id].push(f.id);
      }
    }

    function countFilesRecursive(folderId) {
      let total = fileCountMap[folderId] || 0;
      const children = childrenMap[folderId] || [];
      for (const childId of children) {
        total += countFilesRecursive(childId);
      }
      return total;
    }

    const deptStats = {};
    for (const r of deptRows) {
      deptStats[r.department_id] = {
        folderCount: num(r.folder_count),
        fileCount: num(r.file_count),
      };
    }

    const folderStats = {};
    for (const r of folderRows) {
      folderStats[r.folder_id] = {
        fileCount: countFilesRecursive(r.folder_id),
        subfolderCount: num(r.subfolder_count),
      };
    }

    res.json({ deptStats, folderStats });
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
    socket.foldersChanged(departmentId);

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

// ── GET /api/folders/find ──────────────────────────────────
// Find a folder by name, locationId, departmentId, and optional parentId
router.get('/find', requireAuth, async (req, res) => {
  try {
    const { name, locationId, departmentId, parentId } = req.query;
    if (!name?.trim() || !locationId || !departmentId) {
      return res.status(400).json({ error: 'name, locationId, departmentId required' });
    }

    let sql = `SELECT f.* FROM folders f WHERE f.name = ? AND f.location_id = ? AND f.department_id = ?`;
    const params = [name.trim(), locationId, departmentId];

    if (parentId === 'null' || parentId === '' || parentId === undefined) {
      sql += ' AND f.parent_id IS NULL';
    } else if (parentId) {
      sql += ' AND f.parent_id = ?';
      params.push(parentId);
    } else {
      sql += ' AND f.parent_id IS NULL';
    }

    const [rows] = await db.execute(sql, params);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Folder not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── DELETE /api/folders/:id ───────────────────────────────
router.delete('/:id', requireAuth, requirePermission('deleteFolders'), async (req, res) => {
  try {
    const [existing] = await db.execute('SELECT name, department_id FROM folders WHERE id = ?', [req.params.id]);
    if (existing.length === 0) return res.status(404).json({ error: 'Not found' });

    const departmentId = existing[0].department_id;
    await db.execute('UPDATE files SET folder_id = NULL WHERE folder_id = ?', [req.params.id]);
    await db.execute('DELETE FROM folders WHERE id = ?', [req.params.id]);
    await logAudit('Folder Deleted', `"${existing[0].name}"`, req.user, req.ip);
    socket.foldersChanged(departmentId);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
