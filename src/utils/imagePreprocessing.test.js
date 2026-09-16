import {
  expandBoundingBox,
  cropCanvasBoundingBox,
  applySauvolaThreshold,
} from "./imagePreprocessing";
import { filterCoreMarksheetFields, cleanCandidateName, suggestOcrCorrections } from "./fieldParsers";

describe("imagePreprocessing OCR Optimization", () => {
  describe("expandBoundingBox", () => {
    test("expands bounding box by default +16px horizontally and +6px vertically", () => {
      const box = { x: 50, y: 50, width: 200, height: 40 };
      const expanded = expandBoundingBox(box, 1000, 1000);

      expect(expanded.x).toBe(34); // 50 - 16
      expect(expanded.y).toBe(44); // 50 - 6
      expect(expanded.width).toBe(232); // 200 + 32
      expect(expanded.height).toBe(52); // 40 + 12
    });

    test("clamps coordinates at canvas borders (0, max width, max height)", () => {
      const box = { x: 8, y: 2, width: 100, height: 50 };
      const expanded = expandBoundingBox(box, 110, 53);

      expect(expanded.x).toBe(0); // clamped at 0
      expect(expanded.y).toBe(0); // clamped at 0
      expect(expanded.width).toBe(110); // clamped to canvas width
      expect(expanded.height).toBe(53); // clamped to canvas height
    });

    test("handles normalized bounding box (0.0 to 1.0)", () => {
      const normBox = { x: 0.1, y: 0.2, width: 0.5, height: 0.1 };
      const expanded = expandBoundingBox(normBox, 1000, 1000);

      expect(expanded.x).toBe(84); // 100 - 16
      expect(expanded.y).toBe(194); // 200 - 6
      expect(expanded.width).toBe(532); // 500 + 32
      expect(expanded.height).toBe(112); // 100 + 12
    });
  });

  describe("cropCanvasBoundingBox", () => {
    test("creates an offscreen cropped canvas with expanded area", () => {
      const mockCanvas = {
        width: 800,
        height: 600,
        getContext: jest.fn(() => ({
          drawImage: jest.fn(),
          getImageData: jest.fn(() => ({
            data: new Uint8ClampedArray(100 * 50 * 4),
            width: 100,
            height: 50,
          })),
        })),
      };

      const cropped = cropCanvasBoundingBox(mockCanvas, { x: 100, y: 100, width: 150, height: 40 });
      expect(cropped).toBeDefined();
    });
  });

  describe("applySauvolaThreshold", () => {
    test("processes ImageData without error and binarizes pixels", () => {
      const width = 20;
      const height = 20;
      const pixelCount = width * height;
      const rawData = new Uint8ClampedArray(pixelCount * 4);

      // Create a gradient/pattern
      for (let i = 0; i < pixelCount; i++) {
        const val = i % 256;
        rawData[i * 4] = val;     // R
        rawData[i * 4 + 1] = val; // G
        rawData[i * 4 + 2] = val; // B
        rawData[i * 4 + 3] = 255; // A
      }

      const imageData = {
        width,
        height,
        data: rawData,
      };

      const binarized = applySauvolaThreshold(imageData, { windowSize: 7, k: 0.2, R: 128 });
      expect(binarized).toBeDefined();
      expect(binarized.data.length).toBe(pixelCount * 4);

      // All RGB pixels should now be either 0 (black) or 255 (white)
      for (let i = 0; i < pixelCount; i++) {
        const r = binarized.data[i * 4];
        expect(r === 0 || r === 255).toBe(true);
        expect(binarized.data[i * 4 + 3]).toBe(255);
      }
    });
  });

  describe("Marksheet Core Field Filtering & Truncation Recovery", () => {
    test("filterCoreMarksheetFields retains only name, board, school, year", () => {
      const dirty12th = {
        name: "Sanjeevsurya R",
        board: "State Board of Higher Secondary Examination",
        school: "Govt Hr Sec School",
        year: "2023",
        registerNumber: "7788991",
        stream: "Bio-Maths",
        month: "March",
        marksScored: "540",
        maxMarks: "600",
        percentage: "90%",
        grade: "A+",
        subjects: [
          { name: "Tamil", marks: 95 },
          { name: "English", marks: 90 },
        ],
      };

      const cleaned = filterCoreMarksheetFields(dirty12th);

      expect(cleaned.name).toBe("Sanjeevsurya R");
      expect(cleaned.board).toBe("State Board of Higher Secondary Examination");
      expect(cleaned.school).toBe("Govt Hr Sec School");
      expect(cleaned.year).toBe("2023");

      // Verify unwanted fields are stripped
      expect(cleaned.registerNumber).toBeUndefined();
      expect(cleaned.stream).toBeUndefined();
      expect(cleaned.month).toBeUndefined();
      expect(cleaned.marksScored).toBeUndefined();
      expect(cleaned.maxMarks).toBeUndefined();
      expect(cleaned.percentage).toBeUndefined();
      expect(cleaned.grade).toBeUndefined();
      expect(cleaned.subjects).toBeUndefined();
    });

    test("suggestOcrCorrections recovers 'njeevsurya' -> 'Sanjeevsurya'", () => {
      const res = suggestOcrCorrections("Njeevsurya R");
      expect(res.suggestedCorrection).toBe("Sanjeevsurya R");
    });

    test("cleanCandidateName normalizes and recovers truncated Tamil names", () => {
      const cleaned = cleanCandidateName("Njeevsurya R");
      expect(cleaned).toBe("Sanjeevsurya R");
    });
  });
});
