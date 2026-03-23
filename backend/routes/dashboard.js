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

    // This year's counts
    const [filesThisYear] = await db.execute(
      "SELECT COUNT(*) AS cnt FROM files WHERE status = 'done' AND YEAR(uploaded_at) = YEAR(CURDATE())"
    );
    const [foldersThisYear] = await db.execute(
      'SELECT COUNT(*) AS cnt FROM folders WHERE YEAR(created_at) = YEAR(CURDATE())'
    );

    // Counts per location (folder count per location)
    const [locationFolderCounts] = await db.execute(`
      SELECT l.id AS location_id, COUNT(f.id) AS folder_count
      FROM locations l
      LEFT JOIN folders f ON f.location_id = l.id
      GROUP BY l.id
    `);

    // Counts per department (folder count and file count per department)
    const [deptCounts] = await db.execute(`
      SELECT 
        d.id AS department_id,
        d.location_id,
        COUNT(DISTINCT f.id) AS folder_count,
        COUNT(fi.id) AS file_count
      FROM departments d
      LEFT JOIN folders f ON f.department_id = d.id
      LEFT JOIN files fi ON fi.folder_id = f.id AND fi.status = 'done'
      GROUP BY d.id, d.location_id
    `);

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
      filesThisYear: num(filesThisYear[0].cnt),
      foldersThisYear: num(foldersThisYear[0].cnt),
      recentFiles: normalizedFiles,
      locationFolderCounts: locationFolderCounts.reduce((acc, row) => {
        acc[row.location_id] = num(row.folder_count);
        return acc;
      }, {}),
      deptCounts: deptCounts.reduce((acc, row) => {
        acc[row.department_id] = {
          folderCount: num(row.folder_count),
          fileCount: num(row.file_count),
        };
        return acc;
      }, {}),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
