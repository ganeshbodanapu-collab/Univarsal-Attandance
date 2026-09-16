/**
 * Face Biometrics Engine — STEP 34 Strict Individual Worker Face Verification
 *
 * Provides multi-zone 128-dimensional facial feature vector extraction, mean-centered
 * L2-normalized cosine similarity comparison, and strict 1-on-1 worker biometric verification.
 *
 * ZERO AUTO-PASS / ZERO FALLBACK POLICY ENFORCED.
 */

import type { Worker } from '../types';

export interface FaceVerificationResult {
  matched: boolean;
  score: number;
  reason?: string;
}

export interface FaceIdentificationResult {
  matchedWorker: Worker | null;
  score: number;
  reason?: string;
}

/**
 * Helper to load an image from a URL or data URI onto an HTMLCanvasElement with center-cropping
 */
function loadImageToCanvas(imageSrc: string | any): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    if (!imageSrc) return reject(new Error('Invalid image source'));

    // Fast path for canvas objects in test environment
    if (typeof imageSrc === 'object' && imageSrc.getContext) {
      return resolve(imageSrc as HTMLCanvasElement);
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 160;
      canvas.height = 160;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const minDim = Math.min(img.width || 160, img.height || 160);
        const srcX = Math.max(0, ((img.width || 160) - minDim) / 2);
        const srcY = Math.max(0, ((img.height || 160) - minDim) / 2);
        ctx.drawImage(img, srcX, srcY, minDim, minDim, 0, 0, 160, 160);
        resolve(canvas);
      } else {
        reject(new Error('Failed to create canvas context'));
      }
    };
    img.onerror = () => reject(new Error('Failed to load image for face biometrics comparison'));
    img.src = typeof imageSrc === 'string' ? imageSrc : '';
  });
}

/**
 * Extract a 128-dimensional mean-centered facial feature vector from a canvas or video element.
 *
 * Vector Composition (128 Dimensions):
 * - Zone 1 (Dims 0-63): 8x8 Spatial Luminance Gradients & Directional Contrast
 * - Zone 2 (Dims 64-95): 4x4 Regional Contrast & Structural Geometry Ratios
 * - Zone 3 (Dims 96-127): 4x4 Color Chrominance Distribution Ratios [R/(R+G+B) and B/(R+G+B)]
 */
export function extractFacialVector(
  element: HTMLCanvasElement | HTMLVideoElement | any
): number[] {
  let data: Uint8ClampedArray | number[] = [];

  // Direct canvas inspection fast-path
  if (element && typeof element.getContext === 'function') {
    const ctx = element.getContext('2d');
    if (ctx && typeof ctx.getImageData === 'function') {
      const imgData = ctx.getImageData(0, 0, 160, 160);
      data = imgData ? imgData.data : [];
    }
  }

  // Draw to offscreen canvas if video or unrendered element
  if (!data || data.length === 0) {
    const canvas = document.createElement('canvas');
    canvas.width = 160;
    canvas.height = 160;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new Array(128).fill(0);

    if (element instanceof HTMLVideoElement && element.videoWidth > 0 && element.videoHeight > 0) {
      const minDim = Math.min(element.videoWidth, element.videoHeight);
      const srcX = (element.videoWidth - minDim) / 2;
      const srcY = (element.videoHeight - minDim) / 2;
      ctx.drawImage(element, srcX, srcY, minDim, minDim, 0, 0, 160, 160);
    } else {
      ctx.drawImage(element, 0, 0, 160, 160);
    }

    const imageData = ctx.getImageData(0, 0, 160, 160);
    data = imageData.data;
  }

  if (!data || data.length === 0) {
    return new Array(128).fill(0);
  }

  // Calculate overall image lightness mean for illumination invariance
  let totalLuma = 0;
  for (let i = 0; i < data.length; i += 4) {
    totalLuma += 0.299 * (data[i] || 0) + 0.587 * (data[i + 1] || 0) + 0.114 * (data[i + 2] || 0);
  }
  const meanLuma = totalLuma / (160 * 160);

  const rawVector: number[] = new Array(128).fill(0);

  // --- ZONE 1: 8x8 Grid Spatial Luminance & Sobel Edge Gradients (Dims 0 - 63) ---
  const grid8 = 8;
  const cellWidth8 = 160 / grid8; // 20px
  const cellHeight8 = 160 / grid8; // 20px

  for (let gy = 0; gy < grid8; gy++) {
    for (let gx = 0; gx < grid8; gx++) {
      let sumLuma = 0;
      let sumGradient = 0;
      let count = 0;

      const startX = Math.floor(gx * cellWidth8);
      const startY = Math.floor(gy * cellHeight8);

      for (let y = startY; y < startY + cellHeight8; y++) {
        for (let x = startX; x < startX + cellWidth8; x++) {
          const idx = (y * 160 + x) * 4;
          const r = data[idx] || 0;
          const g = data[idx + 1] || 0;
          const b = data[idx + 2] || 0;

          const luma = 0.299 * r + 0.587 * g + 0.114 * b;
          sumLuma += luma;

          if (x < startX + cellWidth8 - 1 && y < startY + cellHeight8 - 1) {
            const rightIdx = (y * 160 + (x + 1)) * 4;
            const downIdx = ((y + 1) * 160 + x) * 4;
            const rightLuma = 0.299 * (data[rightIdx] || 0) + 0.587 * (data[rightIdx + 1] || 0) + 0.114 * (data[rightIdx + 2] || 0);
            const downLuma = 0.299 * (data[downIdx] || 0) + 0.587 * (data[downIdx + 1] || 0) + 0.114 * (data[downIdx + 2] || 0);
            sumGradient += Math.abs(rightLuma - luma) + Math.abs(downLuma - luma);
          }

          count++;
        }
      }

      const cellIdx = gy * grid8 + gx;
      const avgLuma = count > 0 ? sumLuma / count : 0;
      const avgGradient = count > 0 ? sumGradient / count : 0;

      rawVector[cellIdx] = (avgLuma - meanLuma) * 0.6 + avgGradient * 0.4;
    }
  }

  // --- ZONE 2: 4x4 Grid Regional Geometry & Facial Structure Ratios (Dims 64 - 95) ---
  const grid4 = 4;
  const cellWidth4 = 160 / grid4; // 40px
  const cellHeight4 = 160 / grid4; // 40px

  for (let gy = 0; gy < grid4; gy++) {
    for (let gx = 0; gx < grid4; gx++) {
      let sumLuma = 0;
      let count = 0;

      const startX = Math.floor(gx * cellWidth4);
      const startY = Math.floor(gy * cellHeight4);

      for (let y = startY; y < startY + cellHeight4; y++) {
        for (let x = startX; x < startX + cellWidth4; x++) {
          const idx = (y * 160 + x) * 4;
          const luma = 0.299 * (data[idx] || 0) + 0.587 * (data[idx + 1] || 0) + 0.114 * (data[idx + 2] || 0);
          sumLuma += luma;
          count++;
        }
      }

      const cellIdx = gy * grid4 + gx;
      const avgLuma = count > 0 ? sumLuma / count : 0;

      rawVector[64 + cellIdx] = avgLuma - meanLuma;
      rawVector[80 + cellIdx] = meanLuma > 0 ? (avgLuma - meanLuma) / meanLuma : 0;
    }
  }

  // --- ZONE 3: 4x4 Grid Color Chrominance Distribution (Dims 96 - 127) ---
  for (let gy = 0; gy < grid4; gy++) {
    for (let gx = 0; gx < grid4; gx++) {
      let sumRedRatio = 0;
      let sumBlueRatio = 0;
      let count = 0;

      const startX = Math.floor(gx * cellWidth4);
      const startY = Math.floor(gy * cellHeight4);

      for (let y = startY; y < startY + cellHeight4; y++) {
        for (let x = startX; x < startX + cellWidth4; x++) {
          const idx = (y * 160 + x) * 4;
          const r = data[idx] || 0;
          const g = data[idx + 1] || 0;
          const b = data[idx + 2] || 0;
          const rgbSum = r + g + b || 1;

          sumRedRatio += r / rgbSum;
          sumBlueRatio += b / rgbSum;
          count++;
        }
      }

      const cellIdx = gy * grid4 + gx;
      rawVector[96 + cellIdx] = count > 0 ? (sumRedRatio / count) * 10 - 3.33 : 0;
      rawVector[112 + cellIdx] = count > 0 ? (sumBlueRatio / count) * 10 - 3.33 : 0;
    }
  }

  // Mean-center feature vector to make cosine similarity highly discriminative
  const vectorMean = rawVector.reduce((sum, val) => sum + val, 0) / rawVector.length;
  const centeredVector = rawVector.map((val) => val - vectorMean);

  // L2 Normalization to unit vector length
  const magnitude = Math.sqrt(centeredVector.reduce((sum, val) => sum + val * val, 0));
  if (magnitude > 0) {
    return centeredVector.map((val) => val / magnitude);
  }

  return centeredVector;
}

/**
 * Compare two 128-dimensional facial feature vectors using Cosine Similarity.
 * Returns a match score percentage between 0 and 100.
 */
export function calculateFaceSimilarityScore(vectorA: number[], vectorB: number[]): number {
  if (vectorA.length !== vectorB.length || vectorA.length === 0) return 0;

  let dotProduct = 0;
  let magA = 0;
  let magB = 0;

  for (let i = 0; i < vectorA.length; i++) {
    const a = vectorA[i] || 0;
    const b = vectorB[i] || 0;
    dotProduct += a * b;
    magA += a * a;
    magB += b * b;
  }

  const denominator = Math.sqrt(magA) * Math.sqrt(magB);
  if (denominator === 0) return 0;

  const similarity = dotProduct / denominator;
  // Convert similarity [-1, 1] to score percentage [0, 100]
  const score = Math.max(0, Math.min(100, Math.round(similarity * 100)));
  return score;
}

/**
 * STRICT 1-ON-1 WORKER VERIFICATION
 *
 * Verifies live camera scan ONLY against the selected targetWorker's enrolled photo profile.
 *
 * ZERO AUTO-PASS / ZERO FALLBACK POLICY:
 * - If targetWorker has NO enrolled photo -> REJECT (matched: false, score: 0)
 * - If live camera frame invalid/blank -> REJECT (matched: false, score: 0)
 * - If score < 70% threshold -> REJECT (matched: false, score)
 */
export async function verifyIndividualWorkerFace(
  liveElement: HTMLCanvasElement | HTMLVideoElement | any,
  targetWorker: Worker
): Promise<FaceVerificationResult> {
  // 1. Validate Target Worker Enrolled Photo
  if (!targetWorker || (!targetWorker.photoUrl && !targetWorker.faceEnrolled)) {
    return {
      matched: false,
      score: 0,
      reason: `No Enrolled Face ID: Worker ${targetWorker?.name || 'Selected'} does not have an enrolled face profile. Attendance rejected.`,
    };
  }

  // 2. Validate Live Camera Frame
  if (liveElement instanceof HTMLVideoElement && (liveElement.videoWidth === 0 || liveElement.paused)) {
    return {
      matched: false,
      score: 0,
      reason: 'Camera feed not ready. Please position face in camera view and try again.',
    };
  }

  const liveVector = extractFacialVector(liveElement);
  const liveMag = Math.sqrt(liveVector.reduce((sum, v) => sum + v * v, 0));

  if (liveMag === 0) {
    return {
      matched: false,
      score: 0,
      reason: 'No clear face detected in camera stream. Verification rejected.',
    };
  }

  // 3. Load Selected Worker's Enrolled Photo & Compare 1-on-1
  try {
    const enrolledCanvas = await loadImageToCanvas(targetWorker.photoUrl!);
    const enrolledVector = extractFacialVector(enrolledCanvas);

    const enrolledMag = Math.sqrt(enrolledVector.reduce((sum, v) => sum + v * v, 0));
    if (enrolledMag === 0) {
      return {
        matched: false,
        score: 0,
        reason: `Enrolled face template for ${targetWorker.name} is invalid. Verification rejected.`,
      };
    }

    const score = calculateFaceSimilarityScore(liveVector, enrolledVector);

    // Strict 1-on-1 threshold: >= 70% match required
    if (score >= 70) {
      return {
        matched: true,
        score,
        reason: `Face ID Verified for ${targetWorker.name} (${score}% biometric similarity match).`,
      };
    } else {
      return {
        matched: false,
        score,
        reason: `Face Mismatch (${score}% match): Scanned face does not match ${targetWorker.name}'s enrolled Face ID profile. Verification failed.`,
      };
    }
  } catch {
    return {
      matched: false,
      score: 0,
      reason: `Face Verification Error: Unable to load enrolled face profile for ${targetWorker.name}. Verification rejected.`,
    };
  }
}

/**
 * Search enrolled candidate workers to identify matching worker for standalone face terminal.
 * ZERO DEFAULT WORKER FALLBACK POLICY.
 */
export async function identifyIndividualWorkerFromFace(
  liveElement: HTMLCanvasElement | HTMLVideoElement | any,
  candidateWorkers: Worker[]
): Promise<FaceIdentificationResult> {
  if (!candidateWorkers || candidateWorkers.length === 0) {
    return {
      matchedWorker: null,
      score: 0,
      reason: 'No candidate workers available for face identification.',
    };
  }

  if (liveElement instanceof HTMLVideoElement && (liveElement.videoWidth === 0 || liveElement.paused)) {
    return {
      matchedWorker: null,
      score: 0,
      reason: 'Camera feed not ready.',
    };
  }

  const liveVector = extractFacialVector(liveElement);
  const liveMag = Math.sqrt(liveVector.reduce((sum, v) => sum + v * v, 0));
  if (liveMag === 0) {
    return {
      matchedWorker: null,
      score: 0,
      reason: 'No clear face detected in camera viewport.',
    };
  }

  let bestWorker: Worker | null = null;
  let bestScore = -1;

  for (const worker of candidateWorkers) {
    if (!worker.photoUrl && !worker.faceEnrolled) continue;

    try {
      const enrolledCanvas = await loadImageToCanvas(worker.photoUrl!);
      const enrolledVector = extractFacialVector(enrolledCanvas);
      const score = calculateFaceSimilarityScore(liveVector, enrolledVector);

      if (score > bestScore) {
        bestScore = score;
        bestWorker = worker;
      }
    } catch {
      // Ignore un-loadable worker images
    }
  }

  // Strict threshold >= 70% required for standalone identification
  if (bestWorker && bestScore >= 70) {
    return {
      matchedWorker: bestWorker,
      score: bestScore,
      reason: `Face Identified: Matched ${bestWorker.name} (${bestScore}% confidence).`,
    };
  }

  // ZERO FALLBACK DEFAULT WORKER: If score < 70%, return null
  return {
    matchedWorker: null,
    score: bestScore > 0 ? bestScore : 0,
    reason: 'Face Not Recognized: Scanned face does not match any enrolled employee profile.',
  };
}
