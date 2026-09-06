import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import LanguageSelector from "../LanguageSelector/LanguageSelector";
import "./DocumentUpload.css";
import { extractDocumentData } from "../LocalAI/sgpDocAI";
import { shouldUseMockCaptcha, buildLocalMockCaptchaToken } from "./captchaConfig";

const I = {
  Shield:   ()=><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3L4 7v5c0 5.25 3.5 10.15 8 11.35C16.5 22.15 20 17.25 20 12V7L12 3z"/><polyline points="9 12 11 14 15 10"/></svg>,
  Clipboard:()=><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 3a1 1 0 0 0-1 1v1h8V4a1 1 0 0 0-1-1H9z"/><line x1="9" y1="10" x2="15" y2="10"/><line x1="9" y1="13" x2="15" y2="13"/></svg>,
  Scroll:   ()=><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 7Q12 5 15 7"/><line x1="9" y1="13" x2="15" y2="13"/></svg>,
  Banknote: ()=><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 9v6M18 9v6"/></svg>,
  IdCard:   ()=><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="3"/><circle cx="8" cy="12" r="2.5"/><line x1="13" y1="10" x2="20" y2="10"/><line x1="13" y1="13" x2="18" y2="13"/></svg>,
  Bank:     ()=><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10L12 3l9 7"/><rect x="4" y="10" width="2" height="8"/><rect x="11" y="10" width="2" height="8"/><rect x="18" y="10" width="2" height="8"/><line x1="2" y1="18" x2="22" y2="18"/></svg>,
  Upload:   ()=><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>,
  Spark:    ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></svg>,
  Spin:     ()=><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{animation:"spin 1s linear infinite"}}><path d="M21 12a9 9 0 1 1-6.22-8.56"/></svg>,
  Check:    ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></svg>,
  Warn:     ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  X:        ()=><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Back:     ()=><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>,
  Next:     ()=><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>,
  Up:       ()=><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>,
  Down:     ()=><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>,
  PDF:      ()=><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="12" y2="17"/></svg>,
  Print:    ()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>,
  Box:      ()=><svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
  Download: ()=><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  Fix:      ()=><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>,
  Link:     ()=><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
  Seed:     ()=><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22V12"/><path d="M5 3l7 9 7-9"/><path d="M3 9c0 4.97 4.03 9 9 9s9-4.03 9-9"/></svg>,
  Target:   ()=><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,
};

const DCFG = {
  ms10:      { label:"10th Marksheet",        Icon:I.Clipboard, desc:"10th board certificate or marksheet",                    color:"green"  },
  ms12:      { label:"12th Marksheet",        Icon:I.Clipboard, desc:"12th board / HSC marksheet or certificate",              color:"purple" },
  community: { label:"Community Certificate", Icon:I.Scroll,    desc:"Govt-issued community / caste certificate",              color:"orange" },
  income:    { label:"Income Certificate",    Icon:I.Banknote,  desc:"Must be within 6 months. Expiry checked automatically.", color:"blue"   },
};

const EF = {
  ms10:      ["name","board","school","year","month","marksScored","maxMarks","marks","percentage","grade"],
  ms12:      ["name","board","school","year","month","marksScored","maxMarks","marks","percentage","grade"],
  community: ["name","fatherName","communityCategory","certNumber","issueDate","validUpto","officeName"],
  income:    ["income","incomeNumber","certNumber","issueDate","validUpto","officeName"],
};

const FL = {
  name:"Name", fatherName:"Father's Name", motherName:"Mother's Name", dob:"Date of Birth",
  address:"Address", board:"Board", school:"School / College", year:"Year", month:"Month",
  marksScored:"Marks Scored", maxMarks:"Max Marks", marks:"Marks (Scored / Max)",
  percentage:"Percentage", grade:"Result / Grade",
  community:"Community", communityCategory:"Category",
  certNumber:"Certificate No.", issueDate:"Issue Date", validUpto:"Valid Upto",
  taluk:"Taluk", district:"District", state:"State",
  issuingAuthority:"Issuing Authority", officeName:"Issuing Office",
  income:"Annual Income", incomeNumber:null,
};

// Configure this at build time. In production, this must be the HTTPS API URL.
const BACKEND = (process.env.REACT_APP_API_URL || "http://localhost:5000").replace(/\/$/, "");
// Enterprise checkbox key is public by design; backend credentials never enter this bundle.
const RECAPTCHA_ENTERPRISE_SITE_KEY = process.env.REACT_APP_RECAPTCHA_ENTERPRISE_SITE_KEY || "";
const SHOULD_USE_MOCK_CAPTCHA = shouldUseMockCaptcha(RECAPTCHA_ENTERPRISE_SITE_KEY, process.env.NODE_ENV);

// ─── Helpers ────────────────────────────────────────────────────────────────
const btnColor = c => ({blue:"#2563eb",green:"#059669",purple:"#7c3aed",orange:"#d97706",red:"#dc2626"}[c]||"#2563eb");
const INR      = n => "Rs." + Number(n).toLocaleString("en-IN");

// ─── reCAPTCHA loader ────────────────────────────────────────────────────────
function loadRecaptcha(){
  return new Promise((res)=>{
    if(window.grecaptcha?.enterprise){res();return;}
    const existing=document.querySelector('script[data-sgp-recaptcha-enterprise]');
    if(existing){
      existing.addEventListener("load",res,{once:true});
      existing.addEventListener("error",res,{once:true});
      return;
    }
    const s=document.createElement("script");
    s.dataset.sgpRecaptchaEnterprise="true";
    s.src="https://www.google.com/recaptcha/enterprise.js?render=explicit";
    s.onload=()=>res();
    s.onerror=()=>res(); // soft fail in dev
    document.head.appendChild(s);
  });
}

// ─── Session token cache (CAPTCHA → backend) ─────────────────────────────────
// sessionCache: { token, expiresAt }
let _sessionCache = null;

async function createSession(captchaToken){
  // Return cached token if still valid (5 min buffer)
  if(_sessionCache && Date.now() < _sessionCache.expiresAt - 5*60*1000){
    return _sessionCache.token;
  }
  if(SHOULD_USE_MOCK_CAPTCHA){
    const mockSessionToken = "local-dev-session-token";
    _sessionCache = { token: mockSessionToken, expiresAt: Date.now() + 15 * 60 * 1000 };
    return mockSessionToken;
  }
  if(!window.grecaptcha?.enterprise || !RECAPTCHA_ENTERPRISE_SITE_KEY) throw new Error("CAPTCHA is not configured.");
  const r = await fetch(`${BACKEND}/api/session/create`,{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({ captchaToken })
  });
  if(!r.ok){
    const e=await r.json().catch(()=>({}));
    throw new Error(e?.error||"Session error HTTP "+r.status);
  }
  const d=await r.json();
  _sessionCache = { token: d.sessionToken, expiresAt: Date.now()+(d.expiresIn*1000) };
  return _sessionCache.token;
}

// ─── Community / Religion normalisers ────────────────────────────────────────
function normaliseCommunity(raw) {
  if (!raw) return "";
  const map = {
    sc:"SC","scheduled caste":"SC","adi dravidar":"SC","adi dravida":"SC",
    st:"ST","scheduled tribe":"ST","tribal":"ST",
    obc:"OBC","other backward class":"OBC","other backward classes":"OBC",
    ebc:"EBC","economically backward class":"EBC",
    bc:"BC","backward class":"BC","backward classes":"BC",
    mbc:"MBC","most backward class":"MBC","most backward classes":"MBC",
    dnc:"DNC","denotified community":"DNC","denotified":"DNC",
    general:"General",gen:"General",ur:"General",unreserved:"General","open category":"General",
  };
  const lower = raw.toLowerCase().trim();
  if (map[lower]) return map[lower];
  const m = raw.match(/\(([^)]+)\)/);
  if (m) {
    const inner = m[1].trim().toUpperCase();
    if (["SC","ST","OBC","EBC","BC","MBC","DNC"].includes(inner)) return inner;
  }
  if (lower.includes("scheduled caste"))  return "SC";
  if (lower.includes("scheduled tribe"))  return "ST";
  if (lower.includes("most backward"))    return "MBC";
  if (lower.includes("backward class"))   return "BC";
  if (lower.includes("other backward"))   return "OBC";
  if (lower.includes("denotified"))       return "DNC";
  return raw.trim();
}

function normaliseReligion(raw) {
  if (!raw) return "";
  const val = raw.toLowerCase().trim();
  if (val.includes("hindu"))    return "Hindu";
  if (val.includes("muslim") || val.includes("islam")) return "Muslim";
  if (val.includes("christian")) return "Christian";
  if (val.includes("sikh"))     return "Sikh";
  if (val.includes("buddhist")) return "Buddhist";
  if (val.includes("jain"))     return "Jain";
  if (val.includes("parsi") || val.includes("zoroastrian")) return "Parsi";
  return raw.trim();
}

// ─── Honorific stripper ───────────────────────────────────────────────────────
const HONORIFIC_RE = new RegExp(
  "^(?:" +
    "thiru|thirumathi|thirumati|tmt\\.?|tirumati|selvan|selvi|km\\.?|kumari|" +
    "mr\\.?|mrs\\.?|ms\\.?|miss|dr\\.?|prof\\.?|shri|sri|smt\\.?|srimati|kum\\.?|" +
    "m\\/s\\.?|messrs\\.?|" +
    "s\\/o|d\\/o|w\\/o|h\\/o|g\\/o" +
  ")\\s*",
  "gi"
);

function stripHonorifics(raw) {
  if (!raw) return "";
  let s = String(raw).trim();
  let prev;
  do { prev = s; s = s.replace(HONORIFIC_RE, "").trim(); } while (s !== prev);
  return s;
}

// ─── Levenshtein distance ─────────────────────────────────────────────────────
function lev(a, b) {
  const m = [];
  for (let i = 0; i <= a.length; i++) m[i] = [i];
  for (let j = 1; j <= b.length; j++) m[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) {
      const c = a[i-1]===b[j-1]?0:1;
      m[i][j] = Math.min(m[i-1][j]+1, m[i][j-1]+1, m[i-1][j-1]+c);
    }
  return m[a.length][b.length];
}

function tokenSort(s) {
  return s.split(/\s+/).filter(Boolean).sort().join(" ");
}

// ─── FIXED nameScore ──────────────────────────────────────────────────────────
// Same tokens in any order (e.g. "Ragul C" vs "C Ragul") correctly returns
// "exact" instead of "minor", so strict pairs (Aadhaar, Community, Bank) no
// longer flag word-order differences as mismatches.
function nameScore(a, b) {
  if (!a || !b) return "missing";
  const prep = s =>
    stripHonorifics(String(s).replace(/[^a-zA-Z0-9\s/]/g, " "))
    .toLowerCase().replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();
  const na = prep(a), nb = prep(b);
  if (!na || !nb) return "missing";
  if (na === nb) return "exact";

  // Same tokens, different word order → exact match
  // e.g. "Ragul C" == "C Ragul"  |  "M Nithishkumar" == "Nithishkumar M"
  if (tokenSort(na) === tokenSort(nb)) return "exact";

  const noInit = s => s.replace(/\b[a-z]\b/g, "").replace(/\s+/g, " ").trim();
  const naI = noInit(na), nbI = noInit(nb);

  // Same full-word tokens after stripping initials, any order → exact
  if (naI && nbI && naI === nbI) return "exact";
  if (naI && nbI && tokenSort(naI) === tokenSort(nbI)) return "exact";

  const tA = na.split(/\s+/).filter(t=>t.length>1);
  const tB = nb.split(/\s+/).filter(t=>t.length>1);
  if (tA.length>0 && tB.length>0) {
    const [sh, lo] = tA.length<=tB.length ? [tA,tB] : [tB,tA];
    if (sh.every(t => lo.some(lt => lt===t || (t.length>=4 && lev(lt,t)<=1)))) return "minor";
  }
  const sim = 1 - lev(na, nb) / Math.max(na.length, nb.length, 1);
  if (sim >= 0.80) return "minor";
  return "different";
}

function nameScoreStrict(a, b) {
  const r = nameScore(a, b);
  return r === "minor" ? "different" : r;
}

// ─── Date helpers ─────────────────────────────────────────────────────────────
function normaliseDobStr(str) {
  const d = parseIndianDate(str);
  if (!d || isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function dobMatch(d1, d2) {
  if (!d1||!d2) return "missing";
  const n1=normaliseDobStr(d1), n2=normaliseDobStr(d2);
  if(!n1||!n2) return "missing";
  return n1===n2?"match":"mismatch";
}
function fmtDob(str) {
  const d=parseIndianDate(str);
  if(!d) return str;
  return `${String(d.getDate()).padStart(2,"0")}-${String(d.getMonth()+1).padStart(2,"0")}-${d.getFullYear()}`;
}

function pairScoreLabel(s) {
  if (s==="exact")     return "✅ Match";
  if (s==="minor")     return "⚠️ Minor Diff";
  if (s==="different") return "❌ Mismatch";
  return "— N/A";
}


function parseIndianDate(str){
  if(!str||str==="null"||str==="Not mentioned"||str==="Unknown"||str==="N/A") return null;
  const s=String(str).trim();
  const m1=s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if(m1) return new Date(parseInt(m1[3]),parseInt(m1[2])-1,parseInt(m1[1]));
  const m2=s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if(m2) return new Date(parseInt(m2[1]),parseInt(m2[2])-1,parseInt(m2[3]));
  const d=new Date(str);
  return isNaN(d.getTime())?null:d;
}

function monthsAgo(dateStr){
  const d=parseIndianDate(dateStr);
  if(!d) return null;
  return (Date.now()-d.getTime())/(864e5*30);
}

function isDateExpired(dateStr){
  const d=parseIndianDate(dateStr);
  if(!d) return null;
  return d.getTime()<Date.now();
}

function computeIncomeExpiry(iD){
  if(!iD) return { status:"unknown", label:"—", detail:"No income certificate uploaded", color:"grey" };
  const validUpto = iD.validUpto && iD.validUpto!=="null" ? iD.validUpto : null;
  const issueDate = iD.issueDate && iD.issueDate!=="null" ? iD.issueDate : null;
  const aiStatus  = String(iD.expiryStatus||"").toLowerCase().trim();
  if(validUpto){
    const d=parseIndianDate(validUpto);
    if(d){
      const now=new Date();
      if(d<now){ const mAgo=(now-d)/(864e5*30); return{status:"expired",label:"Expired",detail:`Expired on ${validUpto} (${Math.round(mAgo)} month(s) ago) — obtain fresh certificate`,color:"red"}; }
      const mLeft=(d-now)/(864e5*30);
      return{status:mLeft<1?"warning":"valid",label:mLeft<1?"Expires very soon":mLeft<3?"Valid (expiring soon)":"Valid",detail:`Valid upto ${validUpto} — ${Math.round(mLeft)} month(s) remaining`,color:mLeft<1?"yellow":"green"};
    }
  }
  if(aiStatus==="expired") return{status:"expired",label:"Expired",detail:issueDate?`AI detected Expired. Issue date: ${issueDate}`:"AI detected Expired — obtain fresh certificate",color:"red"};
  if(aiStatus==="valid"&&issueDate){
    const age=monthsAgo(issueDate);
    if(age!==null&&age>6) return{status:"warning",label:"Ageing",detail:`Issued ${Math.round(age)} months ago — NSP prefers within 6 months`,color:"yellow"};
    return{status:"valid",label:"Valid",detail:issueDate?`Issued ${issueDate}${age!==null?" ("+Math.round(age)+"m ago)":""}` :"Marked valid",color:"green"};
  }
  if(issueDate){
    const age=monthsAgo(issueDate);
    if(age===null) return{status:"unknown",label:"Unknown",detail:`Issue date ${issueDate} found but could not parse`,color:"grey"};
    if(age<=6)  return{status:"valid",  label:"Valid",   detail:`Issued ${Math.round(age)} month(s) ago — Fresh`,color:"green"};
    if(age<=12) return{status:"warning",label:"Ageing",  detail:`Issued ${Math.round(age)} months ago — NSP prefers within 6 months`,color:"yellow"};
    return{status:"expired",label:"Outdated",detail:`Issued ${Math.round(age)} months ago — Too old (>12 months), obtain fresh certificate`,color:"red"};
  }
  return{status:"unknown",label:"Unknown",detail:"No issue/expiry date found — verify manually",color:"grey"};
}


// ─── SVG Icons for Verification Report ──────────────────────────────────────
const DocIco  = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="3" width="14" height="18" rx="2"/><line x1="9" y1="10" x2="15" y2="10"/><line x1="9" y1="13" x2="15" y2="13"/></svg>;
const CommIco = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 7Q12 5 15 7"/><line x1="9" y1="13" x2="15" y2="13"/></svg>;
const IncIco  = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 9v6M18 9v6"/></svg>;
const AadIco  = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="3"/><circle cx="8" cy="12" r="2.5"/><line x1="13" y1="10" x2="20" y2="10"/><line x1="13" y1="13" x2="18" y2="13"/></svg>;
const BankIco = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10L12 3l9 7"/><rect x="4" y="10" width="2" height="8"/><rect x="11" y="10" width="2" height="8"/><rect x="18" y="10" width="2" height="8"/><line x1="2" y1="18" x2="22" y2="18"/></svg>;
const NameIco = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const CalIco  = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;

function getScoreBadgeInlineStyle(s) {
  if (s === "exact") return { background: "#f0fdf4", color: "#059669", border: "1px solid #6ee7b7" };
  if (s === "minor") return { background: "#fffbeb", color: "#d97706", border: "1px solid #fde68a" };
  if (s === "different") return { background: "#fef2f2", color: "#dc2626", border: "1px solid #fca5a5" };
  return { background: "#f8fafc", color: "#94a3b8", border: "1px solid #e2e8f0" };
}

// ─── Pure React JSX Verification Report (Zero dangerouslySetInnerHTML) ─────
function VerificationReport({ data }) {
  if (!data) return null;
  const {
    aadharName, aadharDob, aadDob, bankHolder, bankAccType, bankSingle,
    cD, iD, m10, m12,
    comm, relig, isGen,
    dash, totalFail, totalWarn,
    nameMatchSt, dobSt, m10St, m12St, commSt, incSt, bankSt, aadSt,
    allNameSources, pairResults, hasNameMinor, mismatchPairs,
    activeDob, hasDobMismatch,
    incNum, incExpiry
  } = data;

  const statusLabel = st => st === "green" ? "Valid" : st === "yellow" ? "Needs Check" : st === "red" ? "Issue Found" : "Pending";
  const failLabels = dash.filter(d => d.col === "red").map(d => d.label);
  const warnLabels = dash.filter(d => d.col === "yellow").map(d => d.label);
  const vcls = totalFail === 0 && totalWarn === 0 ? "verdict-ok" : totalFail === 0 ? "verdict-warn" : "verdict-fix";

  const renderHdr = (num, icon, title, sub, st) => (
    <div className={`res-sec-hdr res-sec-${st}`}>
      <div className="res-sec-num">{num}</div>
      <div>{icon}</div>
      <div className="res-sec-text">
        <div className="res-sec-title">{title}</div>
        <div className="res-sec-sub">{sub}</div>
      </div>
      <div className={`res-sec-badge res-badge-${st}`}>{statusLabel(st)}</div>
    </div>
  );

  const renderChk = (st, title, detail) => (
    <div className={`chk-row2 ${st}`}>
      <div className="chk2-icon">
        {st === "pass" ? "✓" : st === "fail" ? "✗" : st === "warn" ? "⚠" : "—"}
      </div>
      <div>
        <div className="chk2-title">{title}</div>
        {detail ? <div className="chk2-detail">{detail}</div> : null}
      </div>
    </div>
  );

  return (
    <div>
      {/* 2-Col entered details summary */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "18px" }}>
        <div style={{ background: "linear-gradient(135deg,rgba(37,99,235,0.06),rgba(59,130,246,0.04))", border: "1.5px solid #bfdbfe", borderRadius: "10px", padding: "12px 16px" }}>
          <div style={{ fontSize: "10px", fontWeight: 900, color: "#1d4ed8", textTransform: "uppercase", marginBottom: "6px", display: "flex", alignItems: "center", gap: "5px" }}>
            <AadIco /> Aadhaar Details (Entered)
          </div>
          <div style={{ fontSize: "13px", fontWeight: 800, color: "#0f172a" }}>{aadharName || "—"}</div>
          <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>DOB: {aadharDob || "—"}</div>
        </div>
        <div style={{ background: "linear-gradient(135deg,rgba(5,150,105,0.06),rgba(16,185,129,0.04))", border: "1.5px solid #6ee7b7", borderRadius: "10px", padding: "12px 16px" }}>
          <div style={{ fontSize: "10px", fontWeight: 900, color: "#065f46", textTransform: "uppercase", marginBottom: "6px", display: "flex", alignItems: "center", gap: "5px" }}>
            <BankIco /> Bank Details (Entered)
          </div>
          <div style={{ fontSize: "13px", fontWeight: 800, color: "#0f172a" }}>{bankHolder || "—"}</div>
          <div style={{ fontSize: "11px", marginTop: "2px" }}>
            <span style={{ padding: "2px 8px", borderRadius: "6px", fontWeight: 800, fontSize: "11px", background: bankSingle ? "#f0fdf4" : "#fef2f2", color: bankSingle ? "#059669" : "#dc2626", border: `1px solid ${bankSingle ? "#6ee7b7" : "#fca5a5"}` }}>
              {bankAccType || "—"} Account
            </span>
          </div>
        </div>
      </div>

      {/* Community / Religion pill banner */}
      {cD && (cD.communityCategory || cD.religion) && (
        <div style={{ background: isGen ? "#fffbeb" : "#f0fdf4", border: `1.5px solid ${isGen ? "#fde68a" : "#6ee7b7"}`, borderRadius: "10px", padding: "12px 16px", marginBottom: "14px", fontSize: "12px", display: "flex", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <span style={{ fontSize: "10px", fontWeight: 900, color: isGen ? "#b45309" : "#065f46", textTransform: "uppercase" }}>Community (Normalised)</span>
            <div style={{ fontSize: "14px", fontWeight: 800, color: "#0f172a", marginTop: "2px" }}>
              {comm} <span style={{ fontSize: "11px", color: "#94a3b8" }}>({cD.communityCategory || ""})</span>
            </div>
            {isGen && <div style={{ fontSize: "11px", color: "#b45309", marginTop: "3px" }}>⚠️ General category is usually not eligible for NSP reserved scholarships.</div>}
          </div>
          {relig ? (
            <div>
              <span style={{ fontSize: "10px", fontWeight: 900, color: "#065f46", textTransform: "uppercase" }}>Religion</span>
              <div style={{ fontSize: "14px", fontWeight: 800, color: "#0f172a", marginTop: "2px" }}>{relig}</div>
            </div>
          ) : null}
        </div>
      )}

      {/* Document Readiness Dashboard */}
      <div className="res-dashboard-label">Document Readiness Dashboard</div>
      <div className="res-dash-grid" style={{ gridTemplateColumns: "repeat(7,1fr)" }}>
        {dash.map((d, idx) => (
          <div key={idx} className={`res-dash-box dash-${d.col}`}>
            <div>{d.ico}</div>
            <div className="res-dash-label2">{d.label}</div>
            <div className="res-dash-status">{statusLabel(d.col)}</div>
          </div>
        ))}
      </div>

      {/* Section 1: Name Cross-Check */}
      {renderHdr("1", <NameIco />, "Name Cross-Check (All Documents)", "Every document's name compared against every other document. No single reference — all must be consistent.", nameMatchSt)}
      <div className="res-grp-card">
        {allNameSources.length === 0 ? (
          <div style={{ color: "#94a3b8", textAlign: "center", padding: "18px", fontSize: "12px" }}>
            No names found yet — upload documents and enter Aadhaar / bank details in Step 2
          </div>
        ) : allNameSources.length === 1 ? (
          <div style={{ color: "#94a3b8", textAlign: "center", padding: "18px", fontSize: "12px" }}>
            Only one name available ({allNameSources[0].doc}) — need at least 2 documents to compare
          </div>
        ) : (
          <>
            <div style={{ marginBottom: "12px" }}>
              <div style={{ fontSize: "10px", fontWeight: 900, color: "#64748b", textTransform: "uppercase", marginBottom: "6px" }}>Names Found Across Documents</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {allNameSources.map((src, i) => {
                  const stripped = stripHonorifics(src.val);
                  return (
                    <div key={i} style={{ background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: "8px", padding: "8px 12px", minWidth: "160px", flex: 1 }}>
                      <div style={{ fontSize: "10px", fontWeight: 900, color: "#64748b", marginBottom: "3px", display: "flex", alignItems: "center", gap: "5px" }}>
                        <span>{src.ico}</span> {src.doc}
                      </div>
                      <div style={{ fontSize: "13px", fontWeight: 800, color: "#0f172a" }}>{src.val}</div>
                      {stripped !== src.val && (
                        <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "2px", fontStyle: "italic" }}>
                          → compared as: <strong>{stripped}</strong>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ fontSize: "10px", fontWeight: 900, color: "#64748b", textTransform: "uppercase", marginBottom: "6px" }}>
              Pair-by-Pair Comparison ({pairResults.length} pair{pairResults.length !== 1 ? "s" : ""})
            </div>
            <div style={{ border: "1.5px solid #e2e8f0", borderRadius: "8px", overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto auto", background: "#f8fafc", padding: "8px 14px", fontSize: "10px", fontWeight: 900, color: "#64748b", textTransform: "uppercase", gap: "8px", borderBottom: "1px solid #e2e8f0" }}>
                <div>Document A</div><div>Document B</div><div>Rule</div><div>Result</div>
              </div>
              {pairResults.map((pr, i) => {
                const bg = i % 2 === 0 ? "#fff" : "#fafafa";
                const strA = stripHonorifics(pr.a.val);
                const strB = stripHonorifics(pr.b.val);
                return (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto auto", padding: "10px 14px", background: bg, borderTop: "1px solid #f1f5f9", gap: "8px", alignItems: "start" }}>
                    <div>
                      <div style={{ fontSize: "11px", fontWeight: 700, color: "#475569" }}>{pr.a.ico} {pr.a.doc}</div>
                      <div style={{ fontSize: "12px", fontWeight: 800, color: "#0f172a", marginTop: "2px" }}>{pr.a.val}</div>
                      {strA !== pr.a.val && <div style={{ fontSize: "10px", color: "#94a3b8", fontStyle: "italic" }}>→ {strA}</div>}
                    </div>
                    <div>
                      <div style={{ fontSize: "11px", fontWeight: 700, color: "#475569" }}>{pr.b.ico} {pr.b.doc}</div>
                      <div style={{ fontSize: "12px", fontWeight: 800, color: "#0f172a", marginTop: "2px" }}>{pr.b.val}</div>
                      {strB !== pr.b.val && <div style={{ fontSize: "10px", color: "#94a3b8", fontStyle: "italic" }}>→ {strB}</div>}
                      {pr.sc === "different" && (
                        <div style={{ fontSize: "10px", color: "#dc2626", marginTop: "4px" }}>⚠ Names do not match — one document must be corrected</div>
                      )}
                      {pr.sc === "minor" && (
                        <div style={{ fontSize: "10px", color: "#d97706", marginTop: "4px" }}>Minor variation (initials / spacing) — acceptable for marksheets</div>
                      )}
                    </div>
                    <div style={{ paddingTop: "16px" }} />
                    <div style={{ paddingTop: "14px" }}>
                      <span style={{ padding: "3px 8px", borderRadius: "6px", fontSize: "10px", fontWeight: 900, whiteSpace: "nowrap", ...getScoreBadgeInlineStyle(pr.sc) }}>
                        {pairScoreLabel(pr.sc)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: "8px", padding: "8px 12px", background: "#f8fafc", borderRadius: "7px", border: "1px solid #e2e8f0", fontSize: "11px", color: "#64748b" }}>
              ℹ️ <strong>Honorifics stripped before comparison:</strong> Thiru / Tmt. / Selvan / Selvi / Km. / Kumari · Mr. / Mrs. / Ms. / Miss / Dr. / Shri / Sri / Smt. / Kum. · S/O, D/O, W/O, H/O, G/O · Single-letter initials ignored for lenient (Minor OK) pairs
            </div>

            {mismatchPairs.length > 0 ? (
              <div style={{ marginTop: "10px", padding: "12px 14px", background: "#fef2f2", borderRadius: "8px", border: "1px solid #fca5a5", fontSize: "12px", color: "#7f1d1d" }}>
                <strong>❌ {mismatchPairs.length} name mismatch{mismatchPairs.length > 1 ? "es" : ""} found:</strong>
                <div style={{ marginTop: "6px", lineHeight: 1.8 }}>
                  {mismatchPairs.map((pr, i) => (
                    <div key={i}>
                      <strong>{pr.a.doc}</strong> ↔ <strong>{pr.b.doc}</strong>: "{pr.a.val}" ≠ "{pr.b.val}"
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: "8px", padding: "8px 10px", background: "#fff5f5", borderRadius: "6px", fontSize: "11px" }}>
                  <strong>Action:</strong> Strict documents (Aadhaar, Community Certificate, Bank Passbook) must all carry the same name exactly. Get the mismatched document(s) corrected before submitting your NSP application.
                </div>
              </div>
            ) : hasNameMinor ? (
              <div style={{ marginTop: "10px", padding: "10px 14px", background: "#fffbeb", borderRadius: "8px", border: "1px solid #fde68a", fontSize: "12px", color: "#92400e" }}>
                <strong>⚠️ Minor name variation detected (lenient pair only).</strong> The variation is within acceptable limits for marksheets — initials or spacing differ slightly. All strict documents (Aadhaar, Community Cert, Bank Passbook) match each other exactly.
              </div>
            ) : (
              <div style={{ marginTop: "10px", padding: "10px 14px", background: "#f0fdf4", borderRadius: "8px", border: "1px solid #6ee7b7", fontSize: "12px", color: "#065f46" }}>
                <strong>✅ All names are consistent across all documents.</strong>
              </div>
            )}
          </>
        )}
      </div>

      {/* Section 2: Date of Birth Cross-Check */}
      {renderHdr("2", <CalIco />, "Date of Birth Cross-Check", "DOB from community & income certificates compared against Aadhaar DOB", dobSt)}
      <div className="res-grp-card">
        {!aadDob ? (
          <div style={{ color: "#94a3b8", textAlign: "center", padding: "18px", fontSize: "12px" }}>
            Enter Aadhaar date of birth in Step 2 to enable DOB cross-check
          </div>
        ) : (
          <>
            <div style={{ background: "#eff6ff", borderRadius: "8px", padding: "8px 14px", marginBottom: "8px", border: "1px solid #bfdbfe", fontSize: "12px" }}>
              <strong>Aadhaar DOB (Reference):</strong> <span style={{ fontWeight: 900, color: "#0f172a" }}>{fmtDob(aadDob) || aadDob}</span>
            </div>
            <div style={{ border: "1.5px solid #e2e8f0", borderRadius: "8px", overflow: "hidden" }}>
              {activeDob.length === 0 ? (
                <div style={{ color: "#94a3b8", fontSize: "12px", padding: "12px", textAlign: "center" }}>
                  No DOB found in uploaded community/income certificates
                </div>
              ) : (
                activeDob.map((src, i) => {
                  const bg = i % 2 === 0 ? "#fff" : "#fafafa";
                  return (
                    <div key={i} style={{ background: bg, borderTop: "1px solid #f1f5f9", padding: "9px 14px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                      <div>
                        <div style={{ fontSize: "12px", fontWeight: 700, color: "#475569" }}>{src.ico} {src.doc}</div>
                        <div style={{ fontSize: "12px", fontWeight: 800, color: "#0f172a", marginTop: "2px" }}>{src.val}</div>
                        {src.res === "mismatch" && (
                          <div style={{ fontSize: "11px", color: "#dc2626", marginTop: "3px" }}>
                            Document DOB: <strong>{fmtDob(src.val) || src.val}</strong> — does not match Aadhaar DOB. Must be corrected.
                          </div>
                        )}
                        {src.res === "match" && (
                          <div style={{ fontSize: "11px", color: "#059669", marginTop: "3px" }}>DOB matches Aadhaar.</div>
                        )}
                        {src.res !== "match" && src.res !== "mismatch" && (
                          <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "3px" }}>DOB format could not be parsed — verify manually.</div>
                        )}
                      </div>
                      <div>
                        {src.res === "match" ? (
                          <span style={{ padding: "3px 8px", borderRadius: "6px", fontSize: "10px", fontWeight: 900, background: "#f0fdf4", color: "#059669", border: "1px solid #6ee7b7" }}>✅ Match</span>
                        ) : src.res === "mismatch" ? (
                          <span style={{ padding: "3px 8px", borderRadius: "6px", fontSize: "10px", fontWeight: 900, background: "#fef2f2", color: "#dc2626", border: "1px solid #fca5a5" }}>❌ Mismatch</span>
                        ) : (
                          <span style={{ padding: "3px 8px", borderRadius: "6px", fontSize: "10px", fontWeight: 900, background: "#f8fafc", color: "#94a3b8", border: "1px solid #e2e8f0" }}>— Unreadable</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            {hasDobMismatch ? (
              <div style={{ marginTop: "8px", padding: "12px 14px", background: "#fef2f2", borderRadius: "8px", border: "1px solid #fca5a5", fontSize: "12px", color: "#7f1d1d" }}>
                <strong>❌ DOB mismatch detected.</strong> Get the certificate reissued with the correct DOB matching Aadhaar before applying.
              </div>
            ) : activeDob.some(s => s.res === "match") && (
              <div style={{ marginTop: "8px", padding: "10px 14px", background: "#f0fdf4", borderRadius: "8px", border: "1px solid #6ee7b7", fontSize: "12px", color: "#065f46" }}>
                <strong>✅ DOB matches across all checked documents.</strong>
              </div>
            )}
          </>
        )}
      </div>

      {/* Section 3: 10th Marksheet */}
      {renderHdr("3", <DocIco />, "10th Marksheet", "Board exam result — SSLC verification (Max: 500 marks)", m10St)}
      <div className="res-grp-card">
        {!m10 ? (
          <div style={{ color: "#94a3b8", textAlign: "center", padding: "18px", fontSize: "12px" }}>Upload 10th Marksheet to verify</div>
        ) : !m10.isValid ? (
          <>
            {renderChk("fail", "Wrong Document", `Detected as: ${m10.documentType || "Unknown"}. Please upload the 10th SSLC Marksheet.`)}
            {m10.validationNotes ? (
              <div style={{ borderLeft: "3px solid #ef4444", background: "#fef2f2", color: "#991b1b", padding: "8px 12px", borderRadius: "6px", fontSize: "11px", marginTop: "6px" }}>
                {m10.validationNotes}
              </div>
            ) : null}
          </>
        ) : (
          <>
            {renderChk("pass", "10th Marksheet confirmed", "SSLC / 10th Standard — Max Marks: 500")}
            {m10.name ? renderChk("pass", `Name: ${m10.name}`, "Extracted from marksheet") : renderChk("warn", "Name: Not readable", "Name matching skipped for this document")}
            {m10.board ? renderChk("pass", `Board: ${m10.board}`, "Examining authority") : renderChk("warn", "Board: Not readable", "")}
            {m10.year ? renderChk("pass", `Year: ${m10.year}${m10.month ? ` (${m10.month})` : ""}`, "Exam year") : null}
            {m10.marksScored && m10.maxMarks ? renderChk("pass", `Marks: ${m10.marksScored} / ${m10.maxMarks}`, "Obtained / Maximum (500)") : renderChk("warn", "Marks: Not readable", "")}
            {m10.percentage ? (
              renderChk("pass", `Percentage: ${m10.percentage}`, `(marksScored ÷ 500) × 100`)
            ) : renderChk("warn", "Percentage: Not readable", "")}
            {m10.grade ? (
              renderChk(String(m10.grade).toLowerCase().includes("fail") ? "fail" : "pass", `Result: ${m10.grade}`, String(m10.grade).toLowerCase().includes("fail") ? "❌ Failed — not eligible" : "✅ Passed")
            ) : null}
          </>
        )}
      </div>

      {/* Section 4: 12th Marksheet */}
      {renderHdr("4", <DocIco />, "12th Marksheet", "HSC result — PMSS requires minimum 60% (Max: 600 marks)", m12St)}
      <div className="res-grp-card">
        {!m12 ? (
          <div style={{ color: "#94a3b8", textAlign: "center", padding: "18px", fontSize: "12px" }}>Upload 12th Marksheet to verify</div>
        ) : !m12.isValid ? (
          <>
            {renderChk("fail", "Wrong Document", `Detected as: ${m12.documentType || "Unknown"}. Please upload the 12th HSC Marksheet.`)}
            {m12.validationNotes ? (
              <div style={{ borderLeft: "3px solid #ef4444", background: "#fef2f2", color: "#991b1b", padding: "8px 12px", borderRadius: "6px", fontSize: "11px", marginTop: "6px" }}>
                {m12.validationNotes}
              </div>
            ) : null}
          </>
        ) : (
          <>
            {renderChk("pass", "12th Marksheet confirmed", "HSC / 12th Standard / Plus Two — Max Marks: 600")}
            {m12.name ? renderChk("pass", `Name: ${m12.name}`, "Extracted from marksheet") : renderChk("warn", "Name: Not readable", "Name matching skipped for this document")}
            {m12.board ? renderChk("pass", `Board: ${m12.board}`, "Examining authority") : renderChk("warn", "Board: Not readable", "")}
            {m12.year ? renderChk("pass", `Year: ${m12.year}${m12.month ? ` (${m12.month})` : ""}`, "Exam year") : null}
            {m12.marksScored && m12.maxMarks ? renderChk("pass", `Marks: ${m12.marksScored} / ${m12.maxMarks}`, "Obtained / Maximum (600)") : renderChk("warn", "Marks: Not readable", "")}
            {m12.percentage ? (
              (() => {
                const pct = parseFloat(String(m12.percentage).replace(/[^0-9.]/g, "")) || 0;
                const pctSt = pct >= 60 ? "pass" : pct >= 50 ? "warn" : "fail";
                const pctNote = pct >= 60 ? "✅ Meets PMSS 60% minimum" : pct >= 50 ? "⚠️ Below 60% — may be ineligible" : "❌ Below 50% — ineligible";
                return renderChk(pctSt, `Percentage: ${m12.percentage}`, `${pctNote} | (marksScored ÷ 600) × 100`);
              })()
            ) : renderChk("warn", "Percentage: Not readable", "")}
            {m12.grade ? (
              renderChk(String(m12.grade).toLowerCase().includes("fail") ? "fail" : "pass", `Result: ${m12.grade}`, String(m12.grade).toLowerCase().includes("fail") ? "❌ Failed — not eligible" : "✅ Passed")
            ) : null}
          </>
        )}
      </div>

      {/* Section 5: Community Certificate */}
      {renderHdr("5", <CommIco />, "Community Certificate", "Category, community and religion — NSP eligibility check", commSt)}
      <div className="res-grp-card">
        {!cD ? (
          <div style={{ color: "#94a3b8", textAlign: "center", padding: "18px", fontSize: "12px" }}>Upload Community Certificate to verify</div>
        ) : cD.isValid === false ? (
          <>
            {renderChk("fail", "Wrong Document", `Uploaded: ${cD.documentType || "Unknown"}. Please upload a valid Community / Caste Certificate.`)}
            {cD.validationNotes ? (
              <div style={{ borderLeft: "3px solid #ef4444", background: "#fef2f2", color: "#991b1b", padding: "8px 12px", borderRadius: "6px", fontSize: "11px", marginTop: "6px" }}>
                {cD.validationNotes}
              </div>
            ) : null}
          </>
        ) : (
          <>
            {cD.name ? (
              (() => {
                const stripped = stripHonorifics(cD.name);
                return renderChk("pass", `Name: ${cD.name}${stripped !== cD.name ? ` (honorific stripped: ${stripped})` : ""}`, "Extracted — used in name cross-check above");
              })()
            ) : renderChk("warn", "Name: Not found", "Name cross-match skipped for this document")}
            {cD.community ? renderChk("pass", `Community: ${cD.community}`, "Caste name as stated on certificate") : renderChk("fail", "Community name: Not found", "Certificate may be incomplete or illegible")}
            {cD.communityCategory ? (
              (() => {
                const normCat = normaliseCommunity(cD.communityCategory);
                const isGenComm = normCat === "General";
                return renderChk(isGenComm ? "warn" : "pass", `Category: ${cD.communityCategory} → ${normCat}`, isGenComm ? "⚠️ General — typically not eligible for NSP reserved scholarships" : "NSP-eligible reserved category");
              })()
            ) : renderChk("fail", "Category: Not found", "Required for NSP eligibility")}
            {cD.religion ? renderChk("pass", `Religion: ${cD.religion} → ${normaliseReligion(cD.religion)}`, "Used for Minority Scholarship matching") : null}
            {cD.certNumber ? renderChk("pass", `Cert No: ${cD.certNumber}`, `Issued: ${cD.issueDate || "--"} | Office: ${cD.officeName || cD.issuingAuthority || "--"}`) : renderChk("warn", "Certificate number: Not found", "Verify the document is the official issued copy")}
          </>
        )}
      </div>

      {/* Section 6: Income Certificate */}
      {renderHdr("6", <IncIco />, "Income Certificate", "Amount, validity & expiry — NSP ceiling is Rs.2,00,000", incSt)}
      <div className="res-grp-card">
        {!iD ? (
          <div style={{ color: "#94a3b8", textAlign: "center", padding: "18px", fontSize: "12px" }}>Upload Income Certificate to verify</div>
        ) : iD.isValid === false ? (
          <>
            {renderChk("fail", "Wrong Document", `Uploaded: ${iD.documentType || "Unknown"}. Please upload a valid Income Certificate.`)}
            {iD.validationNotes ? (
              <div style={{ borderLeft: "3px solid #ef4444", background: "#fef2f2", color: "#991b1b", padding: "8px 12px", borderRadius: "6px", fontSize: "11px", marginTop: "6px" }}>
                {iD.validationNotes}
              </div>
            ) : null}
          </>
        ) : (
          <>
            {incNum > 200000 ? renderChk("fail", `Annual Income: ${INR(incNum)}`, "❌ Exceeds Rs.2,00,000 NSP ceiling — NOT eligible") : incNum > 0 ? renderChk("pass", `Annual Income: ${INR(incNum)}`, "✅ Within Rs.2,00,000 NSP ceiling — Eligible") : renderChk("warn", "Annual Income: Not readable", "Verify manually before submitting NSP application")}
            {(() => {
              const expColor = incExpiry.color;
              const expChkSt = expColor === "green" ? "pass" : expColor === "yellow" ? "warn" : expColor === "red" ? "fail" : "";
              const expBadgeStyle = expColor === "green" ? { background: "#f0fdf4", color: "#059669", border: "1px solid #6ee7b7" } : expColor === "yellow" ? { background: "#fffbeb", color: "#d97706", border: "1px solid #fde68a" } : expColor === "red" ? { background: "#fef2f2", color: "#dc2626", border: "1px solid #fca5a5" } : { background: "#f8fafc", color: "#64748b", border: "1px solid #e2e8f0" };
              return (
                <div className={`chk-row2 ${expChkSt}`} style={{ flexDirection: "column", alignItems: "flex-start", gap: "6px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%" }}>
                    <div className="chk2-icon">{expChkSt === "pass" ? "✓" : expChkSt === "fail" ? "✗" : expChkSt === "warn" ? "⚠" : "—"}</div>
                    <div className="chk2-title">Document Freshness / Validity</div>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "3px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: 800, ...expBadgeStyle }}>
                      {incExpiry.label}
                    </div>
                  </div>
                  <div style={{ paddingLeft: "30px" }}>
                    <div className="chk2-detail">{incExpiry.detail}</div>
                    {iD.issueDate && iD.issueDate !== "null" ? (
                      <div className="chk2-detail" style={{ marginTop: "3px" }}>
                        Issue Date: <strong>{iD.issueDate}</strong>{iD.validUpto && iD.validUpto !== "null" ? <> | Valid Upto: <strong>{iD.validUpto}</strong></> : null}
                      </div>
                    ) : null}
                    {(!iD.issueDate || iD.issueDate === "null") ? (
                      <div className="chk2-detail" style={{ marginTop: "3px", color: "#dc2626" }}>
                        ⚠ Issue date not found — NSP requires certificate within 6 months. Verify manually.
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })()}
            {iD.certNumber ? renderChk("pass", `Cert No: ${iD.certNumber}`, `Office: ${iD.officeName || iD.issuingAuthority || "--"}`) : renderChk("warn", "Certificate number: Not readable", "Verify certificate is the official issued copy")}
          </>
        )}
      </div>

      {/* Section 7: Aadhaar Card */}
      {renderHdr("7", <AadIco />, "Aadhaar Card", "Identity details entered in Step 2 — used in name & DOB cross-checks", aadSt)}
      <div className="res-grp-card">
        {!aadharName.trim() && !aadharDob ? (
          <div style={{ color: "#94a3b8", textAlign: "center", padding: "18px", fontSize: "12px" }}>Aadhaar details not entered in Step 2</div>
        ) : (
          <>
            {aadharName.trim() ? renderChk("pass", `Name (as per Aadhaar): ${aadharName}`, "Included in all-pairs name comparison above") : renderChk("fail", "Name: Not entered", "Go back to Step 2 and enter your name exactly as on Aadhaar")}
            {aadharDob ? renderChk("pass", `Date of Birth: ${fmtDob(aadharDob) || aadharDob}`, "Reference DOB for community & income certificate cross-check") : renderChk("warn", "DOB: Not entered", "Enter Aadhaar DOB in Step 2 to enable DOB cross-verification")}
          </>
        )}
      </div>

      {/* Section 8: Bank Passbook */}
      {renderHdr("8", <BankIco />, "Bank Passbook", "NSP requires a Single Savings Account", bankSt)}
      <div className="res-grp-card">
        {!bankHolder.trim() && !bankAccType ? (
          <div style={{ color: "#94a3b8", textAlign: "center", padding: "18px", fontSize: "12px" }}>Bank details not entered</div>
        ) : (
          <>
            {bankAccType ? renderChk(bankSingle ? "pass" : "fail", `Account Type: ${bankAccType}`, bankSingle ? "✅ Single Account — Accepted by NSP" : "❌ Joint Account — NOT accepted by NSP. Open a Single Savings Account.") : renderChk("warn", "Account type: Not selected", "Select account type in Step 2")}
            {bankHolder.trim() ? (
              (() => {
                const strippedBank = stripHonorifics(bankHolder.trim());
                return renderChk("pass", `Account Holder: ${bankHolder}`, `Name on passbook — included in all-pairs name comparison above${strippedBank !== bankHolder.trim() ? ` | Compared without honorific: ${strippedBank}` : ""}`);
              })()
            ) : renderChk("warn", "Account holder name: Not entered", "Enter name as printed on first page of passbook")}
          </>
        )}
      </div>

      {/* Verdict Summary Box */}
      <div style={{ marginTop: "20px" }}>
        <div className={vcls}>
          {!totalFail && !totalWarn ? (
            <>
              <div className="verdict-title">✅ All Documents Verified — Ready to Apply</div>
              <div className="verdict-sub">All pairs match. Names and DOB are consistent across every document. Submit your NSP application confidently.</div>
            </>
          ) : !totalFail ? (
            <>
              <div className="verdict-title">⚠️ Minor Issues — Review Before Applying</div>
              <div className="verdict-sub">
                Items to review: <strong>{warnLabels.join(" | ")}</strong><br />
                <span style={{ fontSize: "12px" }}>Warnings, not blockers — verify before submitting.</span>
              </div>
            </>
          ) : (
            <>
              <div className="verdict-title">❌ {totalFail} Issue{totalFail > 1 ? "s" : ""} Found — Fix Before Applying</div>
              <div className="verdict-sub">
                Issues in: {failLabels.map((l, i) => <span key={i} style={{ display: "inline-block", padding: "2px 10px", background: "none", fontSize: "12px", margin: "2px" }}>{l}</span>)}
                {warnLabels.length > 0 && (
                  <>
                    <br />
                    <span style={{ fontSize: "12px", color: "#b45309" }}>Also review: {warnLabels.join(", ")}</span>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const initDS=()=>Object.fromEntries(Object.keys(DCFG).map(t=>[t,{file:null,url:null,loading:false,data:null,err:null,open:true}]));

export default function DocumentUpload(){
  const navigate = useNavigate();
  const [isExiting, setIsExiting] = useState(false);
  const [step, setStep] = useState(1);
  const [ds,   setDs]   = useState(initDS);

  const [aadharName,  setAadharName]  = useState("");
  const [aadharDob,   setAadharDob]   = useState("");
  const [bankAccType, setBankAccType] = useState("");
  const [bankHolder,  setBankHolder]  = useState("");
  const [detailsErrs, setDetailsErrs] = useState({});

  const [resultsData, setResultsData] = useState(null);

  // ── reCAPTCHA + Session state ────────────────────────────────────────────
  const [captchaReady,    setCaptchaReady]    = useState(false);
  const [captchaError,    setCaptchaError]    = useState("");
  const [sessionToken,    setSessionToken]    = useState(null);
  const [sessionLoading,  setSessionLoading]  = useState(false);
  const [captchaToken,    setCaptchaToken]    = useState(null);
  const captchaContainer = React.useRef(null);
  const captchaWidgetId  = React.useRef(null);

  // Load reCAPTCHA script once on mount
  React.useEffect(()=>{
    if (SHOULD_USE_MOCK_CAPTCHA) {
      setCaptchaToken(buildLocalMockCaptchaToken());
      setCaptchaReady(true);
      setCaptchaError("");
      return;
    }

    loadRecaptcha().then(()=>{
      if (!window.grecaptcha?.enterprise || !captchaContainer.current || !RECAPTCHA_ENTERPRISE_SITE_KEY) return;
      window.grecaptcha.enterprise.ready(()=>{
        if (captchaWidgetId.current !== null || !captchaContainer.current || typeof window.grecaptcha.enterprise.render !== "function") return;
        captchaWidgetId.current = window.grecaptcha.enterprise.render(captchaContainer.current, {
          sitekey: RECAPTCHA_ENTERPRISE_SITE_KEY,
          callback: token => { setCaptchaToken(token); setCaptchaError(""); },
          "expired-callback": () => { setCaptchaToken(null); setSessionToken(null); setCaptchaError("CAPTCHA expired. Please verify again."); },
          "error-callback": () => { setCaptchaToken(null); setCaptchaError("CAPTCHA verification failed."); },
        });
        setCaptchaReady(true);
      });
    });
  },[]);

  const handleCaptchaAndSession = async()=>{
    if(!captchaReady || !captchaToken){ setCaptchaError("Complete the CAPTCHA verification first."); return; }
    setSessionLoading(true); setCaptchaError("");
    try{
      setSessionToken(await createSession(captchaToken));
    }catch(e){
      setCaptchaError(e.message||"Session creation failed. Try again.");
    }finally{
      setSessionLoading(false);
    }
  };

  const resetCaptchaSession=()=>{
    setSessionToken(null);
    setCaptchaToken(null);
    _sessionCache = null;
    if (captchaWidgetId.current !== null) window.grecaptcha?.enterprise?.reset(captchaWidgetId.current);
  };

  const nav=(path)=>{ setIsExiting(true); setTimeout(()=>navigate(path),600); };

  const validateDetailsAndProceed=()=>{
    const errs={};
    if(!aadharName.trim())  errs.aadharName=true;
    if(!aadharDob)          errs.aadharDob=true;
    if(!bankAccType)        errs.bankAccType=true;
    if(!bankHolder.trim())  errs.bankHolder=true;
    setDetailsErrs(errs);
    if(Object.keys(errs).length){ alert("Please fill all required fields (*)"); return; }
    buildResults();
    setStep(3);
    window.scrollTo({top:0,behavior:"smooth"});
  };

  const gotoStep=(n)=>{ if(n===3) buildResults(); setStep(n); window.scrollTo({top:0,behavior:"smooth"}); };

  const pickFile=(type,file)=>{
    if(!file) return;
    const ext = (file.name || "").split(".").pop()?.toLowerCase();
    const mime = file.type || "";
    const ok=["image/jpeg","image/png","image/webp","image/gif","image/bmp","image/x-ms-bmp","image/heic","image/heif","application/pdf"];
    const isAccepted = ok.includes(mime) || (ext === "jpg") || (ext === "jpeg") || (ext === "png") || (ext === "webp") || (ext === "bmp") || (ext === "gif") || (ext === "pdf") || (ext === "heic") || (ext === "heif");
    if(!isAccepted){setDs(p=>({...p,[type]:{...p[type],err:"Unsupported file type. Use JPG, PNG, WEBP, BMP, GIF, HEIC/HEIF or PDF."}}));return;}
    if(file.size>15*1024*1024){setDs(p=>({...p,[type]:{...p[type],err:"Max 15 MB."}}));return;}
    setDs(p=>({...p,[type]:{...p[type],file,url:URL.createObjectURL(file),err:null,data:null,loading:false}}));
  };

  const resetDoc  =(type)=>setDs(p=>{if(p[type].url)URL.revokeObjectURL(p[type].url);return{...p,[type]:{file:null,url:null,loading:false,data:null,err:null,open:true}};});
  const toggleOpen=(type)=>setDs(p=>({...p,[type]:{...p[type],open:!p[type].open}}));

  const analyseDoc=async(type)=>{
    setDs(p=>({...p,[type]:{...p[type],loading:true,err:null}}));
    try{
      // OCR, extraction and validation stay in the browser. Document bytes never
      // leave this component and are never sent to an AI provider.
      const localResult=await extractDocumentData(ds[type].file, type);
      if(!localResult.success) throw new Error(localResult.error||"Document extraction failed");
      const result={
        ...localResult.extracted,
        isValid: localResult.isValid,
        documentType: localResult.documentTypeValid === false ? (localResult.detectedType || "Unknown document") : DCFG[type].label,
        validationNotes: [...localResult.issues, ...localResult.warnings].join(" "),
        fieldsIncomplete: localResult.fieldsIncomplete,
      };
      setDs(p=>({...p,[type]:{...p[type],data:result,loading:false,open:true}}));
    }catch(e){
      let msg=e.message||"Analysis failed";
      if(msg.includes("401")||msg.includes("Session")) msg="Session expired — please verify again below";
      else if(msg.includes("429")) msg="Rate limit — wait a few seconds";
      // Clear expired session so user re-verifies
      if(msg.includes("Session expired")||msg.includes("session")) { setSessionToken(null); _sessionCache=null; }
      setDs(p=>({...p,[type]:{...p[type],loading:false,err:msg}}));
    }
  };

  // ─── buildResults (computes structured verification data for pure JSX rendering) ───
  const buildResults=()=>{
    const m10=ds.ms10.data, m12=ds.ms12.data;
    const cD=ds.community.data, iD=ds.income.data;

    const incNum = iD ? (()=>{
      const n=iD.incomeNumber;
      if(n!==undefined&&n!==null&&String(n)!==""&&String(n)!=="null"){const p=parseInt(String(n).replace(/\D/g,""));if(!isNaN(p))return p;}
      const p2=parseInt(String(iD.income||"").replace(/\D/g,""));
      return isNaN(p2)?0:p2;
    })() : 0;
    const incExpiry=computeIncomeExpiry(iD);

    const gradeIsFail=d=>d&&String(d.grade||"").toLowerCase().includes("fail");
    const m10St=!m10?"grey":!m10.isValid?"red":gradeIsFail(m10)?"red":m10.name&&m10.percentage?"green":"yellow";
    const m12St=!m12?"grey":!m12.isValid?"red":gradeIsFail(m12)?"red":m12.name&&m12.percentage?"green":"yellow";
    const commSt=!cD?"grey":cD.isValid===false?"red":!cD.community?"red":!cD.communityCategory?"red":"green";
    const incSt=!iD?"grey":iD.isValid===false?"red":incNum>200000?"red":incExpiry.status==="expired"?"red":incNum===0?"yellow":incExpiry.status==="warning"?"yellow":"green";
    const aadSt=aadharName.trim()&&aadharDob?"green":"grey";
    const bankSingle=bankAccType==="Single";
    const bankSt=!bankHolder.trim()?"grey":bankSingle?"green":"red";

    const allNameSources = [
      { doc:"Aadhaar Card",          ico:"🪪", val: aadharName.trim()||null,                          strict: true  },
      { doc:"Community Certificate", ico:"📜", val: (cD&&cD.isValid!==false) ? cD?.name : null,      strict: true  },
      { doc:"10th Marksheet",        ico:"📋", val: (m10&&m10.isValid)       ? m10?.name : null,     strict: false },
      { doc:"12th Marksheet",        ico:"📋", val: (m12&&m12.isValid)       ? m12?.name : null,     strict: false },
      { doc:"Bank Passbook",         ico:"🏦", val: bankHolder.trim()||null,                          strict: true  },
    ].filter(s => s.val && String(s.val)!=="null" && String(s.val).trim()!=="");

    const pairResults = [];
    for(let i=0; i<allNameSources.length; i++){
      for(let j=i+1; j<allNameSources.length; j++){
        const a=allNameSources[i], b=allNameSources[j];
        const useStrict = a.strict || b.strict;
        const sc = useStrict ? nameScoreStrict(a.val, b.val) : nameScore(a.val, b.val);
        pairResults.push({ a, b, sc, strict: useStrict });
      }
    }

    const hasNameMismatch = pairResults.some(p=>p.sc==="different");
    const hasNameMinor    = !hasNameMismatch && pairResults.some(p=>p.sc==="minor");
    const nameMatchSt = allNameSources.length<2 ? "grey" :
      hasNameMismatch ? "red" : hasNameMinor ? "yellow" : "green";

    const aadDob=aadharDob||"";
    const commDobResult=(cD&&cD.isValid!==false&&cD.dob&&aadDob)?dobMatch(cD.dob,aadDob):"missing";
    const incDobResult =(iD&&iD.isValid!==false&&iD.dob&&aadDob) ?dobMatch(iD.dob,aadDob) :"missing";
    const hasDobMismatch=commDobResult==="mismatch"||incDobResult==="mismatch";
    const dobSt=!aadDob?"grey":hasDobMismatch?"red":(commDobResult==="match"||incDobResult==="match")?"green":"grey";

    const dash=[
      {ico:<NameIco/>, label:"Name Match", col:nameMatchSt},
      {ico:<CalIco/>,  label:"DOB Match",  col:dobSt},
      {ico:<DocIco/>,  label:"10th",       col:m10St},
      {ico:<DocIco/>,  label:"12th",       col:m12St},
      {ico:<CommIco/>, label:"Community",  col:commSt},
      {ico:<IncIco/>,  label:"Income",     col:incSt},
      {ico:<BankIco/>, label:"Bank",       col:bankSt},
    ];
    const totalFail=dash.filter(d=>d.col==="red").length;
    const totalWarn=dash.filter(d=>d.col==="yellow").length;

    const comm = cD ? normaliseCommunity(cD.communityCategory || cD.community || "") : "";
    const relig = cD ? normaliseReligion(cD.religion || "") : "";
    const isGen = comm === "General";

    const dobSources = [
      { doc: "Community Certificate", ico: "📜", val: (cD && cD.isValid !== false) ? cD?.dob : null, res: commDobResult },
      { doc: "Income Certificate",    ico: "💰", val: (iD && iD.isValid !== false) ? iD?.dob : null,  res: incDobResult },
    ];
    const activeDob = dobSources.filter(s => s.val && String(s.val) !== "null" && String(s.val).trim() !== "");
    const mismatchPairs = pairResults.filter(p => p.sc === "different");

    setResultsData({
      aadharName, aadharDob, aadDob,
      bankHolder, bankAccType, bankSingle,
      cD, iD, m10, m12,
      comm, relig, isGen,
      dash, totalFail, totalWarn,
      nameMatchSt, dobSt, m10St, m12St, commSt, incSt, bankSt, aadSt,
      allNameSources, pairResults, hasNameMismatch, hasNameMinor, mismatchPairs,
      dobSources, activeDob, hasDobMismatch, commDobResult, incDobResult,
      incNum, incExpiry,
    });
  };

  // ─── renderExtracted ──────────────────────────────────────────────────────
  const renderExtracted=(type)=>{
    const s=ds[type],cfg=DCFG[type],fields=EF[type]||[];
    return(
      <div className={"ex-wrap-r ex-"+cfg.color}>
        <div className="ex-hd-r" onClick={()=>toggleOpen(type)}>
          <span style={{display:"flex",alignItems:"center",gap:6}}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            Extracted Details
          </span>
          <span>{s.open?<I.Up/>:<I.Down/>}</span>
        </div>
        {s.open&&(
          <div className="ex-body-r">
            {s.data.isValid===false&&(
              <div style={{background:"#fef2f2",border:"1.5px solid #fca5a5",borderRadius:8,padding:"10px 14px",marginBottom:8,display:"flex",alignItems:"flex-start",gap:8}}>
                <span style={{fontSize:16,flexShrink:0}}>❌</span>
                <div>
                  <div style={{fontSize:12,fontWeight:900,color:"#dc2626",marginBottom:2}}>Wrong Document Uploaded</div>
                  <div style={{fontSize:11,color:"#7f1d1d"}}>
                    Detected as: <strong>{s.data.documentType||"Unknown"}</strong>
                    {s.data.validationNotes&&s.data.validationNotes!=="null"?` — ${s.data.validationNotes}`:""}
                  </div>
                  <div style={{fontSize:11,color:"#7f1d1d",marginTop:3}}>
                    Please remove and upload the correct <strong>
                      {type==="community"?"Community / Caste Certificate":
                       type==="income"?"Income Certificate":
                       type==="ms10"?"10th SSLC Marksheet":"12th HSC Marksheet"}
                    </strong>.
                  </div>
                </div>
              </div>
            )}
            {s.data.isValid!==false&&s.data.fieldsIncomplete&&(
              <div className="ocr-incomplete-r">
                <span>⚠️</span><div><strong>{cfg.label} detected</strong><br/>Some fields could not be read — please upload a clearer image or verify the details manually.</div>
              </div>
            )}
            {fields.map(key=>{
              if(FL[key]===null) return null;
              const raw=s.data[key];
              if(raw===null||raw===undefined||String(raw)==="null"||String(raw)==="") return null;
              const val=String(raw);
              let extra=null;
              if(key==="income"){
                const n=parseInt(String(s.data.incomeNumber||raw).replace(/\D/g,""))||0;
                extra=<span className={"ex-tag-r "+(n>200000?"r":"g")}>{n>200000?"Exceeds Rs.2,00,000":"Within limit"}</span>;
              }else if(key==="issueDate"&&type==="income"){
                const age=monthsAgo(val);
                if(age!==null) extra=<span className={"ex-tag-r "+(age<=6?"g":age<=12?"y":"r")}>{age<=6?"Fresh":age<=12?"Ageing":"Too Old"} ({Math.round(age)}m ago)</span>;
              }else if(key==="validUpto"&&type==="income"){
                const exp=isDateExpired(val);
                if(exp!==null) extra=<span className={"ex-tag-r "+(exp?"r":"g")}>{exp?"EXPIRED":"Active"}</span>;
              }else if(key==="communityCategory"){
                extra=<span className="ex-tag-r g">→ {normaliseCommunity(val)}</span>;
              }else if(key==="grade"&&(type==="ms10"||type==="ms12")){
                const isFail=val.toLowerCase().includes("fail");
                extra=<span className={"ex-tag-r "+(isFail?"r":"g")}>{isFail?"Fail":"Pass"}</span>;
              }else if(key==="percentage"&&type==="ms10"){
                const pct=parseFloat(val.replace(/[^0-9.]/g,""))||0;
                if(pct>0) extra=<span className={"ex-tag-r "+(pct>=60?"g":pct>=50?"y":"r")}>{pct>=60?"Good":pct>=50?"Average":"Low"}</span>;
              }else if(key==="percentage"&&type==="ms12"){
                const pct=parseFloat(val.replace(/[^0-9.]/g,""))||0;
                if(pct>0) extra=<span className={"ex-tag-r "+(pct>=60?"g":pct>=50?"y":"r")}>{pct>=60?"Good (≥60%)":pct>=50?"Average":"Low"}</span>;
              }
              return(
                <div key={key} className="ex-row-r">
                  <span className="ex-k-r">{FL[key]||key}</span>
                  <span className="ex-v-r">{val}{extra}</span>
                </div>
              );
            })}
            {type==="community"&&s.data.religion&&s.data.religion!=="null"&&(
              <div className="ex-row-r">
                <span className="ex-k-r">Religion</span>
                <span className="ex-v-r">{s.data.religion} <span className="ex-tag-r g">→ {normaliseReligion(s.data.religion)}</span></span>
              </div>
            )}
            {type==="income"&&s.data&&(()=>{
              const exp=computeIncomeExpiry(s.data);
              const bg=exp.color==="green"?"#f0fdf4":exp.color==="yellow"?"#fffbeb":exp.color==="red"?"#fef2f2":"#f8fafc";
              const border=exp.color==="green"?"#6ee7b7":exp.color==="yellow"?"#fde68a":exp.color==="red"?"#fca5a5":"#e2e8f0";
              const color=exp.color==="green"?"#059669":exp.color==="yellow"?"#d97706":exp.color==="red"?"#dc2626":"#64748b";
              return(
                <div style={{background:bg,border:`1.5px solid ${border}`,borderRadius:8,padding:"8px 12px",marginTop:8}}>
                  <div style={{fontSize:11,fontWeight:900,color,textTransform:"uppercase",marginBottom:3}}>Document Status</div>
                  <div style={{fontSize:12,fontWeight:800,color:"#0f172a"}}>{exp.label}</div>
                  <div style={{fontSize:11,color:"#64748b",marginTop:2}}>{exp.detail}</div>
                </div>
              );
            })()}
            {s.data.validationNotes&&s.data.validationNotes!=="null"&&(
              <div className="ex-notes-r"><I.Warn/> {s.data.validationNotes}</div>
            )}
          </div>
        )}
      </div>
    );
  };

  const STEPS=[{n:1,label:"Upload & Extract"},{n:2,label:"Enter Details"},{n:3,label:"Results"}];

  const inputStyle=(hasErr)=>({
    width:"100%",padding:"10px 14px",borderRadius:10,fontSize:13,fontWeight:600,
    border:`1.5px solid ${hasErr?"#fca5a5":"#e2e8f0"}`,
    background:hasErr?"#fef2f2":"#fff",
    outline:"none",boxSizing:"border-box",color:"#0f172a",
  });
  const labelStyle={fontSize:12,fontWeight:800,color:"#475569",marginBottom:5,display:"block"};
  const reqStyle  ={color:"#dc2626",marginLeft:2};
  const hintStyle ={fontSize:11,color:"#94a3b8",marginTop:4,display:"block"};

  // ─── Render ───────────────────────────────────────────────────────────────
  return(
    <div className={"document-page "+(isExiting?"is-exiting-down":"is-entering-up")}>
      <div className="dashboard-bg-animations">
        <div className="out-shape out-blob blob-1"/><div className="out-shape out-blob blob-2"/>
        <div className="out-shape out-ring"/><div className="out-shape out-cross">+</div>
        <div className="out-shape out-triangle"/><div className="out-shape out-dot"/>
      </div>

      <header className="pro-header">
        <div className="header-shape shape-1"/><div className="header-shape shape-2"/>
        <div className="header-container">
          <div className="header-brand">
            <div className="brand-icon"><I.Shield/></div>
            <div className="brand-text">
              <h1>NSP Document Verification</h1>
              <p>Pre-Submission Check — National Scholarship Portal India</p>
            </div>
          </div>
          <div className="header-actions">
            <button className="btn-pro-back" onClick={()=>nav("/dashboard")}><I.Back/> Back To Dashboard</button>
            <LanguageSelector />
          </div>
        </div>
      </header>

      <div className="nsp-step-bar">
        {STEPS.map((s,i)=>(
          <React.Fragment key={s.n}>
            {i>0&&<div className="step-sep">{">"}</div>}
            <div className={"step-item"+(step===s.n?" active":step>s.n?" done":"")}
              onClick={()=>{ if(s.n===1)setStep(1); else if(s.n===2&&step>=2)setStep(2); else if(s.n===3&&step>=3)gotoStep(3); }}>
              <div className="step-circle">{step>s.n?"✓":s.n}</div>
              <div className="step-label">{s.label}</div>
            </div>
          </React.Fragment>
        ))}
      </div>

      <main className="upload-container" style={{position:"relative",zIndex:10}}>

        {/* ══════════════════ STEP 1 ══════════════════ */}
        {step===1&&(
          <div>
            <div className="section-header" style={{marginBottom:24}}>
              <h2>Upload &amp; Extract Documents</h2>
              <p>Upload each document and click <strong>VERIFY</strong> to extract details. Income expiry and 12th marks are verified automatically.</p>
            </div>

            {/* ── Human Verification (reCAPTCHA) Panel ── */}
            <div style={{
              background: sessionToken
                ? "linear-gradient(135deg,rgba(5,150,105,0.07),rgba(16,185,129,0.04))"
                : "linear-gradient(135deg,rgba(37,99,235,0.07),rgba(59,130,246,0.04))",
              border:`1.5px solid ${sessionToken?"#6ee7b7":"#bfdbfe"}`,
              borderRadius:14, padding:"18px 22px", marginBottom:22
            }}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={sessionToken?"#059669":"#1d4ed8"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3L4 7v5c0 5.25 3.5 10.15 8 11.35C16.5 22.15 20 17.25 20 12V7L12 3z"/><polyline points="9 12 11 14 15 10"/></svg>
                <div>
                  <div style={{fontSize:14,fontWeight:900,color:sessionToken?"#065f46":"#0f172a"}}>
                    {sessionToken ? "✅ Human Verified — Session Active" : "Human Verification Required"}
                  </div>
                  <div style={{fontSize:11,color:"#64748b",marginTop:1}}>
                    {sessionToken
                      ? "Optional text-only AI explanations are available for 15 minutes. Document OCR remains local."
                      : "Continue to verify Enterprise bot protection before optional text-only AI explanations. Document OCR remains local."}
                  </div>
                </div>
              </div>

              {!sessionToken && (
                <div>
                  <div style={{marginBottom:12}}>
                    {!RECAPTCHA_ENTERPRISE_SITE_KEY
                      ? <div style={{fontSize:12,color:"#b45309",padding:"8px 0"}}>CAPTCHA is not configured for this deployment.</div>
                      : <><div ref={captchaContainer} style={{minHeight:78}} aria-label="Enterprise CAPTCHA checkbox" />{!captchaReady && <div style={{fontSize:12,color:"#94a3b8",padding:"8px 0"}}>Loading CAPTCHA...</div>}</>
                    }
                  </div>
                  {captchaError && (
                    <div style={{background:"#fef2f2",border:"1px solid #fca5a5",borderRadius:8,padding:"8px 12px",fontSize:12,color:"#dc2626",marginBottom:10}}>
                      ⚠️ {captchaError}
                    </div>
                  )}
                  <button
                    onClick={handleCaptchaAndSession}
                    disabled={!captchaReady||!captchaToken||sessionLoading}
                    style={{display:"flex",alignItems:"center",gap:8,padding:"10px 22px",
                      background:captchaReady&&captchaToken&&!sessionLoading?"linear-gradient(135deg,#1d4ed8,#2563eb)":"#cbd5e1",
                      color:"white",border:"none",borderRadius:10,fontWeight:900,fontSize:13,
                      cursor:captchaReady&&captchaToken&&!sessionLoading?"pointer":"not-allowed"}}>
                    {sessionLoading
                      ? <><I.Spin/> Verifying...</>
                      : <><I.Shield/> Confirm Human &amp; Start Session</>}
                  </button>
                  <div style={{fontSize:11,color:"#94a3b8",marginTop:8}}>
                    🔒 Images are resized locally. No raw document is sent to any server without verification.
                  </div>
                </div>
              )}

              {sessionToken && (
                <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                  <span style={{fontSize:12,color:"#059669",fontWeight:700}}>
                    Session active — AI calls are authenticated and rate-limited.
                  </span>
                  <button onClick={resetCaptchaSession}
                    style={{fontSize:11,fontWeight:800,padding:"4px 12px",border:"1px solid #6ee7b7",
                      background:"#f0fdf4",color:"#059669",borderRadius:6,cursor:"pointer"}}>
                    Reset Session
                  </button>
                </div>
              )}
            </div>
            {/* ── End Verification Panel ── */}

            <div className="documents-grid">
              {Object.entries(DCFG).map(([type,cfg])=>{
                const s=ds[type]; const DocIcon=cfg.Icon;
                return(
                  <div key={type} className={"document-card "+(s.data?"card-success":"card-"+cfg.color)}>
                    <div className="card-top">
                      <div className="icon-box"><DocIcon/></div>
                      <div className={"status-pill "+(s.data?"active-green":"pending")}>
                        {s.data?<span style={{display:"flex",alignItems:"center",gap:4}}><I.Check/> Extracted</span>:"Pending"}
                      </div>
                    </div>
                    <h3>{cfg.label}</h3>
                    <p style={{fontSize:12,color:"#94a3b8",marginBottom:12}}>{cfg.desc}</p>
                    {!s.file?(
                      <div className="upload-section">
                        <p className="helper-text">JPG, PNG or PDF — max 15 MB</p>
                        <label className="upload-btn">
                          <input type="file" accept="image/*,.pdf" onChange={e=>pickFile(type,e.target.files[0])}/>
                          <span className="btn-content"><I.Upload/> Choose File</span>
                        </label>
                        <div className="nsp-dz"
                          onDragOver={e=>{e.preventDefault();e.currentTarget.classList.add("over");}}
                          onDragLeave={e=>e.currentTarget.classList.remove("over")}
                          onDrop={e=>{e.preventDefault();e.currentTarget.classList.remove("over");pickFile(type,e.dataTransfer.files[0]);}}>
                          <div style={{display:"flex",justifyContent:"center",opacity:0.35,marginBottom:4}}>
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>
                          </div>
                          <div style={{fontSize:11,color:"#94a3b8"}}>or drag &amp; drop</div>
                        </div>
                        {s.err&&<div className="nsp-er-box" style={{marginTop:8}}><p style={{display:"flex",alignItems:"center",gap:5}}><I.Warn/> {s.err}</p></div>}
                      </div>
                    ):(
                      <div className="success-section">
                        <div className="nsp-prev-wrap">
                          {s.file.type==="application/pdf"?(
                            <div className="nsp-pdf-preview">
                              <div className="nsp-pdf-icon"><I.PDF/></div>
                              <div className="nsp-pdf-name">{s.file.name}</div>
                              <div className="nsp-pdf-size">{(s.file.size/1024).toFixed(0)} KB — PDF</div>
                            </div>
                          ):(
                            <img src={s.url} alt="doc" style={{width:"100%",objectFit:"contain",maxHeight:130}}/>
                          )}
                          <button className="nsp-prev-rm" onClick={()=>resetDoc(type)}><I.X/></button>
                        </div>
                        {!s.data&&!s.loading&&(
                          <div>
                            {!sessionToken&&(
                              <div style={{fontSize:11,color:"#d97706",background:"#fffbeb",border:"1px solid #fde68a",borderRadius:7,padding:"6px 10px",marginTop:10}}>
                                ⚠️ Complete human verification above before verifying documents.
                              </div>
                            )}
                            <button
                              className="nsp-ai-btn"
                              style={{background:btnColor(cfg.color),marginTop:8,cursor:"pointer"}}
                              onClick={()=>analyseDoc(type)}
                              disabled={false}>
                              <I.Spark/> VERIFY
                            </button>
                          </div>
                        )}
                        {s.loading&&<div className={"nsp-ld-row ld-"+cfg.color} style={{marginTop:10}}><I.Spin/> Reading document...</div>}
                        {s.err&&(
                          <div className="nsp-er-box" style={{marginTop:10}}>
                            <p style={{display:"flex",alignItems:"center",gap:5}}><I.Warn/> {s.err}</p>
                            <button className="nsp-er-retry" onClick={()=>analyseDoc(type)}>Retry</button>
                          </div>
                        )}
                        {s.data&&renderExtracted(type)}
                        <button className="nsp-reset-btn" onClick={()=>resetDoc(type)} style={{marginTop:8}}><I.X/> Remove &amp; Re-upload</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="bottom-actions" style={{justifyContent:"flex-end",marginTop:24}}>
              <button className="btn-massive-primary" onClick={()=>{setStep(2);window.scrollTo({top:0,behavior:"smooth"});}} style={{display:"flex",alignItems:"center",gap:8}}>
                Next <I.Next/>
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════ STEP 2 ══════════════════ */}
        {step===2&&(
          <div>
            <div className="section-header" style={{marginBottom:24}}>
              <h2>Enter Aadhaar &amp; Bank Details</h2>
              <p>Names from <strong>all documents</strong> (Aadhaar, Community Cert, Marksheets, Bank Passbook) are cross-checked against each other. No single reference — every pair is verified.</p>
            </div>
            <div className="nsp-card" style={{marginBottom:20}}>
              <div className="nsp-card-hd" style={{display:"flex",alignItems:"center",gap:10,borderBottom:"1.5px solid #e0f2fe",paddingBottom:12,marginBottom:16}}>
                <I.IdCard/>
                <div>
                  <div style={{fontSize:14,fontWeight:900,color:"#0f172a"}}>Aadhaar Card Details</div>
                  <div style={{fontSize:11,color:"#64748b",marginTop:1}}>Enter exactly as printed on your Aadhaar card</div>
                </div>
                <span style={{marginLeft:"auto",fontSize:10,fontWeight:800,color:"#1d4ed8",background:"#eff6ff",padding:"3px 10px",borderRadius:20,border:"1px solid #bfdbfe"}}>UIDAI</span>
              </div>
              <div className="nsp-fg2">
                <div className="nsp-f" style={{gridColumn:"1/-1"}}>
                  <label style={labelStyle}>Name of Applicant (as per Aadhaar) <span style={reqStyle}>*</span></label>
                  <input value={aadharName} onChange={e=>setAadharName(e.target.value)} placeholder="e.g. NITHISHKUMAR M" style={inputStyle(detailsErrs.aadharName)}/>
                  <span style={hintStyle}>CAPITAL letters exactly as on Aadhaar — compared with all document names (honorifics ignored automatically)</span>
                </div>
                <div className="nsp-f">
                  <label style={labelStyle}>Date of Birth <span style={reqStyle}>*</span></label>
                  <input type="date" value={aadharDob} onChange={e=>setAadharDob(e.target.value)} style={inputStyle(detailsErrs.aadharDob)}/>
                  <span style={hintStyle}>DOB as printed on Aadhaar card</span>
                </div>
              </div>
            </div>

            <div className="nsp-card" style={{marginBottom:20}}>
              <div className="nsp-card-hd" style={{display:"flex",alignItems:"center",gap:10,borderBottom:"1.5px solid #dcfce7",paddingBottom:12,marginBottom:16}}>
                <I.Bank/>
                <div>
                  <div style={{fontSize:14,fontWeight:900,color:"#0f172a"}}>Bank Passbook Details</div>
                  <div style={{fontSize:11,color:"#64748b",marginTop:1}}>NSP requires a Single Savings account — name compared against all other documents</div>
                </div>
                <span style={{marginLeft:"auto",fontSize:10,fontWeight:800,color:"#059669",background:"#f0fdf4",padding:"3px 10px",borderRadius:20,border:"1px solid #6ee7b7"}}>First Page</span>
              </div>
              <div className="nsp-fg2">
                <div className="nsp-f" style={{gridColumn:"1/-1"}}>
                  <label style={labelStyle}>Account Holder Name (AS PER PASSBOOK) <span style={reqStyle}>*</span></label>
                  <input value={bankHolder} onChange={e=>setBankHolder(e.target.value)} placeholder="e.g. NITHISHKUMAR M  or  Mr. NITHISHKUMAR M" style={inputStyle(detailsErrs.bankHolder)}/>
                  <span style={hintStyle}>Enter exactly as printed — honorifics (Mr., Mrs., Shri, Smt., S/O, D/O etc.) are stripped before comparison</span>
                </div>
                <div className="nsp-f">
                  <label style={labelStyle}>Account Type <span style={reqStyle}>*</span></label>
                  <select value={bankAccType} onChange={e=>setBankAccType(e.target.value)} style={{...inputStyle(detailsErrs.bankAccType),cursor:"pointer"}}>
                    <option value="">Select account type</option>
                    <option value="Single">Single Account ✓ (Required for NSP)</option>
                    <option value="Joint">Joint Account ✗ (Not accepted by NSP)</option>
                  </select>
                  <span style={hintStyle}>Check TYPE OF ACCOUNT field on first page of passbook</span>
                </div>
              </div>
              {bankAccType&&(
                <div style={{marginTop:14,padding:"10px 14px",borderRadius:10,display:"flex",alignItems:"center",gap:10,background:bankAccType==="Single"?"#f0fdf4":"#fef2f2",border:`1.5px solid ${bankAccType==="Single"?"#6ee7b7":"#fca5a5"}`}}>
                  <span style={{fontSize:20}}>{bankAccType==="Single"?"✅":"❌"}</span>
                  <div>
                    <div style={{fontSize:13,fontWeight:900,color:bankAccType==="Single"?"#065f46":"#7f1d1d"}}>
                      {bankAccType==="Single"?"Single Account — Accepted for NSP disbursement":"Joint Account — NOT accepted by NSP"}
                    </div>
                    <div style={{fontSize:11,color:bankAccType==="Single"?"#059669":"#dc2626",marginTop:2}}>
                      {bankAccType==="Single"?"Scholarship amount will be directly credited.":"NSP requires an individual Single Savings account. Please open one before applying."}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div style={{background:"linear-gradient(135deg,rgba(109,40,217,0.06),rgba(59,130,246,0.06))",border:"1.5px solid #ddd6fe",borderRadius:14,padding:"18px 22px",marginBottom:24,display:"flex",alignItems:"center",flexWrap:"wrap",gap:16}}>
              <div style={{flex:1,minWidth:220}}>
                <div style={{fontSize:14,fontWeight:900,color:"#4c1d95",marginBottom:4,display:"flex",alignItems:"center",gap:7}}>
                  <I.Seed/> Aadhaar–Bank Seeding Check
                </div>
                <div style={{fontSize:12,color:"#64748b",lineHeight:1.6}}>
                  For NSP, your Aadhaar must be <strong>seeded (linked)</strong> with your bank account. Click below to verify on the official UIDAI (myAadhaar) portal.
                </div>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:8,alignItems:"flex-start"}}>
                <a href="https://myaadhaar.uidai.gov.in/" target="_blank" rel="noopener noreferrer"
                  style={{display:"flex",alignItems:"center",gap:8,padding:"11px 22px",background:"linear-gradient(135deg,#6d28d9,#4c119e)",color:"white",borderRadius:10,fontWeight:900,fontSize:13,textDecoration:"none",boxShadow:"0 4px 14px rgba(109,40,217,0.35)",whiteSpace:"nowrap"}}>
                  <I.Seed/> Check Aadhaar–Bank Seeding
                </a>
              </div>
            </div>

            <div className="bottom-actions" style={{justifyContent:"space-between"}}>
              <button className="btn-ghost-sm" onClick={()=>setStep(1)} style={{display:"flex",alignItems:"center",gap:5}}><I.Back/> Back to Upload</button>
              <button className="btn-massive-primary" onClick={validateDetailsAndProceed} style={{display:"flex",alignItems:"center",gap:8}}>
                View Results <I.Next/>
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════ STEP 3 ══════════════════ */}
        {step===3&&(
          <div>
            <div className="nsp-profile-strip">
              <div>
                <div className="ps-name">Document Verification Report</div>
                <div className="ps-info">{aadharName||"—"} | Bank: {bankHolder||"—"} ({bankAccType||"—"})</div>
              </div>
              <div style={{display:"flex",gap:8,marginLeft:"auto",flexWrap:"wrap"}}>
                <button className="btn-ghost-sm" onClick={()=>setStep(2)} style={{display:"flex",alignItems:"center",gap:5}}><I.Back/> Back</button>
                <button className="btn-ghost-sm" onClick={()=>window.print()} style={{display:"flex",alignItems:"center",gap:5}}><I.Print/> Print</button>
              </div>
            </div>

            <div className="section-header" style={{marginBottom:16}}>
              <h2>Verification Results</h2>
              <p>All document names compared against each other in pairs. No single reference — every combination is checked.</p>
            </div>

            {Object.values(ds).every(s=>!s.data)&&!aadharName&&!bankHolder?(
              <div className="nsp-card" style={{textAlign:"center",padding:40}}>
                <div style={{display:"flex",justifyContent:"center",marginBottom:14,opacity:0.4}}><I.Box/></div>
                <div style={{fontSize:15,fontWeight:900,color:"#64748b"}}>No data to show</div>
                <div style={{fontSize:13,color:"#94a3b8",margin:"8px 0 18px"}}>Go back, upload documents and enter your details first</div>
                <button className="btn-massive-primary" onClick={()=>setStep(1)} style={{display:"flex",alignItems:"center",gap:8,margin:"0 auto"}}><I.Back/> Start Over</button>
              </div>
            ):(
              <VerificationReport data={resultsData} />
            )}

            <div style={{display:"flex",justifyContent:"center",gap:12,marginTop:24,flexWrap:"wrap"}}>
              <button onClick={()=>nav("/eligibility")} style={{display:"flex",alignItems:"center",gap:8,padding:"14px 28px",background:"linear-gradient(135deg,#6d28d9,#4c119e)",color:"white",border:"none",borderRadius:"50px",fontWeight:800,fontSize:14,cursor:"pointer",boxShadow:"0 8px 20px rgba(109,40,217,0.35)"}}>
                <I.Target/> Check Eligibility
              </button>
              <a href="https://myaadhaar.uidai.gov.in/" target="_blank" rel="noopener noreferrer" style={{display:"flex",alignItems:"center",gap:8,padding:"14px 24px",background:"#fff",color:"#6d28d9",border:"1.5px solid #ddd6fe",borderRadius:"50px",fontWeight:800,fontSize:14,textDecoration:"none"}}>
                <I.Seed/> Check Seeding
              </a>
            </div>

            <div style={{marginTop:28,background:"linear-gradient(135deg,rgba(220,38,38,0.06),rgba(147,51,234,0.06))",border:"1.5px solid #fca5a5",borderRadius:14,padding:"18px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:16}}>
              <div style={{flex:1,minWidth:200}}>
                <div style={{fontSize:14,fontWeight:900,color:"#dc2626",marginBottom:5}}>Documents Require Correction?</div>
                <div style={{fontSize:13,color:"#7f1d1d",lineHeight:1.6}}>Click <strong>Fix Documents</strong> for official step-by-step correction guidance for any issues found above.</div>
              </div>
              <button onClick={()=>nav("/readiness")} style={{display:"flex",alignItems:"center",gap:8,padding:"12px 24px",background:"linear-gradient(135deg,#dc2626,#9333ea)",color:"white",border:"none",borderRadius:10,fontSize:13,fontWeight:900,cursor:"pointer",whiteSpace:"nowrap",boxShadow:"0 4px 14px rgba(220,38,38,0.35)",flexShrink:0}}>
                <I.Fix/> Fix Documents
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
