// services/ocrService.js
// OCR processing for Accounts Payable documents
// Supports: images (jpg/png), text-based PDFs, scanned PDFs

const { createWorker } = require('tesseract.js');
const pdfParse = require('pdf-parse');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
const { createCanvas } = require('canvas');

// Invoice field extraction patterns
// Ordered by specificity: most explicit patterns first
const FIELD_PATTERNS = {
  vendor_name: [
    // Explicit labels with colon/space separator
    /(?:from|vendor|seller|billed by|remit to|sold by|ship from)[\s:]+([A-Z][A-Za-z0-9\s&.,'\-]{2,60}(?:Inc\.?|LLC|Ltd\.?|Corp\.?|Corporation|Company|Co\.?|Limited|LLP|PLC|GmbH|LLC\.?)?)/i,
    /(?:bill\s*to)[\s:]+([A-Z][A-Za-z0-9\s&.,'\-]{2,60}(?:Inc\.?|LLC|Ltd\.?|Corp\.?|Corporation|Company|Co\.?|Limited|LLP|PLC|GmbH)?)/i,
    // Line that ends with a company suffix
    /^([A-Z][A-Za-z0-9\s&.,'\-]{2,60}(?:Inc\.?|LLC|Ltd\.?|Corp\.?|Corporation|Company|Co\.?|Limited|LLP|PLC|GmbH))\.?$/im,
    // Industry name patterns near top
    /^([A-Z][A-Za-z0-9\s&.,'\-]{3,50}(?:Supply|Auto|Parts|Service|Dealer|Group|Motors|Equipment|Technologies|Systems|Solutions))/im,
  ],
  invoice_number: [
    // Most explicit: "Invoice #: 12345", "Invoice No. 12345", "Invoice Number: 12345"
    /(?:invoice|inv)[\s]*(?:#|no\.?|number|num\.?)[\s:]*([A-Z0-9.\-_]{2,30})/i,
    // "Invoice #12345" (no space)
    /(?:invoice|inv)[\s]*#([A-Z0-9.\-_]{2,30})/i,
    // "Invoice 12345" where number starts with a digit
    /(?:invoice|inv)[\s]+(\d[A-Z0-9.\-_]{1,29})(?=\s|$)/i,
    // "Inv. 12345" or "Inv: 12345"
    /(?:inv\.?)[\s:]*([A-Z0-9.\-_]{2,30})/i,
    // "Invoice Ref: 12345", "Invoice ID: 12345"
    /(?:invoice|inv)[\s]*(?:id|ref|reference)[\s:]*([A-Z0-9.\-_]{2,30})/i,
    // "INV-12345" or "INV12345"
    /\b(?:INV|inv)[\-_]?([A-Z0-9.\-_]{2,30})/i,
    // Bare "# 12345" or "#12345" at line start
    /(?:^|\s)#\s*([A-Z0-9.\-_]{3,20})(?=\s|$)/im,
    // "No. 12345"
    /\bno\.?[\s:]*([A-Z0-9.\-_]{2,30})/i,
    // Document # / Statement #
    /(?:document|doc)[\s]*(?:#|no\.?)[\s:]*([A-Z0-9.\-_]{2,30})/i,
    /(?:statement|stmt)[\s]*(?:#|no\.?)[\s:]*([A-Z0-9.\-_]{2,30})/i,
    // Ref / Reference
    /(?:ref|reference)[\s]*(?:#|no\.?)?[\s:]*([A-Z0-9.\-_]{2,30})/i,
    // "Invoice: 12345" where number starts with digit
    /(?:invoice|inv)[\s]*[:.][\s]*(\d[A-Z0-9.\-_]{1,29})/i,
  ],
  invoice_date: [
    // "Invoice Date: 01/15/2024" — most explicit
    /(?:invoice\s*date|date\s*of\s*invoice|dated|issue\s*date)[\s:]*(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/i,
    // Month name with explicit label
    /(?:invoice\s*date|date|dated)[\s:]*(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)[\s.,]+(\d{1,2})(?:st|nd|rd|th)?[,\s]+(\d{4})/i,
    /(?:invoice\s*date|date|dated)[\s:]*(\d{1,2})(?:st|nd|rd|th)?[\s.,]+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)[,\s]+(\d{4})/i,
    // ISO format with label
    /(?:invoice\s*date|date|dated)[\s:]*(\d{4}[\/\-.]\d{1,2}[\/\-.]\d{1,2})/i,
    // Unlabeled but clear numeric date
    /\bdate[\s:]*(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/i,
  ],
  invoice_amount: [
    /(?:total\s*amount|amount\s*due|balance\s*due|total\s*due|grand\s*total|net\s*due)[\s:]*[$]?\s*([\d,]+\.\d{2})/i,
    /(?:total|balance)[\s:]*[$]?\s*([\d,]+\.\d{2})/i,
    /(?:amount\s*due|due)[\s:]*[$]?\s*([\d,]+\.\d{2})/i,
    /\$\s*([\d,]+\.\d{2})(?:\s*(?:USD|usd))?\s*(?:total|due|balance)/i,
  ],
  po_number: [
    /(?:purchase\s*order|p\.?o\.?\s*(?:#|no\.?|number)?)[\s:]*([A-Z0-9.\-_]{2,30})/i,
    /(?:po\s*(?:#|no\.?|number)?)[\s:]*([A-Z0-9.\-_]{2,30})/i,
    /\bPO\s*#?\s*[:\s]*([A-Z0-9.\-_]{2,30})/i,
    /\bP\.O\.\s*#?\s*[:\s]*([A-Z0-9.\-_]{2,30})/i,
    /(?:order\s*(?:#|no\.?|number)?)[\s:]*([A-Z0-9.\-_]{2,30})/i,
    /(?:customer\s*po|cust\s*po)[\s:]*([A-Z0-9.\-_]{2,30})/i,
  ],
};

/**
 * Detect if a page starts a new invoice based on text content
 */
function isInvoiceStartPage(text) {
  const indicators = [
    /invoice\s*(#|no|number)/i,
    /invoice\s*date/i,
    /bill\s*to/i,
    /sold\s*to/i,
    /ship\s*to/i,
    /remit\s*to/i,
    /invoice\s*total/i,
    /^\s*invoice\s*$/im,
  ];

  let score = 0;
  for (const pattern of indicators) {
    if (pattern.test(text)) score++;
  }
  return score >= 2;
}

/**
 * Analyze PDF pages and detect split points for multi-invoice documents
 */
async function detectPDFSplits(fileBuffer) {
  const data = new Uint8Array(fileBuffer);
  const doc = await pdfjsLib.getDocument({ data, useSystemFonts: true }).promise;
  const numPages = doc.numPages;

  const pageTexts = [];
  for (let i = 1; i <= numPages; i++) {
    const page = await doc.getPage(i);
    const textContent = await page.getTextContent();
    const text = textContent.items.map(item => item.str).join(' ');
    pageTexts.push({ page: i, text });
    page.cleanup();
  }

  const splitPoints = [0];
  for (let i = 1; i < pageTexts.length; i++) {
    if (isInvoiceStartPage(pageTexts[i].text)) {
      splitPoints.push(i);
    }
  }

  if (splitPoints.length <= 1) {
    return [{
      startPage: 1,
      endPage: numPages,
      text: pageTexts.map(p => `--- Page ${p.page} ---\n${p.text}`).join('\n\n'),
    }];
  }

  const segments = [];
  for (let i = 0; i < splitPoints.length; i++) {
    const startIdx = splitPoints[i];
    const endIdx = (i + 1 < splitPoints.length) ? splitPoints[i + 1] : pageTexts.length;
    const segmentPages = pageTexts.slice(startIdx, endIdx);
    segments.push({
      startPage: segmentPages[0].page,
      endPage: segmentPages[segmentPages.length - 1].page,
      text: segmentPages.map(p => `--- Page ${p.page} ---\n${p.text}`).join('\n\n'),
    });
  }

  return segments;
}

/**
 * Main entry point: process a document buffer and extract text + fields
 * @param {Buffer} fileBuffer
 * @param {string} mimeType
 * @returns {Promise<{text: string, pages: number, fields: Array, segments?: Array}>}
 */
async function processDocument(fileBuffer, mimeType) {
  let text = '';
  let pages = 0;
  let segments = null;

  if (mimeType === 'application/pdf') {
    try {
      const parsed = await pdfParse(fileBuffer);
      if (parsed.text && parsed.text.trim().length > 100 && parsed.numpages > 1) {
        const splits = await detectPDFSplits(fileBuffer);
        if (splits.length > 1) {
          segments = splits;
          text = splits[0].text;
          pages = splits[0].endPage - splits[0].startPage + 1;
        } else {
          text = parsed.text.trim();
          pages = parsed.numpages;
        }
      } else {
        text = parsed.text.trim();
        pages = parsed.numpages;
      }
    } catch (err) {
      const ocrResult = await ocrPDFPages(fileBuffer);
      text = ocrResult.text;
      pages = ocrResult.pages;
    }
  } else if (mimeType.startsWith('image/')) {
    const ocrResult = await performOCR(fileBuffer);
    text = ocrResult.text;
    pages = 1;
  } else {
    throw new Error(`Unsupported file type: ${mimeType}`);
  }

  const fields = extractInvoiceFields(text);

  return { text, pages, fields, segments };
}

/**
 * Render PDF pages to images and perform OCR
 */
async function ocrPDFPages(fileBuffer) {
  const data = new Uint8Array(fileBuffer);
  const doc = await pdfjsLib.getDocument({ data, useSystemFonts: true }).promise;
  const numPages = doc.numPages;
  const worker = await createWorker('eng');
  let fullText = '';

  try {
    for (let i = 1; i <= numPages; i++) {
      const page = await doc.getPage(i);
      const viewport = page.getViewport({ scale: 2.0 });
      const canvas = createCanvas(viewport.width, viewport.height);
      const context = canvas.getContext('2d');

      await page.render({ canvasContext: context, viewport }).promise;
      const imageBuffer = canvas.toBuffer('image/png');

      const { data: { text } } = await worker.recognize(imageBuffer);
      fullText += `\n--- Page ${i} ---\n${text}`;

      page.cleanup();
    }
  } finally {
    await worker.terminate();
  }

  return { text: fullText.trim(), pages: numPages };
}

/**
 * Perform OCR on an image buffer
 */
async function performOCR(imageBuffer) {
  const worker = await createWorker('eng');
  try {
    const { data: { text } } = await worker.recognize(imageBuffer);
    return { text: text.trim() };
  } finally {
    await worker.terminate();
  }
}

/**
 * Extract invoice fields from raw text using regex heuristics
 * @param {string} text
 * @returns {Array<{field: string, value: string}>}
 */
function extractInvoiceFields(text) {
  const fields = [];
  const textLines = text.split('\n');

  for (const [fieldName, patterns] of Object.entries(FIELD_PATTERNS)) {
    const matches = [];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        let value;
        if (fieldName === 'invoice_date' && match.length > 2) {
          const groups = match.slice(1).filter(g => g);
          if (groups.length >= 3) {
            value = groups.join(' ');
          } else {
            value = match[1].trim();
          }
        } else {
          value = match[1].trim();
        }

        if (fieldName === 'invoice_number' && !isLikelyInvoiceNumber(value)) {
          continue;
        }

        matches.push(value);
      }
    }

    if (matches.length === 0) continue;

    // Use the first (most specific) match
    fields.push({ field: fieldName, value: matches[0] });
  }

  // Post-process: infer vendor from header if not found
  if (!fields.find(f => f.field === 'vendor_name') && textLines.length > 0) {
    const vendorGuess = guessVendorFromHeader(textLines.slice(0, 5).join(' '));
    if (vendorGuess) {
      fields.push({
        field: 'vendor_name',
        value: vendorGuess,
      });
    }
  }

  // Post-process: guess invoice number from header if not found
  if (!fields.find(f => f.field === 'invoice_number')) {
    const invoiceGuess = guessInvoiceNumber(text);
    if (invoiceGuess) {
      fields.push({
        field: 'invoice_number',
        value: invoiceGuess,
      });
    }
  }

  return fields;
}

/**
 * Guess vendor name from document header
 */
function guessVendorFromHeader(text) {
  const lines = text.split(/[\n\r]+/).map(l => l.trim()).filter(l => l.length > 2);

  for (const line of lines.slice(0, 10)) {
    const m = line.match(/(?:from|vendor|billed by|remit to|sold by)[:\s]+([A-Z][A-Za-z0-9\s&.,'\-]{2,60})/i);
    if (m && m[1] && m[1].length > 2) {
      return m[1].replace(/\s+/g, ' ').trim();
    }
  }

  const companySuffix = /\b(inc\.?|llc\.?|ltd\.?|corp\.?|corporation|company|co\.?|limited|llp|plc|gmbh|group|supply|auto|parts|motors|dealership|services)\b/i;

  for (const line of lines.slice(0, 8)) {
    const lower = line.toLowerCase();
    if (/^(date|invoice|bill|to|from|page|\d+|[\$\#]|ship|sold|remit|amount|total|qty)/.test(lower)) continue;
    if (line.length < 3 || line.length > 80) continue;
    if (/^\d{1,2}[\/\-.]\d{1,2}/.test(line)) continue;
    if (/^\d{5,}/.test(line)) continue;

    if (companySuffix.test(line)) {
      return line.replace(/\s+/g, ' ').trim();
    }
  }

  for (const line of lines.slice(0, 5)) {
    if (line.length > 3 && line.length < 60 && /^[A-Z]/.test(line)) {
      const cleaned = line.replace(/\s+/g, ' ').trim();
      if (!/^(tel|fax|email|www|http|page|date|invoice|ship|sold|amount|total|qty|\d)/i.test(cleaned)) {
        return cleaned;
      }
    }
  }

  return null;
}

/**
 * Validate that a captured string is likely an invoice number
 */
function isLikelyInvoiceNumber(value) {
  const falsePositives = ['date', 'total', 'amount', 'due', 'balance', 'number', 'page', 'of', 'from', 'to', 'ship', 'bill', 'sold', 'remit', 'vendor', 'customer', 'account', 'original', 'copy', 'paid', 'unpaid', 'overdue', 'pending', 'processed'];
  if (falsePositives.includes(value.toLowerCase())) return false;
  if (/^\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}$/.test(value)) return false;
  if (/^\d{1,3}(,\d{3})*\.\d{2}$/.test(value)) return false;
  if (!/\d/.test(value)) return false;
  return true;
}

/**
 * Guess invoice number from document header when regex patterns fail
 */
function guessInvoiceNumber(text) {
  const lines = text.split(/[\n\r]+/).map(l => l.trim()).filter(l => l.length > 0);
  const headerLines = lines.slice(0, 25);

  for (const line of headerLines) {
    if (/^\d{1,2}[\/\-.]\d{1,2}/.test(line)) continue;
    if (/^\$/.test(line)) continue;

    const m = line.match(/(?:#|no\.?)\s*([A-Z0-9.\-_]{2,20})/i);
    if (m && m[1] && /\d/.test(m[1]) && isLikelyInvoiceNumber(m[1])) {
      return m[1];
    }
  }

  for (const line of headerLines.slice(0, 15)) {
    const lower = line.toLowerCase();
    const m = line.match(/\b(\d{5,15})\b/);
    if (m && m[1] && (lower.includes('invoice') || lower.includes('inv') || lower.includes('no') || lower.includes('#') || lower.includes('number'))) {
      return m[1];
    }
  }

  return null;
}

/**
 * Normalize a vendor name for matching purposes
 */
function normalizeVendorName(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/\b(inc\.?|llc|ltd\.?|corp\.?|corporation|company|co\.?|limited|llp|plc)\b/gi, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Generate a duplicate detection key from invoice fields
 */
function generateDuplicateKey(vendorName, invoiceNumber, invoiceDate, invoiceAmount) {
  const normalizedVendor = normalizeVendorName(vendorName);
  const normalizedInvoice = (invoiceNumber || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const dateStr = invoiceDate || '';
  const amountStr = invoiceAmount ? String(parseFloat(invoiceAmount).toFixed(2)) : '';

  if (!normalizedVendor || !normalizedInvoice) return null;

  return `${normalizedVendor}|${normalizedInvoice}|${dateStr}|${amountStr}`;
}

/**
 * Split a PDF buffer into separate PDFs based on page ranges
 */
async function splitPDF(fileBuffer, segments) {
  const { PDFDocument } = require('pdf-lib');
  const originalPdf = await PDFDocument.load(fileBuffer);
  const splitBuffers = [];

  for (const segment of segments) {
    const newPdf = await PDFDocument.create();
    const startIdx = segment.startPage - 1;
    const endIdx = segment.endPage - 1;
    const pageIndices = [];
    for (let i = startIdx; i <= endIdx; i++) {
      pageIndices.push(i);
    }
    const copiedPages = await newPdf.copyPages(originalPdf, pageIndices);
    for (const page of copiedPages) {
      newPdf.addPage(page);
    }
    const bytes = await newPdf.save();
    splitBuffers.push(Buffer.from(bytes));
  }

  return splitBuffers;
}

module.exports = {
  processDocument,
  extractInvoiceFields,
  normalizeVendorName,
  generateDuplicateKey,
  detectPDFSplits,
  splitPDF,
};
