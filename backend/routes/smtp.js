// routes/smtp.js
// SMTP settings and email sending
const express = require('express');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const db = require('../config/db');
const { requireAuth, requirePermission } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

const router = express.Router();

// Encryption key from environment
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-encryption-key-32-chars!!';
const ALGORITHM = 'aes-256-cbc';

// Encrypt password
function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

// Decrypt password
function decrypt(encrypted) {
  if (!encrypted || !encrypted.includes(':')) return '';
  try {
    const [ivHex, data] = encrypted.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return '';
  }
}

// ── GET /api/smtp/settings ───────────────────────────────────
// Get SMTP settings (password is masked)
router.get('/settings', requireAuth, requirePermission('manageSettings'), async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM smtp_settings WHERE id = 1');
    if (rows.length === 0) {
      return res.json({
        host: '',
        port: 587,
        secure: false,
        username: '',
        password: '',
        from_email: '',
        from_name: '',
      });
    }
    const row = rows[0];
    res.json({
      host: row.host || '',
      port: row.port || 587,
      secure: row.secure || false,
      username: row.username || '',
      password: row.password_encrypted ? '••••••••' : '',
      from_email: row.from_email || '',
      from_name: row.from_name || '',
    });
  } catch (err) {
    console.error('Failed to get SMTP settings:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /api/smtp/settings ──────────────────────────────────
// Save SMTP settings
router.post('/settings', requireAuth, requirePermission('manageSettings'), async (req, res) => {
  try {
    const { host, port, secure, username, password, from_email, from_name } = req.body;
    
    // Validate required fields
    if (!host || !port) {
      return res.status(400).json({ error: 'Host and port are required' });
    }

    // Get current settings to check if password changed
    const [rows] = await db.execute('SELECT password_encrypted FROM smtp_settings WHERE id = 1');
    let passwordEncrypted = '';
    
    if (password === '••••••••' || password === '') {
      // Keep existing password
      passwordEncrypted = rows.length > 0 ? rows[0].password_encrypted : '';
    } else {
      // Encrypt new password
      passwordEncrypted = encrypt(password);
    }

    await db.execute(`
      INSERT INTO smtp_settings (id, host, port, secure, username, password_encrypted, from_email, from_name)
      VALUES (1, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        host = VALUES(host),
        port = VALUES(port),
        secure = VALUES(secure),
        username = VALUES(username),
        password_encrypted = VALUES(password_encrypted),
        from_email = VALUES(from_email),
        from_name = VALUES(from_name)
    `, [host, port, secure ? 1 : 0, username || '', passwordEncrypted, from_email || '', from_name || '']);

    logAudit('SMTP Settings Updated', 'SMTP server settings were updated', req.user, req.ip);

    res.json({ success: true });
  } catch (err) {
    console.error('Failed to save SMTP settings:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /api/smtp/test ──────────────────────────────────────
// Send test email
router.post('/test', requireAuth, requirePermission('manageSettings'), async (req, res) => {
  try {
    const { to_email } = req.body;
    if (!to_email) {
      return res.status(400).json({ error: 'Test email address is required' });
    }

    // Get SMTP settings
    const [rows] = await db.execute('SELECT * FROM smtp_settings WHERE id = 1');
    if (rows.length === 0 || !rows[0].host) {
      return res.status(400).json({ error: 'SMTP settings not configured' });
    }

    const settings = rows[0];
    const password = decrypt(settings.password_encrypted);

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: settings.host,
      port: settings.port,
      secure: settings.secure,
      auth: settings.username ? {
        user: settings.username,
        pass: password,
      } : undefined,
    });

    // Verify connection
    try {
      await transporter.verify();
    } catch (verifyErr) {
      return res.status(400).json({ 
        error: `Failed to connect to SMTP server: ${verifyErr.message}` 
      });
    }

    // Send test email
    const fromAddress = settings.from_email || settings.username;
    const fromName = settings.from_name || 'Dealer Document Archive';

    await transporter.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to: to_email,
      subject: 'Test Email from Dealer Document Archive',
      text: 'This is a test email from Dealer Document Archive. If you received this, your SMTP settings are working correctly.',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px;">
          <h2 style="color: #0891b2;">Test Email Successful</h2>
          <p>This is a test email from <strong>Dealer Document Archive</strong>.</p>
          <p>If you received this email, your SMTP settings are working correctly.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
          <p style="color: #6b7280; font-size: 12px;">This is an automated test message.</p>
        </div>
      `,
    });

    logAudit('SMTP Test Email Sent', `Test email sent to ${to_email}`, req.user, req.ip);

    res.json({ success: true, message: 'Test email sent successfully' });
  } catch (err) {
    console.error('Failed to send test email:', err);
    res.status(500).json({ error: `Failed to send test email: ${err.message}` });
  }
});

// ── POST /api/smtp/send ──────────────────────────────────────
// Send email (for use by other parts of the app)
async function sendEmail({ to, subject, text, html }) {
  try {
    const [rows] = await db.execute('SELECT * FROM smtp_settings WHERE id = 1');
    if (rows.length === 0 || !rows[0].host) {
      console.error('SMTP not configured');
      return { success: false, error: 'SMTP not configured' };
    }

    const settings = rows[0];
    const password = decrypt(settings.password_encrypted);

    const transporter = nodemailer.createTransport({
      host: settings.host,
      port: settings.port,
      secure: settings.secure,
      auth: settings.username ? {
        user: settings.username,
        pass: password,
      } : undefined,
    });

    const fromAddress = settings.from_email || settings.username;
    const fromName = settings.from_name || 'Dealer Document Archive';

    // Get email settings (signature and brand color)
    let emailSignature = '';
    let brandColor = '#0891b2';
    try {
      const [settingsRows] = await db.execute('SELECT `key`, `value` FROM app_settings WHERE `key` IN ("email_signature", "email_brand_color")');
      for (const row of settingsRows) {
        if (row.key === 'email_signature') emailSignature = row.value || '';
        if (row.key === 'email_brand_color') brandColor = row.value || '#0891b2';
      }
    } catch (e) {
      // Ignore if settings don't exist
    }

    // Append signature to html if provided
    let finalHtml = html || '';
    let finalText = text || '';
    
    if (emailSignature) {
      finalText += '\n\n' + emailSignature;
      finalHtml += `<div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 13px; white-space: pre-wrap;">${emailSignature.replace(/\n/g, '<br>')}</div>`;
    }

    await transporter.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to,
      subject,
      text: finalText,
      html: finalHtml,
    });

    return { success: true };
  } catch (err) {
    console.error('Failed to send email:', err);
    return { success: false, error: err.message };
  }
}

async function getEmailBranding() {
  try {
    const [settingsRows] = await db.execute('SELECT `key`, `value` FROM app_settings WHERE `key` IN ("email_signature", "email_brand_color")');
    let emailSignature = '';
    let brandColor = '#0891b2';
    for (const row of settingsRows) {
      if (row.key === 'email_signature') emailSignature = row.value || '';
      if (row.key === 'email_brand_color') brandColor = row.value || '#0891b2';
    }
    return { signature: emailSignature, brandColor };
  } catch (e) {
    return { signature: '', brandColor: '#0891b2' };
  }
}

module.exports = { router, sendEmail, getEmailBranding };