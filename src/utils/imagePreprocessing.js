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

  if (maxEdge < 2200) {
    // Upscale phone camera photos/scans to ~2400px on the long edge for crisp character edges in Tesseract (300 DPI equivalent)
    scale = Math.min(2.5, 2400 / maxEdge);
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
 * Calculates optimal Otsu threshold for binarization to strip security watermarks and guilloche patterns.
 */
export function computeOtsuThreshold(grayscale, totalPixels) {
  const hist = new Int32Array(256);
  for (let i = 0; i < totalPixels; i++) {
    hist[grayscale[i]]++;
  }

  let sum = 0;
  for (let t = 0; t < 256; t++) sum += t * hist[t];

  let sumB = 0;
  let wB = 0;
  let wF = 0;
  let varMax = 0;
  let threshold = 128;

  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    wF = totalPixels - wB;
    if (wF === 0) break;

    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;

    const betweenVar = wB * wF * (mB - mF) * (mB - mF);
    if (betweenVar > varMax) {
      varMax = betweenVar;
      threshold = t;
    }
  }

  // Bound threshold within safe document range
  return Math.max(60, Math.min(200, threshold));
}

/**
 * Expands bounding box margins by padX (12-16px, default 16) horizontally
 * and padY (6px) vertically to ensure initial capital strokes and margins are not clipped.
 * 
 * @param {Object} bbox Bounding box with x0, y0, x1, y1 (or left, top, right, bottom)
 * @param {number} [padX=16] Horizontal padding expansion in pixels (12-16px)
 * @param {number} [padY=6] Vertical padding expansion in pixels (6px)
 * @param {number} [maxW=Infinity] Canvas boundary width
 * @param {number} [maxH=Infinity] Canvas boundary height
 * @returns {Object} Expanded bounding box { x0, y0, x1, y1, width, height }
 */
export function expandBoundingBox(bbox, padX = 16, padY = 6, maxW = Infinity, maxH = Infinity) {
  if (!bbox) return null;

  let pX = 16;
  let pY = 6;
  let mW = Infinity;
  let mH = Infinity;

  if (typeof padX === "object" && padX !== null) {
    pX = typeof padX.padX === "number" ? padX.padX : 16;
    pY = typeof padX.padY === "number" ? padX.padY : 6;
    mW = typeof padX.maxW === "number" ? padX.maxW : (typeof padX.width === "number" ? padX.width : Infinity);
    mH = typeof padX.maxH === "number" ? padX.maxH : (typeof padX.height === "number" ? padX.height : Infinity);
  } else if (typeof padX === "number" && typeof padY === "number" && maxW === Infinity && (padX > 50 || padY > 50)) {
    // Called as expandBoundingBox(bbox, maxW, maxH)
    mW = padX;
    mH = padY;
    pX = 16;
    pY = 6;
  } else {
    pX = typeof padX === "number" ? padX : 16;
    pY = typeof padY === "number" ? padY : 6;
    mW = typeof maxW === "number" ? maxW : Infinity;
    mH = typeof maxH === "number" ? maxH : Infinity;
  }

  let rawX0 = bbox.x0 !== undefined ? bbox.x0 : (bbox.x !== undefined ? bbox.x : (bbox.left !== undefined ? bbox.left : 0));
  let rawY0 = bbox.y0 !== undefined ? bbox.y0 : (bbox.y !== undefined ? bbox.y : (bbox.top !== undefined ? bbox.top : 0));
  let rawW = bbox.width !== undefined ? bbox.width : (bbox.w !== undefined ? bbox.w : 0);
  let rawH = bbox.height !== undefined ? bbox.height : (bbox.h !== undefined ? bbox.h : 0);

  // Normalized (0.0 - 1.0) coordinates conversion
  if (rawX0 <= 1 && rawY0 <= 1 && rawW <= 1 && rawH <= 1 && mW !== Infinity && mH !== Infinity) {
    rawX0 = rawX0 * mW;
    rawY0 = rawY0 * mH;
    rawW = rawW * mW;
    rawH = rawH * mH;
  }

  let rawX1 = bbox.x1 !== undefined ? bbox.x1 : (bbox.right !== undefined ? bbox.right : (rawX0 + rawW));
  let rawY1 = bbox.y1 !== undefined ? bbox.y1 : (bbox.bottom !== undefined ? bbox.bottom : (rawY0 + rawH));

  const x0 = Math.max(0, rawX0 - pX);
  const y0 = Math.max(0, rawY0 - pY);
  const x1 = Math.min(mW, rawX1 + pX);
  const y1 = Math.min(mH, rawY1 + pY);

  const roundedX0 = Math.round(x0);
  const roundedY0 = Math.round(y0);
  const roundedX1 = Math.round(x1);
  const roundedY1 = Math.round(y1);

  return {
    x0: roundedX0,
    y0: roundedY0,
    x1: roundedX1,
    y1: roundedY1,
    x: roundedX0,
    y: roundedY0,
    width: Math.max(1, Math.round(roundedX1 - roundedX0)),
    height: Math.max(1, Math.round(roundedY1 - roundedY0)),
  };
}

/**
 * Extracts a region of interest from canvas with expanded padding (12-16px horizontal, 6px vertical).
 * 
 * @param {HTMLCanvasElement} canvas Source canvas
 * @param {Object} bbox Target bounding box
 * @param {number} [padX=16] Horizontal expansion
 * @param {number} [padY=6] Vertical expansion
 * @returns {HTMLCanvasElement} Cropped canvas with preserved margins
 */
export function cropCanvasBoundingBox(canvas, bbox, padX = 16, padY = 6) {
  if (!canvas || !bbox) return canvas;
  const exp = expandBoundingBox(bbox, padX, padY, canvas.width, canvas.height);
  if (typeof document === "undefined" || !document.createElement) {
    return { ...exp, canvas };
  }

  const cropCanvas = document.createElement("canvas");
  cropCanvas.width = exp.width;
  cropCanvas.height = exp.height;
  const ctx = cropCanvas.getContext ? cropCanvas.getContext("2d", { willReadFrequently: true }) : null;
  if (ctx && typeof ctx.drawImage === "function") {
    ctx.drawImage(
      canvas,
      exp.x0, exp.y0, exp.width, exp.height,
      0, 0, exp.width, exp.height
    );
  }
  return cropCanvas;
}

/**
 * Sauvola local adaptive thresholding with edge-preserving contrast adjustment.
 * Prevents thin capital character stroke erosion (e.g., initial 'S' in marksheet names).
 * Formula: T(x, y) = m(x, y) * (1 + k * (s(x, y) / R - 1))
 * where m is local mean, s is standard deviation, R = 128, k = 0.2
 * 
 * Supports both grayscale Uint8Array and ImageData objects.
 * 
 * @param {Uint8Array|ImageData} grayscaleOrImageData Grayscale pixel array or ImageData
 * @param {number|Object} width Image width or options object when ImageData is provided
 * @param {number} [height] Image height
 * @param {number} [windowRadius=12] Half-window size
 * @param {number} [k=0.2] Sensitivity parameter (0.2 preserves thin letter strokes)
 * @returns {Uint8Array|ImageData} Binarized byte array or modified ImageData
 */
export function applySauvolaThreshold(grayscaleOrImageData, width, height, windowRadius = 12, k = 0.2) {
  let grayscale;
  let isImageData = false;
  let w = width;
  let h = height;
  let winRad = windowRadius;
  let sensK = k;

  if (grayscaleOrImageData && grayscaleOrImageData.data && grayscaleOrImageData.width) {
    isImageData = true;
    w = grayscaleOrImageData.width;
    h = grayscaleOrImageData.height;
    const rgba = grayscaleOrImageData.data;
    const totalPixels = w * h;
    grayscale = new Uint8Array(totalPixels);
    for (let i = 0; i < totalPixels; i++) {
      grayscale[i] = Math.round(0.299 * rgba[i * 4] + 0.587 * rgba[i * 4 + 1] + 0.114 * rgba[i * 4 + 2]);
    }
    if (typeof width === "object" && width !== null) {
      winRad = width.windowRadius ?? (width.windowSize ? Math.max(3, Math.floor(width.windowSize / 2)) : 12);
      sensK = width.k ?? 0.2;
    }
  } else {
    grayscale = grayscaleOrImageData;
  }

  const total = w * h;
  const output = new Uint8Array(total);

  const integW = w + 1;
  const integH = h + 1;
  const integSize = integW * integH;
  const I = new Float64Array(integSize);
  const I2 = new Float64Array(integSize);

  for (let y = 0; y < h; y++) {
    const rowOff = y * w;
    const integRowOff = (y + 1) * integW;
    const prevIntegRowOff = y * integW;
    let rowSum = 0;
    let rowSumSq = 0;
    for (let x = 0; x < w; x++) {
      const val = grayscale[rowOff + x];
      rowSum += val;
      rowSumSq += val * val;
      I[integRowOff + (x + 1)] = I[prevIntegRowOff + (x + 1)] + rowSum;
      I2[integRowOff + (x + 1)] = I2[prevIntegRowOff + (x + 1)] + rowSumSq;
    }
  }

  const R = 128;

  for (let y = 0; y < h; y++) {
    const y1 = Math.max(0, y - winRad);
    const y2 = Math.min(h - 1, y + winRad);
    const rowOff = y * w;

    for (let x = 0; x < w; x++) {
      const x1 = Math.max(0, x - winRad);
      const x2 = Math.min(w - 1, x + winRad);

      const count = (x2 - x1 + 1) * (y2 - y1 + 1);

      const brIdx = (y2 + 1) * integW + (x2 + 1);
      const blIdx = (y2 + 1) * integW + x1;
      const trIdx = y1 * integW + (x2 + 1);
      const tlIdx = y1 * integW + x1;

      const sum = I[brIdx] - I[blIdx] - I[trIdx] + I[tlIdx];
      const sumSq = I2[brIdx] - I2[blIdx] - I2[trIdx] + I2[tlIdx];

      const mean = sum / count;
      const variance = Math.max(0, (sumSq / count) - (mean * mean));
      const std = Math.sqrt(variance);

      const thresh = mean * (1 + sensK * ((std / R) - 1));
      const pixelVal = grayscale[rowOff + x];

      output[rowOff + x] = pixelVal < thresh ? 0 : 255;
    }
  }

  if (isImageData) {
    const rgba = grayscaleOrImageData.data;
    for (let i = 0; i < total; i++) {
      const v = output[i];
      rgba[i * 4] = v;
      rgba[i * 4 + 1] = v;
      rgba[i * 4 + 2] = v;
      rgba[i * 4 + 3] = 255;
    }
    return grayscaleOrImageData;
  }

  return output;
}

/**
 * Preprocesses an image or canvas for Tesseract.js OCR with selectable variant:
 * - "contrast" (Variant A/B: Grayscale + normalized contrast stretch)
 * - "sharpened" (Variant C: Grayscale + unsharp mask filter)
 * - "binarized" / "adaptive" (Variant D: Adaptive Sauvola thresholding to preserve initial capital strokes)
 * 
 * @param {HTMLCanvasElement|ImageBitmap} source
 * @param {Object} [qualityAssessment] Output from analyzeImageQuality
 * @param {string} [variant="contrast"] Preprocessing variant
 * @returns {HTMLCanvasElement} Preprocessed canvas ready for OCR
 */
export function preprocessCanvasForOCR(source, qualityAssessment = null, variant = "contrast") {
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

  // If variant is "original", return clean scaled canvas without grayscale/contrast modifications
  if (variant === "original") {
    return canvas;
  }

  // Quality metrics assessment
  const isBlurry = qualityAssessment && qualityAssessment.sharpnessScore < 60;
  const isDark = qualityAssessment && qualityAssessment.brightnessScore < 60;
  const isWashedOut = qualityAssessment && qualityAssessment.avgBrightness > 220;
  const isLowContrast = qualityAssessment && qualityAssessment.contrastScore < 50;

  // 1. Grayscale conversion + contrast stretch
  const grayscale = new Uint8Array(totalPixels);
  let contrastFactor = 1.20;
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

  let finalGray = grayscale;

  // Variant handling
  if (variant === "normalized" || variant === "norm") {
    // PASS E: Adaptive background illumination normalization
    // Eliminates uneven lighting, shadows, and horizontal/vertical gradients
    const gridStep = 40;
    const gridW = Math.max(2, Math.ceil(size.width / gridStep));
    const gridH = Math.max(2, Math.ceil(size.height / gridStep));
    const bgGrid = new Float32Array(gridW * gridH);

    for (let gy = 0; gy < gridH; gy++) {
      for (let gx = 0; gx < gridW; gx++) {
        const startX = gx * gridStep;
        const endX = Math.min(size.width, startX + gridStep);
        const startY = gy * gridStep;
        const endY = Math.min(size.height, startY + gridStep);
        let sum = 0, count = 0;
        for (let y = startY; y < endY; y += 4) {
          const rowOff = y * size.width;
          for (let x = startX; x < endX; x += 4) {
            sum += grayscale[rowOff + x];
            count++;
          }
        }
        bgGrid[gy * gridW + gx] = count > 0 ? (sum / count) : 128;
      }
    }

    const normalized = new Uint8Array(totalPixels);
    for (let y = 0; y < size.height; y++) {
      const gy = Math.min(gridH - 1, Math.floor(y / gridStep));
      const rowOff = y * size.width;
      for (let x = 0; x < size.width; x++) {
        const gx = Math.min(gridW - 1, Math.floor(x / gridStep));
        const bgVal = Math.max(15, bgGrid[gy * gridW + gx]);
        const val = Math.min(255, Math.max(0, Math.round((grayscale[rowOff + x] / bgVal) * 200)));
        normalized[rowOff + x] = val;
      }
    }
    finalGray = normalized;
  } else if (variant === "binarized" || variant === "adaptive" || variant === "sauvola") {
    // PASS D: Adaptive Sauvola thresholding with edge-preserving contrast adjustment
    // Prevents thin capital character stroke erosion (e.g., initial 'S' in marksheet names)
    finalGray = applySauvolaThreshold(grayscale, size.width, size.height, 12, 0.2);
  } else if (variant === "sharpened" || isBlurry) {
    // PASS C: 3x3 unsharp mask sharpening
    if (size.width >= 100 && size.height >= 100) {
      const sharpened = new Uint8Array(totalPixels);
      sharpened.set(grayscale);
      const sharpenKernel = [
         0, -0.6,  0,
        -0.6, 3.4, -0.6,
         0, -0.6,  0
      ];
      applyConvolution3x3(grayscale, sharpened, size.width, size.height, sharpenKernel);
      finalGray = sharpened;
    }
  }

  // Write back to ImageData as monochrome RGB
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

/**
 * Applies single-pass adaptive enhancement to recover low-quality (FAIR or POOR) scans.
 * Uses adaptive contrast stretching and subtle sharpening.
 * 
 * @param {HTMLCanvasElement|ImageBitmap} source
 * @param {Object} [qualityAssessment]
 * @returns {HTMLCanvasElement}
 */
export function enhanceLowQualityCanvas(source, qualityAssessment = null) {
  const isBlurry = qualityAssessment && qualityAssessment.sharpnessScore < 60;
  const isDark = qualityAssessment && qualityAssessment.brightnessScore < 60;
  const isLowContrast = qualityAssessment && qualityAssessment.contrastScore < 50;

  if (isBlurry) {
    return preprocessCanvasForOCR(source, qualityAssessment, "sharpened");
  } else if (isDark || isLowContrast) {
    return preprocessCanvasForOCR(source, qualityAssessment, "contrast");
  }
  // Default to contrast enhancement for recovery
  return preprocessCanvasForOCR(source, qualityAssessment, "contrast");
}

/**
 * Generates multi-pass canvas variants for high-accuracy marksheet OCR:
 * 1. original: Original high-resolution render (clean, unprocessed)
 * 2. contrast / standard: Grayscale + normalized contrast
 * 3. sharpened: Unsharp mask sharpened
 * 4. binarized: Clean Otsu thresholded black-and-white
 * 5. normalized: Illumination-normalized
 */
export function getPreprocessingVariants(source, qualityAssessment = null) {
  return {
    original: preprocessCanvasForOCR(source, qualityAssessment, "original"),
    standard: preprocessCanvasForOCR(source, qualityAssessment, "contrast"),
    contrast: preprocessCanvasForOCR(source, qualityAssessment, "contrast"),
    sharpened: preprocessCanvasForOCR(source, qualityAssessment, "sharpened"),
    binarized: preprocessCanvasForOCR(source, qualityAssessment, "binarized"),
    normalized: preprocessCanvasForOCR(source, qualityAssessment, "normalized"),
  };
}

/**
 * Selects the most beneficial single-pass preprocessing profile for a given scan quality.
 * Avoids aggressive thresholding on clean documents while aiding degraded ones.
 */
export function selectPreprocessingProfile(qualityAssessment) {
  if (!qualityAssessment) return "contrast";
  if (qualityAssessment.sharpnessScore < 60) return "sharpened";
  if (qualityAssessment.avgBrightness < 60 || qualityAssessment.contrastScore < 50) return "contrast";
  if (qualityAssessment.avgBrightness > 220) return "binarized";
  return "contrast";
}

/**
 * Rotates a canvas by 90, 180, or 270 degrees.
 * 
 * @param {HTMLCanvasElement} canvas
 * @param {number} degrees 0, 90, 180, or 270
 * @returns {HTMLCanvasElement}
 */
export function rotateCanvas(canvas, degrees) {
  const normDeg = ((degrees % 360) + 360) % 360;
  if (normDeg === 0 || !canvas) return canvas;

  const target = document.createElement("canvas");

  if (normDeg === 90 || normDeg === 270) {
    target.width = canvas.height;
    target.height = canvas.width;
  } else {
    target.width = canvas.width;
    target.height = canvas.height;
  }

  try {
    const ctx = target.getContext("2d");
    if (ctx) {
      ctx.translate(target.width / 2, target.height / 2);
      ctx.rotate((normDeg * Math.PI) / 180);
      ctx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
    }
  } catch (e) {
    // jsdom fallback
  }

  return target;
}

/**
 * Corrects small skew angles (-10° to +10°) without clipping document borders.
 * 
 * @param {HTMLCanvasElement} canvas
 * @param {number} angleDegrees Skew angle in degrees
 * @returns {HTMLCanvasElement}
 */
export function deskewCanvas(canvas, angleDegrees) {
  if (!canvas || !angleDegrees || Math.abs(angleDegrees) < 0.2) return canvas;

  const clampedAngle = Math.max(-10, Math.min(10, angleDegrees));
  const rad = (clampedAngle * Math.PI) / 180;

  const target = document.createElement("canvas");
  target.width = canvas.width;
  target.height = canvas.height;

  try {
    const ctx = target.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, target.width, target.height);
      ctx.translate(target.width / 2, target.height / 2);
      ctx.rotate(rad);
      ctx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
    }
  } catch (e) {
    // jsdom fallback
  }

  return target;
}

/**
 * Frees canvas memory by clearing dimensions and buffer.
 * 
 * @param {HTMLCanvasElement} canvas
 */
export function cleanupCanvas(canvas) {
  if (!canvas) return;
  try {
    canvas.width = 0;
    canvas.height = 0;
  } catch (e) {
    // Memory cleanup safeguard
  }
}



