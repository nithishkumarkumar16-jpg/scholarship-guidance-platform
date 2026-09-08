/**
 * verificationEngine.js — SGP Cross-Document Consistency & Readiness Engine
 * 
 * Performs multi-layer client-side verification:
 * 1. Multi-level Name Matching (Exact, Whitespace, Token-order, Initials, Levenshtein)
 * 2. Date of Birth Consistency Cross-Check
 * 3. Income Consistency Check (Certificate vs Student Input + Certificate Freshness)
 * 4. Community / Category Cross-Check (Certificate vs Student Input)
 * 5. Full All-Pairs Cross-Document Matrix (including Income Name)
 * 6. Explainable Pre-Submission Readiness & Consistency Score Calculation
 * 
 * 100% API-key-free, local consistency verification only.
 */

import {
  normalizeName,
  tokenSort,
  normalizeDateToISO,
  normalizeIncome,
  normalizeCommunity,
  parseIndianDate,
} from "./fieldNormalizer";

/**
 * Computes Levenshtein edit distance between two strings.
 */
export function levenshteinDistance(a, b) {
  const m = [];
  for (let i = 0; i <= a.length; i++) m[i] = [i];
  for (let j = 1; j <= b.length; j++) m[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      m[i][j] = Math.min(
        m[i - 1][j] + 1,        // deletion
        m[i][j - 1] + 1,        // insertion
        m[i - 1][j - 1] + cost  // substitution
      );
    }
  }
  return m[a.length][b.length];
}

/**
 * Multi-Level Name Comparison Engine.
 * 
 * @param {string} rawA First name
 * @param {string} rawB Second name
 * @param {boolean} isStrict If true, enforces strict matching (Aadhaar, Community, Income, Bank)
 * @returns {Object} { status: "EXACT_MATCH"|"LIKELY_MATCH"|"MINOR_DIFFERENCE"|"MISMATCH"|"MISSING", score, explanation }
 */
export function compareNames(rawA, rawB, isStrict = false) {
  if (!rawA || !rawB) {
    return { status: "MISSING", score: 0, explanation: "One or both names are missing." };
  }

  const cleanA = normalizeName(rawA).toLowerCase();
  const cleanB = normalizeName(rawB).toLowerCase();

  if (!cleanA || !cleanB) {
    return { status: "MISSING", score: 0, explanation: "One or both names could not be parsed." };
  }

  // LEVEL 1: Exact Normalized Match
  if (cleanA === cleanB) {
    return { status: "EXACT_MATCH", score: 1.0, explanation: "Exact character match." };
  }

  // LEVEL 2 & 3: Token-Order Variation (e.g. "Nithishkumar M" vs "M Nithishkumar")
  const sortedA = tokenSort(cleanA);
  const sortedB = tokenSort(cleanB);
  if (sortedA === sortedB) {
    return {
      status: "EXACT_MATCH",
      score: 0.98,
      explanation: "Same name tokens in different word order (e.g. Surname first).",
    };
  }

  // LEVEL 4: Initial-Stripped Comparison
  const stripSingleInitials = (s) => s.replace(/\b[a-z]\b/g, "").replace(/\s+/g, " ").trim();
  const noInitA = stripSingleInitials(cleanA);
  const noInitB = stripSingleInitials(cleanB);

  if (noInitA && noInitB) {
    if (noInitA === noInitB || tokenSort(noInitA) === tokenSort(noInitB)) {
      if (isStrict) {
        return {
          status: "LIKELY_MATCH",
          score: 0.92,
          explanation: "Main names match exactly; one document contains an initial or prefix.",
        };
      }
      return {
        status: "EXACT_MATCH",
        score: 0.95,
        explanation: "Main names match; initial difference is acceptable for marksheets.",
      };
    }
  }

  // LEVEL 5: Substring / Subset token comparison
  const tokensA = cleanA.split(/\s+/).filter(t => t.length > 1);
  const tokensB = cleanB.split(/\s+/).filter(t => t.length > 1);

  if (tokensA.length > 0 && tokensB.length > 0) {
    const [shortList, longList] = tokensA.length <= tokensB.length ? [tokensA, tokensB] : [tokensB, tokensA];
    const allTokensMatch = shortList.every(st =>
      longList.some(lt => lt === st || (st.length >= 4 && levenshteinDistance(lt, st) <= 1))
    );

    if (allTokensMatch) {
      return {
        status: isStrict ? "LIKELY_MATCH" : "MINOR_DIFFERENCE",
        score: 0.88,
        explanation: "All major name parts appear in both documents with minor token variation.",
      };
    }
  }

  // LEVEL 6: Fuzzy Levenshtein Distance
  const maxLen = Math.max(cleanA.length, cleanB.length, 1);
  const dist = levenshteinDistance(cleanA, cleanB);
  const similarity = 1 - (dist / maxLen);

  if (similarity >= 0.85) {
    if (isStrict) {
      return {
        status: "MINOR_DIFFERENCE",
        score: similarity,
        explanation: `Minor spelling variation (similarity ${(similarity * 100).toFixed(0)}%). Review recommended.`,
      };
    }
    return {
      status: "LIKELY_MATCH",
      score: similarity,
      explanation: `Spelling differs slightly (similarity ${(similarity * 100).toFixed(0)}%), acceptable for marksheets.`,
    };
  }

  return {
    status: "MISMATCH",
    score: similarity,
    explanation: `Names differ significantly ("${rawA}" vs "${rawB}"). Document correction required.`,
  };
}

/**
 * Compares two Date of Birth strings.
 * 
 * @param {string} dobA 
 * @param {string} dobB 
 * @returns {Object} { status: "MATCH"|"MISMATCH"|"MISSING"|"UNREADABLE"|"AMBIGUOUS", explanation }
 */
export function compareDOB(dobA, dobB) {
  if (!dobA || !dobB) {
    return { status: "MISSING", explanation: "One or both date of birth fields are missing." };
  }

  const isoA = normalizeDateToISO(dobA);
  const isoB = normalizeDateToISO(dobB);

  if (!isoA || !isoB) {
    return { status: "UNREADABLE", explanation: "Date format could not be parsed." };
  }

  if (isoA === isoB) {
    return { status: "MATCH", explanation: `DOB matches: ${isoA}.` };
  }

  return {
    status: "MISMATCH",
    explanation: `DOB mismatch: ${isoA} vs ${isoB}. Must be identical to Aadhaar.`,
  };
}

/**
 * Computes Income Certificate Freshness & Expiry.
 */
export function evaluateIncomeFreshness(issueDate, validUpto) {
  const now = new Date();

  if (validUpto) {
    const validD = parseIndianDate(validUpto);
    if (validD) {
      if (validD < now) {
        const monthsAgo = (now - validD) / (1000 * 60 * 60 * 24 * 30);
        return {
          status: "expired",
          label: "Expired",
          color: "red",
          detail: `Certificate expired on ${validUpto} (${Math.round(monthsAgo)} month(s) ago). A fresh certificate is required.`,
        };
      }
      const monthsLeft = (validD - now) / (1000 * 60 * 60 * 24 * 30);
      return {
        status: monthsLeft < 1 ? "warning" : "valid",
        label: monthsLeft < 1 ? "Expires Very Soon" : monthsLeft < 3 ? "Valid (Expiring Soon)" : "Valid",
        color: monthsLeft < 1 ? "yellow" : "green",
        detail: `Valid upto ${validUpto} (${Math.round(monthsLeft)} month(s) remaining).`,
      };
    }
  }

  if (issueDate) {
    const issueD = parseIndianDate(issueDate);
    if (issueD) {
      const ageMonths = (now - issueD) / (1000 * 60 * 60 * 24 * 30);
      if (ageMonths > 12) {
        return {
          status: "expired",
          label: "Outdated (>12 Months)",
          color: "red",
          detail: `Issued on ${issueDate} (${Math.round(ageMonths)} months ago). NSP requires a certificate from the current financial year.`,
        };
      }
      if (ageMonths > 6) {
        return {
          status: "warning",
          label: "Ageing (6-12 Months)",
          color: "yellow",
          detail: `Issued ${Math.round(ageMonths)} months ago. Fresh within 6 months is recommended.`,
        };
      }
      return {
        status: "valid",
        label: "Fresh (<6 Months)",
        color: "green",
        detail: `Issued on ${issueDate} (${Math.round(ageMonths)} month(s) ago) — fresh.`,
      };
    }
  }

  return {
    status: "unknown",
    label: "Unknown Date",
    color: "grey",
    detail: "Issue / validity date could not be read from certificate.",
  };
}

/**
 * Compares Income Certificate amount vs Student entered income.
 */
export function compareIncome(certIncome, studentIncome, issueDate = null, validUpto = null) {
  const numCert = normalizeIncome(certIncome);
  const numStudent = normalizeIncome(studentIncome);
  const freshness = evaluateIncomeFreshness(issueDate, validUpto);

  if (numCert === null && numStudent === null) {
    return { status: "MISSING", explanation: "Income details not provided.", freshness };
  }

  if (numCert === null) {
    return { status: "WARNING", explanation: "Income could not be read from certificate.", freshness };
  }

  if (numStudent === null) {
    return { status: "WARNING", explanation: "Student entered income is missing.", numCert, freshness };
  }

  if (numCert === numStudent) {
    return {
      status: freshness.status === "expired" ? "EXPIRED" : "MATCH",
      explanation: `Income matches entered details (₹${numCert.toLocaleString("en-IN")}).`,
      numCert,
      numStudent,
      freshness,
    };
  }

  return {
    status: "MISMATCH",
    explanation: `Income differs: Certificate shows ₹${numCert.toLocaleString("en-IN")}, but entered income is ₹${numStudent.toLocaleString("en-IN")}.`,
    numCert,
    numStudent,
    freshness,
  };
}

/**
 * Compares Community Certificate category vs Student entered category.
 */
export function compareCommunity(certCommunity, studentCategory) {
  const normCert = normalizeCommunity(certCommunity);
  const normStudent = normalizeCommunity(studentCategory);

  if (!normCert && !normStudent) {
    return { status: "MISSING", explanation: "Community details not provided." };
  }

  if (!normCert) {
    return { status: "WARNING", explanation: "Community could not be read from certificate." };
  }

  if (!normStudent) {
    return { status: "WARNING", explanation: "Student entered community is missing." };
  }

  if (normCert === normStudent) {
    return {
      status: "MATCH",
      explanation: `Category matches: ${normCert}.`,
      normCert,
      normStudent,
    };
  }

  return {
    status: "MISMATCH",
    explanation: `Category mismatch: Certificate shows "${normCert}", but entered category is "${normStudent}".`,
    normCert,
    normStudent,
  };
}

/**
 * Builds the complete Cross-Document Matrix across all available sources.
 * 
 * IMPORTANT: Includes Income Certificate Holder Name (fixing the audit issue).
 */
export function buildCrossDocumentMatrix({
  aadharName = "",
  aadharDob = "",
  bankHolder = "",
  bankAccType = "",
  tenthData = null,
  twelfthData = null,
  communityData = null,
  incomeData = null,
  studentIncome = "",
  studentCategory = "",
}) {
  // 1. All Name Sources
  const nameSources = [
    { doc: "Aadhaar Card",          ico: "🪪", val: aadharName.trim() || null, strict: true },
    { doc: "Community Certificate", ico: "📜", val: communityData?.name || null, strict: true },
    { doc: "Income Certificate",    ico: "💰", val: incomeData?.name || null, strict: true },
    { doc: "10th Marksheet",        ico: "📋", val: tenthData?.name || null, strict: false },
    { doc: "12th Marksheet",        ico: "📋", val: twelfthData?.name || null, strict: false },
    { doc: "Bank Passbook",         ico: "🏦", val: bankHolder.trim() || null, strict: true },
  ].filter(s => s.val && String(s.val) !== "null" && String(s.val).trim() !== "");

  // Pair-by-pair comparison
  const namePairs = [];
  for (let i = 0; i < nameSources.length; i++) {
    for (let j = i + 1; j < nameSources.length; j++) {
      const a = nameSources[i];
      const b = nameSources[j];
      const isStrict = a.strict || b.strict;
      const res = compareNames(a.val, b.val, isStrict);
      namePairs.push({ a, b, isStrict, ...res });
    }
  }

  const hasNameMismatch = namePairs.some(p => p.status === "MISMATCH");
  const hasNameMinor = !hasNameMismatch && namePairs.some(p => p.status === "MINOR_DIFFERENCE" || p.status === "LIKELY_MATCH");
  const nameConsistencyStatus = nameSources.length < 2 ? "grey" : (hasNameMismatch ? "red" : hasNameMinor ? "yellow" : "green");

  // 2. DOB Sources
  const dobSources = [
    { doc: "Aadhaar Card",          ico: "🪪", val: aadharDob.trim() || null },
    { doc: "Community Certificate", ico: "📜", val: communityData?.dob || null },
    { doc: "Income Certificate",    ico: "💰", val: incomeData?.dob || null },
    { doc: "10th Marksheet",        ico: "📋", val: tenthData?.dob || null },
    { doc: "12th Marksheet",        ico: "📋", val: twelfthData?.dob || null },
  ].filter(s => s.val && String(s.val) !== "null" && String(s.val).trim() !== "");

  const dobPairs = [];
  if (aadharDob.trim()) {
    for (const src of dobSources) {
      if (src.doc !== "Aadhaar Card") {
        const res = compareDOB(src.val, aadharDob.trim());
        dobPairs.push({ doc: src.doc, ico: src.ico, val: src.val, ...res });
      }
    }
  }

  const hasDobMismatch = dobPairs.some(p => p.status === "MISMATCH");
  const dobConsistencyStatus = !aadharDob.trim() ? "grey" : (hasDobMismatch ? "red" : dobPairs.some(p => p.status === "MATCH") ? "green" : "grey");

  // 3. Income Check
  const incomeResult = compareIncome(
    incomeData?.incomeNumber || incomeData?.income,
    studentIncome,
    incomeData?.issueDate,
    incomeData?.validUpto
  );

  // 4. Community Check
  const communityResult = compareCommunity(
    communityData?.communityCategory || communityData?.community,
    studentCategory
  );

  // 5. Pre-Submission Readiness / Consistency Score Breakdown
  let scorePoints = 0;
  let maxPoints = 0;
  const breakdown = [];

  // Name Score (30 pts)
  maxPoints += 30;
  if (nameConsistencyStatus === "green") {
    scorePoints += 30;
    breakdown.push({ item: "Name Consistency Across Documents", status: "PASS", points: 30, max: 30, note: "All document names match or have acceptable token variations." });
  } else if (nameConsistencyStatus === "yellow") {
    scorePoints += 20;
    breakdown.push({ item: "Name Consistency Across Documents", status: "WARN", points: 20, max: 30, note: "Minor name formatting/initial difference detected." });
  } else if (nameConsistencyStatus === "red") {
    breakdown.push({ item: "Name Consistency Across Documents", status: "FAIL", points: 0, max: 30, note: "Name mismatch detected between key identity documents." });
  } else {
    breakdown.push({ item: "Name Consistency Across Documents", status: "PENDING", points: 0, max: 30, note: "Upload documents to verify name consistency." });
  }

  // DOB Score (20 pts)
  maxPoints += 20;
  if (dobConsistencyStatus === "green") {
    scorePoints += 20;
    breakdown.push({ item: "Date of Birth Consistency", status: "PASS", points: 20, max: 20, note: "DOB is consistent with Aadhaar reference." });
  } else if (dobConsistencyStatus === "red") {
    breakdown.push({ item: "Date of Birth Consistency", status: "FAIL", points: 0, max: 20, note: "DOB on certificate does not match Aadhaar." });
  } else {
    breakdown.push({ item: "Date of Birth Consistency", status: "PENDING", points: 0, max: 20, note: "DOB check pending." });
  }

  // Income Freshness & Consistency (20 pts)
  maxPoints += 20;
  if (incomeResult.status === "MATCH" && (incomeResult.freshness?.status === "valid" || incomeResult.freshness?.status === "unknown" || !incomeResult.freshness)) {
    scorePoints += 20;
    breakdown.push({ item: "Income Verification & Freshness", status: "PASS", points: 20, max: 20, note: "Income matches student input." });
  } else if (incomeResult.status === "MATCH" && incomeResult.freshness?.status === "warning") {
    scorePoints += 15;
    breakdown.push({ item: "Income Verification & Freshness", status: "WARN", points: 15, max: 20, note: "Income matches, but certificate is 6-12 months old." });
  } else if (incomeResult.status === "EXPIRED" || incomeResult.freshness?.status === "expired") {
    breakdown.push({ item: "Income Verification & Freshness", status: "FAIL", points: 0, max: 20, note: "Income certificate is older than 12 months." });
  } else if (incomeResult.status === "MISMATCH") {
    breakdown.push({ item: "Income Verification & Freshness", status: "FAIL", points: 0, max: 20, note: "Income amount differs between certificate and student input." });
  } else {
    breakdown.push({ item: "Income Verification & Freshness", status: "PENDING", points: 0, max: 20, note: "Upload income certificate to verify." });
  }

  // Community Category Match (15 pts)
  maxPoints += 15;
  if (communityResult.status === "MATCH") {
    scorePoints += 15;
    breakdown.push({ item: "Community Category Consistency", status: "PASS", points: 15, max: 15, note: "Community category matches certificate." });
  } else if (communityResult.status === "MISMATCH") {
    breakdown.push({ item: "Community Category Consistency", status: "FAIL", points: 0, max: 15, note: "Entered category differs from certificate." });
  } else {
    breakdown.push({ item: "Community Category Consistency", status: "PENDING", points: 0, max: 15, note: "Upload community certificate to verify." });
  }

  // Bank Account Type (15 pts)
  maxPoints += 15;
  if (bankAccType === "Single") {
    scorePoints += 15;
    breakdown.push({ item: "Bank Account Type", status: "PASS", points: 15, max: 15, note: "Single Savings Account confirmed (NSP required)." });
  } else if (bankAccType === "Joint") {
    breakdown.push({ item: "Bank Account Type", status: "FAIL", points: 0, max: 15, note: "Joint accounts are rejected for NSP direct benefit transfer." });
  } else {
    breakdown.push({ item: "Bank Account Type", status: "PENDING", points: 0, max: 15, note: "Bank details pending." });
  }

  const consistencyPercentage = maxPoints > 0 ? Math.round((scorePoints / maxPoints) * 100) : 0;
  let overallReadiness = "Needs Review";
  if (hasNameMismatch || hasDobMismatch || bankAccType === "Joint" || incomeResult.status === "EXPIRED" || communityResult.status === "MISMATCH") {
    overallReadiness = "Issues Found — Correction Required";
  } else if (consistencyPercentage >= 85) {
    overallReadiness = "High Consistency — Ready for Official Application";
  } else if (consistencyPercentage >= 60) {
    overallReadiness = "Moderate Consistency — Review Warnings";
  }

  return {
    nameSources,
    namePairs,
    nameConsistencyStatus,
    hasNameMismatch,
    hasNameMinor,
    dobSources,
    dobPairs,
    dobConsistencyStatus,
    hasDobMismatch,
    incomeResult,
    communityResult,
    scorePoints,
    maxPoints,
    consistencyPercentage,
    overallReadiness,
    breakdown,
  };
}
