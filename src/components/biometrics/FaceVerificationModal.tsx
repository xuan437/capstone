import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  ShieldCheck,
  AlertTriangle,
  X,
  CheckCircle2,
  RefreshCw,
  Eye,
  KeyRound,
  SwitchCamera,
} from 'lucide-react';
import {
  loadFaceApiModels,
  extractDescriptorFromPhoto,
  detectSingleFaceFromVideo,
  compareFaceDescriptors,
  drawBiometricOverlay,
  FaceMatchResult,
} from '../../utils/faceApi';
import { getStudentPhoto } from '../../utils/imageUtils';
import './Biometrics.css';

export interface FaceVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified: (result: FaceMatchResult & { snapshot?: string }) => void;
  referencePhotoUrl?: string | null;
  studentName: string;
  studentId: string;
  title?: string;
  subtitle?: string;
  allowBypass?: boolean;
  bypassLabel?: string;
  onBypass?: () => void;
}

export const FaceVerificationModal: React.FC<FaceVerificationModalProps> = ({
  isOpen,
  onClose,
  onVerified,
  referencePhotoUrl,
  studentName,
  studentId,
  title = 'Biometric Voter Verification',
  subtitle = 'Look directly at the camera to verify your identity before proceeding.',
  allowBypass = true,
  bypassLabel = 'Use Password Instead',
  onBypass,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const [modelsReady, setModelsReady] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [refDescriptor, setRefDescriptor] = useState<Float32Array | null>(null);
  const [currentMatch, setCurrentMatch] = useState<FaceMatchResult | null>(null);
  const [verificationSuccess, setVerificationSuccess] = useState(false);
  const consecutiveMatches = useRef(0);

  // Resolved reference photo for display & comparison
  const effectivePhotoUrl = getStudentPhoto(referencePhotoUrl, studentName, studentId);

  // Stop camera tracks helper
  const stopCamera = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  const startCamera = useCallback(async (mode: 'user' | 'environment') => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    setErrorMsg(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: { ideal: mode },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
      }
    } catch (err: any) {
      console.error('[FaceAPI] Camera error:', err);
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
        streamRef.current = fallbackStream;
        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream;
          await videoRef.current.play();
          setCameraActive(true);
        }
      } catch (fbErr: any) {
        if (fbErr.name === 'NotAllowedError' || fbErr.name === 'PermissionDeniedError') {
          setErrorMsg(
            allowBypass
              ? 'Camera access was denied. Please allow camera permissions or use password verification.'
              : 'Camera access was denied. Please allow camera permissions in your browser to complete required face verification.'
          );
        } else if (fbErr.name === 'NotFoundError' || fbErr.name === 'DevicesNotFoundError') {
          setErrorMsg(
            allowBypass
              ? 'No camera device found on your system. Please use password verification.'
              : 'No camera device found on your system. A working camera is required for student biometric verification.'
          );
        } else {
          setErrorMsg(fbErr.message || 'Unable to access camera or load facial models.');
        }
      }
    }
  }, [allowBypass]);

  const handleToggleCamera = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  // Initialize camera and extract reference descriptor
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setCurrentMatch(null);
      setVerificationSuccess(false);
      consecutiveMatches.current = 0;
      return;
    }

    let isMounted = true;
    setErrorMsg(null);
    setVerificationSuccess(false);
    consecutiveMatches.current = 0;

    const initialize = async () => {
      try {
        // 1. Load FaceAPI neural network models
        await loadFaceApiModels();
        if (!isMounted) return;
        setModelsReady(true);

        // 2. Pre-extract face descriptor from reference student photo
        if (effectivePhotoUrl) {
          const descriptor = await extractDescriptorFromPhoto(effectivePhotoUrl);
          if (!isMounted) return;
          if (descriptor) {
            setRefDescriptor(descriptor);
          } else {
            console.warn('[FaceAPI] Could not extract face descriptor from reference photo.');
          }
        }

        // 3. Request webcam stream
        await startCamera(facingMode);
      } catch (err: any) {
        if (!isMounted) return;
        console.error('[FaceAPI] Initialization error:', err);
        setErrorMsg(err.message || 'Unable to access camera or load facial models.');
      }
    };

    initialize();

    return () => {
      isMounted = false;
      stopCamera();
    };
  }, [isOpen, effectivePhotoUrl, stopCamera, startCamera]);

  // Real-time video detection loop
  useEffect(() => {
    if (!isOpen || !cameraActive || !modelsReady || verificationSuccess) return;

    let active = true;

    const runDetectionLoop = async () => {
      if (!active) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video && canvas && video.readyState === 4 && !video.paused && !video.ended) {
        const detection = await detectSingleFaceFromVideo(video);

        if (active && detection) {
          let matchResult: FaceMatchResult | null = null;

          if (refDescriptor && detection.descriptor) {
            matchResult = compareFaceDescriptors(detection.descriptor, refDescriptor, 0.58);
            setCurrentMatch(matchResult);

            if (matchResult.isMatch && matchResult.confidence >= 60) {
              consecutiveMatches.current += 1;

              // Require 2 consecutive confident frames to avoid false positives
              if (consecutiveMatches.current >= 2 && !verificationSuccess) {
                setVerificationSuccess(true);

                // Capture snapshot for receipt audit
                let snapshotBase64: string | undefined = undefined;
                try {
                  const snapCanvas = document.createElement('canvas');
                  snapCanvas.width = video.videoWidth || 640;
                  snapCanvas.height = video.videoHeight || 480;
                  const snapCtx = snapCanvas.getContext('2d');
                  if (snapCtx) {
                    if (facingMode === 'user') {
                      snapCtx.translate(snapCanvas.width, 0);
                      snapCtx.scale(-1, 1);
                    }
                    snapCtx.drawImage(video, 0, 0, snapCanvas.width, snapCanvas.height);
                    snapshotBase64 = snapCanvas.toDataURL('image/jpeg', 0.8);
                  }
                } catch {
                  // ignore snapshot error
                }

                setTimeout(() => {
                  stopCamera();
                  onVerified({
                    ...matchResult!,
                    snapshot: snapshotBase64,
                  });
                }, 300);
                return;
              }
            } else {
              consecutiveMatches.current = Math.max(0, consecutiveMatches.current - 1);
            }
          }

          drawBiometricOverlay(canvas, video, detection, matchResult, undefined, facingMode === 'user');
        } else if (active && canvas) {
          // Clear overlay if no face detected
          const ctx = canvas.getContext('2d');
          ctx?.clearRect(0, 0, canvas.width, canvas.height);
          setCurrentMatch(null);
          consecutiveMatches.current = 0;
        }
      }

      if (active && !verificationSuccess) {
        animationFrameRef.current = requestAnimationFrame(runDetectionLoop);
      }
    };

    animationFrameRef.current = requestAnimationFrame(runDetectionLoop);

    return () => {
      active = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isOpen, cameraActive, modelsReady, refDescriptor, verificationSuccess, onVerified, stopCamera, facingMode]);

  if (!isOpen) return null;

  const confidenceScore = currentMatch?.confidence ?? 0;
  const isMatch = currentMatch?.isMatch ?? false;

  const modalContent = (
    <div className="biometric-modal-backdrop" role="dialog" aria-modal="true">
      <div className="biometric-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="biometric-modal-header">
          <div className="biometric-modal-title-row">
            <div className="biometric-modal-icon-badge">
              <ShieldCheck size={20} />
            </div>
            <div className="biometric-modal-header-text">
              <div className="biometric-modal-title-wrapper">
                <h3 className="biometric-modal-title">{title}</h3>
                {!allowBypass && (
                  <span className="biometric-mandatory-badge">Required</span>
                )}
              </div>
              <p className="biometric-modal-subtitle">{subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            className="biometric-close-btn"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="biometric-modal-body">
          {/* Camera Viewport */}
          <div className={`biometric-camera-viewport ${facingMode === 'environment' ? 'is-environment' : 'is-user'}`}>
            <video
              ref={videoRef}
              className={`biometric-camera-video ${facingMode === 'environment' ? 'environment' : 'user'}`}
              style={{ transform: facingMode === 'environment' ? 'none' : 'scaleX(-1)' }}
              playsInline
              disablePictureInPicture
              muted
              autoPlay
            />
            <canvas
              ref={canvasRef}
              className={`biometric-camera-canvas ${facingMode === 'environment' ? 'environment' : 'user'}`}
              style={{ transform: facingMode === 'environment' ? 'none' : 'scaleX(-1)' }}
            />

            {/* Cyber Biometric Face Alignment Reticle */}
            {cameraActive && !verificationSuccess && (
              <div className="biometric-camera-reticle" aria-hidden="true" />
            )}

            {/* Glowing Scan Laser while searching */}
            {cameraActive && !verificationSuccess && (
              <div className="biometric-scan-laser" />
            )}

            {/* Floating Camera Flip Control */}
            {!verificationSuccess && (
              <button
                type="button"
                className="biometric-viewport-flip-btn"
                onClick={handleToggleCamera}
                title={facingMode === 'user' ? 'Switch to Back Camera' : 'Switch to Front Camera'}
              >
                <SwitchCamera size={14} />
                <span>{facingMode === 'user' ? 'Back Camera' : 'Front Camera'}</span>
              </button>
            )}

            {/* Loading / Error Overlay */}
            {(!cameraActive || errorMsg) && (
              <div className="biometric-camera-loader">
                {errorMsg ? (
                  <>
                    <AlertTriangle size={36} style={{ color: '#EF4444' }} />
                    <div style={{ color: '#F87171', fontSize: '13px', maxWidth: '320px' }}>
                      {errorMsg}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="biometric-spinner" />
                    <div style={{ color: '#94A3B8', fontSize: '13px', fontWeight: 500 }}>
                      {!modelsReady ? 'Initializing AI facial recognition...' : 'Starting camera feed...'}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Success Animation Overlay */}
            {verificationSuccess && (
              <div className="biometric-success-overlay">
                <div className="biometric-success-icon-pulse">
                  <CheckCircle2 size={46} />
                </div>
                <div className="biometric-success-title">
                  Face Verified Successfully!
                </div>
                <div className="biometric-success-sub">
                  Match Confidence: {confidenceScore}%
                </div>
              </div>
            )}
          </div>

          {/* Reference Profile Comparison Bar */}
          <div className="biometric-comparison-card">
            <div className="biometric-profile-preview">
              <img
                src={effectivePhotoUrl}
                alt={studentName}
                className="biometric-ref-photo"
              />
              <div>
                <div className="biometric-ref-info-name">{studentName}</div>
                <div className="biometric-ref-info-id">LRN: {studentId}</div>
              </div>
            </div>

            {/* Live Similarity Meter */}
            <div className="biometric-meter-box">
              <div className="biometric-meter-header">
                <span style={{ color: 'var(--text-muted)' }}>Match Score</span>
                <span
                  style={{
                    color: isMatch ? '#34D399' : confidenceScore > 30 ? '#FBBF24' : '#F87171',
                  }}
                >
                  {confidenceScore}%
                </span>
              </div>
              <div className="biometric-meter-track">
                <div
                  className="biometric-meter-fill"
                  style={{
                    width: `${confidenceScore}%`,
                    background: isMatch
                      ? 'linear-gradient(90deg, #10B981, #34D399)'
                      : confidenceScore > 30
                      ? 'linear-gradient(90deg, #F59E0B, #FBBF24)'
                      : 'linear-gradient(90deg, #EF4444, #F87171)',
                  }}
                />
              </div>
            </div>

            {/* Live Status Pill */}
            <div
              className={`biometric-status-pill ${
                verificationSuccess
                  ? 'matched'
                  : currentMatch?.isMatch
                  ? 'matched'
                  : currentMatch
                  ? 'mismatch'
                  : cameraActive
                  ? 'scanning'
                  : 'idle'
              }`}
            >
              {verificationSuccess ? (
                <>
                  <CheckCircle2 size={13} />
                  <span>Verified</span>
                </>
              ) : currentMatch?.isMatch ? (
                <>
                  <CheckCircle2 size={13} />
                  <span>Match ({confidenceScore}%)</span>
                </>
              ) : currentMatch ? (
                <>
                  <AlertTriangle size={13} />
                  <span>Mismatch</span>
                </>
              ) : cameraActive ? (
                <>
                  <RefreshCw size={12} className="spin" />
                  <span>Scanning</span>
                </>
              ) : (
                <>
                  <Eye size={13} />
                  <span>Ready</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="biometric-modal-footer">
          {allowBypass ? (
            <button
              type="button"
              className="biometric-btn-secondary"
              onClick={() => {
                stopCamera();
                onClose();
                if (onBypass) onBypass();
              }}
            >
              <KeyRound size={14} />
              <span>{bypassLabel}</span>
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            className="biometric-btn-secondary"
            onClick={() => {
              stopCamera();
              onClose();
            }}
          >
            <span>Cancel</span>
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : modalContent;
};
