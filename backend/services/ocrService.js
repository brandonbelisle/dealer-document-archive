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
    { pattern: /(?:from|vendor|seller|billed by|remit to|sold by|ship from)[\s:]+([A-Z][A-Za-z0-9\s&.,'\-]{2,60}(?:Inc\.?|LLC|Ltd\.?|Corp\.?|Corporation|Company|Co\.?|Limited|LLP|PLC|GmbH|LLC\.?)?)/i, weight: 1.0 },
    { pattern: /(?:bill\s*to)[\s:]+([A-Z][A-Za-z0-9\s&.,'\-]{2,60}(?:Inc\.?|LLC|Ltd\.?|Corp\.?|Corporation|Company|Co\.?|Limited|LLP|PLC|GmbH)?)/i, weight: 0.9 },
    // Line that ends with a company suffix
    { pattern: /^([A-Z][A-Za-z0-9\s&.,'\-]{2,60}(?:Inc\.?|LLC|Ltd\.?|Corp\.?|Corporation|Company|Co\.?|Limited|LLP|PLC|GmbH))\.?$/im, weight: 0.85 },
    // Industry name patterns near top
    { pattern: /^([A-Z][A-Za-z0-9\s&.,'\-]{3,50}(?:Supply|Auto|Parts|Service|Dealer|Group|Motors|Equipment|Technologies|Systems|Solutions))/im, weight: 0.8 },
  ],
  invoice_number: [
    // Most explicit: "Invoice #: 12345", "Invoice No. 12345", "Invoice Number: 12345"
    { pattern: /(?:invoice|inv)[\s]*(?:#|no\.?|number|num\.?)[\s:]*([A-Z0-9.\-_]{2,30})/i, weight: 1.0 },
    // "Invoice #12345" (no space)
    { pattern: /(?:invoice|inv)[\s]*#([A-Z0-9.\-_]{2,30})/i, weight: 1.0 },
    // "Invoice 12345" where number starts with a digit
    { pattern: /(?:invoice|inv)[\s]+(\d[A-Z0-9.\-_]{1,29})(?=\s|$)/i, weight: 0.95 },
    // "Inv. 12345" or "Inv: 12345"
    { pattern: /(?:inv\.?)[\s:]*([A-Z0-9.\-_]{2,30})/i, weight: 0.85 },
    // "Invoice Ref: 12345", "Invoice ID: 12345"
    { pattern: /(?:invoice|inv)[\s]*(?:id|ref|reference)[\s:]*([A-Z0-9.\-_]{2,30})/i, weight: 0.9 },
    // "INV-12345" or "INV12345"
    { pattern: /\b(?:INV|inv)[\-_]?([A-Z0-9.\-_]{2,30})/i, weight: 0.9 },
    // Bare "# 12345" or "#12345" at line start
    { pattern: /(?:^|\s)#\s*([A-Z0-9.\-_]{3,20})(?=\s|$)/im, weight: 0.8 },
    // "No. 12345"
    { pattern: /\bno\.?[\s:]*([A-Z0-9.\-_]{2,30})/i, weight: 0.75 },
    // Document # / Statement #
    { pattern: /(?:document|doc)[\s]*(?:#|no\.?)[\s:]*([A-Z0-9.\-_]{2,30})/i, weight: 0.65 },
    { pattern: /(?:statement|stmt)[\s]*(?:#|no\.?)[\s:]*([A-Z0-9.\-_]{2,30})/i, weight: 0.65 },
    // Ref / Reference
    { pattern: /(?:ref|reference)[\s]*(?:#|no\.?)?[\s:]*([A-Z0-9.\-_]{2,30})/i, weight: 0.6 },
    // "Invoice: 12345" where number starts with digit
    { pattern: /(?:invoice|inv)[\s]*[:.][\s]*(\d[A-Z0-9.\-_]{1,29})/i, weight: 0.85 },
  ],
  invoice_date: [
    // "Invoice Date: 01/15/2024" — most explicit
    { pattern: /(?:invoice\s*date|date\s*of\s*invoice|dated|issue\s*date)[\s:]*(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/i, weight: 1.0 },
    // Month name with explicit label
    { pattern: /(?:invoice\s*date|date|dated)[\s:]*(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)[\s.,]+(\d{1,2})(?:st|nd|rd|th)?[,\s]+(\d{4})/i, weight: 1.0 },
    { pattern: /(?:invoice\s*date|date|dated)[\s:]*(\d{1,2})(?:st|nd|rd|th)?[\s.,]+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)[,\s]+(\d{4})/i, weight: 1.0 },
    // ISO format with label
    { pattern: /(?:invoice\s*date|date|dated)[\s:]*(\d{4}[\/\-.]\d{1,2}[\/\-.]\d{1,2})/i, weight: 1.0 },
    // Unlabeled but clear numeric date (requires nearby invoice context in confidence calc)
    { pattern: /\bdate[\s:]*(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/i, weight: 0.7 },
  ],
  invoice_amount: [
    { pattern: /(?:total\s*amount|amount\s*due|balance\s*due|total\s*due|grand\s*total|net\s*due)[\s:]*[$]?\s*([\d,]+\.\d{2})/i, weight: 1.0 },
    { pattern: /(?:total|balance)[\s:]*[$]?\s*([\d,]+\.\d{2})/i, weight: 0.85 },
    { pattern: /(?:amount\s*due|due)[\s:]*[$]?\s*([\d,]+\.\d{2})/i, weight: 0.9 },
    { pattern: /\$\s*([\d,]+\.\d{2})(?:\s*(?:USD|usd))?\s*(?:total|due|balance)/i, weight: 0.85 },
  ],
  po_number: [
    { pattern: /(?:purchase\s*order|p\.?o\.?\s*(?:#|no\.?|number)?)[\s:]*([A-Z0-9.\-_]{2,30})/i, weight: 1.0 },
    { pattern: /(?:po\s*(?:#|no\.?|number)?)[\s:]*([A-Z0-9.\-_]{2,30})/i, weight: 0.95 },
    { pattern: /\bPO\s*#?\s*[:\s]*([A-Z0-9.\-_]{2,30})/i, weight: 1.0 },
    { pattern: /\bP\.O\.\s*#?\s*[:\s]*([A-Z0-9.\-_]{2,30})/i, weight: 1.0 },
    { pattern: /(?:order\s*(?:#|no\.?|number)?)[\s:]*([A-Z0-9.\-_]{2,30})/i, weight: 0.7 },
    { pattern: /(?:customer\s*po|cust\s*po)[\s:]*([A-Z0-9.\-_]{2,30})/i, weight: 0.85 },
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
 * @returns {Promise<{text: string, pages: number, sourceConfidence: number, fields: Array, segments?: Array}>}
 */
async function processDocument(fileBuffer, mimeType) {
  let text = '';
  let pages = 0;
  let sourceConfidence = 98; // Text-based PDFs: embedded text is highly reliable
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
      sourceConfidence = ocrResult.confidence;
    }
  } else if (mimeType.startsWith('image/')) {
    const ocrResult = await performOCR(fileBuffer);
    text = ocrResult.text;
    pages = 1;
    sourceConfidence = ocrResult.confidence;
  } else {
    throw new Error(`Unsupported file type: ${mimeType}`);
  }

  const fields = extractInvoiceFields(text, sourceConfidence);

  return { text, pages, sourceConfidence, fields, segments };
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
  let totalConfidence = 0;

  try {
    for (let i = 1; i <= numPages; i++) {
      const page = await doc.getPage(i);
      const viewport = page.getViewport({ scale: 2.0 });
      const canvas = createCanvas(viewport.width, viewport.height);
      const context = canvas.getContext('2d');

      await page.render({ canvasContext: context, viewport }).promise;
      const imageBuffer = canvas.toBuffer('image/png');

      const { data: { text, confidence } } = await worker.recognize(imageBuffer);
      fullText += `\n--- Page ${i} ---\n${text}`;
      totalConfidence += confidence;

      page.cleanup();
    }
  } finally {
    await worker.terminate();
  }

  const avgConfidence = numPages > 0 ? Math.round(totalConfidence / numPages) : 0;
  return { text: fullText.trim(), pages: numPages, confidence: avgConfidence };
}

/**
 * Perform OCR on an image buffer
 */
async function performOCR(imageBuffer) {
  const worker = await createWorker('eng');
  try {
    const { data: { text, confidence } } = await worker.recognize(imageBuffer);
    return { text: text.trim(), confidence };
  } finally {
    await worker.terminate();
  }
}

/**
 * Extract invoice fields from raw text using regex heuristics
 * @param {string} text
 * @param {number} sourceConfidence - OCR engine confidence (0-100), or 98 for text-based PDFs
 * @returns {Array<{field: string, value: string, confidence: number}>}
 */
function extractInvoiceFields(text, sourceConfidence = 98) {
  const fields = [];
  const textLines = text.split('\n');

  for (const [fieldName, patternDefs] of Object.entries(FIELD_PATTERNS)) {
    const matches = [];

    for (const def of patternDefs) {
      const match = text.match(def.pattern);
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

        matches.push({ value, weight: def.weight });
      }
    }

    if (matches.length === 0) continue;

    // Group by normalized value to find consensus
    const valueGroups = new Map();
    for (const m of matches) {
      const norm = normalizeFieldValue(fieldName, m.value);
      if (!valueGroups.has(norm)) {
        valueGroups.set(norm, { values: [], totalWeight: 0 });
      }
      valueGroups.get(norm).values.push(m.value);
      valueGroups.get(norm).totalWeight += m.weight;
    }

    // Pick the value with highest consensus (most patterns agreeing) and highest weight
    let bestNorm = null;
    let bestGroup = null;
    for (const [norm, group] of valueGroups) {
      if (!bestGroup || group.totalWeight > bestGroup.totalWeight ||
          (group.totalWeight === bestGroup.totalWeight && group.values.length > bestGroup.values.length)) {
        bestNorm = norm;
        bestGroup = group;
      }
    }

    const bestValue = bestGroup.values[0];
    const consensusCount = bestGroup.values.length;
    const maxWeight = Math.max(...patternDefs.map(d => d.weight));
    const patternWeight = bestGroup.totalWeight / Math.max(1, maxWeight);

    const confidence = calculateFieldConfidence({
      fieldName,
      value: bestValue,
      fullText: text,
      sourceConfidence,
      patternWeight,
      consensusCount,
      totalPatterns: patternDefs.length,
    });

    fields.push({ field: fieldName, value: bestValue, confidence });
  }

  // Post-process: infer vendor from header if not found
  if (!fields.find(f => f.field === 'vendor_name') && textLines.length > 0) {
    const vendorGuess = guessVendorFromHeader(textLines.slice(0, 5).join(' '));
    if (vendorGuess) {
      fields.push({
        field: 'vendor_name',
        value: vendorGuess,
        confidence: Math.round(sourceConfidence * 0.35),
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
        confidence: Math.round(sourceConfidence * 0.40),
      });
    }
  }

  return fields;
}

/**
 * Calculate meaningful confidence for an extracted field
 */
function calculateFieldConfidence({ fieldName, value, fullText, sourceConfidence, patternWeight, consensusCount, totalPatterns }) {
  // Start from source confidence (OCR engine confidence for scanned, 98 for text-based)
  let confidence = sourceConfidence;

  // --- Pattern Quality ---
  // Weighted pattern score: stronger regex patterns boost confidence
  const patternBoost = Math.round((patternWeight - 0.5) * 10); // -5 to +5
  confidence += patternBoost;

  // --- Consensus Boost ---
  // Multiple patterns finding the same value is strong evidence
  if (consensusCount >= 3) confidence += 8;
  else if (consensusCount === 2) confidence += 4;

  // --- Keyword Proximity ---
  confidence += checkKeywordProximity(fieldName, value, fullText);

  // --- Format Validation ---
  const formatScore = validateFieldFormat(fieldName, value);
  confidence += formatScore;

  // --- Length Sanity Checks ---
  if (value.length < 2) confidence -= 25;
  else if (value.length < 3) confidence -= 15;
  if (value.length > 80) confidence -= 10;

  // --- Source-Dependent Floor/Ceiling ---
  // Text-based PDFs should rarely drop below 80 if format is good
  // Low OCR confidence should cap the maximum
  if (sourceConfidence >= 95) {
    // Text-based PDF: floor at 70, cap at 99
    confidence = Math.max(70, Math.min(99, confidence));
  } else if (sourceConfidence >= 80) {
    // Good OCR: floor at 50, cap at 92
    confidence = Math.max(50, Math.min(92, confidence));
  } else if (sourceConfidence >= 60) {
    // Medium OCR: floor at 35, cap at 80
    confidence = Math.max(35, Math.min(80, confidence));
  } else {
    // Poor OCR: floor at 20, cap at 65
    confidence = Math.max(20, Math.min(65, confidence));
  }

  return Math.round(confidence);
}

/**
 * Check keyword proximity — returns a score from -5 to +15
 */
function checkKeywordProximity(fieldName, value, fullText) {
  const keywords = {
    vendor_name: ['vendor', 'from', 'seller', 'billed by', 'remit to', 'bill to', 'sold by'],
    invoice_number: ['invoice', 'inv', 'invoice #', 'invoice no', 'number', 'no.', 'ref', 'reference', 'document', 'statement'],
    invoice_date: ['invoice date', 'date of invoice', 'dated', 'issue date'],
    invoice_amount: ['total', 'amount due', 'balance due', 'grand total', 'net due'],
    po_number: ['purchase order', 'po', 'p.o.', 'customer po'],
  };

  const fieldKeywords = keywords[fieldName] || [];
  const lowerText = fullText.toLowerCase();
  const lowerValue = value.toLowerCase();
  const valueIndex = lowerText.indexOf(lowerValue);

  if (valueIndex === -1) return -5; // Value not found in text (suspicious)

  const surroundingText = lowerText.substring(
    Math.max(0, valueIndex - 80),
    Math.min(lowerText.length, valueIndex + value.length + 80)
  );

  // Check for explicit label within 40 chars
  for (const keyword of fieldKeywords) {
    if (surroundingText.includes(keyword)) {
      // Strong boost if keyword is very close
      const kwIndex = surroundingText.indexOf(keyword);
      const dist = Math.abs(kwIndex - valueIndex);
      if (dist < 20) return 15;
      if (dist < 50) return 10;
      return 5;
    }
  }

  // Check for partial keyword matches
  for (const keyword of fieldKeywords) {
    const parts = keyword.split(' ');
    for (const part of parts) {
      if (part.length > 2 && surroundingText.includes(part)) {
        return 3;
      }
    }
  }

  return 0;
}

/**
 * Validate field format and return a score adjustment (-15 to +8)
 */
function validateFieldFormat(fieldName, value) {
  switch (fieldName) {
    case 'vendor_name': {
      // Should not be all digits
      if (/^\d+$/.test(value)) return -20;
      // Should not be a single word under 3 chars
      if (value.length < 3 && !value.includes(' ')) return -15;
      // Good: has company suffix
      if (/\b(inc\.?|llc\.?|ltd\.?|corp\.?|corporation|company|co\.?|limited|llp|plc|gmbh|group|supply|auto|parts|motors)\b/i.test(value)) return 8;
      // Good: reasonable length with spaces (full name)
      if (value.length > 8 && value.includes(' ')) return 4;
      // Okay: starts with capital letter
      if (/^[A-Z]/.test(value)) return 2;
      return -5;
    }

    case 'invoice_number': {
      // Must contain digits
      if (!/\d/.test(value)) return -25;
      // Good: alphanumeric mix
      if (/[A-Z]/i.test(value) && /\d/.test(value)) return 5;
      // Good: 4+ digits
      if (/\d{4,}/.test(value)) return 4;
      // Okay: has digits
      if (/\d/.test(value)) return 2;
      return -10;
    }

    case 'invoice_date': {
      // Numeric date format
      if (/^\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}$/.test(value)) {
        const parts = value.split(/[\/\-.]/);
        const month = parseInt(parts[0], 10);
        const day = parseInt(parts[1], 10);
        if (month >= 1 && month <= 12 && day >= 1 && day <= 31) return 8;
        return -5; // Invalid date
      }
      // Month name format
      if (/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i.test(value)) return 8;
      // ISO format
      if (/^\d{4}[\/\-.]\d{1,2}[\/\-.]\d{1,2}$/.test(value)) {
        const parts = value.split(/[\/\-.]/);
        const month = parseInt(parts[1], 10);
        const day = parseInt(parts[2], 10);
        if (month >= 1 && month <= 12 && day >= 1 && day <= 31) return 8;
        return -5;
      }
      return -10;
    }

    case 'invoice_amount': {
      // Should be a valid decimal amount
      const clean = value.replace(/[$,]/g, '');
      if (/^\d+\.\d{2}$/.test(clean)) {
        const num = parseFloat(clean);
        if (num > 0 && num < 10000000) return 8;
        if (num > 0) return 4;
      }
      if (/^\d+$/.test(clean)) return 2; // No cents but still a number
      return -10;
    }

    case 'po_number': {
      // Must contain digits
      if (!/\d/.test(value)) return -15;
      if (/[A-Z]/i.test(value) && /\d/.test(value)) return 5;
      if (/\d{3,}/.test(value)) return 3;
      return 0;
    }

    default:
      return 0;
  }
}

/**
 * Normalize a field value for consensus comparison
 */
function normalizeFieldValue(fieldName, value) {
  if (!value) return '';
  let norm = value.toLowerCase().replace(/\s+/g, ' ').trim();
  if (fieldName === 'invoice_date') {
    // Normalize dates: "01/15/2024" and "01-15-2024" and "01.15.2024" should match
    norm = norm.replace(/[\-.]/g, '/');
  }
  if (fieldName === 'invoice_amount') {
    // Normalize amounts: strip $ and commas
    norm = norm.replace(/[$,]/g, '');
  }
  if (fieldName === 'invoice_number' || fieldName === 'po_number') {
    // Normalize numbers: strip common prefixes
    norm = norm.replace(/^(inv|po|doc|ref)-?/i, '');
  }
  return norm;
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
