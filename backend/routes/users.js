// routes/users.js
const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { requireAuth, requirePermission } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');
const socket = require('../socket');

const router = express.Router();

// ── GET /api/users ────────────────────────────────────────
router.get('/', requireAuth, requirePermission('manageUsers'), async (req, res) => {
  try {
    const [users] = await db.execute(
      `SELECT u.id, u.username, u.email, u.display_name, u.status, u.last_login_at, u.created_at,
              GROUP_CONCAT(sg.name ORDER BY sg.name SEPARATOR ', ') AS group_names,
              GROUP_CONCAT(sg.id ORDER BY sg.name SEPARATOR ',') AS group_ids
       FROM users u
       LEFT JOIN user_group_memberships ugm ON u.id = ugm.user_id
       LEFT JOIN security_groups sg ON ugm.group_id = sg.id
       GROUP BY u.id
       ORDER BY u.display_name`
    );
    // Parse group_names and group_ids into arrays
    for (const u of users) {
      u.groups = u.group_names ? u.group_names.split(', ') : [];
      u.groupIds = u.group_ids ? u.group_ids.split(',') : [];
      delete u.group_names;
      delete u.group_ids;
    }
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /api/users ───────────────────────────────────────
router.post('/', requireAuth, requirePermission('manageUsers'), async (req, res) => {
  try {
    const { username, email, password, displayName, groupIds } = req.body;
    if (!username || !email || !password || !displayName) {
      return res.status(400).json({ error: 'All fields required' });
    }

    const [existing] = await db.execute(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email]
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Username or email already exists' });
    }

    const id = uuidv4();
    const hash = await bcrypt.hash(password, 12);
    await db.execute(
      'INSERT INTO users (id, username, email, password_hash, display_name) VALUES (?, ?, ?, ?, ?)',
      [id, username, email, hash, displayName]
    );

    // Assign groups
    if (groupIds && Array.isArray(groupIds)) {
      for (const gid of groupIds) {
        await db.execute(
          'INSERT IGNORE INTO user_group_memberships (user_id, group_id, assigned_by) VALUES (?, ?, ?)',
          [id, gid, req.user.id]
        );
      }
    }

    await logAudit('User Created', `"${displayName}" (${username})`, req.user, req.ip);
    socket.usersChanged();
    res.status(201).json({ id, username, email, displayName });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── PUT /api/users/:id/status ─────────────────────────────
router.put('/:id/status', requireAuth, requirePermission('manageUsers'), async (req, res) => {
  try {
    const { status } = req.body;
    if (!['active', 'inactive', 'suspended'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    await db.execute('UPDATE users SET status = ? WHERE id = ?', [status, req.params.id]);
    await logAudit('User Status Changed', `User ${req.params.id} → ${status}`, req.user, req.ip);
    socket.usersChanged();
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── PUT /api/users/:id/password ───────────────────────────
// Admin: set a new password for any user (no current password required).
router.put('/:id/password', requireAuth, requirePermission('manageUsers'), async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword) {
      return res.status(400).json({ error: 'New password is required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Verify user exists
    const [users] = await db.execute(
      'SELECT id, display_name, username FROM users WHERE id = ?',
      [req.params.id]
    );
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const hash = await bcrypt.hash(newPassword, 12);
    await db.execute('UPDATE users SET password_hash = ? WHERE id = ?', [hash, req.params.id]);

    await logAudit(
      'Password Reset by Admin',
      `"${users[0].display_name}" (${users[0].username}) password was reset by admin`,
      req.user,
      req.ip
    );
    socket.usersChanged();

    res.json({ success: true, message: `Password set for ${users[0].display_name}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── PUT /api/users/:id ───────────────────────────────────
// Update user details (displayName, email)
router.put('/:id', requireAuth, requirePermission('manageUsers'), async (req, res) => {
  try {
    const { displayName, email } = req.body;
    if (!displayName || !email) {
      return res.status(400).json({ error: 'Display name and email are required' });
    }

    // Check if email is already used by another user
    const [existing] = await db.execute(
      'SELECT id FROM users WHERE email = ? AND id != ?',
      [email, req.params.id]
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Email already in use by another user' });
    }

    await db.execute(
      'UPDATE users SET display_name = ?, email = ? WHERE id = ?',
      [displayName, email, req.params.id]
    );

    await logAudit('User Updated', `"${displayName}"`, req.user, req.ip);
    socket.usersChanged();
    
    // Return updated user
    const [users] = await db.execute(
      `SELECT u.id, u.username, u.email, u.display_name, u.status,
              GROUP_CONCAT(sg.name ORDER BY sg.name SEPARATOR ', ') AS group_names
       FROM users u
       LEFT JOIN user_group_memberships ugm ON u.id = ugm.user_id
       LEFT JOIN security_groups sg ON ugm.group_id = sg.id
       WHERE u.id = ?
       GROUP BY u.id`,
      [req.params.id]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = users[0];
    user.groups = user.group_names ? user.group_names.split(', ') : [];
    delete user.group_names;
    
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── PUT /api/users/:id/groups ─────────────────────────────
// Update user's security groups
router.put('/:id/groups', requireAuth, requirePermission('manageUsers'), async (req, res) => {
  try {
    const { groupIds } = req.body;
    
    // Verify user exists
    const [users] = await db.execute(
      'SELECT id, display_name, username FROM users WHERE id = ?',
      [req.params.id]
    );
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Remove existing group memberships
    await db.execute('DELETE FROM user_group_memberships WHERE user_id = ?', [req.params.id]);

    // Add new group memberships
    if (groupIds && Array.isArray(groupIds) && groupIds.length > 0) {
      for (const gid of groupIds) {
        await db.execute(
          'INSERT INTO user_group_memberships (user_id, group_id, assigned_by) VALUES (?, ?, ?)',
          [req.params.id, gid, req.user.id]
        );
      }
    }

    await logAudit('User Groups Updated', `"${users[0].display_name}" (${users[0].username})`, req.user, req.ip);
    socket.usersChanged();
    
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /api/users/:id ─────────────────────────────────────
// Get single user details
router.get('/:id', requireAuth, requirePermission('manageUsers'), async (req, res) => {
  try {
    const [users] = await db.execute(
      `SELECT u.id, u.username, u.email, u.display_name, u.status,
              GROUP_CONCAT(sg.id ORDER BY sg.name SEPARATOR ',') AS group_ids,
              GROUP_CONCAT(sg.name ORDER BY sg.name SEPARATOR ', ') AS group_names
       FROM users u
       LEFT JOIN user_group_memberships ugm ON u.id = ugm.user_id
       LEFT JOIN security_groups sg ON ugm.group_id = sg.id
       WHERE u.id = ?
       GROUP BY u.id`,
      [req.params.id]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = users[0];
    user.groups = user.group_names ? user.group_names.split(', ') : [];
    user.groupIds = user.group_ids ? user.group_ids.split(',') : [];
    delete user.group_names;
    delete user.group_ids;
    
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── DELETE /api/users/:id ──────────────────────────────────
router.delete('/:id', requireAuth, requirePermission('manageUsers'), async (req, res) => {
  try {
    // Prevent self-deletion
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete yourself' });
    }

    const [users] = await db.execute(
      'SELECT id, display_name, username FROM users WHERE id = ?',
      [req.params.id]
    );
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Remove group memberships
    await db.execute('DELETE FROM user_group_memberships WHERE user_id = ?', [req.params.id]);
    
    // Remove subscriptions
    await db.execute('DELETE FROM subscriptions WHERE user_id = ?', [req.params.id]);
    
    // Remove notifications
    await db.execute('DELETE FROM notifications WHERE user_id = ?', [req.params.id]);
    
    // Delete user
    await db.execute('DELETE FROM users WHERE id = ?', [req.params.id]);

    await logAudit('User Deleted', `"${users[0].display_name}" (${users[0].username})`, req.user, req.ip);
    socket.usersChanged();
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
