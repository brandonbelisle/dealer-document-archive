// routes/saml.js
// SAML/SSO authentication routes for Azure Entra ID
const express = require('express');
const passport = require('passport');
const { Strategy: SamlStrategy } = require('@node-saml/passport-saml');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { signToken, requireAuth, requirePermission } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

const router = express.Router();

// Cache for SAML strategy to avoid recreating on every request
let samlStrategy = null;
let lastSamlSettings = null;

// Encryption helper for sensitive fields
const crypto = require('crypto');
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-encryption-key-32-chars!!';
const ALGORITHM = 'aes-256-cbc';

function encrypt(text) {
  if (!text) return '';
  const iv = crypto.randomBytes(16);
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

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
  } catch (err) {
    console.error('Failed to decrypt SAML certificate:', err.message);
    return '';
  }
}

// Get SAML settings from database
async function getSamlSettings() {
  const [rows] = await db.execute('SELECT * FROM saml_settings WHERE id = 1');
  if (rows.length === 0) {
    return {
      enabled: false,
      allow_local_login: true,
      idp_entity_id: '',
      idp_sso_url: '',
      idp_slo_url: '',
      idp_x509_cert: '',
      idp_metadata_url: '',
      sp_entity_id: '',
      sp_acs_url: '',
      sp_slo_url: '',
      attribute_email: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
      attribute_name: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name',
      attribute_username: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/upn',
      auto_provision: true,
      default_group_id: null,
    };
  }
  const row = rows[0];
  return {
    ...row,
    idp_x509_cert: row.idp_x509_cert_encrypted ? decrypt(row.idp_x509_cert_encrypted) : '',
    idp_metadata_url: row.idp_metadata_url || '',
  };
}

// Fetch and parse SAML metadata from URL
async function fetchSamlMetadata(metadataUrl) {
  const https = require('https');
  const http = require('http');
  
  return new Promise((resolve, reject) => {
    const client = metadataUrl.startsWith('https') ? https : http;
    const timeout = setTimeout(() => reject(new Error('Metadata fetch timeout')), 10000);
    
    client.get(metadataUrl, (res) => {
      clearTimeout(timeout);
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const metadata = parseMetadataXml(data);
          resolve(metadata);
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

// Parse SAML metadata XML to extract IdP info
function parseMetadataXml(xml) {
  // Extract all X509 certificates (there may be multiple for key rotation)
  const certMatches = xml.match(/<ds:X509Certificate[^>]*>([^<]+)<\/ds:X509Certificate>/gi);
  const certs = certMatches 
    ? certMatches.map(match => {
        const content = match.replace(/<\/?ds:X509Certificate[^>]*>/gi, '').trim();
        // Wrap in PEM format if not already wrapped
        if (content && !content.includes('-----BEGIN CERTIFICATE-----')) {
          return `-----BEGIN CERTIFICATE-----\n${content}\n-----END CERTIFICATE-----`;
        }
        return content;
      })
    : [];
  
  const ssoUrlMatch = xml.match(/<md:SingleSignOnService[^>]*Location="([^"]+)"/i) || xml.match(/<SingleSignOnService[^>]*Location="([^"]+)"/i);
  const sloUrlMatch = xml.match(/<md:SingleLogoutService[^>]*Location="([^"]+)"/i) || xml.match(/<SingleLogoutService[^>]*Location="([^"]+)"/i);
  const entityIdMatch = xml.match(/entityID="([^"]+)"/i);
  
  return {
    certs: certs,
    cert: certs.length > 0 ? (certs.length === 1 ? certs[0] : certs) : null,
    ssoUrl: ssoUrlMatch ? ssoUrlMatch[1] : null,
    sloUrl: sloUrlMatch ? sloUrlMatch[1] : null,
    entityId: entityIdMatch ? entityIdMatch[1] : null,
  };
}

// Initialize or update SAML strategy
async function initializeSamlStrategy() {
  const settings = await getSamlSettings();
  
  console.log('SAML Settings loaded:', {
    enabled: settings.enabled,
    sp_acs_url: settings.sp_acs_url,
    idp_metadata_url: settings.idp_metadata_url,
    idp_sso_url: settings.idp_sso_url,
    hasCert: !!settings.idp_x509_cert,
  });
  
  if (!settings.enabled || !settings.sp_acs_url) {
    samlStrategy = null;
    lastSamlSettings = null;
    return null;
  }
  
  // Require either metadata URL or manual certificate configuration
  if (!settings.idp_metadata_url && (!settings.idp_sso_url || !settings.idp_x509_cert)) {
    samlStrategy = null;
    lastSamlSettings = null;
    return null;
  }

  // Check if settings changed
  const settingsKey = JSON.stringify({
    idp_entity_id: settings.idp_entity_id,
    idp_sso_url: settings.idp_sso_url,
    sp_entity_id: settings.sp_entity_id,
    sp_acs_url: settings.sp_acs_url,
    idp_metadata_url: settings.idp_metadata_url,
  });
  
  if (samlStrategy && lastSamlSettings === settingsKey) {
    return samlStrategy;
  }

  let ssoUrl = settings.idp_sso_url;
  let certs = [];
  let entityId = settings.idp_entity_id;
  let sloUrl = settings.idp_slo_url;

  // Helper to ensure PEM format
  const ensurePemFormat = (cert) => {
    if (!cert) return null;
    const clean = cert.trim();
    if (clean.includes('-----BEGIN CERTIFICATE-----')) return clean;
    return `-----BEGIN CERTIFICATE-----\n${clean}\n-----END CERTIFICATE-----`;
  };

  // Use manual certificate if provided
  if (settings.idp_x509_cert) {
    certs = [ensurePemFormat(settings.idp_x509_cert)];
  }

  // Fetch metadata from URL if available
  if (settings.idp_metadata_url) {
    try {
      console.log('Fetching SAML metadata from:', settings.idp_metadata_url);
      const metadata = await fetchSamlMetadata(settings.idp_metadata_url);
      
      if (metadata.certs && metadata.certs.length > 0) certs = metadata.certs;
      if (metadata.ssoUrl) ssoUrl = metadata.ssoUrl;
      if (metadata.sloUrl) sloUrl = metadata.sloUrl;
      if (metadata.entityId) entityId = metadata.entityId;
      
      console.log('SAML metadata fetched successfully:', { ssoUrl, entityId, certCount: certs.length });
    } catch (err) {
      console.error('Failed to fetch SAML metadata:', err.message);
      // Fall back to manual config if metadata fetch fails
      if (certs.length === 0) {
        samlStrategy = null;
        lastSamlSettings = null;
        return null;
      }
    }
  }

  if (!ssoUrl || certs.length === 0) {
    samlStrategy = null;
    lastSamlSettings = null;
    return null;
  }

  const strategyConfig = {
    entryPoint: ssoUrl,
    issuer: settings.sp_entity_id || 'dda-saml',
    callbackUrl: settings.sp_acs_url,
    idpCert: certs.length === 1 ? certs[0] : certs,
    identifierFormat: 'urn:oasis:names:tc:SAML:2.0:nameid-format:persistent',
    wantAssertionsSigned: false,
    wantResponseSigned: true,
    acceptedClockSkewMs: -1,
    disableRequestedAuthnContext: true,
  };

  if (sloUrl) {
    strategyConfig.logoutUrl = sloUrl;
  }

  console.log('SAML Strategy Config:', {
    entryPoint: strategyConfig.entryPoint,
    callbackUrl: strategyConfig.callbackUrl,
    certCount: certs.length,
    firstCertPreview: certs[0] ? certs[0].substring(0, 50) + '...' : null,
  });

  const strategy = new SamlStrategy(strategyConfig, (profile, done) => {
    processSamlUser(profile, settings)
      .then(user => done(null, user))
      .catch(err => done(err));
  });

  // Register strategy with passport
  passport.use('saml', strategy);

  samlStrategy = strategy;
  lastSamlSettings = settingsKey;
  return strategy;
}

// Process SAML user - find or create
async function processSamlUser(profile, settings) {
  const email = profile[settings.attribute_email] || profile.email || profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'];
  const name = profile[settings.attribute_name] || profile.name || profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] || email?.split('@')[0];
  const username = profile[settings.attribute_username] || profile.username || profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/upn'] || email?.split('@')[0];
  const nameId = profile.nameID || profile['nameID'];

  if (!email) {
    throw new Error('Email not provided in SAML response');
  }

  // Try to find existing user by email or external_id
  const [existingUsers] = await db.execute(
    'SELECT * FROM users WHERE email = ? OR (external_id IS NOT NULL AND external_id = ?)',
    [email, nameId || email]
  );

  if (existingUsers.length > 0) {
    const user = existingUsers[0];
    
    // Update last login and external_id if needed
    await db.execute(
      'UPDATE users SET last_login_at = NOW(), external_id = ? WHERE id = ?',
      [nameId || email, user.id]
    );
    
    // Get user groups and permissions
    const [groups] = await db.execute(
      `SELECT sg.name FROM security_groups sg
       JOIN user_group_memberships ugm ON sg.id = ugm.group_id
       WHERE ugm.user_id = ?`,
      [user.id]
    );
    
    const [perms] = await db.execute(
      `SELECT DISTINCT p.perm_key FROM permissions p
       JOIN group_permissions gp ON p.id = gp.permission_id
       JOIN user_group_memberships ugm ON gp.group_id = ugm.group_id
       WHERE ugm.user_id = ?`,
      [user.id]
    );

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.display_name,
      groups: groups.map(g => g.name),
      permissions: perms.map(p => p.perm_key),
      authProvider: 'saml',
    };
  }

  // Auto-provision new user if enabled
  if (settings.auto_provision) {
    const id = uuidv4();
    await db.execute(
      'INSERT INTO users (id, username, email, password_hash, display_name, auth_provider, external_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, username, email, '', name || username, 'saml', nameId || email, 'active']
    );

    // Assign default group if configured
    if (settings.default_group_id) {
      await db.execute(
        'INSERT INTO user_group_memberships (user_id, group_id) VALUES (?, ?)',
        [id, settings.default_group_id]
      );
    } else {
      // Assign to "User" group by default
      const [userGroup] = await db.execute(
        "SELECT id FROM security_groups WHERE name = 'User'"
      );
      if (userGroup.length > 0) {
        await db.execute(
          'INSERT INTO user_group_memberships (user_id, group_id) VALUES (?, ?)',
          [id, userGroup[0].id]
        );
      }
    }

    // Get user groups and permissions
    const [groups] = await db.execute(
      `SELECT sg.name FROM security_groups sg
       JOIN user_group_memberships ugm ON sg.id = ugm.group_id
       WHERE ugm.user_id = ?`,
      [id]
    );
    
    const [perms] = await db.execute(
      `SELECT DISTINCT p.perm_key FROM permissions p
       JOIN group_permissions gp ON p.id = gp.permission_id
       JOIN user_group_memberships ugm ON gp.group_id = ugm.group_id
       WHERE ugm.user_id = ?`,
      [id]
    );

    return {
      id,
      username,
      email,
      displayName: name || username,
      groups: groups.map(g => g.name),
      permissions: perms.map(p => p.perm_key),
      authProvider: 'saml',
    };
  }

  throw new Error('User not found and auto-provision is disabled');
}

// Serialize user for passport session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const [users] = await db.execute('SELECT * FROM users WHERE id = ?', [id]);
    if (users.length === 0) {
      return done(null, false);
    }
    const user = users[0];
    const [groups] = await db.execute(
      `SELECT sg.name FROM security_groups sg
       JOIN user_group_memberships ugm ON sg.id = ugm.group_id
       WHERE ugm.user_id = ?`,
      [user.id]
    );
    const [perms] = await db.execute(
      `SELECT DISTINCT p.perm_key FROM permissions p
       JOIN group_permissions gp ON p.id = gp.permission_id
       JOIN user_group_memberships ugm ON gp.group_id = ugm.group_id
       WHERE ugm.user_id = ?`,
      [user.id]
    );
    done(null, {
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.display_name,
      groups: groups.map(g => g.name),
      permissions: perms.map(p => p.perm_key),
    });
  } catch (err) {
    done(err);
  }
});

// ── GET /api/saml/settings ──────────────────────────────────
router.get('/settings', requireAuth, requirePermission('manageSettings'), async (req, res) => {
  try {
    const settings = await getSamlSettings();
    // Mask the certificate in response
    const response = {
      ...settings,
      idp_x509_cert: settings.idp_x509_cert ? '••••••••••••••••' : '',};
    res.json(response);
  } catch (err) {
    console.error('Failed to get SAML settings:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /api/saml/settings ─────────────────────────────────
router.post('/settings', requireAuth, requirePermission('manageSettings'), async (req, res) => {
  try {
    const {
      enabled,
      idp_entity_id,
      idp_sso_url,
      idp_slo_url,
      idp_x509_cert,
      idp_metadata_url,
      sp_entity_id,
      sp_acs_url,
      sp_slo_url,
      attribute_email,
      attribute_name,
      attribute_username,
      auto_provision,
      default_group_id,
      allow_local_login,
    } = req.body;

    // Get current settings to check if cert changed
    const [rows] = await db.execute('SELECT idp_x509_cert_encrypted FROM saml_settings WHERE id = 1');
    let certEncrypted = '';
    
    if (idp_x509_cert && idp_x509_cert !== '••••••••••••••••' && idp_x509_cert !== '') {
      certEncrypted = encrypt(idp_x509_cert);
    } else if (rows.length > 0 && rows[0].idp_x509_cert_encrypted) {
      certEncrypted = rows[0].idp_x509_cert_encrypted;
    }

    await db.execute(`
      INSERT INTO saml_settings (
        id, enabled, idp_entity_id, idp_sso_url, idp_slo_url, idp_x509_cert_encrypted, idp_metadata_url,
        sp_entity_id, sp_acs_url, sp_slo_url, attribute_email, attribute_name,
        attribute_username, auto_provision, default_group_id, allow_local_login
      ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        enabled = VALUES(enabled),
        idp_entity_id = VALUES(idp_entity_id),
        idp_sso_url = VALUES(idp_sso_url),
        idp_slo_url = VALUES(idp_slo_url),
        idp_x509_cert_encrypted = VALUES(idp_x509_cert_encrypted),
        idp_metadata_url = VALUES(idp_metadata_url),
        sp_entity_id = VALUES(sp_entity_id),
        sp_acs_url = VALUES(sp_acs_url),
        sp_slo_url = VALUES(sp_slo_url),
        attribute_email = VALUES(attribute_email),
        attribute_name = VALUES(attribute_name),
        attribute_username = VALUES(attribute_username),
        auto_provision = VALUES(auto_provision),
        default_group_id = VALUES(default_group_id),
        allow_local_login = VALUES(allow_local_login)
    `, [
      enabled ? 1 : 0,
      idp_entity_id || '', idp_sso_url || '', idp_slo_url || '', certEncrypted, idp_metadata_url || '',
      sp_entity_id || '', sp_acs_url || '', sp_slo_url || '',
      attribute_email || 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
      attribute_name || 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name',
      attribute_username || 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/upn',
      auto_provision ? 1 : 0,
      default_group_id || null,
      allow_local_login ? 1 : 0,
    ]);

    // Reset cached strategy so it will be reinitialized with new settings
    samlStrategy = null;
    lastSamlSettings = null;

    logAudit('SAML Settings Updated', 'SAML/SSO settings were updated', req.user, req.ip);

    res.json({ success: true });
  } catch (err) {
    console.error('Failed to save SAML settings:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /api/saml/status ────────────────────────────────────
// Public endpoint - returns SAML status for login page
router.get('/status', async (req, res) => {
  try {
    const settings = await getSamlSettings();
    res.json({
      enabled: settings.enabled && !!settings.idp_sso_url && !!settings.idp_x509_cert,
      allow_local_login: settings.allow_local_login,
    });
  } catch (err) {
    console.error('Failed to get SAML status:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /api/saml/metadata ──────────────────────────────────
// Returns SP metadata for Azure Entra configuration
router.get('/metadata', async (req, res) => {
  try {
    const settings = await getSamlSettings();
    
    if (!settings.sp_entity_id || !settings.sp_acs_url) {
      return res.status(400).json({ error: 'SAML not configured' });
    }

    const entityID = settings.sp_entity_id;
    const callbackUrl = settings.sp_acs_url;
    
    // Generate SP metadata XML
    const metadata = `<?xml version="1.0"?>
<EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata"
    entityID="${entityID}">
  <SPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <NameIDFormat>urn:oasis:names:tc:SAML:2.0:nameid-format:persistent</NameIDFormat>
    <AssertionConsumerService index="1"
        Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
        Location="${callbackUrl}" />
  </SPSSODescriptor>
</EntityDescriptor>`;

    res.set('Content-Type', 'application/xml');
    res.send(metadata);
  } catch (err) {
    console.error('Failed to generate metadata:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /api/saml/login ─────────────────────────────────────
// Redirect to IdP for SAML login
router.get('/login', async (req, res, next) => {
  try {
    const strategy = await initializeSamlStrategy();
    if (!strategy) {
      return res.status(400).json({ error: 'SAML is not configured or enabled' });
    }

    passport.authenticate('saml', {
      samlFallback: 'login-request',
    })(req, res, next);
  } catch (err) {
    console.error('SAML login error:', err);
    res.status(500).json({ error: 'Failed to initiate SAML login' });
  }
});

// ── POST /api/saml/callback ─────────────────────────────────
// Handle SAML response from IdP
router.post('/callback', async (req, res) => {
  try {
    const strategy = await initializeSamlStrategy();
    if (!strategy) {
      return res.status(400).json({ error: 'SAML is not configured or enabled' });
    }

    // Wrap passport.authenticate in a promise
    const authenticate = () => new Promise((resolve, reject) => {
      passport.authenticate('saml', (err, user, info) => {
        if (err) return reject(err);
        if (!user) return reject(new Error(info?.message || 'SAML authentication failed'));
        resolve(user);
      })(req, res, () => {});
    });

    let user;
    try {
      user = await authenticate();
    } catch (authErr) {
      console.error('SAML authentication failed:', authErr);
      
      // Get frontend URL for redirect
      const frontendUrl = process.env.FRONTEND_URL || '';
      const loginUrl = frontendUrl ? `${frontendUrl}/login` : '/login';
      
      return res.redirect(`${loginUrl}?error=${encodeURIComponent(authErr.message || 'SAML authentication failed')}`);
    }

    // Generate JWT token
    const token = signToken(user);

    // Log audit
    logAudit('SSO Login', `"${user.displayName}" logged in via SSO`, user, req.ip);

    // Get frontend URL for redirect
    const frontendUrl = process.env.FRONTEND_URL || '';
    const loginUrl = frontendUrl ? `${frontendUrl}/login` : '/login';
    
    // Redirect to frontend with token
    res.redirect(`${loginUrl}?token=${token}`);
  } catch (err) {
    console.error('SAML callback error:', err);
    const frontendUrl = process.env.FRONTEND_URL || '';
    const loginUrl = frontendUrl ? `${frontendUrl}/login` : '/login';
    res.redirect(`${loginUrl}?error=${encodeURIComponent(err.message || 'SAML authentication failed')}`);
  }
});

// ── GET /api/saml/logout ────────────────────────────────────
// Handle SAML logout (optional)
router.get('/logout', async (req, res) => {
  try {
    const settings = await getSamlSettings();
    
    if (settings.idp_slo_url) {
      // Redirect to IdP for logout
      res.redirect(settings.idp_slo_url);
    } else {
      // Just redirect to login page
      const frontendUrl = process.env.FRONTEND_URL || '';
      res.redirect(frontendUrl ? `${frontendUrl}/login` : '/login');
    }
  } catch (err) {
    console.error('SAML logout error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = { router, initializeSamlStrategy };