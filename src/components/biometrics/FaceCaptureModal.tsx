import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Camera, X, Check, RefreshCw, AlertTriangle, Sparkles, SwitchCamera } from 'lucide-react';
import {
  loadFaceApiModels,
  detectSingleFaceFromVideo,
  drawBiometricOverlay,
} from '../../utils/faceApi';
import './Biometrics.css';

export interface FaceCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (capturedBase64: string, descriptor?: Float32Array) => void;
  title?: string;
  subtitle?: string;
}

export const FaceCaptureModal: React.FC<FaceCaptureModalProps> = ({
  isOpen,
  onClose,
  onCapture,
  title = 'Capture Student Portrait Photo',
  subtitle,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const [modelsReady, setModelsReady] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [lastDescriptor, setLastDescriptor] = useState<Float32Array | null>(null);

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
      console.error('[FaceAPI Capture] Camera error:', err);
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
          setErrorMsg('Camera access was denied. Please grant camera permissions.');
        } else {
          setErrorMsg(fbErr.message || 'Unable to open camera.');
        }
      }
    }
  }, []);

  const handleToggleCamera = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setCapturedImage(null);
      setFaceDetected(false);
      return;
    }

    let isMounted = true;
    setErrorMsg(null);
    setCapturedImage(null);

    const init = async () => {
      try {
        await loadFaceApiModels();
        if (!isMounted) return;
        setModelsReady(true);
        await startCamera(facingMode);
      } catch (err: any) {
        if (!isMounted) return;
        console.error('[FaceAPI Capture] Init error:', err);
        setErrorMsg(err.message || 'Unable to open camera. Please grant camera permissions.');
      }
    };

    init();

    return () => {
      isMounted = false;
      stopCamera();
    };
  }, [isOpen, stopCamera, startCamera]);

  // Detection loop
  useEffect(() => {
    if (!isOpen || !cameraActive || !modelsReady || capturedImage) return;

    let active = true;

    const loop = async () => {
      if (!active) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video && canvas && video.readyState === 4 && !video.paused && !video.ended) {
        const detection = await detectSingleFaceFromVideo(video);

        if (active && detection) {
          setFaceDetected(true);
          if (detection.descriptor) {
            setLastDescriptor(detection.descriptor);
          }
          drawBiometricOverlay(
            canvas,
            video,
            detection,
            null,
            'FACE DETECTED • READY TO CAPTURE',
            facingMode === 'user'
          );
        } else if (active && canvas) {
          setFaceDetected(false);
          const ctx = canvas.getContext('2d');
          ctx?.clearRect(0, 0, canvas.width, canvas.height);
        }
      }

      if (active && !capturedImage) {
        animationFrameRef.current = requestAnimationFrame(loop);
      }
    };

    animationFrameRef.current = requestAnimationFrame(loop);

    return () => {
      active = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isOpen, cameraActive, modelsReady, capturedImage, facingMode]);

  const handleTakeSnapshot = () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      const snapCanvas = document.createElement('canvas');
      snapCanvas.width = video.videoWidth || 640;
      snapCanvas.height = video.videoHeight || 480;
      const ctx = snapCanvas.getContext('2d');
      if (!ctx) return;

      // Only mirror front camera (user) for natural portrait orientation; keep rear camera unreversed!
      if (facingMode === 'user') {
        ctx.translate(snapCanvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, snapCanvas.width, snapCanvas.height);

      const base64 = snapCanvas.toDataURL('image/jpeg', 0.88);
      setCapturedImage(base64);
      stopCamera();
    } catch (err) {
      console.error('Snapshot failed:', err);
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setFaceDetected(false);
    startCamera(facingMode);
  };

  const handleConfirm = () => {
    if (!capturedImage) return;
    onCapture(capturedImage, lastDescriptor || undefined);
    stopCamera();
    onClose();
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="biometric-modal-backdrop" role="dialog" aria-modal="true">
      <div className="biometric-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="biometric-modal-header">
          <div className="biometric-modal-title-row">
            <div className="biometric-modal-icon-badge">
              <Camera size={20} />
            </div>
            <div className="biometric-modal-header-text">
              <div className="biometric-modal-title-wrapper">
                <h3 className="biometric-modal-title">{title}</h3>
              </div>
              <p className="biometric-modal-subtitle">
                {subtitle || "Align student face inside the guide frame and snap a portrait."}
              </p>
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
          <div className={`biometric-camera-viewport ${facingMode === 'environment' ? 'is-environment' : 'is-user'}`}>
            {capturedImage ? (
              <img
                src={capturedImage}
                alt="Captured Snapshot"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <>
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
                {cameraActive && !capturedImage && (
                  <div className="biometric-camera-reticle" aria-hidden="true" />
                )}

                {/* Floating Camera Flip Control */}
                {!capturedImage && (
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

                {(!cameraActive || errorMsg) && (
                  <div className="biometric-camera-loader">
                    {errorMsg ? (
                      <>
                        <AlertTriangle size={36} style={{ color: '#EF4444' }} />
                        <div style={{ color: '#F87171', fontSize: '13px' }}>{errorMsg}</div>
                      </>
                    ) : (
                      <>
                        <div className="biometric-spinner" />
                        <div style={{ color: '#94A3B8', fontSize: '13px' }}>
                          Starting camera & AI face detector...
                        </div>
                      </>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Quality Indicator Bar */}
          <div className="biometric-comparison-card biometric-capture-status-card">
            {capturedImage ? (
              <div className="biometric-status-text success">
                <Check size={16} />
                <span>Photo captured successfully! Ready to use as official profile.</span>
              </div>
            ) : faceDetected ? (
              <div className="biometric-status-text active">
                <Sparkles size={16} />
                <span>Clear face detected! You can take the photo now.</span>
              </div>
            ) : (
              <div className="biometric-status-text idle">
                <RefreshCw size={14} className="spin" />
                <span>Position face clearly inside the guide frame...</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="biometric-modal-footer">
          <button
            type="button"
            className="biometric-btn-secondary"
            onClick={() => {
              stopCamera();
              onClose();
            }}
          >
            Cancel
          </button>

          {capturedImage ? (
            <div className="biometric-footer-actions">
              <button
                type="button"
                className="biometric-btn-secondary"
                onClick={handleRetake}
              >
                <RefreshCw size={14} />
                <span>Retake</span>
              </button>
              <button
                type="button"
                className="biometric-btn-primary"
                onClick={handleConfirm}
              >
                <Check size={14} />
                <span>Use This Photo</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="biometric-btn-primary"
              disabled={!cameraActive}
              onClick={handleTakeSnapshot}
            >
              <Camera size={14} />
              <span>Capture Photo</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : modalContent;
};
