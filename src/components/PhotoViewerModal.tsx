import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  RefreshCw,
  Download,
  FlipHorizontal,
  Maximize,
  Minimize,
  Check,
} from "lucide-react";

export interface PhotoViewerModalProps {
  imageUrl: string;
  title?: string;
  subtitle?: string;
  onClose: () => void;
}

const PhotoViewerModal: React.FC<PhotoViewerModalProps> = ({
  imageUrl,
  title = "Photo Viewer",
  subtitle,
  onClose,
}) => {
  const [scale, setScale] = useState<number>(1);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [rotation, setRotation] = useState<number>(0);
  const [flipped, setFlipped] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMsg(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMsg(null);
    }, 2200);
  };

  // Zoom handlers
  const handleZoomIn = useCallback(() => {
    setScale((prev) => Math.min(prev + 0.3, 4.0));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale((prev) => {
      const next = Math.max(prev - 0.3, 0.5);
      if (next <= 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  }, []);

  const handleReset = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setRotation(0);
    setFlipped(false);
    showToast("View reset");
  }, []);

  // Rotation
  const handleRotateCw = useCallback(() => {
    setRotation((prev) => (prev + 90) % 360);
  }, []);

  const handleRotateCcw = useCallback(() => {
    setRotation((prev) => (prev - 90 + 360) % 360);
  }, []);

  // Flip
  const handleToggleFlip = useCallback(() => {
    setFlipped((prev) => !prev);
  }, []);

  // Download
  const handleDownload = useCallback(async () => {
    try {
      const cleanName = (title || "photo")
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, "_")
        .slice(0, 32);
      const filename = `${cleanName}.png`;

      // If data URL, trigger direct anchor download
      if (imageUrl.startsWith("data:") || imageUrl.startsWith("blob:")) {
        const link = document.createElement("a");
        link.href = imageUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast("Photo downloaded");
        return;
      }

      // If remote URL, fetch as blob to avoid cross-origin issues
      const res = await fetch(imageUrl, { mode: "cors" });
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      showToast("Photo downloaded");
    } catch {
      // Fallback
      window.open(imageUrl, "_blank");
      showToast("Opened photo in new tab");
    }
  }, [imageUrl, title]);

  // Fullscreen
  const handleToggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  }, []);

  // Mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const delta = -e.deltaY * 0.0015;
    setScale((prev) => {
      const next = Math.min(Math.max(prev + delta, 0.5), 4.0);
      if (next <= 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  }, []);

  // Double click toggles between 1x and 2.2x zoom
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setScale((prev) => {
      if (prev > 1.1) {
        setPosition({ x: 0, y: 0 });
        return 1;
      } else {
        return 2.2;
      }
    });
  }, []);

  // Pan / Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left-click
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch handlers for mobile pan
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    setPosition({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "+" || e.key === "=") {
        handleZoomIn();
      } else if (e.key === "-" || e.key === "_") {
        handleZoomOut();
      } else if (e.key === "0") {
        handleReset();
      } else if (e.key.toLowerCase() === "r") {
        handleRotateCw();
      } else if (e.key.toLowerCase() === "f") {
        handleToggleFullscreen();
      } else if (e.key === "ArrowUp") {
        setPosition((p) => ({ ...p, y: p.y - 30 }));
      } else if (e.key === "ArrowDown") {
        setPosition((p) => ({ ...p, y: p.y + 30 }));
      } else if (e.key === "ArrowLeft") {
        setPosition((p) => ({ ...p, x: p.x - 30 }));
      } else if (e.key === "ArrowRight") {
        setPosition((p) => ({ ...p, x: p.x + 30 }));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, handleZoomIn, handleZoomOut, handleReset, handleRotateCw, handleToggleFullscreen]);

  // Fullscreen change listener
  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const modalContent = (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(8, 12, 22, 0.92)",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        zIndex: 999999,
        display: "flex",
        flexDirection: "column",
        userSelect: "none",
        animation: "photoViewerFadeIn 0.22s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
      onClick={(e) => {
        if (e.target === containerRef.current) onClose();
      }}
    >
      <style>{`
        @keyframes photoViewerFadeIn {
          from { opacity: 0; transform: scale(0.985); }
          to { opacity: 1; transform: scale(1); }
        }
        .pv-action-btn {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #f1f5f9;
          width: 36px;
          height: 36px;
          border-radius: 8px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s ease;
          padding: 0;
        }
        .pv-action-btn:hover {
          background: rgba(255, 255, 255, 0.18);
          color: #ffffff;
          transform: translateY(-1px);
          border-color: rgba(255, 255, 255, 0.24);
        }
        .pv-action-btn:active {
          transform: translateY(0) scale(0.96);
        }
        .pv-pill-btn {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #e2e8f0;
          font-family: var(--font-mono, monospace);
          font-size: 11.5px;
          font-weight: 600;
          height: 36px;
          padding: 0 12px;
          border-radius: 8px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .pv-pill-btn:hover {
          background: rgba(255, 255, 255, 0.18);
          color: #ffffff;
        }
        @media (min-width: 768px) {
          .pv-hints-desktop {
            display: flex !important;
          }
        }
      `}</style>

      {/* TOP BAR */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px 24px",
          background: "linear-gradient(180deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 100%)",
          zIndex: 10,
        }}
      >
        {/* Title & Subtitle */}
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: "var(--accent-primary, #6366F1)",
                boxShadow: "0 0 10px var(--accent-primary, #6366F1)",
              }}
            />
            <h2
              style={{
                margin: 0,
                fontSize: "15px",
                fontWeight: 600,
                color: "#ffffff",
                letterSpacing: "-0.01em",
              }}
            >
              {title}
            </h2>
          </div>
          {subtitle && (
            <p
              style={{
                margin: "0 0 0 18px",
                fontSize: "12px",
                color: "rgba(255, 255, 255, 0.65)",
              }}
            >
              {subtitle}
            </p>
          )}
        </div>

        {/* Center Desktop Shortcut Hints */}
        <div
          style={{
            display: "none",
            gap: "14px",
            alignItems: "center",
            fontSize: "11px",
            color: "rgba(255, 255, 255, 0.45)",
          }}
          className="pv-hints-desktop"
        >
          <span>Scroll to Zoom</span>
          <span>•</span>
          <span>Drag to Pan</span>
          <span>•</span>
          <span>Double-click to Toggle</span>
          <span>•</span>
          <span
            style={{
              padding: "2px 6px",
              background: "rgba(255, 255, 255, 0.1)",
              borderRadius: "4px",
              fontFamily: "var(--font-mono, monospace)",
              fontSize: "10px",
            }}
          >
            Esc
          </span>
        </div>

        {/* Close Button */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close viewer"
            className="pv-action-btn"
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              backgroundColor: "rgba(255, 255, 255, 0.1)",
            }}
            title="Close (Esc)"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* MAIN VIEWPORT / CANVAS */}
      <div
        style={{
          flex: 1,
          position: "relative",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: scale > 1 ? (isDragging ? "grabbing" : "grab") : "default",
          touchAction: "none",
        }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onDoubleClick={handleDoubleClick}
      >
        <div
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg) scaleX(${flipped ? -1 : 1})`,
            transition: isDragging ? "none" : "transform 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
            willChange: "transform",
            display: "inline-block",
            pointerEvents: "none",
          }}
        >
          <img
            src={imageUrl}
            alt={title}
            draggable={false}
            style={{
              maxWidth: "88vw",
              maxHeight: "75vh",
              objectFit: "contain",
              borderRadius: "12px",
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.1)",
              display: "block",
            }}
          />
        </div>

        {/* Subtle toast overlay message */}
        {toastMsg && (
          <div
            style={{
              position: "absolute",
              top: "20px",
              background: "rgba(16, 185, 129, 0.95)",
              color: "#ffffff",
              padding: "6px 14px",
              borderRadius: "20px",
              fontSize: "12px",
              fontWeight: 500,
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "0 6px 20px rgba(0, 0, 0, 0.3)",
              animation: "photoViewerFadeIn 0.15s ease",
              pointerEvents: "none",
              zIndex: 20,
            }}
          >
            <Check size={14} />
            <span>{toastMsg}</span>
          </div>
        )}
      </div>

      {/* FLOATING ACTION TOOLBAR DOCK */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: "18px 24px 28px",
          background: "linear-gradient(0deg, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0) 100%)",
          zIndex: 10,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            backgroundColor: "rgba(18, 24, 38, 0.8)",
            border: "1px solid rgba(255, 255, 255, 0.14)",
            borderRadius: "14px",
            padding: "6px 10px",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            boxShadow: "0 16px 36px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Zoom Out */}
          <button
            type="button"
            className="pv-action-btn"
            onClick={handleZoomOut}
            disabled={scale <= 0.5}
            title="Zoom Out (-)"
          >
            <ZoomOut size={16} />
          </button>

          {/* Zoom % badge / Reset to 100% */}
          <button
            type="button"
            className="pv-pill-btn"
            onClick={() => {
              setScale(1);
              setPosition({ x: 0, y: 0 });
            }}
            title="Click to reset zoom to 100%"
          >
            {Math.round(scale * 100)}%
          </button>

          {/* Zoom In */}
          <button
            type="button"
            className="pv-action-btn"
            onClick={handleZoomIn}
            disabled={scale >= 4.0}
            title="Zoom In (+)"
          >
            <ZoomIn size={16} />
          </button>

          {/* Divider */}
          <div style={{ width: "1px", height: "20px", backgroundColor: "rgba(255, 255, 255, 0.15)", margin: "0 2px" }} />

          {/* Rotate Counter-Clockwise */}
          <button
            type="button"
            className="pv-action-btn"
            onClick={handleRotateCcw}
            title="Rotate Left 90°"
          >
            <RotateCcw size={16} />
          </button>

          {/* Rotate Clockwise */}
          <button
            type="button"
            className="pv-action-btn"
            onClick={handleRotateCw}
            title="Rotate Right 90° (R)"
          >
            <RotateCw size={16} />
          </button>

          {/* Flip Horizontal */}
          <button
            type="button"
            className="pv-action-btn"
            onClick={handleToggleFlip}
            style={{
              backgroundColor: flipped ? "rgba(99, 102, 241, 0.35)" : undefined,
              borderColor: flipped ? "var(--accent-primary, #6366F1)" : undefined,
            }}
            title="Flip Horizontal (Mirror)"
          >
            <FlipHorizontal size={16} />
          </button>

          {/* Divider */}
          <div style={{ width: "1px", height: "20px", backgroundColor: "rgba(255, 255, 255, 0.15)", margin: "0 2px" }} />

          {/* Reset All */}
          <button
            type="button"
            className="pv-action-btn"
            onClick={handleReset}
            title="Reset All (0)"
          >
            <RefreshCw size={16} />
          </button>

          {/* Download Photo */}
          <button
            type="button"
            className="pv-action-btn"
            onClick={handleDownload}
            title="Download Photo"
          >
            <Download size={16} />
          </button>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            className="pv-action-btn"
            onClick={handleToggleFullscreen}
            title="Toggle Fullscreen (F)"
          >
            {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined"
    ? createPortal(modalContent, document.body)
    : modalContent;
};

export default PhotoViewerModal;
