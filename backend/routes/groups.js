// routes/groups.js
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { requireAuth, requirePermission } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

const router = express.Router();

// ── GET /api/groups ───────────────────────────────────────
// Returns all groups with their permission details
router.get('/', requireAuth, async (req, res) => {
  try {
    const [groups] = await db.execute(
      'SELECT id, name, description, created_at, updated_at FROM security_groups ORDER BY name'
    );

    // For each group, fetch its permissions as a { key: true/false } map
    const [allPerms] = await db.execute('SELECT id, perm_key FROM permissions ORDER BY sort_order');

    for (const group of groups) {
      const [granted] = await db.execute(
        'SELECT p.perm_key FROM group_permissions gp JOIN permissions p ON gp.permission_id = p.id WHERE gp.group_id = ?',
        [group.id]
      );
      const grantedSet = new Set(granted.map(g => g.perm_key));
      group.permissions = {};
      for (const perm of allPerms) {
        group.permissions[perm.perm_key] = grantedSet.has(perm.perm_key);
      }

      // Member count
      const [mc] = await db.execute(
        'SELECT COUNT(*) AS cnt FROM user_group_memberships WHERE group_id = ?',
        [group.id]
      );
      group.memberCount = Number(mc[0].cnt || 0);
    }

    res.json({ groups, totalPermissionCount: allPerms.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /api/groups/permissions ────────────────────────────
// Returns all available permissions with their metadata
router.get('/permissions', requireAuth, async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT perm_key, label, category, description, sort_order FROM permissions ORDER BY sort_order'
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /api/groups ──────────────────────────────────────
router.post('/', requireAuth, requirePermission('manageGroups'), async (req, res) => {
  try {
    const { name, description, permissions } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Name required' });

    const id = uuidv4();
    await db.execute(
      'INSERT INTO security_groups (id, name, description) VALUES (?, ?, ?)',
      [id, name.trim(), description?.trim() || null]
    );

    // Grant permissions if provided
    if (permissions && typeof permissions === 'object') {
      const enabledKeys = Object.entries(permissions).filter(([, v]) => v).map(([k]) => k);
      if (enabledKeys.length > 0) {
        const csv = enabledKeys.join(',');
        await db.execute(
          `INSERT INTO group_permissions (group_id, permission_id, granted_by)
           SELECT ?, p.id, ? FROM permissions p WHERE FIND_IN_SET(p.perm_key, ?) > 0`,
          [id, req.user.id, csv]
        );
      }
    }

    await logAudit('Group Created', `"${name.trim()}"`, req.user, req.ip);

    // Return the full group with permissions
    const [groups] = await db.execute('SELECT * FROM security_groups WHERE id = ?', [id]);
    const group = groups[0];
    const [allPerms] = await db.execute('SELECT perm_key FROM permissions ORDER BY sort_order');
    const [granted] = await db.execute(
      'SELECT p.perm_key FROM group_permissions gp JOIN permissions p ON gp.permission_id = p.id WHERE gp.group_id = ?',
      [id]
    );
    const grantedSet = new Set(granted.map(g => g.perm_key));
    group.permissions = {};
    for (const p of allPerms) group.permissions[p.perm_key] = grantedSet.has(p.perm_key);
    group.memberCount = 0;

    res.status(201).json(group);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── PUT /api/groups/:id ───────────────────────────────────
// Updates group name/description
router.put('/:id', requireAuth, requirePermission('manageGroups'), async (req, res) => {
  try {
    const { name, description } = req.body;
    const [existing] = await db.execute('SELECT name FROM security_groups WHERE id = ?', [req.params.id]);
    if (existing.length === 0) return res.status(404).json({ error: 'Not found' });

    const updates = [];
    const params = [];
    if (name?.trim()) { updates.push('name = ?'); params.push(name.trim()); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description?.trim() || null); }

    if (updates.length > 0) {
      params.push(req.params.id);
      await db.execute(`UPDATE security_groups SET ${updates.join(', ')} WHERE id = ?`, params);
      await logAudit('Group Updated', `"${existing[0].name}" → "${name?.trim() || existing[0].name}"`, req.user, req.ip);
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── PUT /api/groups/:id/permissions ───────────────────────
// Replaces all permissions for a group
// Body: { permissions: { viewFiles: true, uploadFiles: false, ... } }
router.put('/:id/permissions', requireAuth, requirePermission('manageGroups'), async (req, res) => {
  try {
    const { permissions } = req.body;
    if (!permissions || typeof permissions !== 'object') {
      return res.status(400).json({ error: 'permissions object required' });
    }

    const [existing] = await db.execute('SELECT name FROM security_groups WHERE id = ?', [req.params.id]);
    if (existing.length === 0) return res.status(404).json({ error: 'Not found' });

    const enabledKeys = Object.entries(permissions).filter(([, v]) => v).map(([k]) => k);

    // Delete all existing
    await db.execute('DELETE FROM group_permissions WHERE group_id = ?', [req.params.id]);

    // Insert enabled ones
    if (enabledKeys.length > 0) {
      const csv = enabledKeys.join(',');
      await db.execute(
        `INSERT INTO group_permissions (group_id, permission_id, granted_by)
         SELECT ?, p.id, ? FROM permissions p WHERE FIND_IN_SET(p.perm_key, ?) > 0`,
        [req.params.id, req.user.id, csv]
      );
    }

    await logAudit(
      'Group Permissions Updated',
      `"${existing[0].name}" — ${enabledKeys.length} permission(s) enabled`,
      req.user,
      req.ip
    );

    res.json({ success: true, enabled: enabledKeys.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── DELETE /api/groups/:id ────────────────────────────────
router.delete('/:id', requireAuth, requirePermission('manageGroups'), async (req, res) => {
  try {
    const [existing] = await db.execute('SELECT name FROM security_groups WHERE id = ?', [req.params.id]);
    if (existing.length === 0) return res.status(404).json({ error: 'Not found' });

    await db.execute('DELETE FROM security_groups WHERE id = ?', [req.params.id]);
    await logAudit('Group Deleted', `"${existing[0].name}"`, req.user, req.ip);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
