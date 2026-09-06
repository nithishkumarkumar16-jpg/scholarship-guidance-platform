// ============================================================
//  sgpBrain.js — SGP local AI engine
//  Architecture:
//    User Input
//      → tokenize()
//      → extractSlots()          ← community / income / level
//      → detectIntent()          ← slot-aware, community forces eligibility
//      → buildFactBlock()        ← assembles ONLY verified KB facts
//      → return { intent, slots, response }
//
//  Responses are composed locally from verified knowledge-base facts.
// ============================================================




// ── 1. KNOWLEDGE BASE ─────────────────────────────────────────────────────────

export const KB = {

  scholarships: [

    {
      id: "sc_postmatric",
      name: "SC Post Matric Scholarship",
      short: "For Scheduled Caste students studying after 10th",
      community: ["sc"],
      income: 250000,
      level: ["ug", "pg", "diploma", "iti", "polytechnic"],
      amount: "₹15,000 – ₹23,000/year",
      maintenance: "₹380 – ₹1,200/month (hostel) | ₹230 – ₹550/month (day scholar)",
      portal: "UMIS",
      portal_url: "umis.tn.gov.in",
      deadline: "August – October every year",
      authority: "TN Adi Dravidar & Tribal Welfare Dept.",
      steps: [
        "Register at umis.tn.gov.in with Aadhaar-linked mobile",
        "Select 'SC Post Matric Scholarship'",
        "Upload all mandatory documents",
        "Submit — get acknowledgement number",
        "College verifies and forwards online",
      ],
      tips: [
        "Apply as early as possible — portal slows near deadline",
        "Ensure bank account is DBT-enabled before applying",
        "Income certificate must be of current financial year",
      ],
    },

    {
      id: "st_postmatric",
      name: "ST Post Matric Scholarship",
      short: "For Scheduled Tribe students studying after 10th",
      community: ["st"],
      income: 250000,
      level: ["ug", "pg", "diploma", "iti", "polytechnic"],
      amount: "₹15,000 – ₹23,000/year",
      maintenance: "₹380 – ₹1,200/month (hostel) | ₹230 – ₹550/month (day scholar)",
      portal: "UMIS",
      portal_url: "umis.tn.gov.in",
      deadline: "August – October every year",
      authority: "TN Adi Dravidar & Tribal Welfare Dept.",
      steps: [
        "Register at umis.tn.gov.in with Aadhaar-linked mobile",
        "Select 'ST Post Matric Scholarship'",
        "Upload all mandatory documents",
        "Submit — get acknowledgement number",
        "College verifies and forwards online",
      ],
      tips: [
        "ST students may also qualify for free hostel facilities",
        "Contact your district Tribal Welfare Office for additional benefits",
      ],
    },

    {
      id: "bc_postmatric",
      name: "BC / MBC Post Matric Scholarship",
      short: "For Backward Class and Most Backward Class students",
      community: ["bc", "mbc", "dnc"],
      income: 200000,
      level: ["ug", "pg", "diploma", "iti", "polytechnic"],
      amount: "₹10,000 – ₹18,000/year",
      maintenance: "₹300 – ₹1,000/month (hostel) | ₹200 – ₹450/month (day scholar)",
      portal: "UMIS",
      portal_url: "umis.tn.gov.in",
      deadline: "August – October every year",
      authority: "TN BC, MBC & Minorities Welfare Dept.",
      steps: [
        "Register at umis.tn.gov.in",
        "Select your sub-scheme: BC or MBC/DNC",
        "Fill form with correct sub-caste details",
        "Upload documents — community cert must match sub-caste",
        "Submit and ensure college verification",
      ],
      tips: [
        "MBC and DNC are separate sub-categories — select correctly",
        "Income limit is ₹2 lakh (lower than SC/ST limit of ₹2.5 lakh)",
        "Community certificate must mention exact sub-caste (e.g. Vanniyar)",
      ],
    },

    {
      id: "tn_merit",
      name: "TN Chief Minister's Special Scholarship",
      short: "Merit-based scholarship for top-scoring TN students",
      community: ["all"],
      income: 500000,
      level: ["ug"],
      marks: "85% and above in 12th standard",
      amount: "₹5,000 – ₹15,000/year",
      portal: "UMIS",
      portal_url: "umis.tn.gov.in",
      deadline: "August – September every year",
      authority: "TN School Education Dept.",
      steps: [
        "Score 85%+ in TN 12th Board exam",
        "Register at umis.tn.gov.in",
        "Select 'Chief Minister's Special Scholarship'",
        "Upload 12th marksheet and bonafide",
        "Submit and track college verification",
      ],
      tips: [
        "Merit-based — no caste or community restriction",
        "Must be enrolled in a Tamil Nadu government or aided college",
      ],
    },

    {
      id: "tn_first_gen",
      name: "TN First Generation Graduate Scholarship",
      short: "For students who are first in their family to attend college",
      community: ["sc", "st", "bc", "mbc", "obc"],
      income: 200000,
      level: ["ug"],
      amount: "₹7,500 – ₹10,000/year",
      portal: "UMIS",
      portal_url: "umis.tn.gov.in",
      deadline: "August – October every year",
      authority: "TN Higher Education Dept.",
      steps: [
        "Get a declaration from your parents that neither holds a degree",
        "Register at umis.tn.gov.in",
        "Upload declaration + income + community certificate",
        "Submit and await college verification",
      ],
      tips: [
        "Both parents must not have completed a degree",
        "Declaration must be signed and notarised",
      ],
    },

    {
      id: "pm_yasasvi",
      name: "PM-YASASVI Scholarship",
      short: "Central scholarship for OBC / EBC / DNT students",
      community: ["obc", "ebc", "dnc", "dnt"],
      income: 250000,
      level: ["ug", "pg", "diploma"],
      amount: "₹12,000 – ₹20,000/year",
      maintenance: "₹1,000/month (hostel) | ₹500/month (day scholar)",
      portal: "NSP",
      portal_url: "scholarships.gov.in",
      deadline: "September – November every year",
      authority: "Ministry of Social Justice & Empowerment",
      steps: [
        "Register at scholarships.gov.in",
        "Select 'PM-YASASVI' under OBC/EBC/DNT category",
        "Fill form with correct OBC/EBC certificate details",
        "Upload all documents",
        "Submit — note Application ID",
        "College verifies on NSP portal",
      ],
      tips: [
        "OBC certificate must be issued by competent authority",
        "DNT / EBC communities are specifically covered",
        "Track status on NSP using Application ID",
      ],
    },

    {
      id: "merit_cum_means",
      name: "Merit-cum-Means Scholarship",
      short: "For Minority community students with 60%+ marks",
      community: ["minority", "muslim", "christian", "sikh", "buddhist", "parsi", "jain"],
      income: 250000,
      level: ["ug", "pg"],
      marks: "60% and above in previous qualifying exam",
      amount: "₹10,000 – ₹30,000/year",
      maintenance: "₹1,000/month (hostel) | ₹500/month (day scholar)",
      portal: "NSP",
      portal_url: "scholarships.gov.in",
      deadline: "September – October every year",
      authority: "Ministry of Minority Affairs",
      steps: [
        "Register at scholarships.gov.in",
        "Select 'Merit-cum-Means' under Minority Affairs",
        "Upload religion/minority certificate",
        "Submit mark certificate showing 60%+",
        "College verifies and forwards on NSP",
      ],
      tips: [
        "Covers Muslims, Christians, Sikhs, Buddhists, Parsis, Jains",
        "Fresh & renewal both available on NSP",
        "Higher amount for professional courses (engineering, medical, law)",
      ],
    },

    {
      id: "css",
      name: "Central Sector Scheme (CSS)",
      short: "Open to all communities, for top academic performers",
      community: ["all"],
      income: 800000,
      level: ["ug", "pg"],
      marks: "Top 80th percentile in Class 12 Board exam",
      amount: "₹10,000 – ₹20,000/year",
      portal: "NSP",
      portal_url: "scholarships.gov.in",
      deadline: "October – November every year",
      authority: "Ministry of Education",
      steps: [
        "Check if your 12th Board marks are in top 80th percentile",
        "Register at scholarships.gov.in",
        "Select 'Central Sector Scheme of Scholarships'",
        "Upload 12th marksheet and income certificate",
        "Submit — get Application ID",
        "Track status on NSP",
      ],
      tips: [
        "No caste restriction — open to all communities",
        "Highest income limit: ₹8 lakh per year",
        "Must check 80th percentile cut-off for your Board (CBSE / TN Board)",
        "Renewable each year if you maintain 50% marks",
      ],
    },

    {
      id: "nsp_prematric_sc",
      name: "Pre-Matric Scholarship for SC/ST (Class 9 & 10)",
      short: "For SC/ST students studying in Class 9 or 10",
      community: ["sc", "st"],
      income: 250000,
      level: ["prematric"],
      amount: "₹1,000 – ₹3,500/year",
      portal: "NSP",
      portal_url: "scholarships.gov.in",
      deadline: "October – November every year",
      authority: "Ministry of Social Justice & Empowerment",
      steps: [
        "Register at scholarships.gov.in (parent/guardian registers)",
        "Select 'Pre-Matric Scholarship SC/ST'",
        "Upload income + community certificate",
        "Submit and ensure school verifies",
      ],
      tips: [
        "For Class 9 and 10 students only",
        "Parents register on behalf of the student",
        "School principal must verify on NSP portal",
      ],
    },

    {
      id: "nsp_prematric_obc",
      name: "Pre-Matric Scholarship for OBC (Class 6–10)",
      short: "Central scholarship for OBC students in Classes 6 to 10",
      community: ["obc", "bc", "mbc"],
      income: 44500,
      level: ["prematric"],
      amount: "₹500 – ₹1,500/year",
      portal: "NSP",
      portal_url: "scholarships.gov.in",
      deadline: "October – November every year",
      authority: "Ministry of Social Justice & Empowerment",
      steps: [
        "Register at scholarships.gov.in",
        "Select 'Pre-Matric OBC Scholarship'",
        "Upload OBC certificate + income certificate",
        "Submit and school verifies",
      ],
      tips: [
        "Income limit is very low (₹44,500/year) for this scheme",
        "For Classes 6–10 only",
      ],
    },

    {
      id: "ishan_uday",
      name: "Ishan Uday Special Scholarship (North East)",
      short: "For students from North East states joining colleges outside NE",
      community: ["all"],
      income: 450000,
      level: ["ug"],
      amount: "₹5,400 – ₹7,800/month",
      portal: "NSP",
      portal_url: "scholarships.gov.in",
      deadline: "October – November every year",
      authority: "University Grants Commission (UGC)",
      steps: [
        "Must be domicile of North East state",
        "Must be enrolled in a college outside the North East",
        "Register at scholarships.gov.in",
        "Select 'Ishan Uday' under UGC schemes",
      ],
      tips: [
        "Only for students originally from North East India",
        "Studying in a college OUTSIDE the North East",
      ],
    },

    {
      id: "begum_hazrat",
      name: "Begum Hazrat Mahal National Scholarship",
      short: "For meritorious girl students from Minority communities",
      community: ["minority", "muslim", "christian", "sikh", "buddhist", "parsi", "jain"],
      income: 200000,
      level: ["prematric", "ug"],
      marks: "50% and above",
      amount: "₹5,000 – ₹6,000/year",
      portal: "Maulana Azad Education Foundation",
      portal_url: "maef.nic.in",
      deadline: "September – October every year",
      authority: "Maulana Azad Education Foundation",
      steps: [
        "Register at maef.nic.in",
        "Select Begum Hazrat Mahal scholarship",
        "Upload minority certificate + marks + income",
        "Submit and track status",
      ],
      tips: [
        "Only for girl students from Minority communities",
        "Must have scored 50%+ in Class 9 or 11",
      ],
    },

    {
      id: "tn_blind",
      name: "Scholarship for Differently Abled Students (TN)",
      short: "For physically/visually/hearing disabled students in Tamil Nadu",
      community: ["all"],
      income: 300000,
      level: ["ug", "pg", "diploma", "iti"],
      amount: "₹5,000 – ₹15,000/year",
      portal: "UMIS",
      portal_url: "umis.tn.gov.in",
      deadline: "August – October every year",
      authority: "TN Social Welfare Dept.",
      steps: [
        "Obtain disability certificate from District Medical Officer",
        "Register at umis.tn.gov.in",
        "Select 'Scholarship for Differently Abled'",
        "Upload disability cert + income + documents",
        "Submit and await college verification",
      ],
      tips: [
        "Minimum 40% disability required as per certificate",
        "Additional disability allowance may be available from the district",
      ],
    },
  ],

  documents: {
    mandatory: [
      "Aadhaar Card (student)",
      "Bank Passbook (Aadhaar-linked & DBT-enabled)",
      "Community Certificate (from Tahsildar, in student's name)",
      "Income Certificate (current financial year, from Tahsildar)",
      "10th Marksheet & Pass Certificate",
      "12th Marksheet & Pass Certificate (for UG applicants)",
      "College Bonafide Certificate / Fee Receipt",
      "Passport size photo (recent, white background)",
    ],
    optional: [
      "Hostel certificate (if residing in hostel)",
      "Disability certificate (if applicable, from District Medical Officer)",
      "Bank Aadhaar seeding confirmation letter",
      "Migration certificate (if from other state)",
      "First generation graduate declaration (notarised)",
    ],
    scan_tips: [
      "Scan in colour, minimum 200 DPI",
      "File size: 50 KB – 500 KB per document",
      "Accepted formats: PDF or JPG",
      "Name and date must be clearly visible",
      "No handwritten corrections visible on scanned copy",
    ],
  },

  dbt: {
    steps: [
      "Visit your bank branch with Aadhaar card + photocopy",
      "Fill the Aadhaar seeding / linking form",
      "Specifically request 'NPCI DBT activation' by name",
      "Ensure your mobile number is linked to the bank account",
      "Get written acknowledgement or SMS confirmation",
      "Wait 3–7 working days",
      "Verify at npci.org.in/npci/aadhaar-mapper",
    ],
    difference: {
      linked: "Aadhaar Linked — bank has your Aadhaar number stored. NOT sufficient for scholarship payment.",
      seeded: "Aadhaar Seeded — Aadhaar is stored in bank's CBS. NPCI mapper may not yet be active.",
      dbt:    "DBT Enabled — Aadhaar is mapped in NPCI. Scholarship amount will be credited directly. ✅ REQUIRED.",
    },
    common_issues: [
      "Account is savings but not active (must be active for DBT)",
      "Joint account — DBT works only on individual/sole accounts",
      "Mobile number not updated in bank records",
      "Bank branch did NPCI seeding but forgot NPCI mapper activation",
      "Old Aadhaar number updated but NPCI not re-mapped",
    ],
  },

  rejection_reasons: [
    { reason: "Name or DOB mismatch between Aadhaar and certificates", fix: "Visit myaadhaar.uidai.gov.in to correct Aadhaar" },
    { reason: "Bank account not DBT-enabled (NPCI mapping missing)", fix: "Visit bank branch and request NPCI DBT activation" },
    { reason: "Expired income certificate (must be current year)", fix: "Get fresh income certificate from Tahsildar" },
    { reason: "Wrong or unverified community certificate", fix: "Get fresh community cert with correct sub-caste from Tahsildar" },
    { reason: "Blurred or incomplete document uploads", fix: "Re-scan documents at 200 DPI, colour, PDF format" },
    { reason: "Late submission after deadline", fix: "Apply in the very first month — portals open August onwards" },
    { reason: "Duplicate application on same portal", fix: "Login with original credentials — do not create new account" },
    { reason: "Attendance below 75% in previous year", fix: "Maintain 75%+ attendance before applying for renewal" },
    { reason: "Institute did not verify application on portal", fix: "Follow up with scholarship coordinator at college" },
    { reason: "Mobile number not linked to Aadhaar", fix: "Visit nearest Aadhaar centre to link mobile number" },
    { reason: "Aadhaar not linked to correct bank account", fix: "Visit bank and check which account Aadhaar is linked to" },
    { reason: "Wrong course/level selected during application", fix: "Check if your course is UG/PG/Diploma and select correctly" },
  ],

  portals: {
    nsp:   { name: "NSP", full: "National Scholarship Portal", url: "scholarships.gov.in", schemes: ["CSS", "PM-YASASVI", "Merit-cum-Means", "Pre-Matric SC/ST/OBC", "Ishan Uday"] },
    umis:  { name: "UMIS", full: "Tamil Nadu Unified Scholarship Portal", url: "umis.tn.gov.in", schemes: ["SC/ST/BC/MBC Post Matric", "CM Special", "First Generation Graduate", "Differently Abled"] },
    maef:  { name: "MAEF", full: "Maulana Azad Education Foundation", url: "maef.nic.in", schemes: ["Begum Hazrat Mahal Scholarship"] },
    uidai: { name: "UIDAI", url: "myaadhaar.uidai.gov.in", purpose: "Aadhaar correction, name/DOB/mobile update" },
    npci:  { name: "NPCI", url: "npci.org.in/npci/aadhaar-mapper", purpose: "Check DBT activation status" },
  },

  renewal: {
    process: [
      "Gather fresh documents: latest marksheet, new income certificate, bonafide",
      "Verify your bank DBT status is still active",
      "Login to original portal (NSP or UMIS) with your same Application ID",
      "Fill renewal form — update marks, academic year, course details",
      "Upload fresh documents as required",
      "Submit and note new acknowledgement receipt number",
      "Ensure your college verifies and forwards the renewal on portal",
    ],
    conditions: [
      "Minimum 75% attendance in previous academic year",
      "Must have passed all subjects in the previous year",
      "Fresh income certificate (current financial year) is mandatory",
      "Must apply on the same portal as original application",
      "DBT-enabled bank account must still be active",
      "No change in course or institution without prior intimation",
    ],
    tips: [
      "Renewal window usually opens in June–July — don't wait",
      "Update your marks even if slightly lower — renewal is not merit-based",
      "If you changed college mid-year, contact the portal helpdesk",
    ],
  },
};


// ── 2. TOKENIZER ──────────────────────────────────────────────────────────────

export function tokenize(text) {
  if (!text || typeof text !== "string") return [];
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

// Returns full lowercased text for phrase matching (without token splitting side effects)
function fullText(text) {
  if (!text || typeof text !== "string") return "";
  return text.toLowerCase().replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();
}


// ── 3. SLOT EXTRACTOR ─────────────────────────────────────────────────────────

export function extractSlots(tokens) {
  if (!tokens || !Array.isArray(tokens)) return {};
  const slots = {};

  // Use EXACT token matching for single-char community codes to prevent
  // false matches like "sc" inside "scholarship", "st" inside "student", etc.
  const communityMap = {
    "scheduled caste": "sc",
    "scheduled tribe": "st",
    "sc": "sc",
    "st": "st",
    "bc": "bc",
    "obc": "obc",
    "mbc": "mbc",
    "ebc": "ebc",
    "dnc": "dnc",
    "dnt": "dnc",
    "minority": "minority",
    "muslim": "minority",
    "christian": "minority",
    "sikh": "minority",
    "buddhist": "minority",
    "parsi": "minority",
    "jain": "minority",
    "general": "general",
    "forward": "general",
  };

  // SAFE_WORDS: tokens that contain community codes but are NOT community declarations
  // e.g. "scholarship" contains "sc", "student" contains "st", "process" contains "sc"
  const NOISE_WORDS = new Set([
    "scholarship", "scholarships", "student", "students", "process",
    "closing", "scheme", "schemes", "status", "section", "subject",
    "district", "institution", "instruction", "document", "documents",
    "certificate", "certificates", "miscellaneous", "discuss", "because",
    "score", "scores", "scout", "muscle", "disco", "rescue", "abstract",
    "describe", "pascal", "fiscal", "obstacle", "scooter", "screen",
    "ascend", "discount", "description", "discipline", "disclose",
    "escape", "escalate", "schedule", "escobar",
    "statement", "stance", "stationery", "statutory", "strategy",
    "structure", "strength", "stretch", "straight", "strange",
    "stream", "street", "stress", "strip", "stride",
    // "bc" noise
    "object", "subject", "abstract", "bc",
  ]);

  // Remove noise tokens before community matching
  const cleanTokens = tokens.filter(t => !NOISE_WORDS.has(t));
  const cleanText = cleanTokens.join(" ");

  // Multi-word first (exact phrase in clean text)
  const multiWord = Object.keys(communityMap).filter(k => k.includes(" "));
  for (const key of multiWord) {
    if (cleanText.includes(key)) { slots.community = communityMap[key]; break; }
  }

  // Single-word: ONLY match if the token exactly equals the key
  if (!slots.community) {
    for (const token of cleanTokens) {
      if (communityMap[token] && !["bc"].includes(token)) {
        // Extra check: the original query must contain the community word as a standalone word
        // i.e. preceded/followed by space or start/end
        const originalLower = tokens.join(" ");
        const re = new RegExp(`(^|\\s)${token}(\\s|$)`);
        if (re.test(originalLower)) {
          slots.community = communityMap[token];
          break;
        }
      }
    }
    // "bc" is especially noisy — only match if used with explicit context
    if (!slots.community && (cleanText.includes(" bc ") || cleanText.startsWith("bc ") || cleanText === "bc")) {
      slots.community = "bc";
    }
  }

  // Income — only extract if there's a clear numeric pattern with context
  const incomeMatch = fullText(tokens.join(" ")).match(/\b(\d[\d,.]*)\s*(lakh|lakhs|l\b|thousand|k\b)?\b/);
  if (incomeMatch) {
    let val = parseFloat(incomeMatch[1].replace(/,/g, ""));
    const unit = (incomeMatch[2] || "").toLowerCase().trim();
    if (unit.startsWith("l"))                     val *= 100000;
    else if (unit === "k" || unit === "thousand")  val *= 1000;
    else if (val <= 99 && unit)                    val *= 100000;
    // Don't auto-multiply bare small numbers without a unit — "2" could mean anything
    if (val >= 1000) slots.income = Math.round(val);
  }

  const levelMap = {
    "ug": "ug", "btech": "ug", "be": "ug", "bsc": "ug", "ba": "ug",
    "bcom": "ug", "bca": "ug", "bba": "ug", "engineering": "ug",
    "degree": "ug", "undergraduate": "ug", "bachelor": "ug",
    "pg": "pg", "mtech": "pg", "msc": "pg", "mba": "pg", "mca": "pg",
    "masters": "pg", "postgraduate": "pg",
    "diploma": "diploma", "iti": "iti", "polytechnic": "polytechnic",
    "class 9": "prematric", "class 10": "prematric", "class 6": "prematric",
    "9th": "prematric", "10th standard": "prematric",
  };
  const txt = tokens.join(" ");
  for (const [key, value] of Object.entries(levelMap)) {
    const re = new RegExp(`(^|\\s)${key.replace(/\s+/g, "\\s+")}(\\s|$)`);
    if (re.test(txt)) { slots.level = value; break; }
  }

  if (/\b(girl|female|woman|she)\b/.test(txt)) slots.gender = "female";

  if (/\b(disabled|disability|differently abled|handicap)\b/.test(txt)) slots.disabled = true;

  return slots;
}


// ── 4. INTENT DEFINITIONS ─────────────────────────────────────────────────────

export const INTENTS = [
  // ── Greetings / identity / off-topic (checked FIRST as high-priority overrides)
  { name: "greeting",        priority: true, patterns: ["hi", "hello", "hey", "vanakkam", "good morning", "good afternoon", "good evening", "welcome", "start"] },
  { name: "bot_identity",    priority: true, patterns: ["your name", "what are you", "who are you", "what is your name", "are you a bot", "are you ai", "are you robot", "you are", "tell me about yourself", "introduce yourself"] },
  { name: "how_it_works",    priority: true, patterns: ["how do you work", "how you work", "how does this work", "how does it work", "how this works", "api key", "based on", "what model", "offline", "online", "internet", "technology", "tech behind"] },
  { name: "off_topic",       priority: true, patterns: ["time now", "current time", "weather", "news", "cricket", "movie", "film", "song", "joke", "porn", "sex", "what is pm", "prime minister", "president", "politics", "stock", "bitcoin", "game"] },

  // ── DBT
  { name: "dbt_what",        patterns: ["what is dbt", "dbt mean", "direct benefit transfer", "explain dbt"] },
  { name: "dbt_activate",    patterns: ["activate dbt", "enable dbt", "how to dbt", "dbt enable", "npci mapping", "dbt bank", "bank dbt", "dbt active", "dbt not working", "dbt failed", "npci"] },
  { name: "dbt_check",       patterns: ["check dbt", "dbt status", "my dbt", "verify dbt", "dbt linked or not"] },
  { name: "dbt_difference",  patterns: ["difference between linked seeded", "linked vs seeded", "seeded vs dbt", "aadhaar linked seeded", "difference between linked"] },
  { name: "dbt_issues",      patterns: ["dbt problem", "dbt issue", "dbt not received", "money not received", "payment failed dbt", "dbt common issue"] },

  // ── Eligibility
  {
    name: "eligibility",
    patterns: [
      "am i eligible", "check eligibility", "which scholarship for me",
      "scholarship for me", "which scheme for me", "can i apply",
      "i am sc", "i am st", "i am bc", "i am obc", "i am mbc", "i am ebc",
      "sc student", "st student", "bc student", "obc student", "mbc student",
      "girl scholarship", "female scholarship", "disability scholarship",
      "eligible for scholarship", "qualify for scholarship",
    ],
  },

  // ── Scholarship info
  { name: "apply",            patterns: ["how to apply", "apply online", "how to register", "where to apply", "apply for scholarship", "application process", "step by step", "scholarship process", "process of scholarship", "how scholarship works", "scholarship work"] },
  { name: "documents",        patterns: ["document", "documents needed", "certificates needed", "required documents", "what to upload", "which documents", "certificate list", "certificate needed", "documents required"] },
  { name: "scan_tips",        patterns: ["scan document", "how to scan", "document size", "upload size", "file size", "photo of document", "scanning tips"] },
  { name: "portal_nsp",       patterns: ["nsp", "national scholarship portal", "scholarships.gov", "nsp portal", "nsp apply"] },
  { name: "portal_umis",      patterns: ["umis", "tn scholarship portal", "umis.tn", "state scholarship portal", "tamil nadu portal"] },
  { name: "rejection",        patterns: ["why rejected", "rejection reason", "application rejected", "scholarship rejected", "not approved", "failed application"] },
  { name: "renewal",          patterns: ["renew scholarship", "how to renew", "renewal process", "second year scholarship", "scholarship next year", "renewal application"] },
  { name: "aadhaar_mismatch", patterns: ["name mismatch", "dob mismatch", "aadhaar mismatch", "aadhaar correction", "wrong name aadhaar", "update aadhaar", "aadhaar name change", "mismatch aadhaar"] },
  { name: "bank_link",        patterns: ["bank not linked", "bank account link", "link bank aadhaar", "bank for scholarship", "which bank", "account not linked"] },
  { name: "income_expired",   patterns: ["expired income certificate", "income certificate expired", "income validity", "old income certificate", "identify expired income", "how old income certificate"] },
  { name: "income_cert",      patterns: ["income certificate", "get income certificate", "income proof", "family income certificate", "income from tahsildar", "income document"] },
  { name: "community_cert",   patterns: ["community certificate", "caste certificate", "get community certificate", "sc certificate", "bc certificate", "mbc certificate", "obc certificate"] },
  { name: "deadline",         patterns: ["deadline", "last date", "closing date", "when to apply", "closing time", "scheme closing", "closing date of scholarship", "scholarship deadline"] },
  { name: "scholarship_list", patterns: ["list of scholarships", "all scholarships", "available scholarships", "what scholarships", "types of scholarship", "scholarship schemes"] },
  { name: "amount",           patterns: ["how much money", "scholarship amount", "how much scholarship", "payment amount", "scholarship money"] },
  { name: "status",           patterns: ["application status", "check status", "track application", "scholarship status", "payment status"] },
  { name: "readiness",        patterns: ["am i ready", "ready to apply", "check readiness", "before applying", "checklist"] },
  { name: "renewal_tips",     patterns: ["renewal tips", "renew easily", "renewal mistakes"] },
  { name: "help",             patterns: ["help", "what can you do", "guide me", "what do you know", "features"] },
];


// ── 5. INTENT DETECTOR ────────────────────────────────────────────────────────

export function detectIntent(tokens, slots) {
  if (!tokens || !Array.isArray(tokens)) return "unknown";
  const text = tokens.join(" ");

  // Priority intents checked first via phrase matching (no slot override)
  const priorityIntents = INTENTS.filter(i => i.priority);
  for (const intent of priorityIntents) {
    for (const pattern of intent.patterns) {
      if (text.includes(pattern)) return intent.name;
    }
  }

  // Slot-based override: only trigger eligibility if community was cleanly extracted
  if (slots && slots.community) return "eligibility";
  if (slots && slots.disabled)  return "eligibility";

  // Score remaining intents
  const scores = {};
  const nonPriority = INTENTS.filter(i => !i.priority);
  for (const intent of nonPriority) {
    scores[intent.name] = 0;
    for (const pattern of intent.patterns) {
      if (text.includes(pattern)) {
        scores[intent.name] += pattern.split(" ").length * 2;
      }
    }
  }

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  return sorted[0][1] > 0 ? sorted[0][0] : "unknown";
}


// ── 6. FACT BLOCK BUILDER ─────────────────────────────────────────────────────

export function buildFactBlock(intent, slots) {
  switch (intent) {

    case "greeting":
      return `CONTEXT: User opened the Virtual Assistant chatbot.
RESPONSE_TYPE: Welcome message
PLATFORM: Scholarship Guidance Platform for Tamil Nadu students
CAPABILITIES: eligibility check, documents, DBT setup, NSP/UMIS guidance, rejection fixes, renewal`;

    case "bot_identity":
      return `CONTEXT: User asked who/what the bot is
NAME: Virtual Assistant
PURPOSE: Help Tamil Nadu students navigate government scholarship schemes
BUILT_BY: SGP (Scholarship Guidance Platform) team
RUNS: 100% locally in the browser — no internet or API key needed for core answers
COVERS: NSP and UMIS scholarship schemes, DBT setup, document guidance, eligibility checks
NOT_A_PERSON: This is an AI assistant, not a human agent`;

    case "how_it_works":
      return `CONTEXT: User asked how the bot works
ARCHITECTURE: Rule-based AI engine (sgpBrain.js) running locally in the browser
NO_INTERNET: Core scholarship answers work 100% offline — no API calls needed
OPTIONAL_MODEL: Local response composition is used for all answers.
HALLUCINATION_GUARD: Bot only uses verified scholarship KB facts — cannot invent data
COVERS: Eligibility check, documents, DBT, NSP/UMIS portal steps, deadlines, rejection fixes`;

    case "off_topic":
      return `CONTEXT: User asked something outside scholarship guidance scope
SCOPE: This assistant only answers scholarship-related questions for Tamil Nadu students
CANNOT_ANSWER: General knowledge, news, time, weather, entertainment, politics
REDIRECT: Ask about scholarships, eligibility, documents, DBT, or portals`;

    case "dbt_what":
      return `CONTEXT: User asked what DBT is
FACT: DBT = Direct Benefit Transfer
FACT: Government of India system to transfer scholarship money directly to student bank accounts
FACT: No middlemen involved — faster, transparent, traceable
FACT: Required for scholarships on NSP (scholarships.gov.in) and UMIS (umis.tn.gov.in)
FACT: Requires Aadhaar to be MAPPED with NPCI (National Payments Corporation of India)
IMPORTANT: Just linking Aadhaar to bank is NOT enough — NPCI mapping must be active`;

    case "dbt_activate":
      return `CONTEXT: User wants to activate DBT on their bank account
STEPS:
${KB.dbt.steps.map((s, i) => `  ${i + 1}. ${s}`).join("\n")}
FACT: Activation takes 3–7 working days to reflect in NPCI
VERIFY_URL: npci.org.in/npci/aadhaar-mapper`;

    case "dbt_check":
      return `CONTEXT: User wants to check DBT status
METHOD 1: Visit npci.org.in/npci/aadhaar-mapper → enter Aadhaar → check if bank is mapped
METHOD 2: Visit bank branch and ask "Is my Aadhaar NPCI DBT activated?"
FACT: If bank is shown as mapped in NPCI → DBT is active and scholarship can be received`;

    case "dbt_difference":
      return `CONTEXT: User asked difference between Aadhaar linked, seeded, DBT enabled
AADHAAR_LINKED: ${KB.dbt.difference.linked}
AADHAAR_SEEDED: ${KB.dbt.difference.seeded}
DBT_ENABLED: ${KB.dbt.difference.dbt}
CONCLUSION: Only DBT Enabled status allows scholarship payment to be received`;

    case "dbt_issues":
      return `CONTEXT: User has a DBT-related issue
COMMON_ISSUES:
${KB.dbt.common_issues.map((c, i) => `  ${i + 1}. ${c}`).join("\n")}
RESOLUTION: Visit bank branch with Aadhaar and request NPCI DBT re-activation
VERIFY_URL: npci.org.in/npci/aadhaar-mapper`;

    case "eligibility": {
      const { community, income, level, gender, disabled } = slots || {};

      if (disabled) {
        const s = KB.scholarships.find(x => x.id === "tn_blind");
        return `CONTEXT: User is differently abled and asking about scholarships
MATCHED_SCHOLARSHIP:
  Name: ${s.name}
  Description: ${s.short}
  Amount: ${s.amount}
  Portal: ${s.portal} — ${s.portal_url}
  Deadline: ${s.deadline}
  Authority: ${s.authority}
  Steps: ${s.steps.join(" | ")}
  Tips: ${s.tips.join(" | ")}
ALSO_CHECK: Other scholarships based on community category may also apply`;
      }

      if (gender === "female" && !community) {
        const s = KB.scholarships.find(x => x.id === "begum_hazrat");
        return `CONTEXT: Girl student asking about scholarships
FACT: Several girl-specific scholarships exist
HIGHLIGHTED_SCHEME:
  Name: ${s.name}
  For: ${s.short}
  Amount: ${s.amount}
  Marks_required: ${s.marks}
  Portal: ${s.portal} — ${s.portal_url}
  Deadline: ${s.deadline}
ADVICE: Also check community-based scholarships if you belong to SC/ST/BC/OBC/Minority`;
      }

      if (!community && !income && !level) {
        return `CONTEXT: User asked about eligibility but gave no details
ACTION_NEEDED: Ask user to provide community, income, and education level
EXAMPLES: "I am SC, income 1.5 lakh, UG" or "MBC, 84000 income, diploma"
COMMUNITIES_SUPPORTED: SC, ST, BC, MBC, OBC, EBC, Minority (Muslim/Christian/Sikh/Buddhist/Parsi/Jain), General`;
      }

      const matched = KB.scholarships.filter(s => {
        const commMatch = s.community.includes("all") || (community && s.community.includes(community));
        const incomeMatch = !income || income <= s.income;
        const levelMatch  = !level  || s.level.includes(level);
        return commMatch && incomeMatch && levelMatch;
      });

      const understood = [];
      if (community) understood.push(`Community=${community.toUpperCase()}`);
      if (income)    understood.push(`Income=₹${income.toLocaleString("en-IN")}`);
      if (level)     understood.push(`Level=${level.toUpperCase()}`);

      if (matched.length === 0) {
        return `CONTEXT: Eligibility check — no match found
CHECKED: ${understood.join(", ")}
RESULT: No scholarship matched these criteria
POSSIBLE_REASONS: Income above limit for this community, level not covered, community not supported
ADVICE: Verify income limit for your community category and try again`;
      }

      return `CONTEXT: Eligibility check — scholarships found
CHECKED: ${understood.join(", ")}
MATCHED_COUNT: ${matched.length}
SCHOLARSHIPS:
${matched.map(s =>
  `  - Name: ${s.name}
     Description: ${s.short}
     Amount: ${s.amount}
     Portal: ${s.portal} — ${s.portal_url}
     Deadline: ${s.deadline}
     Steps: ${s.steps ? s.steps.slice(0, 3).join(" | ") : "Register, fill form, upload docs, submit"}
     Tips: ${s.tips ? s.tips[0] : "Apply early and ensure DBT is active"}`
).join("\n")}
REMINDER: Verify exact eligibility rules on official portal before applying`;
    }

    case "documents":
      return `CONTEXT: User asked about required documents
MANDATORY:
${KB.documents.mandatory.map((d, i) => `  ${i + 1}. ${d}`).join("\n")}
OPTIONAL:
${KB.documents.optional.map((d, i) => `  ${i + 1}. ${d}`).join("\n")}
IMPORTANT: All documents must be clear, legible, name/DOB must match Aadhaar exactly`;

    case "scan_tips":
      return `CONTEXT: User asked about scanning/uploading documents
SCAN_TIPS:
${KB.documents.scan_tips.map((t, i) => `  ${i + 1}. ${t}`).join("\n")}
ACCEPTED_FORMATS: PDF or JPG
FILE_SIZE: 50 KB – 500 KB per file`;

    case "apply":
      return `CONTEXT: User asked how to apply for scholarship
STEPS:
  1. Check eligibility — know your community, income, level
  2. Ensure bank account is DBT-enabled (NPCI mapped)
  3. Gather all mandatory documents
  4. Choose correct portal:
     - TN SC/ST/BC/MBC → UMIS: umis.tn.gov.in
     - Central schemes  → NSP:  scholarships.gov.in
     - Minority girl    → MAEF: maef.nic.in
  5. Register on portal with Aadhaar-linked mobile
  6. Fill form accurately — check all details before submitting
  7. Upload all documents
  8. Submit — note acknowledgement number
  9. College must verify your application on the same portal
WARNING: Application is INCOMPLETE until college verifies and forwards`;

    case "portal_nsp":
      return `CONTEXT: User asked about NSP portal
NAME: ${KB.portals.nsp.full}
URL: ${KB.portals.nsp.url}
SCHEMES: ${KB.portals.nsp.schemes.join(", ")}
DEADLINE: September – November (varies by scheme)
STEPS:
  1. Go to scholarships.gov.in
  2. Click "New Registration" or "Login" (renewal)
  3. Select scheme under correct ministry
  4. Fill form, upload documents
  5. Submit — get Application ID
  6. Track at same portal under "Track Application"`;

    case "portal_umis":
      return `CONTEXT: User asked about UMIS portal
NAME: ${KB.portals.umis.full}
URL: ${KB.portals.umis.url}
SCHEMES: ${KB.portals.umis.schemes.join(", ")}
DEADLINE: August – October
STEPS:
  1. Go to umis.tn.gov.in
  2. Register with Aadhaar-linked mobile number
  3. Select your department
  4. Choose your scholarship scheme
  5. Fill form and upload documents
  6. Submit via college
  7. College forwards on UMIS portal`;

    case "rejection":
      return `CONTEXT: User asked about scholarship rejection reasons
REASONS_AND_FIXES:
${KB.rejection_reasons.map((r, i) => `  ${i + 1}. Reason: ${r.reason} | Fix: ${r.fix}`).join("\n")}`;

    case "renewal":
      return `CONTEXT: User asked about scholarship renewal
WARNING: Scholarships do NOT auto-renew — must apply manually every year
PROCESS:
${KB.renewal.process.map((s, i) => `  ${i + 1}. ${s}`).join("\n")}
CONDITIONS:
${KB.renewal.conditions.map((c, i) => `  ${i + 1}. ${c}`).join("\n")}
TIPS:
${KB.renewal.tips.map((t, i) => `  ${i + 1}. ${t}`).join("\n")}`;

    case "renewal_tips":
      return `CONTEXT: User wants renewal tips
TIPS:
${KB.renewal.tips.map((t, i) => `  ${i + 1}. ${t}`).join("\n")}
COMMON_MISTAKES:
  1. Applying on wrong portal (must use same portal as original)
  2. Submitting expired income certificate
  3. Not checking attendance eligibility before applying
  4. Not following up with college for portal verification`;

    case "aadhaar_mismatch":
      return `CONTEXT: User has Aadhaar name or DOB mismatch
PROBLEM: Name/DOB on Aadhaar doesn't match school/college certificates
FIX_STEPS:
  1. Visit myaadhaar.uidai.gov.in OR nearest Aadhaar Seva Kendra
  2. Carry original proof: school TC / PAN card / birth certificate
  3. Submit online correction or in-person at Kendra
  4. Processing takes 5–10 working days
  5. Download updated Aadhaar e-copy
  6. Re-verify documents match before applying
IMPORTANT: Aadhaar name must exactly match community cert, income cert, and college records`;

    case "bank_link":
      return `CONTEXT: User asked about bank account linking for scholarship
CLARIFICATION: "Aadhaar linked" and "DBT enabled" are NOT the same
STEPS_TO_ACTIVATE_DBT:
  1. Visit bank branch with Aadhaar card + photocopy
  2. Fill Aadhaar seeding form
  3. Specifically ask for "NPCI DBT activation"
  4. Confirm mobile number is linked to the account
  5. Get SMS or written confirmation
  6. Wait 3–7 working days
  7. Verify at npci.org.in/npci/aadhaar-mapper
BEST_BANKS: Any nationalised or scheduled commercial bank works`;

    case "income_expired":
      return `CONTEXT: User asked how to identify an expired income certificate
DEFINITION: Expired = issued in a previous financial year (before April 1 of current year)
FINANCIAL_YEAR: April 1 to March 31
HOW_TO_CHECK:
  1. Look at "Date of Issue" on the certificate
  2. If issued before April 1 of current year → EXPIRED
  3. Example: Applying August 2025 → certificate must be issued after April 1 2025
WHAT_TO_DO:
  1. Visit Tahsildar office with Aadhaar + ration card + parent details
  2. Apply for fresh current year income certificate
  3. Usually ready in 7–15 working days
  4. Re-upload fresh certificate before submitting scholarship application
WARNING: Expired income certificate = instant rejection`;

    case "income_cert":
      return `CONTEXT: User asked about income certificate
REQUIREMENTS:
  - Must be current financial year (issued within last 12 months)
  - Issued by Tahsildar / Revenue Department
  - Must show total annual family income (all earning members)
  - Must be in parent's or guardian's name
INCOME_LIMITS:
  - SC/ST Post Matric  → ₹2.5 lakh/year
  - BC/MBC Post Matric → ₹2.0 lakh/year
  - PM-YASASVI         → ₹2.5 lakh/year
  - Merit-cum-Means    → ₹2.5 lakh/year
  - CSS                → ₹8.0 lakh/year
HOW_TO_GET:
  1. Visit Tahsildar office
  2. Carry: Aadhaar, ration card, bank passbook, parent employment details
  3. Fill application form for income certificate
  4. Usually issued in 7–15 working days`;

    case "community_cert":
      return `CONTEXT: User asked about community certificate
REQUIREMENTS:
  - Issued by Tahsildar / Revenue Department
  - Must be in student's name (not parent's name)
  - Must state exact sub-community
  - Must carry official seal and signature of Tahsildar
WHICH_CERT_FOR_WHICH:
  - SC → SC community certificate
  - ST → ST community certificate
  - BC/MBC → BC or MBC cert mentioning sub-caste
  - OBC/EBC → OBC certificate for NSP
  - Minority → Religion certificate
HOW_TO_GET:
  1. Visit Tahsildar office
  2. Carry parent's original community cert + Aadhaar + school TC
  3. Apply specifically in student's name
  4. Issued in 7–10 working days`;

    case "deadline":
      return `CONTEXT: User asked about scholarship deadlines
DEADLINES_2024_25:
  SC/ST Post Matric    (UMIS) → August – October
  BC/MBC Post Matric   (UMIS) → August – October
  PM-YASASVI           (NSP)  → September – November
  Merit-cum-Means      (NSP)  → September – October
  CSS                  (NSP)  → October – November
  CM Special           (UMIS) → August – September
  Begum Hazrat Mahal   (MAEF) → September – October
WARNING: Exact dates change every year — check official portals
PORTALS: scholarships.gov.in (NSP) | umis.tn.gov.in (UMIS) | maef.nic.in (MAEF)
TIP: Apply in the first 2 weeks of window opening — portals slow down near deadline`;

    case "scholarship_list":
      return `CONTEXT: User asked to list all available scholarships
SCHOLARSHIPS:
${KB.scholarships.map((s, i) =>
  `  ${i + 1}. ${s.name}
      For: ${s.short}
      Community: ${s.community.join("/").toUpperCase()}
      Income: ≤ ₹${(s.income / 100000).toFixed(1)} lakh/year
      Amount: ${s.amount}
      Level: ${s.level.join(", ").toUpperCase()}
      Portal: ${s.portal} (${s.portal_url})
      Deadline: ${s.deadline}`
).join("\n")}`;

    case "amount":
      return `CONTEXT: User asked about scholarship amounts
AMOUNTS:
${KB.scholarships.map(s => `  - ${s.name}: ${s.amount}${s.maintenance ? ` | Maintenance: ${s.maintenance}` : ""}`).join("\n")}
NOTE: Actual amount depends on course type and hostel/day scholar status
WARNING: Payment only goes to DBT-enabled, NPCI-mapped bank accounts`;

    case "status":
      return `CONTEXT: User asked how to check scholarship status
FOR_NSP (scholarships.gov.in):
  1. Login with Application ID
  2. Click "Track Application Status"
FOR_UMIS (umis.tn.gov.in):
  1. Login with credentials
  2. Check dashboard for current status
STATUS_MEANINGS:
  - Submitted: Waiting for college verification
  - Institute Verified: College approved
  - District Verified: Forwarded to district office
  - Sanctioned: Payment approved
  - Disbursed: Money sent to bank
  - Rejected: Check reason under rejection details
IF_DISBURSED_BUT_NOT_RECEIVED: Check DBT at npci.org.in/npci/aadhaar-mapper`;

    case "readiness":
      return `CONTEXT: User wants to check if they are ready to apply
CHECKLIST:
  1. Aadhaar name and DOB matches all documents
  2. Bank account is Aadhaar-seeded AND NPCI DBT-enabled
  3. Mobile number linked to both Aadhaar and bank account
  4. Community certificate is valid, in student's name, with official seal
  5. Income certificate is current financial year (not expired)
  6. 10th marksheet and pass certificate available
  7. 12th marksheet and pass certificate available (for UG applicants)
  8. College bonafide certificate or fee receipt for current year
APPLY_ONLY_AFTER: All 8 items confirmed`;

    case "help":
      return `CONTEXT: User asked what the assistant can help with
CAPABILITIES:
  - Check scholarship eligibility (SC/ST/BC/MBC/OBC/Minority/General)
  - List all available government scholarships
  - Explain DBT activation and troubleshooting
  - Document checklist
  - Step-by-step application guide for NSP and UMIS
  - Rejection reasons and fixes
  - Renewal guidance
  - Aadhaar correction guidance
  - Income certificate and community certificate help
EXAMPLE_QUESTIONS:
  - "I am MBC, income 84000, UG — eligible?"
  - "Why was my scholarship rejected?"
  - "How to activate DBT?"
  - "How to identify expired income certificate?"
  - "What documents do I need?"`;

    default:
      return null;
  }
}



// ── 8. RAW RESPONSE FALLBACK ──────────────────────────────────────────────────

function buildFallbackResponse(intent, slots) {
  switch (intent) {

    case "greeting":
      return `👋 Vanakkam! Welcome to Virtual Assistant.

I can help you with:
• Scholarship eligibility check
• Documents needed
• DBT bank account setup
• How to apply on NSP & UMIS
• Rejection reasons & fixes
• Renewal guidance

Try asking: "I am MBC, income 84000, UG — am I eligible?"`;

    case "bot_identity":
      return `🤖 I'm Virtual Assistant — a scholarship guidance chatbot for Tamil Nadu students.

I was built to help you navigate government scholarship schemes like NSP and UMIS.

I can help with:
• Checking which scholarships you qualify for
• Document checklist & scanning tips
• DBT bank account setup
• Step-by-step application guidance
• Rejection reasons and how to fix them
• Renewal process

I run 100% locally in your browser — no personal data is collected.

Type "help" to see everything I can do! 😊`;

    case "how_it_works":
      return `⚙️ How SGP AI works:

I'm a rule-based AI engine (sgpBrain.js) that runs entirely in your browser — no internet connection needed for core answers.

Here's the flow:
1. You type a question
2. I identify your intent (eligibility / documents / DBT / etc.)
3. I extract slots (community, income, level) from your message
4. I match against a verified scholarship knowledge base
5. I return a precise, fact-checked answer

🔒 No data leaves your device
📚 All scholarship facts are pre-verified from official sources (NSP, UMIS, TN Government)
🚫 I cannot answer general knowledge questions — only scholarship topics

Ask me: "I am OBC, income 1.5 lakh, engineering — eligible?"`;

    case "off_topic":
      return `🎓 I'm a scholarship-only assistant — I can't help with that topic.

I'm specifically designed to guide Tamil Nadu students through government scholarship schemes.

I can help you with:
• Eligibility check (tell me your community + income + level)
• Required documents
• DBT bank setup
• NSP / UMIS portal guidance
• Rejection fixes
• Renewal process

Type "help" to see all topics I cover! 😊`;

    case "dbt_what":
      return `💳 DBT (Direct Benefit Transfer) is the Government of India's system to send scholarship money directly to your bank account — no middlemen.

✅ Required for all scholarships on NSP and UMIS
✅ Needs Aadhaar to be NPCI-mapped in your bank

⚠️ Just "linking" Aadhaar is NOT enough — you need full NPCI DBT activation.`;

    case "dbt_activate":
      return `🏦 Steps to activate DBT:

${KB.dbt.steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}

📌 Takes 3–7 working days.
🔍 Verify: npci.org.in/npci/aadhaar-mapper`;

    case "dbt_check":
      return `🔍 Check DBT Status:

1. Visit: npci.org.in/npci/aadhaar-mapper
2. Enter your Aadhaar number
3. Bank shown = DBT active ✅

Or ask your bank: "Is my NPCI DBT activated?"`;

    case "dbt_difference":
      return `🔍 Three levels of Aadhaar-bank connection:

🔴 Linked — ${KB.dbt.difference.linked}
🟡 Seeded — ${KB.dbt.difference.seeded}
🟢 DBT Enabled — ${KB.dbt.difference.dbt}

Only 🟢 DBT Enabled allows scholarship payment!`;

    case "dbt_issues":
      return `⚠️ Common DBT Issues:

${KB.dbt.common_issues.map((c, i) => `${i + 1}. ${c}`).join("\n")}

Fix: Visit bank branch with Aadhaar and request NPCI DBT re-activation.`;

    case "eligibility": {
      const { community, income, level, disabled } = slots || {};

      if (disabled) {
        const s = KB.scholarships.find(x => x.id === "tn_blind");
        return `♿ Scholarship for Differently Abled Students (TN):

Amount  : ${s.amount}
Portal  : ${s.portal_url}
Deadline: ${s.deadline}

Steps:
${s.steps.map((st, i) => `${i + 1}. ${st}`).join("\n")}

Also check community-based schemes if you belong to SC/ST/BC/OBC.`;
      }

      if (!community && !income && !level) {
        return `📋 To check eligibility, tell me:

1. Community — SC / ST / BC / MBC / OBC / Minority
2. Annual family income — e.g. "84000" or "2 lakh"
3. Course level — UG / PG / Diploma / ITI

Example: "I am MBC, income 84000, UG"`;
      }

      const matched = KB.scholarships.filter(s => {
        const commMatch = s.community.includes("all") || (community && s.community.includes(community));
        const incomeMatch = !income || income <= s.income;
        const levelMatch  = !level  || s.level.includes(level);
        return commMatch && incomeMatch && levelMatch;
      });

      const understood = [];
      if (community) understood.push(`Community: ${community.toUpperCase()}`);
      if (income)    understood.push(`Income: ₹${income.toLocaleString("en-IN")}`);
      if (level)     understood.push(`Level: ${level.toUpperCase()}`);

      if (matched.length === 0) {
        return `🔍 Checked: ${understood.join(" | ")}

😔 No matching scholarship found.

Possible reasons:
• Income may exceed the limit for your community
• Education level not covered by any scheme
• Community category needs verification

Please re-check details or visit the portal.`;
      }

      return `🔍 Checked: ${understood.join(" | ")}

✅ You may be eligible for ${matched.length} scholarship(s):

${matched.map(s =>
`🎓 ${s.name}
   ${s.short}
   Amount  : ${s.amount}
   Portal  : ${s.portal_url}
   Deadline: ${s.deadline}
   Step 1  : ${s.steps ? s.steps[0] : "Register on portal"}
   Tip     : ${s.tips ? s.tips[0] : "Apply early and ensure DBT is active"}`
).join("\n\n")}

⚠️ Verify exact rules on the official portal before applying.`;
    }

    case "documents":
      return `📁 Required Documents:

Mandatory:
${KB.documents.mandatory.map((d, i) => `${i + 1}. ${d}`).join("\n")}

Optional:
${KB.documents.optional.map((d, i) => `${i + 1}. ${d}`).join("\n")}

⚠️ All must be clear, legible, and match your Aadhaar name/DOB exactly.`;

    case "scan_tips":
      return `📸 Document Scan Tips:

${KB.documents.scan_tips.map((t, i) => `${i + 1}. ${t}`).join("\n")}

Formats: PDF or JPG | Size: 50 KB – 500 KB`;

    case "apply":
      return `📝 How the Scholarship Process Works:

**Step 1 — Check Eligibility**
Know your community (SC/ST/BC/MBC/OBC), annual family income, and course level (UG/PG/Diploma).

**Step 2 — Prepare Documents**
Gather: Aadhaar, bank passbook, community cert, income cert, marksheets, bonafide certificate.

**Step 3 — Activate DBT**
Visit your bank and request NPCI DBT activation — required for payment.

**Step 4 — Choose the Right Portal**
→ SC/ST/BC/MBC (Tamil Nadu) → umis.tn.gov.in
→ OBC/EBC/Minority/Central → scholarships.gov.in
→ Minority girl students → maef.nic.in

**Step 5 — Register & Apply**
Register with Aadhaar-linked mobile, fill the form, upload documents.

**Step 6 — Submit & Track**
Submit and note your Acknowledgement Number. Track status by logging in.

**Step 7 — College Verification**
Your college must verify and forward the application on the portal.

⚠️ Application is INCOMPLETE until college verifies!

💡 Tip: Apply in the first 2 weeks — portals open August–September every year.`;

    case "portal_nsp":
      return `🏛️ NSP — National Scholarship Portal

🌐 scholarships.gov.in
📋 Schemes: ${KB.portals.nsp.schemes.join(", ")}
📅 Deadline: September – November

1. Go to scholarships.gov.in
2. New Registration or Login
3. Select scheme, fill form, upload docs
4. Submit → get Application ID`;

    case "portal_umis":
      return `🗺️ UMIS — Tamil Nadu Portal

🌐 umis.tn.gov.in
📋 Schemes: ${KB.portals.umis.schemes.join(", ")}
📅 Deadline: August – October

1. Go to umis.tn.gov.in
2. Register with Aadhaar-linked mobile
3. Select scholarship, fill form, upload docs
4. Submit via college`;

    case "rejection":
      return `⚠️ Common Rejection Reasons & Fixes:

${KB.rejection_reasons.map((r, i) => `${i + 1}. ${r.reason}\n   Fix: ${r.fix}`).join("\n\n")}`;

    case "renewal":
      return `🔄 Renewal — Apply every year manually!

Process:
${KB.renewal.process.map((s, i) => `${i + 1}. ${s}`).join("\n")}

Conditions:
${KB.renewal.conditions.map(c => `✅ ${c}`).join("\n")}`;

    case "renewal_tips":
      return `💡 Renewal Tips:

${KB.renewal.tips.map((t, i) => `${i + 1}. ${t}`).join("\n")}

Common mistakes:
1. Wrong portal (use original portal)
2. Expired income certificate uploaded
3. Low attendance — must be 75%+
4. Not following up with college for verification`;

    case "aadhaar_mismatch":
      return `✏️ Aadhaar Mismatch Fix:

1. Visit myaadhaar.uidai.gov.in or Aadhaar Seva Kendra
2. Carry: school TC / PAN / birth certificate
3. Submit correction request
4. Wait 5–10 working days
5. Download updated Aadhaar
6. Re-check all documents match

⚠️ Name must match community cert, income cert, and college records.`;

    case "bank_link":
      return `🏦 Bank DBT Setup:

1. Visit bank branch with Aadhaar + photocopy
2. Fill Aadhaar seeding form
3. Ask for "NPCI DBT activation" specifically
4. Link your mobile number
5. Get SMS confirmation
6. Wait 3–7 days
7. Verify: npci.org.in/npci/aadhaar-mapper`;

    case "income_expired":
      return `📄 Identifying an Expired Income Certificate:

Expired = issued before April 1 of current year

How to check:
1. Look at "Date of Issue" on certificate
2. If before April 1, current year → EXPIRED

Example: Applying August 2025 → must be issued after April 1, 2025

How to get fresh:
1. Visit Tahsildar office
2. Carry Aadhaar + ration card + parent details
3. Apply for current year certificate
4. Ready in 7–15 working days

⚠️ Expired cert = instant rejection!`;

    case "income_cert":
      return `📄 Income Certificate Requirements:

✅ Current financial year (within 12 months)
✅ From Tahsildar / Revenue Department
✅ Shows total annual family income
✅ In parent's or guardian's name

Income limits:
• SC/ST Post Matric  → ₹2.5 lakh
• BC/MBC Post Matric → ₹2.0 lakh
• CSS                → ₹8.0 lakh

How to get: Visit Tahsildar with Aadhaar + ration card. Ready in 7–15 days.`;

    case "community_cert":
      return `📜 Community Certificate Requirements:

✅ From Tahsildar / Revenue Department
✅ In student's name (not parent's)
✅ Shows exact sub-caste
✅ Has official seal + signature

Which cert:
• SC → SC cert | ST → ST cert
• BC/MBC → BC or MBC cert (mention sub-caste)
• OBC → OBC cert (for NSP)
• Minority → Religion certificate

How to get: Tahsildar office with Aadhaar + parent's cert. Ready in 7–10 days.`;

    case "deadline":
      return `📅 Scholarship Closing Dates / Deadlines 2024-25:

SC/ST Post Matric    (UMIS) → Aug – Oct
BC/MBC Post Matric   (UMIS) → Aug – Oct
CM Special Scholarship(UMIS)→ Aug – Sep
First Gen Graduate   (UMIS) → Aug – Oct
PM-YASASVI           (NSP)  → Sep – Nov
Merit-cum-Means      (NSP)  → Sep – Oct
CSS                  (NSP)  → Oct – Nov
Begum Hazrat Mahal   (MAEF) → Sep – Oct

⚠️ Exact dates change every year — always verify on official portals:
🌐 scholarships.gov.in (NSP)
🌐 umis.tn.gov.in (UMIS)
🌐 maef.nic.in (MAEF)

💡 Pro tip: Apply in the very first 2 weeks after portal opens — it slows down near deadline!`;

    case "scholarship_list":
      return `🎓 All Available Scholarships:

${KB.scholarships.map((s, i) =>
`${i + 1}. ${s.name}
   For      : ${s.short}
   Community: ${s.community.join("/").toUpperCase()}
   Income   : ≤ ₹${(s.income / 100000).toFixed(1)} lakh/year
   Amount   : ${s.amount}
   Portal   : ${s.portal_url}
   Deadline : ${s.deadline}`
).join("\n\n")}

Tell me your community + income + level for an eligibility check.`;

    case "amount":
      return `💰 Scholarship Amounts:

${KB.scholarships.map(s => `• ${s.name}: ${s.amount}`).join("\n")}

⚠️ Amount varies by course type and hostel/day scholar status.
⚠️ Only DBT-enabled accounts receive payment.`;

    case "status":
      return `🔍 Check Application Status:

NSP: scholarships.gov.in → Login → Track Application
UMIS: umis.tn.gov.in → Login → Dashboard

Status guide:
⏳ Submitted     → Waiting for college
✅ Verified      → College approved
💰 Sanctioned    → Payment approved
✅ Disbursed     → Money sent to bank
❌ Rejected      → Check reason in dashboard

Money not received despite Disbursed?
→ Check DBT at npci.org.in/npci/aadhaar-mapper`;

    case "readiness":
      return `📊 8-Step Readiness Checklist:

✅ 1. Aadhaar name/DOB matches all documents
✅ 2. Bank is NPCI DBT-enabled
✅ 3. Mobile linked to Aadhaar + bank
✅ 4. Community certificate valid, in student's name
✅ 5. Income certificate — current year
✅ 6. 10th marksheet available
✅ 7. 12th marksheet available (UG applicants)
✅ 8. College bonafide / fee receipt ready

Apply only after all 8 are confirmed ✅`;

    case "help":
      return `🤖 I can help you with:

📋 Eligibility check — tell me community + income + level
📁 Document checklist
🏦 DBT & Aadhaar bank setup
📝 How to apply on NSP & UMIS
⚠️ Rejection reasons & fixes
🔄 Renewal guidance
📅 Deadlines & amounts
✏️ Aadhaar mismatch correction
📄 Income / community certificate guide
♿ Disability scholarship info

Examples:
→ "I am MBC, income 84000, UG — eligible?"
→ "How to activate DBT?"
→ "How to identify expired income certificate?"`;

    default:
      return `🤔 I'm not sure about that. Try asking about eligibility, documents, DBT, or type "help" to see what I can do.`;
  }
}


// ── 9. MAIN ENTRY POINT ───────────────────────────────────────────────────────

export async function askSGPBrain(userInput) {
  // Guard against empty / invalid input
  if (!userInput || typeof userInput !== "string" || !userInput.trim()) {
    return {
      intent: "unknown",
      slots: {},
      response: "🤔 Please type your question and I'll be happy to help!",
    };
  }

  try {
    const tokens    = tokenize(userInput);
    const slots     = extractSlots(tokens);
    const intent    = detectIntent(tokens, slots);
    buildFactBlock(intent, slots); // Retain the local fact-selection guard.
    let response = buildFallbackResponse(intent, slots);

    // Final safety net — response must always be a non-empty string
    if (!response || typeof response !== "string" || !response.trim()) {
      response = "🤔 I'm not sure about that. Try asking about eligibility, documents, or DBT. Type \"help\" to see everything I can do.";
    }

    return { intent, slots, response };

  } catch (err) {
    console.error("askSGPBrain error:", err);
    return {
      intent: "unknown",
      slots: {},
      response: "⚠️ Something went wrong on my end. Please try again.",
    };
  }
}
