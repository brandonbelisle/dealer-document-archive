// routes/settings.js
// Application settings and logo management
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { requireAuth, requirePermission } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');
const db = require('../config/db');

const router = express.Router();

function parseCertificate(filePath) {
  try {
    const certData = fs.readFileSync(filePath);
    const cert = new crypto.X509Certificate(certData);
    
    let issuerStr = '';
    let subjectStr = '';
    
    try { issuerStr = cert.issuer || ''; } catch {}
    try { subjectStr = cert.subject || ''; } catch {}
    
    const parseDN = (dn) => {
      if (!dn) return 'Unknown';
      const parts = dn.split('\n').filter(p => p.trim());
      const cn = parts.find(p => p.toUpperCase().startsWith('CN='));
      if (cn) return cn.substring(3).trim();
      const o = parts.find(p => p.toUpperCase().startsWith('O='));
      if (o) return o.substring(2).trim();
      return dn.substring(0, 50);
    };
    
    let validFrom = null;
    let validTo = null;
    let serialNumber = null;
    
    try { validFrom = new Date(cert.validFrom); } catch {}
    try { validTo = new Date(cert.validTo); } catch {}
    try { serialNumber = cert.serialNumber; } catch {}
    
    let fingerprint = null;
    try {
      const hash = crypto.createHash('sha256');
      hash.update(certData);
      fingerprint = hash.digest('hex').toUpperCase().match(/.{1,2}/g).join(':');
    } catch {}
    
    return {
      issuer: parseDN(issuerStr),
      subject: parseDN(subjectStr),
      validFrom: isNaN(validFrom?.getTime()) ? null : validFrom,
      validTo: isNaN(validTo?.getTime()) ? null : validTo,
      serialNumber: serialNumber,
      fingerprint: fingerprint
    };
  } catch (err) {
    console.error('Failed to parse certificate:', err.message);
    return null;
  }
}

// Configure multer for logo uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/logos');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!['.png', '.jpg', '.jpeg', '.svg', '.webp'].includes(ext)) {
      return cb(new Error('Invalid file type. Only PNG, JPG, JPEG, SVG, and WEBP are allowed.'));
    }
    const name = req.params.type === 'dark' ? 'darklogo' : 'lightlogo';
    cb(null, `${name}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Configure multer for certificate uploads
const certStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/certificates');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});

const certUpload = multer({
  storage: certStorage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

const certKeyUpload = multer({
  storage: certStorage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
}).fields([
  { name: 'certificate', maxCount: 1 },
  { name: 'privateKey', maxCount: 1 }
]);

// ── GET /api/settings/logo/:type ─────────────────────────
// Serve logo file
router.get('/logo/:type', async (req, res) => {
  try {
    const type = req.params.type;
    if (!['dark', 'light'].includes(type)) {
      return res.status(400).json({ error: 'Invalid logo type' });
    }

    const dir = path.join(__dirname, '../uploads/logos');
    const files = fs.readdirSync(dir).filter(f => f.startsWith(type === 'dark' ? 'darklogo' : 'lightlogo'));
    
    if (files.length === 0) {
      return res.status(404).json({ error: 'Logo not found' });
    }

    const filePath = path.join(dir, files[0]);
    res.sendFile(filePath);
  } catch (err) {
    if (err.code === 'ENOENT') {
      return res.status(404).json({ error: 'Logo not found' });
    }
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /api/settings/logos ──────────────────────────────
// Get info about current logos
router.get('/logos', requireAuth, requirePermission('manageSettings'), async (req, res) => {
  try {
    const dir = path.join(__dirname, '../uploads/logos');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const files = fs.readdirSync(dir);
    const darkLogo = files.find(f => f.startsWith('darklogo'));
    const lightLogo = files.find(f => f.startsWith('lightlogo'));

    res.json({
      darkLogo: darkLogo ? `/api/settings/logo/dark` : null,
      lightLogo: lightLogo ? `/api/settings/logo/light` : null
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /api/settings/logo/:type ────────────────────────
// Upload new logo
router.post('/logo/:type', requireAuth, requirePermission('manageSettings'), (req, res) => {
  const type = req.params.type;
  if (!['dark', 'light'].includes(type)) {
    return res.status(400).json({ error: 'Invalid logo type' });
  }

  upload.single('logo')(req, res, (err) => {
    if (err) {
      if (err.message.includes('Invalid file type')) {
        return res.status(400).json({ error: err.message });
      }
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
      }
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    logAudit(
      'Logo Updated',
      `${type === 'dark' ? 'Dark' : 'Light'} mode logo updated`,
      req.user,
      req.ip
    );

    res.json({
      success: true,
      path: `/api/settings/logo/${type}`
    });
  });
});

// ── GET /api/settings/ssl ────────────────────────────────
// Get SSL certificate settings
router.get('/ssl', requireAuth, requirePermission('manageSettings'), async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT id, name, filename, key_filename, passphrase, is_active, issuer, subject, valid_from, valid_to, serial_number, fingerprint, uploaded_at FROM ssl_certificates ORDER BY uploaded_at DESC'
    );
    
    const dir = path.join(__dirname, '../uploads/certificates');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const certificates = rows.map(row => ({
      id: row.id,
      name: row.name,
      filename: row.filename,
      keyFilename: row.key_filename,
      hasPassphrase: !!row.passphrase,
      isActive: !!row.is_active,
      issuer: row.issuer,
      subject: row.subject,
      validFrom: row.valid_from,
      validTo: row.valid_to,
      serialNumber: row.serial_number,
      fingerprint: row.fingerprint,
      uploadedAt: row.uploaded_at,
      hasKey: !!(row.key_filename && fs.existsSync(path.join(dir, row.key_filename)))
    }));

    res.json({ certificates });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /api/settings/ssl/upload ─────────────────────────
// Upload SSL certificate and optional private key
router.post('/ssl/upload', requireAuth, requirePermission('manageSettings'), (req, res) => {
  certKeyUpload(req, res, async (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
      }
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }

    const certFile = req.files?.certificate?.[0];
    const keyFile = req.files?.privateKey?.[0];

    if (!certFile) {
      return res.status(400).json({ error: 'Certificate file is required' });
    }

    try {
      const { name, passphrase } = req.body;
      const certName = name || path.basename(certFile.originalname, path.extname(certFile.originalname));
      
      const certInfo = parseCertificate(certFile.path);
      const keyFilename = keyFile ? keyFile.filename : null;
      const passphraseValue = passphrase ? passphrase : null;
      
      const [result] = await db.execute(
        `INSERT INTO ssl_certificates 
         (name, filename, key_filename, passphrase, is_active, issuer, subject, valid_from, valid_to, serial_number, fingerprint, uploaded_at) 
         VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          certName,
          certFile.filename,
          keyFilename,
          passphraseValue,
          certInfo?.issuer || null,
          certInfo?.subject || null,
          certInfo?.validFrom || null,
          certInfo?.validTo || null,
          certInfo?.serialNumber || null,
          certInfo?.fingerprint || null
        ]
      );

      logAudit(
        'SSL Certificate Uploaded',
        `Certificate "${certName}" uploaded${keyFilename ? ' with private key' : ''}`,
        req.user,
        req.ip
      );

      res.json({
        success: true,
        id: result.insertId,
        name: certName,
        filename: certFile.filename,
        keyFilename: keyFilename,
        issuer: certInfo?.issuer,
        subject: certInfo?.subject,
        validFrom: certInfo?.validFrom,
        validTo: certInfo?.validTo,
        hasKey: !!keyFilename,
        hasPassphrase: !!passphraseValue
      });
    } catch (dbErr) {
      console.error(dbErr);
      if (certFile) fs.unlinkSync(certFile.path);
      if (keyFile) fs.unlinkSync(keyFile.path);
      res.status(500).json({ error: 'Failed to save certificate info' });
    }
  });
});

// ── DELETE /api/settings/ssl/:id ──────────────────────────
// Delete SSL certificate
router.delete('/ssl/:id', requireAuth, requirePermission('manageSettings'), async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT id, name, filename, key_filename FROM ssl_certificates WHERE id = ?',
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Certificate not found' });
    }

    const cert = rows[0];
    const certPath = path.join(__dirname, '../uploads/certificates', cert.filename);
    const keyPath = cert.key_filename ? path.join(__dirname, '../uploads/certificates', cert.key_filename) : null;
    
    if (fs.existsSync(certPath)) {
      fs.unlinkSync(certPath);
    }
    if (keyPath && fs.existsSync(keyPath)) {
      fs.unlinkSync(keyPath);
    }

    await db.execute('DELETE FROM ssl_certificates WHERE id = ?', [req.params.id]);

    logAudit(
      'SSL Certificate Deleted',
      `Certificate "${cert.name}" deleted`,
      req.user,
      req.ip
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /api/settings/ssl/:id/activate ──────────────────
// Activate SSL certificate (deactivates others)
router.post('/ssl/:id/activate', requireAuth, requirePermission('manageSettings'), async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT id, name, filename, key_filename, issuer, subject, valid_from, valid_to, serial_number, fingerprint FROM ssl_certificates WHERE id = ?',
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Certificate not found' });
    }

    const cert = rows[0];
    const keyPath = cert.key_filename ? path.join(__dirname, '../uploads/certificates', cert.key_filename) : null;
    const hasKey = !!(cert.key_filename && fs.existsSync(keyPath));

    if (!hasKey) {
      return res.status(400).json({ error: 'Cannot activate certificate without a private key file' });
    }
    
    await db.execute('UPDATE ssl_certificates SET is_active = 0');
    await db.execute('UPDATE ssl_certificates SET is_active = 1 WHERE id = ?', [req.params.id]);

    logAudit(
      'SSL Certificate Activated',
      `Certificate "${cert.name}" activated for use`,
      req.user,
      req.ip
    );

    res.json({
      success: true,
      requiresRestart: true,
      certificate: {
        id: cert.id,
        name: cert.name,
        filename: cert.filename,
        keyFilename: cert.key_filename,
        isActive: true,
        issuer: cert.issuer,
        subject: cert.subject,
        validFrom: cert.valid_from,
        validTo: cert.valid_to,
        serialNumber: cert.serial_number,
        fingerprint: cert.fingerprint
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /api/settings/ssl/deactivate ────────────────────
// Deactivate all SSL certificates (use self-signed)
router.post('/ssl/deactivate', requireAuth, requirePermission('manageSettings'), async (req, res) => {
  try {
    await db.execute('UPDATE ssl_certificates SET is_active = 0');

    logAudit(
      'SSL Certificate Deactivated',
      'All certificates deactivated, reverting to self-signed',
      req.user,
      req.ip
    );

    res.json({ success: true, requiresRestart: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /api/settings/ssl/active ──────────────────────────
// Get active SSL certificate (public, for server startup)
router.get('/ssl/active', async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT name, filename, key_filename FROM ssl_certificates WHERE is_active = 1 LIMIT 1'
    );

    if (rows.length === 0) {
      return res.json({ active: null });
    }

    const cert = rows[0];
    const certPath = path.join(__dirname, '../uploads/certificates', cert.filename);
    const keyPath = cert.key_filename ? path.join(__dirname, '../uploads/certificates', cert.key_filename) : null;

    if (!fs.existsSync(certPath) || !keyPath || !fs.existsSync(keyPath)) {
      return res.json({ active: null });
    }

    res.json({
      active: {
        name: cert.name,
        certPath: certPath,
        keyPath: keyPath
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;