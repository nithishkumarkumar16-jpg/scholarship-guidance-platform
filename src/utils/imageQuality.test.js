import {
  analyzeImageQuality,
  analyzeCanvasQuality,
  calculateLaplacianVariance,
  getLuminance,
} from "./imageQuality";

describe("imageQuality", () => {
  test("computes correct luminance from RGB values", () => {
    expect(getLuminance(0, 0, 0)).toBe(0);
    expect(getLuminance(255, 255, 255)).toBeCloseTo(255, 1);
  });

  test("detects high sharpness on high-contrast checkerboard image data", () => {
    const width = 100;
    const height = 100;
    const grayscale = new Uint8Array(width * height);

    // Create high-contrast alternating pattern (edges)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        grayscale[y * width + x] = (x % 4 < 2) ^ (y % 4 < 2) ? 255 : 0;
      }
    }

    const variance = calculateLaplacianVariance(grayscale, width, height);
    expect(variance).toBeGreaterThan(500);
  });

  test("detects blur/low-variance on smooth gradient image data", () => {
    const width = 100;
    const height = 100;
    const grayscale = new Uint8Array(width * height);

    // Smooth uniform value
    for (let i = 0; i < width * height; i++) {
      grayscale[i] = 128;
    }

    const variance = calculateLaplacianVariance(grayscale, width, height);
    expect(variance).toBe(0);
  });

  test("flags very dark images and poor resolution in analyzeImageQuality", () => {
    const width = 200;
    const height = 200;
    const data = new Uint8ClampedArray(width * height * 4);

    // Very dark black image
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 10;     // R
      data[i + 1] = 10; // G
      data[i + 2] = 10; // B
      data[i + 3] = 255;
    }

    const result = analyzeImageQuality({ width, height, data }, 200, 200);
    expect(result.qualityLevel).toBe("poor");
    expect(result.issues.some(issue => issue.includes("dark") || issue.includes("resolution"))).toBe(true);
  });

  test("correctly scores high-resolution, clear, sharp document as good", () => {
    const width = 800;
    const height = 1000;
    const data = new Uint8ClampedArray(width * height * 4);

    // High quality document with white background and text patterns
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const isText = (y % 30 < 5) && (x % 10 < 5);
        const val = isText ? 20 : 240;
        data[idx] = val;
        data[idx + 1] = val;
        data[idx + 2] = val;
        data[idx + 3] = 255;
      }
    }

    // Original dimension is 1600x2000
    const result = analyzeImageQuality({ width, height, data }, 1600, 2000);
    expect(result.qualityLevel).toBe("good");
    expect(result.isReadable).toBe(true);
  });

  test("returns unknown level on invalid or null canvas instead of defaulting to fair", () => {
    const result = analyzeCanvasQuality(null);
    expect(result.qualityLevel).toBe("unknown");
    expect(result.issues.length).toBeGreaterThan(0);
  });
});
