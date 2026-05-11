// services/ocrService.js
// OCR processing for Accounts Payable documents
// Supports: images (jpg/png), text-based PDFs, scanned PDFs

const { createWorker } = require('tesseract.js');
const pdfParse = require('pdf-parse');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
const { createCanvas } = require('canvas');

// Invoice field extraction patterns
const FIELD_PATTERNS = {
  vendor_name: [
    /(?:from|vendor|seller|billed by|remit to)[:\s]*([A-Z][A-Za-z0-9\s&.,]+(?:Inc\.?|LLC|Ltd\.?|Corp\.?|Company|Co\.?)?)/i,
    /^([A-Z][A-Za-z0-9\s&.,]{2,50}(?:Inc\.?|LLC|Ltd\.?|Corp\.?|Company|Co\.?)?)$/im,
  ],
  invoice_number: [
    /(?:invoice\s*(?:#|no\.?|number)?)[:\s]*([A-Z0-9\-]{3,20})/i,
    /(?:inv\.?\s*(?:#|no\.?)?)[:\s]*([A-Z0-9\-]{3,20})/i,
    /(?:invoice\s*id)[:\s]*([A-Z0-9\-]{3,20})/i,
  ],
  invoice_date: [
    /(?:invoice\s*date|date\s*of\s*invoice|dated)[:\s]*(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/i,
    /(?:date)[:\s]*(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/i,
  ],
  invoice_amount: [
    /(?:total\s*amount|amount\s*due|balance\s*due|total\s*due|grand\s*total)[:\s]*[$]?\s*([\d,]+\.\d{2})/i,
    /(?:total)[:\s]*[$]?\s*([\d,]+\.\d{2})/i,
  ],
  po_number: [
    /(?:purchase\s*order|p\.?o\.?\s*(?:#|no\.?)?)[:\s]*([A-Z0-9\-]{3,20})/i,
    /(?:po\s*(?:#|no\.?)?)[:\s]*([A-Z0-9\-]{3,20})/i,
    /\bPO\s*#?\s*[:\s]*([A-Z0-9\-]{3,20})/i,
    /\bP\.O\.\s*#?\s*[:\s]*([A-Z0-9\-]{3,20})/i,
  ],
};

/**
 * Detect if a page starts a new invoice based on text content
 */
function isInvoiceStartPage(text) {
  const lowerText = text.toLowerCase();
  // Strong indicators of a new invoice page
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

  // If we have 2+ indicators, likely an invoice start
  return score >= 2;
}

/**
 * Analyze PDF pages and detect split points for multi-invoice documents
 * @returns {Array<{startPage: number, endPage: number, text: string}>}
 */
async function detectPDFSplits(fileBuffer) {
  const data = new Uint8Array(fileBuffer);
  const doc = await pdfjsLib.getDocument({ data }).promise;
  const numPages = doc.numPages;

  // Extract text from each page
  const pageTexts = [];
  for (let i = 1; i <= numPages; i++) {
    const page = await doc.getPage(i);
    const textContent = await page.getTextContent();
    const text = textContent.items.map(item => item.str).join(' ');
    pageTexts.push({ page: i, text });
    page.cleanup();
  }

  // Detect invoice start pages
  const splitPoints = [0]; // Always start at page 0
  for (let i = 0; i < pageTexts.length; i++) {
    if (i === 0) continue; // First page is always a start
    if (isInvoiceStartPage(pageTexts[i].text)) {
      splitPoints.push(i);
    }
  }

  // If only one split point, no splitting needed
  if (splitPoints.length <= 1) {
    return [{
      startPage: 1,
      endPage: numPages,
      text: pageTexts.map(p => `--- Page ${p.page} ---\n${p.text}`).join('\n\n'),
    }];
  }

  // Create segments
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
 * @param {Buffer} fileBuffer - The file content
 * @param {string} mimeType - MIME type of the file
 * @returns {Promise<{text: string, pages: number, fields: Array, segments?: Array}>}
 */
async function processDocument(fileBuffer, mimeType) {
  let text = '';
  let pages = 0;
  let isScanned = false;
  let segments = null;

  if (mimeType === 'application/pdf') {
    // Try text extraction first
    try {
      const parsed = await pdfParse(fileBuffer);
      if (parsed.text && parsed.text.trim().length > 100 && parsed.numpages > 1) {
        // Multi-page PDF - check for splits
        const splits = await detectPDFSplits(fileBuffer);
        if (splits.length > 1) {
          segments = splits;
          // Use first segment as primary
          text = splits[0].text;
          pages = splits[0].endPage - splits[0].startPage + 1;
          isScanned = false;
        } else {
          text = parsed.text.trim();
          pages = parsed.numpages;
          isScanned = false;
        }
      } else {
        text = parsed.text.trim();
        pages = parsed.numpages;
        isScanned = false;
      }
    } catch (err) {
      // Scanned PDF - OCR each page
      const ocrResult = await ocrPDFPages(fileBuffer);
      text = ocrResult.text;
      pages = ocrResult.pages;
      isScanned = true;
    }
  } else if (mimeType.startsWith('image/')) {
    const ocrResult = await performOCR(fileBuffer);
    text = ocrResult.text;
    pages = 1;
    isScanned = true;
  } else {
    throw new Error(`Unsupported file type: ${mimeType}`);
  }

  const fields = extractInvoiceFields(text);

  return {
    text,
    pages,
    isScanned,
    fields,
    segments,
  };
}

/**
 * Process a PDF file - detect if text-based or scanned
 */
async function processPDF(fileBuffer) {
  // First try pdf-parse for text-based PDFs
  try {
    const parsed = await pdfParse(fileBuffer);
    if (parsed.text && parsed.text.trim().length > 100) {
      // Likely a text-based PDF with extractable text
      return {
        text: parsed.text.trim(),
        pages: parsed.numpages,
        isScanned: false,
      };
    }
  } catch (err) {
    // pdf-parse failed, might be scanned PDF
    console.log('pdf-parse failed, falling back to OCR:', err.message);
  }

  // Fallback: render PDF pages to images and OCR
  const ocrText = await ocrPDFPages(fileBuffer);
  return {
    text: ocrText.text,
    pages: ocrText.pages,
    isScanned: true,
  };
}

/**
 * Render PDF pages to images and perform OCR
 */
async function ocrPDFPages(fileBuffer) {
  const data = new Uint8Array(fileBuffer);
  const doc = await pdfjsLib.getDocument({ data }).promise;
  const numPages = doc.numPages;
  const worker = await createWorker('eng');
  let fullText = '';

  try {
    for (let i = 1; i <= numPages; i++) {
      const page = await doc.getPage(i);
      const viewport = page.getViewport({ scale: 2.0 }); // Higher scale for better OCR

      const canvas = createCanvas(viewport.width, viewport.height);
      const context = canvas.getContext('2d');

      await page.render({
        canvasContext: context,
        viewport: viewport,
      }).promise;

      const imageBuffer = canvas.toBuffer('image/png');
      const { data: { text } } = await worker.recognize(imageBuffer);
      fullText += `\n--- Page ${i} ---\n${text}`;

      page.cleanup();
    }
  } finally {
    await worker.terminate();
  }

  return {
    text: fullText.trim(),
    pages: numPages,
  };
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
 * @returns {Array<{field: string, value: string, confidence: number}>}
 */
function extractInvoiceFields(text) {
  const fields = [];
  const textLines = text.split('\n');
  const textUpper = text.toUpperCase();

  for (const [fieldName, patterns] of Object.entries(FIELD_PATTERNS)) {
    let bestMatch = null;
    let bestConfidence = 0;

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const value = match[1].trim();
        const confidence = calculateConfidence(fieldName, value, text, pattern);
        if (confidence > bestConfidence) {
          bestConfidence = confidence;
          bestMatch = value;
        }
      }
    }

    if (bestMatch) {
      fields.push({
        field: fieldName,
        value: bestMatch,
        confidence: bestConfidence,
      });
    }
  }

  // Post-process: try to infer vendor from first few lines if not found
  const vendorField = fields.find(f => f.field === 'vendor_name');
  if (!vendorField && textLines.length > 0) {
    const firstLines = textLines.slice(0, 5).join(' ');
    const vendorGuess = guessVendorFromHeader(firstLines);
    if (vendorGuess) {
      fields.push({
        field: 'vendor_name',
        value: vendorGuess,
        confidence: 30, // Low confidence since it's a guess
      });
    }
  }

  return fields;
}

/**
 * Calculate confidence score for an extracted field
 */
function calculateConfidence(fieldName, value, fullText, pattern) {
  let confidence = 70; // Base confidence

  // Boost for longer, more specific values
  if (value.length > 5) confidence += 5;
  if (value.length > 10) confidence += 5;

  // Boost for values near keywords
  const keywordProximity = checkKeywordProximity(fieldName, value, fullText);
  confidence += keywordProximity;

  // Penalize suspicious values
  if (/^\d+$/.test(value) && fieldName === 'vendor_name') confidence -= 30;
  if (value.length < 3) confidence -= 20;
  if (value.length > 100) confidence -= 10;

  // Boost for common invoice format indicators
  if (fieldName === 'invoice_number' && /\d/.test(value)) confidence += 5;
  if (fieldName === 'invoice_amount' && /^[\d,.]+$/.test(value.replace('$', ''))) confidence += 10;
  if (fieldName === 'invoice_date' && /\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}/.test(value)) confidence += 10;

  return Math.min(100, Math.max(0, confidence));
}

/**
 * Check if extracted value is near expected keywords
 */
function checkKeywordProximity(fieldName, value, fullText) {
  const keywords = {
    vendor_name: ['vendor', 'from', 'seller', 'billed by', 'remit to'],
    invoice_number: ['invoice', 'inv', 'invoice #', 'invoice no'],
    invoice_date: ['invoice date', 'date', 'dated'],
    invoice_amount: ['total', 'amount due', 'balance due', 'grand total'],
    po_number: ['purchase order', 'po', 'p.o.'],
  };

  const fieldKeywords = keywords[fieldName] || [];
  const valueIndex = fullText.toLowerCase().indexOf(value.toLowerCase());

  if (valueIndex === -1) return 0;

  // Check surrounding text for keywords
  const surroundingText = fullText.substring(Math.max(0, valueIndex - 100), valueIndex + value.length + 100).toLowerCase();

  for (const keyword of fieldKeywords) {
    if (surroundingText.includes(keyword.toLowerCase())) {
      return 10;
    }
  }

  return 0;
}

/**
 * Guess vendor name from document header (first few lines)
 */
function guessVendorFromHeader(text) {
  // Look for company name patterns in header
  const lines = text.split(/[\n\r]+/).map(l => l.trim()).filter(l => l.length > 2);

  for (const line of lines.slice(0, 5)) {
    // Skip lines that are obviously not company names
    if (/^(date|invoice|bill|to|from|page|\d+|[\$\#])/.test(line.toLowerCase())) continue;
    if (line.length < 3 || line.length > 80) continue;
    if (/^\d{1,2}[\/\-.]\d{1,2}/.test(line)) continue; // Skip dates

    // Look for company indicators
    if (/\b(inc\.?|llc|ltd\.?|corp\.?|company|co\.?)\b/i.test(line)) {
      return line.replace(/\s+/g, ' ').trim();
    }
  }

  // Fallback: return first substantial line that looks like a name
  for (const line of lines.slice(0, 3)) {
    if (line.length > 3 && line.length < 60 && /^[A-Z]/.test(line)) {
      const cleaned = line.replace(/\s+/g, ' ').trim();
      if (!/^(tel|fax|email|www|http|page|date|invoice)/i.test(cleaned)) {
        return cleaned;
      }
    }
  }

  return null;
}

/**
 * Normalize a vendor name for matching purposes
 * Removes common suffixes, punctuation, and standardizes spacing
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
 * Used to identify potential duplicate invoices
 */
function generateDuplicateKey(vendorName, invoiceNumber, invoiceDate, invoiceAmount) {
  const normalizedVendor = normalizeVendorName(vendorName);
  const normalizedInvoice = (invoiceNumber || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const dateStr = invoiceDate || '';
  const amountStr = invoiceAmount ? String(parseFloat(invoiceAmount).toFixed(2)) : '';

  if (!normalizedVendor || !normalizedInvoice) return null;

  return `${normalizedVendor}|${normalizedInvoice}|${dateStr}|${amountStr}`;
}

module.exports = {
  processDocument,
  extractInvoiceFields,
  normalizeVendorName,
  generateDuplicateKey,
};
