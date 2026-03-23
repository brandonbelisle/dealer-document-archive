// routes/files.js
// File upload, download, rename, delete — using Azure Blob Storage
const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { uploadBlob, downloadBlob, downloadBlobBuffer, deleteBlob, generateSasUrl } = require('../config/azure-storage');
const { requireAuth, requirePermission } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');
const { createNotificationsForUpload, createNotificationsForUnsortedUpload, createBatchNotifications } = require('./notifications');
const { extractPdfText } = require('../utils/pdfExtract');
const socket = require('../socket');

const router = express.Router();

// ── Multer config — memory storage (buffer for Azure upload) ──
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: (parseInt(process.env.MAX_FILE_SIZE_MB || '50', 10)) * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/bmp',
      'image/svg+xml'
    ];
    const allowedExts = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
    const ext = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));
    if (allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and image files are accepted'), false);
    }
  },
});

// ── GET /api/files ────────────────────────────────────────
// Query: ?folderId=xxx  OR  ?unsorted=true
router.get('/', requireAuth, async (req, res) => {
  try {
    let sql = `SELECT f.id, f.name, f.original_name, f.folder_id, f.mime_type, f.file_size_bytes,
                      f.page_count, f.status, f.error_message, f.file_storage_path,
                      f.uploaded_at, f.updated_at, f.uploaded_by,
                      u.display_name AS uploaded_by_name
               FROM files f
               LEFT JOIN users u ON f.uploaded_by = u.id`;
    const params = [];
    if (req.query.unsorted === 'true') {
      sql += ' WHERE f.folder_id IS NULL';
    } else if (req.query.folderId) {
      sql += ' WHERE f.folder_id = ?';
      params.push(req.query.folderId);
    }
    sql += ' ORDER BY f.uploaded_at DESC';
    const [rows] = await db.execute(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── PUT /api/files/:id/move ──────────────────────────────
// Move a file to a different folder (or set folderId to null for unsorted)
router.put('/:id/move', requireAuth, requirePermission('uploadFiles'), async (req, res) => {
  try {
    const { folderId } = req.body;

    const [existing] = await db.execute('SELECT id, name, folder_id FROM files WHERE id = ?', [req.params.id]);
    if (existing.length === 0) return res.status(404).json({ error: 'File not found' });

    if (folderId) {
      const [folder] = await db.execute('SELECT id, name FROM folders WHERE id = ?', [folderId]);
      if (folder.length === 0) return res.status(404).json({ error: 'Folder not found' });
      await db.execute('UPDATE files SET folder_id = ? WHERE id = ?', [folderId, req.params.id]);
      await logAudit('File Moved', `"${existing[0].name}" → "${folder[0].name}"`, req.user, req.ip);
    } else {
      await db.execute('UPDATE files SET folder_id = NULL WHERE id = ?', [req.params.id]);
      await logAudit('File Moved', `"${existing[0].name}" → Unsorted`, req.user, req.ip);
    }
    socket.filesChanged(folderId || existing[0].folder_id);

    const [updated] = await db.execute('SELECT * FROM files WHERE id = ?', [req.params.id]);
    res.json(updated[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /api/files/:id ────────────────────────────────────
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM files WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /api/files/:id/download ───────────────────────────
// Streams the file from Azure Blob Storage to the client
router.get('/:id/download', requireAuth, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT name, file_storage_path FROM files WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });

    const storagePath = rows[0].file_storage_path;
    if (!storagePath) return res.status(404).json({ error: 'No file stored' });

    // Extract blob name (handles both old URL format and new blob name format)
    const blobName = storagePath.includes('/') ? storagePath.split('/').pop().split('?')[0] : storagePath;

    const { readableStream, contentType, contentLength } = await downloadBlob(blobName);

    res.setHeader('Content-Type', contentType || 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${rows[0].name}"`);
    if (contentLength) res.setHeader('Content-Length', contentLength);

    readableStream.pipe(res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to download file' });
  }
});

// ── GET /api/files/:id/preview-url ────────────────────────
// Returns a SAS URL for previewing the file (regenerates if expired)
router.get('/:id/preview-url', requireAuth, async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT name, file_storage_path, preview_url, preview_url_generated_at FROM files WHERE id = ?',
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });

    const file = rows[0];
    const storagePath = file.file_storage_path;
    if (!storagePath) return res.status(404).json({ error: 'No file stored' });

    // Check if existing preview URL is still valid (less than 55 minutes old to be safe)
    const now = new Date();
    let previewUrl = file.preview_url;
    const generatedAt = file.preview_url_generated_at;
    
    if (previewUrl && generatedAt) {
      const minutesSinceGenerated = (now - new Date(generatedAt)) / (1000 * 60);
      if (minutesSinceGenerated < 55) {
        // URL is still valid, return it
        return res.json({ url: previewUrl, generatedAt: generatedAt, cached: true });
      }
    }

    // Extract blob name (handles both old URL format and new blob name format)
    const blobName = storagePath.includes('/') ? storagePath.split('/').pop().split('?')[0] : storagePath;

    // Generate fresh SAS URL valid for 1 hour
    previewUrl = await generateSasUrl(blobName, 60);

    // Save to database with timestamp
    await db.execute(
      'UPDATE files SET preview_url = ?, preview_url_generated_at = ? WHERE id = ?',
      [previewUrl, now, req.params.id]
    );

    res.json({ url: previewUrl, generatedAt: now, cached: false });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate preview URL' });
  }
});

// ── GET /api/files/:id/preview ───────────────────────────
// Proxies the file content with headers that allow iframe embedding
router.get('/:id/preview', requireAuth, async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT name, file_storage_path, mime_type FROM files WHERE id = ?',
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });

    const file = rows[0];
    const storagePath = file.file_storage_path;
    if (!storagePath) return res.status(404).json({ error: 'No file stored' });

    const blobName = storagePath.includes('/') ? storagePath.split('/').pop().split('?')[0] : storagePath;

    const { buffer, contentType } = await downloadBlobBuffer(blobName);

    res.setHeader('Content-Type', contentType || file.mime_type || 'application/pdf');
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('X-Frame-Options', 'ALLOWALL');
    res.setHeader('Content-Security-Policy', "frame-src 'self' 'unsafe-inline';");
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load preview' });
  }
});

// ── POST /api/files/upload ────────────────────────────────
// Multipart: file (PDF/image), folderId, extractedText (optional), pageCount (optional)
router.post('/upload', requireAuth, requirePermission('uploadFiles'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const { folderId, extractedText, pageCount } = req.body;

    // folderId is optional — if not provided, file goes to "unsorted"
    let folderName = 'Unsorted';
    if (folderId) {
      const [folder] = await db.execute('SELECT id, name FROM folders WHERE id = ?', [folderId]);
      if (folder.length === 0) {
        return res.status(404).json({ error: 'Folder not found' });
      }
      folderName = folder[0].name;
    }

    // Upload to Azure Blob Storage
    const { blobName, blobUrl } = await uploadBlob(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype || 'application/pdf'
    );

    const id = uuidv4();
    const isPdf = req.file.mimetype === 'application/pdf' || req.file.originalname.toLowerCase().endsWith('.pdf');
    const isImage = req.file.mimetype?.startsWith('image/');
    
    let finalExtractedText = extractedText || null;
    let finalPageCount = parseInt(pageCount || '0', 10);

    // Extract text server-side for PDFs if not provided by client
    if (isPdf && !finalExtractedText) {
      try {
        const extracted = await extractPdfText(req.file.buffer);
        if (extracted.text) {
          finalExtractedText = extracted.text;
          finalPageCount = extracted.pageCount;
        }
      } catch (extractErr) {
        console.error('Server-side PDF extraction failed:', extractErr.message);
      }
    }

    const status = (isImage || finalExtractedText) ? 'done' : 'processing';

    // Store only the blob name (not full URL) - SAS URLs are generated on demand
    await db.execute(
      `INSERT INTO files (id, name, original_name, folder_id, mime_type, file_size_bytes,
        page_count, extracted_text, file_storage_path, status, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        req.file.originalname,
        req.file.originalname,
        folderId || null,
        req.file.mimetype || 'application/pdf',
        req.file.size,
        finalPageCount,
        finalExtractedText,
        blobName,
        status,
        req.user.id,
      ]
    );

    await logAudit(
      'File Uploaded',
      `"${req.file.originalname}" (${finalPageCount || '?'} pages, ${formatSize(req.file.size)}) → "${folderName}"`,
      req.user,
      req.ip
    );

    // Create notifications for subscribers (skip if frontend will create batch notification)
    const skipNotification = req.body.skipNotification === 'true';
    if (!skipNotification) {
      createNotificationsForUpload({
        fileId: id,
        fileName: req.file.originalname,
        folderId: folderId || null,
        uploadedBy: req.user.id,
        uploadedByName: req.user.displayName || req.user.username || 'Unknown',
      });
    }
    if (folderId) socket.filesChanged(folderId);

    const [rows] = await db.execute('SELECT * FROM files WHERE id = ?', [id]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── PUT /api/files/:id/text ───────────────────────────────
// Update extracted text after client-side extraction
router.put('/:id/text', requireAuth, async (req, res) => {
  try {
    const { extractedText, pageCount } = req.body;
    await db.execute(
      'UPDATE files SET extracted_text = ?, page_count = ?, status = ? WHERE id = ?',
      [extractedText || '', parseInt(pageCount || '0', 10), 'done', req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /api/files/:id/extract ───────────────────────────
// Re-extract text from an existing PDF file
router.post('/:id/extract', requireAuth, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM files WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'File not found' });
    
    const file = rows[0];
    const isPdf = file.mime_type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      return res.status(400).json({ error: 'Text extraction only supported for PDF files' });
    }

    if (!file.file_storage_path) {
      return res.status(400).json({ error: 'File not stored in blob storage' });
    }

    const blobName = file.file_storage_path.includes('/') 
      ? file.file_storage_path.split('/').pop().split('?')[0] 
      : file.file_storage_path;

    const { buffer } = await downloadBlobBuffer(blobName);
    const extracted = await extractPdfText(buffer);
    
    await db.execute(
      'UPDATE files SET extracted_text = ?, page_count = ?, status = ? WHERE id = ?',
      [extracted.text, extracted.pageCount, 'done', req.params.id]
    );

    const [updated] = await db.execute('SELECT * FROM files WHERE id = ?', [req.params.id]);
    res.json({ 
      success: true, 
      extracted_text: extracted.text, 
      page_count: extracted.pageCount,
      file: updated[0]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to extract text from file' });
  }
});

// ── PUT /api/files/:id/rename ─────────────────────────────
router.put('/:id/rename', requireAuth, requirePermission('renameFiles'), async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Name required' });

    const [existing] = await db.execute('SELECT name, folder_id FROM files WHERE id = ?', [req.params.id]);
    if (existing.length === 0) return res.status(404).json({ error: 'Not found' });

    await db.execute('UPDATE files SET name = ? WHERE id = ?', [name.trim(), req.params.id]);
    await logAudit('File Renamed', `"${existing[0].name}" → "${name.trim()}"`, req.user, req.ip);
    if (existing[0].folder_id) socket.filesChanged(existing[0].folder_id);

    const [rows] = await db.execute('SELECT * FROM files WHERE id = ?', [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── DELETE /api/files/:id ─────────────────────────────────
router.delete('/:id', requireAuth, requirePermission('deleteFiles'), async (req, res) => {
  try {
    const [existing] = await db.execute('SELECT name, folder_id, file_storage_path FROM files WHERE id = ?', [req.params.id]);
    if (existing.length === 0) return res.status(404).json({ error: 'Not found' });

    const folderId = existing[0].folder_id;

    // Delete blob from Azure
    const storagePath = existing[0].file_storage_path;
    if (storagePath) {
      const blobName = storagePath.includes('/') ? storagePath.split('/').pop().split('?')[0] : storagePath;
      await deleteBlob(blobName);
    }

    await db.execute('DELETE FROM files WHERE id = ?', [req.params.id]);
    await logAudit('File Deleted', `"${existing[0].name}"`, req.user, req.ip);
    if (folderId) socket.filesChanged(folderId);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

function formatSize(b) {
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1048576).toFixed(1) + ' MB';
}

module.exports = router;
