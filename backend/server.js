// server.js
// Dealer Document Archive — Express API Server
// Supports both HTTP and HTTPS (configurable via .env)
require('dotenv').config();

const express = require('express');
const http = require('http');
const https = require('https');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const os = require('os');
const passport = require('passport');

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0';

// ── SSL Configuration ─────────────────────────────────────
const SSL_ENABLED = process.env.SSL_ENABLED === 'true';
let sslOptions = null;

if (SSL_ENABLED) {
  const keyPath = path.resolve(__dirname, process.env.SSL_KEY || './ssl/server.key');
  const certPath = path.resolve(__dirname, process.env.SSL_CERT || './ssl/server.crt');

  if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
    console.error('');
    console.error('  ✗ SSL is enabled but certificate files not found:');
    console.error(`    Key:  ${keyPath}`);
    console.error(`    Cert: ${certPath}`);
    console.error('');
    console.error('  Run "bash generate-cert.sh" from the project root to create them.');
    console.error('  Or set SSL_ENABLED=false in .env to use HTTP.');
    console.error('');
    process.exit(1);
  }

  sslOptions = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath),
  };
  console.log('✓ SSL certificates loaded');
}

// ── CORS ──────────────────────────────────────────────────
const frontendUrl = process.env.FRONTEND_URL;
app.use(cors(
  frontendUrl
    ? { origin: frontendUrl, credentials: true }
    : { origin: true }
));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── HTTP → HTTPS redirect (optional) ─────────────────────
const HTTP_REDIRECT = SSL_ENABLED && (process.env.HTTP_REDIRECT === 'true');

// ── Azure Blob Storage (non-blocking) ─────────────────────
(async () => {
  try {
    const { ensureContainer } = require('./config/azure-storage');
    await ensureContainer();
  } catch (err) {
    console.warn('⚠ Azure Storage not initialized:', err.message);
    console.warn('  File uploads will fail until Azure is configured in .env');
  }
})();

// ── Passport initialization (for SAML SSO) ─────────────────
app.use(passport.initialize());

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
app.use('/api/access', require('./routes/access'));
app.use('/api/search', require('./routes/search'));
app.use('/api/subscriptions', require('./routes/subscriptions'));
app.use('/api/notifications', require('./routes/notifications').router);
app.use('/api/settings', require('./routes/settings'));
app.use('/api/smtp', require('./routes/smtp').router);
app.use('/api/saml', require('./routes/saml').router);
app.use('/api/custom-apps', require('./routes/custom-apps'));
app.use('/api/dms-settings', require('./routes/dms'));
app.use('/api/help-ticket', require('./routes/help-ticket'));

// ── Health check ──────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    ssl: SSL_ENABLED,
    timestamp: new Date().toISOString(),
  });
});

// ── API 404 handler ───────────────────────────────────────
app.all('/api/{*path}', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// ── API Error handler ─────────────────────────────────────
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
const FRONTEND_DIST = path.resolve(__dirname, '../frontend/dist');
if (fs.existsSync(FRONTEND_DIST)) {
  app.use(express.static(FRONTEND_DIST));
  app.get('{*path}', (req, res) => {
    res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
  });
  console.log('✓ Serving frontend from', FRONTEND_DIST);
} else {
  console.log('');
  console.log('ℹ No frontend build found at', FRONTEND_DIST);
  console.log('  Run "npm start" from the project root to build and start');
  console.log('');
}

// ── Get network IPs ───────────────────────────────────────
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

// ── Create server (HTTP or HTTPS) ─────────────────────────
const server = SSL_ENABLED
  ? https.createServer(sslOptions, app)
  : http.createServer(app);

const PID_FILE = path.resolve(__dirname, 'server.pid');
const protocol = SSL_ENABLED ? 'https' : 'http';

server.listen(PORT, HOST, () => {
  fs.writeFileSync(PID_FILE, String(process.pid));

  const networkIPs = getNetworkIPs();
  const hasFrontend = fs.existsSync(FRONTEND_DIST);
  const isDefaultPort = (SSL_ENABLED && PORT === 443) || (!SSL_ENABLED && PORT === 80);
  const portSuffix = isDefaultPort ? '' : `:${PORT}`;

  console.log('');
  console.log('  ┌─────────────────────────────────────────────────────┐');
  console.log('  │  Dealer Document Archive — Server                   │');
  console.log('  │                                                     │');
  console.log(`  │  Local:    ${protocol}://localhost${portSuffix}`);
  for (const ip of networkIPs) {
    console.log(`  │  Network:  ${protocol}://${ip.address}${portSuffix}  (${ip.name})`);
  }
  console.log('  │                                                     │');
  console.log(`  │  PID:      ${process.pid}`);
  console.log(`  │  SSL:      ${SSL_ENABLED ? 'Enabled (HTTPS)' : 'Disabled (HTTP)'}`);
  console.log(`  │  Mode:     ${hasFrontend ? 'Production (API + Frontend)' : 'API only'}`);
  console.log('  └─────────────────────────────────────────────────────┘');
  console.log('');

  if (hasFrontend && networkIPs.length > 0) {
    console.log(`  → Open ${protocol}://${networkIPs[0].address}${portSuffix} from any device`);
    if (SSL_ENABLED) {
      console.log('  → Browsers will show a security warning for self-signed certs');
      console.log('    Click "Advanced" → "Proceed" to continue');
    }
    console.log('');
  }
});

// ── Optional: HTTP → HTTPS redirect server ────────────────
if (HTTP_REDIRECT) {
  const redirectApp = express();
  redirectApp.all('{*path}', (req, res) => {
    const host = req.headers.host?.replace(/:\d+$/, '') || 'localhost';
    const portPart = PORT === 443 ? '' : `:${PORT}`;
    res.redirect(301, `https://${host}${portPart}${req.url}`);
  });
  http.createServer(redirectApp).listen(80, HOST, () => {
    console.log('  ✓ HTTP → HTTPS redirect active on port 80');
    console.log('');
  });
}

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
