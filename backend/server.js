// server.js
// Dealer Document Archive — Express API Server
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ─────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Initialize Azure Blob Storage container
const { ensureContainer } = require('./config/azure-storage');
ensureContainer();

// ── API Routes ────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/locations', require('./routes/locations'));
app.use('/api/departments', require('./routes/departments'));
app.use('/api/folders', require('./routes/folders'));
app.use('/api/files', require('./routes/files'));
app.use('/api/groups', require('./routes/groups'));
app.use('/api/users', require('./routes/users'));
app.use('/api/audit', require('./routes/audit'));

// ── Health check ──────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Error handling ────────────────────────────────────────
app.use((err, req, res, next) => {
  // Multer file size errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File too large' });
  }
  if (err.message === 'Only PDF files are accepted') {
    return res.status(400).json({ error: err.message });
  }
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Start ─────────────────────────────────────────────────
const fs = require('fs');
const PID_FILE = path.resolve(__dirname, 'server.pid');

app.listen(PORT, () => {
  // Write PID file so `npm stop` can find and kill the process
  fs.writeFileSync(PID_FILE, String(process.pid));

  console.log(`
  ┌─────────────────────────────────────────────┐
  │  Dealer Document Archive — API Server       │
  │  Running on http://localhost:${PORT}           │
  │  PID: ${String(process.pid).padEnd(39, ' ')} │
  │  Environment: ${(process.env.NODE_ENV || 'development').padEnd(28, ' ')} │
  └─────────────────────────────────────────────┘
  `);
});

// Clean up PID file on exit
function cleanup() {
  try { if (fs.existsSync(PID_FILE)) fs.unlinkSync(PID_FILE); } catch {}
  process.exit();
}
process.on('SIGTERM', cleanup);
process.on('SIGINT', cleanup);
process.on('exit', () => {
  try { if (fs.existsSync(PID_FILE)) fs.unlinkSync(PID_FILE); } catch {}
});
