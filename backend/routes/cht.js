const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { requireAuth, requirePermission } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');
const socket = require('../socket');

const router = express.Router();

// Get all inquiries (user sees own, users with cht_inquiry_view_all see all)
router.get('/inquiries', requireAuth, async (req, res) => {
  try {
    const canViewAll = req.user.permissions?.includes('cht_inquiry_view_all');
    
    let query = `
      SELECT i.id, i.invoice_number, i.notes, i.status_id, i.assigned_to, i.created_at, i.updated_at, i.assigned_at,
             u.display_name as submitted_by,
             s.name as status_name, s.color as status_color,
             a.display_name as assigned_to_name
       FROM cht_inquiries i
       JOIN users u ON i.user_id = u.id
       LEFT JOIN cht_statuses s ON i.status_id = s.id
       LEFT JOIN users a ON i.assigned_to = a.id
    `;
    
    const params = [];
    if (!canViewAll) {
      query += ' WHERE i.user_id = ?';
      params.push(req.user.id);
    }
    
    query += ' ORDER BY i.created_at DESC';
    
    const [rows] = await db.execute(query, params);
    res.json({ inquiries: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new inquiry
router.post('/inquiries', requireAuth, async (req, res) => {
  try {
    const { invoiceNumber, notes } = req.body;
    
    if (!invoiceNumber || !invoiceNumber.trim()) {
      return res.status(400).json({ error: 'Invoice number is required' });
    }

    // Get default status
    const [defaultStatus] = await db.execute(
      'SELECT id FROM cht_statuses WHERE is_default = 1 LIMIT 1'
    );
    const statusId = defaultStatus.length > 0 ? defaultStatus[0].id : null;

    const id = uuidv4();
    await db.execute(
      `INSERT INTO cht_inquiries (id, user_id, invoice_number, notes, status_id)
       VALUES (?, ?, ?, ?, ?)`,
      [id, req.user.id, invoiceNumber.trim(), notes?.trim() || null, statusId]
    );

    await logAudit('Credit Hold Inquiry Created', `Invoice: ${invoiceNumber.trim()}`, req.user, req.ip);

    const [rows] = await db.execute(
      `SELECT i.id, i.invoice_number, i.notes, i.status_id, i.assigned_to, i.created_at, i.updated_at, i.assigned_at,
              u.display_name as submitted_by,
              s.name as status_name, s.color as status_color,
              a.display_name as assigned_to_name
       FROM cht_inquiries i
       JOIN users u ON i.user_id = u.id
       LEFT JOIN cht_statuses s ON i.status_id = s.id
       LEFT JOIN users a ON i.assigned_to = a.id
       WHERE i.id = ?`,
      [id]
    );

    res.status(201).json({ inquiry: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Accept (assign) an inquiry
router.post('/inquiries/:id/accept', requireAuth, requirePermission('cht_inquiry_accept'), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if inquiry exists
    const [existing] = await db.execute(
      'SELECT id, invoice_number, assigned_to, user_id FROM cht_inquiries WHERE id = ?',
      [id]
    );
    
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Inquiry not found' });
    }

    const inquiry = existing[0];
    
    // Check if already assigned
    if (inquiry.assigned_to) {
      return res.status(400).json({ error: 'This inquiry is already assigned' });
    }

    // Get "In Review" status
    const [inReviewStatus] = await db.execute(
      "SELECT id FROM cht_statuses WHERE name = 'In Review' LIMIT 1"
    );
    const inReviewStatusId = inReviewStatus.length > 0 ? inReviewStatus[0].id : null;

    // Assign to current user
    await db.execute(
      `UPDATE cht_inquiries SET assigned_to = ?, assigned_at = NOW(), status_id = ? WHERE id = ?`,
      [req.user.id, inReviewStatusId, id]
    );

    await logAudit('Credit Hold Inquiry Accepted', `Invoice: ${inquiry.invoice_number}`, req.user, req.ip);

    // Notify the original submitter
    const socket = require('../socket');
    const io = socket.getIO();
    if (io) {
      io.to(`user-${inquiry.user_id}`).emit('notification', {
        type: 'cht_inquiry_assigned',
        title: 'Credit Hold Inquiry Assigned',
        message: `Your inquiry for invoice "${inquiry.invoice_number}" has been assigned for review.`,
        data: { inquiryId: id },
        createdAt: new Date().toISOString(),
      });
    }

    // Create notification record
    await db.execute(
      `INSERT INTO notifications (id, user_id, type, title, message, data)
       VALUES (UUID(), ?, 'cht_inquiry_assigned', ?, ?, ?)`,
      [inquiry.user_id, 'Credit Hold Inquiry Assigned', 
       `Your inquiry for invoice "${inquiry.invoice_number}" has been assigned for review.`,
       JSON.stringify({ inquiryId: id })]
    );

    const [rows] = await db.execute(
      `SELECT i.id, i.invoice_number, i.notes, i.status_id, i.assigned_to, i.created_at, i.updated_at, i.assigned_at,
              u.display_name as submitted_by,
              s.name as status_name, s.color as status_color,
              a.display_name as assigned_to_name
       FROM cht_inquiries i
       JOIN users u ON i.user_id = u.id
       LEFT JOIN cht_statuses s ON i.status_id = s.id
       LEFT JOIN users a ON i.assigned_to = a.id
       WHERE i.id = ?`,
      [id]
    );

    res.json({ inquiry: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all statuses
router.get('/statuses', requireAuth, async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT id, name, color, sort_order, is_default, created_at, updated_at FROM cht_statuses ORDER BY sort_order'
    );
    res.json({ statuses: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new status
router.post('/statuses', requireAuth, requirePermission('cht_manage_statuses'), async (req, res) => {
  try {
    const { name, color, sortOrder } = req.body;
    
    if (!name?.trim()) {
      return res.status(400).json({ error: 'Status name is required' });
    }

    const [result] = await db.execute(
      `INSERT INTO cht_statuses (name, color, sort_order) VALUES (?, ?, ?)`,
      [name.trim(), color || '#6b7280', sortOrder || 0]
    );

    await logAudit('CHT Status Created', `Status: ${name.trim()}`, req.user, req.ip);

    const [rows] = await db.execute(
      'SELECT id, name, color, sort_order, is_default, created_at, updated_at FROM cht_statuses WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({ status: rows[0] });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Status name already exists' });
    }
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a status
router.put('/statuses/:id', requireAuth, requirePermission('cht_manage_statuses'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, color, sortOrder, isDefault } = req.body;
    
    const [existing] = await db.execute('SELECT name FROM cht_statuses WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Status not found' });
    }

    const updates = [];
    const params = [];
    
    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name.trim());
    }
    if (color !== undefined) {
      updates.push('color = ?');
      params.push(color);
    }
    if (sortOrder !== undefined) {
      updates.push('sort_order = ?');
      params.push(sortOrder);
    }
    if (isDefault !== undefined) {
      updates.push('is_default = ?');
      params.push(isDefault ? 1 : 0);
    }

    if (updates.length > 0) {
      // If setting as default, clear other defaults first
      if (isDefault) {
        await db.execute('UPDATE cht_statuses SET is_default = 0');
      }
      
      params.push(id);
      await db.execute(`UPDATE cht_statuses SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    await logAudit('CHT Status Updated', `Status: ${name || existing[0].name}`, req.user, req.ip);

    const [rows] = await db.execute(
      'SELECT id, name, color, sort_order, is_default, created_at, updated_at FROM cht_statuses WHERE id = ?',
      [id]
    );

    res.json({ status: rows[0] });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Status name already exists' });
    }
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a status
router.delete('/statuses/:id', requireAuth, requirePermission('cht_manage_statuses'), async (req, res) => {
  try {
    const { id } = req.params;
    
    const [existing] = await db.execute('SELECT name FROM cht_statuses WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Status not found' });
    }

    // Check if status is in use
    const [inUse] = await db.execute('SELECT COUNT(*) as cnt FROM cht_inquiries WHERE status_id = ?', [id]);
    if (inUse[0].cnt > 0) {
      return res.status(400).json({ error: 'Cannot delete status that is in use' });
    }

    await db.execute('DELETE FROM cht_statuses WHERE id = ?', [id]);
    await logAudit('CHT Status Deleted', `Status: ${existing[0].name}`, req.user, req.ip);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get responses for an inquiry
router.get('/inquiries/:id/responses', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const [rows] = await db.execute(
      `SELECT r.id, r.inquiry_id, r.response, r.created_at,
              u.display_name as user_name,
              s.name as status_name, s.color as status_color
       FROM cht_inquiry_responses r
       JOIN users u ON r.user_id = u.id
       LEFT JOIN cht_statuses s ON r.status_id = s.id
       WHERE r.inquiry_id = ?
       ORDER BY r.created_at DESC`,
      [id]
    );
    
    res.json({ responses: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update inquiry status with response
router.post('/inquiries/:id/respond', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { statusId, response } = req.body;
    
    if (!statusId) {
      return res.status(400).json({ error: 'Status is required' });
    }
    
    if (!response || !response.trim()) {
      return res.status(400).json({ error: 'Response is required' });
    }

    // Check if inquiry exists
    const [existing] = await db.execute(
      'SELECT id, invoice_number, user_id FROM cht_inquiries WHERE id = ?',
      [id]
    );
    
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Inquiry not found' });
    }

    const inquiry = existing[0];

    // Get status name for audit
    const [statusRow] = await db.execute('SELECT name FROM cht_statuses WHERE id = ?', [statusId]);
    const statusName = statusRow.length > 0 ? statusRow[0].name : 'Unknown';

    // Insert response
    await db.execute(
      `INSERT INTO cht_inquiry_responses (inquiry_id, user_id, status_id, response)
       VALUES (?, ?, ?, ?)`,
      [id, req.user.id, statusId, response.trim()]
    );

    // Update inquiry status
    await db.execute(
      'UPDATE cht_inquiries SET status_id = ?, updated_at = NOW() WHERE id = ?',
      [statusId, id]
    );

    await logAudit('CHT Inquiry Updated', `Invoice: ${inquiry.invoice_number} → Status: ${statusName}`, req.user, req.ip);

    // Notify the original submitter
    const socket = require('../socket');
    const io = socket.getIO();
    if (io) {
      io.to(`user-${inquiry.user_id}`).emit('notification', {
        type: 'cht_inquiry_updated',
        title: 'Credit Hold Inquiry Updated',
        message: `Your inquiry for invoice "${inquiry.invoice_number}" has been updated to ${statusName}.`,
        data: { inquiryId: id },
        createdAt: new Date().toISOString(),
      });
    }

    // Create notification record
    await db.execute(
      `INSERT INTO notifications (id, user_id, type, title, message, data)
       VALUES (UUID(), ?, 'cht_inquiry_updated', ?, ?, ?)`,
      [inquiry.user_id, 'Credit Hold Inquiry Updated', 
       `Your inquiry for invoice "${inquiry.invoice_number}" has been updated to ${statusName}.`,
       JSON.stringify({ inquiryId: id })]
    );

    // Return updated inquiry
    const [rows] = await db.execute(
      `SELECT i.id, i.invoice_number, i.notes, i.status_id, i.assigned_to, i.created_at, i.updated_at, i.assigned_at,
              u.display_name as submitted_by,
              s.name as status_name, s.color as status_color,
              a.display_name as assigned_to_name
       FROM cht_inquiries i
       JOIN users u ON i.user_id = u.id
       LEFT JOIN cht_statuses s ON i.status_id = s.id
       LEFT JOIN users a ON i.assigned_to = a.id
       WHERE i.id = ?`,
      [id]
    );

    res.json({ inquiry: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;