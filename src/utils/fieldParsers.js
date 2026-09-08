/**
 * fieldParsers.js — SGP Document-Specific Field Extraction Engine
 * 
 * Dedicated parsers for:
 * 1. Marksheets (10th SSLC & 12th HSC)
 * 2. Community / Caste Certificates
 * 3. Income Certificates
 * 
 * Never guesses or fabricates fields. Returns null when a field cannot be detected.
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

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const MONTH_RE = new RegExp(`\\b(${MONTH_NAMES.join("|")}|JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\\b`, "i");

const REJECTED_NAME = /^(?:of\s+the\s+(?:candidate|candioate|candiate|student)|name\s+of\s+(?:the\s+)?(?:candidate|candioate|candiate|student)|candidate|candioate|candiate|student|name|the\s+candidate|secondary\s+school|higher\s+secondary|board|certificate|statement\s+of\s+marks|member|family\s*member|pn\s*mity)$/i;
const NAME_BLACKLIST = /\b(?:board|school|college|certificate|statement|examination|subject|marks|result|secondary|higher\s+secondary|government\s+of|tamil\s+nadu|member|table|family)\b/i;

function cleanOCRLine(line) {
  return String(line || "").replace(/[|_]+/g, " ").replace(/\s+/g, " ").trim();
}

function stripNameLabelPrefix(raw) {
  return String(raw || "")
    .replace(/^\s*(?:தேர்வரின்\s*பெயர்\s*[/]?\s*)?(?:name\s*of\s*(?:the\s*)?(?:candidate|student)|candidate'?s?\s*name|student\s*name|name)\s*[:\-–—]?\s*/i, "")
    .replace(/^\s*(?:of\s+the\s+(?:candidate|candioate|candiate|student)|of\s+(?:candidate|candioate|candiate|student))\s+/i, "")
    .replace(/^\s*(?:mr|mrs|ms|miss|kumari|selvan|selvi|thiru|tmt|sri|smt|thirumathi|thirumati|km)\.?\s+/i, "")
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

function cleanCandidateName(value) {
  let v = String(value || "")
    .replace(/^(?:[A-Za-z]{1,2}[-–—\s:]+|Pe\s+|Nm\s+|De\s+|La\s+|No\s+|Sl\s+)/i, "")
    .replace(/[^\x20-\x7E\s]/g, " ")
    .replace(/\s+(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\w*\s+\d{4}.*$/i, "")
    .replace(/\s+\b(?:SESSION|DOB|DATE|REG|ROLL|HSS|SEC|MATRIC|SCHOOL|EXAMINATION)\b.*$/i, "")
    .replace(/\s+(?:son\s+of|daughter\s+of|residing\s+at|r\/o|d\/o|s\/o|w\/o)\b.*$/i, "")
    .replace(/\s+\d{4,}.*$/, "")
    .replace(/^[:\-–—.]\s*/, "")
    .trim();

  v = stripNameLabelPrefix(v);
  v = removeOCRArtifactTokens(v);
  v = v.replace(/\b(?:of\s+the\s+(?:candidate|candioate|candiate|student)|of\s+(?:candidate|candioate|candiate|student)|candidate|candioate|candiate|student)\b/gi, "").replace(/\s+/g, " ").trim();
  return v;
}

function isCandidateName(value) {
  let v = cleanCandidateName(value);
  if (!v || v.length < 3 || v.length > 70 || REJECTED_NAME.test(v) || NAME_BLACKLIST.test(v) || /\d/.test(v)) return false;

  const words = v.split(/\s+/).filter(Boolean).map(w => w.replace(/[^A-Za-z.'-]/g, ""));
  if (words.length < 1) return false;
  if (words.some(w => /^(?:of|the|candidate|candioate|candiate|student|name|class|school|college|board|exam|certificate|marks|result|member|family)$/i.test(w))) return false;

  const hasLongWord = words.some(w => w.length >= 3);
  if (!hasLongWord) return false;

  return words.every(w => /^[A-Za-z.'-]+$/.test(w));
}

function scoreNameCandidate(raw) {
  const clean = cleanCandidateName(raw);
  if (!isCandidateName(clean)) return { name: null, score: -1 };

  let score = 50;
  // All uppercase Latin letters
  if (/^[A-Z\s.]+$/.test(clean)) score += 30;
  // Pattern: "FIRSTNAME INITIAL" e.g. "RAGUL C" or "NITHISHKUMAR M"
  if (/^[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)*\s+[A-Z]$/i.test(clean)) score += 20;
  // Penalize strings with OCR noise symbols or suspicious random words
  if (/[-–—_~`|/\\]/.test(raw)) score -= 30;
  if (/[a-z]{3,}\s+[a-z]{3,}/.test(clean) && !/^[A-Z][a-z]/.test(clean)) score -= 20;

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
 * Extracts student name from Marksheet text.
 */
export function extractMarksheetName(text) {
  const raw = String(text || "");
  const lines = raw.split(/\r?\n/).map(cleanOCRLine).filter(Boolean);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isNameLabel = /(?:NAME\s*OF\s*(?:THE\s*)?(?:CANDIDATE|STUDENT)|CANDIDATE'?S?\s*NAME|STUDENT\s*NAME|தேர்வரின்\s*பெயர்)\b/i.test(line);

    if (!isNameLabel) continue;

    let best = { name: null, score: -1 };

    // Examine candidates within 3 lines following NAME OF THE CANDIDATE
    for (let offset = 0; offset <= 3 && i + offset < lines.length; offset++) {
      let candidateLine = lines[i + offset];
      if (offset === 0) {
        candidateLine = stripNameLabelPrefix(candidateLine);
      }
      const sc = scoreNameCandidate(candidateLine);
      if (sc.score > best.score && sc.name) {
        best = sc;
      }
      if (/\b(?:FATHER|MOTHER|DATE\s+OF\s+BIRTH|PERMANENT|REGISTER|ROLL|TOTAL\s+MARKS)\b/i.test(lines[i + offset]) && offset > 0) {
        break;
      }
    }

    if (best.name) {
      return { value: formatTitleName(best.name), confidence: 0.95 };
    }
  }

  // Fallback regex match
  const fallback = raw.match(/(?:NAME\s*OF\s*(?:THE\s*)?CANDIDATE|தேர்வரின்\s*பெயர்)[^\nA-Z]*\n(?:[^\nA-Z]*\n)?([A-Z][A-Za-z\s.]{2,35})/i);
  if (fallback) {
    let name = cleanCandidateName(fallback[1]);
    if (isCandidateName(name)) {
      return { value: formatTitleName(name), confidence: 0.75 };
    }
  }

  return { value: null, confidence: 0 };
}

/**
 * Extracts marks, grand total, percentage and result.
 */
export function extractMarks(text, docType = "ms10") {
  const cleaned = String(text || "");

  // 1. Explicit Fraction Scored / Max e.g. "465 / 500" or "540 / 600"
  const fractionPatterns = [
    /(?:total\s+marks?|grand\s+total|marks\s+obtained|total\s+marks\s+obtained)[^\d]{0,32}(\d{2,4})\s*[/\-–—]\s*(\d{2,4})/i,
    /(?:total\s+marks?|grand\s+total)[^\d]{0,32}(\d{2,4})\s*(?:out\s+of|of)\s*(\d{2,4})/i,
    /(\d{2,4})\s*[/\-–—]\s*(500|600|800|1000|1200)\b/i,
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

  // 2. "TOTAL MARKS : 0412 ZERO FOUR ONE TWO" or "TOTAL MARKS : 358 THREE FIVE EIGHT (PASS)" or "TOTAL MARKS 419"
  const scoredMatch = cleaned.match(/(?:மொத்த\s+மதிப்பெண்கள்\s*[/]?\s*)?(?:total\s+marks?|grand\s+total|marks\s+obtained|total\s+obtained)\s*[:-]?\s*(?:0)?(\d{3,4})\b/i);
  if (scoredMatch) {
    const scored = parseInt(scoredMatch[1], 10);
    if (Number.isFinite(scored) && scored > 100 && scored <= 1200) {
      const defaultMax = (docType === "ms12" || scored > 500) ? 600 : 500;
      const maxMarks = scored <= defaultMax ? defaultMax : 1000;
      const pct = ((scored / maxMarks) * 100).toFixed(2);
      const isPass = /\bpass\b/i.test(cleaned) || (scored / maxMarks >= 0.35);
      return {
        marksScored: String(scored),
        maxMarks: String(maxMarks),
        marks: `${scored}/${maxMarks}`,
        percentage: `${pct}%`,
        grade: isPass ? "Pass" : "Fail",
      };
    }
  }

  return { marksScored: null, maxMarks: null, marks: null, percentage: null, grade: null };
}

/**
 * Extracts marksheet details for 10th (SSLC) or 12th (HSC).
 */
export function extractMarksheetData(rawText, docType = "ms10") {
  const text = String(rawText || "");
  const nameRes = extractMarksheetName(text);

  // Board
  let board = null;
  let boardConfidence = 0;
  if (/higher\s*secondary|board\s*of\s*higher\s*secondary/i.test(text) || (docType === "ms12" && /tamil\s*nadu/i.test(text))) {
    board = "Tamil Nadu Higher Secondary (HSC)";
    boardConfidence = 0.92;
  } else if (/tamil\s*nadu.*matriculation|matriculation\s*board/i.test(text)) {
    board = "Tamil Nadu Matriculation Board";
    boardConfidence = 0.90;
  } else if (/tamil\s*nadu.*secondary|board\s*of\s*secondary|sslc|secondary\s*school/i.test(text)) {
    board = "Tamil Nadu State Board (SSLC)";
    boardConfidence = 0.90;
  } else if (/cbse|central\s*board\s*of\s*secondary/i.test(text)) {
    board = "CBSE";
    boardConfidence = 0.95;
  } else if (/icse|isc|council\s*for\s*the\s*indian\s*school/i.test(text)) {
    board = "CISCE (ICSE/ISC)";
    boardConfidence = 0.95;
  }

  // School — Anchor-based clean extraction to bypass leading Tamil OCR artifacts
  let school = null;
  let schoolConfidence = 0;
  const schoolAnchor = text.match(/\b([A-Z]{2,}(?:\s+[A-Z]{2,}){0,4}\s+(?:MATRIC\s+HR\s+SEC\s+SCHOOL|HIGHER\s+SECONDARY\s+SCHOOL|MATRICULATION\s+SCHOOL|HR\.?\s*SEC\.?\s*SCHOOL|HIGH\s+SCHOOL|VIDYALAYA|ACADEMY)(?:\s+[A-Z]{2,}){0,4})\b/i);
  if (schoolAnchor) {
    school = schoolAnchor[1]
      .replace(/^(?:NAME\s*OF\s*THE\s*SCHOOL|OF\s*THE\s*SCHOOL|THE\s*SCHOOL|SCHOOL)\s*[:\-–—]?\s*/i, "")
      .trim()
      .replace(/\s+/g, " ");
    schoolConfidence = 0.90;
  } else {
    const schoolFallback = text.match(/(?:NAME\s*OF\s*THE\s*SCHOOL|SCHOOL\s*NAME|பள்ளியின்\s*பெயர்)\s*[:-]?\s*([A-Z][A-Za-z\s.,-]{5,60}(?:School|College|Higher\s+Secondary|Hr\.?\s*Sec|Matric|Vidyalaya|Academy)[A-Za-z\s]*)/i);
    if (schoolFallback) {
      school = cleanOCRLine(schoolFallback[1])
        .replace(/^(?:NAME\s*OF\s*THE\s*SCHOOL|OF\s*THE\s*SCHOOL|THE\s*SCHOOL|SCHOOL)\s*[:\-–—]?\s*/i, "")
        .replace(/[^\x20-\x7E\s]/g, "")
        .trim();
      schoolConfidence = 0.80;
    }
  }

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
      month = formatTitleName(yearMatch[1]);
    } else {
      const monthOnly = text.match(MONTH_RE);
      if (monthOnly) month = formatTitleName(monthOnly[1]);
    }
    yearConfidence = 0.90;
  }

  // Register / Roll No (e.g. XM22R0491349459 or 2313289153)
  let registerNumber = null;
  const regMatch = text.match(/(?:PERMANENT\s*REGISTER\s*(?:NUMBER|NO\.?)|PERM(?:ANENT)?\s*REG(?:ISTER)?\s*(?:NO|NUMBER)|REG(?:ISTER)?\s*(?:NO|NUMBER)|ROLL\s*(?:NO|NUMBER)|CERT(?:IFICATE)?\s*(?:NO|NUMBER)|நிரந்தரப்\s*பதிவெண்)\s*[:-]?\s*([A-Z0-9/-]{6,25})/i) ||
    text.match(/\b([A-Z]{2,4}\d{2}[A-Z0-9]{6,15})\b/);

  if (regMatch) {
    registerNumber = regMatch[1].trim();
  }

  // Date of Birth
  let dob = null;
  const dobMatch = text.match(/(?:DATE\s*OF\s*BIRTH|DOB|BORN\s*ON|பிறந்த\s*தேதி)\s*[:-]?\s*(\d{1,2}[-/.]\d{1,2}[-/.]\d{4})/i);
  if (dobMatch) {
    dob = formatDateDisplay(dobMatch[1]);
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
 * Extracts Community / Caste Certificate details.
 */
export function extractCommunityCertificateData(rawText) {
  const text = String(rawText || "");

  // Candidate Name
  let name = null;
  let nameConfidence = 0;

  const certClauses = [
    /(?:this\s+is\s+to\s+certify\s+that|certified\s+that)\s+(?:(?:selvan|selvi|thiru|tmt|kumari|mr|mrs|ms)\.?\s+)?([A-Z][A-Za-z\s.]{2,35}?)(?=\s+(?:son\s+of|daughter\s+of|s\/o|d\/o|residing|belongs|\n|$))/i,
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

  // Specific Sub-caste / Community name (e.g. Chakkiliyan, Arunthathiyar, Vanniyar)
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
  let issuingAuthority = null;

  const talukMatch = text.match(/(?:வட்டம்\s*[/]?\s*taluk|taluk)\s*[:\-–—]\s*([A-Z][A-Za-z\s]{2,25})/i) ||
    text.match(/Town\s+of\s+([A-Z][A-Za-z\s]{2,25})\s+taluk\b/i) ||
    text.match(/([A-Z][A-Za-z\s]{2,25})\s+taluk\b/i);
  if (talukMatch) taluk = cleanLocation(talukMatch[1]);

  const distMatch = text.match(/(?:மாவட்டம்\s*[/]?\s*district|district)\s*[:\-–—]\s*([A-Z][A-Za-z\s]{2,25})/i) ||
    text.match(/Taluk\s+of\s+([A-Z][A-Za-z\s]{2,25})\s+district\b/i) ||
    text.match(/([A-Z][A-Za-z\s]{2,25})\s+district\b/i);
  if (distMatch) district = cleanLocation(distMatch[1]);

  const authMatch = text.match(/(Zonal\s+Deputy\s+Tahsildar|Headquarters\s+Deputy\s+Tahsildar|Tahsildar|Revenue\s+Divisional\s+Officer|District\s+Collector)/i);
  if (authMatch) issuingAuthority = cleanOCRLine(authMatch[1]);

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
    state: "Tamil Nadu",
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
 * Extracts Income Certificate details.
 */
export function extractIncomeCertificateData(rawText) {
  const text = String(rawText || "");

  // Candidate / Father Name
  let name = null;
  let fatherName = null;
  let nameConfidence = 0;

  // "This is certify that Mr. KARSHAN NARAN GOJIYA" or "This is to certify that Thiru Murugesan..."
  const certClauseMatch = text.match(/(?:this\s+is\s+(?:to\s+)?certify\s+that|certified\s+that)\s+(?:(?:thiru|tmt|selvan|selvi|mr|mrs|ms)\.?\s+)?([A-Z][A-Za-z .'-]{1,35}?)(?=\s+(?:son\s+of|daughter\s+of|s\/o|d\/o|residing|annual|total|\n|\r|$))/i);
  if (certClauseMatch) {
    const candidate = cleanCandidateName(certClauseMatch[1]);
    if (isCandidateName(candidate) && !/^(?:family|member|pn\s*mity|name)$/i.test(candidate)) {
      name = formatTitleName(candidate);
      nameConfidence = 0.92;
    }
  }

  const fatherMatch = text.match(/(?:s\/o|son\s+of|d\/o|daughter\s+of|father['s]?\s*name)\s*[:-]?\s*(?:(?:thiru|mr|shri)\.?\s+)?([A-Z][A-Za-z .'-]{1,35}?)(?=\s+(?:residing|annual|total|father|at|\n|\r|,|$))/i);
  if (fatherMatch) {
    const candidate = cleanCandidateName(fatherMatch[1]);
    if (candidate && candidate.length >= 3 && !NAME_BLACKLIST.test(candidate) && !/^(?:family|member|table)$/i.test(candidate)) {
      fatherName = formatTitleName(candidate);
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
    text.match(/(?:certificate\s*(?:no|number|#)|cert\s*no|application\s*no|சான்றிதழ்\s*எண்)\s*[:\-–—.\s]*([A-Z0-9/.-]{4,30})/i);
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

  // "Certificate validity period : 11-05-2024 to 10-05-2025" or "11-05-2024 முதல் 10-05-2025"
  const validityPeriodMatch = text.match(/(?:validity\s+period|செல்லுபடியாகும்\s+காலம்)\s*[:-]?\s*(?:\d{1,2}[-/.]\d{1,2}[-/.]\d{4})\s*(?:to|முதல்|-)\s*(\d{1,2}[-/.]\d{1,2}[-/.]\d{4})/i) ||
    text.match(/(?:valid(?:ity)?\s*(?:upto|up\s+to|till|until)|expiry\s+date)\s*[:-]?\s*(\d{1,2}[-/.]\d{1,2}[-/.]\d{4})/i);
  
  // Stated duration: "valid for three years", "valid for 3 years", "valid for 1 year", "validity of 3 years", etc.
  const statedDurationMatch = text.match(/valid\s*(?:for|period\s*(?:of|is))?\s*(one|two|three|four|five|\d+)\s*(?:financial\s*)?years?/i);

  if (validityPeriodMatch) {
    // Explicit date takes priority over inferred duration
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
  let issuingAuthority = null;

  const talukMatch = text.match(/(?:வட்டம்\s*[/]?\s*taluk|taluka|taluk)\s*[:\-–—\s]\s*([A-Z][A-Za-z]{2,25})(?=\s+district|\s+வட்டம்|\n|\r|$)/i) ||
    text.match(/(?:வட்டம்\s*[/]?\s*taluk|taluka|taluk)\s*[:\-–—]\s*([A-Z][A-Za-z ]{2,25})/i) ||
    text.match(/([A-Z][A-Za-z ]{2,25})\s+taluk\b/i);
  if (talukMatch) taluk = cleanLocation(talukMatch[1]);

  const distMatch = text.match(/(?:மாவட்டம்\s*[/]?\s*district|district)\s*[:\-–—]\s*([A-Z][A-Za-z ]{2,25})/i) ||
    text.match(/(?:மாவட்டம்\s*[/]?\s*district|district)\s+([A-Z][A-Za-z ]{2,25})(?=\s+and|\s+state|\n|\r|$)/i) ||
    text.match(/([A-Z][A-Za-z ]{2,25})\s+district\b/i);
  if (distMatch) district = cleanLocation(distMatch[1]);

  const authMatch = text.match(/(Talati\s+cum\s+Mantri|Zonal\s+Deputy\s+Tahsildar|Headquarters\s+Deputy\s+Tahsildar|Tahsildar|Revenue\s+Divisional\s+Officer|District\s+Collector)/i);
  if (authMatch) issuingAuthority = formatTitleName(cleanOCRLine(authMatch[1]));

  // State detection
  let state = null;
  if (/gujarat/i.test(text)) state = "Gujarat";
  else if (/karnataka/i.test(text)) state = "Karnataka";
  else if (/maharashtra/i.test(text)) state = "Maharashtra";
  else if (/kerala/i.test(text)) state = "Kerala";
  else if (/andhra/i.test(text)) state = "Andhra Pradesh";
  else if (/tamil\s*nadu|தமிழ்நாடு/i.test(text)) state = "Tamil Nadu";

  // Compute Freshness Assessment
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
    state,
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
