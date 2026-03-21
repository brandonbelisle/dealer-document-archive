const express = require('express');
const multer = require('multer');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const db = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

const router = express.Router();

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-encryption-key-32-chars!!';
const ALGORITHM = 'aes-256-cbc';

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

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

router.get('/support-email', requireAuth, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT value FROM app_settings WHERE `key` = "support_email"');
    res.json({ email: rows.length > 0 ? rows[0].value : '' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/support-email', requireAuth, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email?.trim()) {
      return res.status(400).json({ error: 'Email is required' });
    }
    await db.execute(
      'INSERT INTO app_settings (`key`, `value`) VALUES ("support_email", ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)',
      [email.trim()]
    );
    logAudit('Support Email Updated', email.trim(), req.user, req.ip);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/submit', requireAuth, upload.array('attachments', 5), async (req, res) => {
  try {
    const { subject, message } = req.body;
    const files = req.files || [];

    if (!subject?.trim()) {
      return res.status(400).json({ error: 'Subject is required' });
    }
    if (!message?.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const [supportRows] = await db.execute('SELECT value FROM app_settings WHERE `key` = "support_email"');
    if (supportRows.length === 0 || !supportRows[0].value) {
      return res.status(400).json({ error: 'Support email not configured. Please contact an administrator.' });
    }
    const supportEmail = supportRows[0].value;

    const [smtpRows] = await db.execute('SELECT * FROM smtp_settings WHERE id = 1');
    if (smtpRows.length === 0 || !smtpRows[0].host) {
      return res.status(400).json({ error: 'SMTP not configured. Please contact an administrator.' });
    }

    const smtp = smtpRows[0];
    const password = decrypt(smtp.password_encrypted);

    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: smtp.username ? { user: smtp.username, pass: password } : undefined,
    });

    const fromAddress = smtp.from_email || smtp.username;
    const fromName = smtp.from_name || 'Dealer Document Archive';

    const userDisplayName = req.user.display_name || req.user.username || 'Unknown User';
    const userEmail = req.user.email;

    const attachments = files.map(file => ({
      filename: file.originalname,
      content: file.buffer,
      contentType: file.mimetype,
    }));

    const emailSubject = `[Help Ticket] ${subject.trim()}`;

    const textBody = `Help Ticket Submission\n\nFrom: ${userDisplayName} <${userEmail}>\nSubject: ${subject.trim()}\n\nMessage:\n${message.trim()}\n\n---\nSubmitted via Dealer Document Archive`;

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px;">
        <h2 style="color: #0891b2; margin-bottom: 20px;">Help Ticket Submission</h2>
        <p><strong>From:</strong> ${userDisplayName} &lt;${userEmail}&gt;</p>
        <p><strong>Subject:</strong> ${subject.trim()}</p>
        <h3 style="color: #374151; margin-top: 20px;">Message:</h3>
        <div style="background: #f9fafb; padding: 16px; border-radius: 8px; white-space: pre-wrap;">${message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
        ${files.length > 0 ? `<p style="color: #6b7280; margin-top: 16px;"><strong>Attachments:</strong> ${files.length} file(s)</p>` : ''}
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
        <p style="color: #9ca3af; font-size: 12px;">Submitted via Dealer Document Archive</p>
      </div>
    `;

    await transporter.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to: supportEmail,
      replyTo: userEmail,
      subject: emailSubject,
      text: textBody,
      html: htmlBody,
      attachments,
    });

    logAudit('Help Ticket Submitted', `Subject: "${subject.trim()}"`, req.user, req.ip);

    res.json({ success: true, message: 'Help ticket submitted successfully' });
  } catch (err) {
    console.error('Failed to submit help ticket:', err);
    res.status(500).json({ error: `Failed to submit help ticket: ${err.message}` });
  }
});

module.exports = router;