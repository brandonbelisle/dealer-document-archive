// services/ocrService.js
// OCR processing for Accounts Payable documents
// Supports: images (jpg/png), text-based PDFs, scanned PDFs

const { createWorker } = require('tesseract.js');
const pdfParse = require('pdf-parse');
const pdfjsLib = require('pdfjs-dist');
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
  ],
};

/**
 * Main entry point: process a document buffer and extract text + fields
 * @param {Buffer} fileBuffer - The file content
 * @param {string} mimeType - MIME type of the file
 * @returns {Promise<{text: string, pages: number, fields: Array}>}
 */
async function processDocument(fileBuffer, mimeType) {
  let text = '';
  let pages = 0;
  let isScanned = false;

  if (mimeType === 'application/pdf') {
    const pdfResult = await processPDF(fileBuffer);
    text = pdfResult.text;
    pages = pdfResult.pages;
    isScanned = pdfResult.isScanned;
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

module.exports = {
  processDocument,
  extractInvoiceFields,
};
