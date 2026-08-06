import React, { useState, useEffect } from "react";

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
        backgroundColor: "rgba(11, 23, 54, 0.75)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        animation: "fadeIn 0.3s ease-out",
      }}
    >
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: "16px",
          maxWidth: "560px",
          width: "100%",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          maxHeight: "90vh",
          border: "1px solid rgba(255, 255, 255, 0.2)",
        }}
      >
        {/* Header */}
        <div
          style={{
            background: "#0B1736",
            color: "#FFFFFF",
            padding: "24px 28px",
            display: "flex",
            alignItems: "center",
            gap: "14px",
          }}
        >
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "12px",
              background: "rgba(255, 255, 255, 0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "26px", color: "#60A5FA" }}>
              verified_user
            </span>
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 700, color: "#FFFFFF" }}>
              Privacy & Data Policy Notice
            </h2>
            <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#93C5FD" }}>
              GUSELA Automated Election System
            </p>
          </div>
        </div>

        {/* Content Body */}
        <div
          style={{
            padding: "24px 28px",
            overflowY: "auto",
            fontSize: "14px",
            lineHeight: "1.6",
            color: "#334155",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          <p style={{ margin: 0, fontWeight: 500 }}>
            Welcome to the <strong>GUSELA Automated Student Election System</strong>. Before accessing the portal, please read and acknowledge our data privacy guidelines:
          </p>

          <div
            style={{
              background: "#F8FAFC",
              border: "1px solid #E2E8F0",
              borderRadius: "10px",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
              <span className="material-symbols-outlined" style={{ color: "#0B1736", fontSize: "18px", marginTop: "2px" }}>
                lock
              </span>
              <div>
                <strong style={{ color: "#0B1736", display: "block" }}>1. Data Protection & Security</strong>
                Your Student LRN, full name, grade, section, and voting records are encrypted and processed strictly in accordance with Republic Act No. 10173 (Data Privacy Act of 2012).
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
              <span className="material-symbols-outlined" style={{ color: "#0B1736", fontSize: "18px", marginTop: "2px" }}>
                how_to_vote
              </span>
              <div>
                <strong style={{ color: "#0B1736", display: "block" }}>2. Ballot Secrecy Guaranteed</strong>
                Your individual candidate selections remain confidential. Only aggregate tally counts are made public on the final election results summary.
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
              <span className="material-symbols-outlined" style={{ color: "#0B1736", fontSize: "18px", marginTop: "2px" }}>
                assignment_turned_in
              </span>
              <div>
                <strong style={{ color: "#0B1736", display: "block" }}>3. Authorized Usage</strong>
                By logging in, you agree that your credentials will be used solely to cast a single valid vote during official school election periods.
              </div>
            </div>
          </div>

          {/* Agreement Checkbox */}
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "12px 14px",
              borderRadius: "8px",
              border: "1px solid #CBD5E1",
              background: agreed ? "#EFF6FF" : "#FFFFFF",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              style={{
                width: "18px",
                height: "18px",
                accentColor: "#0B1736",
                cursor: "pointer",
              }}
            />
            <span style={{ fontSize: "13px", fontWeight: 600, color: "#0B1736" }}>
              I have read and agree to the Privacy Policy & Data Usage Terms
            </span>
          </label>
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: "16px 28px",
            background: "#F8FAFC",
            borderTop: "1px solid #E2E8F0",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <button
            onClick={handleAgreeClick}
            disabled={!agreed}
            style={{
              background: agreed ? "#0B1736" : "#94A3B8",
              color: "#FFFFFF",
              border: "none",
              padding: "12px 24px",
              borderRadius: "8px",
              fontWeight: 700,
              fontSize: "14px",
              cursor: agreed ? "pointer" : "not-allowed",
              transition: "all 0.2s ease",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: agreed ? "0 4px 12px rgba(11, 23, 54, 0.25)" : "none",
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
              check_circle
            </span>
            I Agree & Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrivacyModal;
