import * as faceapi from '@vladmandic/face-api';
import type { WorkerFaceProfile } from './data/faceProfiles';

let isModelsLoaded = false;
let modelsLoadingPromise: Promise<boolean> | null = null;

export interface FaceDetectionResult {
  faceCount: number;
  descriptor?: number[];
  box?: { x: number; y: number; width: number; height: number };
  score?: number;
  errorMessage?: string;
}

export interface FaceMatchResult {
  workerId: string;
  distance: number;
  confidence: number; // percentage 0-100
}

/**
 * Load face-api recognition and landmark models from public /models directory
 */
export async function loadFaceApiModels(modelsPath = '/models'): Promise<boolean> {
  if (isModelsLoaded) return true;
  if (modelsLoadingPromise) return modelsLoadingPromise;

  modelsLoadingPromise = (async () => {
    try {
      console.log(`[FaceRecognitionEngine] Loading models from ${modelsPath}...`);
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri(modelsPath),
        faceapi.nets.faceLandmark68Net.loadFromUri(modelsPath),
        faceapi.nets.faceRecognitionNet.loadFromUri(modelsPath),
      ]);
      isModelsLoaded = true;
      console.log('[FaceRecognitionEngine] ✅ All Face API models loaded successfully!');
      return true;
    } catch (err) {
      console.warn('[FaceRecognitionEngine] Fallback loading models from jsDelivr CDN:', err);
      try {
        const cdnPath = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(cdnPath),
          faceapi.nets.faceLandmark68Net.loadFromUri(cdnPath),
          faceapi.nets.faceRecognitionNet.loadFromUri(cdnPath),
        ]);
        isModelsLoaded = true;
        console.log('[FaceRecognitionEngine] ✅ Face API models loaded from CDN!');
        return true;
      } catch (cdnErr: any) {
        console.error('[FaceRecognitionEngine] ❌ Model loading failed:', cdnErr);
        modelsLoadingPromise = null;
        return false;
      }
    }
  })();

  return modelsLoadingPromise;
}

/**
 * Detect faces in an HTMLVideoElement, HTMLCanvasElement, or HTMLImageElement
 */
export async function detectSingleFace(
  input: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement
): Promise<FaceDetectionResult> {
  const isLoaded = await loadFaceApiModels();
  if (!isLoaded) {
    return { faceCount: 0, errorMessage: 'Face recognition models not ready.' };
  }

  try {
    const detections = await faceapi
      .detectAllFaces(input, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
      .withFaceLandmarks()
      .withFaceDescriptors();

    if (!detections || detections.length === 0) {
      return { faceCount: 0, errorMessage: 'No face detected. Please position your face inside frame.' };
    }

    if (detections.length > 1) {
      return {
        faceCount: detections.length,
        errorMessage: 'Multiple faces detected! Please keep only one face inside camera.',
      };
    }

    const single = detections[0];
    const box = single.detection.box;

    if (box.width < 80 || box.height < 80) {
      return {
        faceCount: 1,
        errorMessage: 'Face too small. Please move closer to the camera.',
      };
    }

    return {
      faceCount: 1,
      descriptor: Array.from(single.descriptor),
      box: { x: box.x, y: box.y, width: box.width, height: box.height },
      score: single.detection.score,
    };
  } catch (err: any) {
    return { faceCount: 0, errorMessage: `Face analysis error: ${err.message || String(err)}` };
  }
}

/**
 * Compare target descriptor against enrolled face profiles using Euclidean distance
 * Default Match Threshold: 0.55 (Values < 0.55 represent strong match of same person)
 */
export function matchFaceDescriptor(
  targetDescriptor: number[],
  enrolledProfiles: WorkerFaceProfile[],
  matchThreshold = 0.55
): FaceMatchResult | null {
  if (!targetDescriptor || targetDescriptor.length !== 128 || !enrolledProfiles || enrolledProfiles.length === 0) {
    return null;
  }

  const matches: Array<{ workerId: string; distance: number }> = [];

  for (const profile of enrolledProfiles) {
    if (!profile.isActive || !profile.faceTemplate || profile.faceTemplate.length !== 128) {
      continue;
    }
    const dist = faceapi.euclideanDistance(targetDescriptor, profile.faceTemplate);
    matches.push({ workerId: profile.workerId, distance: dist });
  }

  if (matches.length === 0) return null;

  // Sort by lowest distance (best match first)
  matches.sort((a, b) => a.distance - b.distance);
  const best = matches[0];

  // Reject weak matches above recognition threshold
  if (best.distance > matchThreshold) {
    console.log(`[FaceEngine] Best match distance ${best.distance.toFixed(3)} exceeds threshold ${matchThreshold}. Rejected.`);
    return null;
  }

  // Reject ambiguous multiple matches if second best match is too close to best match
  if (matches.length > 1) {
    const secondBest = matches[1];
    if (secondBest.distance - best.distance < 0.05) {
      console.warn(`[FaceEngine] Ambiguous match! Best: ${best.distance.toFixed(3)}, 2nd: ${secondBest.distance.toFixed(3)}. Rejected.`);
      return null;
    }
  }

  // Calculate confidence percentage (Distance 0 = 100%, Distance 0.55 = 65%)
  const confidence = Math.round(Math.max(0, Math.min(100, (1 - best.distance / 0.85) * 100)));

  return {
    workerId: best.workerId,
    distance: best.distance,
    confidence,
  };
}
