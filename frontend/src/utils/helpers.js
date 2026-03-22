export const MAX_FILE_SIZE = 50 * 1024 * 1024;
export const ACCEPTED_TYPE = "application/pdf";
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/bmp", "image/svg+xml"];
export const ACCEPTED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".svg"];

export const isImageFile = (file) => {
  const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
  return ACCEPTED_IMAGE_TYPES.includes(file.type) || [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".svg"].includes(ext);
};

export const isPdfFile = (file) => {
  const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
  return file.type === "application/pdf" || ext === ".pdf";
};

export const isValidFileType = (file) => {
  const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
  return isPdfFile(file) || isImageFile(file);
};

import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

export const extractTextFromPDF = async (file, onProgress) => {
  const ab = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: ab }).promise;
  const n = pdf.numPages;
  let txt = "";
  for (let i = 1; i <= n; i++) {
    const pg = await pdf.getPage(i);
    const c = await pg.getTextContent();
    txt += `\n--- Page ${i} ---\n${c.items.map(x => x.str).join(" ")}`;
    onProgress(Math.round((i / n) * 100));
  }
  return { text: txt.trim(), pages: n };
};

export const loadPDFJS = () => Promise.resolve();

export const fmtSize = (b) =>
  b < 1024
    ? b + " B"
    : b < 1048576
      ? (b / 1024).toFixed(1) + " KB"
      : (b / 1048576).toFixed(1) + " MB";

export const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export const fuzzyMatch = (query, target) => {
  const q = query.toLowerCase(),
    tgt = target.toLowerCase();
  if (tgt.includes(q))
    return { match: true, score: 100 + q.length, indices: [] };
  let qi = 0;
  const indices = [];
  let score = 0,
    lastIdx = -1;
  for (let ti = 0; ti < tgt.length && qi < q.length; ti++) {
    if (tgt[ti] === q[qi]) {
      indices.push(ti);
      score += lastIdx === ti - 1 ? 8 : 3;
      if (ti === 0 || " -_".includes(tgt[ti - 1])) score += 5;
      lastIdx = ti;
      qi++;
    }
  }
  return qi === q.length
    ? { match: true, score, indices }
    : { match: false, score: 0, indices: [] };
};

export const copyText = (txt) => navigator.clipboard.writeText(txt);

/* ── RO Number extraction from PDF text ─────────────────── */
export const extractRO = (text, filename) => {
  const sources = [filename || "", text || ""];
  for (const src of sources) {
    const rMatch = src.match(/\b(R\d{9})\b/);
    if (rMatch) return rMatch[1];
  }
  if (text) {
    const patterns = [
      /R\.?O\.?\s*#?\s*(\d[\d\-]{2,})/i,
      /Repair\s*Order\s*#?\s*(\d[\d\-]{2,})/i,
      /RO\s*Number\s*:?\s*(\d[\d\-]{2,})/i,
    ];
    for (const pat of patterns) {
      const m = text.match(pat);
      if (m) return m[1].replace(/-+$/, "");
    }
  }
  return null;
};
