import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  ShieldCheck,
  Lock,
  Vote,
  CheckSquare,
  CheckCircle2,
  Database,
  Zap,
  ArrowRight,
  ArrowLeft,
  Wifi,
  Sparkles,
} from "lucide-react";
import { setCacheConsent, getCacheConsent } from "../utils/cacheManager";
import { logAuditAction } from "../utils/auditLogger";

interface PrivacyModalProps {
  onAgree: (cacheAllowed?: boolean) => void;
}

const PrivacyModal: React.FC<PrivacyModalProps> = ({ onAgree }) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [agreedPrivacy, setAgreedPrivacy] = useState<boolean>(false);
  const [cacheChoice, setCacheChoice] = useState<"allowed" | "declined">(() => {
    const existing = getCacheConsent();
    return existing === "declined" ? "declined" : "allowed";
  });
  const [visible, setVisible] = useState<boolean>(true);

  useEffect(() => {
    // Lock background scrolling while modal is active
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

  const handleNextToCache = () => {
    if (!agreedPrivacy) return;
    setStep(2);
  };

  const handleFinish = async (allowCache: boolean) => {
    setCacheConsent(allowCache);
    try {
      await logAuditAction(
        "CACHE_CONSENT",
        "Visitor",
        `User ${allowCache ? "allowed" : "declined"} browser local cache storage`
      );
    } catch {
      // ignore
    }
    setVisible(false);
    onAgree(allowCache);
  };

  if (!visible) return null;

  const modalContent = (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
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
          backgroundColor: "var(--bg-card)",
          background: "var(--bg-card)",
          borderRadius: "12px",
          maxWidth: "540px",
          width: "100%",
          boxShadow: "0 20px 45px -10px rgba(0, 0, 0, 0.4), 0 0 0 1px var(--border-subtle)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          maxHeight: "88vh",
          border: "1px solid var(--border-subtle)",
          position: "relative",
        }}
      >
        {/* Step Progress Bar Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 18px",
            background: "rgba(16, 185, 129, 0.06)",
            borderBottom: "1px solid var(--border-subtle)",
            fontSize: "11px",
            fontWeight: 600,
            color: "var(--text-muted)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              style={{
                width: "18px",
                height: "18px",
                borderRadius: "50%",
                background: step === 1 ? "#10b981" : "rgba(16, 185, 129, 0.2)",
                color: step === 1 ? "#fff" : "#10b981",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "10.5px",
                fontWeight: 700,
              }}
            >
              1
            </span>
            <span style={{ color: step === 1 ? "var(--text-main)" : "var(--text-muted)" }}>
              Data Privacy Notice
            </span>

            <span style={{ margin: "0 4px", opacity: 0.4 }}>•</span>

            <span
              style={{
                width: "18px",
                height: "18px",
                borderRadius: "50%",
                background: step === 2 ? "#10b981" : "rgba(16, 185, 129, 0.2)",
                color: step === 2 ? "#fff" : "#10b981",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "10.5px",
                fontWeight: 700,
              }}
            >
              2
            </span>
            <span style={{ color: step === 2 ? "var(--text-main)" : "var(--text-muted)" }}>
              Cache & Local Storage
            </span>
          </div>

          <span style={{ color: "var(--text-muted)", fontSize: "10.5px" }}>
            Step {step} of 2
          </span>
        </div>

        {/* STEP 1: PRIVACY POLICY NOTICE */}
        {step === 1 ? (
          <>
            {/* Header */}
            <div
              style={{
                backgroundColor: "var(--bg-surface)",
                color: "var(--text-main)",
                padding: "16px 20px",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                borderBottom: "1px solid var(--border-subtle)",
              }}
            >
              <div
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "8px",
                  backgroundColor: "rgba(16, 185, 129, 0.12)",
                  border: "1px solid rgba(16, 185, 129, 0.25)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#10b981",
                  flexShrink: 0,
                }}
              >
                <ShieldCheck size={18} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "var(--text-main)", letterSpacing: "-0.01em" }}>
                  Privacy & Data Policy Notice
                </h2>
                <p style={{ margin: "2px 0 0 0", fontSize: "11.5px", color: "var(--text-muted)" }}>
                  DLMHS Supreme Secondary Learner Government Elections
                </p>
              </div>
            </div>

            {/* Body */}
            <div
              style={{
                padding: "16px 20px",
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
                  borderRadius: "8px",
                  padding: "12px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                <div style={{ display: "flex", gap: "9px", alignItems: "flex-start" }}>
                  <Lock size={14} style={{ color: "#10b981", marginTop: "2px", flexShrink: 0 }} />
                  <div>
                    <strong style={{ color: "var(--text-main)", display: "block", fontSize: "12px" }}>
                      1. Data Protection & Security
                    </strong>
                    Your Student LRN, full name, grade, section, and voting records are encrypted and processed strictly in accordance with Republic Act No. 10173 (Data Privacy Act of 2012).
                  </div>
                </div>

                <div style={{ display: "flex", gap: "9px", alignItems: "flex-start" }}>
                  <Vote size={14} style={{ color: "#10b981", marginTop: "2px", flexShrink: 0 }} />
                  <div>
                    <strong style={{ color: "var(--text-main)", display: "block", fontSize: "12px" }}>
                      2. Ballot Secrecy Guaranteed
                    </strong>
                    Your individual candidate selections remain completely secret. Only aggregate counts are revealed on the final election results summary.
                  </div>
                </div>

                <div style={{ display: "flex", gap: "9px", alignItems: "flex-start" }}>
                  <CheckSquare size={14} style={{ color: "#10b981", marginTop: "2px", flexShrink: 0 }} />
                  <div>
                    <strong style={{ color: "var(--text-main)", display: "block", fontSize: "12px" }}>
                      3. Authorized Usage
                    </strong>
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
                  borderRadius: "8px",
                  border: "1px solid var(--border-subtle)",
                  backgroundColor: agreedPrivacy ? "rgba(16, 185, 129, 0.08)" : "var(--bg-main)",
                  cursor: "pointer",
                  transition: "all 150ms ease",
                }}
              >
                <input
                  type="checkbox"
                  checked={agreedPrivacy}
                  onChange={(e) => setAgreedPrivacy(e.target.checked)}
                  style={{
                    width: "16px",
                    height: "16px",
                    accentColor: "#10b981",
                    cursor: "pointer",
                  }}
                />
                <span style={{ fontSize: "12px", fontWeight: 500, color: "var(--text-main)" }}>
                  I have read and agree to the Privacy Policy & Data Usage Terms
                </span>
              </label>
            </div>

            {/* Footer */}
            <div
              style={{
                padding: "12px 20px",
                backgroundColor: "var(--bg-card)",
                borderTop: "1px solid var(--border-subtle)",
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={handleNextToCache}
                disabled={!agreedPrivacy}
                className="btn-primary"
                style={{
                  opacity: agreedPrivacy ? 1 : 0.5,
                  padding: "8px 18px",
                  borderRadius: "6px",
                  fontSize: "12.5px",
                  fontWeight: 600,
                  cursor: agreedPrivacy ? "pointer" : "not-allowed",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "#10b981",
                  color: "#fff",
                  border: "none",
                }}
              >
                <span>Next: Cache Storage</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </>
        ) : (
          /* STEP 2: CACHE STORING CONSENT (SECOND POP-UP) */
          <>
            {/* Header */}
            <div
              style={{
                backgroundColor: "var(--bg-surface)",
                color: "var(--text-main)",
                padding: "16px 20px",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                borderBottom: "1px solid var(--border-subtle)",
              }}
            >
              <div
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "8px",
                  backgroundColor: "rgba(59, 130, 246, 0.12)",
                  border: "1px solid rgba(59, 130, 246, 0.25)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#3b82f6",
                  flexShrink: 0,
                }}
              >
                <Database size={18} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "var(--text-main)", letterSpacing: "-0.01em" }}>
                  Browser Cache & Local Storage
                </h2>
                <p style={{ margin: "2px 0 0 0", fontSize: "11.5px", color: "var(--text-muted)" }}>
                  Speed optimization and offline performance settings
                </p>
              </div>
            </div>

            {/* Body */}
            <div
              style={{
                padding: "16px 20px",
                overflowY: "auto",
                fontSize: "12.5px",
                lineHeight: "1.5",
                color: "var(--text-muted)",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              <p style={{ margin: 0 }}>
                To deliver a fast, responsive voting experience, our system can store local temporary cache on your browser. Please specify your preference:
              </p>

              {/* Feature Highlights Grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "8px",
                }}
              >
                <div
                  style={{
                    backgroundColor: "var(--bg-main)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "8px",
                    padding: "10px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#10b981", fontWeight: 600, fontSize: "12px" }}>
                    <Zap size={13} />
                    <span>Instant Ballot Load</span>
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", lineHeight: 1.4 }}>
                    Candidate profiles, photos, and party lists load with zero lag.
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: "var(--bg-main)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "8px",
                    padding: "10px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#3b82f6", fontWeight: 600, fontSize: "12px" }}>
                    <Wifi size={13} />
                    <span>Bandwidth Saver</span>
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", lineHeight: 1.4 }}>
                    Reduces school Wi-Fi network strain during high-volume voting.
                  </div>
                </div>
              </div>

              {/* Choice Cards */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "2px" }}>
                {/* Option 1: Allow Cache (Recommended) */}
                <div
                  onClick={() => setCacheChoice("allowed")}
                  style={{
                    padding: "12px 14px",
                    borderRadius: "8px",
                    border: `1.5px solid ${cacheChoice === "allowed" ? "#10b981" : "var(--border-subtle)"}`,
                    backgroundColor: cacheChoice === "allowed" ? "rgba(16, 185, 129, 0.08)" : "var(--bg-main)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    transition: "all 150ms ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div
                      style={{
                        width: "18px",
                        height: "18px",
                        borderRadius: "50%",
                        border: `2px solid ${cacheChoice === "allowed" ? "#10b981" : "var(--text-muted)"}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: cacheChoice === "allowed" ? "#10b981" : "transparent",
                      }}
                    >
                      {cacheChoice === "allowed" && <CheckCircle2 size={12} color="#fff" />}
                    </div>
                    <div>
                      <div style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--text-main)", display: "flex", alignItems: "center", gap: "6px" }}>
                        Allow Cache Storing
                        <span
                          style={{
                            fontSize: "10px",
                            padding: "1px 6px",
                            borderRadius: "99px",
                            background: "rgba(16, 185, 129, 0.15)",
                            color: "#10b981",
                            fontWeight: 700,
                          }}
                        >
                          RECOMMENDED
                        </span>
                      </div>
                      <div style={{ fontSize: "11.5px", color: "var(--text-muted)" }}>
                        Caches election assets in browser localStorage for fastest voting performance.
                      </div>
                    </div>
                  </div>
                </div>

                {/* Option 2: Decline Cache */}
                <div
                  onClick={() => setCacheChoice("declined")}
                  style={{
                    padding: "12px 14px",
                    borderRadius: "8px",
                    border: `1.5px solid ${cacheChoice === "declined" ? "#3b82f6" : "var(--border-subtle)"}`,
                    backgroundColor: cacheChoice === "declined" ? "rgba(59, 130, 246, 0.08)" : "var(--bg-main)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    transition: "all 150ms ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div
                      style={{
                        width: "18px",
                        height: "18px",
                        borderRadius: "50%",
                        border: `2px solid ${cacheChoice === "declined" ? "#3b82f6" : "var(--text-muted)"}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: cacheChoice === "declined" ? "#3b82f6" : "transparent",
                      }}
                    >
                      {cacheChoice === "declined" && <CheckCircle2 size={12} color="#fff" />}
                    </div>
                    <div>
                      <div style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--text-main)" }}>
                        Decline Cache (Session-Only Memory)
                      </div>
                      <div style={{ fontSize: "11.5px", color: "var(--text-muted)" }}>
                        Fetches all data directly from server on every screen; clears when browser closes.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ fontSize: "11px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "6px" }}>
                <Sparkles size={12} style={{ color: "#10b981", flexShrink: 0 }} />
                <span>Personal ballots and student passwords are never permanently saved in browser cache.</span>
              </div>
            </div>

            {/* Footer Actions */}
            <div
              style={{
                padding: "12px 20px",
                backgroundColor: "var(--bg-card)",
                borderTop: "1px solid var(--border-subtle)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <button
                type="button"
                onClick={() => setStep(1)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--text-muted)",
                  fontSize: "12px",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "6px 8px",
                }}
              >
                <ArrowLeft size={13} />
                <span>Back to Privacy</span>
              </button>

              <button
                onClick={() => handleFinish(cacheChoice === "allowed")}
                className="btn-primary"
                style={{
                  padding: "8px 18px",
                  borderRadius: "6px",
                  fontSize: "12.5px",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  background: cacheChoice === "allowed" ? "#10b981" : "var(--text-main)",
                  color: "#fff",
                  border: "none",
                }}
              >
                <CheckCircle2 size={14} />
                <span>{cacheChoice === "allowed" ? "Allow Cache & Enter Portal" : "Continue without Cache"}</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );

  return typeof document !== "undefined"
    ? createPortal(modalContent, document.body)
    : modalContent;
};

export default PrivacyModal;
