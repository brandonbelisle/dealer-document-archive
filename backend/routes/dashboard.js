// routes/dashboard.js
const express = require('express');
const db = require('../config/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

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

    // Recent uploads (last 10)
    const [recentFiles] = await db.execute(
      `SELECT f.id, f.name, f.file_size_bytes, f.page_count, f.uploaded_at,
              fld.id AS folder_id, fld.name AS folder_name,
              l.name AS location_name, d.name AS department_name
       FROM files f
       JOIN folders fld ON f.folder_id = fld.id
       JOIN locations l ON fld.location_id = l.id
       JOIN departments d ON fld.department_id = d.id
       WHERE f.status = 'done'
       ORDER BY f.uploaded_at DESC
       LIMIT 10`
    );

    res.json({
      totalFiles: fileCount[0].cnt,
      totalFolders: folderCount[0].cnt,
      totalLocations: locationCount[0].cnt,
      totalDepartments: deptCount[0].cnt,
      filesToday: filesToday[0].cnt,
      foldersToday: foldersToday[0].cnt,
      locationStats,
      recentFiles,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
