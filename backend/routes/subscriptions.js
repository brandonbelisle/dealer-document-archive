// routes/subscriptions.js
// User subscriptions for locations, departments, and folders
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// ── GET /api/subscriptions ─────────────────────────────────
// Get all subscriptions for the current user
router.get('/', requireAuth, async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT id, subscription_type, subscription_id, created_at 
       FROM subscriptions 
       WHERE user_id = ? 
       ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /api/subscriptions ────────────────────────────────
// Create a new subscription
router.post('/', requireAuth, async (req, res) => {
  try {
    const { subscriptionType, subscriptionId } = req.body;
    
    if (!['location', 'department', 'folder'].includes(subscriptionType)) {
      return res.status(400).json({ error: 'Invalid subscription type' });
    }

    // Verify the target exists
    let table;
    if (subscriptionType === 'location') table = 'locations';
    else if (subscriptionType === 'department') table = 'departments';
    else table = 'folders';

    const [target] = await db.execute(`SELECT id FROM ${table} WHERE id = ?`, [subscriptionId]);
    if (target.length === 0) {
      return res.status(404).json({ error: `${subscriptionType} not found` });
    }

    // Check for existing subscription
    const [existing] = await db.execute(
      `SELECT id FROM subscriptions 
       WHERE user_id = ? AND subscription_type = ? AND subscription_id = ?`,
      [req.user.id, subscriptionType, subscriptionId]
    );
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Already subscribed' });
    }

    const id = uuidv4();
    await db.execute(
      `INSERT INTO subscriptions (id, user_id, subscription_type, subscription_id)
       VALUES (?, ?, ?, ?)`,
      [id, req.user.id, subscriptionType, subscriptionId]
    );

    const [rows] = await db.execute('SELECT * FROM subscriptions WHERE id = ?', [id]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── DELETE /api/subscriptions/:id ──────────────────────────
// Delete a subscription
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const [existing] = await db.execute(
      'SELECT id FROM subscriptions WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    await db.execute('DELETE FROM subscriptions WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /api/subscriptions/check ───────────────────────────
// Check if user is subscribed to a specific item
router.get('/check', requireAuth, async (req, res) => {
  try {
    const { subscriptionType, subscriptionId } = req.query;
    
    const [rows] = await db.execute(
      `SELECT id FROM subscriptions 
       WHERE user_id = ? AND subscription_type = ? AND subscription_id = ?`,
      [req.user.id, subscriptionType, subscriptionId]
    );
    
    res.json({ subscribed: rows.length > 0, subscriptionId: rows[0]?.id || null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /api/subscriptions/with-details ────────────────────
// Get subscriptions with names of subscribed items
router.get('/with-details', requireAuth, async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT s.id, s.subscription_type, s.subscription_id, s.created_at,
              CASE 
                WHEN s.subscription_type = 'location' THEN l.name
                WHEN s.subscription_type = 'department' THEN d.name
                WHEN s.subscription_type = 'folder' THEN f.name
              END AS item_name,
              CASE 
                WHEN s.subscription_type = 'location' THEN NULL
                WHEN s.subscription_type = 'department' THEN loc.name
                WHEN s.subscription_type = 'folder' THEN loc.name
              END AS location_name,
              CASE 
                WHEN s.subscription_type = 'folder' THEN dept.name
                ELSE NULL
              END AS department_name
       FROM subscriptions s
       LEFT JOIN locations l ON s.subscription_type = 'location' AND s.subscription_id = l.id
       LEFT JOIN departments d ON s.subscription_type = 'department' AND s.subscription_id = d.id
       LEFT JOIN folders f ON s.subscription_type = 'folder' AND s.subscription_id = f.id
       LEFT JOIN locations loc ON (s.subscription_type = 'department' AND d.location_id = loc.id) 
                               OR (s.subscription_type = 'folder' AND f.location_id = loc.id)
       LEFT JOIN departments dept ON s.subscription_type = 'folder' AND f.department_id = dept.id
       WHERE s.user_id = ?
       ORDER BY s.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;