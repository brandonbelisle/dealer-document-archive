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

    const limit = parseInt(req.query.limit || '500', 10);
    const offset = parseInt(req.query.offset || '0', 10);
    sql += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [rows] = await db.execute(sql, params);

    // Get total count
    let countSql = 'SELECT COUNT(*) AS total FROM audit_log';
    const countParams = [];
    if (conditions.length > 0) {
      countSql += ' WHERE ' + conditions.join(' AND ');
      // Re-add filter params (exclude limit/offset)
      if (req.query.action) countParams.push(req.query.action);
      if (req.query.user) countParams.push(req.query.user);
      if (req.query.date) countParams.push(req.query.date);
    }
    const [countRows] = await db.execute(countSql, countParams);

    res.json({ entries: rows, total: Number(countRows[0].total || 0) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /api/audit/filters ────────────────────────────────
// Returns distinct actions and users for filter dropdowns
router.get('/filters', requireAuth, requirePermission('viewAuditLog'), async (req, res) => {
  try {
    const [actions] = await db.execute('SELECT DISTINCT action FROM audit_log ORDER BY action');
    const [users] = await db.execute('SELECT DISTINCT user_name FROM audit_log ORDER BY user_name');
    res.json({
      actions: actions.map(a => a.action),
      users: users.map(u => u.user_name),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
