import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import ScrollToTop from "./ScrollToTop";
import Dashboard from "./components/Dashboard/Dashboard";
import DocumentUpload from "./components/DocumentUpload/DocumentUpload";
import ScholarshipImportants from "./components/ScholarshipImportants/ScholarshipImportants";
import ReadinessDashboard from "./components/ReadinessDashboard/ReadinessDashboard";
import EligibilityEngine from "./components/EligibilityEngine/EligibilityEngine";
import RenewalAlert from "./components/RenewalAlert/RenewalAlert";
import Reports from "./components/Reports/Reports";
import ScholarshipChat from "./components/ScholarshipChat/ScholarshipChat";
import "./App.css";

function App() {
  return (
    <Router>
      <ScrollToTop />
      {/* Global language selector — fixed to top-right of header on every page */}
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/documents" element={<DocumentUpload />} />
        <Route path="/scholarship" element={<ScholarshipImportants />} />
        <Route path="/readiness" element={<ReadinessDashboard />} />
        <Route path="/eligibility" element={<EligibilityEngine />} />
        <Route path="/renewal" element={<RenewalAlert />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      <ScholarshipChat />
    </Router>
  );
}

export default App;
