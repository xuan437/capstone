import React, { useState, useEffect } from "react";
import { ShieldCheck, Lock, Vote, CheckSquare, CheckCircle2 } from "lucide-react";

interface PrivacyModalProps {
  onAgree: () => void;
}

const PrivacyModal: React.FC<PrivacyModalProps> = ({ onAgree }) => {
  const [agreed, setAgreed] = useState<boolean>(false);
  const [visible, setVisible] = useState<boolean>(true);

  useEffect(() => {
    // Lock scroll on background body while privacy modal is active
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

  const handleAgreeClick = () => {
    if (!agreed) return;
    setVisible(false);
    onAgree();
  };

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        animation: "fadeIn 0.2s ease-out",
      }}
    >
      <div
        style={{
          backgroundColor: "var(--bg-surface)",
          borderRadius: "8px",
          maxWidth: "520px",
          width: "100%",
          boxShadow: "0 20px 40px -15px rgba(0, 0, 0, 0.4)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          maxHeight: "85vh",
          border: "1px solid var(--border-subtle)",
        }}
      >
        {/* Header */}
        <div
          style={{
            backgroundColor: "var(--bg-card)",
            color: "var(--text-main)",
            padding: "14px 18px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <div
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "6px",
              backgroundColor: "rgba(99, 102, 241, 0.12)",
              border: "1px solid rgba(99, 102, 241, 0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--accent-primary)",
            }}
          >
            <ShieldCheck size={16} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: "15px", fontWeight: 600, color: "var(--text-main)", letterSpacing: "-0.01em" }}>
              Privacy & Data Policy Notice
            </h2>
            <p style={{ margin: 0, fontSize: "11.5px", color: "var(--text-muted)" }}>
              DLMHS Online Voting Election System
            </p>
          </div>
        </div>

        {/* Content Body */}
        <div
          style={{
            padding: "16px 18px",
            overflowY: "auto",
            fontSize: "12.5px",
            lineHeight: "1.5",
            color: "var(--text-muted)",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <p style={{ margin: 0, fontWeight: 400 }}>
            Welcome to the <strong>DLMHS Online Voting System</strong>. Before accessing the portal, please read and acknowledge our data privacy guidelines:
          </p>

          <div
            style={{
              backgroundColor: "var(--bg-main)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "6px",
              padding: "12px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
              <Lock size={14} style={{ color: "var(--accent-primary)", marginTop: "2px", flexShrink: 0 }} />
              <div>
                <strong style={{ color: "var(--text-main)", display: "block", fontSize: "12px" }}>1. Data Protection & Security</strong>
                Your Student LRN, full name, grade, section, and voting records are encrypted and processed strictly in accordance with Republic Act No. 10173 (Data Privacy Act of 2012).
              </div>
            </div>

            <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
              <Vote size={14} style={{ color: "var(--accent-primary)", marginTop: "2px", flexShrink: 0 }} />
              <div>
                <strong style={{ color: "var(--text-main)", display: "block", fontSize: "12px" }}>2. Ballot Secrecy Guaranteed</strong>
                Your individual candidate selections remain confidential. Only aggregate tally counts are made public on the final election results summary.
              </div>
            </div>

            <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
              <CheckSquare size={14} style={{ color: "var(--accent-primary)", marginTop: "2px", flexShrink: 0 }} />
              <div>
                <strong style={{ color: "var(--text-main)", display: "block", fontSize: "12px" }}>3. Authorized Usage</strong>
                By logging in, you agree that your credentials will be used solely to cast a single valid vote during official school election periods.
              </div>
            </div>
          </div>

          {/* Agreement Checkbox */}
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "10px 12px",
              borderRadius: "6px",
              border: "1px solid var(--border-subtle)",
              backgroundColor: agreed ? "rgba(99, 102, 241, 0.08)" : "var(--bg-main)",
              cursor: "pointer",
              transition: "all 150ms ease",
            }}
          >
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              style={{
                width: "16px",
                height: "16px",
                accentColor: "var(--accent-primary)",
                cursor: "pointer",
              }}
            />
            <span style={{ fontSize: "12px", fontWeight: 500, color: "var(--text-main)" }}>
              I have read and agree to the Privacy Policy & Data Usage Terms
            </span>
          </label>
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: "12px 18px",
            backgroundColor: "var(--bg-card)",
            borderTop: "1px solid var(--border-subtle)",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <button
            onClick={handleAgreeClick}
            disabled={!agreed}
            className="btn-primary"
            style={{
              opacity: agreed ? 1 : 0.5,
              padding: "7px 16px",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: 500,
              cursor: agreed ? "pointer" : "not-allowed",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <CheckCircle2 size={14} />
            I Agree & Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrivacyModal;

