import React, { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { POSITIONS } from "../types";
import type { Candidate, Page } from "../types";
import ReturnButton from "../components/ReturnButton";
import { base64ToImageUrl } from "../utils/imageUtils";

const DownloadResults: React.FC<{ setPage: (p: Page) => void }> = ({ setPage }) => {
  const [results, setResults] = useState<{ candidate: Candidate; count: number }[]>([]);
  const [stats, setStats] = useState({ totalRegistered: 0, totalVotesCast: 0, uniqueVoters: 0 });
  // Store total votes per position to fix the percentage calculation bug
  const [positionTotals, setPositionTotals] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      const [candRes, voteRes, stuRes] = await Promise.all([
        supabase.from("candidates").select("*"),
        supabase.from("votes").select("candidate_id, student_id"),
        supabase.from("students").select("id", { count: "exact", head: true }), // head: true optimizes by not pulling all rows
      ]);

      const candidates = (candRes.data || []) as Candidate[];
      const votes = (voteRes.data || []) as any[];
      const totalRegistered = stuRes.count || 0;

      // Create a map of candidate ID to their position for fast lookup
      const candidatePositionMap = new Map(candidates.map(c => [c.id, c.position]));

      // Calculate total votes cast specifically for each position
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
    const element = document.getElementById("printable-results");
    if (!element) return;

    // @ts-ignore
    const html2pdf = (await import("html2pdf.js")).default;

    const opt = {
      margin: 0.5,
      filename: 'Official_Election_Results.pdf',
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'in' as const, format: 'letter', orientation: 'landscape' as const }
    };

    await (html2pdf as any)().set(opt).from(element).save();
  };

  if (loading) return <div className="screen-content flex-center">Preparing report...</div>;

  return (
    <div className="screen-content content-max-width">
      <ReturnButton onClick={() => setPage("admin_setup")} />

      <div className="no-print" style={{ marginBottom: "30px", textAlign: "center" }}>
        <button className="btn-primary" onClick={handleDownloadPDF} style={{ padding: "14px 32px", fontSize: "16px" }}>
          <span className="material-symbols-outlined" style={{ marginRight: "8px" }}>picture_as_pdf</span>
          Download Results
        </button>
      </div>

      <div
        id="printable-results"
        style={{ background: "white", padding: "50px", maxWidth: "900px", margin: "0 auto", border: "2px solid #0B1736" }}
      >
        <h1 style={{ textAlign: "center", marginBottom: "10px", color: "#0B1736" }}>Official Student Election Results</h1>
        <p style={{ textAlign: "center", color: "#555", marginBottom: "40px" }}>
          Generated on {new Date().toLocaleString()}
        </p>

        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "40px", fontSize: "16px", flexWrap: "wrap", gap: "20px" }}>
          <div><strong>Total Registered Voters:</strong> {stats.totalRegistered}</div>
          <div><strong>Total Votes Cast:</strong> {stats.totalVotesCast}</div>
          <div><strong>Voter Turnout:</strong> {turnout}%</div>
        </div>

        <h2 style={{ borderBottom: "3px solid #0B1736", paddingBottom: "12px", marginBottom: "25px" }}>Candidate Standings</h2>

        {results.map((r, index) => {
          // Fixed: Calculate percentage based on total votes for this specific position
          const totalVotesForPosition = positionTotals[r.candidate.position] || 0;
          const percentage = totalVotesForPosition > 0 ? Math.round((r.count / totalVotesForPosition) * 100) : 0;

          return (
            <div
              key={r.candidate.id}
              style={{ padding: "18px 0", borderBottom: index < results.length - 1 ? "1px solid #ddd" : "none", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                <img
                  src={base64ToImageUrl(r.candidate.image_url) || `https://ui-avatars.com/api/?name=${r.candidate.name}&background=E8F0FE&color=0B1736`}
                  alt={r.candidate.name}
                  style={{ width: "55px", height: "55px", borderRadius: "50%", objectFit: "cover" }}
                  onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(r.candidate.name)}&background=E8F0FE&color=0B1736`; }}
                />
                <div>
                  <strong style={{ fontSize: "17px" }}>{r.candidate.name}</strong>
                  <div style={{ color: "#555" }}>{r.candidate.position}</div>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "24px", fontWeight: "bold", color: "#0B1736" }}>{r.count}</div>
                <div style={{ fontSize: "14px", color: "#666" }}>{percentage}% of position votes</div>
              </div>
            </div>
          );
        })}

        <div style={{ marginTop: "60px", textAlign: "center", color: "#666", fontSize: "14px" }}>
          Supreme Student Learners Government • Official Results
        </div>
      </div>
    </div>
  );
};

export default DownloadResults;