import React, { useState } from "react";
import { verifyReceiptCode, ReceiptVerificationResult } from "../utils/receiptVerifier";
import { ShieldCheck, X, Search, CheckCircle2, XCircle } from "lucide-react";

interface ReceiptVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReceiptVerificationModal: React.FC<ReceiptVerificationModalProps> = ({ isOpen, onClose }) => {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReceiptVerificationResult | null>(null);

  if (!isOpen) return null;

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setLoading(true);
    setResult(null);

    const res = await verifyReceiptCode(code.trim());
    setResult(res);
    setLoading(false);
  };

  const maskStudentId = (id?: string) => {
    if (!id) return "••••••••";
    if (id.length <= 4) return "••••" + id;
    return id.substring(0, 3) + "••••" + id.substring(id.length - 4);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(10, 25, 47, 0.75)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10000,
        padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "var(--bg-main)",
          border: "1px solid var(--border-light)",
          borderRadius: "var(--radius-xl)",
          width: "min(500px, 94vw)",
          padding: "28px",
          boxShadow: "var(--shadow-modal)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <ShieldCheck size={26} style={{ color: "var(--primary-navy)" }} />
            <div>
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "var(--primary-navy)" }}>
                Ballot Receipt Verification
              </h3>
              <p style={{ margin: "2px 0 0", fontSize: "12px", color: "var(--text-light)" }}>
                Verify cryptographic integrity of any cast vote receipt
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-light)",
              padding: "4px",
              display: "flex",
            }}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleVerify} style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, color: "var(--text-main)", marginBottom: "6px" }}>
            Enter Receipt Code:
          </label>
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              type="text"
              placeholder="e.g. REC-9A2F-841B"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              style={{
                flex: 1,
                padding: "10px 14px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-light)",
                backgroundColor: "var(--bg-surface)",
                color: "var(--text-main)",
                fontSize: "14px",
                fontWeight: 700,
                fontFamily: "var(--font-mono)",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{
                padding: "10px 20px",
                borderRadius: "var(--radius-md)",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontWeight: 700,
              }}
            >
              {loading ? (
                "Checking..."
              ) : (
                <>
                  <Search size={16} />
                  Verify
                </>
              )}
            </button>
          </div>
        </form>

        {result && (
          <div
            style={{
              padding: "18px",
              borderRadius: "var(--radius-lg)",
              backgroundColor: result.valid ? "var(--color-success-bg)" : "var(--color-danger-bg)",
              border: `1px solid ${result.valid ? "var(--color-success-border)" : "var(--color-danger-border)"}`,
              transition: "all 0.2s ease",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginBottom: "12px" }}>
              {result.valid ? (
                <CheckCircle2 size={28} style={{ color: "var(--color-success)" }} />
              ) : (
                <XCircle size={28} style={{ color: "var(--color-danger)" }} />
              )}
              <div>
                <div
                  style={{
                    fontSize: "15px",
                    fontWeight: 800,
                    color: result.valid ? "var(--color-success)" : "var(--color-danger)",
                    marginBottom: "4px",
                  }}
                >
                  {result.valid ? "OFFICIAL RECEIPT VERIFIED" : "VERIFICATION FAILED"}
                </div>
                <p style={{ margin: 0, fontSize: "12.5px", color: "var(--text-main)", lineHeight: 1.4 }}>
                  {result.message}
                </p>
              </div>
            </div>

            {result.valid && (
              <div
                style={{
                  backgroundColor: "var(--bg-main)",
                  borderRadius: "var(--radius-md)",
                  padding: "12px 16px",
                  fontSize: "12.5px",
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "10px",
                  border: "1px solid var(--border-light)",
                  marginTop: "12px",
                }}
              >
                <div>
                  <span style={{ color: "var(--text-light)", display: "block", fontSize: "11px", fontWeight: 700 }}>
                    RECEIPT CODE
                  </span>
                  <strong style={{ fontFamily: "var(--font-mono)", color: "var(--primary-navy)", fontSize: "13px" }}>
                    {result.receiptCode}
                  </strong>
                </div>
                <div>
                  <span style={{ color: "var(--text-light)", display: "block", fontSize: "11px", fontWeight: 700 }}>
                    STUDENT LRN
                  </span>
                  <strong style={{ fontFamily: "var(--font-mono)", color: "var(--text-main)" }}>
                    {maskStudentId(result.studentId)}
                  </strong>
                </div>
                <div>
                  <span style={{ color: "var(--text-light)", display: "block", fontSize: "11px", fontWeight: 700 }}>
                    TIMESTAMP
                  </span>
                  <strong style={{ color: "var(--text-main)" }}>
                    {result.votedAt ? new Date(result.votedAt).toLocaleString() : "Confirmed"}
                  </strong>
                </div>
                <div>
                  <span style={{ color: "var(--text-light)", display: "block", fontSize: "11px", fontWeight: 700 }}>
                    POSITIONS CAST
                  </span>
                  <strong style={{ color: "var(--color-success)" }}>
                    {result.voteCount} Positions Recorded
                  </strong>
                </div>
              </div>
            )}
          </div>
        )}

        <div style={{ marginTop: "20px", textAlign: "right" }}>
          <button
            onClick={onClose}
            style={{
              padding: "8px 18px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-light)",
              backgroundColor: "var(--bg-surface)",
              color: "var(--text-main)",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Close Window
          </button>
        </div>
      </div>
    </div>
  );
};
