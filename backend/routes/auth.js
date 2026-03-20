// routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { signToken, requireAuth } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

const router = express.Router();

// ── POST /api/auth/login ──────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const [users] = await db.execute(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );
    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];
    if (user.status !== 'active') {
      return res.status(401).json({ error: 'Account is inactive' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    await db.execute('UPDATE users SET last_login_at = NOW() WHERE id = ?', [user.id]);

    // Get groups
    const [groups] = await db.execute(
      `SELECT sg.name FROM security_groups sg
       JOIN user_group_memberships ugm ON sg.id = ugm.group_id
       WHERE ugm.user_id = ?`,
      [user.id]
    );

    // Get permissions
    const [perms] = await db.execute(
      `SELECT DISTINCT p.perm_key FROM permissions p
       JOIN group_permissions gp ON p.id = gp.permission_id
       JOIN user_group_memberships ugm ON gp.group_id = ugm.group_id
       WHERE ugm.user_id = ?`,
      [user.id]
    );

    const token = signToken(user);

    await logAudit('User Login', `"${user.display_name}" logged in`, user, req.ip);

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.display_name,
        groups: groups.map(g => g.name),
        permissions: perms.map(p => p.perm_key),
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /api/auth/register ───────────────────────────────
// Creates a new user (admin-only in production, open for initial setup)
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, displayName } = req.body;
    if (!username || !email || !password || !displayName) {
      return res.status(400).json({ error: 'All fields required' });
    }

    // Check for existing user
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

    // Assign to "User" group by default
    const [userGroup] = await db.execute(
      "SELECT id FROM security_groups WHERE name = 'User'"
    );
    if (userGroup.length > 0) {
      await db.execute(
        'INSERT INTO user_group_memberships (user_id, group_id) VALUES (?, ?)',
        [id, userGroup[0].id]
      );
    }

    const token = signToken({ id, username });

    const [groups] = await db.execute(
      `SELECT sg.name FROM security_groups sg
       JOIN user_group_memberships ugm ON sg.id = ugm.group_id
       WHERE ugm.user_id = ?`,
      [id]
    );
    const [perms] = await db.execute(
      `SELECT DISTINCT p.perm_key FROM permissions p
       JOIN group_permissions gp ON p.id = gp.permission_id
       JOIN user_group_memberships ugm ON gp.group_id = ugm.group_id
       WHERE ugm.user_id = ?`,
      [id]
    );

    await logAudit('User Created', `"${displayName}" (${username})`, { id, display_name: displayName }, req.ip);

    res.status(201).json({
      token,
      user: {
        id,
        username,
        email,
        displayName,
        groups: groups.map(g => g.name),
        permissions: perms.map(p => p.perm_key),
      },
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /api/auth/me ──────────────────────────────────────
router.get('/me', requireAuth, (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      username: req.user.username,
      email: req.user.email,
      displayName: req.user.display_name,
      groups: req.user.groups,
      permissions: req.user.permissions,
    },
  });
});

module.exports = router;
