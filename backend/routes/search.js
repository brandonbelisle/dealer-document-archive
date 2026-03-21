// routes/search.js
const express = require('express');
const db = require('../config/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const num = (val) => Number(val || 0);

// ── GET /api/search?q=term ──────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.json({ folders: [], files: [] });

    const like = `%${q}%`;

    // Search folders
    const [folderRows] = await db.execute(
      `SELECT f.id, f.name, f.location_id, f.department_id, f.parent_id,
              l.name AS location_name, d.name AS department_name,
              (SELECT COUNT(*) FROM files WHERE folder_id = f.id AND status = 'done') AS file_count
       FROM folders f
       JOIN locations l ON f.location_id = l.id
       JOIN departments d ON f.department_id = d.id
       WHERE f.name LIKE ?
       ORDER BY f.name
       LIMIT 10`,
      [like]
    );

    // Search files
    const [fileRows] = await db.execute(
      `SELECT f.id, f.name, f.file_size_bytes, f.page_count, f.mime_type,
              f.folder_id, f.status, f.uploaded_at,
              fld.name AS folder_name, fld.location_id, fld.department_id,
              l.name AS location_name, d.name AS department_name,
              u.display_name AS uploaded_by_name
       FROM files f
       LEFT JOIN folders fld ON f.folder_id = fld.id
       LEFT JOIN locations l ON fld.location_id = l.id
       LEFT JOIN departments d ON fld.department_id = d.id
       LEFT JOIN users u ON f.uploaded_by = u.id
       WHERE f.name LIKE ?
       ORDER BY f.uploaded_at DESC
       LIMIT 15`,
      [like]
    );

    const folders = folderRows.map(r => ({
      id: r.id,
      name: r.name,
      locationId: r.location_id,
      departmentId: r.department_id,
      parentId: r.parent_id || null,
      locationName: r.location_name,
      departmentName: r.department_name,
      fileCount: num(r.file_count),
    }));

    const files = fileRows.map(r => ({
      id: r.id,
      name: r.name,
      size: num(r.file_size_bytes),
      pages: num(r.page_count),
      type: r.mime_type || 'application/pdf',
      folderId: r.folder_id || null,
      status: r.status,
      uploadedAt: r.uploaded_at,
      uploadedBy: r.uploaded_by_name || null,
      folderName: r.folder_name || null,
      locationId: r.location_id || null,
      departmentId: r.department_id || null,
      locationName: r.location_name || null,
      departmentName: r.department_name || null,
    }));

    res.json({ folders, files });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
