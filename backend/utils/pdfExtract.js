const pdf = require('pdf-parse');

async function extractPdfText(buffer) {
  try {
    const data = await pdf(buffer, {
      max: 0,
    });
    let text = data.text || '';
    text = text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    return {
      text,
      pageCount: data.numpages || 0,
    };
  } catch (err) {
    console.error('PDF extraction error:', err.message);
    return {
      text: '',
      pageCount: 0,
    };
  }
}

module.exports = { extractPdfText };