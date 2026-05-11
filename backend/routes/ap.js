// routes/ap.js
// Accounts Payable API routes

const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { requireAuth, requirePermission } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');
const { processDocument, extractInvoiceFields, generateDuplicateKey, detectPDFSplits, splitPDF } = require('../services/ocrService');
const { compareExtraction, isAIEnabled } = require('../services/aiExtractService');
const { uploadBlob, deleteBlob, generateSasUrl } = require('../config/azure-storage');
const socket = require('../socket');

// ── Workflow Status Configuration ───────────────────────────
// Defines valid status transitions for AP documents
const WORKFLOW_STATES = {
  uploaded: { next: ['processing', 'rejected'] },
  processing: { next: ['classified', 'extracted', 'reviewing', 'uploaded', 'rejected'] },
  classified: { next: ['extracted', 'reviewing', 'rejected'] },
  extracted: { next: ['reviewing', 'approved', 'rejected', 'archived'] },
  reviewing: { next: ['extracted', 'approved', 'rejected', 'archived'] },
  approved: { next: ['posted', 'rejected', 'archived'] },
  posted: { next: ['archived'] },
  rejected: { next: ['uploaded', 'archived'] },
  archived: { next: [] },
};

function isValidTransition(currentStatus, newStatus) {
  if (currentStatus === newStatus) return true;
  const allowedNext = WORKFLOW_STATES[currentStatus]?.next || [];
  return allowedNext.includes(newStatus);
}

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

    // Generate preview URL
    let previewUrl = null;
    if (d.file_storage_path) {
      try {
        const blobName = d.file_storage_path.includes('/') 
          ? d.file_storage_path.split('/').pop().split('?')[0] 
          : d.file_storage_path;
        previewUrl = await generateSasUrl(blobName, 60);
      } catch (urlErr) {
        console.error('Failed to generate preview URL:', urlErr.message);
      }
    }

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
          previewUrl: previewUrl,
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

    // Create AP document record for the original upload
    const apDocId = uuidv4();
    await db.execute(
      `INSERT INTO ap_documents (id, file_id, status, document_type, created_by)
       VALUES (?, ?, 'processing', 'unknown', ?)`,
      [apDocId, fileId, req.user.id]
    );

    // Run OCR + splitting asynchronously (don't block response)
    processAndExtractWithSplits(apDocId, fileId, file.buffer, file.mimetype, req.user, file.originalname, apFolderId);

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

// ── PUT /api/ap/documents/:id ───────────────────────────────
// Update document type and/or workflow status
router.put('/documents/:id', requireAuth, requirePermission('ap_review'), async (req, res) => {
  try {
    const { id } = req.params;
    const { documentType, status, isDuplicate, duplicateOfId, vendorName, invoiceNumber, invoiceDate, invoiceAmount, poNumber } = req.body;

    // Validate document exists
    const [docs] = await db.execute(
      'SELECT id, file_id, document_type, status FROM ap_documents WHERE id = ?',
      [id]
    );

    if (docs.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const doc = docs[0];

    // Validate document_type if provided
    const validTypes = ['invoice', 'non_invoice', 'unknown'];
    if (documentType && !validTypes.includes(documentType)) {
      return res.status(400).json({ error: 'Invalid document type' });
    }

    // Validate status if provided
    const validStatuses = ['uploaded', 'processing', 'classified', 'extracted', 'reviewing', 'approved', 'posted', 'rejected', 'archived'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const newType = documentType || doc.document_type;
    const newStatus = status || doc.status;
    const newIsDuplicate = isDuplicate !== undefined ? (isDuplicate ? 1 : 0) : doc.is_duplicate_flag;
    const newDuplicateOfId = duplicateOfId !== undefined ? duplicateOfId : doc.duplicate_of_id;

    // Validate workflow transition
    if (status && !isValidTransition(doc.status, status)) {
      return res.status(400).json({
        error: `Invalid workflow transition from "${doc.status}" to "${status}"`,
        currentStatus: doc.status,
        requestedStatus: status,
        allowedTransitions: WORKFLOW_STATES[doc.status]?.next || [],
      });
    }

    // Build update query dynamically
    const updates = [];
    const params = [];

    if (documentType) { updates.push('document_type = ?'); params.push(documentType); }
    if (status) { updates.push('status = ?'); params.push(status); }
    if (isDuplicate !== undefined) { updates.push('is_duplicate_flag = ?'); params.push(isDuplicate ? 1 : 0); }
    if (duplicateOfId !== undefined) { updates.push('duplicate_of_id = ?'); params.push(duplicateOfId); }
    if (vendorName !== undefined) { updates.push('vendor_name = ?'); params.push(vendorName || null); }
    if (invoiceNumber !== undefined) { updates.push('invoice_number = ?'); params.push(invoiceNumber || null); }
    if (invoiceDate !== undefined) { updates.push('invoice_date = ?'); params.push(invoiceDate || null); }
    if (invoiceAmount !== undefined) {
      const cleanAmt = invoiceAmount ? parseFloat(invoiceAmount) : null;
      updates.push('invoice_amount = ?'); params.push(cleanAmt);
    }
    if (poNumber !== undefined) { updates.push('po_number = ?'); params.push(poNumber || null); }

    if (updates.length > 0) {
      updates.push('updated_at = NOW()');
      params.push(id);
      await db.execute(
        `UPDATE ap_documents SET ${updates.join(', ')} WHERE id = ?`,
        params
      );
    }

    // Log status history
    if (status && status !== doc.status) {
      await db.execute(
        `INSERT INTO ap_status_history (id, document_id, old_status, new_status, changed_by, changed_at)
         VALUES (UUID(), ?, ?, ?, ?, NOW())`,
        [id, doc.status, status, req.user.id]
      );
    }

    await logAudit(
      'AP Document Updated',
      `Document ${id}: type=${newType}, status=${newStatus}`,
      req.user,
      req.ip
    );

    socket.apDocumentsChanged();

    res.json({ success: true, documentId: id, documentType: newType, status: newStatus });
  } catch (err) {
    console.error('Failed to update AP document:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /api/ap/documents/:id/history ───────────────────────
// Get status change history for a document
router.get('/documents/:id/history', requireAuth, requirePermission('view_ap'), async (req, res) => {
  try {
    const { id } = req.params;

    const [history] = await db.execute(
      `SELECT h.id, h.old_status, h.new_status, h.changed_at,
              u.display_name as changed_by_name
       FROM ap_status_history h
       LEFT JOIN users u ON h.changed_by = u.id
       WHERE h.document_id = ?
       ORDER BY h.changed_at DESC`,
      [id]
    );

    res.json({ history });
  } catch (err) {
    console.error('Failed to get status history:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /api/ap/documents/:id/excede ────────────────────────
// Check if invoice exists in Excede (read-only lookup)
router.get('/documents/:id/excede', requireAuth, requirePermission('view_ap'), async (req, res) => {
  try {
    const { id } = req.params;

    // Get document details
    const [docs] = await db.execute(
      `SELECT vendor_name, invoice_number, invoice_date, invoice_amount
       FROM ap_documents WHERE id = ?`,
      [id]
    );

    if (docs.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const doc = docs[0];

    // Get DMS settings
    const [settings] = await db.execute('SELECT * FROM dms_settings WHERE id = 1');

    if (settings.length === 0 || !settings[0].server) {
      return res.json({
        checked: false,
        message: 'Excede connection not configured',
        found: false,
      });
    }

    const dms = settings[0];

    // Decrypt password
    const crypto = require('crypto');
    const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-encryption-key-32-chars!!';
    let password = '';
    if (dms.password_encrypted) {
      const [ivHex, data] = dms.password_encrypted.split(':');
      const iv = Buffer.from(ivHex, 'hex');
      const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      password = decipher.update(data, 'hex', 'utf8') + decipher.final('utf8');
    }

    // Connect to Excede and query
    const sql = require('mssql');
    const config = {
      server: dms.server,
      port: dms.port || 1433,
      database: dms.database_name,
      user: dms.username,
      password: password,
      options: {
        trustServerCertificate: Boolean(dms.trust_certificate),
        encrypt: Boolean(dms.encrypt_connection),
      },
      connectionTimeout: 10000,
      requestTimeout: 10000,
    };

    let found = false;
    let excedeData = null;

    try {
      await sql.connect(config);

      // Query for matching invoice - adjust table/column names as needed for Excede schema
      const query = `
        SELECT TOP 1
          VendorID,
          VendorName,
          InvoiceNo,
          InvoiceDate,
          InvoiceAmount,
          PONumber,
          PostedDate
        FROM APInvoices
        WHERE (VendorName LIKE @vendor OR @vendor IS NULL)
          AND (InvoiceNo = @invoice OR @invoice IS NULL)
          AND (InvoiceDate = @date OR @date IS NULL)
        ORDER BY PostedDate DESC
      `;

      const result = await sql.query(query, {
        vendor: doc.vendor_name ? `%${doc.vendor_name}%` : null,
        invoice: doc.invoice_number || null,
        date: doc.invoice_date || null,
      });

      if (result.recordset.length > 0) {
        found = true;
        excedeData = result.recordset[0];
      }

      await sql.close();
    } catch (dmsErr) {
      console.error('Excede lookup failed:', dmsErr.message);
      return res.json({
        checked: true,
        found: false,
        error: 'Failed to connect to Excede',
        details: dmsErr.message,
      });
    }

    res.json({
      checked: true,
      found,
      excedeData,
      document: {
        vendorName: doc.vendor_name,
        invoiceNumber: doc.invoice_number,
        invoiceDate: doc.invoice_date,
        invoiceAmount: doc.invoice_amount,
      },
    });
  } catch (err) {
    console.error('Failed to check Excede:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Helper: Save extracted fields ──────────────────────────
async function saveExtractedFields(apDocId, fields) {
  for (const field of fields) {
    await db.execute(
      `INSERT INTO ap_extracted_fields (id, document_id, field_name, value, confidence_score)
       VALUES (UUID(), ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE value = ?, confidence_score = ?`,
      [apDocId, field.field, field.value, field.confidence, field.value, field.confidence]
    );
  }
}

// ── Helper: Update ap_document with extracted data ─────────
async function updateDocumentWithResults(apDocId, documentType, status, fields, text) {
  const cleanAmount = (val) => {
    if (!val) return null;
    const cleaned = val.replace(/[$,\s]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  };

  const cleanDate = (val) => {
    if (!val) return null;
    const match = val.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
    if (match) {
      let [_, m, d, y] = match;
      if (y.length === 2) y = '20' + y;
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
    return null;
  };

  const amountField = fields.find(f => f.field === 'invoice_amount');
  const dateField = fields.find(f => f.field === 'invoice_date');

  await db.execute(
    `UPDATE ap_documents
     SET status = ?,
         document_type = ?,
         vendor_name = ?,
         invoice_number = ?,
         invoice_date = ?,
         invoice_amount = ?,
         po_number = ?,
         extracted_text = ?
     WHERE id = ?`,
    [
      status,
      documentType,
      fields.find(f => f.field === 'vendor_name')?.value || null,
      fields.find(f => f.field === 'invoice_number')?.value || null,
      cleanDate(dateField?.value),
      cleanAmount(amountField?.value),
      fields.find(f => f.field === 'po_number')?.value || null,
      text.substring(0, 65535),
      apDocId,
    ]
  );

  await saveExtractedFields(apDocId, fields);
}

// ── Helper: Check for duplicate invoices ───────────────────
async function checkDuplicate(apDocId, fields) {
  const cleanAmount = (val) => {
    if (!val) return null;
    const cleaned = val.replace(/[$,\s]/g, '');
    return parseFloat(cleaned) || null;
  };
  const cleanDate = (val) => {
    if (!val) return null;
    const match = val.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
    if (match) {
      let [_, m, d, y] = match;
      if (y.length === 2) y = '20' + y;
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
    return null;
  };

  const vendorName = fields.find(f => f.field === 'vendor_name')?.value;
  const invoiceNum = fields.find(f => f.field === 'invoice_number')?.value;
  const invoiceDate = cleanDate(fields.find(f => f.field === 'invoice_date')?.value);
  const invoiceAmt = cleanAmount(fields.find(f => f.field === 'invoice_amount')?.value);

  const dupKey = generateDuplicateKey(vendorName, invoiceNum, invoiceDate, invoiceAmt);

  if (dupKey) {
    const [existingDups] = await db.execute(
      `SELECT id FROM ap_documents
       WHERE id != ?
         AND document_type = 'invoice'
         AND is_duplicate_flag = 0
         AND vendor_name IS NOT NULL
         AND invoice_number IS NOT NULL
         AND (
           (vendor_name = ? AND invoice_number = ? AND invoice_date = ? AND invoice_amount = ?)
           OR (
             LOWER(REPLACE(vendor_name, ' ', '')) = LOWER(REPLACE(?, ' ', ''))
             AND LOWER(REPLACE(invoice_number, ' ', '')) = LOWER(REPLACE(?, ' ', ''))
             AND invoice_date = ?
             AND ABS(invoice_amount - ?) < 0.01
           )
         )
       LIMIT 1`,
      [apDocId, vendorName, invoiceNum, invoiceDate, invoiceAmt, vendorName, invoiceNum, invoiceDate, invoiceAmt]
    );

    if (existingDups.length > 0) {
      await db.execute(
        'UPDATE ap_documents SET is_duplicate_flag = 1, duplicate_of_id = ? WHERE id = ?',
        [existingDups[0].id, apDocId]
      );
      console.log(`Duplicate detected: AP document ${apDocId} matches ${existingDups[0].id}`);
    }
  }
}

// ── Background processing: OCR, splitting, and field extraction ─────────
async function processAndExtractWithSplits(originalApDocId, originalFileId, fileBuffer, mimeType, user, originalName, apFolderId) {
  try {
    console.log(`Starting OCR processing for AP document ${originalApDocId}`);

    // Run OCR (this also detects splits for text-based PDFs)
    const result = await processDocument(fileBuffer, mimeType);

    // Update file page count for the original
    await db.execute(
      'UPDATE files SET page_count = ? WHERE id = ?',
      [result.pages || 1, originalFileId]
    );

    // If splits detected and more than 1 segment, physically split the PDF
    if (result.segments && result.segments.length > 1) {
      console.log(`PDF splitting detected ${result.segments.length} invoices. Physically splitting PDF...`);

      // Get original file info for deletion
      const [origFiles] = await db.execute(
        'SELECT file_storage_path FROM files WHERE id = ?',
        [originalFileId]
      );
      const origStoragePath = origFiles.length > 0 ? origFiles[0].file_storage_path : null;

      // Split the PDF into separate buffers
      const splitBuffers = await splitPDF(fileBuffer, result.segments);
      console.log(`Split PDF into ${splitBuffers.length} separate files`);

      // Create a document for each split
      for (let i = 0; i < result.segments.length; i++) {
        const segment = result.segments[i];
        const splitBuffer = splitBuffers[i];
        const segmentFields = extractInvoiceFields(segment.text, result.sourceConfidence);

        // Determine document type
        const hasInvoiceFields = segmentFields.some(f =>
          ['invoice_number', 'invoice_amount', 'invoice_date'].includes(f.field)
        );
        const hasVendorField = segmentFields.some(f => f.field === 'vendor_name');

        let documentType;
        if (hasInvoiceFields && hasVendorField) {
          documentType = 'invoice';
        } else if (!hasInvoiceFields && hasVendorField) {
          documentType = 'non_invoice';
        } else if (hasInvoiceFields && !hasVendorField) {
          documentType = 'invoice';
        } else {
          documentType = 'unknown';
        }
        const status = (documentType === 'invoice') ? 'extracted' : 'reviewing';

        if (i === 0) {
          // First segment: re-use the original file record but replace the blob
          const splitName = originalName.replace(/\.pdf$/i, `_part1.pdf`);
          const { blobName: splitBlobName } = await uploadBlob(
            splitBuffer,
            splitName,
            mimeType
          );

          // Update original file record with new blob
          await db.execute(
            `UPDATE files SET name = ?, original_name = ?, file_size_bytes = ?, page_count = ?, file_storage_path = ?
             WHERE id = ?`,
            [splitName, splitName, splitBuffer.length, segment.endPage - segment.startPage + 1, splitBlobName, originalFileId]
          );

          // Update original ap_document
          await updateDocumentWithResults(originalApDocId, documentType, status, segmentFields, segment.text);
          if (documentType === 'invoice') await checkDuplicate(originalApDocId, segmentFields);
        } else {
          // Subsequent segments: create new file + ap_document records
          const splitName = originalName.replace(/\.pdf$/i, `_part${i + 1}.pdf`);
          const { blobName: splitBlobName } = await uploadBlob(
            splitBuffer,
            splitName,
            mimeType
          );

          const splitFileId = uuidv4();
          await db.execute(
            `INSERT INTO files (id, name, original_name, folder_id, mime_type, file_size_bytes, page_count, file_storage_path, status, uploaded_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'done', ?)`,
            [splitFileId, splitName, splitName, apFolderId, mimeType, splitBuffer.length,
             segment.endPage - segment.startPage + 1, splitBlobName, user.id]
          );

          const segmentDocId = uuidv4();
          await db.execute(
            `INSERT INTO ap_documents (id, file_id, status, document_type, vendor_name, invoice_number,
             invoice_date, invoice_amount, po_number, extracted_text, created_by, is_duplicate_flag)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
            [
              segmentDocId, splitFileId, status, documentType,
              segmentFields.find(f => f.field === 'vendor_name')?.value || null,
              segmentFields.find(f => f.field === 'invoice_number')?.value || null,
              segmentFields.find(f => f.field === 'invoice_date')?.value || null,
              segmentFields.find(f => f.field === 'invoice_amount')?.value || null,
              segmentFields.find(f => f.field === 'po_number')?.value || null,
              segment.text.substring(0, 65535),
              user.id,
            ]
          );
          await saveExtractedFields(segmentDocId, segmentFields);
          if (documentType === 'invoice') await checkDuplicate(segmentDocId, segmentFields);
          console.log(`Created split document ${segmentDocId} for pages ${segment.startPage}-${segment.endPage}`);
        }
      }

      // Delete the original blob from Azure
      if (origStoragePath) {
        try {
          const origBlobName = origStoragePath.includes('/')
            ? origStoragePath.split('/').pop().split('?')[0]
            : origStoragePath;
          await deleteBlob(origBlobName);
          console.log(`Deleted original blob: ${origBlobName}`);
        } catch (delErr) {
          console.error('Failed to delete original blob:', delErr.message);
        }
      }

    } else {
      // No splits - process as single document
      const hasInvoiceFields = result.fields.some(f =>
        ['invoice_number', 'invoice_amount', 'invoice_date'].includes(f.field)
      );
      const hasVendorField = result.fields.some(f => f.field === 'vendor_name');

      let documentType;
      if (hasInvoiceFields && hasVendorField) {
        documentType = 'invoice';
      } else if (!hasInvoiceFields && hasVendorField) {
        documentType = 'non_invoice';
      } else if (hasInvoiceFields && !hasVendorField) {
        documentType = 'invoice';
      } else {
        documentType = 'unknown';
      }

      const status = (documentType === 'invoice') ? 'extracted' : 'reviewing';

      await updateDocumentWithResults(originalApDocId, documentType, status, result.fields, result.text);
      if (documentType === 'invoice') await checkDuplicate(originalApDocId, result.fields);
    }

    console.log(`OCR processing completed for AP document ${originalApDocId}`);
    socket.apDocumentsChanged();
  } catch (err) {
    console.error(`OCR processing failed for AP document ${originalApDocId}:`, err);
    await db.execute(
      'UPDATE ap_documents SET status = ? WHERE id = ?',
      ['uploaded', originalApDocId]
    );
    socket.apDocumentsChanged();
  }
}

// ── POST /api/ap/test-extraction ────────────────────────────
// Admin endpoint: compare regex vs AI extraction on raw text
router.post('/test-extraction', requireAuth, requirePermission('ap_review'), async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'text is required' });
    }

    const result = await compareExtraction(text);
    res.json({
      aiEnabled: isAIEnabled(),
      regex: result.regex,
      ai: result.ai,
      aiRaw: result.aiRaw,
      aiError: result.aiError,
    });
  } catch (err) {
    console.error('Test extraction failed:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/ap/compare/:id ────────────────────────────────
// Admin endpoint: compare regex vs AI on an existing document
router.post('/compare/:id', requireAuth, requirePermission('ap_review'), async (req, res) => {
  try {
    const [docs] = await db.execute(
      'SELECT extracted_text FROM ap_documents WHERE id = ?',
      [req.params.id]
    );
    if (docs.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const text = docs[0].extracted_text || '';
    if (!text.trim()) {
      return res.status(400).json({ error: 'Document has no extracted text' });
    }

    const result = await compareExtraction(text);
    res.json({
      aiEnabled: isAIEnabled(),
      documentId: req.params.id,
      regex: result.regex,
      ai: result.ai,
      aiRaw: result.aiRaw,
      aiError: result.aiError,
    });
  } catch (err) {
    console.error('Compare extraction failed:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/ap/ai-status ───────────────────────────────────
// Check if AI extraction is configured and available
router.get('/ai-status', requireAuth, requirePermission('view_ap'), async (req, res) => {
  res.json({
    enabled: isAIEnabled(),
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    apiKeyConfigured: !!process.env.OPENAI_API_KEY,
  });
});

module.exports = router;
