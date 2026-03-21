// routes/dashboard.js
const express = require('express');
const db = require('../config/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Helper: MySQL COUNT(*) can return BigInt — convert to regular number
const num = (val) => Number(val || 0);

// ── GET /api/dashboard ────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  try {
    // Total counts
    const [fileCount] = await db.execute("SELECT COUNT(*) AS cnt FROM files WHERE status = 'done'");
    const [folderCount] = await db.execute('SELECT COUNT(*) AS cnt FROM folders');
    const [locationCount] = await db.execute('SELECT COUNT(*) AS cnt FROM locations');
    const [deptCount] = await db.execute('SELECT COUNT(*) AS cnt FROM departments');

    // Today's counts
    const [filesToday] = await db.execute("SELECT COUNT(*) AS cnt FROM files WHERE status = 'done' AND uploaded_at >= CURDATE()");
    const [foldersToday] = await db.execute('SELECT COUNT(*) AS cnt FROM folders WHERE created_at >= CURDATE()');

    // Per-location stats
    const [locationStats] = await db.execute(
      `SELECT l.id, l.name,
              COUNT(DISTINCT fld.id) AS folder_count,
              COUNT(DISTINCT f.id) AS file_count
       FROM locations l
       LEFT JOIN folders fld ON fld.location_id = l.id
       LEFT JOIN files f ON f.folder_id = fld.id AND f.status = 'done'
       GROUP BY l.id
       ORDER BY l.name`
    );

    // Convert BigInt values in locationStats
    const normalizedStats = locationStats.map(l => ({
      id: l.id,
      name: l.name,
      folder_count: num(l.folder_count),
      file_count: num(l.file_count),
    }));

    // Recent uploads (last 10)
    const [recentFiles] = await db.execute(
      `SELECT f.id, f.name, f.file_size_bytes, f.page_count, f.mime_type, f.uploaded_at,
              fld.id AS folder_id, fld.name AS folder_name,
              l.name AS location_name, d.name AS department_name
       FROM files f
       JOIN folders fld ON f.folder_id = fld.id
       JOIN locations l ON fld.location_id = l.id
       JOIN departments d ON fld.department_id = d.id
       WHERE f.status = 'done' AND f.uploaded_by = ?
       ORDER BY f.uploaded_at DESC
       LIMIT 10`,
      [req.user.id]
    );

    // Normalize recentFiles too (file_size_bytes and page_count can be BigInt)
    const normalizedFiles = recentFiles.map(f => ({
      id: f.id,
      name: f.name,
      file_size_bytes: num(f.file_size_bytes),
      page_count: num(f.page_count),
      mime_type: f.mime_type,
      uploaded_at: f.uploaded_at,
      folder_id: f.folder_id,
      folder_name: f.folder_name,
      location_name: f.location_name,
      department_name: f.department_name,
    }));

    res.json({
      totalFiles: num(fileCount[0].cnt),
      totalFolders: num(folderCount[0].cnt),
      totalLocations: num(locationCount[0].cnt),
      totalDepartments: num(deptCount[0].cnt),
      filesToday: num(filesToday[0].cnt),
      foldersToday: num(foldersToday[0].cnt),
      locationStats: normalizedStats,
      recentFiles: normalizedFiles,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
