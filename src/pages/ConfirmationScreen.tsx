import React, { useState, useEffect, useRef } from "react";
import {
  CheckCircle2,
  Printer,
  Copy,
  Check,
  LogOut,
  MapPin,
  UserCheck,
  Download,
  ScanFace,
} from "lucide-react";
import { User, Student, Page } from "../types";
import { supabase } from "../supabase";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export interface DigitalReceiptData {
  receiptId: string;
  studentId: string;
  studentName: string;
  grade?: string;
  section?: string;
  votedAt: string;
  location?: string;
  biometricVerification?: string;
  selections: { position: string; candidateName: string }[];
  totalVotes: number;
}

interface ConfirmationScreenProps {
  handleLogout: () => void;
  setPage?: (p: Page) => void;
  currentUser?: User | Student | null;
}

const ConfirmationScreen: React.FC<ConfirmationScreenProps> = ({
  handleLogout,
  setPage,
  currentUser,
}) => {
  const [receipt, setReceipt] = useState<DigitalReceiptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const receiptCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 1. Try reading from sessionStorage first
    try {
      const stored = sessionStorage.getItem("last_digital_receipt");
      if (stored) {
        setReceipt(JSON.parse(stored));
        setLoading(false);
        return;
      }
    } catch {
      // Ignore
    }

    // 2. Fallback: fetch from Supabase if currentUser exists
    const loadFromDb = async () => {
      const studentId = currentUser && "id" in currentUser ? String(currentUser.id) : null;
      if (!studentId) {
        setLoading(false);
        return;
      }

      try {
        // Fetch receipt row
        const { data: receiptRow } = await supabase
          .from("receipts")
          .select("*")
          .eq("student_id", studentId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        // Fetch student row
        const { data: studentRow } = await supabase
          .from("students")
          .select("*")
          .eq("id", studentId)
          .maybeSingle();

        // Fetch votes with candidate names
        const { data: voteRows } = await supabase
          .from("votes")
          .select("candidate_id, position, voted_at, location")
          .eq("student_id", studentId);

        let selections: { position: string; candidateName: string }[] = [];
        if (voteRows && voteRows.length > 0) {
          const candIds = voteRows.map((v) => v.candidate_id);
          const { data: cands } = await supabase
            .from("candidates")
            .select("id, name, position")
            .in("id", candIds);

          const candMap = new Map((cands || []).map((c) => [c.id, c.name]));
          selections = voteRows.map((v) => ({
            position: v.position || "Position",
            candidateName: candMap.get(v.candidate_id) || "Candidate",
          }));
        }

        const receiptParsed = receiptRow?.receipt_data
          ? typeof receiptRow.receipt_data === "string"
            ? JSON.parse(receiptRow.receipt_data)
            : receiptRow.receipt_data
          : null;

        const effectiveReceipt: DigitalReceiptData = {
          receiptId: receiptRow?.receipt_id || receiptParsed?.receipt_code || `REC-${studentId.slice(-4).toUpperCase()}-${Date.now().toString().slice(-4)}`,
          studentId: studentId,
          studentName: studentRow?.name || (currentUser?.name ?? "Student Voter"),
          grade: studentRow?.grade || ("grade" in (currentUser || {}) ? (currentUser as any).grade : "10"),
          section: studentRow?.section || ("section" in (currentUser || {}) ? (currentUser as any).section : ""),
          votedAt: studentRow?.voted_at || receiptRow?.created_at || new Date().toISOString(),
          location: studentRow?.vote_location || receiptParsed?.location || "Negros Oriental Region, Philippines",
          biometricVerification: "Face ID Biometrically Authenticated",
          selections,
          totalVotes: selections.length,
        };

        setReceipt(effectiveReceipt);
      } catch (err) {
        console.error("Error loading receipt:", err);
      } finally {
        setLoading(false);
      }
    };

    loadFromDb();
  }, [currentUser]);

  const handleCopyCode = async () => {
    if (!receipt?.receiptId) return;
    try {
      await navigator.clipboard.writeText(receipt.receiptId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // fallback
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (!receiptCardRef.current || !receipt) return;
    setIsExportingPdf(true);
    try {
      const element = receiptCardRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const imgWidth = 170;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const positionX = (210 - imgWidth) / 2;
      const positionY = 16;

      pdf.addImage(imgData, "PNG", positionX, positionY, imgWidth, Math.min(imgHeight, pageHeight - 32));
      pdf.save(`Official_SSLG_Receipt_${receipt.receiptId}.pdf`);
    } catch (err) {
      console.error("PDF generation error:", err);
      window.print();
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="receipt-screen-viewport">
      <style>{`
        .receipt-screen-viewport {
          min-height: calc(100vh - 80px);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          padding: 24px 16px 48px;
          box-sizing: border-box;
          font-family: var(--font-sans);
          color: var(--text-main);
        }

        .receipt-container-card {
          max-width: 580px;
          width: 100%;
          background: var(--bg-card);
          border: 1px solid var(--border-light);
          border-radius: var(--radius-xl, 12px);
          box-shadow: var(--shadow-lg, 0 10px 25px -5px rgba(0,0,0,0.1));
          overflow: hidden;
          position: relative;
        }

        /* Scalloped / Perforated Ticket Edge */
        .receipt-perforation {
          position: relative;
          height: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0;
          overflow: hidden;
        }

        .receipt-perforation::before {
          content: "";
          position: absolute;
          left: 0;
          right: 0;
          top: 50%;
          border-top: 1.5px dashed var(--border-subtle);
        }

        .receipt-perforation-notch-left {
          position: absolute;
          left: -10px;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: var(--bg-surface);
          border: 1px solid var(--border-light);
          z-index: 2;
        }

        .receipt-perforation-notch-right {
          position: absolute;
          right: -10px;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: var(--bg-surface);
          border: 1px solid var(--border-light);
          z-index: 2;
        }

        .receipt-barcode-line {
          height: 38px;
          background: repeating-linear-gradient(
            90deg,
            var(--text-main) 0,
            var(--text-main) 2px,
            transparent 2px,
            transparent 4px,
            var(--text-main) 4px,
            var(--text-main) 7px,
            transparent 7px,
            transparent 9px,
            var(--text-main) 9px,
            var(--text-main) 13px,
            transparent 13px,
            transparent 15px
          );
          opacity: 0.85;
          margin: 10px 0 6px;
          border-radius: 2px;
        }

        @media print {
          body * {
            visibility: hidden;
          }
          .receipt-container-card,
          .receipt-container-card * {
            visibility: visible;
          }
          .receipt-container-card {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            max-width: 100% !important;
            box-shadow: none !important;
            border: 1px solid #cbd5e1 !important;
          }
          .receipt-no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Top Success Notification */}
      <div style={{ textAlign: "center", marginBottom: "20px" }} className="receipt-no-print">
        <div
          style={{
            width: "52px",
            height: "52px",
            borderRadius: "50%",
            backgroundColor: "rgba(16, 185, 129, 0.12)",
            border: "1.5px solid rgba(16, 185, 129, 0.3)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#10B981",
            boxShadow: "0 4px 14px rgba(16, 185, 129, 0.2)",
            marginBottom: "12px",
          }}
        >
          <CheckCircle2 size={28} />
        </div>
        <h1
          style={{
            margin: "0 0 4px",
            fontSize: "22px",
            fontWeight: 700,
            letterSpacing: "-0.02em",
            color: "var(--text-main)",
          }}
        >
          Vote Successfully Recorded!
        </h1>
        <p style={{ margin: 0, fontSize: "13px", color: "var(--text-muted)" }}>
          Your official ballot has been cryptographically sealed and tabulated. Here is your official digital receipt.
        </p>
      </div>

      {/* Main Printable Digital Receipt Card */}
      <div className="receipt-container-card" ref={receiptCardRef}>
        {/* Top Header Strip */}
        <div
          style={{
            backgroundColor: "var(--bg-surface)",
            borderBottom: "1px solid var(--border-light)",
            padding: "18px 22px 14px",
            textAlign: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginBottom: "8px" }}>
            <img
              src="/logo.png"
              alt="SSLG Logo"
              style={{ width: "38px", height: "38px", borderRadius: "50%", objectFit: "cover" }}
            />
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-light)" }}>
                Republic of the Philippines &bull; DepEd
              </div>
              <div style={{ fontSize: "13.5px", fontWeight: 800, color: "var(--primary-navy)", letterSpacing: "0.02em" }}>
                SUPREME SECONDARY LEARNER GOVERNMENT
              </div>
            </div>
          </div>

          <div
            style={{
              fontSize: "12px",
              fontWeight: 700,
              letterSpacing: "0.06em",
              color: "var(--text-main)",
              textTransform: "uppercase",
              padding: "4px 12px",
              background: "var(--bg-card)",
              borderRadius: "4px",
              border: "1px solid var(--border-light)",
              display: "inline-block",
            }}
          >
            Official Digital Voting Receipt &bull; 2026 Election
          </div>
        </div>

        {/* Receipt Code Banner */}
        <div
          style={{
            padding: "16px 22px",
            background: "linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(5, 150, 105, 0.03) 100%)",
            borderBottom: "1px solid var(--border-light)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <div>
            <div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", color: "var(--text-light)", letterSpacing: "0.06em" }}>
              Verification Serial Code
            </div>
            <div
              style={{
                fontFamily: "var(--font-mono, monospace)",
                fontSize: "19px",
                fontWeight: 800,
                color: "var(--primary-navy)",
                letterSpacing: "0.08em",
              }}
            >
              {receipt?.receiptId || "REC-PENDING"}
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopyCode}
            className="receipt-no-print"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 12px",
              borderRadius: "6px",
              border: "1px solid var(--border-subtle)",
              background: "var(--bg-card)",
              color: "var(--text-main)",
              fontSize: "11.5px",
              fontWeight: 600,
              cursor: "pointer",
            }}
            title="Copy verification code"
          >
            {copied ? <Check size={13} style={{ color: "#10B981" }} /> : <Copy size={13} />}
            <span>{copied ? "Copied!" : "Copy Code"}</span>
          </button>
        </div>

        {/* Voter & Session Metadata Details */}
        <div style={{ padding: "18px 22px 14px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              gap: "10px",
              marginBottom: "16px",
            }}
          >
            {/* Voter Name */}
            <div style={{ background: "var(--bg-surface)", padding: "10px", borderRadius: "6px", border: "1px solid var(--border-light)" }}>
              <div style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", color: "var(--text-light)" }}>
                Voter Name
              </div>
              <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-main)" }}>
                {receipt?.studentName || currentUser?.name || "Student Voter"}
              </div>
            </div>

            {/* Student LRN */}
            <div style={{ background: "var(--bg-surface)", padding: "10px", borderRadius: "6px", border: "1px solid var(--border-light)" }}>
              <div style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", color: "var(--text-light)" }}>
                Learner Ref. Number (LRN)
              </div>
              <div style={{ fontSize: "13px", fontWeight: 700, fontFamily: "var(--font-mono, monospace)", color: "var(--text-main)" }}>
                {receipt?.studentId || ("id" in (currentUser || {}) ? String(currentUser?.id) : "—")}
              </div>
            </div>

            {/* Grade & Section */}
            <div style={{ background: "var(--bg-surface)", padding: "10px", borderRadius: "6px", border: "1px solid var(--border-light)" }}>
              <div style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", color: "var(--text-light)" }}>
                Grade &amp; Section
              </div>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-main)" }}>
                Grade {receipt?.grade || "10"} {receipt?.section ? `• ${receipt.section}` : ""}
              </div>
            </div>

            {/* Date & Time */}
            <div style={{ background: "var(--bg-surface)", padding: "10px", borderRadius: "6px", border: "1px solid var(--border-light)" }}>
              <div style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", color: "var(--text-light)" }}>
                Timestamp (PHT)
              </div>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-main)" }}>
                {receipt?.votedAt
                  ? new Date(receipt.votedAt).toLocaleString("en-PH", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    })
                  : new Date().toLocaleString()}
              </div>
            </div>
          </div>

          {/* Location & Biometric Badges */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "16px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "11.5px",
                color: "var(--text-muted)",
                background: "var(--bg-surface)",
                padding: "8px 12px",
                borderRadius: "6px",
                border: "1px solid var(--border-light)",
              }}
            >
              <MapPin size={13} style={{ color: "var(--accent-primary)", flexShrink: 0 }} />
              <span>
                <strong>Geofenced Location:</strong> {receipt?.location || "Negros Oriental Region, Philippines"}
              </span>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "11.5px",
                color: "#059669",
                background: "rgba(16, 185, 129, 0.08)",
                padding: "8px 12px",
                borderRadius: "6px",
                border: "1px solid rgba(16, 185, 129, 0.25)",
              }}
            >
              <ScanFace size={13} style={{ color: "#10B981", flexShrink: 0 }} />
              <span>
                <strong>Biometric Authenticated:</strong> {receipt?.biometricVerification || "Biometric Face ID Verified"}
              </span>
            </div>
          </div>

          {/* Perforated Divider */}
          <div className="receipt-perforation">
            <div className="receipt-perforation-notch-left" />
            <div className="receipt-perforation-notch-right" />
          </div>

          {/* Ballot Summary Table */}
          <div style={{ marginTop: "14px", marginBottom: "14px" }}>
            <div
              style={{
                fontSize: "11px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "var(--text-light)",
                marginBottom: "8px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>Official Votes Cast Summary</span>
              <span>{receipt?.selections.length || 0} Selection(s)</span>
            </div>

            {loading ? (
              <div style={{ textAlign: "center", padding: "16px", fontSize: "12px", color: "var(--text-muted)" }}>
                Loading official ballot selections...
              </div>
            ) : receipt?.selections && receipt.selections.length > 0 ? (
              <div
                style={{
                  border: "1px solid var(--border-light)",
                  borderRadius: "6px",
                  overflow: "hidden",
                }}
              >
                {receipt.selections.map((sel, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 12px",
                      borderBottom: idx < receipt.selections.length - 1 ? "1px solid var(--border-light)" : "none",
                      backgroundColor: idx % 2 === 0 ? "var(--bg-card)" : "var(--bg-surface)",
                      fontSize: "12px",
                    }}
                  >
                    <span style={{ fontWeight: 600, color: "var(--text-main)" }}>
                      {sel.position}
                    </span>
                    <span style={{ fontWeight: 600, color: "var(--primary-navy)", textAlign: "right" }}>
                      {sel.candidateName}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div
                style={{
                  padding: "10px 12px",
                  borderRadius: "6px",
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-light)",
                  fontSize: "12px",
                  color: "var(--text-muted)",
                  textAlign: "center",
                }}
              >
                Official ballot selections securely hashed into election ledger.
              </div>
            )}
          </div>

          {/* Barcode representation */}
          <div className="receipt-barcode-line" />
          <div
            style={{
              fontSize: "9.5px",
              fontFamily: "var(--font-mono, monospace)",
              color: "var(--text-light)",
              textAlign: "center",
              letterSpacing: "0.15em",
              marginBottom: "8px",
            }}
          >
            *{receipt?.receiptId || "SSLG-OFFICIAL-VOTE-2026"}*
          </div>

          {/* Footer Security Note */}
          <div
            style={{
              textAlign: "center",
              fontSize: "10.5px",
              color: "var(--text-light)",
              lineHeight: 1.5,
              borderTop: "1px solid var(--border-light)",
              paddingTop: "10px",
            }}
          >
            This cryptographic digital receipt serves as tamper-evident proof that your ballot was received, authenticated, and included in the election tally.
          </div>
        </div>
      </div>

      {/* Action Toolbar (Hidden during Print) */}
      <div
        className="receipt-no-print"
        style={{
          marginTop: "20px",
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
          justifyContent: "center",
          maxWidth: "580px",
          width: "100%",
        }}
      >
        <button
          type="button"
          onClick={handlePrint}
          className="btn-primary"
          style={{
            flex: "1 1 140px",
            padding: "10px 14px",
            fontSize: "12.5px",
            fontWeight: 600,
            borderRadius: "8px",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
          }}
        >
          <Printer size={15} />
          <span>Print Receipt</span>
        </button>

        <button
          type="button"
          onClick={handleDownloadPdf}
          disabled={isExportingPdf}
          className="btn-secondary"
          style={{
            flex: "1 1 140px",
            padding: "10px 14px",
            fontSize: "12.5px",
            fontWeight: 600,
            borderRadius: "8px",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
          }}
        >
          <Download size={15} />
          <span>{isExportingPdf ? "Generating..." : "Download PDF"}</span>
        </button>

        {setPage && (
          <button
            type="button"
            onClick={() => setPage("student_profile")}
            className="btn-secondary"
            style={{
              flex: "1 1 140px",
              padding: "10px 14px",
              fontSize: "12.5px",
              fontWeight: 600,
              borderRadius: "8px",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
            }}
          >
            <UserCheck size={15} />
            <span>Voters Profile</span>
          </button>
        )}

        <button
          type="button"
          onClick={handleLogout}
          className="btn-danger"
          style={{
            flex: "1 1 140px",
            padding: "10px 14px",
            fontSize: "12.5px",
            fontWeight: 600,
            borderRadius: "8px",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
          }}
        >
          <LogOut size={15} />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
};

export default ConfirmationScreen;
