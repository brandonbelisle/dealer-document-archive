// server.js
// Dealer Document Archive — Express API Server
// Supports both HTTP and HTTPS (configurable via .env)
require('dotenv').config();

const express = require('express');
const http = require('http');
const https = require('https');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const os = require('os');
const passport = require('passport');

// ── Security: Validate required environment variables ───────
const isProduction = process.env.NODE_ENV === 'production';
const requiredEnvVars = ['JWT_SECRET'];
if (isProduction) {
  requiredEnvVars.push('FRONTEND_URL', 'DB_HOST', 'DB_USER', 'DB_NAME');
}
const missing = requiredEnvVars.filter(v => !process.env[v]);
if (missing.length > 0) {
  console.error(`✗Missing required environment variables: ${missing.join(', ')}`);
  console.error('  Set these in your .env file or environment.');
  process.exit(1);
}
if (process.env.JWT_SECRET === 'dev-secret-change-me') {
  console.error('✗ JWT_SECRET must be changed from default value in production.');
  process.exit(1);
}

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0';

// ── Dynamic CSP Middleware ─────────────────────────────────
async function getAllowedIframeDomains() {
  try {
    const db = require('./config/db');
    const [rows] = await db.execute(
      'SELECT value FROM app_settings WHERE `key` = "allowed_iframe_domains"'
    );
    if (rows.length > 0 && rows[0].value) {
      return rows[0].value.split(',').map(d => d.trim()).filter(d => d);
    }
  } catch (err) {
    console.error('Failed to get allowed iframe domains:', err.message);
  }
  return ['*.blob.core.windows.net'];
}

app.use(async (req, res, next) => {
  try {
    const allowedDomains = await getAllowedIframeDomains();
    const frameSrc = ["'self'", ...allowedDomains];
    
    res.setHeader('Content-Security-Policy', [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline' fonts.googleapis.com cdn.jsdelivr.net",
      "img-src 'self' data: blob:",
      "font-src 'self' fonts.gstatic.com cdn.jsdelivr.net",
      `frame-src ${frameSrc.join(' ')}`,
      "frame-ancestors 'self'",
    ].join('; '));
  } catch (err) {
    console.error('CSP middleware error:', err);
  }
  next();
});

// ── CORS (failsecure)─────────────────────────────────────
const frontendUrl = process.env.FRONTEND_URL;
if (isProduction &&!frontendUrl) {
  console.error('✗ FRONTEND_URL must be set in production mode.');
  process.exit(1);
}
app.use(cors(
  frontendUrl
    ? { origin: frontendUrl, credentials: true }
    : { origin: true }
));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Rate Limiting ───────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60* 1000,
  max: 10,
  message: { error: 'Too many attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// ── HTTP → HTTPS redirect (optional) ─────────────────────
const SSL_ENABLED = process.env.SSL_ENABLED === 'true';
const HTTP_REDIRECT = SSL_ENABLED && (process.env.HTTP_REDIRECT === 'true');

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
app.use('/api/azure', require('./routes/azure'));
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

// ── Load SSL Options ───────────────────────────────────────
async function loadSSLOptions() {
  if (!SSL_ENABLED) {
    return null;
  }

  // First, try to load active certificate from database
  try {
    const db = require('./config/db');
    const [rows] = await db.execute(
      'SELECT name, filename, key_filename, passphrase FROM ssl_certificates WHERE is_active = 1 LIMIT 1'
    );

    if (rows.length > 0) {
      const cert = rows[0];
      const certPath = path.join(__dirname, 'uploads/certificates', cert.filename);
      const keyPath = cert.key_filename 
        ? path.join(__dirname, 'uploads/certificates', cert.key_filename)
        : null;

      if (fs.existsSync(certPath) && keyPath && fs.existsSync(keyPath)) {
        console.log(`Loading active SSL certificate: ${cert.name}`);
        try {
          const keyContent = fs.readFileSync(keyPath, 'utf8');
          const certContent = fs.readFileSync(certPath, 'utf8');
          
          // Verify they look like PEM files
          if (!keyContent.includes('-----BEGIN') || !certContent.includes('-----BEGIN CERTIFICATE')) {
            console.warn('⚠ Certificate or key file does not appear to be in PEM format');
            console.warn('  Falling back to environment variable certificates');
          } else {
            console.log('✓ Using active SSL certificate:', cert.name);
            const sslOptions = {
              key: keyContent,
              cert: certContent,
            };
            if (cert.passphrase) {
              sslOptions.passphrase = cert.passphrase;
            }
            return sslOptions;
          }
        } catch (readErr) {
          console.warn('⚠ Failed to read certificate files:', readErr.message);
          console.warn('  Falling back to environment variable certificates');
        }
      }
    }
  } catch (err) {
    // Database not available or no active cert, fall through to env vars
    if (err.code !== 'ECONNREFUSED') {
      console.warn('⚠ Could not check for active SSL certificate:', err.message);
    }
  }

  // Fall back to environment variable paths
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

  console.log('✓ SSL certificates loaded (from ssl/ directory)');
  return {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath),
  };
}

// ── Start Server ───────────────────────────────────────────
async function startServer() {
  // Initialize Azure Blob Storage (non-blocking)
  (async () => {
    try {
      const { ensureContainer } = require('./config/azure-storage');
      await ensureContainer();
    } catch (err) {
      console.warn('⚠ Azure Storage not initialized:', err.message);
      console.warn('  Configure Azure in Admin Settings to enable file uploads.');
    }
  })();

  // Start DMS scheduler
  try {
    const { startScheduler } = require('./scheduler/dmsScheduler');
    startScheduler(60); // Check every 60 seconds
    console.log('✓ DMS scheduler started');
  } catch (err) {
    console.warn('⚠ DMS scheduler not started:', err.message);
  }

  const sslOptions = await loadSSLOptions();
  const server = SSL_ENABLED && sslOptions
    ? https.createServer(sslOptions, app)
    : http.createServer(app);

  // Initialize Socket.io for real-time updates
  const { Server } = require('socket.io');
  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || true,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });
  
  const socketService = require('./socket');
  socketService.init(io);
  console.log('✓ Socket.io initialized');

  const PID_FILE = path.resolve(__dirname, 'server.pid');
  const protocol = SSL_ENABLED && sslOptions ? 'https' : 'http';

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

  // HTTP → HTTPS redirect server
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
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});