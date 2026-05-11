// services/aiExtractService.js
// AI-powered invoice field extraction using OpenAI/ChatGPT
// Falls back to regex extraction if AI is unavailable or misconfigured

let OpenAI;
try {
  OpenAI = require('openai');
} catch (err) {
  console.log('[AI] openai package not installed. AI extraction unavailable.');
}

const SYSTEM_PROMPT = `You are a specialized invoice data extraction engine.

Your task: analyze raw OCR text from a business document and extract these exact fields:

1. vendor_name — The company name that issued the invoice (e.g., "ABC Supply Inc.")
2. invoice_number — The invoice number, ID, or reference. Must contain at least one digit. (e.g., "INV-12345" or "2024001")
3. invoice_date — The date the invoice was issued. Return in MM/DD/YYYY format. (e.g., "01/15/2024")
4. invoice_amount — The total amount due/balance due. Return as numeric string with 2 decimals. (e.g., "1234.56")
5. po_number — Purchase order number if present. (e.g., "PO-9876")

RULES:
- Return ONLY a valid JSON object. No markdown fences, no explanations outside JSON.
- For each field provide: "value" (string or null), "confidence" (0-100 integer), "reason" (1-sentence string)
- If a field is genuinely not in the text, set value to null and confidence to 0.
- Clean up obvious OCR errors (e.g., "l" vs "1", "O" vs "0") when the context is clear.
- Invoice number MUST contain at least one digit. If the extracted value has no digits, return null.
- Vendor name should not be the recipient/bill-to unless the document is clearly from that entity.
- Amount should be the final total due, not a subtotal or line item amount.
- Dates: prefer the invoice date over due date. Convert any format to MM/DD/YYYY.
- Confidence should reflect your certainty based on text clarity and label proximity:
  - 90-100: Explicitly labeled and clearly readable
  - 70-89: Reasonably clear but minor ambiguity
  - 40-69: Guessed from context, possible OCR error
  - 0-39: Very uncertain or not found

Required JSON structure:
{
  "vendor_name": {"value": "...", "confidence": 95, "reason": "Found after 'From:' label"},
  "invoice_number": {"value": "...", "confidence": 92, "reason": "..."},
  "invoice_date": {"value": "...", "confidence": 88, "reason": "..."},
  "invoice_amount": {"value": "...", "confidence": 90, "reason": "..."},
  "po_number": {"value": "...", "confidence": 0, "reason": "Not found in text"}
}`;

function getClient() {
  if (!OpenAI) throw new Error('openai package not installed. Run: npm install openai');
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not set in environment');
  return new OpenAI({ apiKey });
}

function isAIEnabled() {
  return process.env.AP_AI_EXTRACTION === 'true' && !!process.env.OPENAI_API_KEY;
}

function parseAIResponse(content) {
  try {
    const parsed = JSON.parse(content);
    const fields = [];

    const fieldMap = {
      vendor_name: 'vendor_name',
      invoice_number: 'invoice_number',
      invoice_date: 'invoice_date',
      invoice_amount: 'invoice_amount',
      po_number: 'po_number',
    };

    for (const [key, targetField] of Object.entries(fieldMap)) {
      const entry = parsed[key];
      if (!entry) continue;
      const value = entry.value || null;
      const confidence = typeof entry.confidence === 'number' ? Math.round(entry.confidence) : 0;
      if (value && confidence > 0) {
        fields.push({
          field: targetField,
          value: String(value).trim(),
          confidence: Math.min(100, Math.max(0, confidence)),
          reason: entry.reason || '',
          source: 'ai',
        });
      }
    }

    return fields;
  } catch (err) {
    console.error('[AI] Failed to parse AI response:', err.message);
    console.error('[AI] Raw content:', content?.substring(0, 500));
    return [];
  }
}

/**
 * Extract invoice fields using AI
 * @param {string} text - Raw OCR text
 * @param {object} options
 * @returns {Promise<Array<{field, value, confidence, source}>>}
 */
async function extractWithAI(text, options = {}) {
  const client = getClient();
  const model = options.model || process.env.OPENAI_MODEL || 'gpt-4o-mini';

  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Extract invoice fields from this OCR text:\n\n--- START TEXT ---\n${text.substring(0, 12000)}\n--- END TEXT ---` },
    ],
    temperature: 0,
    max_tokens: 1000,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content || '';
  return parseAIResponse(content);
}

/**
 * Compare regex vs AI extraction side-by-side (for testing)
 * @param {string} text - Raw OCR text
 * @returns {Promise<{regex: Array, ai: Array, aiRaw: object}>}
 */
async function compareExtraction(text) {
  const { extractInvoiceFields } = require('./ocrService');
  const regexFields = extractInvoiceFields(text);

  let aiFields = [];
  let aiRaw = null;
  let aiError = null;

  try {
    aiFields = await extractWithAI(text);
    // Try to capture raw response for inspection
    const client = getClient();
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Extract invoice fields from this OCR text:\n\n--- START TEXT ---\n${text.substring(0, 12000)}\n--- END TEXT ---` },
      ],
      temperature: 0,
      max_tokens: 1000,
      response_format: { type: 'json_object' },
    });
    aiRaw = JSON.parse(response.choices[0]?.message?.content || '{}');
  } catch (err) {
    aiError = err.message;
  }

  return { regex: regexFields, ai: aiFields, aiRaw, aiError };
}

module.exports = {
  extractWithAI,
  compareExtraction,
  isAIEnabled,
  getClient,
};
