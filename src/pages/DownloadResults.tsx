import React, { useState, useEffect, useRef } from "react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { supabase } from "../supabase";
import { POSITIONS } from "../types";
import type { Candidate, Page } from "../types";
import { base64ToImageUrl } from "../utils/imageUtils";
import BubbleLoader from "../components/BubbleLoader";
import { logAuditAction } from "../utils/auditLogger";
import { useLanguage } from "../context/LanguageContext";

const DownloadResults: React.FC<{ setPage: (p: Page) => void }> = ({ setPage: _setPage }) => {
  const { t } = useLanguage();
  const [results, setResults] = useState<{ candidate: Candidate; count: number }[]>([]);
  const [stats, setStats] = useState({ totalRegistered: 0, totalVotesCast: 0, uniqueVoters: 0 });
  const [positionTotals, setPositionTotals] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [reportType, setReportType] = useState<"summary" | "certificate">("summary");

  const resultsPrintRef = useRef<HTMLDivElement>(null);
  const certificatePrintRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const run = async () => {
      const [candRes, voteRes, stuRes] = await Promise.all([
        supabase.from("candidates").select("*"),
        supabase.from("votes").select("candidate_id, student_id"),
        supabase.from("students").select("id", { count: "exact", head: true }),
      ]);

      const candidates = (candRes.data || []) as Candidate[];
      const votes = (voteRes.data || []) as any[];
      const totalRegistered = stuRes.count || 0;

      const candidatePositionMap = new Map(candidates.map((c) => [c.id, c.position]));

      const posTotals: Record<string, number> = {};
      votes.forEach((v) => {
        const position = candidatePositionMap.get(v.candidate_id);
        if (position) {
          posTotals[position] = (posTotals[position] || 0) + 1;
        }
      });

      const tally = candidates
        .map((c) => ({
          candidate: c,
          count: votes.filter((v) => v.candidate_id === c.id).length,
        }))
        .sort((a, b) => {
          const posA = POSITIONS.indexOf(a.candidate.position as any);
          const posB = POSITIONS.indexOf(b.candidate.position as any);
          const orderA = posA === -1 ? POSITIONS.length : posA;
          const orderB = posB === -1 ? POSITIONS.length : posB;
          if (orderA !== orderB) return orderA - orderB;
          return b.count - a.count;
        });

      const uniqueVoters = new Set(votes.map((v) => v.student_id)).size;

      setResults(tally);
      setPositionTotals(posTotals);
      setStats({ totalRegistered, totalVotesCast: votes.length, uniqueVoters });
      setLoading(false);
    };

    run();
  }, []);

  const turnout = stats.totalRegistered > 0 ? Math.round((stats.uniqueVoters / stats.totalRegistered) * 100) : 0;

  const handleDownloadPDF = async () => {
    if (results.length === 0) {
      alert("No election results data available to export.");
      return;
    }

    const targetRef = reportType === "certificate" ? certificatePrintRef : resultsPrintRef;
    if (!targetRef.current) return;

    setIsExporting(true);
    try {
      const canvas = await html2canvas(targetRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.98);
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "in",
        format: "letter",
      });

      const imgWidth = 8.5 - 0.8;
      const pageHeight = 11 - 0.8;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0.4;

      pdf.addImage(imgData, "JPEG", 0.4, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight + 0.4;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0.4, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const fileName = reportType === "certificate"
        ? `Official_Certificate_of_Canvass_${new Date().toISOString().split("T")[0]}.pdf`
        : `Election_Results_Summary_${new Date().toISOString().split("T")[0]}.pdf`;

      pdf.save(fileName);
      await logAuditAction("ELECTION_CERTIFICATE_EXPORTED", "Admin", `Exported ${reportType.toUpperCase()} document as PDF`);
    } catch (err) {
      console.error("PDF export error:", err);
      alert("An error occurred while generating the PDF.");
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) {
    return <BubbleLoader message="Loading Official Election Results..." />;
  }

  // Find declared winners (1st place per position)
  const winnersByPosition = POSITIONS.map((pos) => {
    const candidatesInPos = results.filter((r) => r.candidate.position === pos);
    const winner = candidatesInPos.length > 0 ? candidatesInPos[0] : null;
    return { position: pos, winner, posTotal: positionTotals[pos] || 0 };
  }).filter((item) => item.winner !== null);

  return (
    <div className="screen-content content-max-width" style={{ maxWidth: "900px", margin: "0 auto" }}>
      {/* Header Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <span className="overline">Official Canvass</span>
          <h1 style={{ margin: "2px 0 0" }}>Results & Official Certificate</h1>
          <p style={{ color: "var(--text-muted)", margin: "4px 0 0", fontSize: "13.5px" }}>
            Generate certified vote summaries or the official Certificate of Canvass.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* Report Type Toggle */}
          <div style={{ display: "flex", backgroundColor: "var(--bg-surface)", padding: "4px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-light)" }}>
            <button
              onClick={() => setReportType("summary")}
              style={{
                padding: "6px 14px",
                borderRadius: "var(--radius-sm)",
                border: "none",
                backgroundColor: reportType === "summary" ? "var(--primary-navy)" : "transparent",
                color: reportType === "summary" ? "var(--text-white)" : "var(--text-muted)",
                fontWeight: 700,
                fontSize: "12.5px",
                cursor: "pointer",
              }}
            >
              {t.summaryTabBtn || "Summary Report"}
            </button>
            <button
              onClick={() => setReportType("certificate")}
              style={{
                padding: "6px 14px",
                borderRadius: "var(--radius-sm)",
                border: "none",
                backgroundColor: reportType === "certificate" ? "var(--primary-navy)" : "transparent",
                color: reportType === "certificate" ? "var(--text-white)" : "var(--text-muted)",
                fontWeight: 700,
                fontSize: "12.5px",
                cursor: "pointer",
              }}
            >
              {t.certificateTabBtn || "Certificate of Canvass"}
            </button>
          </div>

          <button
            className="btn-primary"
            onClick={handleDownloadPDF}
            disabled={isExporting}
            style={{ padding: "10px 20px", display: "flex", alignItems: "center", gap: "8px", borderRadius: "var(--radius-md)" }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
              picture_as_pdf
            </span>
            {isExporting ? "Generating PDF..." : (t.exportPdfBtn || "Export as PDF")}
          </button>
        </div>
      </div>

      {/* Screen View */}
      {reportType === "summary" ? (
        /* Summary View */
        <div className="card-box">
          <div style={{ display: "flex", justifyContent: "space-around", marginBottom: "28px", padding: "16px", background: "var(--bg-surface)", border: "1px solid var(--border-light)", borderRadius: "var(--radius-md)" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "12px", color: "var(--text-light)", fontWeight: 700 }}>REGISTERED VOTERS</div>
              <div style={{ fontSize: "20px", fontWeight: 800, color: "var(--primary-navy)" }}>{stats.totalRegistered}</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "12px", color: "var(--text-light)", fontWeight: 700 }}>VOTES CAST</div>
              <div style={{ fontSize: "20px", fontWeight: 800, color: "var(--primary-navy)" }}>{stats.totalVotesCast}</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "12px", color: "var(--text-light)", fontWeight: 700 }}>VOTER TURNOUT</div>
              <div style={{ fontSize: "20px", fontWeight: 800, color: "var(--color-success)" }}>{turnout}%</div>
            </div>
          </div>

          {results.map((r, index) => {
            const posTotalVotes = positionTotals[r.candidate.position] || 0;
            const percentage = posTotalVotes > 0 ? Math.round((r.count / posTotalVotes) * 100) : 0;
            return (
              <div key={r.candidate.id} style={{ padding: "16px 0", borderBottom: index < results.length - 1 ? "1px solid var(--border-light)" : "none", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                  <img
                    src={base64ToImageUrl(r.candidate.image_url) || `https://ui-avatars.com/api/?name=${encodeURIComponent(r.candidate.name)}&background=E8F0FE&color=0A192F`}
                    alt={r.candidate.name}
                    style={{ width: "50px", height: "50px", borderRadius: "50%", objectFit: "cover" }}
                  />
                  <div>
                    <strong style={{ fontSize: "16px", color: "var(--text-main)" }}>{r.candidate.name}</strong>
                    <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>{r.candidate.position}</div>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "22px", fontWeight: 800, color: "var(--primary-navy)" }}>{r.count}</div>
                  <div style={{ fontSize: "12.5px", color: "var(--text-light)" }}>{percentage}% of position votes</div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Certificate View Screen Preview */
        <div className="card-box" style={{ padding: "32px", border: "2px solid var(--primary-navy)", background: "var(--bg-main)" }}>
          <div style={{ textAlign: "center", borderBottom: "2px double var(--primary-navy)", paddingBottom: "16px", marginBottom: "24px" }}>
            <h4 style={{ margin: 0, textTransform: "uppercase", fontSize: "11px", letterSpacing: "0.1em", color: "var(--text-light)" }}>
              Republic of the Philippines • Department of Education
            </h4>
            <h2 style={{ margin: "4px 0", fontSize: "20px", fontWeight: 900, color: "var(--primary-navy)" }}>
              DOMINGO LEDESMA MAPA HIGH SCHOOL
            </h2>
            <div style={{ fontSize: "14px", fontWeight: 800, color: "var(--color-purple)", letterSpacing: "0.08em", marginTop: "6px" }}>
              SUPREME STUDENT LEARNERS GOVERNMENT ELECTIONS
            </div>
            <h3 style={{ margin: "14px 0 0", fontSize: "17px", fontWeight: 900, color: "var(--text-main)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Official Certificate of Canvass & Declaration of Winners
            </h3>
          </div>

          <p style={{ fontSize: "13px", color: "var(--text-main)", lineHeight: 1.6, marginBottom: "20px" }}>
            WE, THE UNDERSIGNED MEMBERS of the Electoral Board of Canvassers, hereby certify that we have officially canvassed the votes cast in the Supreme Student Learners Government Elections held on <strong>{new Date().toLocaleDateString()}</strong>. Total turnout recorded: <strong>{stats.uniqueVoters}</strong> out of <strong>{stats.totalRegistered}</strong> enrolled voters (<strong>{turnout}% Turnout</strong>).
          </p>

          <h4 style={{ fontSize: "13.5px", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--primary-navy)", marginBottom: "12px", paddingBottom: "4px", borderBottom: "1px solid var(--border-light)" }}>
            Official Roster of Duly Elected Officers
          </h4>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "32px" }}>
            {winnersByPosition.map(({ position, winner, posTotal }) => {
              const pct = posTotal > 0 ? Math.round((winner!.count / posTotal) * 100) : 0;
              return (
                <div key={position} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", backgroundColor: "var(--bg-surface)", border: "1px solid var(--border-light)", borderRadius: "var(--radius-md)" }}>
                  <div>
                    <span style={{ fontSize: "11px", fontWeight: 800, color: "var(--text-light)", textTransform: "uppercase", display: "block" }}>{position}</span>
                    <strong style={{ fontSize: "15px", color: "var(--primary-navy)" }}>{winner!.candidate.name}</strong>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: "14px", fontWeight: 800, color: "var(--color-success)" }}>{winner!.count} Votes</span>
                    <span style={{ fontSize: "12px", color: "var(--text-muted)", marginLeft: "8px" }}>({pct}% of votes)</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: "40px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px", textAlign: "center", paddingTop: "20px", borderTop: "1px solid var(--border-light)" }}>
            <div>
              <div style={{ borderBottom: "1px solid var(--text-main)", marginBottom: "6px", height: "30px" }}></div>
              <strong style={{ fontSize: "12px", color: "var(--text-main)" }}>Electoral Board Chairman</strong>
            </div>
            <div>
              <div style={{ borderBottom: "1px solid var(--text-main)", marginBottom: "6px", height: "30px" }}></div>
              <strong style={{ fontSize: "12px", color: "var(--text-main)" }}>Commission Secretary</strong>
            </div>
            <div>
              <div style={{ borderBottom: "1px solid var(--text-main)", marginBottom: "6px", height: "30px" }}></div>
              <strong style={{ fontSize: "12px", color: "var(--text-main)" }}>School Principal / Adviser</strong>
            </div>
          </div>
        </div>
      )}

      {/* Printable Hidden Template for PDF Canvas */}
      <div
        ref={resultsPrintRef}
        style={{
          position: "absolute",
          left: "-9999px",
          top: "-9999px",
          width: "800px",
          background: "#ffffff",
          color: "#0F172A",
          padding: "36px",
          boxSizing: "border-box",
        }}
      >
        <div style={{ textAlign: "center", borderBottom: "3px solid #0D7A3E", paddingBottom: "18px", marginBottom: "24px" }}>
          <h1 style={{ color: "#0D7A3E", margin: "0 0 6px 0", fontSize: "24px", fontWeight: 800 }}>
            Official Student Election Results Report
          </h1>
          <p style={{ color: "#64748B", margin: 0, fontSize: "13px" }}>
            Supreme Student Learners Government • Generated on {new Date().toLocaleString()}
          </p>
        </div>

        {results.map((r) => (
          <div key={r.candidate.id} style={{ padding: "10px 0", borderBottom: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between" }}>
            <div>
              <strong>{r.candidate.name}</strong> - <span>{r.candidate.position}</span>
            </div>
            <strong style={{ color: "#0D7A3E" }}>{r.count} Votes</strong>
          </div>
        ))}
      </div>

      <div
        ref={certificatePrintRef}
        style={{
          position: "absolute",
          left: "-9999px",
          top: "-9999px",
          width: "800px",
          background: "#ffffff",
          color: "#0F172A",
          padding: "40px",
          boxSizing: "border-box",
          fontFamily: "var(--font-sans)",
        }}
      >
        <div style={{ textAlign: "center", borderBottom: "3px double #0D7A3E", paddingBottom: "18px", marginBottom: "24px" }}>
          <h4 style={{ margin: 0, textTransform: "uppercase", fontSize: "11px", letterSpacing: "0.1em", color: "#64748B" }}>
            Republic of the Philippines • Department of Education
          </h4>
          <h2 style={{ margin: "4px 0", fontSize: "22px", fontWeight: 900, color: "#0D7A3E" }}>
            DOMINGO LEDESMA MAPA HIGH SCHOOL
          </h2>
          <div style={{ fontSize: "14px", fontWeight: 800, color: "#C026D3", letterSpacing: "0.08em", marginTop: "6px" }}>
            SUPREME STUDENT LEARNERS GOVERNMENT ELECTIONS
          </div>
          <h3 style={{ margin: "14px 0 0", fontSize: "18px", fontWeight: 900, color: "#0F172A", textTransform: "uppercase" }}>
            Official Certificate of Canvass & Declaration of Winners
          </h3>
        </div>

        <p style={{ fontSize: "13px", color: "0F172A", lineHeight: 1.6, marginBottom: "24px" }}>
          WE, THE UNDERSIGNED MEMBERS of the Electoral Board of Canvassers, hereby certify that we have officially canvassed the votes cast in the Supreme Student Learners Government Elections held on <strong>{new Date().toLocaleDateString()}</strong>. Total turnout recorded: <strong>{stats.uniqueVoters}</strong> out of <strong>{stats.totalRegistered}</strong> enrolled voters (<strong>{turnout}% Turnout</strong>).
        </p>

        <h4 style={{ fontSize: "14px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#0D7A3E", marginBottom: "14px", paddingBottom: "6px", borderBottom: "2px solid #0D7A3E" }}>
          Official Roster of Duly Elected Officers
        </h4>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", marginBottom: "36px" }}>
          <thead>
            <tr style={{ backgroundColor: "#0D7A3E", color: "#FFFFFF", textAlign: "left" }}>
              <th style={{ padding: "10px 12px", fontWeight: 700 }}>Position</th>
              <th style={{ padding: "10px 12px", fontWeight: 700 }}>Duly Elected Candidate</th>
              <th style={{ padding: "10px 12px", fontWeight: 700, textAlign: "right" }}>Votes Garnered</th>
              <th style={{ padding: "10px 12px", fontWeight: 700, textAlign: "right" }}>Vote Share</th>
            </tr>
          </thead>
          <tbody>
            {winnersByPosition.map(({ position, winner, posTotal }, idx) => {
              const pct = posTotal > 0 ? Math.round((winner!.count / posTotal) * 100) : 0;
              return (
                <tr key={position} style={{ borderBottom: "1px solid #E2E8F0", backgroundColor: idx % 2 === 0 ? "#FFFFFF" : "#F8FAFC" }}>
                  <td style={{ padding: "10px 12px", fontWeight: 700, color: "#64748B" }}>{position}</td>
                  <td style={{ padding: "10px 12px", fontWeight: 800, color: "#0D7A3E", fontSize: "14px" }}>{winner!.candidate.name}</td>
                  <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 800, color: "#0F172A" }}>{winner!.count}</td>
                  <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, color: "#C026D3" }}>{pct}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div style={{ marginTop: "60px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "24px", textAlign: "center" }}>
          <div>
            <div style={{ borderBottom: "1px solid #0F172A", marginBottom: "8px", height: "40px" }}></div>
            <strong style={{ fontSize: "12px", color: "#0F172A" }}>Electoral Board Chairman</strong>
          </div>
          <div>
            <div style={{ borderBottom: "1px solid #0F172A", marginBottom: "8px", height: "40px" }}></div>
            <strong style={{ fontSize: "12px", color: "#0F172A" }}>Commission Secretary</strong>
          </div>
          <div>
            <div style={{ borderBottom: "1px solid #0F172A", marginBottom: "8px", height: "40px" }}></div>
            <strong style={{ fontSize: "12px", color: "#0F172A" }}>School Principal / Adviser</strong>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DownloadResults;