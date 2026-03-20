// config/azure-storage.js
// Azure Blob Storage client for file uploads, downloads, and deletions.
// Uses @azure/storage-blob SDK.
const { BlobServiceClient } = require('@azure/storage-blob');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
require('dotenv').config();

// ── Connection ────────────────────────────────────────────
// Supports two auth methods:
//   1. Connection string (simplest for dev)
//   2. Account name + account key
const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'documents';

let blobServiceClient;

if (connectionString) {
  blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
} else if (accountName && accountKey) {
  const { StorageSharedKeyCredential } = require('@azure/storage-blob');
  const credential = new StorageSharedKeyCredential(accountName, accountKey);
  blobServiceClient = new BlobServiceClient(
    `https://${accountName}.blob.core.windows.net`,
    credential
  );
} else {
  console.error('✗ Azure Storage not configured. Set AZURE_STORAGE_CONNECTION_STRING or AZURE_STORAGE_ACCOUNT_NAME + AZURE_STORAGE_ACCOUNT_KEY in .env');
}

// ── Ensure container exists on startup ────────────────────
async function ensureContainer() {
  if (!blobServiceClient) return;
  try {
    const containerClient = blobServiceClient.getContainerClient(containerName);
    await containerClient.createIfNotExists({
      access: 'blob', // Public read access for blob-level (PDF previews)
    });
    console.log(`✓ Azure container ready: ${containerName}`);
  } catch (err) {
    console.error('✗ Azure container setup failed:', err.message);
  }
}

// ── Upload a file buffer or stream to Azure ───────────────
// Returns { blobName, blobUrl } on success.
async function uploadBlob(fileBuffer, originalFilename, mimeType) {
  const containerClient = blobServiceClient.getContainerClient(containerName);
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
  const containerClient = blobServiceClient.getContainerClient(containerName);
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  const downloadResponse = await blockBlobClient.download(0);

  return {
    readableStream: downloadResponse.readableStreamBody,
    contentType: downloadResponse.contentType,
    contentLength: downloadResponse.contentLength,
  };
}

// ── Delete a blob ─────────────────────────────────────────
async function deleteBlob(blobName) {
  try {
    const containerClient = blobServiceClient.getContainerClient(containerName);
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
  if (!accountName || !accountKey) {
    // If using connection string, fall back to public URL
    const containerClient = blobServiceClient.getContainerClient(containerName);
    return containerClient.getBlockBlobClient(blobName).url;
  }

  const { StorageSharedKeyCredential, BlobSASPermissions, generateBlobSASQueryParameters } = require('@azure/storage-blob');
  const credential = new StorageSharedKeyCredential(accountName, accountKey);

  const startsOn = new Date();
  const expiresOn = new Date(startsOn.getTime() + expiresInMinutes * 60 * 1000);

  const sasParams = generateBlobSASQueryParameters(
    {
      containerName,
      blobName,
      permissions: BlobSASPermissions.parse('r'), // Read only
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
  deleteBlob,
  generateSasUrl,
};
