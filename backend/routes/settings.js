// routes/settings.js
// Application settings and logo management
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { requireAuth, requirePermission } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

const router = express.Router();

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

module.exports = router;