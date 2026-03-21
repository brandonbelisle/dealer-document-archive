// config/azure-storage.js
// Azure Blob Storage client for file uploads, downloads, and deletions.
// Uses @azure/storage-blob SDK with lazy initialization.

// ── Polyfill: ensure globalThis.crypto is available ───────
// Some Node.js environments (especially older 18.x builds) don't
// expose crypto on globalThis, which the Azure SDK expects.
if (typeof globalThis.crypto === 'undefined') {
  globalThis.crypto = require('crypto');
}

const { BlobServiceClient, StorageSharedKeyCredential, BlobSASPermissions, generateBlobSASQueryParameters } = require('@azure/storage-blob');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
require('dotenv').config();

const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'documents';

// ── Lazy client — only created on first use ───────────────
let _blobServiceClient = null;

function getClient() {
  if (_blobServiceClient) return _blobServiceClient;

  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
  const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;

  // Skip if still using the placeholder values from .env.example
  const isPlaceholder = connectionString && (
    connectionString.includes('youraccount') ||
    connectionString.includes('yourkey') ||
    connectionString === 'DefaultEndpointsProtocol=https;AccountName=youraccount;AccountKey=yourkey;EndpointSuffix=core.windows.net'
  );

  if (isPlaceholder) {
    throw new Error('Azure connection string still has placeholder values — update .env with your real credentials');
  }

  if (connectionString) {
    _blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
  } else if (accountName && accountKey) {
    const credential = new StorageSharedKeyCredential(accountName, accountKey);
    _blobServiceClient = new BlobServiceClient(
      `https://${accountName}.blob.core.windows.net`,
      credential
    );
  } else {
    throw new Error(
      'Azure Storage not configured. Set AZURE_STORAGE_CONNECTION_STRING ' +
      'or AZURE_STORAGE_ACCOUNT_NAME + AZURE_STORAGE_ACCOUNT_KEY in .env'
    );
  }

  return _blobServiceClient;
}

// ── Ensure container exists on startup ────────────────────
async function ensureContainer() {
  try {
    const client = getClient();
    const containerClient = client.getContainerClient(containerName);
    const createResponse = await containerClient.createIfNotExists({
      access: 'blob', // Public read access for blob-level (PDF previews)
    });
    if (createResponse.succeeded) {
      console.log(`✓ Azure container created: ${containerName}`);
    } else {
      console.log(`✓ Azure container ready: ${containerName}`);
    }
  } catch (err) {
    console.error('✗ Azure container setup failed:', err.message);
    console.error('  Check your AZURE_STORAGE_CONNECTION_STRING in .env');
  }
}

// ── Upload a file buffer to Azure ─────────────────────────
// Returns { blobName, blobUrl } on success.
async function uploadBlob(fileBuffer, originalFilename, mimeType) {
  const client = getClient();
  const containerClient = client.getContainerClient(containerName);
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

// ── Download a blob as a readable stream ──────────────────
// Returns { readableStream, contentType, contentLength }
async function downloadBlob(blobName) {
  const client = getClient();
  const containerClient = client.getContainerClient(containerName);
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  const downloadResponse = await blockBlobClient.download(0);

  return {
    readableStream: downloadResponse.readableStreamBody,
    contentType: downloadResponse.contentType,
    contentLength: downloadResponse.contentLength,
  };
}

// ── Download a blob as a Buffer ───────────────────────────
// Returns { buffer, contentType, contentLength }
async function downloadBlobBuffer(blobName) {
  const client = getClient();
  const containerClient = client.getContainerClient(containerName);
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  const downloadResponse = await blockBlobClient.downloadToBuffer();

  return {
    buffer: downloadResponse,
    contentType: downloadResponse.contentType,
    contentLength: downloadResponse.contentLength,
  };
}

// ── Delete a blob ─────────────────────────────────────────
async function deleteBlob(blobName) {
  try {
    const client = getClient();
    const containerClient = client.getContainerClient(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.deleteIfExists({ deleteSnapshots: 'include' });
    return true;
  } catch (err) {
    console.error('Azure delete failed:', err.message);
    return false;
  }
}

// ── Generate a SAS URL for time-limited access ────────────
// Useful if container access is set to private instead of blob-level public.
// Returns a URL valid for `expiresInMinutes` (default 60).
function generateSasUrl(blobName, expiresInMinutes = 60) {
  const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
  const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;

  if (!accountName || !accountKey) {
    // If using connection string only, fall back to public URL
    const client = getClient();
    const containerClient = client.getContainerClient(containerName);
    return containerClient.getBlockBlobClient(blobName).url;
  }

  const credential = new StorageSharedKeyCredential(accountName, accountKey);

  const startsOn = new Date();
  const expiresOn = new Date(startsOn.getTime() + expiresInMinutes * 60 * 1000);

  const sasParams = generateBlobSASQueryParameters(
    {
      containerName,
      blobName,
      permissions: BlobSASPermissions.parse('r'),
      startsOn,
      expiresOn,
    },
    credential
  );

  return `https://${accountName}.blob.core.windows.net/${containerName}/${blobName}?${sasParams}`;
}

module.exports = {
  ensureContainer,
  uploadBlob,
  downloadBlob,
  downloadBlobBuffer,
  deleteBlob,
  generateSasUrl,
};
