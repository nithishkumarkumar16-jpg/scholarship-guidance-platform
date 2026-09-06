// ================================================================
//  SGP LOCAL DOCUMENT EXTRACTION AI
//  100% browser-based — Tesseract.js OCR + custom regex patterns
//  No API key, no server, no copyright issues
//  Extracts: Name, DOB, Community, Income, Marks, Board, etc.
// ================================================================

// ── LOAD TESSERACT FROM CDN (injected once into document) ──────
import { createWorker } from "tesseract.js";
import * as pdfjsLib from "pdfjs-dist";

export function getPdfWorkerSrc() {
  if (typeof window === "undefined") return "/pdfjs/pdf.worker.min.mjs";
  const origin = window.location?.origin || "";
  return `${origin}/pdfjs/pdf.worker.min.mjs`;
}

export function configurePdfJsWorker() {
  const workerSrc = getPdfWorkerSrc();
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
  return workerSrc;
}

if (typeof window !== "undefined" && typeof window.location !== "undefined") {
  try {
    configurePdfJsWorker();
  } catch (workerUrlError) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";
  }
}

// ── OCR ENGINE — run Tesseract on image/pdf file ───────────────
export async function runOCR(file, onProgress) {
  const worker = await createWorker("eng", 1, {
    logger: (m) => {
      if (m.status === "recognizing text" && onProgress) {
        onProgress(Math.round(m.progress * 100));
      }
    },
  });

  try {
    const sources = file.type === "application/pdf"
      ? await renderPDFPages(file)
      : [await prepareImageForOCR(file)];
    const pages = [];
    for (let index = 0; index < sources.length; index++) {
      const { data } = await worker.recognize(sources[index]);
      pages.push(data.text || "");
    }
    return pages.join("\n\n");
  } finally {
    await worker.terminate();
  }
}

const OCR_MAX_EDGE = 3200;
const OCR_MAX_PIXELS = 12_000_000;

function fitOCRCanvas(width, height) {
  let scale = Math.min(1, OCR_MAX_EDGE / Math.max(width, height));
  if (width * height * scale * scale > OCR_MAX_PIXELS) scale = Math.sqrt(OCR_MAX_PIXELS / (width * height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

async function prepareImageForOCR(file) {
  const bitmap = await createImageBitmap(file);
  const size = fitOCRCanvas(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = size.width; canvas.height = size.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(bitmap, 0, 0, size.width, size.height);
  bitmap.close?.();
  const image = ctx.getImageData(0, 0, size.width, size.height);
  // Mild contrast + grayscale preserves faint certificate text without destructive binarisation.
  for (let i = 0; i < image.data.length; i += 4) {
    const grey = Math.max(0, Math.min(255, ((image.data[i] * .299 + image.data[i + 1] * .587 + image.data[i + 2] * .114) - 128) * 1.18 + 128));
    image.data[i] = image.data[i + 1] = image.data[i + 2] = grey;
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}

export const MAX_PDF_PAGES = 3;

// Render up to 3 pages locally. Rejects PDFs exceeding the limit to prevent client memory exhaustion.
async function renderPDFPages(file) {
  const data = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data });
  let pdf = null;
  const pages = [];

  try {
    pdf = await loadingTask.promise;
    if (pdf.numPages > MAX_PDF_PAGES) {
      throw new Error(`PDF exceeds the maximum allowed limit of ${MAX_PDF_PAGES} pages (found ${pdf.numPages} pages). Please upload a document with ${MAX_PDF_PAGES} or fewer pages.`);
    }
    for (let n = 1; n <= pdf.numPages; n++) {
      try {
        const page = await pdf.getPage(n);
        const base = page.getViewport({ scale: 2.5 });
        const size = fitOCRCanvas(base.width, base.height);
        const viewport = page.getViewport({ scale: size.width / base.width * 2.5 });
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(viewport.width);
        canvas.height = Math.round(viewport.height);
        const ctx = canvas.getContext("2d", { alpha: false });
        await page.render({ canvasContext: ctx, viewport }).promise;
        pages.push(canvas);
      } catch (pageError) {
        console.warn("PDF page render failed; continuing with remaining pages", pageError);
      }
    }
    if (!pages.length) {
      throw new Error("No PDF pages could be rendered for OCR.");
    }
    return pages;
  } finally {
    try {
      if (loadingTask && typeof loadingTask.destroy === "function") {
        loadingTask.destroy();
      }
    } catch (cleanupError) {
      console.warn("PDF loadingTask cleanup warning", cleanupError);
    }
    try {
      if (pdf && typeof pdf.cleanup === "function") {
        pdf.cleanup();
      }
    } catch (cleanupError) {
      console.warn("PDF cleanup warning", cleanupError);
    }
  }
}

// ── PATTERN LIBRARY ──────────────────────────────────────────
/* eslint-disable no-useless-escape */
const PATTERNS = {

  // ── Name patterns ────────────────────────────────────────
  name: [
    /(?:name\s*[:-]?\s*)([A-Z][A-Z\s.]{3,40})/i,
    /(?:student['s]?\s*name\s*[:-]?\s*)([A-Z][A-Z\s.]{3,40})/i,
    /(?:this is to certify that\s+(?:(?:mr|mrs|ms|thiru|tmt|selvi|kumari)\.?\s+)?)([A-Z][A-Z\s.]{3,40})/i,
    /(?:certified that\s+(?:(?:mr|mrs|ms|thiru|tmt|selvi|kumari)\.?\s+)?)([A-Z][A-Z\s.]{3,40})/i,
  ],

  // ── Father / Mother ───────────────────────────────────────
  fatherName: [
    /(?:father['s]?\s*name\s*[:-]?\s*)([A-Z][A-Z\s.]{3,40})/i,
    /(?:s\/o|son of|d\/o|daughter of)\s+([A-Z][A-Z\s.]{3,40})/i,
    /(?:father\s*[:-]\s*)([A-Z][A-Z\s.]{3,40})/i,
  ],
  motherName: [
    /(?:mother['s]?\s*name\s*[:-]?\s*)([A-Z][A-Z\s.]{3,40})/i,
    /(?:mother\s*[:-]\s*)([A-Z][A-Z\s.]{3,40})/i,
  ],

  // ── DOB ───────────────────────────────────────────────────
  dob: [
    /(?:date of birth|dob|born on|d\.o\.b)\s*[:-]?\s*(\d{1,2}[-/.]\d{1,2}[-/.]\d{4})/i,
    /(?:date of birth|dob)\s*[:-]?\s*(\d{4}[-/.]\d{1,2}[-/.]\d{1,2})/i,
    /\b(0[1-9]|[12]\d|3[01])[-/.](0[1-9]|1[0-2])[-/.](19|20)\d{2}\b/,
  ],

  // ── Board ─────────────────────────────────────────────────
  board: [
    /(Tamil Nadu.*?Board|Tamil Nadu.*?Matriculation|TN.*?Board|CBSE|ICSE|ISC|State Board of Tamil Nadu|Board of.*?Tamil Nadu)/i,
    /(Tamil Nadu State Board|Matriculation Board|Anglo-Indian Board)/i,
  ],

  // ── School / College ──────────────────────────────────────
  school: [
    /(?:school\s*[:-]?\s*)([A-Z][A-Za-z\s.,-]{5,60}(?:School|College|Higher Secondary|Hr\. Sec|Matric))/i,
    /(?:name of (?:the )?(?:school|institution|college)\s*[:-]?\s*)([A-Z][A-Za-z\s.,]{5,60})/i,
    /([A-Z][A-Za-z\s]{3,40}(?:Higher Secondary School|Hr\.Sec\.School|Matriculation School|HSS))/,
  ],

  // ── Year ──────────────────────────────────────────────────
  year: [
    /(?:year of passing|year\s*[:-])\s*(20\d{2}|19\d{2})/i,
    /(?:examination|exam)\s*(?:held in|year)\s*(20\d{2}|19\d{2})/i,
    /\b(20[0-2]\d)\b/,
  ],

  // ── Month ─────────────────────────────────────────────────
  month: [
    /(January|February|March|April|May|June|July|August|September|October|November|December)/i,
  ],

  // ── Marks ─────────────────────────────────────────────────
  totalMarks: [
    /(?:total marks[^0-9]*|grand total[^0-9]*)(\d{2,4})\s*\/\s*(\d{2,4})/i,
    /(?:total[^0-9]*)(\d{3,4})\s*out of\s*(\d{3,4})/i,
    /(\d{3,4})\s*\/\s*(500|600|1000|800|450|400)/,
  ],
  marksScored: [
    /(?:total marks obtained|marks obtained|total obtained)\s*[:-]?\s*(\d{3,4})/i,
    /(?:grand total)\s*[:-]?\s*(\d{3,4})/i,
  ],

  // ── Community ─────────────────────────────────────────────
  community: [
    /(?:community\s*[:-]?\s*)([A-Z][A-Za-z\s-]{3,40})/i,
    /(?:caste\s*[:-]?\s*)([A-Z][A-Za-z\s-]{3,40})/i,
    /(Scheduled Caste|Scheduled Tribe|Backward Class|Most Backward Class|Other Backward Class|Forward Class|General)/i,
  ],
  communityCategory: [
    /\b(SC|ST|BC|MBC|OBC|EBC|DNC|FC|General)\b/i,
    /(Scheduled Caste|Scheduled Tribe|Backward Class|Most Backward Class|Other Backward Class)/i,
  ],

  // ── Income ────────────────────────────────────────────────
  income: [
    /(?:annual income|income|total income|yearly income)\s*[:-]?\s*(?:Rs\.?|₹)?\s*(\d[\d,]+)/i,
    /(?:Rs\.?|₹)\s*(\d[\d,]+)\s*(?:per annum|\/annum|\/year|only)/i,
    /(\d[\d,]+)\s*(?:rupees only|\/- only|\/\-)/i,
  ],

  // ── Certificate Number ────────────────────────────────────
  certNumber: [
    /(?:certificate\s*(?:no|number|#)\s*[:-]?\s*)([A-Z0-9/-]+)/i,
    /(?:reg(?:istration)?\s*(?:no|number)\s*[:-]?\s*)([A-Z0-9/-]+)/i,
    /(?:serial\s*(?:no|number)\s*[:-]?\s*)([A-Z0-9/-]+)/i,
  ],

  // ── Issue / Valid Date ────────────────────────────────────
  issueDate: [
    /(?:date of issue|issued on|issue date)\s*[:-]?\s*(\d{1,2}[-/.]\d{1,2}[-/.]\d{4})/i,
    /(?:date)\s*[:-]?\s*(\d{1,2}[-/.]\d{1,2}[-/.]\d{4})/i,
  ],
  validUpto: [
    /(?:valid(?:ity)?\s*(?:upto|up to|till|until)|expiry date)\s*[:-]?\s*(\d{1,2}[-/.]\d{1,2}[-/.]\d{4})/i,
  ],

  // ── Address parts ─────────────────────────────────────────
  taluk: [
    /(?:taluk|taluka)\s*[:-]?\s*([A-Z][A-Za-z\s]{3,30})/i,
  ],
  district: [
    /(?:district|dist)\s*[:-]?\s*([A-Z][A-Za-z\s]{3,30})/i,
  ],
  state: [
    /(?:state)\s*[:-]?\s*([A-Z][A-Za-z\s]{3,30})/i,
    /(Tamil Nadu|Andhra Pradesh|Telangana|Karnataka|Kerala|Maharashtra|Uttar Pradesh|Rajasthan)/i,
  ],

  // ── Issuing authority ─────────────────────────────────────
  issuingAuthority: [
    /(?:tahsildar|revenue divisional officer|rdo|district collector|block development officer)\s*,?\s*([A-Za-z\s,]+)/i,
    /(Tahsildar|Revenue Divisional Officer|District Collector|Panchayat President)/i,
  ],
};
/* eslint-enable no-useless-escape */

// ── DOCUMENT TYPE DETECTOR ────────────────────────────────────
export function detectDocumentType(text) {
  const t = text.toLowerCase().replace(/\s+/g, " ");
  const scores = {
    ms10:      0,
    ms12:      0,
    community: 0,
    income:    0,
    aadhaar:   0,
    bankpass:  0,
  };

  // 10th markers
  if (/sslc|10th|tenth|matriculation|class\s*x\b|standard\s*x\b|std\s*x\b/.test(t)) scores.ms10 += 5;
  if (/secondary school leaving certificate/.test(t)) scores.ms10 += 8;
  if (/board of secondary/.test(t)) scores.ms10 += 4;

  // 12th markers
  if (/12th|twelfth|hsc|higher secondary|plus two|\+\s*2|class\s*xii\b|standard\s*xii\b|std\s*xii\b|std\s*12/.test(t)) scores.ms12 += 5;
  if (/higher secondary certificate/.test(t)) scores.ms12 += 8;
  if (/board of higher secondary/.test(t)) scores.ms12 += 4;

  // Community cert markers
  if (/community certificate|caste certificate/.test(t)) scores.community += 8;
  if (/scheduled caste|scheduled tribe|backward class|most backward/.test(t)) scores.community += 4;
  if (/this is to certify that/.test(t) && /community|caste/.test(t)) scores.community += 5;
  if (/tahsildar|revenue divisional/.test(t)) scores.community += 3;

  // Income cert markers
  if (/income certificate|annual income|yearly income/.test(t)) scores.income += 8;
  if (/total income|family income/.test(t)) scores.income += 4;
  if (/rupees only|per annum/.test(t)) scores.income += 3;
  if (/tahsildar|revenue divisional/.test(t)) scores.income += 2;

  // Aadhaar markers
  if (/aadhaar|unique identification|uidai/.test(t)) scores.aadhaar += 10;
  if (/\d{4}\s\d{4}\s\d{4}/.test(t)) scores.aadhaar += 8;

  // Bank passbook markers
  if (/passbook|savings account|current account|account number|ifsc/.test(t)) scores.bankpass += 8;
  if (/bank of|state bank|canara|axis|hdfc|sbi|indian bank/.test(t)) scores.bankpass += 4;

  const best = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const topScore = best[0][1], runnerUp = best[1][1];
  if (topScore === 0) return { type: "unknown", confidence: 0 };

  const confidence = Math.max(20, Math.min(100, topScore * 10 - (topScore - runnerUp < 3 ? 15 : 0)));
  return { type: best[0][0], confidence, allScores: scores };
}

// ── PATTERN EXTRACTOR ─────────────────────────────────────────
function extract(text, field) {
  const patterns = PATTERNS[field];
  if (!patterns) return null;
  for (const regex of patterns) {
    const match = text.match(regex);
    if (match) {
      const val = (match[2] ? match[1] : match[1] || match[0]).trim();
      if (val && val.length > 1) return val;
    }
  }
  return null;
}

const MARKSHEET_NAME_LABEL = /^(?:name\s*of\s*(?:the\s*)?(?:candidate|student)|candidate'?s?\s*name|student\s*name|name|(?:of\s+the\s+)?(?:candidate|candioate|candiate|student)|\b(?:name\s+of\s+the\s+candidate|name\s+of\s+candidate|candidate\s+name|student\s+name)\b|of\s+the\s+(?:candidate|candioate|candiate|student)\s+.+)$/i;
const REJECTED_NAME = /^(?:of\s+the\s+(?:candidate|candioate|candiate|student)|name\s+of\s+(?:the\s+)?(?:candidate|candioate|candiate|student)|candidate|candioate|candiate|student|name|the\s+candidate|secondary\s+school|higher\s+secondary|board|certificate|statement\s+of\s+marks)$/i;
const NAME_BLACKLIST = /\b(?:board|school|college|certificate|statement|examination|subject|marks|result|secondary|higher\s+secondary|government\s+of|tamil\s+nadu)\b/i;
const MONTH_RE = /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/i;

function cleanOCRLine(line) {
  return String(line || "").replace(/[|_]+/g, " ").replace(/\s+/g, " ").trim();
}
function stripNameLabelPrefix(raw) {
  return String(raw || "")
    .replace(/^\s*(?:name\s*of\s*(?:the\s*)?(?:candidate|student)|candidate'?s?\s*name|student\s*name|name)\s*[:\-–—]?\s*/i, "")
    .replace(/^\s*(?:of\s+the\s+(?:candidate|candioate|candiate|student)|of\s+(?:candidate|candioate|candiate|student))\s+/i, "")
    .replace(/^\s*(?:mr|mrs|ms|miss|kumari|selvi|thiru|tmt|sri|smt|thirumathi|thirumati|km)\.?\s+/i, "")
    .replace(/^(?:candidate|candioate|candiate|student)\s*[:\-–—]?\s*/i, "")
    .trim();
}
function removeOCRArtifactTokens(value) {
  const words = value.split(/\s+/).filter(Boolean);
  const trimmed = [...words];

  while (trimmed.length > 2 && /^[A-Za-z]$/.test(trimmed[0])) trimmed.shift();
  while (trimmed.length > 2 && /^(?:TO|T0)$/i.test(trimmed[trimmed.length - 1])) trimmed.pop();
  return trimmed.join(" ");
}
function normalizeCandidateName(value) {
  let v = cleanOCRLine(stripNameLabelPrefix(value)).replace(/^[:\-–—]\s*/, "").trim();
  v = removeOCRArtifactTokens(v);
  v = v.replace(/\s+(?:son\s+of|daughter\s+of|residing\s+at|r\/o|d\/o|s\/o|w\/o)\b.*$/i, "");
  v = v.replace(/\b(?:of\s+the\s+(?:candidate|candioate|candiate|student)|of\s+(?:candidate|candioate|candiate|student)|candidate|candioate|candiate|student)\b/gi, "").replace(/\s+/g, " ").trim();
  return v;
}
function isCandidateName(value) {
  let v = normalizeCandidateName(value);
  if (!v || v.length < 3 || v.length > 70 || REJECTED_NAME.test(v) || NAME_BLACKLIST.test(v) || /\d/.test(v)) return false;

  const words = v.split(/\s+/).filter(Boolean).map(word => word.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ.'-]/g, ""));
  if (words.length < 2) return false;
  if (words.some(word => /^(?:of|the|candidate|candioate|candiate|student|name|class|school|college|board|exam|certificate|marks|result)$/i.test(word))) return false;

  const hasLongNameWord = words.some(word => word.length >= 3);
  if (!hasLongNameWord) {
    return false;
  }

  if (words.every(word => word.length <= 2) && words.length >= 2) return false;

  return words.every(word => /^[A-Za-zÀ-ÖØ-öø-ÿ.'-]+$/.test(word));
}
function titleName(value) {
  let v = normalizeCandidateName(value);
  if (!v) return "";

  const isUppercase = /^[A-Z0-9\s\-.'/]+$/.test(v) && /[A-Z]/.test(v);
  if (isUppercase) {
    return v.split(/\s+/).map(part => {
      const normalized = part.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ'-]/g, "");
      if (!normalized) return part;
      return normalized.length === 1 ? normalized.toUpperCase() : normalized.toLowerCase().replace(/^([a-zà-ÿ])/i, (_, ch) => ch.toUpperCase());
    }).join(" ");
  }

  return v.split(/\s+/).map(part => {
    const normalized = part.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ'-]/g, "");
    if (!normalized) return part;
    return normalized.length === 1 ? normalized.toUpperCase() : normalized.toLowerCase().replace(/^([a-zà-ÿ])/i, (_, ch) => ch.toUpperCase());
  }).join(" ");
}

// OCR reading order is unreliable, so a marksheet name is extracted from a label's
// same line and then the following non-label lines instead of one generic regex.
function extractMarksheetName(text) {
  const lines = String(text || "").split(/\r?\n/).map(cleanOCRLine).filter(Boolean);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const normal = line.replace(/[^a-z]/gi, "").toLowerCase();
    const labelMatch = MARKSHEET_NAME_LABEL.test(line) || /^(?:nameofthecandidate|nameofcandidate|nameofthestudent|candidatename|studentname|ofthecandidate|ofthecandioate|ofthecandiate)$/i.test(normal) || /^of\s+the\s+(?:candidate|candioate|candiate|student)\s+.+$/i.test(line);
    if (!labelMatch) continue;

    const sameLine = stripNameLabelPrefix(line);
    if (sameLine && isCandidateName(sameLine)) return { value: titleName(sameLine), confidence: .96 };

    for (let offset = 1; offset <= 3 && i + offset < lines.length; offset++) {
      const candidate = lines[i + offset];
      if (!candidate || MARKSHEET_NAME_LABEL.test(candidate) || /^of\s+the\s+(?:candidate|candioate|candiate|student)$/i.test(candidate)) continue;
      if (isCandidateName(candidate)) return { value: titleName(candidate), confidence: .9 - offset * .05 };
      if (/\b(?:father|mother|date of birth|register|roll|school|total|subject)\b/i.test(candidate)) break;
    }
  }

  const fallback = extract(text, "name");
  if (fallback && isCandidateName(fallback)) return { value: titleName(fallback), confidence: .6 };
  return { value: null, confidence: 0 };
}

function extractMarksheetBoard(text, type) {
  const value = extract(text, "board") || (type === "ms12" && /(?:tamil nadu )?(?:board of )?higher secondary/i.test(text) ? "Tamil Nadu Higher Secondary" : null) || (type === "ms10" && /(?:sslc|secondary school leaving certificate)/i.test(text) ? "SSLC / State Board" : null);
  if (!value) return { value: null, confidence: 0 };
  if (/tamil nadu.*higher secondary|board of higher secondary/i.test(value)) return { value: "Tamil Nadu Higher Secondary", confidence: .9 };
  if (/tamil nadu|state board/i.test(value)) return { value: "Tamil Nadu State Board", confidence: .85 };
  return { value: cleanOCRLine(value), confidence: .85 };
}

function extractLabelValue(text, labels) {
  const lines = String(text || "").split(/\r?\n/).map(cleanOCRLine).filter(Boolean);
  for (let i = 0; i < lines.length; i++) {
    const re = new RegExp(`^(?:${labels})\\s*[:\\-–—]?\\s*(.*)$`, "i");
    const m = lines[i].match(re);
    if (!m) continue;
    const value = m[1] || lines[i + 1] || "";
    if (value.length >= 3 && value.length <= 100 && !/^\d/.test(value)) return value;
  }
  return null;
}
function extractMarksheetSchool(text) {
  const labelled = extractLabelValue(text, "(?:name\\s+of\\s+(?:the\\s+)?(?:school|institution|college)|school\\s+name|school|institution|college|name\\s+of\\s+college)");
  const value = labelled || extract(text, "school");
  return value ? { value: cleanOCRLine(value), confidence: labelled ? .9 : .65 } : { value: null, confidence: 0 };
}
function extractExamPeriod(text) {
  const labelled = text.match(/(?:year\s+of\s+passing|examination\s+year|exam(?:ination)?\s*(?:year|held)?|session)\s*[:\-–—]?\s*(?:([A-Za-z]+)\s*)?((?:19|20)\d{2})/i);
  const monthYear = text.match(new RegExp(`${MONTH_RE.source}\\s*(?:[-,/]?\\s*)?((?:19|20)\\d{2})`, "i"));
  const year = labelled?.[2] || monthYear?.[2] || null;
  const month = labelled?.[1] && MONTH_RE.test(labelled[1]) ? labelled[1] : monthYear?.[1] || extract(text, "month");
  return { year, month: month ? month[0].toUpperCase() + month.slice(1).toLowerCase() : null, confidence: year ? (labelled || monthYear ? .9 : .55) : 0 };
}

// ── MARKS PARSER ─────────────────────────────────────────────
function extractMarks(text) {
  const cleaned = String(text || "");
  const patterns = [
    /(?:total\s+marks?|grand\s+total|marks\s+obtained|total\s+marks\s+obtained)[^\d]{0,32}(\d{2,4})\s*[/\-–—]?\s*(\d{2,4})/ig,
    /(?:total\s+marks?|grand\s+total)[^\d]{0,32}(\d{2,4})\s*(?:out\s+of|of)\s*(\d{2,4})/ig,
    /(\d{2,4})\s*[/\-–—]?\s*(500|600|800|1000|1200)\b/g,
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(cleaned);
    if (!match) continue;
    const scored = Number.parseInt(match[1] || match[0], 10);
    const max = Number.parseInt(match[2] || match[1], 10);
    if (!Number.isFinite(scored) || !Number.isFinite(max) || max < 100 || scored < 0 || scored > max) continue;

    const pct = ((scored / max) * 100).toFixed(2);
    return {
      marksScored: String(scored),
      maxMarks: String(max),
      marks: `${scored}/${max}`,
      percentage: `${pct}%`,
      grade: scored / max >= 0.33 ? "Pass" : "Fail",
    };
  }

  const scored = extract(text, "marksScored");
  if (scored) {
    return {
      marksScored: scored,
      maxMarks: null,
      marks: scored,
      percentage: null,
      grade: /\b(?:result\s*[:-]?\s*)?(pass|fail)\b/i.exec(text)?.[1] || null,
    };
  }
  return {};
}

// ── DATE FORMATTER ────────────────────────────────────────────
function formatDate(str) {
  if (!str) return null;
  // Normalise separators
  const clean = str.replace(/[./]/g, "-");
  // Already DD-MM-YYYY?
  if (/^\d{2}-\d{2}-\d{4}$/.test(clean)) return clean;
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    const [y, m, d] = clean.split("-");
    return `${d}-${m}-${y}`;
  }
  // D-M-YYYY
  const parts = clean.split("-");
  if (parts.length === 3) {
    return `${parts[0].padStart(2,"0")}-${parts[1].padStart(2,"0")}-${parts[2]}`;
  }
  return str;
}

// ── INCOME FORMATTER ─────────────────────────────────────────
function formatIncome(str) {
  if (!str) return null;
  const num = parseInt(str.replace(/,/g, ""));
  if (isNaN(num)) return str;
  return `₹${num.toLocaleString("en-IN")}`;
}

// ── CATEGORY NORMALISER ───────────────────────────────────────
function normaliseCommunityCategory(raw) {
  if (!raw) return null;
  const r = raw.toUpperCase();
  if (r.includes("SCHEDULED CASTE") || r === "SC") return "Scheduled Caste (SC)";
  if (r.includes("SCHEDULED TRIBE") || r === "ST") return "Scheduled Tribe (ST)";
  if (r.includes("MOST BACKWARD") || r === "MBC") return "Most Backward Class (MBC)";
  if (r.includes("OTHER BACKWARD") || r === "OBC") return "Other Backward Class (OBC)";
  if (r.includes("BACKWARD CLASS") || r === "BC") return "Backward Class (BC)";
  if (r.includes("DENOTIFIED") || r === "DNC" || r === "EBC") return "Denotified Community (DNC/EBC)";
  if (r === "FC" || r.includes("FORWARD") || r.includes("GENERAL")) return "Forward Class (General)";
  return raw;
}

// ── VALIDATION RULES ─────────────────────────────────────────
function validateExtracted(type, data, text) {
  const issues = [];
  const warnings = [];

  if (type === "ms10" || type === "ms12") {
    if (!data.name) warnings.push("Student name not found — upload a clearer image or verify manually");
    if (!data.board) warnings.push("Board name not clearly visible");
    if (!data.marksScored) warnings.push("Total marks not detected — check scan quality");
    if (data.percentage) {
      const pct = parseFloat(data.percentage);
      if (pct < 33) issues.push(`Low percentage (${data.percentage}) — verify marks`);
    }
    if (!data.year) warnings.push("Year of passing not detected");
  }

  if (type === "community") {
    if (!data.name) issues.push("Name not found on certificate");
    if (!data.community) issues.push("Community/caste name not detected");
    if (!data.issuingAuthority) warnings.push("Issuing authority not clearly visible");
    if (!data.district) warnings.push("District not detected");
    // Check expiry
    if (data.validUpto) {
      const parts = data.validUpto.split("-");
      if (parts.length === 3) {
        const expiry = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        if (expiry < new Date()) issues.push("Certificate may be expired — check validity date");
      }
    }
  }

  if (type === "income") {
    if (!data.name) issues.push("Name not found on certificate");
    if (!data.income) issues.push("Income amount not detected");
    if (!data.issueDate) warnings.push("Issue date not detected");
    // Income cert should be within 1 year
    if (data.issueDate) {
      const parts = data.issueDate.split("-");
      if (parts.length === 3) {
        const issued = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        const ageMonths = (new Date() - issued) / (1000 * 60 * 60 * 24 * 30);
        if (ageMonths > 12) issues.push("⚠️ Income certificate is older than 12 months — get a fresh one");
        else if (ageMonths > 9) warnings.push("Income certificate is over 9 months old — renew soon");
      }
    }
    if (data.income) {
      const num = parseInt(data.income.replace(/[₹,]/g, ""));
      if (num > 800000) warnings.push("Income exceeds ₹8 lakh — may not qualify for most scholarships");
      else if (num > 250000) warnings.push("Income above ₹2.5 lakh — check eligibility for your scholarship");
    }
  }

  return { issues, warnings };
}

// Pure text entry point used by regression tests; OCR always calls this after it
// has completed locally in the browser.
export function extractMarksheetFields(rawText, type) {
  const name = extractMarksheetName(rawText), board = extractMarksheetBoard(rawText, type);
  const school = extractMarksheetSchool(rawText), period = extractExamPeriod(rawText);
  const marks = extractMarks(rawText);
  return {
    name: name.value, board: board.value, school: school.value, year: period.year, month: period.month, ...marks,
    fieldConfidence: { name: name.confidence, board: board.confidence, school: school.confidence, year: period.confidence, month: period.month ? period.confidence : 0, marksScored: marks.marksScored ? (marks.maxMarks ? .9 : .65) : 0, maxMarks: marks.maxMarks ? .9 : 0 },
  };
}

// ── MAIN EXTRACTION FUNCTION ─────────────────────────────────
export async function extractDocumentData(file, docType, onProgress) {

  onProgress?.({ stage: "ocr", pct: 0, msg: "Starting OCR scan..." });

  let rawText;
  try {
    rawText = await runOCR(file, (pct) => {
      onProgress?.({ stage: "ocr", pct: Math.round(pct * 0.8), msg: `Reading document... ${pct}%` });
    });
  } catch (err) {
    return { success: false, error: `OCR failed: ${err.message}`, rawText: "" };
  }

  onProgress?.({ stage: "analyze", pct: 85, msg: "Analysing content..." });

  // Auto-detect type if not provided
  const detected = detectDocumentType(rawText);
  const type = docType || detected.type;

  let extracted = {};

  if (type === "ms10" || type === "ms12") {
    extracted = extractMarksheetFields(rawText, type);
  }

  if (type === "community") {
    const catRaw = extract(rawText, "communityCategory") || extract(rawText, "community");
    extracted = {
      name:              extract(rawText, "name"),
      fatherName:        extract(rawText, "fatherName"),
      motherName:        extract(rawText, "motherName"),
      dob:               formatDate(extract(rawText, "dob")),
      community:         extract(rawText, "community"),
      communityCategory: normaliseCommunityCategory(catRaw),
      certNumber:        extract(rawText, "certNumber"),
      issueDate:         formatDate(extract(rawText, "issueDate")),
      validUpto:         formatDate(extract(rawText, "validUpto")),
      taluk:             extract(rawText, "taluk"),
      district:          extract(rawText, "district"),
      state:             extract(rawText, "state") || "Tamil Nadu",
      issuingAuthority:  extract(rawText, "issuingAuthority"),
    };
  }

  if (type === "income") {
    extracted = {
      name:             extract(rawText, "name"),
      fatherName:       extract(rawText, "fatherName"),
      dob:              formatDate(extract(rawText, "dob")),
      income:           formatIncome(extract(rawText, "income")),
      certNumber:       extract(rawText, "certNumber"),
      issueDate:        formatDate(extract(rawText, "issueDate")),
      validUpto:        formatDate(extract(rawText, "validUpto")),
      taluk:            extract(rawText, "taluk"),
      district:         extract(rawText, "district"),
      state:            extract(rawText, "state") || "Tamil Nadu",
      issuingAuthority: extract(rawText, "issuingAuthority"),
    };
  }

  // Remove null/undefined values
  Object.keys(extracted).forEach(k => {
    if (extracted[k] === null || extracted[k] === undefined) delete extracted[k];
  });

  onProgress?.({ stage: "validate", pct: 95, msg: "Validating fields..." });

  const { issues, warnings } = validateExtracted(type, extracted, rawText);
  const documentTypeValid = (type !== "ms10" && type !== "ms12") || detected.type === type || detected.type === "unknown";
  if (!documentTypeValid) issues.unshift(`Uploaded document appears to be a ${DOC_TYPES[detected.type]?.label || detected.type}, not the requested marksheet`);

  onProgress?.({ stage: "done", pct: 100, msg: "Done!" });

  // Count filled fields for confidence score
  const fieldConfidence = extracted.fieldConfidence || {};
  const confidenceValues = Object.values(fieldConfidence).filter(Number.isFinite);
  const confidence = confidenceValues.length ? Math.round(confidenceValues.reduce((a, b) => a + b, 0) / confidenceValues.length * 100) : 0;

  return {
    success: true,
    type,
    detectedType: detected.type,
    detectedConfidence: detected.confidence,
    extracted,
    issues,
    warnings,
    confidence,
    rawText,
    // An OCR-missing field does not turn a correctly detected marksheet into a wrong document.
    isValid: issues.length === 0,
    documentTypeValid,
    fieldsIncomplete: (type === "ms10" || type === "ms12") && (!extracted.name || !extracted.marksScored || !extracted.year),
  };
}

// ── FIELD LABELS ─────────────────────────────────────────────
export const FIELD_LABELS = {
  name: "Student Name",
  fatherName: "Father's Name",
  motherName: "Mother's Name",
  dob: "Date of Birth",
  board: "Board / University",
  school: "School / College",
  year: "Year of Passing",
  month: "Month",
  marksScored: "Marks Obtained",
  maxMarks: "Maximum Marks",
  marks: "Marks (Scored / Max)",
  percentage: "Percentage",
  grade: "Result",
  community: "Community / Caste",
  communityCategory: "Category",
  certNumber: "Certificate No.",
  issueDate: "Issue Date",
  validUpto: "Valid Upto",
  income: "Annual Family Income",
  taluk: "Taluk",
  district: "District",
  state: "State",
  issuingAuthority: "Issuing Authority",
};

export const DOC_TYPES = {
  ms10: { label: "10th Marksheet", icon: "📘", color: "#3b82f6" },
  ms12: { label: "12th Marksheet", icon: "📗", color: "#8b5cf6" },
  community: { label: "Community Certificate", icon: "📜", color: "#f59e0b" },
  income: { label: "Income Certificate", icon: "💰", color: "#10b981" },
  aadhaar: { label: "Aadhaar Card", icon: "🪪", color: "#6366f1" },
  bankpass: { label: "Bank Passbook", icon: "🏦", color: "#ec4899" },
  unknown: { label: "Unknown Document", icon: "📄", color: "#94a3b8" },
};
