// server.js
// Dealer Document Archive — Express API Server
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const os = require('os');

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0';

// ── CORS ──────────────────────────────────────────────────
// When frontend is served from the same origin (production),
// CORS isn't needed but we allow it for flexibility.
// credentials:true requires a specific origin, not '*'.
const frontendUrl = process.env.FRONTEND_URL;
app.use(cors(
  frontendUrl
    ? { origin: frontendUrl, credentials: true }
    : { origin: true }  // Reflects the request origin — works with any origin
));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Azure Blob Storage (non-blocking) ─────────────────────
// Try to initialize Azure, but don't crash if it's not configured yet.
(async () => {
  try {
    const { ensureContainer } = require('./config/azure-storage');
    await ensureContainer();
  } catch (err) {
    console.warn('⚠ Azure Storage not initialized:', err.message);
    console.warn('  File uploads will fail until Azure is configured in .env');
  }
})();

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

// ── API 404 handler ───────────────────────────────────────
// Must be BEFORE the frontend catch-all so /api/* returns JSON, not HTML
app.all('/api/{*path}', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// ── API Error handler ─────────────────────────────────────
// Must be BEFORE the frontend catch-all
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

// ── Serve frontend in production ──────────────────────────
// After building the frontend (npm run build), Express serves the
// static files and falls back to index.html for client-side routing.
const FRONTEND_DIST = path.resolve(__dirname, '../frontend/dist');
if (fs.existsSync(FRONTEND_DIST)) {
  app.use(express.static(FRONTEND_DIST));

  // Catch-all: serve index.html for any non-API, non-static route
  // This enables React client-side routing
  app.get('{*path}', (req, res) => {
    res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
  });

  console.log('✓ Serving frontend from', FRONTEND_DIST);
} else {
  console.log('');
  console.log('ℹ No frontend build found at', FRONTEND_DIST);
  console.log('  Run "npm start" from the project root to build and start');
  console.log('  Or run "cd ../frontend && npm run build" to build separately');
  console.log('');
}

// ── Get local/public network IPs ──────────────────────────
function getNetworkIPs() {
  const ips = [];
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push({ name, address: iface.address });
      }
    }
  }
  return ips;
}

// ── Start ─────────────────────────────────────────────────
const PID_FILE = path.resolve(__dirname, 'server.pid');

app.listen(PORT, HOST, () => {
  fs.writeFileSync(PID_FILE, String(process.pid));

  const networkIPs = getNetworkIPs();
  const hasFrontend = fs.existsSync(FRONTEND_DIST);
  const portSuffix = PORT === 80 ? '' : `:${PORT}`;

  console.log('');
  console.log('  ┌─────────────────────────────────────────────────────┐');
  console.log('  │  Dealer Document Archive — Server                   │');
  console.log('  │                                                     │');
  console.log(`  │  Local:   http://localhost${portSuffix}`);
  for (const ip of networkIPs) {
    console.log(`  │  Network: http://${ip.address}${portSuffix}  (${ip.name})`);
  }
  console.log('  │                                                     │');
  console.log(`  │  PID:     ${process.pid}`);
  console.log(`  │  Mode:    ${hasFrontend ? 'Production (API + Frontend)' : 'API only (run npm start from root)'}`);
  console.log('  └─────────────────────────────────────────────────────┘');
  console.log('');

  if (hasFrontend && networkIPs.length > 0) {
    console.log(`  → Open http://${networkIPs[0].address}${portSuffix} from any device`);
    console.log('');
  }
});

// ── Clean up PID file on exit ─────────────────────────────
function cleanup() {
  try { if (fs.existsSync(PID_FILE)) fs.unlinkSync(PID_FILE); } catch {}
  process.exit();
}
process.on('SIGTERM', cleanup);
process.on('SIGINT', cleanup);
process.on('exit', () => {
  try { if (fs.existsSync(PID_FILE)) fs.unlinkSync(PID_FILE); } catch {}
});
