// middleware/auth.js
// JWT authentication and permission-checking middleware
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('✗ JWT_SECRET environment variable is required');
  process.exit(1);
}

// ── Generate a JWT for a user ──────────────────────────────
function signToken(user) {
  return jwt.sign(
    { userId: user.id, username: user.username },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
}

// ── Check if token is blacklisted ──────────────────────────
async function isTokenBlacklisted(token) {
  const [rows] = await db.execute(
    'SELECT id FROM token_blacklist WHERE token = ? AND expires_at > NOW()',
    [token]
  );
  return rows.length > 0;
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

    // Check if token is blacklisted
    if (await isTokenBlacklisted(token)) {
      return res.status(401).json({ error: 'Token has been invalidated' });
    }

    // Fetch full user record + groups + permissions
    const [users] = await db.execute(
      'SELECT id, username, email, display_name, status, locked_until FROM users WHERE id = ?',
      [decoded.userId]
    );
    if (users.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    const user = users[0];
    
    if (user.status !== 'active') {
      return res.status(401).json({ error: 'Account is inactive' });
    }
    
    // Check if account is locked
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const remaining = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
      return res.status(401).json({ 
        error: `Account is temporarily locked. Try again in ${remaining} minute(s).` 
      });
    }

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

    // Get custom app IDs the user can view
    const [customApps] = await db.execute(
      `SELECT DISTINCT cap.app_id FROM custom_app_permissions cap
       JOIN user_group_memberships ugm ON cap.group_id = ugm.group_id
       WHERE ugm.user_id = ? AND cap.can_view = 1`,
      [user.id]
    );
    user.customAppIds = customApps.map(a => a.app_id);

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

// ── Blacklist a token (for logout) ────────────────────────
async function blacklistToken(token, userId = null) {
  try {
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) return;
    
    const expiresAt = new Date(decoded.exp * 1000);
    await db.execute(
      'INSERT IGNORE INTO token_blacklist (token, user_id, expires_at) VALUES (?, ?, ?)',
      [token, userId, expiresAt]
    );
  } catch (err) {
    // Token might be invalid, just ignore
  }
}

// ── Clean up expired blacklisted tokens ────────────────────
async function cleanupBlacklist() {
  await db.execute('DELETE FROM token_blacklist WHERE expires_at < NOW()');
}

// ── Clean up old failed login attempts────────────────────
async function cleanupFailedAttempts() {
  await db.execute("DELETE FROM failed_login_attempts WHERE attempted_at < DATE_SUB(NOW(), INTERVAL 30 MINUTE)");
}

module.exports = { 
  signToken, 
  requireAuth, 
  requirePermission,
  blacklistToken,
  isTokenBlacklisted,
  cleanupBlacklist,
  cleanupFailedAttempts
};