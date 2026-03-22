// routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { signToken, requireAuth, requirePermission, blacklistToken } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

const router = express.Router();

// Account lockout settings
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;

// ── Password validation ─────────────────────────────────────
function validatePassword(password) {
  const errors = [];
  if (password.length < 8) errors.push('at least 8 characters');
  if (!/[A-Z]/.test(password)) errors.push('one uppercase letter');
  if (!/[a-z]/.test(password)) errors.push('one lowercase letter');
  if (!/[0-9]/.test(password)) errors.push('one number');
  return errors;
}

// ── Check and handle account lockout ────────────────────────
async function checkLockout(email) {
  const [users] = await db.execute(
    'SELECT id, failed_attempts, locked_until FROM users WHERE email = ?',
    [email]
  );
  if (users.length === 0) return { locked: false, user: null };
  
  const user = users[0];
  
  // Check if currently locked
  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    const remaining = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
    return { locked: true, remaining };
  }
  
  return { locked: false, user };
}

// ── Record failed login attempt ────────────────────────────
async function recordFailedAttempt(email, ipAddress) {
  // Record the attempt
  await db.execute(
    'INSERT INTO failed_login_attempts (id, email, ip_address) VALUES (UUID(), ?, ?)',
    [email, ipAddress]
  );
  
  // Increment user's failed attempts counter
  const [result] = await db.execute(
    'UPDATE users SET failed_attempts = failed_attempts + 1 WHERE email = ?',
    [email]
  );
  
  // Check if we should lock the account
  const [users] = await db.execute(
    'SELECT failed_attempts FROM users WHERE email = ?',
    [email]
  );
  
  if (users.length > 0 && users[0].failed_attempts >= MAX_FAILED_ATTEMPTS) {
    const lockoutUntil = new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000);
    await db.execute(
      'UPDATE users SET locked_until = ? WHERE email = ?',
      [lockoutUntil, email]
    );
    return { locked: true, remaining: LOCKOUT_DURATION_MINUTES };
  }
  
  return { locked: false, attemptsRemaining: MAX_FAILED_ATTEMPTS - (users[0]?.failed_attempts || 0) };
}

// ── Clear failed attempts on successful login ───────────────
async function clearFailedAttempts(userId) {
  await db.execute(
    'UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ?',
    [userId]
  );
}

// ── POST /api/auth/login ──────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const ip = req.ip || req.connection.remoteAddress;

    // Check lockout status
    const lockoutStatus = await checkLockout(email);
    if (lockoutStatus.locked) {
      return res.status(401).json({ 
        error: `Account is temporarily locked. Try again in ${lockoutStatus.remaining} minute(s).` 
      });
    }

    const [users] = await db.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    if (users.length === 0) {
      // Record failed attempt even for non-existent users (don't reveal if user exists)
      await recordFailedAttempt(email, ip);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];
    
    // Check if account is inactive
    if (user.status !== 'active') {
      return res.status(401).json({ error: 'Account is inactive' });
    }

    // Verify password
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      const attemptResult = await recordFailedAttempt(email, ip);
      if (attemptResult.locked) {
        return res.status(401).json({ 
          error: `Account locked due to too many failed attempts. Try again in ${attemptResult.remaining} minute(s).` 
        });
      }
      return res.status(401).json({ 
        error: 'Invalid credentials',
        attemptsRemaining: attemptResult.attemptsRemaining
      });
    }

    // Successful login - clear failed attempts
    await clearFailedAttempts(user.id);

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

    // Get custom app IDs the user can view
    const [customApps] = await db.execute(
      `SELECT DISTINCT cap.app_id FROM custom_app_permissions cap
       JOIN user_group_memberships ugm ON cap.group_id = ugm.group_id
       WHERE ugm.user_id = ? AND cap.can_view = 1`,
      [user.id]
    );

    const token = signToken(user);

    await logAudit('User Login', `"${user.display_name}" logged in`, user, req.ip);

    // Set httpOnly cookie
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      path: '/',
    };
    
    res.cookie('dda_token', token, cookieOptions);

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.display_name,
        groups: groups.map(g => g.name),
        permissions: perms.map(p => p.perm_key),
        customAppIds: customApps.map(a => a.app_id),
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /api/auth/logout ──────────────────────────────────
router.post('/logout', async (req, res) => {
  try {
    const header = req.headers.authorization;
    if (header && header.startsWith('Bearer ')) {
      const token = header.split(' ')[1];
      // Decode to get user ID if possible
      const jwt = require('jsonwebtoken');
      try {
        const decoded = jwt.decode(token);
        await blacklistToken(token, decoded?.userId);
      } catch {
        await blacklistToken(token);
      }
    }
    
    // Clear cookie
    res.clearCookie('dda_token', { path: '/' });
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /api/auth/register ───────────────────────────────
// Admin-only: Creates a new user (requires manageUsers permission)
router.post('/register', requireAuth, requirePermission('manageUsers'), async (req, res) => {
  try {
    const { username, email, password, displayName } = req.body;
    if (!username || !email || !password || !displayName) {
      return res.status(400).json({ error: 'All fields required' });
    }

    const passwordErrors = validatePassword(password);
    if (passwordErrors.length > 0) {
      return res.status(400).json({ 
        error: `Password must contain: ${passwordErrors.join(', ')}` 
      });
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
    const [customApps] = await db.execute(
      `SELECT DISTINCT cap.app_id FROM custom_app_permissions cap
       JOIN user_group_memberships ugm ON cap.group_id = ugm.group_id
       WHERE ugm.user_id = ? AND cap.can_view = 1`,
      [id]
    );

    await logAudit('User Created', `"${displayName}" (${username})`, { id, display_name: displayName }, req.ip);

    res.status(201).json({
      user: {
        id,
        username,
        email,
        displayName,
        groups: groups.map(g => g.name),
        permissions: perms.map(p => p.perm_key),
        customAppIds: customApps.map(a => a.app_id),
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
      avatarUrl: req.user.avatar_url,
      groups: req.user.groups,
      permissions: req.user.permissions,
      customAppIds: req.user.customAppIds,
    },
  });
});

// ── PUT /api/auth/change-password ─────────────────────────
// Self-service: logged-in user changes their own password.
// Requires current password for verification.
router.put('/change-password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }
    const passwordErrors = validatePassword(newPassword);
    if (passwordErrors.length > 0) {
      return res.status(400).json({ 
        error: `New password must contain: ${passwordErrors.join(', ')}` 
      });
    }
    if (currentPassword === newPassword) {
      return res.status(400).json({ error: 'New password must be different from current password' });
    }

    // Fetch current hash
    const [users] = await db.execute(
      'SELECT id, password_hash, display_name FROM users WHERE id = ?',
      [req.user.id]
    );
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const valid = await bcrypt.compare(currentPassword, users[0].password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash and save new password
    const hash = await bcrypt.hash(newPassword, 12);
    await db.execute('UPDATE users SET password_hash = ? WHERE id = ?', [hash, req.user.id]);

    await logAudit('Password Changed', `"${users[0].display_name}" changed their password`, req.user, req.ip);

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;