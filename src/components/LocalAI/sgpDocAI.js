// ================================================================
//  SGP LOCAL DOCUMENT EXTRACTION AI
//  100% browser-based — Tesseract.js OCR + PDF.js + Custom Extraction
//  No API key, no external servers, no cloud OCR dependency
//  Extracts & Normalizes: Name, DOB, Community, Income, Marks, Board, etc.
// ================================================================

import { createWorker } from "tesseract.js";
import * as pdfjsLib from "pdfjs-dist";
import { checkFileQuality } from "../../utils/imageQuality";
import { preprocessCanvasForOCR, fitOCRCanvas } from "../../utils/imagePreprocessing";
import {
  detectDocumentType,
  validateDocumentSlot,
  SUPPORTED_DOC_TYPES,
} from "../../utils/documentClassifier";
import {
  extractMarksheetData,
  extractCommunityCertificateData,
  extractIncomeCertificateData,
} from "../../utils/fieldParsers";

export { detectDocumentType, validateDocumentSlot };

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

export const MAX_PDF_PAGES = 3;

/**
 * Renders up to 3 PDF pages locally using PDF.js.
 */
async function renderPDFPages(file, qualityAssessment = null) {
  const data = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data });
  let pdf = null;
  const pages = [];

  try {
    pdf = await loadingTask.promise;
    if (pdf.numPages > MAX_PDF_PAGES) {
      throw new Error(
        `PDF exceeds the maximum allowed limit of ${MAX_PDF_PAGES} pages (found ${pdf.numPages} pages). Please upload a document with ${MAX_PDF_PAGES} or fewer pages.`
      );
    }
    for (let n = 1; n <= pdf.numPages; n++) {
      try {
        const page = await pdf.getPage(n);
        const base = page.getViewport({ scale: 2.2 });
        const size = fitOCRCanvas(base.width, base.height);
        const viewport = page.getViewport({ scale: (size.width / base.width) * 2.2 });
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(viewport.width);
        canvas.height = Math.round(viewport.height);
        const ctx = canvas.getContext("2d", { alpha: false, willReadFrequently: true });
        await page.render({ canvasContext: ctx, viewport }).promise;

        // Apply preprocessing
        const preprocessed = preprocessCanvasForOCR(canvas, qualityAssessment);
        pages.push(preprocessed);
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

/**
 * Prepares image file for OCR with quality-driven preprocessing.
 */
async function prepareImageForOCR(file, qualityAssessment = null) {
  let bitmap = null;
  if (typeof createImageBitmap === "function") {
    bitmap = await createImageBitmap(file);
  } else {
    // Fallback using HTMLImageElement
    bitmap = await new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = (e) => {
        URL.revokeObjectURL(url);
        reject(new Error("Image decoding failed"));
      };
      img.src = url;
    });
  }

  const preprocessedCanvas = preprocessCanvasForOCR(bitmap, qualityAssessment);
  bitmap.close?.();
  return preprocessedCanvas;
}

/**
 * OCR ENGINE — Runs Tesseract.js on image/pdf file client-side.
 * Returns text, page confidences, and average OCR confidence.
 */
export async function runOCR(file, onProgress, qualityAssessment = null) {
  const worker = await createWorker("eng", 1, {
    logger: (m) => {
      if (m.status === "recognizing text" && onProgress) {
        onProgress(Math.round(m.progress * 100));
      }
    },
  });

  try {
    const sources = file.type === "application/pdf"
      ? await renderPDFPages(file, qualityAssessment)
      : [await prepareImageForOCR(file, qualityAssessment)];

    const pagesText = [];
    const confidences = [];

    for (let index = 0; index < sources.length; index++) {
      const { data } = await worker.recognize(sources[index]);
      pagesText.push(data.text || "");
      if (typeof data.confidence === "number" && !isNaN(data.confidence)) {
        confidences.push(data.confidence);
      }
    }

    const avgConfidence = confidences.length
      ? Math.round(confidences.reduce((a, b) => a + b, 0) / confidences.length)
      : 80;

    return {
      text: pagesText.join("\n\n"),
      ocrConfidence: avgConfidence,
    };
  } finally {
    await worker.terminate();
  }
}

/**
 * Backward-compatible text parser used by regression tests.
 */
export function extractMarksheetFields(rawText, type = "ms10") {
  return extractMarksheetData(rawText, type);
}

/**
 * Validates extracted fields for missing requirements and potential anomalies.
 */
function validateExtractedDocument(type, data) {
  const issues = [];
  const warnings = [];

  if (type === "ms10" || type === "ms12") {
    if (!data.name) warnings.push("Student name not detected — upload a clearer image or enter details in Step 2.");
    if (!data.board) warnings.push("Board name not clearly visible.");
    if (!data.marksScored) warnings.push("Total marks not detected — check scan quality.");
    if (data.percentage) {
      const pct = parseFloat(data.percentage);
      if (pct < 35) issues.push(`Low percentage (${data.percentage}) — below standard pass criteria.`);
    }
    if (!data.year) warnings.push("Year of passing not detected.");
  }

  if (type === "community") {
    if (!data.name) issues.push("Student name not found on community certificate.");
    if (!data.communityCategory && !data.community) issues.push("Community / caste category not detected.");
    if (!data.certNumber) warnings.push("Certificate registration number not clearly readable.");
    if (!data.issuingAuthority) warnings.push("Issuing authority / Tahsildar seal not clearly visible.");
  }

  if (type === "income") {
    if (!data.name) issues.push("Applicant / parent name not detected on income certificate.");
    if (!data.incomeNumber && !data.income) issues.push("Annual income amount not detected.");
    if (!data.issueDate) warnings.push("Issue date not detected — certificates should be from current financial year.");

    if (data.issueDate) {
      const parts = data.issueDate.split("-");
      if (parts.length === 3) {
        const issued = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        const ageMonths = (new Date() - issued) / (1000 * 60 * 60 * 24 * 30);
        if (ageMonths > 12) issues.push("Income certificate is older than 12 months — renewal required for NSP.");
        else if (ageMonths > 6) warnings.push("Income certificate is 6-12 months old — fresh certificate recommended.");
      }
    }
  }

  return { issues, warnings };
}

/**
 * MAIN DOCUMENT EXTRACTION ENTRYPOINT
 * 
 * Pipeline:
 * 1. Image / PDF quality check
 * 2. Adaptive Preprocessing
 * 3. Client-side OCR (Tesseract.js / PDF.js)
 * 4. Multi-Signal Document Type Classifier
 * 5. Slot Validation
 * 6. Document-Specific Parsing
 * 7. Field Normalization & Validation
 * 8. Multi-Factor Confidence Scoring
 */
export async function extractDocumentData(file, slotType, onProgress) {
  onProgress?.({ stage: "quality", pct: 10, msg: "Assessing image quality..." });

  // 1. Image Quality Assessment
  let qualityResult = null;
  try {
    qualityResult = await checkFileQuality(file);
  } catch (qErr) {
    console.warn("Image quality check warning:", qErr);
  }

  onProgress?.({ stage: "ocr", pct: 20, msg: "Starting OCR scan..." });

  // 2 & 3. Preprocessing & OCR
  let ocrResult;
  try {
    ocrResult = await runOCR(file, (pct) => {
      onProgress?.({ stage: "ocr", pct: 20 + Math.round(pct * 0.6), msg: `Reading document... ${pct}%` });
    }, qualityResult);
  } catch (err) {
    return {
      success: false,
      error: `OCR failed: ${err.message}`,
      rawText: "",
      quality: qualityResult,
    };
  }

  const rawText = ocrResult.text || "";
  const ocrConfidence = ocrResult.ocrConfidence || 80;

  onProgress?.({ stage: "classify", pct: 85, msg: "Classifying document type..." });

  // 4. Document Classification
  const detected = detectDocumentType(rawText, { name: file.name, type: file.type });
  const type = slotType || detected.type;

  // 5. Slot Validation
  const slotValidation = validateDocumentSlot(slotType, detected);

  onProgress?.({ stage: "extract", pct: 90, msg: "Extracting structured fields..." });

  // 6. Document-Specific Field Extraction
  let extracted = {};
  if (type === "ms10" || type === "ms12") {
    extracted = extractMarksheetData(rawText, type);
  } else if (type === "community") {
    extracted = extractCommunityCertificateData(rawText);
  } else if (type === "income") {
    extracted = extractIncomeCertificateData(rawText);
  } else {
    // Fallback extraction
    extracted = {
      name: rawText.match(/(?:name\s*[:-]?\s*)([A-Z][A-Za-z\s.]{3,40})/i)?.[1] || null,
    };
  }

  // Remove empty/null values
  Object.keys(extracted).forEach((k) => {
    if (extracted[k] === null || extracted[k] === undefined) {
      delete extracted[k];
    }
  });

  onProgress?.({ stage: "validate", pct: 95, msg: "Validating consistency..." });

  // 7. Validation
  const { issues, warnings } = validateExtractedDocument(type, extracted);

  // If document type is mismatched with slot
  if (slotValidation.status === "mismatch") {
    issues.unshift(slotValidation.message);
  } else if (slotValidation.status === "unconfident") {
    warnings.unshift(slotValidation.message);
  }

  // If quality has issues
  if (qualityResult && qualityResult.qualityLevel === "poor") {
    warnings.push(...qualityResult.issues);
  }

  // 8. Multi-Factor Confidence
  const fieldConfValues = Object.values(extracted.fieldConfidence || {}).filter(Number.isFinite);
  const fieldConfidence = fieldConfValues.length
    ? Math.round((fieldConfValues.reduce((a, b) => a + b, 0) / fieldConfValues.length) * 100)
    : 70;

  const classificationConfidence = detected.confidence || 0;
  const overallConfidence = Math.round(
    ocrConfidence * 0.40 + fieldConfidence * 0.40 + classificationConfidence * 0.20
  );

  onProgress?.({ stage: "done", pct: 100, msg: "Done!" });

  return {
    success: true,
    type,
    detectedType: detected.type,
    detectedConfidence: detected.confidence,
    classificationReasons: detected.reasons || [],
    slotValidation,
    extracted,
    issues,
    warnings,
    quality: qualityResult,
    ocrConfidence,
    fieldConfidence,
    classificationConfidence,
    confidence: overallConfidence,
    rawText,
    isValid: issues.length === 0,
    documentTypeValid: slotValidation.status !== "mismatch",
    fieldsIncomplete: (type === "ms10" || type === "ms12") && (!extracted.name || !extracted.marksScored || !extracted.year),
  };
}

export const FIELD_LABELS = {
  name: "Student Name",
  fatherName: "Father's Name",
  motherName: "Mother's Name",
  dob: "Date of Birth",
  board: "Board / University",
  school: "School / College",
  year: "Year of Passing",
  month: "Month",
  registerNumber: "Registration / Roll No",
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
  incomeNumber: "Income (Numeric)",
  taluk: "Taluk",
  district: "District",
  state: "State",
  issuingAuthority: "Issuing Authority",
};

export const DOC_TYPES = SUPPORTED_DOC_TYPES;
