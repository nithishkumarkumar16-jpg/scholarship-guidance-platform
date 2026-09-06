jest.mock("pdfjs-dist", () => ({
  GlobalWorkerOptions: { workerSrc: "" },
  getDocument: jest.fn(),
}));

jest.mock("tesseract.js", () => ({
  createWorker: jest.fn(),
}));

import { extractMarksheetFields, getPdfWorkerSrc, MAX_PDF_PAGES } from "./sgpDocAI";

describe("extractMarksheetFields", () => {
  test("rejects boilerplate candidate labels and keeps the real student name", () => {
    const text = `
      CLASS X
      NAME OF THE CANDIDATE U
      RAGUL C
      TOTAL MARKS OBTAINED 465 / 500
    `;

    const result = extractMarksheetFields(text, "ms10");

    expect(result.name).toBe("Ragul C");
    expect(result.name).not.toMatch(/^of\s+the\s+cand/i);
    expect(result.marksScored).toBe("465");
    expect(result.maxMarks).toBe("500");
    expect(result.percentage).toBe("93.00%");
  });

  test("strips the duplicated OCR prefix from a broken candidate label and rejects fragment names", () => {
    const text = `
      12TH MARKSHEET
      OF THE CANDIOATE Hr Ir Om
      TOTAL MARKS OBTAINED 540 / 600
    `;

    const result = extractMarksheetFields(text, "ms12");

    expect(result.name).toBeNull();
    expect(result.name === null || !String(result.name).includes("Hr")).toBe(true);
    expect(result.marksScored).toBe("540");
    expect(result.maxMarks).toBe("600");
    expect(result.percentage).toBe("90.00%");
  });

  test("accepts a valid candidate name when it appears after the label and normalizes uppercase OCR", () => {
    const text = `
      NAME OF THE CANDIDATE:
      RAGUL C
      TOTAL MARKS OBTAINED 465 / 500
    `;

    const result = extractMarksheetFields(text, "ms10");

    expect(result.name).toBe("Ragul C");
    expect(result.name).not.toMatch(/^[A-Z\s]+$/);
  });

  test("returns null when the candidate name is genuinely missing", () => {
    const text = `
      CLASS X
      NAME OF THE CANDIDATE
      TOTAL MARKS OBTAINED 465 / 500
    `;

    const result = extractMarksheetFields(text, "ms10");

    expect(result.name).toBeNull();
  });

  test("parses the known marks totals from the regression samples", () => {
    const first = extractMarksheetFields("TOTAL MARKS OBTAINED 465 / 500", "ms10");
    const second = extractMarksheetFields("TOTAL MARKS OBTAINED 540 / 600", "ms12");

    expect(first.marksScored).toBe("465");
    expect(first.maxMarks).toBe("500");
    expect(first.percentage).toBe("93.00%");

    expect(second.marksScored).toBe("540");
    expect(second.maxMarks).toBe("600");
    expect(second.percentage).toBe("90.00%");
  });
});

describe("pdf security & worker configuration", () => {
  test("enforces strict maximum PDF limit of 3 pages", () => {
    expect(MAX_PDF_PAGES).toBe(3);
  });

  test("uses a browser-accessible worker URL in the public app assets", () => {
    const workerSrc = getPdfWorkerSrc();

    expect(workerSrc).toContain("/pdfjs/pdf.worker.min.mjs");
    expect(workerSrc).not.toContain("/pdfs-dist/build/pdf.worker.min.mjs");
  });
});
