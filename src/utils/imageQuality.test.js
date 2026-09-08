import { analyzeImageQuality, calculateLaplacianVariance, getLuminance } from "./imageQuality";

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

    const result = analyzeImageQuality({ width, height, data });
    expect(result.qualityLevel).toBe("poor");
    expect(result.issues.some(issue => issue.includes("dark") || issue.includes("resolution"))).toBe(true);
  });
});
