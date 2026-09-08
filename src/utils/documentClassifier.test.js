import { detectDocumentType, validateDocumentSlot } from "./documentClassifier";

describe("documentClassifier", () => {
  describe("detectDocumentType", () => {
    test("correctly identifies 10th SSLC Marksheet with multi-signal markers", () => {
      const text = `
        GOVERNMENT OF TAMIL NADU
        DEPARTMENT OF GOVERNMENT EXAMINATIONS
        SECONDARY SCHOOL LEAVING CERTIFICATE (SSLC)
        NAME OF THE CANDIDATE: RAGUL C
        STATEMENT OF MARKS - MARCH 2022
        TAMIL: 92, ENGLISH: 88, MATHEMATICS: 95, SCIENCE: 94, SOCIAL SCIENCE: 96
        TOTAL MARKS OBTAINED: 465 / 500
      `;
      const res = detectDocumentType(text);
      expect(res.type).toBe("ms10");
      expect(res.confidence).toBeGreaterThanOrEqual(60);
      expect(res.isConfident).toBe(true);
    });

    test("correctly identifies 12th HSC Marksheet with multi-signal markers", () => {
      const text = `
        GOVERNMENT OF TAMIL NADU
        STATE BOARD OF SCHOOL EXAMINATIONS
        HIGHER SECONDARY (CLASS XII) CERTIFICATE (HSC)
        NAME OF CANDIDATE: ANANYA S
        MARCH 2024
        PHYSICS: 95, CHEMISTRY: 92, BIOLOGY: 94, MATHEMATICS: 98
        TOTAL MARKS OBTAINED: 540 / 600
      `;
      const res = detectDocumentType(text);
      expect(res.type).toBe("ms12");
      expect(res.confidence).toBeGreaterThanOrEqual(60);
      expect(res.isConfident).toBe(true);
    });

    test("correctly identifies Community Certificate", () => {
      const text = `
        GOVERNMENT OF TAMIL NADU
        REVENUE DEPARTMENT - TALUK OFFICE AMBATUR
        COMMUNITY CERTIFICATE
        This is to certify that Selvan NITHISHKUMAR M son of Thiru MURUGAN
        residing at Chennai District belongs to Scheduled Caste (SC) community.
        Certificate No: TN-1234567890
        Issued by: Tahsildar, Ambattur Taluk
      `;
      const res = detectDocumentType(text);
      expect(res.type).toBe("community");
      expect(res.confidence).toBeGreaterThanOrEqual(60);
      expect(res.isConfident).toBe(true);
    });

    test("correctly identifies Income Certificate", () => {
      const text = `
        GOVERNMENT OF TAMIL NADU
        REVENUE DEPARTMENT
        INCOME CERTIFICATE
        This is to certify that the total annual family income of Thiru MURUGAN
        father of NITHISHKUMAR M residing at Chennai is Rs. 1,80,000/- (Rupees One Lakh Eighty Thousand only) per annum.
        Certificate No: INC/2024/98765
        Issued on: 15-08-2024
        Tahsildar, Chennai District
      `;
      const res = detectDocumentType(text);
      expect(res.type).toBe("income");
      expect(res.confidence).toBeGreaterThanOrEqual(60);
      expect(res.isConfident).toBe(true);
    });

    test("returns unknown for insufficient or unrelated text", () => {
      const text = "Random receipt with groceries and shopping items total 500.";
      const res = detectDocumentType(text);
      expect(res.type).toBe("unknown");
      expect(res.isConfident).toBe(false);
    });
  });

  describe("validateDocumentSlot", () => {
    test("returns valid when detected type matches slot", () => {
      const detection = { type: "ms10", confidence: 90 };
      const slotRes = validateDocumentSlot("ms10", detection);
      expect(slotRes.status).toBe("valid");
      expect(slotRes.badgeColor).toBe("green");
    });

    test("returns mismatch when wrong document is uploaded in slot", () => {
      const detection = { type: "ms10", confidence: 90 };
      const slotRes = validateDocumentSlot("community", detection);
      expect(slotRes.status).toBe("mismatch");
      expect(slotRes.badgeColor).toBe("red");
      expect(slotRes.message).toContain("Wrong document type detected");
    });

    test("returns unconfident when confidence is low or document is unknown", () => {
      const detection = { type: "unknown", confidence: 30 };
      const slotRes = validateDocumentSlot("income", detection);
      expect(slotRes.status).toBe("unconfident");
      expect(slotRes.badgeColor).toBe("yellow");
    });
  });
});
