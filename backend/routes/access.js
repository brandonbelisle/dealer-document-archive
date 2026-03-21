// routes/access.js
// Manages group-based access control for locations and departments.
// Allows admins to lock locations/departments to specific security groups.
const express = require('express');
const db = require('../config/db');
const { requireAuth, requirePermission } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

const router = express.Router();

// ── GET /api/access/locations ─────────────────────────────
// Returns all location → group assignments
router.get('/locations', requireAuth, async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT lga.location_id, lga.group_id, sg.name AS group_name
       FROM location_group_access lga
       JOIN security_groups sg ON lga.group_id = sg.id
       ORDER BY lga.location_id, sg.name`
    );
    // Group by location_id
    const byLocation = {};
    for (const row of rows) {
      if (!byLocation[row.location_id]) byLocation[row.location_id] = [];
      byLocation[row.location_id].push({ groupId: row.group_id, groupName: row.group_name });
    }
    res.json(byLocation);
  } catch (err) {
    console.error('Access locations error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── PUT /api/access/locations/:locationId ─────────────────
// Replace all group assignments for a location
// Body: { groupIds: ["id1", "id2", ...] }
// Empty array = open access (no restrictions)
router.put('/locations/:locationId', requireAuth, requirePermission('manageLocations'), async (req, res) => {
  try {
    const { locationId } = req.params;
    const { groupIds } = req.body;

    if (!Array.isArray(groupIds)) {
      return res.status(400).json({ error: 'groupIds array required' });
    }

    // Verify location exists
    const [loc] = await db.execute('SELECT name FROM locations WHERE id = ?', [locationId]);
    if (loc.length === 0) return res.status(404).json({ error: 'Location not found' });

    // Delete existing assignments
    await db.execute('DELETE FROM location_group_access WHERE location_id = ?', [locationId]);

    // Insert new assignments
    if (groupIds.length > 0) {
      const values = groupIds.map(() => '(UUID(), ?, ?, ?)').join(', ');
      const params = groupIds.flatMap(gid => [locationId, gid, req.user.id]);
      await db.execute(
        `INSERT INTO location_group_access (id, location_id, group_id, assigned_by) VALUES ${values}`,
        params
      );
    }

    // Fetch group names for audit log
    let groupNames = 'All Groups (unrestricted)';
    if (groupIds.length > 0) {
      const [groups] = await db.execute(
        `SELECT name FROM security_groups WHERE id IN (${groupIds.map(() => '?').join(',')})`,
        groupIds
      );
      groupNames = groups.map(g => g.name).join(', ');
    }

    await logAudit(
      'Location Access Updated',
      `"${loc[0].name}" → ${groupIds.length === 0 ? 'Open (all groups)' : groupNames}`,
      req.user,
      req.ip
    );

    res.json({ success: true, groupIds });
  } catch (err) {
    console.error('Update location access error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /api/access/departments ───────────────────────────
// Returns all department → group assignments
router.get('/departments', requireAuth, async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT dga.department_id, dga.group_id, sg.name AS group_name
       FROM department_group_access dga
       JOIN security_groups sg ON dga.group_id = sg.id
       ORDER BY dga.department_id, sg.name`
    );
    const byDepartment = {};
    for (const row of rows) {
      if (!byDepartment[row.department_id]) byDepartment[row.department_id] = [];
      byDepartment[row.department_id].push({ groupId: row.group_id, groupName: row.group_name });
    }
    res.json(byDepartment);
  } catch (err) {
    console.error('Access departments error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── PUT /api/access/departments/:departmentId ─────────────
// Replace all group assignments for a department
// Body: { groupIds: ["id1", "id2", ...] }
router.put('/departments/:departmentId', requireAuth, requirePermission('manageDepartments'), async (req, res) => {
  try {
    const { departmentId } = req.params;
    const { groupIds } = req.body;

    if (!Array.isArray(groupIds)) {
      return res.status(400).json({ error: 'groupIds array required' });
    }

    // Verify department exists
    const [dept] = await db.execute(
      'SELECT d.name, l.name AS loc_name FROM departments d JOIN locations l ON d.location_id = l.id WHERE d.id = ?',
      [departmentId]
    );
    if (dept.length === 0) return res.status(404).json({ error: 'Department not found' });

    // Delete existing assignments
    await db.execute('DELETE FROM department_group_access WHERE department_id = ?', [departmentId]);

    // Insert new assignments
    if (groupIds.length > 0) {
      const values = groupIds.map(() => '(UUID(), ?, ?, ?)').join(', ');
      const params = groupIds.flatMap(gid => [departmentId, gid, req.user.id]);
      await db.execute(
        `INSERT INTO department_group_access (id, department_id, group_id, assigned_by) VALUES ${values}`,
        params
      );
    }

    let groupNames = 'All Groups (unrestricted)';
    if (groupIds.length > 0) {
      const [groups] = await db.execute(
        `SELECT name FROM security_groups WHERE id IN (${groupIds.map(() => '?').join(',')})`,
        groupIds
      );
      groupNames = groups.map(g => g.name).join(', ');
    }

    await logAudit(
      'Department Access Updated',
      `"${dept[0].name}" (${dept[0].loc_name}) → ${groupIds.length === 0 ? 'Open (all groups)' : groupNames}`,
      req.user,
      req.ip
    );

    res.json({ success: true, groupIds });
  } catch (err) {
    console.error('Update department access error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
