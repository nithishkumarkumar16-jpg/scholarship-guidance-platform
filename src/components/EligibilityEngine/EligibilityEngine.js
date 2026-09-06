import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import LanguageSelector from "../LanguageSelector/LanguageSelector";
import "./EligibilityEngine.css";

// ============================================
// GOVERNMENT SCHOLARSHIP DATA — NSP / Ministry
// ============================================
const SCHEMES = [
  {
    id: "pms-sc",
    name: "Post-Matric Scholarship for SC Students (PMS-SC)",
    provider: "Ministry of Social Justice & Empowerment",
    portal: "NSP", communities: ["SC"], maxIncome: 250000,
    courses: ["ug", "pg", "diploma", "iti", "phd"],
    amountType: "range", amountMin: 4200, amountMax: 22300,
    amountNote: "₹4,200 – ₹22,300 / year  (maintenance + tuition + fees)",
    icon: "🎓", color: "#2563eb", status: "Open",
    applyUrl: "https://scholarships.gov.in",
  },
  {
    id: "pms-st",
    name: "Post-Matric Scholarship for ST Students (PMS-ST)",
    provider: "Ministry of Tribal Affairs",
    portal: "NSP", communities: ["ST"], maxIncome: 250000,
    courses: ["ug", "pg", "diploma", "iti", "phd"],
    amountType: "range", amountMin: 4200, amountMax: 22300,
    amountNote: "₹4,200 – ₹22,300 / year  (maintenance + tuition + fees)",
    icon: "🏕️", color: "#059669", status: "Open",
    applyUrl: "https://scholarships.gov.in",
  },
  {
    id: "pms-obc",
    name: "Post-Matric Scholarship for OBC Students (PMS-OBC)",
    provider: "Ministry of Social Justice & Empowerment",
    portal: "NSP", communities: ["OBC"], maxIncome: 100000,
    courses: ["ug", "pg", "diploma", "iti"],
    amountType: "range", amountMin: 4200, amountMax: 12000,
    amountNote: "₹4,200 – ₹12,000 / year  (maintenance allowance + fees)",
    icon: "📘", color: "#7c3aed", status: "Open",
    applyUrl: "https://scholarships.gov.in",
  },
  {
    id: "csss",
    name: "PM-USP — Central Sector Scheme of Scholarships (CSSS)",
    provider: "Ministry of Education",
    portal: "NSP", communities: ["SC","ST","OBC","EBC","BC","MBC","GEN"], maxIncome: 450000,
    courses: ["ug", "pg"],
    amountType: "tiered", amountUG: 12000, amountPG: 20000,
    amountNote: "₹12,000 / year (UG)  |  ₹20,000 / year (PG)",
    icon: "🏛️", color: "#0891b2", status: "Open",
    applyUrl: "https://scholarships.gov.in",
  },
  {
    id: "yasasvi",
    name: "PM-YASASVI — OBC / EBC / DNT Post-Matric",
    provider: "Ministry of Social Justice & Empowerment",
    portal: "NSP", communities: ["OBC","EBC","DNC","BC","MBC"], maxIncome: 250000,
    courses: ["ug", "pg", "diploma"],
    amountType: "full", amountMin: 75000, amountMax: 200000,
    amountNote: "Full financial support — tuition + maintenance (top-class colleges)",
    icon: "🏅", color: "#d97706", status: "Open",
    applyUrl: "https://scholarships.gov.in",
  },
  {
    id: "minority-pms",
    name: "Post-Matric Scholarship — Minority Communities",
    provider: "Ministry of Minority Affairs",
    portal: "NSP", communities: ["MIN"], maxIncome: 200000,
    courses: ["ug", "pg", "diploma", "iti", "phd"],
    amountType: "range", amountMin: 3000, amountMax: 12000,
    amountNote: "₹3,000 – ₹12,000 / year  (Class 11 to Ph.D.)",
    icon: "🌙", color: "#db2777", status: "Open",
    applyUrl: "https://scholarships.gov.in",
  },
  {
    id: "pmss",
    name: "PM Scholarship — Wards of Armed Forces (PMSS)",
    provider: "Ministry of Home Affairs / Kendriya Sainik Board",
    portal: "NSP",
    communities: ["SC","ST","OBC","EBC","BC","MBC","GEN","MIN","DNC"],
    maxIncome: 999999999,
    courses: ["ug", "pg", "diploma"],
    amountType: "fixed", amountBoys: 24000, amountGirls: 27000,
    amountNote: "₹2,000 / month (Boys)  |  ₹2,250 / month (Girls)",
    specialCondition: "armed_forces",
    icon: "🪖", color: "#65a30d", status: "Open",
    applyUrl: "https://scholarships.gov.in",
  },
  {
    id: "tn-bc-mbc",
    name: "Tamil Nadu State Post-Matric Scholarship (BC / MBC / DNC)",
    provider: "TN BC, MBC & Minorities Welfare Department",
    portal: "UMIS", communities: ["BC","MBC","DNC"], maxIncome: 200000,
    courses: ["ug", "pg", "diploma", "iti"],
    amountType: "range", amountMin: 6000, amountMax: 15000,
    amountNote: "₹6,000 – ₹15,000 / year  (varies by course & institution)",
    icon: "🗺️", color: "#9333ea", status: "Open",
    applyUrl: "https://umis.tn.gov.in",
  },
];

const MINORITY_LABELS = ["Muslim","Sikh","Christian","Buddhist","Zoroastrian","Jain"];
function normalizeCommunity(raw) {
  const c = raw.toUpperCase().trim();
  if (MINORITY_LABELS.map(x => x.toUpperCase()).includes(c)) return "MIN";
  return c;
}

function checkEligibility(form) {
  const income = parseInt(form.income, 10);
  const community = normalizeCommunity(form.community);
  const course = form.course.toLowerCase().trim();
  const isAF = form.armedForces === "yes";
  return SCHEMES.filter(s => {
    if (s.specialCondition === "armed_forces" && !isAF) return false;
    return s.communities.includes(community) &&
      !isNaN(income) && income <= s.maxIncome &&
      s.courses.includes(course);
  });
}

function getDisplayAmount(scheme, course) {
  if (scheme.amountType === "tiered")
    return course === "pg" ? `₹${scheme.amountPG.toLocaleString("en-IN")}/yr` : `₹${scheme.amountUG.toLocaleString("en-IN")}/yr`;
  if (scheme.amountType === "fixed")  return "₹2,000–₹2,250/mo";
  if (scheme.amountType === "full")   return "Full support";
  return `₹${scheme.amountMin.toLocaleString("en-IN")}–${scheme.amountMax.toLocaleString("en-IN")}/yr`;
}

function getBaseAmount(scheme, course) {
  if (scheme.amountType === "tiered") return course === "pg" ? scheme.amountPG : scheme.amountUG;
  if (scheme.amountType === "fixed")  return scheme.amountBoys;
  if (scheme.amountType === "full")   return scheme.amountMin;
  return Math.round((scheme.amountMin + scheme.amountMax) / 2);
}

const COMMUNITY_OPTIONS = [
  { label: "SC", value: "SC" }, { label: "ST", value: "ST" },
  { label: "BC", value: "BC" }, { label: "MBC", value: "MBC" },
  { label: "DNC/DNT", value: "DNC" }, { label: "OBC", value: "OBC" },
  { label: "EBC", value: "EBC" }, { label: "General", value: "GEN" },
  { label: "Muslim", value: "Muslim" }, { label: "Christian", value: "Christian" },
  { label: "Sikh", value: "Sikh" }, { label: "Buddhist", value: "Buddhist" },
];
const COURSE_OPTIONS = [
  { label: "UG", value: "ug" }, { label: "PG", value: "pg" },
  { label: "Diploma", value: "diploma" }, { label: "ITI", value: "iti" },
  { label: "Ph.D", value: "phd" },
];
const YEAR_OPTIONS = ["1st", "2nd", "3rd", "4th"];

// ============================================
// COMPONENT
// ============================================
function EligibilityEngine() {
  const navigate = useNavigate();
  const [isExiting, setIsExiting] = useState(false);
  const [step, setStep]           = useState("form");
  const [form, setForm]           = useState({ name:"", community:"", income:"", course:"", currentYear:"", armedForces:"no" });
  const [errors, setErrors]       = useState({});
  const [eligible, setEligible]   = useState([]);

  const handleNavigation = (path) => { setIsExiting(true); setTimeout(() => navigate(path), 500); };

  const validate = () => {
    const e = {};
    if (!form.name.trim())   e.name      = "Name is required";
    if (!form.community)     e.community = "Select a community";
    if (!form.income || isNaN(form.income) || parseInt(form.income) < 0) e.income = "Enter valid annual income";
    if (!form.course)        e.course    = "Select a course";
    if (!form.currentYear)   e.currentYear = "Select current year";
    return e;
  };

  const handleCheck = () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setErrors({});
    setEligible(checkEligibility(form));
    setStep("result");
  };

  const handleReset = () => {
    setStep("form");
    setEligible([]);
    setForm({ name:"", community:"", income:"", course:"", currentYear:"", armedForces:"no" });
  };

  const yearsLeft      = { "1st":4, "2nd":3, "3rd":2, "4th":1 };
  const remainingYears = yearsLeft[form.currentYear] || 4;
  const currentYearNum = { "1st":1, "2nd":2, "3rd":3, "4th":4 }[form.currentYear] || 1;

  return (
    <div className={`eligibility-page ${isExiting ? "is-exiting-down" : "is-entering-up"}`}>

      {/* BG */}
      <div className="dashboard-bg-animations">
        <div className="out-shape out-blob blob-1"></div>
        <div className="out-shape out-blob blob-2"></div>
        <div className="out-shape out-ring ring-out-1"></div>
        <div className="out-shape out-ring ring-out-2"></div>
        <div className="out-shape out-ring ring-out-3"></div>
        <div className="out-shape out-cross cross-out-1">+</div>
        <div className="out-shape out-cross cross-out-2">+</div>
        <div className="out-shape out-cross cross-out-3">+</div>
        <div className="out-shape out-triangle tri-out-1"></div>
        <div className="out-shape out-triangle tri-out-2"></div>
        <div className="out-shape out-triangle tri-out-3"></div>
        <div className="out-shape out-text squig-out-1">~</div>
        <div className="out-shape out-text squig-out-2">~</div>
        <div className="out-shape out-text squig-out-3">~</div>
        <div className="out-shape out-dot dot-out-1"></div>
        <div className="out-shape out-dot dot-out-2"></div>
        <div className="out-shape out-dot dot-out-3"></div>
        <div className="out-shape out-dot dot-out-4"></div>
      </div>

      {/* HEADER */}
      <header className="pro-header">
        <div className="header-shape shape-1"></div>
        <div className="header-shape shape-2"></div>
        <div className="header-container">
          <div className="header-brand">
            <div className="brand-icon">🎯</div>
            <div className="brand-text">
              <h1>Eligibility Engine</h1>
              <p>Post Matric Scholarship Matching</p>
            </div>
          </div>
          <div className="header-actions">
            <button className="btn-pro-back" onClick={() => handleNavigation("/dashboard")}> 
              Back To Dashboard
            </button>
            <LanguageSelector />
          </div>
        </div>
      </header>

      <main className="eligibility-container">

        {/* ══════════ FORM ══════════ */}
        {step === "form" && (
          <>
            <div className="section-header">
              <h2>Check Your Eligibility</h2>
              <p>Enter your details to find matching government scholarship schemes.</p>
            </div>

            {/* ── TOP DISCLAIMER BANNER ── */}
            <div className="top-disc-banner">
              <div className="tdb-left">
                <span className="tdb-warn-icon">⚠️</span>
                <div>
                  <p className="tdb-heading">Indicative Tool — Not an Official Portal</p>
                  <p className="tdb-sub">
                    Hundreds of schemes exist across ministries &amp; states.
                    This tool shows only <strong>major Post-Matric schemes</strong> —
                    actual eligibility is confirmed only on <strong>NSP</strong> or <strong>UMIS</strong>.
                  </p>
                </div>
              </div>
              <div className="tdb-chips">
                <span className="tdb-chip chip-orange">📋 Results are estimates</span>
                <span className="tdb-chip chip-blue">🌐 NSP — Central schemes</span>
                <span className="tdb-chip chip-purple">🏛️ UMIS — TN State schemes</span>
              </div>
            </div>

            <div className="elig-form-card glass-panel">

              <div className="elig-field">
                <label>Full Name</label>
                <input type="text" placeholder="e.g. Nithishkumar M" value={form.name}
                  onChange={e => setForm({...form, name:e.target.value})}
                  className={errors.name ? "input-error" : ""} />
                {errors.name && <span className="err-msg">{errors.name}</span>}
              </div>

              <div className="elig-field">
                <label>Community / Category</label>
                <div className="pill-group">
                  {COMMUNITY_OPTIONS.map(c => (
                    <button key={c.value} className={`pill-btn ${form.community===c.value?"pill-active":""}`}
                      onClick={() => setForm({...form, community:c.value})}>{c.label}</button>
                  ))}
                </div>
                {errors.community && <span className="err-msg">{errors.community}</span>}
              </div>

              <div className="elig-field">
                <label>Annual Family Income (₹)</label>
                <input type="number" placeholder="e.g. 150000" value={form.income}
                  onChange={e => setForm({...form, income:e.target.value})}
                  className={errors.income ? "input-error" : ""} />
                <span className="field-hint">
                  SC / ST — up to ₹2.5 Lakh &nbsp;|&nbsp; OBC — up to ₹1 Lakh &nbsp;|&nbsp; Others — up to ₹4.5 Lakh
                </span>
                {errors.income && <span className="err-msg">{errors.income}</span>}
              </div>

              <div className="elig-field">
                <label>Course Level</label>
                <div className="pill-group">
                  {COURSE_OPTIONS.map(c => (
                    <button key={c.value} className={`pill-btn ${form.course===c.value?"pill-active":""}`}
                      onClick={() => setForm({...form, course:c.value})}>{c.label}</button>
                  ))}
                </div>
                {errors.course && <span className="err-msg">{errors.course}</span>}
              </div>

              <div className="elig-field">
                <label>Current Year of Study</label>
                <div className="pill-group">
                  {YEAR_OPTIONS.map(y => (
                    <button key={y} className={`pill-btn ${form.currentYear===y?"pill-active":""}`}
                      onClick={() => setForm({...form, currentYear:y})}>{y} Year</button>
                  ))}
                </div>
                {errors.currentYear && <span className="err-msg">{errors.currentYear}</span>}
              </div>

              <div className="elig-field">
                <label>Ward of Armed Forces / Police / CRPF?</label>
                <div className="pill-group">
                  {["yes","no"].map(v => (
                    <button key={v} className={`pill-btn ${form.armedForces===v?"pill-active":""}`}
                      onClick={() => setForm({...form, armedForces:v})}>{v==="yes"?"Yes":"No"}</button>
                  ))}
                </div>
              </div>

              <button className="btn-massive-primary check-btn" onClick={handleCheck}>
                🔍 Check Eligibility
              </button>
            </div>
          </>
        )}

        {/* ══════════ RESULT ══════════ */}
        {step === "result" && (
          <>
            <div className="section-header">
              <h2>Your Eligibility Results</h2>
              <p>For <strong>{form.name}</strong> — {form.community} | {form.course.toUpperCase()} | ₹{parseInt(form.income).toLocaleString("en-IN")}</p>
            </div>

            {/* Verified strip */}
            <div className="criteria-section glass-panel">
              <div className="section-title">
                <span className="section-icon">✅</span>
                <h3>Verified Information</h3>
              </div>
              <div className="criteria-grid">
                {[["NAME",form.name.toUpperCase()],["COMMUNITY",form.community],
                  ["INCOME",`₹${parseInt(form.income).toLocaleString("en-IN")}`],
                  ["COURSE",form.course.toUpperCase()],["YEAR",form.currentYear]
                ].map(([lbl,val]) => (
                  <div key={lbl} className="criteria-item">
                    <span className="label">{lbl}</span>
                    <span className={`value ${lbl==="INCOME"?"text-green":""}`}>{val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Count / no-match */}
            {eligible.length > 0 ? (
              <div className="match-count-banner">
                <span className="match-icon">🎯</span>
                <span>
                  <strong>{eligible.length} Scheme{eligible.length>1?"s":""} Matched</strong>
                  {" "}— Based on income &amp; community. Final eligibility confirmed only on NSP / UMIS.
                </span>
              </div>
            ) : (
              <div className="pro-warning-banner glass-panel no-eligibility">
                <div className="warning-icon-wrapper"><span>⚠️</span></div>
                <div className="warning-text">
                  <strong>No Matching Schemes Found</strong>
                  <p>Your income or community did not match any scheme in our database. Check directly on NSP or UMIS — they have more schemes.</p>
                </div>
              </div>
            )}

            {/* Scheme cards */}
            <div className="scholarships-section">
              {eligible.map((scheme) => {
                const baseAmt = getBaseAmount(scheme, form.course);
                return (
                  <div key={scheme.id} className="scheme-result-card" style={{ borderLeftColor: scheme.color }}>

                    <div className="src-header" style={{ background: scheme.color + "10" }}>
                      <div className="src-icon" style={{ background: scheme.color + "20", color: scheme.color }}>{scheme.icon}</div>
                      <div className="src-title">
                        <h3>{scheme.name}</h3>
                        <p>{scheme.provider}</p>
                      </div>
                      <div className="src-badges">
                        <span className="badge-portal" style={{ background: scheme.color + "20", color: scheme.color }}>{scheme.portal}</span>
                        <span className="badge-status">✅ {scheme.status}</span>
                      </div>
                    </div>

                    <div className="src-amount-note" style={{ borderLeftColor: scheme.color }}>
                      <span className="amt-label">💰 Amount</span>
                      <span className="amt-value">{scheme.amountNote}</span>
                    </div>

                    <div className="src-body">
                      <div className="breakdown-label">📅 4-Year Estimated Projection</div>
                      <div className="year-breakdown">
                        {[1,2,3,4].map(yn => {
                          const isPast    = yn < currentYearNum;
                          const isCurrent = yn === currentYearNum;
                          return (
                            <div key={yn} className={`year-cell ${isCurrent?"year-current":""} ${isPast?"year-past":""}`}>
                              <div className="year-label">Year {yn}</div>
                              <div className="year-amount">
                                {isPast
                                  ? <span className="past-text">—</span>
                                  : <span style={{ color: isCurrent ? scheme.color : "#1e293b", fontSize:"12px" }}>
                                      {getDisplayAmount(scheme, form.course)}
                                    </span>
                                }
                              </div>
                              {isCurrent && <div className="current-tag" style={{ background: scheme.color }}>Now</div>}
                            </div>
                          );
                        })}
                      </div>

                      <div className="src-summary">
                        {[
                          ["Per Year (est.)",   `₹${baseAmt.toLocaleString("en-IN")}`,               scheme.color],
                          ["Remaining Yrs",     `${remainingYears} yr${remainingYears>1?"s":""}`,     null],
                          ["Remaining (est.)",  `₹${(baseAmt*remainingYears).toLocaleString("en-IN")}`, scheme.color],
                          ["4-Yr Total (est.)", `₹${(baseAmt*4).toLocaleString("en-IN")}`,           scheme.color],
                        ].map(([lbl,val,clr], i, arr) => (
                          <React.Fragment key={lbl}>
                            <div className="summary-item">
                              <span>{lbl}</span>
                              <strong style={clr ? { color: clr } : {}}>{val}</strong>
                            </div>
                            {i < arr.length-1 && <div className="summary-divider"></div>}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>

                    <div className="src-footer">
                      <span className="apply-note">
                        Apply via <strong>{scheme.portal==="NSP"?"scholarships.gov.in":"umis.tn.gov.in"}</strong>
                      </span>
                      <button className="apply-btn" style={{ background: scheme.color }}
                        onClick={() => window.open(scheme.applyUrl,"_blank","noopener,noreferrer")}>
                        Apply on {scheme.portal} →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Result page compact reminder */}
            <div className="result-reminder-strip">
              ⚠️ <strong>Indicative results only.</strong> When you apply on <strong>NSP</strong> or <strong>UMIS</strong>, the portal verifies your documents and shows only schemes you are <em>officially</em> eligible for — which may differ from the above.
            </div>

            <div className="action-buttons">
              <button className="btn-massive-primary" onClick={handleReset}>🔄 Check Again</button>
              <button className="btn-glass-secondary" onClick={() => handleNavigation("/dashboard")}>← Dashboard</button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default EligibilityEngine;


