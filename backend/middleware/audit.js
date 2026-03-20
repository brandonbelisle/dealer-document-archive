// middleware/audit.js
// Audit log helper — writes to audit_log table
const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

async function logAudit(action, detail, user, ip = null) {
  try {
    const id = uuidv4();
    const userId = user?.id || null;
    const userName = user?.display_name || user?.username || 'System';
    await db.execute(
      'INSERT INTO audit_log (id, action, detail, user_id, user_name, ip_address) VALUES (?, ?, ?, ?, ?, ?)',
      [id, action, detail, userId, userName, ip]
    );
    return id;
  } catch (err) {
    console.error('Audit log failed:', err.message);
    return null;
  }
}

module.exports = { logAudit };
