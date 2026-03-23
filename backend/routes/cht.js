const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { requireAuth, requirePermission } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

const router = express.Router();

router.get('/inquiries', requireAuth, async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT i.id, i.invoice_number, i.notes, i.status, i.created_at, i.updated_at,
              u.display_name as submitted_by
       FROM cht_inquiries i
       JOIN users u ON i.user_id = u.id
       WHERE i.user_id = ?
       ORDER BY i.created_at DESC`,
      [req.user.id]
    );
    res.json({ inquiries: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/inquiries', requireAuth, async (req, res) => {
  try {
    const { invoiceNumber, notes } = req.body;
    
    if (!invoiceNumber || !invoiceNumber.trim()) {
      return res.status(400).json({ error: 'Invoice number is required' });
    }

    const id = uuidv4();
    await db.execute(
      `INSERT INTO cht_inquiries (id, user_id, invoice_number, notes, status)
       VALUES (?, ?, ?, ?, 'pending')`,
      [id, req.user.id, invoiceNumber.trim(), notes?.trim() || null]
    );

    await logAudit('Credit Hold Inquiry Created', `Invoice: ${invoiceNumber.trim()}`, req.user, req.ip);

    const [rows] = await db.execute(
      `SELECT i.id, i.invoice_number, i.notes, i.status, i.created_at, i.updated_at,
              u.display_name as submitted_by
       FROM cht_inquiries i
       JOIN users u ON i.user_id = u.id
       WHERE i.id = ?`,
      [id]
    );

    res.status(201).json({ inquiry: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;