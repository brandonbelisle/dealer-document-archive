// config/azure-storage.js
// Azure Blob Storage client for file uploads, downloads, and deletions.
// Reads configuration from database (azure_settings table) instead of env vars.

// ── Polyfill: ensure globalThis.crypto is available ───────
if (typeof globalThis.crypto === 'undefined') {
  globalThis.crypto = require('crypto');
}

const { BlobServiceClient, StorageSharedKeyCredential, BlobSASPermissions, generateBlobSASQueryParameters } = require('@azure/storage-blob');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const crypto = require('crypto');

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
  } catch (err) {
    console.error('Failed to decrypt Azure connection string:', err.message);
    return '';
  }
}

function parseConnectionString(connectionString) {
  const parts = {};
  connectionString.split(';').forEach(part => {
    const [key, ...valueParts] = part.split('=');
    if (key && valueParts.length > 0) {
      parts[key.trim()] = valueParts.join('=').trim();
    }
  });
  return {
    accountName: parts.AccountName || parts.accountname,
    accountKey: parts.AccountKey || parts.accountkey,
  };
}

// ── Cached client and settings ─────────────────────────────
let _blobServiceClient = null;
let _containerName = null;
let _accountName = null;
let _accountKey = null;

// ── Clear cached client (called when settings change) ───────
function clearCache() {
  _blobServiceClient = null;
  _containerName = null;
  _accountName = null;
  _accountKey = null;
}

// ── Get settings from database and initialize client ──────────
async function initializeClient() {
  // Lazy load db to avoid circular dependency
  const db = require('../config/db');
  
  const [rows] = await db.execute('SELECT * FROM azure_settings WHERE id = 1');
  
  if (rows.length === 0 || !rows[0].connection_string_encrypted) {
    throw new Error('Azure Storage not configured. Configure it in Admin Settings.');
  }
  
  const settings = rows[0];
  const connectionString = decrypt(settings.connection_string_encrypted);
  const containerName = settings.container_name || 'documents';
  
  if (!connectionString) {
    throw new Error('Azure Storage connection string could not be decrypted.');
  }
  
  // Parse account name/key for SAS URL generation
  const parsed = parseConnectionString(connectionString);
  _accountName = parsed.accountName;
  _accountKey = parsed.accountKey;
  _containerName = containerName;
  
  _blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
  
  return { client: _blobServiceClient, containerName };
}

// ── Get client (async) ───────────────────────────────────────
async function getContainerClient() {
  if (_blobServiceClient && _containerName) {
    return {
      client: _blobServiceClient,
      containerName: _containerName,
      containerClient: _blobServiceClient.getContainerClient(_containerName),
    };
  }
  
  const { client, containerName } = await initializeClient();
  return {
    client,
    containerName,
    containerClient: client.getContainerClient(containerName),
  };
}

// ── Ensure container exists on startup ────────────────────────
async function ensureContainer() {
  try {
    const { containerClient, containerName } = await getContainerClient();
    const createResponse = await containerClient.createIfNotExists({
      access: 'blob',
    });
    if (createResponse.succeeded) {
      console.log(`✓ Azure container created: ${containerName}`);
    } else {
      console.log(`✓ Azure container ready: ${containerName}`);
    }
  } catch (err) {
    console.error('✗ Azure container setup failed:', err.message);
    console.error('  Configure Azure Storage in Admin Settings');
  }
}

// ── Upload a file buffer to Azure ──────────────────────────
async function uploadBlob(fileBuffer, originalFilename, mimeType) {
  const { containerClient, containerName } = await getContainerClient();
  const ext = path.extname(originalFilename);
  const blobName = `${uuidv4()}${ext}`;
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  await blockBlobClient.uploadData(fileBuffer, {
    blobHTTPHeaders: {
      blobContentType: mimeType || 'application/pdf',
      blobContentDisposition: `inline; filename="${originalFilename}"`,
    },
  });

  return {
    blobName,
    blobUrl: blockBlobClient.url,
  };
}

// ── Download a blob as a readable stream ────────────────────
async function downloadBlob(blobName) {
  const { containerClient } = await getContainerClient();
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  const downloadResponse = await blockBlobClient.download(0);

  return {
    readableStream: downloadResponse.readableStreamBody,
    contentType: downloadResponse.contentType,
    contentLength: downloadResponse.contentLength,
  };
}

// ── Download a blob as a Buffer ─────────────────────────────
async function downloadBlobBuffer(blobName) {
  const { containerClient } = await getContainerClient();
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  const downloadResponse = await blockBlobClient.downloadToBuffer();

  return {
    buffer: downloadResponse,
    contentType: downloadResponse.contentType,
    contentLength: downloadResponse.contentLength,
  };
}

// ── Delete a blob ───────────────────────────────────────────
async function deleteBlob(blobName) {
  try {
    const { containerClient } = await getContainerClient();
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.deleteIfExists({ deleteSnapshots: 'include' });
    return true;
  } catch (err) {
    console.error('Azure delete failed:', err.message);
    return false;
  }
}

// ── Generate a SAS URL for time-limited access ──────────────
async function generateSasUrl(blobName, expiresInMinutes = 60) {
  // Ensure client is initialized
  if (!_blobServiceClient) {
    await getContainerClient();
  }
  
  let accountName = _accountName;
  let accountKey = _accountKey;

  if (!accountName || !accountKey) {
    // Fall back to public URL (works if container has blob-level public access)
    const { containerClient } = await getContainerClient();
    return containerClient.getBlockBlobClient(blobName).url;
  }

  const credential = new StorageSharedKeyCredential(accountName, accountKey);

  const startsOn = new Date();
  const expiresOn = new Date(startsOn.getTime() + expiresInMinutes * 60 * 1000);

  const sasParams = generateBlobSASQueryParameters(
    {
      containerName: _containerName,
      blobName,
      permissions: BlobSASPermissions.parse('r'),
      startsOn,
      expiresOn,
    },
    credential
  );

  return `https://${accountName}.blob.core.windows.net/${_containerName}/${blobName}?${sasParams}`;
}

module.exports = {
  ensureContainer,
  uploadBlob,
  downloadBlob,
  downloadBlobBuffer,
  deleteBlob,
  generateSasUrl,
  clearCache,
};