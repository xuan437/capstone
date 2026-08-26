import React, { useState, useEffect, useRef } from "react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { supabase } from "../supabase";
import { POSITIONS } from "../types";
import type { Candidate, Page } from "../types";
import { base64ToImageUrl } from "../utils/imageUtils";
import BubbleLoader from "../components/BubbleLoader";

const DownloadResults: React.FC<{ setPage: (p: Page) => void }> = ({ setPage: _setPage }) => {
  const [results, setResults] = useState<{ candidate: Candidate; count: number }[]>([]);
  const [stats, setStats] = useState({ totalRegistered: 0, totalVotesCast: 0, uniqueVoters: 0 });
  const [positionTotals, setPositionTotals] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const resultsPrintRef = useRef<HTMLDivElement>(null);

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

    if (!resultsPrintRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(resultsPrintRef.current, {
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

      pdf.save(`Official_Election_Results_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("PDF export failed: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) return <div className="screen-content flex-center"><BubbleLoader message="Preparing report..." /></div>;

  return (
    <div className="screen-content content-max-width">
      <div className="no-print" style={{ display: "flex", justifyContent: "center", marginBottom: "30px", width: "100%" }}>
        <button
          className="btn-primary"
          onClick={handleDownloadPDF}
          disabled={isExporting}
          style={{ width: "auto", padding: "14px 32px", fontSize: "16px", opacity: isExporting ? 0.7 : 1 }}
        >
          <span className="material-symbols-outlined" style={{ marginRight: "8px" }}>
            {isExporting ? "hourglass_empty" : "picture_as_pdf"}
          </span>
          {isExporting ? "Generating PDF Report..." : "Download Results PDF"}
        </button>
      </div>

      <div id="printable-results" className="print-container">
        <h1 style={{ textAlign: "center", marginBottom: "10px", color: "var(--primary-navy)" }}>Official Student Election Results</h1>
        <p style={{ textAlign: "center", color: "var(--text-muted)", marginBottom: "40px" }}>
          Generated on {new Date().toLocaleString()}
        </p>

        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "40px", fontSize: "16px", flexWrap: "wrap", gap: "20px" }}>
          <div><strong>Total Registered Voters:</strong> {stats.totalRegistered}</div>
          <div><strong>Total Votes Cast:</strong> {stats.totalVotesCast}</div>
          <div><strong>Voter Turnout:</strong> {turnout}%</div>
        </div>

        <h2 style={{ borderBottom: "3px solid var(--primary-navy)", paddingBottom: "12px", marginBottom: "25px" }}>Candidate Standings</h2>

        {results.map((r, index) => {
          const totalVotesForPosition = positionTotals[r.candidate.position] || 0;
          const percentage = totalVotesForPosition > 0 ? Math.round((r.count / totalVotesForPosition) * 100) : 0;

          return (
            <div
              key={r.candidate.id}
              style={{ padding: "18px 0", borderBottom: index < results.length - 1 ? "1px solid var(--border-light)" : "none", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                <img
                  src={base64ToImageUrl(r.candidate.image_url) || `https://ui-avatars.com/api/?name=${encodeURIComponent(r.candidate.name)}&background=E8F0FE&color=0A192F`}
                  alt={r.candidate.name}
                  style={{ width: "55px", height: "55px", borderRadius: "50%", objectFit: "cover" }}
                  onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(r.candidate.name)}&background=E8F0FE&color=0A192F`; }}
                />
                <div>
                  <strong style={{ fontSize: "17px", color: "var(--text-main)" }}>{r.candidate.name}</strong>
                  <div style={{ color: "var(--text-muted)" }}>{r.candidate.position}</div>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "24px", fontWeight: "bold", color: "var(--primary-navy)" }}>{r.count}</div>
                <div style={{ fontSize: "14px", color: "var(--text-light)" }}>{percentage}% of position votes</div>
              </div>
            </div>
          );
        })}

        <div style={{ marginTop: "60px", textAlign: "center", color: "var(--text-light)", fontSize: "14px" }}>
          Supreme Student Learners Government • Official Results
        </div>
      </div>

      {/* Off-screen Printable Template for html2canvas & jsPDF */}
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
          fontFamily: "var(--font-sans)",
        }}
      >
        <div style={{ textAlign: "center", borderBottom: "3px solid #0A192F", paddingBottom: "18px", marginBottom: "24px" }}>
          <h1 style={{ color: "#0A192F", margin: "0 0 6px 0", fontSize: "24px", fontWeight: 800, letterSpacing: "-0.02em" }}>
            Official Student Election Results Report
          </h1>
          <p style={{ color: "#64748B", margin: 0, fontSize: "13px", fontWeight: 500 }}>
            Supreme Student Learners Government • Generated on {new Date().toLocaleString()}
          </p>
        </div>

        <div style={{ display: "flex", justifyContent: "space-around", marginBottom: "28px", padding: "16px", background: "#F8FAFC", border: "1px solid #CBD5E1", borderRadius: "8px", fontSize: "13px" }}>
          <div><strong style={{ color: "#64748B" }}>Total Registered Voters:</strong> <span style={{ color: "#0A192F", fontSize: "16px", fontWeight: 800, marginLeft: "6px" }}>{stats.totalRegistered}</span></div>
          <div><strong style={{ color: "#64748B" }}>Total Votes Cast:</strong> <span style={{ color: "#0A192F", fontSize: "16px", fontWeight: 800, marginLeft: "6px" }}>{stats.totalVotesCast}</span></div>
          <div><strong style={{ color: "#64748B" }}>Voter Turnout:</strong> <span style={{ color: "#059669", fontSize: "16px", fontWeight: 800, marginLeft: "6px" }}>{turnout}%</span></div>
        </div>

        {POSITIONS.map((positionName) => {
          const positionItems = results.filter((r) => r.candidate.position === positionName);
          if (positionItems.length === 0) return null;
          const posTotalVotes = positionTotals[positionName] || 0;

          return (
            <div key={positionName} style={{ marginBottom: "28px", pageBreakInside: "avoid" }}>
              <h2 style={{ color: "#ffffff", background: "#0A192F", padding: "10px 14px", margin: "0 0 12px 0", fontSize: "14px", fontWeight: 800, textTransform: "uppercase", borderRadius: "4px", letterSpacing: "0.05em", display: "flex", justifyContent: "space-between" }}>
                <span>{positionName}</span>
                <span style={{ fontSize: "12px", opacity: 0.85, fontWeight: 600 }}>Total Position Votes: {posTotalVotes}</span>
              </h2>

              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", marginBottom: "8px" }}>
                <thead>
                  <tr style={{ background: "#E2E8F0", textAlign: "left", color: "#0A192F" }}>
                    <th style={{ padding: "8px 12px", fontWeight: 700, border: "1px solid #CBD5E1", width: "45%" }}>Candidate Name</th>
                    <th style={{ padding: "8px 12px", fontWeight: 700, border: "1px solid #CBD5E1", width: "25%" }}>Section</th>
                    <th style={{ padding: "8px 12px", fontWeight: 700, border: "1px solid #CBD5E1", textAlign: "right", width: "15%" }}>Votes</th>
                    <th style={{ padding: "8px 12px", fontWeight: 700, border: "1px solid #CBD5E1", textAlign: "right", width: "15%" }}>Share</th>
                  </tr>
                </thead>
                <tbody>
                  {positionItems.map((r, idx) => {
                    const percentage = posTotalVotes > 0 ? Math.round((r.count / posTotalVotes) * 100) : 0;
                    const isWinner = idx === 0 && r.count > 0;
                    return (
                      <tr key={r.candidate.id} style={{ backgroundColor: isWinner ? "#ECFDF5" : (idx % 2 === 0 ? "#FFFFFF" : "#F8FAFC") }}>
                        <td style={{ padding: "10px 12px", fontWeight: 700, color: "#0A192F", border: "1px solid #CBD5E1" }}>
                          {r.candidate.name} {isWinner ? <span style={{ color: "#059669", fontSize: "11px", marginLeft: "6px" }}>★ Leading</span> : ""}
                        </td>
                        <td style={{ padding: "10px 12px", color: "#475569", border: "1px solid #CBD5E1", fontWeight: 600 }}>
                          {r.candidate.section ? `Section: ${r.candidate.section}` : "N/A"}
                        </td>
                        <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 800, color: "#0A192F", border: "1px solid #CBD5E1", fontSize: "14px" }}>
                          {r.count}
                        </td>
                        <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, color: "#2563EB", border: "1px solid #CBD5E1" }}>
                          {percentage}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}

        <div style={{ paddingTop: "16px", borderTop: "1px solid #CBD5E1", textAlign: "center", color: "#94A3B8", fontSize: "11px" }}>
          Supreme Student Learners Government • Official Certified Election Results Report
        </div>
      </div>
    </div>
  );
};

export default DownloadResults;