import React from "react";
import { X, ZoomIn } from "lucide-react";

interface PhotoViewerModalProps {
  imageUrl: string;
  title?: string;
  onClose: () => void;
}

const PhotoViewerModal: React.FC<PhotoViewerModalProps> = ({
  imageUrl,
  title = "Profile Photo",
  onClose,
}) => {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(10, 25, 47, 0.8)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 999999,
        padding: "20px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "var(--bg-surface, #ffffff)",
          borderRadius: "14px",
          maxWidth: "460px",
          width: "100%",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.4)",
          border: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))",
          overflow: "hidden",
          animation: "modalFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "14px 18px",
            borderBottom: "1px solid var(--border-subtle, #e5e7eb)",
            backgroundColor: "var(--bg-card, #ffffff)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <ZoomIn size={16} style={{ color: "var(--accent-primary, #6366F1)" }} />
            <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: "var(--text-main)" }}>
              {title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            style={{
              background: "var(--bg-subtle, rgba(0, 0, 0, 0.05))",
              border: "none",
              cursor: "pointer",
              color: "var(--text-muted)",
              padding: "6px",
              borderRadius: "50%",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "background 0.15s ease",
            }}
          >
            <X size={16} />
          </button>
        </div>

        <div
          style={{
            padding: "20px",
            textAlign: "center",
            backgroundColor: "var(--bg-main, #f8fafc)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "260px",
          }}
        >
          <img
            src={imageUrl}
            alt={title}
            style={{
              maxWidth: "100%",
              maxHeight: "65vh",
              objectFit: "contain",
              borderRadius: "10px",
              boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.15)",
              border: "1px solid var(--border-subtle, rgba(0, 0, 0, 0.05))",
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default PhotoViewerModal;
