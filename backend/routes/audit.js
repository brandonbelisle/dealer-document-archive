// routes/audit.js
const express = require('express');
const db = require('../config/db');
const { requireAuth, requirePermission } = require('../middleware/auth');

const router = express.Router();

// ── GET /api/audit ────────────────────────────────────────
// Query: ?action=xxx&user=xxx&date=YYYY-MM-DD&limit=100&offset=0
router.get('/', requireAuth, requirePermission('viewAuditLog'), async (req, res) => {
  try {
    let sql = 'SELECT * FROM audit_log';
    const conditions = [];
    const params = [];

    if (req.query.action) {
      conditions.push('action = ?');
      params.push(req.query.action);
    }
    if (req.query.user) {
      conditions.push('user_name = ?');
      params.push(req.query.user);
    }
    if (req.query.date) {
      conditions.push('DATE(`timestamp`) = ?');
      params.push(req.query.date);
    }

    if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ' ORDER BY `timestamp` DESC';

    // LIMIT and OFFSET must be integers in MySQL prepared statements
    const limit = Math.max(1, Math.min(parseInt(req.query.limit || '500', 10) || 500, 5000));
    const offset = Math.max(0, parseInt(req.query.offset || '0', 10) || 0);
    sql += ` LIMIT ${limit} OFFSET ${offset}`;

    const [rows] = await db.execute(sql, params);

    // Normalize rows to ensure all values are safe for React rendering
    const entries = rows.map(row => ({
      id: row.id,
      action: row.action || '',
      detail: row.detail || '',
      user_id: row.user_id || null,
      user_name: row.user_name || 'Unknown',
      ip_address: row.ip_address || '',
      timestamp: row.timestamp || '',
    }));

    // Get total count for pagination
    let countSql = 'SELECT COUNT(*) AS total FROM audit_log';
    const countParams = [];
    if (conditions.length > 0) {
      countSql += ' WHERE ' + conditions.join(' AND ');
      if (req.query.action) countParams.push(req.query.action);
      if (req.query.user) countParams.push(req.query.user);
      if (req.query.date) countParams.push(req.query.date);
    }
    const [countRows] = await db.execute(countSql, countParams);

    res.json({ entries, total: Number(countRows[0].total || 0) });
  } catch (err) {
    console.error('Audit log error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /api/audit/filters ────────────────────────────────
// Returns distinct actions and users for filter dropdowns
router.get('/filters', requireAuth, requirePermission('viewAuditLog'), async (req, res) => {
  try {
    const [actions] = await db.execute('SELECT DISTINCT action FROM audit_log ORDER BY action');
    const [users] = await db.execute('SELECT DISTINCT user_name FROM audit_log WHERE user_name IS NOT NULL ORDER BY user_name');
    res.json({
      actions: actions.map(a => String(a.action || '')),
      users: users.map(u => String(u.user_name || '')),
    });
  } catch (err) {
    console.error('Audit filters error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
