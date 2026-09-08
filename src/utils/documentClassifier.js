/**
 * documentClassifier.js — SGP Multi-Signal Document Type Classifier
 * 
 * Classifies extracted text into:
 * - ms10: 10th Marksheet / SSLC
 * - ms12: 12th Marksheet / HSC / Plus Two
 * - community: Community / Caste Certificate
 * - income: Income Certificate
 * - aadhaar: Aadhaar Card
 * - bankpass: Bank Passbook
 * - unknown: Unknown / Insufficient Signals
 * 
 * Uses multi-signal weighted scoring with confidence calculation and signal breakdown.
 */

export const SUPPORTED_DOC_TYPES = {
  ms10:      { id: "ms10",      label: "10th Marksheet",           icon: "📘", color: "#3b82f6" },
  ms12:      { id: "ms12",      label: "12th Marksheet",           icon: "📗", color: "#8b5cf6" },
  community: { id: "community", label: "Community Certificate",    icon: "📜", color: "#f59e0b" },
  income:    { id: "income",    label: "Income Certificate",       icon: "💰", color: "#10b981" },
  aadhaar:   { id: "aadhaar",   label: "Aadhaar Card",             icon: "🪪", color: "#6366f1" },
  bankpass:  { id: "bankpass",  label: "Bank Passbook",            icon: "🏦", color: "#ec4899" },
  unknown:   { id: "unknown",   label: "Unknown Document",         icon: "📄", color: "#94a3b8" },
};

const CLASSIFICATION_RULES = {
  ms10: [
    { pattern: /\bsslc\b/i, weight: 6, label: "SSLC abbreviation" },
    { pattern: /secondary\s+school\s+leaving\s+certificate|secondary\s+school/i, weight: 8, label: "Secondary School Leaving Certificate title" },
    { pattern: /\b(10th|tenth|class\s*x|std\s*x|standard\s*x|பத்தாம்\s*வகுப்பு)\b/i, weight: 6, label: "10th/Class X standard indicator" },
    { pattern: /board\s+of\s+school\s+examinations|department\s+of\s+government\s+examinations|board\s+of\s+secondary/i, weight: 4, label: "Board of Examinations" },
    { pattern: /\b(science|social\s+science|mathematics|optional\s+language)\b/i, weight: 3, label: "10th core subject names" },
    { pattern: /permanent\s+register\s+no|certificate\s+sl\.?\s*no\.?\s*:\s*sec/i, weight: 5, label: "SSLC registration fields" },
    { pattern: /total\s+marks|மொத்த\s+மதிப்பெண்கள்/i, weight: 3, label: "Total marks summary" },
  ],

  ms12: [
    { pattern: /\b(hsc|hss|hr\.?\s*sec)\b/i, weight: 6, label: "HSC / HSS / Hr Sec marker" },
    { pattern: /higher\s+secondary(?:\s+course|\s+school|\s+examination|\s+certificate)?/i, weight: 8, label: "Higher Secondary Certificate title" },
    { pattern: /\b(12th|twelfth|class\s*xii|std\s*xii|standard\s*xii|plus\s*two|\+2|second\s*year|இரண்டாமாண்டு)\b/i, weight: 6, label: "12th / Plus Two / Second Year standard" },
    { pattern: /board\s+of\s+school\s+examinations|department\s+of\s+government\s+examinations/i, weight: 4, label: "Board of School Examinations" },
    { pattern: /\b(physics|chemistry|biology|computer\s+science|commerce|accountancy|economics|mathematics)\b/i, weight: 4, label: "12th elective subject names" },
    { pattern: /permanent\s+register\s+number|certificate\s+sl\.?\s*no\.?\s*:\s*hss|mark\s+certificate|statement\s+of\s+marks/i, weight: 5, label: "Marksheet registration fields" },
    { pattern: /total\s+marks|மொத்த\s+மதிப்பெண்கள்/i, weight: 3, label: "Total marks summary" },
  ],

  community: [
    { pattern: /community\s+certificate|caste\s+certificate|சாதிச்\s+சான்றிதழ்/i, weight: 9, label: "Community/Caste Certificate explicit title" },
    { pattern: /scheduled\s+caste|scheduled\s+tribe|backward\s+class|most\s+backward\s+class|denotified\s+community/i, weight: 7, label: "Recognized caste category mention" },
    { pattern: /\b(sc|st|mbc|dnc|obc|bc)\b/i, weight: 4, label: "Community abbreviation" },
    { pattern: /belongs\s+to.*community|certified\s+that.*belongs/is, weight: 6, label: "Community certification clause" },
    { pattern: /tahsildar|revenue\s+divisional\s+officer|\brdo\b|zonal\s+deputy\s+tahsildar/i, weight: 3, label: "Revenue issuing authority" },
    { pattern: /\btaluk\b|\bdistrict\b|வட்டம்|மாவட்டம்/i, weight: 2, label: "Taluk/District administration fields" },
    { pattern: /certificate\s*(?:no|number)|cert\s*no|சான்றிதழ்\s*எண்/i, weight: 3, label: "Certificate registration number" },
  ],

  income: [
    { pattern: /income\s+certificate|வருமானச்\s+சான்றிதழ்/i, weight: 9, label: "Income Certificate explicit title" },
    { pattern: /annual\s+income|family\s+income|total\s+annual\s+income|yearly\s+income|குடும்ப\s+ஆண்டு\s+வருமானம்/i, weight: 7, label: "Annual/Family income statement" },
    { pattern: /(?:rupees|rs\.?|₹|ரூ\.?)\s*[\d,]+(?:\s*(?:per\s+annum|\/annum|\/year|only))?/i, weight: 5, label: "Income amount notation" },
    { pattern: /source\s+of\s+income|wages|salary|business|agriculture|rental/i, weight: 5, label: "Income source breakdown table" },
    { pattern: /this\s+is\s+to\s+certify\s+that.*(?:income|family)/is, weight: 5, label: "Income certification clause" },
    { pattern: /certificate\s+validity\s+period|validity\s+period|செல்லுபடியாகும்\s+காலம்/i, weight: 5, label: "Income validity period clause" },
    { pattern: /tahsildar|revenue\s+divisional\s+officer|\brdo\b|zonal\s+deputy\s+tahsildar/i, weight: 3, label: "Revenue issuing authority" },
  ],

  aadhaar: [
    { pattern: /unique\s+identification\s+authority\s+of\s+india|\buidai\b/i, weight: 10, label: "UIDAI header" },
    { pattern: /government\s+of\s+india.*aadhaar|aadhaar/i, weight: 8, label: "Aadhaar government header" },
    { pattern: /\b\d{4}\s\d{4}\s\d{4}\b/, weight: 8, label: "12-digit 4-4-4 formatted UID" },
    { pattern: /mera\s+aadhaar,\s+meri\s+pehchan/i, weight: 6, label: "Aadhaar slogan" },
  ],

  bankpass: [
    { pattern: /passbook|account\s+statement/i, weight: 8, label: "Passbook title" },
    { pattern: /account\s+(?:number|no)|savings\s+bank|current\s+account/i, weight: 6, label: "Account number details" },
    { pattern: /\bifsc\b|\bmicr\b/i, weight: 7, label: "IFSC / Banking code" },
    { pattern: /state\s+bank\s+of\s+india|canara\s+bank|indian\s+bank|hdfc|icici|axis\s+bank|bank\s+of\s+baroda|punjab\s+national\s+bank/i, weight: 6, label: "Major Indian bank name" },
  ],
};

/**
 * Detects document type from extracted text using weighted multi-signal scoring.
 * 
 * @param {string} text Raw OCR text
 * @param {Object} metadata Optional file metadata (name, mime)
 * @returns {Object} { type, confidence, reasons, warnings, allScores, isConfident }
 */
export function detectDocumentType(text, metadata = {}) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (!clean || clean.length < 15) {
    return {
      type: "unknown",
      confidence: 0,
      reasons: ["Insufficient text content to identify document."],
      warnings: ["Image text is too short or unreadable."],
      allScores: {},
      isConfident: false,
    };
  }

  const scores = {
    ms10:      0,
    ms12:      0,
    community: 0,
    income:    0,
    aadhaar:   0,
    bankpass:  0,
  };

  const matchedSignals = {
    ms10:      [],
    ms12:      [],
    community: [],
    income:    [],
    aadhaar:   [],
    bankpass:  [],
  };

  // Evaluate rules for all document categories
  for (const [docKey, rules] of Object.entries(CLASSIFICATION_RULES)) {
    for (const rule of rules) {
      if (rule.pattern.test(clean)) {
        scores[docKey] += rule.weight;
        matchedSignals[docKey].push(rule.label);
      }
    }
  }

  // Sort scores descending
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [topType, topScore] = sorted[0];
  const [runnerUpType, runnerUpScore] = sorted[1];

  // Minimum threshold to prevent false positive classifications on random text
  const MIN_SCORE_THRESHOLD = 6;

  if (topScore < MIN_SCORE_THRESHOLD) {
    return {
      type: "unknown",
      confidence: Math.round(topScore * 10),
      reasons: ["No strong matching document patterns found."],
      warnings: ["Text lacks specific markers for marksheets, community, or income certificates."],
      allScores: scores,
      isConfident: false,
    };
  }

  // Calculate confidence considering score difference with runner-up
  const margin = topScore - runnerUpScore;
  let confidence = Math.min(98, Math.max(30, topScore * 8));

  // If top and runner-up are very close (ambiguous), adjust confidence
  const warnings = [];
  if (margin < 3 && runnerUpScore >= MIN_SCORE_THRESHOLD) {
    confidence = Math.max(30, confidence - 25);
    warnings.push(
      `Document exhibits mixed signals between ${SUPPORTED_DOC_TYPES[topType]?.label || topType} and ${SUPPORTED_DOC_TYPES[runnerUpType]?.label || runnerUpType}. Please verify.`
    );
  }

  const reasons = matchedSignals[topType].slice(0, 4);

  return {
    type: topType,
    confidence,
    reasons,
    warnings,
    allScores: scores,
    isConfident: confidence >= 60 && margin >= 3,
  };
}

/**
 * Validates whether the detected document type matches the expected slot.
 * 
 * @param {string} slot Expected slot (ms10, ms12, community, income)
 * @param {Object} detection Output from detectDocumentType
 * @returns {Object} { status: "valid"|"mismatch"|"unconfident", message, badgeColor }
 */
export function validateDocumentSlot(slot, detection) {
  if (!slot || !detection) {
    return { status: "unconfident", message: "Verification pending.", badgeColor: "grey" };
  }

  const detectedType = detection.type;
  const confidence = detection.confidence || 0;

  if (detectedType === "unknown" || confidence < 50) {
    return {
      status: "unconfident",
      message: "Document type could not be confidently identified. Please verify the uploaded document.",
      badgeColor: "yellow",
      detectedLabel: "Uncertain",
    };
  }

  if (detectedType === slot) {
    return {
      status: "valid",
      message: `Document type detected correctly: ${SUPPORTED_DOC_TYPES[slot]?.label}.`,
      badgeColor: "green",
      detectedLabel: SUPPORTED_DOC_TYPES[slot]?.label,
    };
  }

  // Mismatch detected
  const expectedLabel = SUPPORTED_DOC_TYPES[slot]?.label || slot;
  const detectedLabel = SUPPORTED_DOC_TYPES[detectedType]?.label || detectedType;

  return {
    status: "mismatch",
    message: `Wrong document type detected. Uploaded document appears to be a ${detectedLabel}, but ${expectedLabel} was selected.`,
    badgeColor: "red",
    detectedLabel,
  };
}
