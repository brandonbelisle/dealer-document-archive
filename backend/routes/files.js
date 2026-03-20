// routes/files.js
// File upload, download, rename, delete — using Azure Blob Storage
const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { uploadBlob, downloadBlob, deleteBlob } = require('../config/azure-storage');
const { requireAuth, requirePermission } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

const router = express.Router();

// ── Multer config — memory storage (buffer for Azure upload) ──
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: (parseInt(process.env.MAX_FILE_SIZE_MB || '50', 10)) * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are accepted'), false);
    }
  },
});

// ── GET /api/files ────────────────────────────────────────
// Query: ?folderId=xxx  OR  ?unsorted=true
router.get('/', requireAuth, async (req, res) => {
  try {
    let sql = `SELECT id, name, original_name, folder_id, mime_type, file_size_bytes,
                      page_count, status, error_message, file_storage_path,
                      uploaded_at, updated_at, uploaded_by
               FROM files`;
    const params = [];
    if (req.query.unsorted === 'true') {
      sql += ' WHERE folder_id IS NULL';
    } else if (req.query.folderId) {
      sql += ' WHERE folder_id = ?';
      params.push(req.query.folderId);
    }
    sql += ' ORDER BY uploaded_at DESC';
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

    // Extract blob name from full Azure URL
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

// ── POST /api/files/upload ────────────────────────────────
// Multipart: file (PDF), folderId, extractedText (optional), pageCount (optional)
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
    const status = extractedText ? 'done' : 'processing';

    // file_storage_path stores the full Azure blob URL for direct browser access
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
        parseInt(pageCount || '0', 10),
        extractedText || null,
        blobUrl,
        status,
        req.user.id,
      ]
    );

    await logAudit(
      'File Uploaded',
      `"${req.file.originalname}" (${pageCount || '?'} pages, ${formatSize(req.file.size)}) → "${folderName}"`,
      req.user,
      req.ip
    );

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

// ── PUT /api/files/:id/rename ─────────────────────────────
router.put('/:id/rename', requireAuth, requirePermission('renameFiles'), async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Name required' });

    const [existing] = await db.execute('SELECT name FROM files WHERE id = ?', [req.params.id]);
    if (existing.length === 0) return res.status(404).json({ error: 'Not found' });

    await db.execute('UPDATE files SET name = ? WHERE id = ?', [name.trim(), req.params.id]);
    await logAudit('File Renamed', `"${existing[0].name}" → "${name.trim()}"`, req.user, req.ip);

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
    const [existing] = await db.execute('SELECT name, file_storage_path FROM files WHERE id = ?', [req.params.id]);
    if (existing.length === 0) return res.status(404).json({ error: 'Not found' });

    // Delete blob from Azure
    const storagePath = existing[0].file_storage_path;
    if (storagePath) {
      const blobName = storagePath.includes('/') ? storagePath.split('/').pop().split('?')[0] : storagePath;
      await deleteBlob(blobName);
    }

    await db.execute('DELETE FROM files WHERE id = ?', [req.params.id]);
    await logAudit('File Deleted', `"${existing[0].name}"`, req.user, req.ip);

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
