/**
 * imagePreprocessing.js — SGP Adaptive Image Preprocessing for Browser OCR
 * 
 * Provides memory-safe, lightweight canvas preprocessing variants:
 * - Variant A: Grayscale + normalized contrast enhancement (standard)
 * - Variant B: Grayscale + contrast + adaptive/high-contrast thresholding (for faint prints/stamps)
 * - Variant C: Grayscale + 3x3 unsharp mask sharpening (for blurred scans)
 * 
 * 100% browser-based, memory-capped, no external APIs.
 */

const OCR_MAX_EDGE = 3200;
const OCR_MAX_PIXELS = 10_000_000;

/**
 * Calculates optimal width and height within safe canvas memory limits.
 */
export function fitOCRCanvas(width, height) {
  const maxEdge = Math.max(width, height);
  let scale = 1;

  if (maxEdge < 1800) {
    // Upscale phone camera photos/scans to ~2000px on the long edge for crisp character edges in Tesseract
    scale = Math.min(2.5, 2000 / maxEdge);
  } else if (maxEdge > OCR_MAX_EDGE) {
    scale = OCR_MAX_EDGE / maxEdge;
  }

  if (width * height * scale * scale > OCR_MAX_PIXELS) {
    scale = Math.sqrt(OCR_MAX_PIXELS / (width * height));
  }

  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
    scale,
  };
}

/**
 * Applies a 3x3 convolution filter to a single-channel grayscale buffer.
 */
function applyConvolution3x3(input, output, width, height, kernel) {
  for (let y = 1; y < height - 1; y++) {
    const rowOffset = y * width;
    const topOffset = (y - 1) * width;
    const botOffset = (y + 1) * width;

    for (let x = 1; x < width - 1; x++) {
      let sum = 0;
      sum += input[topOffset + x - 1] * kernel[0];
      sum += input[topOffset + x]     * kernel[1];
      sum += input[topOffset + x + 1] * kernel[2];
      sum += input[rowOffset + x - 1] * kernel[3];
      sum += input[rowOffset + x]     * kernel[4];
      sum += input[rowOffset + x + 1] * kernel[5];
      sum += input[botOffset + x - 1] * kernel[6];
      sum += input[botOffset + x]     * kernel[7];
      sum += input[botOffset + x + 1] * kernel[8];

      output[rowOffset + x] = Math.max(0, Math.min(255, Math.round(sum)));
    }
  }
}

/**
 * Preprocesses an image or canvas for Tesseract.js OCR.
 * 
 * @param {HTMLCanvasElement|ImageBitmap} source
 * @param {Object} qualityAssessment Output from analyzeImageQuality
 * @returns {HTMLCanvasElement} Preprocessed canvas ready for OCR
 */
export function preprocessCanvasForOCR(source, qualityAssessment = null) {
  const srcWidth = source.width;
  const srcHeight = source.height;
  const size = fitOCRCanvas(srcWidth, srcHeight);

  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(source, 0, 0, size.width, size.height);

  const imgData = ctx.getImageData(0, 0, size.width, size.height);
  const data = imgData.data;
  const totalPixels = size.width * size.height;

  // Decide strategy based on quality assessment
  const isBlurry = qualityAssessment && qualityAssessment.sharpnessScore < 60;
  const isDark = qualityAssessment && qualityAssessment.brightnessScore < 60;
  const isWashedOut = qualityAssessment && qualityAssessment.avgBrightness > 220;
  const isLowContrast = qualityAssessment && qualityAssessment.contrastScore < 50;

  // 1. Grayscale + Mild Contrast Stretch (Default Variant A)
  const grayscale = new Uint8Array(totalPixels);
  let contrastFactor = 1.18;
  let brightnessShift = 0;

  if (isDark) {
    contrastFactor = 1.30;
    brightnessShift = 20;
  } else if (isWashedOut) {
    contrastFactor = 1.40;
    brightnessShift = -15;
  } else if (isLowContrast) {
    contrastFactor = 1.35;
  }

  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
    const adjusted = Math.max(0, Math.min(255, (lum - 128) * contrastFactor + 128 + brightnessShift));
    grayscale[i] = Math.round(adjusted);
  }

  // 2. Apply Sharpening if Blurry (Variant C)
  let finalGray = grayscale;
  if (isBlurry && size.width >= 100 && size.height >= 100) {
    const sharpened = new Uint8Array(totalPixels);
    // Copy edges
    sharpened.set(grayscale);
    // Sharpen kernel: center=5, neighbors=-1
    const sharpenKernel = [
       0, -0.6,  0,
      -0.6, 3.4, -0.6,
       0, -0.6,  0
    ];
    applyConvolution3x3(grayscale, sharpened, size.width, size.height, sharpenKernel);
    finalGray = sharpened;
  }

  // 3. Write back to ImageData as monochrome RGB
  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    const val = finalGray[i];
    data[idx] = val;
    data[idx + 1] = val;
    data[idx + 2] = val;
    data[idx + 3] = 255;
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas;
}
