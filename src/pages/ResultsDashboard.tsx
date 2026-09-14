import React, { useState, useEffect } from "react";
import {
  Users,
  PieChart,
  Vote,
  Trophy,
} from "lucide-react";
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

  const topOverallCandidates = [...results].sort((a, b) => b.count - a.count).slice(0, 5);
  const maxTopVotes = topOverallCandidates[0]?.count || 1;

  const availablePositions = Array.from(new Set(results.map((r) => r.candidate.position)));

  const activePositionsToDisplay = selectedPositionFilter === "All"
    ? POSITIONS.filter((p) => results.some((r) => r.candidate.position === p))
    : [selectedPositionFilter];

  return (
    <div className="screen-content content-max-width">
      {/* Title & Action Header */}
      <div className="flex-between" style={{ marginBottom: "16px", flexWrap: "wrap", gap: "12px", alignItems: "center" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span className="overline">Tabulation</span>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "var(--color-success-bg)", border: "1px solid var(--color-success-border)", padding: "1px 6px", borderRadius: "4px", fontSize: "10.5px", fontWeight: 500, color: "var(--color-success)" }}>
              <span className="live-dot-green" />
              LIVE
            </div>
          </div>
          <h1>Live Tabulation & Analytics</h1>
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
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "12px",
          marginBottom: "16px",
        }}
      >
        <div className="card-box" style={{ padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <span style={{ fontSize: "10.5px", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-light)" }}>
              {t.totalVoters || "Registered"}
            </span>
            <div style={{ fontSize: "22px", fontWeight: 600, color: "var(--text-main)", marginTop: "2px", lineHeight: 1 }}>
              {stats.totalRegistered}
            </div>
          </div>
          <Users size={16} style={{ color: "var(--primary-navy)", opacity: 0.8 }} />
        </div>

        <div className="card-box" style={{ padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <span style={{ fontSize: "10.5px", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-light)" }}>
              {t.turnoutLabel || "Turnout"}
            </span>
            <div style={{ fontSize: "22px", fontWeight: 600, color: "var(--primary-navy)", marginTop: "2px", lineHeight: 1 }}>
              {turnoutPercent}%
            </div>
          </div>
          <PieChart size={16} style={{ color: "var(--primary-navy)", opacity: 0.8 }} />
        </div>

        <div className="card-box" style={{ padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <span style={{ fontSize: "10.5px", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-light)" }}>
              Total Votes
            </span>
            <div style={{ fontSize: "22px", fontWeight: 600, color: "var(--text-main)", marginTop: "2px", lineHeight: 1 }}>
              {stats.totalVotesCast}
            </div>
          </div>
          <Vote size={16} style={{ color: "var(--primary-navy)", opacity: 0.8 }} />
        </div>
      </div>

      {/* Main 2-Column Analytics Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "16px", alignItems: "start" }}>
        
        {/* LEFT COLUMN: Top Candidates + Position Standings */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          
          {/* Top 5 Leading Candidates Visual Block */}
          <div className="card-box" style={{ padding: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <div style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--text-main)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Top Overall Candidates
              </div>
              <Trophy size={14} style={{ color: "var(--color-warning)" }} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {topOverallCandidates.map((r, idx) => {
                const widthPercent = maxTopVotes > 0 ? Math.round((r.count / maxTopVotes) * 100) : 0;
                return (
                  <div key={r.candidate.id} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ width: "18px", height: "18px", borderRadius: "50%", background: idx === 0 ? "var(--primary-navy)" : "var(--bg-subtle)", color: idx === 0 ? "#FFFFFF" : "var(--text-muted)", fontSize: "10px", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {idx + 1}
                    </span>
                    <div style={{ width: "120px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "12px", fontWeight: 500, color: "var(--text-main)" }}>
                      {r.candidate.name}
                    </div>
                    <div style={{ flex: 1, background: "var(--bg-subtle)", height: "8px", borderRadius: "4px", overflow: "hidden", position: "relative" }}>
                      <div
                        style={{
                          width: `${widthPercent}%`,
                          height: "100%",
                          background: "var(--primary-navy)",
                          borderRadius: "4px",
                          transition: "width 0.6s ease",
                        }}
                      />
                    </div>
                    <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--primary-navy)", minWidth: "32px", textAlign: "right" }}>
                      {r.count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Detailed Candidate Standings Grouped by Position */}
          <div className="card-box" style={{ padding: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "8px" }}>
              <div style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--text-main)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Standings by Position
              </div>
              <select
                value={selectedPositionFilter}
                onChange={(e) => setSelectedPositionFilter(e.target.value)}
                style={{
                  padding: "0 24px 0 8px",
                  borderRadius: "4px",
                  fontSize: "11.5px",
                  height: "28px",
                  border: "1px solid var(--border-light)",
                  background: "var(--bg-subtle)",
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

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {activePositionsToDisplay.map((positionName) => {
                const positionItems = filteredResults.filter((r) => r.candidate.position === positionName);
                if (positionItems.length === 0) return null;
                const posTotalVotes = positionTotals[positionName] || 0;

                return (
                  <div key={positionName} style={{ background: "var(--bg-subtle)", borderRadius: "6px", padding: "10px 12px", border: "1px solid var(--border-light)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <div style={{ fontSize: "11.5px", fontWeight: 600, color: "var(--primary-navy)", textTransform: "uppercase", letterSpacing: "0.05em", display: "flex", alignItems: "center", gap: "4px" }}>
                        <Vote size={12} />
                        {positionName}
                      </div>
                      <span style={{ fontSize: "10.5px", fontWeight: 500, color: "var(--text-muted)", background: "var(--bg-card)", padding: "1px 5px", borderRadius: "3px", border: "1px solid var(--border-light)" }}>
                        {posTotalVotes} Votes
                      </span>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      {positionItems.map((r, idx) => {
                        const percentage = posTotalVotes > 0 ? Math.round((r.count / posTotalVotes) * 100) : 0;
                        const isLeading = idx === 0 && r.count > 0;
                        const avatar = base64ToImageUrl(r.candidate.image_url) || `https://ui-avatars.com/api/?name=${encodeURIComponent(r.candidate.name)}&background=E8F0FE&color=0A192F`;

                        return (
                          <div
                            key={r.candidate.id}
                            style={{
                              background: "var(--bg-card)",
                              borderRadius: "4px",
                              padding: "8px 10px",
                              border: `1px solid ${isLeading ? "var(--color-success-border)" : "var(--border-light)"}`,
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                              <img
                                src={avatar}
                                alt={r.candidate.name}
                                style={{ width: "24px", height: "24px", borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                                onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(r.candidate.name)}&background=E8F0FE&color=0A192F`; }}
                              />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                  <div style={{ fontSize: "12px", fontWeight: 500, color: "var(--text-main)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {r.candidate.name}
                                    {isLeading && (
                                      <span style={{ fontSize: "9.5px", fontWeight: 600, color: "var(--color-success)", background: "var(--color-success-bg)", padding: "1px 4px", borderRadius: "3px", marginLeft: "4px" }}>
                                        LEADING
                                      </span>
                                    )}
                                  </div>
                                  <div style={{ fontSize: "11.5px", fontWeight: 600, color: "var(--text-main)" }}>
                                    {r.count} <span style={{ fontSize: "10.5px", fontWeight: 400, color: "var(--text-muted)" }}>({percentage}%)</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div style={{ background: "var(--bg-subtle)", height: "6px", borderRadius: "3px", overflow: "hidden" }}>
                              <div
                                style={{
                                  width: `${percentage}%`,
                                  height: "100%",
                                  background: isLeading ? "var(--color-success)" : "var(--primary-navy)",
                                  borderRadius: "3px",
                                  transition: "width 0.6s ease",
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
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          
          {/* Executive Analytics Insight Text Box */}
          <div className="card-box" style={{ padding: "16px" }}>
            <div style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--text-main)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>
              Analytics Summary
            </div>
            <p style={{ fontSize: "12px", lineHeight: 1.45, color: "var(--text-muted)", margin: "0 0 10px 0" }}>
              Real-time tabulation tracking voter participation and standings across Supreme Secondary Learner Government candidates.
            </p>
            <p style={{ fontSize: "12px", lineHeight: 1.45, color: "var(--text-muted)", margin: 0 }}>
              Turnout rate is currently <strong style={{ color: "var(--primary-navy)" }}>{turnoutPercent}%</strong> with <strong style={{ color: "var(--primary-navy)" }}>{stats.totalVotesCast}</strong> total votes submitted.
            </p>
          </div>

          {/* Position Vote Share Visualizer */}
          <div className="card-box" style={{ padding: "16px" }}>
            <div style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--text-main)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px" }}>
              Turnout by Position
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {availablePositions.map((pos) => {
                const totalPosVotes = positionTotals[pos] || 0;
                const posPercent = stats.totalVotesCast > 0 ? Math.round((totalPosVotes / stats.totalVotesCast) * 100) : 0;

                return (
                  <div key={pos}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11.5px", fontWeight: 500, marginBottom: "4px" }}>
                      <span style={{ color: "var(--text-main)" }}>{pos}</span>
                      <span style={{ color: "var(--primary-navy)" }}>{totalPosVotes} votes ({posPercent}%)</span>
                    </div>
                    <div style={{ background: "var(--bg-subtle)", height: "6px", borderRadius: "3px", overflow: "hidden" }}>
                      <div
                        style={{
                          width: `${posPercent}%`,
                          height: "100%",
                          background: "var(--primary-navy)",
                          borderRadius: "3px",
                          transition: "width 0.6s ease",
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
