/**
 * fieldParsers.js — SGP Document-Specific Field Extraction Engine
 * 
 * Dedicated state-agnostic parsers for:
 * 1. Marksheets (10th SSLC & 12th HSC / CBSE / ICSE / Other State Boards)
 * 2. Community / Caste Certificates
 * 3. Income Certificates
 * 
 * Key Principles:
 * - Never guesses or fabricates fields (maxMarks and percentage are null if not in document).
 * - Multi-factor candidate name scoring rejects labels, headings, numbers, and OCR noise.
 * - Decoupled state and authority extraction across all Indian states.
 */

import {
  formatTitleName,
  formatDateDisplay,
  parseIndianDate,
  normalizeIncome,
  formatIncomeDisplay,
  normalizeCommunity,
  normalizeReligion,
} from "./fieldNormalizer";
import { evaluateIncomeFreshness } from "./verificationEngine";
import { detectState, detectIssuingAuthority } from "./documentClassifier";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const MONTH_RE = new RegExp(`\\b(${MONTH_NAMES.join("|")}|JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\\b`, "i");

const MONTH_NAMES_SET = /^(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)$/i;

const MONTH_FULL_NAMES = {
  jan: "January", feb: "February", mar: "March", apr: "April", may: "May", jun: "June",
  jul: "July", aug: "August", sep: "September", oct: "October", nov: "November", dec: "December",
  january: "January", february: "February", march: "March", april: "April", june: "June",
  july: "July", august: "August", september: "September", october: "October", november: "November", december: "December"
};
function normalizeMonth(m) {
  if (!m) return null;
  const key = m.toLowerCase().trim();
  return MONTH_FULL_NAMES[key] || formatTitleName(m);
}

const REJECTED_NAME = /^(?:of\s+the\s+(?:candidate|candioate|candiate|student)|name\s+of\s+(?:the\s+)?(?:candidate|candioate|candiate|student)|candidate|candioate|candiate|student|name|the\s+candidate|secondary\s+school|higher\s+secondary|board|certificate|statement\s+of\s+marks|member|family\s*member|pn\s*mity|hr\s+ir\s+om|nil|null|na|date\s+of\s+birth|permanent\s+register\s+number|register\s+number|roll\s+number|total\s+marks|total|name\s+of\s+the\s+school)$/i;
const NAME_BLACKLIST = /\b(?:total|marks|result|board|school|college|certificate|statement|examination|subject|secondary|higher\s+secondary|government\s+of|department\s+of|vidyalaya|academy|date\s+of\s+birth|permanent\s+register|register\s+number|roll\s+number|born\s+on)\b/i;

function cleanOCRLine(line) {
  return String(line || "").replace(/[|_]+/g, " ").replace(/\s+/g, " ").trim();
}

function stripNameLabelPrefix(raw) {
  return String(raw || "")
    .replace(/^\s*(?:தேர்வரின்\s*பெயர்\s*[/]?\s*)?(?:name\s*of\s*(?:the\s*)?(?:candidate|student)|candidate'?s?\s*name|student\s*name)\s*[:\-–—]?\s*/i, "")
    .replace(/^\s*(?:of\s+the\s+(?:candidate|candioate|candiate|student)|of\s+(?:candidate|candioate|candiate|student))\s*[:\-–—]?\s*/i, "")
    .replace(/^\s*name\s*[:\-–—]\s*/i, "")
    .replace(/^\s*(?:mr|mrs|ms|miss|kumari|selvan|selvi|thiru|tmt|sri|smt|thirumathi|thirumati|km)\.?\s+/i, "")
    .trim();
}

function removeOCRArtifactTokens(value) {
  const words = value.split(/\s+/).filter(Boolean);
  const trimmed = [...words];

  // Remove trailing table markers like TO, NO, SL
  while (trimmed.length > 2 && /^(?:TO|T0|NO|SL|SLNO)$/i.test(trimmed[trimmed.length - 1])) trimmed.pop();
  return trimmed.join(" ");
}

function cleanCandidateName(value) {
  let v = String(value || "")
    .replace(/^[^A-Za-z]+/, "") // strip leading punctuation/noise like \', |, -, etc.
    .replace(/^(?:Pe\s+|Nm\s+|De\s+|La\s+|No\.?\s+|Sl\.?\s+)/i, "")
    .replace(/[^\x20-\x7E\s]/g, " ")
    .replace(/(?:^|\s+)(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\w*(?:\s+\d{2,4})?.*$/i, "")
    .replace(/\s+\b(?:SESSION|DOB|DATE|REG|ROLL|HSS|SEC|MATRIC|SCHOOL|EXAMINATION|PERMANENT|MARK|MARKS|CERTIFICATE|STATEMENT|OF\s+ISSUE)\b.*$/i, "")
    .replace(/\s+(?:son\s+of|daughter\s+of|residing\s+at|r\/o|d\/o|s\/o|w\/o)\b.*$/i, "")
    .replace(/\s+\d{4,}.*$/, "")
    .replace(/[^A-Za-z.'-]+$/, "") // strip trailing non-alpha punctuation
    .trim();

  v = stripNameLabelPrefix(v);
  v = removeOCRArtifactTokens(v);
  return v;
}



function isCandidateName(value) {
  let v = cleanCandidateName(value);
  if (!v || v.length < 3 || v.length > 70 || REJECTED_NAME.test(v) || NAME_BLACKLIST.test(v) || /\d/.test(v)) return false;

  // Single month token is not a name
  if (MONTH_NAMES_SET.test(v)) return false;

  const words = v.split(/\s+/).filter(Boolean).map(w => w.replace(/[^A-Za-z.'-]/g, ""));
  if (words.length < 1 || words.length > 6) return false;

  // If the words are purely noise words
  if (words.every(w => /^(?:of|the|name|class|school|college|board|exam|examination|certificate|marks|result|member|family|hr|ir|om|table|sl|no)$/i.test(w))) return false;

  // Vowel & Consonant rules for each word:
  for (const w of words) {
    // Single-letter word is valid ONLY if it's an initial (e.g. M, S, K, A)
    if (w.length === 1) {
      if (!/^[A-Za-z]$/.test(w)) return false;
      continue;
    }
    // Words of length >= 2 MUST have at least one English vowel (a, e, i, o, u, y)
    // Rejects Tamil OCR noise tokens like "Bh", "Lhe", "uf", "wrt", "sg", etc.
    if (!/[aeiouyAEIOUY]/.test(w)) return false;

    // Reject words with 4 or more consecutive consonants (unnatural in English/Indian names transliterated)
    // E.g. "psiull", "bsiul", "Gubipsiull", "eGausrmpgn", "sgewmogyt"
    if (/[bcdfghjklmnpqrstvwxzBCDFGHJKLMNPQRSTVWXZ]{4,}/.test(w)) return false;

    // Reject repetitive triples e.g. "lll", "fff"
    if (/([A-Za-z])\1\1/.test(w)) return false;
  }

  const hasLongWord = words.some(w => w.length >= 3);
  if (!hasLongWord) return false;

  return words.every(w => /^[A-Za-z.'-]+$/.test(w));
}

function scoreNameCandidate(raw, ocrConfidence = null, isNearLabel = true, layoutContext = null) {
  const clean = cleanCandidateName(raw);
  if (!isCandidateName(clean)) return { name: null, score: -1 };

  let score = 50;

  // Proximity to English/Tamil label
  if (isNearLabel) {
    score += 15;
  } else if (layoutContext && layoutContext.inTargetRegion) {
    // Proximity to structural candidate region
    score += 15;
    // Centrality bonus if well-positioned vertically within structural candidate band
    if (typeof layoutContext.bandTop === "number" && typeof layoutContext.bandBottom === "number" && typeof layoutContext.normYMid === "number") {
      const bandCenter = (layoutContext.bandTop + layoutContext.bandBottom) / 2;
      const distFromCenter = Math.abs(layoutContext.normYMid - bandCenter);
      const bandHalfSpan = Math.max(0.01, (layoutContext.bandBottom - layoutContext.bandTop) / 2);
      if (distFromCenter <= bandHalfSpan * 0.6) {
        score += 10;
      }
    }
  }

  // Cross-pass consistency bonus
  if (layoutContext && layoutContext.crossPassMatches >= 2) {
    score += 20;
  }

  // All uppercase Latin letters (Tamil Nadu & Indian marksheets print student names in ALL-CAPS: "SAMPLE STUDENT")
  if (/^[A-Z\s.]+$/.test(clean)) {
    score += 35;
  } else if (/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+$/.test(clean)) {
    // Standard Title Case
    score += 10;
  } else {
    // Mixed case or lowercase in odd positions is typical OCR noise
    score -= 30;
  }

  // Name structure pattern: "FIRSTNAME INITIAL", "INITIAL FIRSTNAME", "FIRSTNAME LASTNAME", or "FIRSTNAME MIDDLENAME LASTNAME"
  if (/^[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)*\s+[A-Z]\.?$/i.test(clean)) score += 20;
  else if (/^[A-Z]\.?\s+[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)*$/i.test(clean)) score += 20;
  else if (/^[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){1,3}$/i.test(clean)) score += 15;
  else if (/^[A-Z][A-Za-z]{2,}$/i.test(clean)) score += 10;

  // Penalize strings with OCR noise symbols
  if (/[-–—_~`|/\\]/.test(raw)) score -= 20;

  // Weight OCR confidence if provided
  if (typeof ocrConfidence === "number" && !isNaN(ocrConfidence)) {
    if (ocrConfidence >= 85) score += 15;
    else if (ocrConfidence < 60) score -= 25;
  }

  // Penalize typical Tamil OCR artifact patterns (e.g. starting with "Gub", containing odd sequences)
  if (/\b(?:Gub|psiu|eGau|sgew|Quip)\w*/i.test(clean)) score -= 60;

  return { name: clean, score };
}

function cleanLocation(s) {
  const v = String(s || "")
    .split(/\r?\n/)[0]
    .replace(/^(?:residing\s+at|residing|door\s+no\.?[^,]*,\s*|at|in|village|town|vilage\/city\s+[A-Za-z]+|of\s+|taluk\s+of\s+|district\s+of\s+)/i, "")
    .replace(/\s+(?:taluka|taluk|district|village|town|state|pin|and\s+his).*$/i, "")
    .replace(/[|_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return formatTitleName(v);
}

/**
 * Detects marksheet board and template based on document evidence.
 * Does not assume every marksheet follows Tamil Nadu layout.
 */
export function detectMarksheetTemplate(text, lines = null) {
  const combined = String(text || "") + " " + (Array.isArray(lines) ? lines.map(l => l.text || "").join(" ") : "");

  if (/higher\s*secondary|hsc\b|class\s*(?:xii|12th)\b|department\s+of\s+government\s+examinations.*tamil|மேல்நிலைப்/i.test(combined)) {
    return {
      template: "tn_hsc",
      board: "Tamil Nadu Higher Secondary (HSC)",
      state: "Tamil Nadu",
      confidence: 0.92,
      evidence: ["HIGHER SECONDARY", "TAMIL NADU / DGE"],
    };
  }
  if (/secondary\s*school\s*leaving|sslc\b|class\s*(?:x|10th)\b|matriculation\s*board.*tamil|பத்தாம்/i.test(combined)) {
    return {
      template: "tn_sslc",
      board: "Tamil Nadu State Board (SSLC)",
      state: "Tamil Nadu",
      confidence: 0.90,
      evidence: ["SSLC", "TAMIL NADU"],
    };
  }
  if (/central\s*board\s*of\s*secondary|cbse\b|all\s*india\s*senior\s*school|all\s*india\s*secondary/i.test(combined)) {
    return {
      template: "cbse",
      board: "CBSE",
      state: null,
      confidence: 0.95,
      evidence: ["CBSE"],
    };
  }
  if (/council\s*for\s*the\s*indian\s*school|cisce|icse|isc\b/i.test(combined)) {
    return {
      template: "icse",
      board: "CISCE (ICSE/ISC)",
      state: null,
      confidence: 0.95,
      evidence: ["CISCE"],
    };
  }

  const stateMatch = detectState(combined);
  if (stateMatch.state && /board\s+of|examination/i.test(combined)) {
    return {
      template: "state_board",
      board: `${stateMatch.state} State Board of School Examinations`,
      state: stateMatch.state,
      confidence: 0.85,
      evidence: [stateMatch.state],
    };
  }

  return {
    template: "generic",
    board: null,
    state: null,
    confidence: 0.50,
    evidence: [],
  };
}

/**
 * Spatial geometry extraction using normalized coordinates and dynamic document landmarks.
 * Works across different PDF resolutions, image sizes, scans, and crops without fixed pixel values.
 * 
 * Structural regions for recognized HSC/SSLC marksheets:
 * 1. HEADER (Title, State, Department)
 * 2. CANDIDATE NAME (Bilingual heading + student name band)
 * 3. DOB / REGISTER NUMBER (Date of Birth, Permanent Register Number, Session)
 * 4. SUBJECT MARKS (Table of subjects, theory, practical, totals)
 * 5. TOTAL MARKS (Scored / Maximum marks)
 * 6. SCHOOL (Institution name, Group, Medium)
 */
export function extractNameUsingGeometry(lineObjects, templateInfo = null) {
  if (!Array.isArray(lineObjects) || !lineObjects.length) return null;

  // 1. Determine document coordinate frame (normalized 0.0 to 1.0)
  let docW = 0;
  let docH = 0;

  for (const l of lineObjects) {
    if (l.pageWidth && l.pageWidth > docW) docW = l.pageWidth;
    if (l.pageHeight && l.pageHeight > docH) docH = l.pageHeight;
    if (l.bbox) {
      if (l.bbox.x1 > docW) docW = l.bbox.x1;
      if (l.bbox.y1 > docH) docH = l.bbox.y1;
    }
  }

  docW = Math.max(100, docW);
  docH = Math.max(100, docH);

  // Annotate normalized coordinates
  const normLines = lineObjects.map(l => {
    if (!l.bbox) return { ...l, normX0: 0, normY0: 0, normX1: 1, normY1: 1, normYMid: 0.5, normHeight: 0 };
    const normX0 = l.bbox.x0 / docW;
    const normY0 = l.bbox.y0 / docH;
    const normX1 = l.bbox.x1 / docW;
    const normY1 = l.bbox.y1 / docH;
    return {
      ...l,
      normX0,
      normY0,
      normX1,
      normY1,
      normYMid: (normY0 + normY1) / 2,
      normHeight: Math.max(0.005, normY1 - normY0),
    };
  });

  // 2. Strategy A & B: Anchor Label Priority Check (English / Tamil)
  const labelLine = normLines.find(l =>
    /(?:NAME\s*OF\s*(?:THE\s*)?(?:CANDIDATE|STUDENT)|CANDIDATE'?S?\s*NAME|STUDENT\s*NAME|தேர்வரின்\s*பெயர்|(?:AME|ME)\s*OF\s*(?:THE\s*)?CANDI)/i.test(l.text)
  );

  if (labelLine) {
    // Check if name is on same line to the right
    const sameLineSuffix = stripNameLabelPrefix(labelLine.text);
    if (sameLineSuffix) {
      const sc = scoreNameCandidate(sameLineSuffix, labelLine.confidence, true);
      if (sc.name && sc.score >= 65) {
        return { value: formatTitleName(sc.name), confidence: 0.95, method: "anchor_same_line" };
      }
    }

    // Find candidate lines in the spatial region directly below the label
    const nearbyLines = normLines.filter(l => {
      if (l === labelLine || !l.bbox) return false;
      const dy = l.normY0 - labelLine.normY1;
      const isBelow = dy >= -0.01 && dy <= labelLine.normHeight * 4.0;
      const xOverlap = l.normX0 <= labelLine.normX1 + 0.50 && l.normX1 >= labelLine.normX0 - 0.20;
      return isBelow && xOverlap;
    });

    let best = { name: null, score: -1 };
    for (const l of nearbyLines) {
      let textToScore = cleanCandidateName(l.text);
      const sc = scoreNameCandidate(textToScore, l.confidence, true);
      if (sc.score > best.score && sc.name) {
        best = sc;
      }
    }

    if (best.name && best.score >= 65) {
      return { value: formatTitleName(best.name), confidence: Math.min(0.98, best.score / 100), method: "anchor_line_below" };
    }
  }

  // 3. Strategy D: Geometry & Document Layout Fallback (Keyword-Free)
  // Used when "NAME OF THE CANDIDATE" is completely missing or corrupted from OCR.
  // Uses dynamic landmarks to locate the CANDIDATE NAME structural region.
  
  // Landmark A: HEADER (Title, State, Department) in top region
  const headerLandmarks = normLines.filter(l =>
    /(?:GOVERNMENT\s+OF|DEPARTMENT\s+OF|HIGHER\s+SECONDARY|SECONDARY\s+SCHOOL|STATEMENT\s+OF\s+MARKS|STATE\s+BOARD|BOARD\s+OF\s+SECONDARY|EXAMINATION)/i.test(l.text) &&
    l.normYMid < 0.28
  );
  const headerBottomY = headerLandmarks.length
    ? Math.max(...headerLandmarks.map(l => l.normY1))
    : 0.15;

  // Landmark B: DOB / REGISTER NUMBER / SESSION / SUBJECTS located below header
  const lowerLandmarks = normLines.filter(l =>
    /(?:PERMANENT\s*REGISTER|REGISTER\s*NUMBER|ROLL\s*NO|REG(?:ISTRATION)?\s*NO|DATE\s*OF\s*BIRTH|DOB|BORN\s*ON|SESSION|நிரந்தரப்|பிறந்த|\b\d{1,2}[/-]\d{1,2}[/-]\d{4}\b)/i.test(l.text) &&
    l.normYMid > (headerLandmarks.length ? headerBottomY * 0.9 : 0.15)
  );
  let lowerTopY = lowerLandmarks.length
    ? Math.min(...lowerLandmarks.map(l => l.normY0))
    : 0.50;

  // Landmark C: SUBJECT MARKS table header
  const subjectLandmarks = normLines.filter(l =>
    /(?:பாடம்|SUBJECT|THEORY|PRACTICAL|MARKS\s*OBTAINED)/i.test(l.text) &&
    l.normYMid > (headerLandmarks.length ? headerBottomY * 0.9 : 0.20)
  );
  if (!lowerLandmarks.length && subjectLandmarks.length) {
    lowerTopY = Math.min(...subjectLandmarks.map(l => l.normY0));
  }

  // Define normalized candidate window between Header and DOB/RegNo landmarks
  const bandTop = headerLandmarks.length ? Math.max(0.08, headerBottomY - 0.02) : 0.10;
  const bandBottom = lowerLandmarks.length || subjectLandmarks.length ? Math.min(0.95, lowerTopY + 0.02) : 0.50;
  const minX = 0.05;
  const maxX = 0.95;


  // Filter lines strictly within the structural CANDIDATE NAME band
  const candidatesInBand = [];

  for (const l of normLines) {
    if (!l.bbox) continue;
    if (l.normYMid < bandTop || l.normYMid > bandBottom) continue;
    if (l.normX0 > maxX || l.normX1 < minX) continue;

    // Must not be a landmark line itself
    if (/(?:GOVERNMENT\s+OF|DEPARTMENT\s+OF|HIGHER\s+SECONDARY|SECONDARY\s+SCHOOL|STATEMENT\s+OF\s+MARKS|PERMANENT\s*REGISTER|REGISTER\s*NUMBER|ROLL\s*NO|DATE\s*OF\s*BIRTH|DOB|SESSION|SUBJECT|MARKS)/i.test(l.text)) {
      continue;
    }

    const cleaned = cleanCandidateName(l.text);
    if (!cleaned) continue;

    const sc = scoreNameCandidate(cleaned, l.confidence, false, {
      inTargetRegion: true,
      bandTop,
      bandBottom,
      normYMid: l.normYMid,
    });

    if (sc.name && sc.score >= 65) {
      candidatesInBand.push({
        name: sc.name,
        score: sc.score,
        confidence: l.confidence,
        normYMid: l.normYMid,
        line: l,
      });
    }
  }

  if (!candidatesInBand.length) return null;

  // Sort by score descending
  candidatesInBand.sort((a, b) => b.score - a.score);
  const top = candidatesInBand[0];

  // Ambiguity check: if multiple candidates have close scores with different names, do not guess
  if (candidatesInBand.length > 1) {
    const second = candidatesInBand[1];
    if (Math.abs(top.score - second.score) < 10 && cleanCandidateName(top.name) !== cleanCandidateName(second.name)) {
      // Ambiguous candidates in region
      return null;
    }
  }

  return {
    value: formatTitleName(top.name),
    confidence: Math.min(0.96, Math.max(0.70, top.score / 100)),
    method: "geometry_layout_fallback",
  };
}

/**
 * Extracts student name from Marksheet text with candidate scoring, bilingual anchor prioritization,
 * and keyword-free geometry fallback.
 */
export function extractMarksheetName(input, geometryLines = null) {
  let raw = "";
  let lines = [];
  let lineObjects = null;

  if (typeof input === "string") {
    raw = input;
    lines = raw.split(/\r?\n/).map(cleanOCRLine).filter(Boolean);
    if (Array.isArray(geometryLines)) lineObjects = geometryLines;
  } else if (input && typeof input === "object") {
    raw = input.text || "";
    lines = raw.split(/\r?\n/).map(cleanOCRLine).filter(Boolean);
    if (Array.isArray(input.lines)) lineObjects = input.lines;
  }

  const templateInfo = detectMarksheetTemplate(raw, lineObjects);

  // 1. Spatial Geometry Extraction (Handles missing labels, bilingual Tamil, and bounding boxes)
  if (lineObjects && lineObjects.length > 0) {
    const geoResult = extractNameUsingGeometry(lineObjects, templateInfo);
    if (geoResult && geoResult.value) {
      return geoResult;
    }
  }

  // 2. Line-based Anchor Matching (Priority A & B)
  let primaryAnchorIdx = -1;
  let secondaryAnchorIdx = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/(?:NAME\s*OF\s*(?:THE\s*)?(?:CANDIDATE|STUDENT)|CANDIDATE'?S?\s*NAME|STUDENT\s*NAME)\b/i.test(line)) {
      if (primaryAnchorIdx === -1) primaryAnchorIdx = i;
    } else if (/(?:தேர்வரின்\s*பெயர்)\b/i.test(line)) {
      if (secondaryAnchorIdx === -1) secondaryAnchorIdx = i;
    }
  }

  const anchorIdx = primaryAnchorIdx !== -1 ? primaryAnchorIdx : secondaryAnchorIdx;

  if (anchorIdx !== -1) {
    let best = { name: null, score: -1 };

    // Search window: same line after label, and up to 4 lines directly following
    for (let offset = 0; offset <= 4 && anchorIdx + offset < lines.length; offset++) {
      let candidateLine = lines[anchorIdx + offset];
      if (offset === 0) {
        candidateLine = stripNameLabelPrefix(candidateLine);
      } else {
        // If candidate line starts with or is a major document label, do NOT treat it as a candidate name
        if (/^\s*(?:DATE\s+OF\s+BIRTH|DOB|PERMANENT|REGISTER|ROLL|TOTAL|MARKS|GRAND\s+TOTAL|NAME\s+OF\s+THE\s+SCHOOL|CLASS|SESSION)\b/i.test(candidateLine)) {
          const parts = candidateLine.split(/\b(?:DATE\s+OF\s+BIRTH|DOB|PERMANENT|REGISTER|ROLL|TOTAL|MARKS|GRAND\s+TOTAL|NAME\s+OF\s+THE\s+SCHOOL|CLASS|SESSION)\b/i);
          if (parts[0] && parts[0].trim().length >= 3) {
            candidateLine = parts[0].trim();
          } else {
            candidateLine = "";
          }
        }
      }

      if (!candidateLine) continue;

      const sc = scoreNameCandidate(candidateLine, null, true);
      if (sc.score > best.score && sc.name) {
        best = sc;
      }
    }

    // Must meet minimum threshold to reject OCR garbage
    if (best.name && best.score >= 65) {
      return { value: formatTitleName(best.name), confidence: Math.min(0.98, best.score / 100) };
    }
  }

  // 3. Fallback regex search anchored on English label or Tamil label
  const fallbackMatch = raw.match(/(?:NAME\s*OF\s*(?:THE\s*)?CANDIDATE|STUDENT\s*NAME|தேர்வரின்\s*பெயர்)[^\nA-Z]*\n(?:[^\nA-Z]*\n)?([A-Z][A-Za-z\s.]{2,35})/i);
  if (fallbackMatch) {
    const cleaned = cleanCandidateName(fallbackMatch[1]);
    const sc = scoreNameCandidate(cleaned, null, false);
    if (sc.name && sc.score >= 65) {
      return { value: formatTitleName(sc.name), confidence: 0.75 };
    }
  }

  // Candidate name could not be reliably extracted
  return { value: null, confidence: 0 };
}


/**
 * Extracts marks, grand total, and honest percentage.
 * Never fabricates maximum marks or percentage when maxMarks is not in the document.
 */
export function extractMarks(text, docType = "ms10") {
  const cleaned = String(text || "");

  // 1. Explicit Fraction Scored / Max e.g. "465 / 500", "540 / 600", "0499 / 600", "499 / 600"
  const fractionPatterns = [
    /(?:total\s+marks?|grand\s+total|marks\s+obtained|total\s+marks\s+obtained)[^\d\n]{0,32}0?(\d{2,4})\s*[/\-–—]\s*(\d{2,4})/i,
    /(?:total\s+marks?|grand\s+total)[^\d\n]{0,32}0?(\d{2,4})\s*(?:out\s+of|of)\s*(\d{2,4})/i,
    /0?(\d{2,4})\s*[/\-–—]\s*(500|600|800|1000|1200)\b/i,
  ];

  for (const pattern of fractionPatterns) {
    const match = cleaned.match(pattern);
    if (!match) continue;
    const scored = parseInt(match[1], 10);
    const max = parseInt(match[2], 10);
    if (Number.isFinite(scored) && Number.isFinite(max) && max >= 100 && scored >= 0 && scored <= max) {
      const pct = ((scored / max) * 100).toFixed(2);
      return {
        marksScored: String(scored),
        maxMarks: String(max),
        marks: `${scored}/${max}`,
        percentage: `${pct}%`,
        grade: scored / max >= 0.35 ? "Pass" : "Fail",
      };
    }
  }

  // 2. Explicit Total Marks with Scored value only e.g.
  // "TOTAL MARKS : 0499", "TOTAL MARKS:\n0499", "TOTAL MARKS 358", "TOTAL MARKS OBTAINED : 499", "GRAND TOTAL : 499"
  const scoredPatterns = [
    /(?:மொத்த\s+மதிப்பெண்கள்\s*[/]?\s*)?(?:total\s+marks?(?:\s+obtained)?|grand\s+total|marks\s+obtained|total\s+obtained)\s*[:\-–—]?\s*(?:\r?\n\s*)?0?(\d{3,4})\b/i,
    /\b(?:total\s+marks?|grand\s+total)\s*[:\-–—]?\s*(?:\r?\n\s*)?0?(\d{3,4})\b/i,
  ];

  for (const pat of scoredPatterns) {
    const scoredMatch = cleaned.match(pat);
    if (scoredMatch) {
      const scored = parseInt(scoredMatch[1], 10);
      if (Number.isFinite(scored) && scored >= 50 && scored <= 2000) {
        // Check if document mentions an explicit maximum marks somewhere else
        const explicitMaxMatch = cleaned.match(/(?:maximum\s+marks|max\s+marks|out\s+of)\s*[:-]?\s*(\d{3,4})/i);
        let maxMarks = null;
        let percentage = null;

        if (explicitMaxMatch) {
          const parsedMax = parseInt(explicitMaxMatch[1], 10);
          if (parsedMax >= scored && parsedMax <= 2000) {
            maxMarks = String(parsedMax);
            percentage = `${((scored / parsedMax) * 100).toFixed(2)}%`;
          }
        }

        const isPass = /\bpass\b/i.test(cleaned);

        return {
          marksScored: String(scored),
          maxMarks: maxMarks,
          marks: maxMarks ? `${scored}/${maxMarks}` : String(scored),
          percentage: percentage,
          grade: isPass ? "Pass" : null,
        };
      }
    }
  }

  return { marksScored: null, maxMarks: null, marks: null, percentage: null, grade: null };
}

/**
 * Extracts school name anchored on "NAME OF THE SCHOOL" without Tamil OCR garbage.
 */
export function extractSchool(text, geometryLines = null) {
  const cleaned = String(text || "");
  const lines = cleaned.split(/\r?\n/).map(cleanOCRLine).filter(Boolean);

  // 1. Check for structured label anchor "NAME OF THE SCHOOL"
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/(?:NAME\s*OF\s*THE\s*SCHOOL|SCHOOL\s*NAME|பள்ளியின்\s*பெயர்)\b/i.test(line)) {
      let candidate = line
        .replace(/^(?:.*?(?:பள்ளியின்\s*பெயர்\s*[/]?\s*NAME\s*OF\s*THE\s*SCHOOL|NAME\s*OF\s*THE\s*SCHOOL|SCHOOL\s*NAME|பள்ளியின்\s*பெயர்))\s*[:\-–—]?\s*/i, "")
        .replace(/^[/:\-–—\s]+/, "")
        .trim();

      // If empty or purely a label remnant like "/ NAME OF THE SCHOOL", check subsequent line(s)
      if ((!candidate || /^(?:[/]?\s*NAME\s*OF\s*THE\s*SCHOOL|[/]?\s*SCHOOL|பள்ளியின்\s*பெயர்)$/i.test(candidate)) && i + 1 < lines.length) {
        candidate = lines[i + 1].trim();
      }

      if (candidate) {
        // Strip Tamil OCR noise before school name
        const schoolKeywords = /\b(?:SWAMY|SRI|SAMPLE|MATRIC|MATRICULATION|HIGHER\s+SECONDARY|HR\.?\s*SEC|HIGH\s+SCHOOL|VIDYALAYA|ACADEMY|CENTRAL|MODEL|GOVT|KENDRIYA|PUBLIC|ST\.|SAINT)\b/i;
        const kwMatch = candidate.search(schoolKeywords);
        if (kwMatch !== -1) {
          candidate = candidate.slice(kwMatch).trim();
        }

        candidate = candidate
          .replace(/^(?:NAME\s*OF\s*THE\s*SCHOOL|OF\s*THE\s*SCHOOL|THE\s*SCHOOL|SCHOOL)\s*[:\-–—]?\s*/i, "")
          .replace(/[^\x20-\x7E\s]/g, " ")
          .replace(/\s+/g, " ")
          .trim();

        if (candidate.length >= 6) {
          return { school: candidate, schoolConfidence: 0.92 };
        }
      }
    }
  }

  // 2. Fallback regex across entire document
  const schoolAnchor = cleaned.match(/\b([A-Z]{2,}(?:\s+[A-Z]{2,}){0,4}\s+(?:MATRIC\s+HR\s+SEC\s+SCHOOL|HIGHER\s+SECONDARY\s+SCHOOL|MATRICULATION\s+SCHOOL|HR\.?\s*SEC\.?\s*SCHOOL|HIGH\s+SCHOOL|VIDYALAYA|ACADEMY)(?:\s+[A-Z]{2,}){0,4})\b/i);
  if (schoolAnchor) {
    const cleanSch = schoolAnchor[1]
      .replace(/^(?:NAME\s*OF\s*THE\s*SCHOOL|OF\s*THE\s*SCHOOL|THE\s*SCHOOL|SCHOOL)\s*[:\-–—]?\s*/i, "")
      .replace(/[^\x20-\x7E\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return { school: cleanSch, schoolConfidence: 0.85 };
  }

  return { school: null, schoolConfidence: 0 };
}

/**
 * Extracts marksheet details for 10th (SSLC) or 12th (HSC).
 */
export function extractMarksheetData(rawInput, docType = "ms10", geometryLines = null) {
  let text = "";
  let lines = null;

  if (typeof rawInput === "string") {
    text = rawInput;
    if (Array.isArray(geometryLines)) lines = geometryLines;
  } else if (rawInput && typeof rawInput === "object") {
    text = rawInput.text || "";
    if (Array.isArray(rawInput.lines)) lines = rawInput.lines;
  }

  const nameRes = extractMarksheetName(rawInput, lines);

  // State-Agnostic Board Detection
  let board = null;
  let boardConfidence = 0;
  const stateDetected = detectState(text).state;

  if (/cbse|central\s*board\s*of\s*secondary/i.test(text)) {
    board = "CBSE";
    boardConfidence = 0.95;
  } else if (/icse|isc|council\s*for\s*the\s*indian\s*school/i.test(text)) {
    board = "CISCE (ICSE/ISC)";
    boardConfidence = 0.95;
  } else if (/tamil\s*nadu.*matriculation|matriculation\s*board/i.test(text)) {
    board = "Tamil Nadu Matriculation Board";
    boardConfidence = 0.90;
  } else if (/tamil\s*nadu|தமிழ்நாடு/i.test(text)) {
    if (docType === "ms12" || /higher\s*secondary|hsc|hss/i.test(text)) {
      board = "Tamil Nadu Higher Secondary (HSC)";
      boardConfidence = 0.92;
    } else {
      board = "Tamil Nadu State Board (SSLC)";
      boardConfidence = 0.90;
    }
  } else if (/gujarat/i.test(text) || stateDetected === "Gujarat") {
    board = "Gujarat Secondary and Higher Secondary Education Board (GSEB)";
    boardConfidence = 0.90;
  } else if (/kerala/i.test(text) || stateDetected === "Kerala") {
    board = "Kerala Board of Public Examinations";
    boardConfidence = 0.90;
  } else if (/karnataka/i.test(text) || stateDetected === "Karnataka") {
    board = "Karnataka School Examination and Assessment Board";
    boardConfidence = 0.90;
  } else if (/maharashtra/i.test(text) || stateDetected === "Maharashtra") {
    board = "Maharashtra State Board of Secondary and Higher Secondary Education";
    boardConfidence = 0.90;
  } else if (/board\s+of\s+school\s+examinations|board\s+of\s+secondary/i.test(text)) {
    board = stateDetected ? `${stateDetected} State Board of School Examinations` : "State Board of School Examinations";
    boardConfidence = 0.75;
  }

  // School extraction anchored on "NAME OF THE SCHOOL"
  const schoolRes = extractSchool(text, lines);
  const school = schoolRes.school;
  const schoolConfidence = schoolRes.schoolConfidence;

  // Year & Month
  let year = null;
  let month = null;
  let yearConfidence = 0;

  const yearMatch = text.match(/(?:SESSION(?: AND YEAR OF ISSUE)?|EXAMINATION HELD IN|YEAR OF PASSING|SESSION|பருவம்)\s*[:-]?\s*(?:([A-Za-z]+)\s*)?((?:19|20)\d{2})/i) ||
    text.match(/\b(MAR|MAY|JUNE?|JULY?|OCT|NOV|DEC)\s+((?:19|20)\d{2})\b/i) ||
    text.match(new RegExp(`${MONTH_RE.source}\\s*(?:[-,/]?\\s*)?((?:19|20)\\d{2})`, "i")) ||
    text.match(/\b(20[1-3]\d)\b/);

  if (yearMatch) {
    year = yearMatch[2] || yearMatch[1] || yearMatch[0];
    if (yearMatch[1] && MONTH_RE.test(yearMatch[1])) {
      month = normalizeMonth(yearMatch[1]);
    } else {
      const monthOnly = text.match(MONTH_RE);
      if (monthOnly) month = normalizeMonth(monthOnly[1]);
    }
    yearConfidence = 0.90;
  }

  // Register / Roll No
  let registerNumber = null;
  const regMatch = text.match(/(?:PERMANENT\s*REGISTER\s*(?:NUMBER|NO\.?)|PERM(?:ANENT)?\s*REG(?:ISTER)?\s*(?:NO|NUMBER)|REG(?:ISTER)?\s*(?:NO|NUMBER)|ROLL\s*(?:NO|NUMBER)|UNIQUE\s*ID|CERT(?:IFICATE)?\s*(?:NO|NUMBER)|நிரந்தரப்\s*பதிவெண்)\s*[:\-–—]?\s*(?:\r?\n\s*)?([A-Z0-9/-]{5,25})/i) ||
    text.match(/\b([A-Z]{2,4}\d{2}[A-Z0-9]{6,15})\b/);

  if (regMatch) {
    registerNumber = regMatch[1].trim();
  } else {
    // Look for standard 8-12 digit registration/roll number on marksheet
    const regFallback = text.match(/\b([1-9]\d{7,11})\b/);
    if (regFallback && (!year || regFallback[1] !== year)) {
      registerNumber = regFallback[1].trim();
    }
  }

  // Date of Birth
  let dob = null;
  const dobMatch = text.match(/(?:DATE\s*OF\s*BIRTH|DOB|BORN\s*ON|பிறந்த\s*தேதி)\s*[:\-–—]?\s*(?:\r?\n\s*)?(\d{1,2}[-/.]\d{1,2}[-/.]\d{4})/i);
  if (dobMatch) {
    dob = formatDateDisplay(dobMatch[1]);
  } else {
    // If not adjacent to label, match date pattern in document
    const dobFallback = text.match(/\b(\d{1,2}[-/.]\d{1,2}[-/.]\d{4})\b/);
    if (dobFallback) {
      dob = formatDateDisplay(dobFallback[1]);
    }
  }

  const marksData = extractMarks(text, docType);


  return {
    name: nameRes.value,
    dob,
    board,
    school,
    year,
    month,
    registerNumber,
    ...marksData,
    fieldConfidence: {
      name: nameRes.confidence,
      board: boardConfidence,
      school: schoolConfidence,
      year: yearConfidence,
      marks: marksData.marksScored ? 0.90 : 0,
    },
  };
}

/**
 * Extracts Community / Caste Certificate details with multi-state support.
 */
export function extractCommunityCertificateData(rawText) {
  const text = String(rawText || "");

  // Candidate Name
  let name = null;
  let nameConfidence = 0;

  const certClauses = [
    /(?:this\s+is\s+(?:to\s+)?certify\s+that|certified\s+that)\s+(?:(?:selvan|selvi|thiru|tmt|kumari|mr|mrs|ms|shri|smt)\.?\s+)?([A-Z][A-Za-z\s.]{2,35}?)(?=\s+(?:son\s+of|daughter\s+of|s\/o|d\/o|residing|belongs|\n|$))/i,
    /(?:selvan|selvi)\s+([A-Z][A-Za-z\s.]{2,35}?)(?=\s+(?:son\s+of|daughter\s+of|s\/o|d\/o))/i,
    /(?:name\s*of\s*(?:the\s*)?applicant|applicant\s*name)\s*[:-]?\s*([A-Z][A-Za-z\s.]{2,35})/i,
  ];

  for (const pat of certClauses) {
    const m = text.match(pat);
    if (m) {
      const candidate = cleanCandidateName(m[1]);
      if (isCandidateName(candidate)) {
        name = formatTitleName(candidate);
        nameConfidence = 0.92;
        break;
      }
    }
  }

  // Father / Mother name
  let fatherName = null;
  const fatherMatch = text.match(/(?:s\/o|son\s+of|d\/o|daughter\s+of|father['s]?\s*name)\s*[:-]?\s*(?:(?:thiru|mr|shri)\.?\s+)?([A-Z][A-Za-z\s.]{2,35}?)(?=\s+(?:residing|belongs|at|\n|,|$))/i);
  if (fatherMatch) {
    const candidate = cleanCandidateName(fatherMatch[1]);
    if (candidate && candidate.length >= 3 && !NAME_BLACKLIST.test(candidate)) {
      fatherName = formatTitleName(candidate);
    }
  }

  // DOB
  let dob = null;
  const dobMatch = text.match(/(?:date\s+of\s+birth|dob|born\s+on)\s*[:-]?\s*(\d{1,2}[-/.]\d{1,2}[-/.]\d{4})/i);
  if (dobMatch) {
    dob = formatDateDisplay(dobMatch[1]);
  }

  // Community Category
  let community = null;
  let communityCategory = null;
  const catMatch = text.match(/\b(SC|ST|MBC|BC|DNC|OBC|EBC)\b/i) ||
    text.match(/(Scheduled\s+Caste|Scheduled\s+Tribe|Most\s+Backward\s+Class|Backward\s+Class|Other\s+Backward\s+Class|Denotified\s+Community)/i);
  if (catMatch) {
    communityCategory = normalizeCommunity(catMatch[1]);
  }

  // Specific Sub-caste / Community name
  const subCasteMatch = text.match(/belongs\s+(?:to\s+)?([A-Z][A-Za-z\s-]{2,30}?)(?=\s+(?:which|community|caste|as\s+per|,|\.|\n))/i) ||
    text.match(/(?:caste\s*[:-]?\s*|sub-caste\s*[:-]?\s*)(?!certificate\b)([A-Z][A-Za-z\s-]{3,35})/i) ||
    text.match(/\b(?:SC|ST|BC|MBC)\s+([A-Z][A-Za-z]{3,25})\b/i);

  if (subCasteMatch) {
    const sub = cleanOCRLine(subCasteMatch[1]);
    if (sub && !/^(?:certificate|community\s+certificate|the|this|as\s+per|which)$/i.test(sub)) {
      community = sub;
    }
  }
  if (!community && communityCategory) {
    community = communityCategory;
  }

  // Religion
  let religion = null;
  const relMatch = text.match(/\b(Hindu|Muslim|Islam|Christian|Sikh|Buddhist|Jain|Parsi)\b/i);
  if (relMatch) {
    religion = normalizeReligion(relMatch[1]);
  }

  // Certificate Number
  let certNumber = null;
  const certMatch = text.match(/\b(TN-[A-Za-z0-9/-]{6,25}|REV\/\d{4}\/\d{4,8}|CC\/\d{4}\/\d{4,8})\b/i) ||
    text.match(/(?:certificate\s*(?:no|number|#)|cert\s*no|serial\s*no|application\s*no|சான்றிதழ்\s*எண்)\s*[:\-–—]?\s*([A-Z0-9/-]{6,30})/i);
  if (certMatch) {
    certNumber = certMatch[1].trim();
  }

  // Dates
  let issueDate = null;
  const dateMatch = text.match(/(?:date\s+of\s+issue|issued\s+on|issue\s+date|நாள்\s*[/]?\s*date|date)\s*[:-]?\s*(\d{1,2}[-/.]\d{1,2}[-/.]\d{4})/i) ||
    text.match(/\b(\d{1,2}[-/.]\d{1,2}[-/.]\d{4})\b/);
  if (dateMatch) {
    issueDate = formatDateDisplay(dateMatch[1]);
  }

  // Authority & Location
  let taluk = null;
  let district = null;

  const talukMatch = text.match(/(?:வட்டம்\s*[/]?\s*taluk|taluk|taluka)\s*[:\-–—]\s*([A-Z][A-Za-z\s]{2,25})/i) ||
    text.match(/([A-Z][A-Za-z\s]{2,25})\s+(?:taluk|taluka)\b/i);
  if (talukMatch) taluk = cleanLocation(talukMatch[1]);

  const distMatch = text.match(/(?:மாவட்டம்\s*[/]?\s*district|district)\s*[:\-–—]\s*([A-Z][A-Za-z\s]{2,25})/i) ||
    text.match(/([A-Z][A-Za-z\s]{2,25})\s+district\b/i);
  if (distMatch) district = cleanLocation(distMatch[1]);

  // State & Authority (State-Agnostic)
  const stateDetected = detectState(text).state;
  const issuingAuthority = detectIssuingAuthority(text).issuingAuthority;

  return {
    name,
    fatherName,
    dob,
    community,
    communityCategory,
    religion,
    certNumber,
    issueDate,
    taluk,
    district,
    state: stateDetected,
    issuingAuthority,
    fieldConfidence: {
      name: nameConfidence,
      community: communityCategory ? 0.90 : 0,
      certNumber: certNumber ? 0.85 : 0,
      issueDate: issueDate ? 0.85 : 0,
    },
  };
}

/**
 * Extracts Income Certificate details with multi-state recognition.
 */
export function extractIncomeCertificateData(rawText) {
  const text = String(rawText || "");

  // Candidate / Father Name
  let name = null;
  let fatherName = null;
  let nameConfidence = 0;

  // 1. Try "father of CANDIDATE" pattern first if present (e.g. "total annual family income of Thiru FATHER father of CANDIDATE residing at...")
  const fatherOfMatch = text.match(/(?:total\s+annual\s+family\s+income\s+of|income\s+of)\s+(?:(?:thiru|mr|shri|smt)\.?\s+)?([A-Z][A-Za-z .'-]{2,35}?)\s+father\s+of\s+([A-Z][A-Za-z .'-]{2,35}?)(?=\s+(?:residing|at|\n|\r|,|$))/i);
  if (fatherOfMatch) {
    const fCandidate = cleanCandidateName(fatherOfMatch[1]);
    const cCandidate = cleanCandidateName(fatherOfMatch[2]);
    if (isCandidateName(fCandidate)) fatherName = formatTitleName(fCandidate);
    if (isCandidateName(cCandidate)) {
      name = formatTitleName(cCandidate);
      nameConfidence = 0.92;
    }
  }

  if (!name) {
    const certClauseMatch = text.match(/(?:this\s+is\s+(?:to\s+)?certify\s+that|certified\s+that)\s+(?:(?:thiru|tmt|selvan|selvi|mr|mrs|ms|shri|smt)\.?\s+)?([A-Z][A-Za-z .'-]{2,35}?)(?=\s+(?:son\s+of|daughter\s+of|s\/o|d\/o|residing|annual|total|\n|\r|$))/i);
    if (certClauseMatch) {
      const candidate = cleanCandidateName(certClauseMatch[1]);
      if (isCandidateName(candidate) && !/^(?:family|member|pn\s*mity|name)$/i.test(candidate)) {
        name = formatTitleName(candidate);
        nameConfidence = 0.92;
      }
    }
  }

  if (!fatherName) {
    const fatherMatch = text.match(/(?:s\/o|son\s+of|d\/o|daughter\s+of|father['s]?\s*name)\s*[:-]?\s*(?:(?:thiru|mr|shri)\.?\s+)?([A-Z][A-Za-z .'-]{2,35}?)(?=\s+(?:residing|annual|total|at|\n|\r|,|$))/i);
    if (fatherMatch) {
      const candidate = cleanCandidateName(fatherMatch[1]);
      if (candidate && candidate.length >= 3 && !NAME_BLACKLIST.test(candidate) && !/^(?:family|member|table)$/i.test(candidate)) {
        fatherName = formatTitleName(candidate);
      }
    }
  }

  // DOB
  let dob = null;
  const dobMatch = text.match(/(?:date\s+of\s+birth|dob|born\s+on)\s*[:-]?\s*(\d{1,2}[-/.]\d{1,2}[-/.]\d{4})/i);
  if (dobMatch) {
    dob = formatDateDisplay(dobMatch[1]);
  }

  // Annual Income
  let income = null;
  let incomeNumber = null;
  let incomeConfidence = 0;

  const incPatterns = [
    /(?:verification\s+is\s+rs\.?|family\s+annual\s+income[^\d]{0,25}rs\.?|total\s+annual\s+income[^\d]{0,25})\s*[:\-–—]?\s*(?:Rs\.?|₹|ரூ\.?)?\s*([\d,]+)/i,
    /(?:annual\s+income|family\s+income|total\s+annual\s+income|yearly\s+income|மொத்த\s+குடும்ப\s+வருமானம்)\s*[:-]?\s*(?:Rs\.?|₹|ரூ\.?)?\s*([\d,]+)/i,
    /(?:Rs\.?|₹|ரூ\.?)\s*([\d,]+)\s*(?:per\s+annum|\/annum|\/year|only)/i,
    /([\d,]+)\s*(?:rupees\s+only|\/-\s*only|\/-)/i,
    /\b(\d{4,7})\s*(?:per\s+annum|\/annum|\/year)\b/i,
  ];

  for (const pat of incPatterns) {
    const m = text.match(pat);
    if (m) {
      const parsed = normalizeIncome(m[1]);
      if (parsed && parsed >= 5000) {
        incomeNumber = parsed;
        income = formatIncomeDisplay(parsed);
        incomeConfidence = 0.94;
        break;
      }
    }
  }

  // Certificate Number
  let certNumber = null;
  const certNumMatch = text.match(/\b(TN-[A-Za-z0-9/-]{6,25}|INC\/\d{4}\/\d{4,8}|REV\/\d{4}\/\d{4,8})\b/i) ||
    text.match(/(?:certificate\s*(?:no|number|#)|cert\s*no|application\s*no|சான்றிதழ்\s*எண்)\s*[:\-–—.\s]*([A-Z0-9/.-]{2,30})/i);
  if (certNumMatch) {
    certNumber = certNumMatch[1].trim();
  }

  // Dates (Issue & Validity)
  let issueDate = null;
  let validUpto = null;

  const issueMatch = text.match(/(?:நாள்\s*[/]?\s*date|date\s+of\s+issue|issued\s+on|issue\s+date|date)\s*[:\-–—]?\s*(\d{1,2}[-/.]\d{1,2}[-/.]\d{4})/i) ||
    text.match(/\bDate\s*:\s*(\d{1,2}[-/.]\d{1,2}[-/.]\d{4})\b/i) ||
    text.match(/\b(\d{1,2}[-/.]\d{1,2}[-/.]\d{4})\b/);
  if (issueMatch) {
    issueDate = formatDateDisplay(issueMatch[1]);
  }

  // Validity Period
  const validityPeriodMatch = text.match(/(?:validity\s+period|செல்லுபடியாகும்\s+காலம்)\s*[:-]?\s*(?:\d{1,2}[-/.]\d{1,2}[-/.]\d{4})\s*(?:to|முதல்|-)\s*(\d{1,2}[-/.]\d{1,2}[-/.]\d{4})/i) ||
    text.match(/(?:valid(?:ity)?\s*(?:upto|up\s+to|till|until)|expiry\s+date)\s*[:-]?\s*(\d{1,2}[-/.]\d{1,2}[-/.]\d{4})/i);
  
  const statedDurationMatch = text.match(/valid\s*(?:for|period\s*(?:of|is))?\s*(one|two|three|four|five|\d+)\s*(?:financial\s*)?years?/i);

  if (validityPeriodMatch) {
    validUpto = formatDateDisplay(validityPeriodMatch[1]);
  } else if (statedDurationMatch && issueDate) {
    const wordToNum = { one: 1, two: 2, three: 3, four: 4, five: 5 };
    const rawVal = statedDurationMatch[1].toLowerCase();
    const yearsToAdd = wordToNum[rawVal] || parseInt(rawVal, 10) || 1;
    const parsedDate = parseIndianDate(issueDate);
    if (parsedDate) {
      const d = String(parsedDate.getDate()).padStart(2, "0");
      const m = String(parsedDate.getMonth() + 1).padStart(2, "0");
      const y = parsedDate.getFullYear() + yearsToAdd;
      validUpto = `${d}-${m}-${y}`;
    }
  }

  // Authority & Location
  let taluk = null;
  let district = null;

  const talukMatch = text.match(/(?:வட்டம்\s*[/]?\s*taluk|taluka|taluk)\s*[:\-–—\s]\s*([A-Z][A-Za-z]{2,25})(?=\s+district|\s+வட்டம்|\n|\r|$)/i) ||
    text.match(/(?:வட்டம்\s*[/]?\s*taluk|taluka|taluk)\s*[:\-–—]\s*([A-Z][A-Za-z ]{2,25})/i) ||
    text.match(/([A-Z][A-Za-z ]{2,25})\s+taluk\b/i);
  if (talukMatch) taluk = cleanLocation(talukMatch[1]);

  const distMatch = text.match(/(?:மாவட்டம்\s*[/]?\s*district|district)\s*[:\-–—]\s*([A-Z][A-Za-z ]{2,25})/i) ||
    text.match(/(?:மாவட்டம்\s*[/]?\s*district|district)\s+([A-Z][A-Za-z ]{2,25})(?=\s+and|\s+state|\n|\r|$)/i) ||
    text.match(/([A-Z][A-Za-z ]{2,25})\s+district\b/i);
  if (distMatch) district = cleanLocation(distMatch[1]);

  // State & Authority (State-Agnostic)
  const stateDetected = detectState(text).state;
  const issuingAuthority = detectIssuingAuthority(text).issuingAuthority;

  // Freshness calculation
  const freshness = evaluateIncomeFreshness(issueDate, validUpto);

  return {
    name,
    fatherName,
    dob,
    income,
    incomeNumber,
    certNumber,
    issueDate,
    validUpto,
    taluk,
    district,
    state: stateDetected,
    issuingAuthority,
    freshness,
    fieldConfidence: {
      name: nameConfidence,
      income: incomeConfidence,
      certNumber: certNumber ? 0.85 : 0,
      issueDate: issueDate ? 0.85 : 0,
    },
  };
}

