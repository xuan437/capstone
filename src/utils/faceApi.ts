import * as faceapi from 'face-api.js';

// Cache loaded state to avoid redundant network/memory operations
let modelsLoaded = false;
let modelsLoadingPromise: Promise<boolean> | null = null;

// Primary local path (from Vite public/models) and fallback CDN
const LOCAL_MODELS_PATH = '/models';
const CDN_MODELS_PATH = 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights';

export interface FaceMatchResult {
  isMatch: boolean;
  distance: number;
  confidence: number; // 0 - 100%
  threshold: number;
  label?: string;
}

export interface PhotoFaceValidation {
  isValid: boolean;
  faceCount: number;
  message: string;
  descriptor?: Float32Array;
  detectionBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

/**
 * Loads face-api.js neural network models from local public/models directory,
 * falling back to jsDelivr CDN if local files cannot be reached.
 */
export async function loadFaceApiModels(): Promise<boolean> {
  if (modelsLoaded) return true;
  if (modelsLoadingPromise) return modelsLoadingPromise;

  modelsLoadingPromise = (async () => {
    // Load only 3 essential models: TinyFaceDetector + Landmarks + Recognition
    // Skipping ssdMobilenetv1 (heavy, ~6 MB) and faceExpressionNet (not needed)
    const REQUIRED_MODELS = [
      (path: string) => faceapi.nets.tinyFaceDetector.loadFromUri(path),
      (path: string) => faceapi.nets.faceLandmark68Net.loadFromUri(path),
      (path: string) => faceapi.nets.faceRecognitionNet.loadFromUri(path),
    ];
    try {
      console.log('[FaceAPI] Loading 3 essential models from local path:', LOCAL_MODELS_PATH);
      await Promise.all(REQUIRED_MODELS.map(fn => fn(LOCAL_MODELS_PATH)));
      modelsLoaded = true;
      console.log('[FaceAPI] Essential models loaded successfully from local storage.');
      return true;
    } catch (localErr) {
      console.warn('[FaceAPI] Failed to load models locally, attempting CDN fallback:', localErr);
      try {
        await Promise.all(REQUIRED_MODELS.map(fn => fn(CDN_MODELS_PATH)));
        modelsLoaded = true;
        console.log('[FaceAPI] Essential models loaded successfully from CDN fallback.');
        return true;
      } catch (cdnErr) {
        console.error('[FaceAPI] Failed to load models from both local and CDN sources:', cdnErr);
        modelsLoadingPromise = null;
        throw new Error('Unable to load facial recognition neural networks. Please check internet connection.');
      }
    }
  })();

  return modelsLoadingPromise;
}

/**
 * Helper to turn an image source (data URL, base64, or regular URL) into an HTMLImageElement
 */
export function createHtmlImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(new Error('Failed to load image element: ' + err));
    img.src = src;
  });
}

// In-memory cache for reference photos descriptors to avoid re-extracting each frame
const descriptorCache = new Map<string, Float32Array | null>();

/**
 * Extracts a 128-dimensional biometric face descriptor from a photo URL or Base64 string.
 */
export async function extractDescriptorFromPhoto(photoUrl: string): Promise<Float32Array | null> {
  if (!photoUrl) return null;
  if (descriptorCache.has(photoUrl)) {
    return descriptorCache.get(photoUrl) || null;
  }

  await loadFaceApiModels();
  try {
    const img = await createHtmlImage(photoUrl);

    // Use TinyFaceDetector (fast, ~190 KB) — sufficient for reference photo extraction
    let detection = await faceapi
      .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.3 }))
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (detection && detection.descriptor) {
      descriptorCache.set(photoUrl, detection.descriptor);
      return detection.descriptor;
    }

    // Retry with lower threshold for low-res or poorly-lit photos
    detection = await faceapi
      .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.2 }))
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (detection && detection.descriptor) {
      descriptorCache.set(photoUrl, detection.descriptor);
      return detection.descriptor;
    }

    descriptorCache.set(photoUrl, null);
    return null;
  } catch (err) {
    console.error('[FaceAPI] Error extracting face descriptor:', err);
    return null;
  }
}

/**
 * Validates a voter or candidate photo (e.g. during Registration or Profile upload).
 * Checks that exactly one clear human face is detected.
 */
export async function validatePhotoFaceQuality(photoUrlOrBase64: string): Promise<PhotoFaceValidation> {
  await loadFaceApiModels();

  try {
    const img = await createHtmlImage(photoUrlOrBase64);

    // Detect all faces in photo to check for group photos
    const detections = await faceapi
      .detectAllFaces(img, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.4 }))
      .withFaceLandmarks()
      .withFaceDescriptors();

    if (detections.length === 0) {
      return {
        isValid: false,
        faceCount: 0,
        message: 'No face detected in photo. Please upload a clear, front-facing portrait.',
      };
    }

    if (detections.length > 1) {
      return {
        isValid: false,
        faceCount: detections.length,
        message: `Multiple faces detected (${detections.length}). The photo must contain only the student voter.`,
      };
    }

    const single = detections[0];
    const box = single.detection.box;

    return {
      isValid: true,
      faceCount: 1,
      message: 'Single clear face detected. Quality check passed!',
      descriptor: single.descriptor,
      detectionBox: {
        x: Math.round(box.x),
        y: Math.round(box.y),
        width: Math.round(box.width),
        height: Math.round(box.height),
      },
    };
  } catch (err: any) {
    return {
      isValid: false,
      faceCount: 0,
      message: `Failed to analyze photo: ${err?.message || 'Unknown error'}`,
    };
  }
}

/**
 * Detects live face from a webcam video element.
 * Uses lightweight TinyFaceDetector with 68 landmarks & expressions for smooth UI response.
 */
export async function detectSingleFaceFromVideo(videoEl: HTMLVideoElement) {
  if (!modelsLoaded) return null;
  if (!videoEl || videoEl.readyState < 2 || videoEl.paused || videoEl.ended) return null;

  try {
    // inputSize 160: fastest inference (~2x faster than 224) with acceptable accuracy
    // scoreThreshold 0.35: catch faces quickly without waiting for high-confidence frame
    const options = new faceapi.TinyFaceDetectorOptions({
      inputSize: 160,
      scoreThreshold: 0.35,
    });

    // Skip withFaceExpressions — not needed and adds ~15ms per frame
    const detection = await faceapi
      .detectSingleFace(videoEl, options)
      .withFaceLandmarks()
      .withFaceDescriptor();

    return detection || null;
  } catch (err) {
    console.debug('[FaceAPI] Video frame detection tick error:', err);
    return null;
  }
}

/**
 * Compares two biometric face descriptors using Euclidean distance.
 * Default threshold in face-api.js is 0.6 (where distance < 0.6 is a match).
 * We calibrate to distance <= 0.55 for higher security in voting verification.
 */
export function compareFaceDescriptors(
  descriptor1: Float32Array,
  descriptor2: Float32Array,
  threshold = 0.55
): FaceMatchResult {
  const distance = faceapi.euclideanDistance(descriptor1, descriptor2);

  // Confidence formula:
  // distance 0.0 -> 100% confidence
  // distance 0.35 -> ~80% confidence
  // distance 0.55 -> ~65% confidence (match threshold)
  // distance >= 0.9 -> 0% confidence
  const confidence = Math.max(0, Math.min(100, Math.round((1 - (distance / 0.85)) * 100)));

  return {
    isMatch: distance <= threshold,
    distance,
    confidence,
    threshold,
  };
}

/**
 * Real-time canvas overlay renderer: draws face detection box, landmarks,
 * and current biometric status text directly over the video element.
 */
export function drawBiometricOverlay(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  detection: any,
  matchResult?: FaceMatchResult | null,
  statusText?: string,
  isMirrored?: boolean
) {
  if (!canvas || !video) return;

  const displaySize = {
    width: video.videoWidth || video.clientWidth || 400,
    height: video.videoHeight || video.clientHeight || 300,
  };

  faceapi.matchDimensions(canvas, displaySize);

  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!detection) return;

  const resizedDetection = faceapi.resizeResults(detection, displaySize);
  const box = resizedDetection.detection.box;

  // Custom sleek cyberpunk / biometric UI styling
  const isMatch = matchResult?.isMatch;
  const primaryColor = isMatch ? '#10B981' : matchResult ? '#EF4444' : '#0EA5E9';

  // 1. Draw glowing corner brackets instead of plain box
  const cornerLen = Math.min(24, box.width * 0.2);
  ctx.strokeStyle = primaryColor;
  ctx.lineWidth = 3;
  ctx.shadowColor = primaryColor;
  ctx.shadowBlur = 8;

  // Top Left
  ctx.beginPath();
  ctx.moveTo(box.x, box.y + cornerLen);
  ctx.lineTo(box.x, box.y);
  ctx.lineTo(box.x + cornerLen, box.y);
  ctx.stroke();

  // Top Right
  ctx.beginPath();
  ctx.moveTo(box.x + box.width - cornerLen, box.y);
  ctx.lineTo(box.x + box.width, box.y);
  ctx.lineTo(box.x + box.width, box.y + cornerLen);
  ctx.stroke();

  // Bottom Left
  ctx.beginPath();
  ctx.moveTo(box.x, box.y + box.height - cornerLen);
  ctx.lineTo(box.x, box.y + box.height);
  ctx.lineTo(box.x + cornerLen, box.y + box.height);
  ctx.stroke();

  // Bottom Right
  ctx.beginPath();
  ctx.moveTo(box.x + box.width - cornerLen, box.y + box.height);
  ctx.lineTo(box.x + box.width, box.y + box.height);
  ctx.lineTo(box.x + box.width, box.y + box.height - cornerLen);
  ctx.stroke();

  // Reset shadow for text
  ctx.shadowBlur = 0;

  // 2. Draw subtle facial landmark points
  if (resizedDetection.landmarks) {
    const points = resizedDetection.landmarks.positions;
    ctx.fillStyle = primaryColor;
    for (let i = 0; i < points.length; i += 2) {
      ctx.beginPath();
      ctx.arc(points[i].x, points[i].y, 1.6, 0, 2 * Math.PI);
      ctx.fill();
    }
  }

  // 3. Status label chip above bounding box
  const text = statusText || (matchResult
    ? `${matchResult.isMatch ? 'VERIFIED' : 'MISMATCH'} (${matchResult.confidence}%)`
    : 'SCANNING FACE...');

  ctx.font = '600 12px Inter, system-ui, sans-serif';
  const textMetrics = ctx.measureText(text);
  const paddingX = 8;
  const chipHeight = 20;
  const chipWidth = textMetrics.width + paddingX * 2;
  const chipX = Math.max(8, box.x + (box.width - chipWidth) / 2);
  const chipY = Math.max(24, box.y - 12);

  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.beginPath();
  ctx.roundRect(chipX, chipY - 14, chipWidth, chipHeight, 4);
  ctx.fill();

  ctx.strokeStyle = primaryColor;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = primaryColor;
  if (isMirrored) {
    const textCenterX = chipX + chipWidth / 2;
    ctx.save();
    ctx.translate(textCenterX, 0);
    ctx.scale(-1, 1);
    ctx.translate(-textCenterX, 0);
    ctx.fillText(text, chipX + paddingX, chipY);
    ctx.restore();
  } else {
    ctx.fillText(text, chipX + paddingX, chipY);
  }
}

// Re-export core faceapi object in case direct access is needed
export { faceapi };
