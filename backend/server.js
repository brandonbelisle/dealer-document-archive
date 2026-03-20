// server.js
// Dealer Document Archive — Express API Server
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0'; // Bind to all interfaces for LAN access

// ── Middleware ─────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
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

// ── Serve frontend in production ──────────────────────────
// After `npm run build:frontend`, the built files are in ../frontend/dist
// Express serves them as static files, with a fallback to index.html for
// client-side routing (React SPA).
const FRONTEND_DIST = path.resolve(__dirname, '../frontend/dist');
if (fs.existsSync(FRONTEND_DIST)) {
  app.use(express.static(FRONTEND_DIST));
  // Any request that doesn't match an API route or a static file
  // gets the React app's index.html (client-side routing)
  app.get('{*path}', (req, res) => {
    res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
  });
  console.log('✓ Serving frontend from', FRONTEND_DIST);
} else {
  console.log('ℹ No frontend build found at', FRONTEND_DIST);
  console.log('  Run "npm run build:frontend" to build the React app');
  console.log('  Or use "npm run dev" for development with Vite proxy');
}

// ── Error handling ────────────────────────────────────────
app.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File too large' });
  }
  if (err.message === 'Only PDF files are accepted') {
    return res.status(400).json({ error: err.message });
  }
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Get local network IP ─────────────────────────────────
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal (loopback) and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

// ── Start ─────────────────────────────────────────────────
const PID_FILE = path.resolve(__dirname, 'server.pid');

app.listen(PORT, HOST, () => {
  fs.writeFileSync(PID_FILE, String(process.pid));

  const localIP = getLocalIP();
  const hasFrontend = fs.existsSync(FRONTEND_DIST);

  console.log(`
  ┌─────────────────────────────────────────────────────┐
  │  Dealer Document Archive — Server                   │
  │                                                     │
  │  Local:     http://localhost:${PORT}                   │
  │  Network:   http://${localIP}:${PORT}${' '.repeat(Math.max(0, 20 - localIP.length - String(PORT).length))}│
  │                                                     │
  │  PID:       ${String(process.pid).padEnd(40, ' ')}│
  │  Mode:      ${hasFrontend ? 'Production (API + Frontend)     ' : 'API only (no frontend build)      '}│
  └─────────────────────────────────────────────────────┘
  `);

  if (hasFrontend) {
    console.log(`  → Open http://${localIP}:${PORT} from any device on your network\n`);
  }
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
