// middleware/auth.js
// JWT authentication and permission-checking middleware
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

// ── Generate a JWT for a user ──────────────────────────────
function signToken(user) {
  return jwt.sign(
    { userId: user.id, username: user.username },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
}

// ── Middleware: require a valid JWT ────────────────────────
async function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    // Fetch full user record + groups + permissions
    const [users] = await db.execute(
      'SELECT id, username, email, display_name, status FROM users WHERE id = ? AND status = ?',
      [decoded.userId, 'active']
    );
    if (users.length === 0) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    const user = users[0];

    // Get group names
    const [groups] = await db.execute(
      `SELECT sg.name FROM security_groups sg
       JOIN user_group_memberships ugm ON sg.id = ugm.group_id
       WHERE ugm.user_id = ?
       ORDER BY sg.name`,
      [user.id]
    );
    user.groups = groups.map(g => g.name);

    // Get permission keys
    const [perms] = await db.execute(
      `SELECT DISTINCT p.perm_key FROM permissions p
       JOIN group_permissions gp ON p.id = gp.permission_id
       JOIN user_group_memberships ugm ON gp.group_id = ugm.group_id
       WHERE ugm.user_id = ?`,
      [user.id]
    );
    user.permissions = perms.map(p => p.perm_key);

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// ── Middleware factory: require specific permission(s) ─────
// Usage: router.post('/files', requireAuth, requirePermission('uploadFiles'), handler)
function requirePermission(...keys) {
  return (req, res, next) => {
    if (!req.user || !req.user.permissions) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const missing = keys.filter(k => !req.user.permissions.includes(k));
    if (missing.length > 0) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        required: keys,
        missing,
      });
    }
    next();
  };
}

module.exports = { signToken, requireAuth, requirePermission };
