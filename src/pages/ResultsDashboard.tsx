import React, { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { POSITIONS } from "../types";
import type { Candidate, User, Page } from "../types";
import { base64ToImageUrl } from "../utils/imageUtils";
import { useLanguage } from "../context/LanguageContext";

const ResultsDashboard: React.FC<{ currentUser: User | null; setPage: (p: Page) => void; searchTerm?: string }> = ({
  currentUser,
  setPage,
  searchTerm,
}) => {
  const { t } = useLanguage();
  const [results, setResults] = useState<{ candidate: Candidate; count: number }[]>([]);
  const [positionTotals, setPositionTotals] = useState<Record<string, number>>({});
  const [stats, setStats] = useState({ totalRegistered: 0, totalVotesCast: 0, uniqueVoters: 0 });
  const [selectedPositionFilter, setSelectedPositionFilter] = useState<string>("All");

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const [candidatesRes, votesRes, studentsRes] = await Promise.all([
          supabase.from("candidates").select("*"),
          supabase.from("votes").select("candidate_id, student_id"),
          supabase.from("students").select("id", { count: "exact" }),
        ]);

        const candidates = (candidatesRes.data || []) as Candidate[];
        const votes = (votesRes.data || []) as any[];
        const totalRegistered = studentsRes.count || 0;

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

        const uniqueVoters = new Set(votes.map((v) => v.student_id).filter(Boolean)).size;

        setResults(tally);
        setPositionTotals(posTotals);
        setStats({ totalRegistered, totalVotesCast: votes.length, uniqueVoters });
      } catch (err) {
        console.error("Error fetching election results:", err);
      }
    };

    fetchResults();
  }, []);

  const turnoutPercent = stats.totalRegistered > 0 ? Math.round((stats.uniqueVoters / stats.totalRegistered) * 100) : 0;

  const isAdmin = currentUser && "isAdmin" in currentUser && currentUser.isAdmin;
  const isStudent = currentUser && !isAdmin && "has_voted" in currentUser;

  const filteredResults = results.filter((r) => {
    const matchesPos = selectedPositionFilter === "All" || r.candidate.position === selectedPositionFilter;
    const matchesSearch =
      !searchTerm?.trim() ||
      r.candidate.name.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
      r.candidate.position.toLowerCase().includes(searchTerm.toLowerCase().trim());
    return matchesPos && matchesSearch;
  });

  // Top 5 overall candidates by vote count
  const topOverallCandidates = [...results].sort((a, b) => b.count - a.count).slice(0, 5);
  const maxTopVotes = topOverallCandidates[0]?.count || 1;

  // Positions available
  const availablePositions = Array.from(new Set(results.map((r) => r.candidate.position)));

  // Filtered positions for display
  const activePositionsToDisplay = selectedPositionFilter === "All"
    ? POSITIONS.filter((p) => results.some((r) => r.candidate.position === p))
    : [selectedPositionFilter];

  return (
    <div className="screen-content content-max-width" style={{ paddingBottom: "48px" }}>
      {/* Title & Action Buttons Header */}
      <div className="flex-between" style={{ marginBottom: "24px", flexWrap: "wrap", gap: "16px", alignItems: "center" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h1 style={{ fontSize: "24px", fontWeight: 800, margin: 0, color: "var(--text-main)", letterSpacing: "-0.02em", fontFamily: "var(--font-heading)" }}>
              Live Election Tabulation & Analytics
            </h1>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "var(--color-success-bg)", border: "1px solid var(--color-success-border)", padding: "4px 10px", borderRadius: "var(--radius-sm)", fontSize: "11px", fontWeight: 700, color: "var(--color-success)" }}>
              <span className="status-live-dot" style={{ width: "6px", height: "6px" }} />
              LIVE TABULATION
            </div>
          </div>
          <p style={{ margin: "4px 0 0 0", color: "var(--text-muted)", fontSize: "13.5px" }}>
            Real-time vote count breakdown, candidate standings, and voter participation metrics.
          </p>
        </div>

        {isStudent && currentUser && (
          // @ts-ignore
          !currentUser.has_voted && (
            <button className="btn-top-nav primary" onClick={() => setPage("ballot")}>
              Go to Ballot
            </button>
          )
        )}
      </div>

      {/* Top Executive KPI Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        <div className="card-box" style={{ padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-light)" }}>
              {t.totalVoters || "Registered Voters"}
            </span>
            <div style={{ fontSize: "30px", fontWeight: 800, color: "var(--text-main)", marginTop: "4px", lineHeight: 1, fontFamily: "var(--font-heading)" }}>
              {stats.totalRegistered}
            </div>
          </div>
          <div style={{ width: "42px", height: "42px", borderRadius: "var(--radius-md)", background: "rgba(13, 122, 62, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--primary-navy)" }}>
            <span className="material-symbols-outlined" style={{ fontSize: "22px" }}>groups</span>
          </div>
        </div>

        <div className="card-box" style={{ padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-light)" }}>
              {t.turnoutLabel || "Voter Turnout Rate"}
            </span>
            <div style={{ fontSize: "30px", fontWeight: 800, color: "var(--primary-navy)", marginTop: "4px", lineHeight: 1, fontFamily: "var(--font-heading)" }}>
              {turnoutPercent}%
            </div>
          </div>
          <div style={{ width: "42px", height: "42px", borderRadius: "var(--radius-md)", background: "rgba(13, 122, 62, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--primary-navy)" }}>
            <span className="material-symbols-outlined" style={{ fontSize: "22px" }}>pie_chart</span>
          </div>
        </div>

        <div className="card-box" style={{ padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-light)" }}>
              Total Votes Cast
            </span>
            <div style={{ fontSize: "30px", fontWeight: 800, color: "var(--text-main)", marginTop: "4px", lineHeight: 1, fontFamily: "var(--font-heading)" }}>
              {stats.totalVotesCast}
            </div>
          </div>
          <div style={{ width: "42px", height: "42px", borderRadius: "var(--radius-md)", background: "rgba(13, 122, 62, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--primary-navy)" }}>
            <span className="material-symbols-outlined" style={{ fontSize: "22px" }}>how_to_vote</span>
          </div>
        </div>
      </div>

      {/* Main 2-Column Analytics Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "24px", alignItems: "start" }}>
        
        {/* LEFT COLUMN: Top Candidates + Position Standings */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          
          {/* Top 5 Leading Candidates Visual Block */}
          <div className="card-box" style={{ padding: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div style={{ fontSize: "14px", fontWeight: 800, color: "var(--text-main)", textTransform: "uppercase", letterSpacing: "0.04em", fontFamily: "var(--font-heading)" }}>
                Top 5 Leading Candidates Overall
              </div>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--primary-navy)", background: "var(--color-success-bg)", padding: "3px 8px", borderRadius: "var(--radius-xs)", border: "1px solid var(--color-success-border)" }}>
                Highest Votes
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {topOverallCandidates.map((r, idx) => {
                const widthPercent = maxTopVotes > 0 ? Math.round((r.count / maxTopVotes) * 100) : 0;
                return (
                  <div key={r.candidate.id} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <span style={{ width: "22px", height: "22px", borderRadius: "50%", background: idx === 0 ? "var(--primary-navy)" : "var(--bg-subtle)", color: idx === 0 ? "#FFFFFF" : "var(--text-muted)", fontSize: "11px", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {idx + 1}
                    </span>
                    <div style={{ width: "140px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "13px", fontWeight: 700, color: "var(--text-main)" }}>
                      {r.candidate.name}
                    </div>
                    <div style={{ flex: 1, background: "var(--bg-subtle)", height: "12px", borderRadius: "var(--radius-xs)", overflow: "hidden", position: "relative" }}>
                      <div
                        style={{
                          width: `${widthPercent}%`,
                          height: "100%",
                          background: "var(--primary-navy)",
                          borderRadius: "var(--radius-xs)",
                          transition: "width 0.8s ease",
                        }}
                      />
                    </div>
                    <span style={{ fontSize: "13px", fontWeight: 800, color: "var(--primary-navy)", minWidth: "42px", textAlign: "right", fontFamily: "var(--font-heading)" }}>
                      {r.count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Detailed Candidate Standings Grouped by Position */}
          <div className="card-box" style={{ padding: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
              <div style={{ fontSize: "14px", fontWeight: 800, color: "var(--text-main)", textTransform: "uppercase", letterSpacing: "0.04em", fontFamily: "var(--font-heading)" }}>
                Full Standings by Position
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)" }}>Filter Position:</label>
                <select
                  value={selectedPositionFilter}
                  onChange={(e) => setSelectedPositionFilter(e.target.value)}
                  style={{
                    padding: "6px 36px 6px 14px",
                    borderRadius: "var(--radius-sm)",
                    fontSize: "12.5px",
                    fontWeight: 600,
                    border: "1px solid var(--border-light)",
                    background: "var(--bg-surface)",
                    color: "var(--text-main)",
                    cursor: "pointer",
                  }}
                >
                  <option value="All">All Positions ({availablePositions.length})</option>
                  {availablePositions.map((pos) => (
                    <option key={pos} value={pos}>{pos}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {activePositionsToDisplay.map((positionName) => {
                const positionItems = filteredResults.filter((r) => r.candidate.position === positionName);
                if (positionItems.length === 0) return null;
                const posTotalVotes = positionTotals[positionName] || 0;

                return (
                  <div key={positionName} style={{ background: "var(--bg-surface)", borderRadius: "var(--radius-md)", padding: "16px", border: "1px solid var(--border-light)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                      <div style={{ fontSize: "13px", fontWeight: 800, color: "var(--text-main)", textTransform: "uppercase", letterSpacing: "0.04em", display: "flex", alignItems: "center", gap: "6px", fontFamily: "var(--font-heading)" }}>
                        <span className="material-symbols-outlined" style={{ fontSize: "16px", color: "var(--primary-navy)" }}>how_to_vote</span>
                        {positionName}
                      </div>
                      <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", background: "var(--bg-card)", padding: "3px 8px", borderRadius: "var(--radius-xs)", border: "1px solid var(--border-light)" }}>
                        {posTotalVotes} Total Votes
                      </span>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {positionItems.map((r, idx) => {
                        const percentage = posTotalVotes > 0 ? Math.round((r.count / posTotalVotes) * 100) : 0;
                        const isLeading = idx === 0 && r.count > 0;
                        const avatar = base64ToImageUrl(r.candidate.image_url) || `https://ui-avatars.com/api/?name=${encodeURIComponent(r.candidate.name)}&background=E8F0FE&color=0A192F`;

                        return (
                          <div
                            key={r.candidate.id}
                            style={{
                              background: "var(--bg-card)",
                              borderRadius: "var(--radius-md)",
                              padding: "12px 14px",
                              border: `1px solid ${isLeading ? "var(--color-success-border)" : "var(--border-light)"}`,
                              borderLeft: isLeading ? "4px solid var(--color-success)" : "1px solid var(--border-light)",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                              <img
                                src={avatar}
                                alt={r.candidate.name}
                                style={{ width: "36px", height: "36px", borderRadius: "var(--radius-sm)", objectFit: "cover", flexShrink: 0 }}
                                onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(r.candidate.name)}&background=E8F0FE&color=0A192F`; }}
                              />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                  <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-main)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {r.candidate.name}
                                    {isLeading && (
                                      <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--color-success)", background: "var(--color-success-bg)", padding: "2px 6px", borderRadius: "var(--radius-xs)", marginLeft: "6px", border: "1px solid var(--color-success-border)" }}>
                                        ★ LEADING
                                      </span>
                                    )}
                                  </div>
                                  <div style={{ fontSize: "13px", fontWeight: 800, color: "var(--text-main)", fontFamily: "var(--font-heading)" }}>
                                    {r.count} <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)" }}>({percentage}%)</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div style={{ background: "var(--bg-subtle)", height: "8px", borderRadius: "var(--radius-xs)", overflow: "hidden" }}>
                              <div
                                style={{
                                  width: `${percentage}%`,
                                  height: "100%",
                                  background: isLeading ? "var(--color-success)" : "var(--primary-navy)",
                                  borderRadius: "var(--radius-xs)",
                                  transition: "width 0.8s ease",
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Analytical Insights & Overview Narrative */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          
          {/* Executive Analytics Insight Text Box */}
          <div className="card-box" style={{ padding: "24px" }}>
            <div style={{ fontSize: "14px", fontWeight: 800, color: "var(--text-main)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "12px", fontFamily: "var(--font-heading)" }}>
              Election Analytics & Insights
            </div>
            <p style={{ fontSize: "13px", lineHeight: 1.7, color: "var(--text-muted)", margin: "0 0 14px 0" }}>
              This live analytics view tracks real-time voter popularity and candidate standings across all grade levels in the Supreme Student Government Election.
            </p>
            <p style={{ fontSize: "13px", lineHeight: 1.7, color: "var(--text-muted)", margin: 0 }}>
              Voting turnout currently stands at <strong style={{ color: "var(--primary-navy)" }}>{turnoutPercent}%</strong> with <strong style={{ color: "var(--primary-navy)" }}>{stats.totalVotesCast}</strong> total ballots cast by verified student voters.
            </p>
          </div>

          {/* Position Vote Share Visualizer Stacked Overview */}
          <div className="card-box" style={{ padding: "24px" }}>
            <div style={{ fontSize: "14px", fontWeight: 800, color: "var(--text-main)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "16px", fontFamily: "var(--font-heading)" }}>
              Position Turnout Distribution
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {availablePositions.map((pos) => {
                const totalPosVotes = positionTotals[pos] || 0;
                const posPercent = stats.totalVotesCast > 0 ? Math.round((totalPosVotes / stats.totalVotesCast) * 100) : 0;

                return (
                  <div key={pos}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12.5px", fontWeight: 700, marginBottom: "6px" }}>
                      <span style={{ color: "var(--text-main)" }}>{pos}</span>
                      <span style={{ color: "var(--primary-navy)", fontFamily: "var(--font-heading)" }}>{totalPosVotes} votes ({posPercent}%)</span>
                    </div>
                    <div style={{ background: "var(--bg-subtle)", height: "8px", borderRadius: "var(--radius-xs)", overflow: "hidden" }}>
                      <div
                        style={{
                          width: `${posPercent}%`,
                          height: "100%",
                          background: "var(--primary-navy)",
                          borderRadius: "var(--radius-xs)",
                          transition: "width 0.8s ease",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default ResultsDashboard;
