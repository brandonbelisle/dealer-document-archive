// routes/ap.js
// Accounts Payable API routes

const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { requireAuth, requirePermission } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');
const { processDocument } = require('../services/ocrService');
const { uploadBlob, deleteBlob } = require('../config/azure-storage');
const socket = require('../socket');

const router = express.Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and image files are allowed'), false);
    }
  },
});

// ── Helper: Get AP folder ID from settings ──────────────────
async function getAPFolderId() {
  const [rows] = await db.execute(
    'SELECT value FROM app_settings WHERE `key` = "ap_folder_id" LIMIT 1'
  );
  return rows.length > 0 ? rows[0].value : null;
}

// ── Helper: Get folder details ──────────────────────────────
async function getFolderDetails(folderId) {
  const [rows] = await db.execute(
    'SELECT id, name, location_id, department_id FROM folders WHERE id = ?',
    [folderId]
  );
  return rows.length > 0 ? rows[0] : null;
}

// ── GET /api/ap/documents ───────────────────────────────────
// List all AP documents with extracted fields
router.get('/documents', requireAuth, requirePermission('view_ap'), async (req, res) => {
  try {
    const [docs] = await db.execute(`
      SELECT
        d.id,
        d.file_id,
        d.status,
        d.document_type,
        d.vendor_name,
        d.invoice_number,
        d.invoice_date,
        d.invoice_amount,
        d.po_number,
        d.is_duplicate_flag,
        d.duplicate_of_id,
        d.created_at,
        d.updated_at,
        f.name AS file_name,
        f.original_name,
        f.mime_type,
        f.file_size_bytes,
        f.page_count,
        f.file_storage_path,
        u.display_name AS uploaded_by_name
      FROM ap_documents d
      JOIN files f ON d.file_id = f.id
      LEFT JOIN users u ON f.uploaded_by = u.id
      ORDER BY d.created_at DESC
    `);

    // Fetch extracted fields for all documents
    const docIds = docs.map(d => d.id);
    let fields = [];
    if (docIds.length > 0) {
      const placeholders = docIds.map(() => '?').join(',');
      const [fieldRows] = await db.execute(
        `SELECT document_id, field_name, value, confidence_score
         FROM ap_extracted_fields
         WHERE document_id IN (${placeholders})`,
        docIds
      );
      fields = fieldRows;
    }

    // Group fields by document
    const fieldsByDoc = {};
    for (const f of fields) {
      if (!fieldsByDoc[f.document_id]) fieldsByDoc[f.document_id] = [];
      fieldsByDoc[f.document_id].push({
        field: f.field_name,
        value: f.value,
        confidence: f.confidence_score,
      });
    }

    const documents = docs.map(d => ({
      id: d.id,
      fileId: d.file_id,
      status: d.status,
      documentType: d.document_type,
      vendorName: d.vendor_name,
      invoiceNumber: d.invoice_number,
      invoiceDate: d.invoice_date,
      invoiceAmount: d.invoice_amount,
      poNumber: d.po_number,
      isDuplicate: d.is_duplicate_flag === 1,
      duplicateOfId: d.duplicate_of_id,
      createdAt: d.created_at,
      updatedAt: d.updated_at,
      file: {
        name: d.file_name,
        originalName: d.original_name,
        mimeType: d.mime_type,
        size: d.file_size_bytes,
        pages: d.page_count,
        storagePath: d.file_storage_path,
      },
      uploadedBy: d.uploaded_by_name,
      extractedFields: fieldsByDoc[d.id] || [],
    }));

    res.json({ documents });
  } catch (err) {
    console.error('Failed to list AP documents:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /api/ap/documents/:id ───────────────────────────────
// Get single AP document with full details
router.get('/documents/:id', requireAuth, requirePermission('view_ap'), async (req, res) => {
  try {
    const { id } = req.params;

    const [docs] = await db.execute(`
      SELECT
        d.id,
        d.file_id,
        d.status,
        d.document_type,
        d.vendor_name,
        d.invoice_number,
        d.invoice_date,
        d.invoice_amount,
        d.po_number,
        d.extracted_text,
        d.is_duplicate_flag,
        d.duplicate_of_id,
        d.created_at,
        d.updated_at,
        f.name AS file_name,
        f.original_name,
        f.mime_type,
        f.file_size_bytes,
        f.page_count,
        f.file_storage_path,
        u.display_name AS uploaded_by_name
      FROM ap_documents d
      JOIN files f ON d.file_id = f.id
      LEFT JOIN users u ON f.uploaded_by = u.id
      WHERE d.id = ?
      LIMIT 1
    `, [id]);

    if (docs.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const d = docs[0];

    // Get extracted fields
    const [fields] = await db.execute(
      'SELECT field_name, value, confidence_score FROM ap_extracted_fields WHERE document_id = ?',
      [id]
    );

    res.json({
      document: {
        id: d.id,
        fileId: d.file_id,
        status: d.status,
        documentType: d.document_type,
        vendorName: d.vendor_name,
        invoiceNumber: d.invoice_number,
        invoiceDate: d.invoice_date,
        invoiceAmount: d.invoice_amount,
        poNumber: d.po_number,
        extractedText: d.extracted_text,
        isDuplicate: d.is_duplicate_flag === 1,
        duplicateOfId: d.duplicate_of_id,
        createdAt: d.created_at,
        updatedAt: d.updated_at,
        file: {
          name: d.file_name,
          originalName: d.original_name,
          mimeType: d.mime_type,
          size: d.file_size_bytes,
          pages: d.page_count,
          storagePath: d.file_storage_path,
        },
        uploadedBy: d.uploaded_by_name,
        extractedFields: fields.map(f => ({
          field: f.field_name,
          value: f.value,
          confidence: f.confidence_score,
        })),
      },
    });
  } catch (err) {
    console.error('Failed to get AP document:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /api/ap/upload ─────────────────────────────────────
// Upload a document to AP, save to DDA folder, run OCR
router.post('/upload', requireAuth, requirePermission('ap_upload'), upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const apFolderId = await getAPFolderId();
    if (!apFolderId) {
      return res.status(500).json({ error: 'AP folder not configured' });
    }

    const folder = await getFolderDetails(apFolderId);
    if (!folder) {
      return res.status(500).json({ error: 'AP folder not found' });
    }

    // Upload file to Azure Blob Storage (same as DDA)
    const { blobName } = await uploadBlob(
      file.buffer,
      file.originalname,
      file.mimetype || 'application/pdf'
    );

    const fileId = uuidv4();

    // Insert into files table (DDA)
    await db.execute(
      `INSERT INTO files (id, name, original_name, folder_id, mime_type, file_size_bytes, page_count, file_storage_path, status, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'done', ?)`,
      [fileId, file.originalname, file.originalname, apFolderId, file.mimetype, file.size, 0, blobName, req.user.id]
    );

    // Create AP document record
    const apDocId = uuidv4();
    await db.execute(
      `INSERT INTO ap_documents (id, file_id, status, document_type, created_by)
       VALUES (?, ?, 'processing', 'unknown', ?)`,
      [apDocId, fileId, req.user.id]
    );

    // Run OCR asynchronously (don't block response)
    processAndExtract(apDocId, fileId, file.buffer, file.mimetype, req.user);

    await logAudit('AP Document Uploaded', `File: ${file.originalname}`, req.user, req.ip);

    socket.filesChanged(apFolderId);

    res.status(201).json({
      documentId: apDocId,
      fileId,
      status: 'processing',
      message: 'Document uploaded and is being processed',
    });
  } catch (err) {
    console.error('Failed to upload AP document:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── DELETE /api/ap/documents/:id ────────────────────────────
router.delete('/documents/:id', requireAuth, requirePermission('ap_upload'), async (req, res) => {
  try {
    const { id } = req.params;

    // Get document details
    const [docs] = await db.execute(
      'SELECT file_id FROM ap_documents WHERE id = ?',
      [id]
    );

    if (docs.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const fileId = docs[0].file_id;

    // Get file storage path
    const [files] = await db.execute(
      'SELECT file_storage_path, folder_id FROM files WHERE id = ?',
      [fileId]
    );

    // Delete from Azure storage
    if (files.length > 0 && files[0].file_storage_path) {
      try {
        const blobName = files[0].file_storage_path.includes('/')
          ? files[0].file_storage_path.split('/').pop().split('?')[0]
          : files[0].file_storage_path;
        await deleteBlob(blobName);
      } catch (storageErr) {
        console.error('Failed to delete blob from storage:', storageErr);
      }
    }

    // Delete AP document (cascades to extracted fields via FK)
    await db.execute('DELETE FROM ap_documents WHERE id = ?', [id]);
    // Delete file record
    await db.execute('DELETE FROM files WHERE id = ?', [fileId]);

    await logAudit('AP Document Deleted', `Document ID: ${id}`, req.user, req.ip);

    if (files.length > 0 && files[0].folder_id) {
      socket.filesChanged(files[0].folder_id);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Failed to delete AP document:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Background processing: OCR and field extraction ─────────
async function processAndExtract(apDocId, fileId, fileBuffer, mimeType, user) {
  try {
    console.log(`Starting OCR processing for AP document ${apDocId}`);

    // Run OCR
    const result = await processDocument(fileBuffer, mimeType);

    // Determine document type based on field extraction
    const hasInvoiceFields = result.fields.some(f =>
      ['invoice_number', 'invoice_amount', 'invoice_date'].includes(f.field)
    );
    const documentType = hasInvoiceFields ? 'invoice' : 'non_invoice';

    // Update ap_documents with results
    await db.execute(
      `UPDATE ap_documents
       SET status = 'extracted',
           document_type = ?,
           vendor_name = ?,
           invoice_number = ?,
           invoice_date = ?,
           invoice_amount = ?,
           po_number = ?,
           extracted_text = ?
       WHERE id = ?`,
      [
        documentType,
        result.fields.find(f => f.field === 'vendor_name')?.value || null,
        result.fields.find(f => f.field === 'invoice_number')?.value || null,
        result.fields.find(f => f.field === 'invoice_date')?.value || null,
        result.fields.find(f => f.field === 'invoice_amount')?.value || null,
        result.fields.find(f => f.field === 'po_number')?.value || null,
        result.text.substring(0, 65535), // Truncate if too long
        apDocId,
      ]
    );

    // Update file page count
    await db.execute(
      'UPDATE files SET page_count = ? WHERE id = ?',
      [result.pages, fileId]
    );

    // Insert extracted fields
    for (const field of result.fields) {
      await db.execute(
        `INSERT INTO ap_extracted_fields (id, document_id, field_name, value, confidence_score)
         VALUES (UUID(), ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE value = ?, confidence_score = ?`,
        [apDocId, field.field, field.value, field.confidence, field.value, field.confidence]
      );
    }

    console.log(`OCR processing completed for AP document ${apDocId}`);

    // Emit socket event for real-time updates
    socket.apDocumentsChanged();
  } catch (err) {
    console.error(`OCR processing failed for AP document ${apDocId}:`, err);

    // Update status to error
    await db.execute(
      'UPDATE ap_documents SET status = ? WHERE id = ?',
      ['uploaded', apDocId] // Keep as uploaded so user can retry
    );

    socket.apDocumentsChanged();
  }
}

module.exports = router;
