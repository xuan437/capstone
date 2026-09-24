import React, { useState, useEffect } from "react";
import {
  Users,
  PieChart,
  Vote,
  Trophy,
  Table as TableIcon,
  Layers,
  Download,
  Search,
  CheckCircle2,
} from "lucide-react";
import { supabase } from "../supabase";
import { POSITIONS } from "../types";
import type { Candidate, User, Page } from "../types";
import { base64ToImageUrl } from "../utils/imageUtils";
import { useLanguage } from "../context/LanguageContext";
import { isCandidateDeactivated } from "../utils/candidateUtils";

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

  // Matrix Table State
  const [matrixView, setMatrixView] = useState<"canvass" | "cross_grade">("canvass");
  const [matrixSearch, setMatrixSearch] = useState<string>("");
  const [matrixPosFilter, setMatrixPosFilter] = useState<string>("All");
  const [candidateGradeBreakdown, setCandidateGradeBreakdown] = useState<Record<string, Record<string, number>>>({});
  const [gradeLevels, setGradeLevels] = useState<string[]>([]);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const [candidatesRes, votesRes, studentsRes] = await Promise.all([
          supabase.from("candidates").select("*"),
          supabase.from("votes").select("candidate_id, student_id"),
          supabase.from("students").select("id, grade, section", { count: "exact" }),
        ]);

        const candidates = (candidatesRes.data || []) as Candidate[];
        const votes = (votesRes.data || []) as any[];
        const students = (studentsRes.data || []) as { id: string; grade?: string; section?: string }[];
        const totalRegistered = studentsRes.count || (students ? students.length : 0);

        const candidatePositionMap = new Map(candidates.map((c) => [c.id, c.position]));
        const studentGradeMap = new Map<string, string>();
        students.forEach((s) => {
          if (s.id && s.grade) {
            studentGradeMap.set(s.id, s.grade.trim());
          }
        });

        const posTotals: Record<string, number> = {};
        const candGradeMap: Record<string, Record<string, number>> = {};

        votes.forEach((v) => {
          const position = candidatePositionMap.get(v.candidate_id);
          if (position) {
            posTotals[position] = (posTotals[position] || 0) + 1;
          }
          if (v.candidate_id) {
            const rawGrade = studentGradeMap.get(v.student_id);
            const grade = rawGrade || "Other";
            if (!candGradeMap[v.candidate_id]) {
              candGradeMap[v.candidate_id] = {};
            }
            candGradeMap[v.candidate_id][grade] = (candGradeMap[v.candidate_id][grade] || 0) + 1;
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

        // Detect all available grade levels
        const detectedGrades = Array.from(
          new Set(
            students
              .map((s) => s.grade?.trim())
              .filter((g): g is string => Boolean(g))
          )
        ).sort((a, b) => {
          const numA = parseInt(a.replace(/\D/g, ""), 10) || 0;
          const numB = parseInt(b.replace(/\D/g, ""), 10) || 0;
          if (numA !== numB) return numA - numB;
          return a.localeCompare(b);
        });

        const finalGradeList = detectedGrades.length > 0
          ? detectedGrades
          : ["Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12"];

        setResults(tally);
        setPositionTotals(posTotals);
        setCandidateGradeBreakdown(candGradeMap);
        setGradeLevels(finalGradeList);
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

  // Matrix Filtered Candidates
  const matrixCandidates = results.filter((r) => {
    const matchesPos = matrixPosFilter === "All" || r.candidate.position === matrixPosFilter;
    const query = (matrixSearch || searchTerm || "").toLowerCase().trim();
    const matchesSearch =
      !query ||
      r.candidate.name.toLowerCase().includes(query) ||
      r.candidate.position.toLowerCase().includes(query) ||
      (r.candidate.section && r.candidate.section.toLowerCase().includes(query));
    return matchesPos && matchesSearch;
  });

  // Export Matrix Data as CSV
  const handleExportMatrixCSV = () => {
    let csvContent = "";
    if (matrixView === "canvass") {
      csvContent = "Position,Rank,Candidate Name,Grade & Section,Votes Received,Position Total,Vote Share %\n";
      matrixCandidates.forEach((r) => {
        const posTotal = positionTotals[r.candidate.position] || 0;
        const pct = posTotal > 0 ? ((r.count / posTotal) * 100).toFixed(1) : "0.0";
        const posItems = results.filter((item) => item.candidate.position === r.candidate.position);
        const rank = posItems.findIndex((item) => item.candidate.id === r.candidate.id) + 1;
        csvContent += `"${r.candidate.position}","${rank}","${r.candidate.name}","${r.candidate.section || "N/A"}","${r.count}","${posTotal}","${pct}%"\n`;
      });
    } else {
      csvContent = `Position,Candidate Name,${gradeLevels.join(",")},Total Votes,Vote Share %\n`;
      matrixCandidates.forEach((r) => {
        const posTotal = positionTotals[r.candidate.position] || 0;
        const pct = posTotal > 0 ? ((r.count / posTotal) * 100).toFixed(1) : "0.0";
        const candGrades = candidateGradeBreakdown[r.candidate.id] || {};
        const gradeCounts = gradeLevels.map((g) => candGrades[g] || 0).join(",");
        csvContent += `"${r.candidate.position}","${r.candidate.name}",${gradeCounts},"${r.count}","${pct}%"\n`;
      });
    }

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Election_Results_Matrix_${matrixView}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
                const topAvatar = base64ToImageUrl(r.candidate.image_url) || `https://ui-avatars.com/api/?name=${encodeURIComponent(r.candidate.name)}&background=E8F0FE&color=0A192F`;

                return (
                  <div key={r.candidate.id} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ width: "20px", height: "20px", borderRadius: "50%", background: idx === 0 ? "var(--primary-navy)" : "var(--bg-subtle)", color: idx === 0 ? "#FFFFFF" : "var(--text-muted)", fontSize: "10.5px", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {idx + 1}
                    </span>
                    <img
                      src={topAvatar}
                      alt={r.candidate.name}
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "50%",
                        objectFit: "cover",
                        flexShrink: 0,
                        border: `1.5px solid ${idx === 0 ? "var(--color-success)" : "var(--border-light)"}`,
                      }}
                      onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(r.candidate.name)}&background=E8F0FE&color=0A192F`; }}
                    />
                    <div style={{ width: "120px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-main)", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {r.candidate.name}
                      </div>
                      <div style={{ fontSize: "10px", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {r.candidate.position}
                      </div>
                    </div>
                    <div style={{ flex: 1, background: "var(--bg-subtle)", height: "8px", borderRadius: "4px", overflow: "hidden", position: "relative" }}>
                      <div
                        style={{
                          width: `${widthPercent}%`,
                          height: "100%",
                          background: idx === 0 ? "var(--color-success)" : "var(--primary-navy)",
                          borderRadius: "4px",
                          transition: "width 0.6s ease",
                        }}
                      />
                    </div>
                    <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--primary-navy)", minWidth: "32px", textAlign: "right" }}>
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
                  <div key={positionName} style={{ background: "var(--bg-subtle)", borderRadius: "8px", padding: "12px 14px", border: "1px solid var(--border-light)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                      <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--primary-navy)", textTransform: "uppercase", letterSpacing: "0.05em", display: "flex", alignItems: "center", gap: "5px" }}>
                        <Vote size={13} />
                        {positionName}
                      </div>
                      <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", background: "var(--bg-card)", padding: "2px 7px", borderRadius: "4px", border: "1px solid var(--border-light)" }}>
                        {posTotalVotes} Votes
                      </span>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {positionItems.map((r, idx) => {
                        const percentage = posTotalVotes > 0 ? Math.round((r.count / posTotalVotes) * 100) : 0;
                        const isLeading = idx === 0 && r.count > 0;
                        const avatar = base64ToImageUrl(r.candidate.image_url) || `https://ui-avatars.com/api/?name=${encodeURIComponent(r.candidate.name)}&background=E8F0FE&color=0A192F`;

                        return (
                          <div
                            key={r.candidate.id}
                            style={{
                              background: "var(--bg-card)",
                              borderRadius: "8px",
                              padding: "10px 14px",
                              border: `1.5px solid ${isLeading ? "var(--color-success-border)" : "var(--border-light)"}`,
                              display: "flex",
                              alignItems: "center",
                              gap: "14px",
                              boxShadow: isLeading ? "0 2px 8px rgba(16, 185, 129, 0.08)" : "0 1px 3px rgba(0, 0, 0, 0.03)",
                              transition: "all 0.2s ease",
                            }}
                          >
                            {/* Candidate Image (Enlarged) */}
                            <div style={{ position: "relative", flexShrink: 0 }}>
                              <img
                                src={avatar}
                                alt={r.candidate.name}
                                style={{
                                  width: "56px",
                                  height: "56px",
                                  borderRadius: "50%",
                                  objectFit: "cover",
                                  border: `2.5px solid ${isLeading ? "var(--color-success)" : "var(--border-light)"}`,
                                  boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
                                  display: "block",
                                }}
                                onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(r.candidate.name)}&background=E8F0FE&color=0A192F`; }}
                              />
                              {isLeading && (
                                <span
                                  title="Leading Candidate"
                                  style={{
                                    position: "absolute",
                                    bottom: "-2px",
                                    right: "-2px",
                                    width: "18px",
                                    height: "18px",
                                    borderRadius: "50%",
                                    background: "var(--color-success)",
                                    color: "#ffffff",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: "10px",
                                    fontWeight: 700,
                                    border: "2px solid var(--bg-card)",
                                    boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                                  }}
                                >
                                  ✓
                                </span>
                              )}
                            </div>

                            {/* Candidate Details & Bar */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "3px", gap: "8px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "6px", overflow: "hidden" }}>
                                  <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-main)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {r.candidate.name}
                                  </span>
                                  {isCandidateDeactivated(r.candidate) && (
                                    <span style={{ fontSize: "9px", fontWeight: 700, color: "var(--color-warning, #D97706)", background: "var(--color-warning-bg, #FEF3C7)", border: "1px solid var(--color-warning-border, #FDE68A)", padding: "1px 5px", borderRadius: "3px", flexShrink: 0 }}>
                                      DEACTIVATED
                                    </span>
                                  )}
                                  {isLeading && (
                                    <span style={{ fontSize: "9.5px", fontWeight: 700, color: "var(--color-success)", background: "var(--color-success-bg)", border: "1px solid var(--color-success-border)", padding: "1px 6px", borderRadius: "3px", letterSpacing: "0.04em", flexShrink: 0 }}>
                                      LEADING
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize: "12.5px", fontWeight: 700, color: isLeading ? "var(--color-success)" : "var(--text-main)", whiteSpace: "nowrap" }}>
                                  {r.count} <span style={{ fontSize: "11px", fontWeight: 400, color: "var(--text-muted)" }}>({percentage}%)</span>
                                </div>
                              </div>

                              {r.candidate.section && (
                                <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "5px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {r.candidate.section}
                                </div>
                              )}

                              <div style={{ background: "var(--bg-subtle)", height: "7px", borderRadius: "4px", overflow: "hidden" }}>
                                <div
                                  style={{
                                    width: `${percentage}%`,
                                    height: "100%",
                                    background: isLeading ? "var(--color-success)" : "var(--primary-navy)",
                                    borderRadius: "4px",
                                    transition: "width 0.6s ease",
                                  }}
                                />
                              </div>
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

      {/* MATRIX TABLE: Full Width Interactive Tabulation Matrix */}
      <div className="card-box" style={{ marginTop: "24px", padding: "20px" }}>
        {/* Matrix Header Toolbar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "16px", borderBottom: "1px solid var(--border-light)", paddingBottom: "14px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <TableIcon size={18} style={{ color: "var(--primary-navy)" }} />
              <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "var(--text-main)", letterSpacing: "-0.01em" }}>
                Official Live Tabulation Matrix Table
              </h2>
              <span style={{ fontSize: "10.5px", fontWeight: 600, color: "var(--color-success)", background: "var(--color-success-bg)", border: "1px solid var(--color-success-border)", padding: "1px 6px", borderRadius: "4px" }}>
                FULL CANVASS
              </span>
            </div>
            <p style={{ margin: 0, fontSize: "12px", color: "var(--text-muted)" }}>
              Cross-tabulated returns, voter share ratios, and standing matrices for all certified candidates.
            </p>
          </div>

          {/* View Mode Toggle & CSV Export */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <div style={{ display: "inline-flex", background: "var(--bg-subtle)", padding: "3px", borderRadius: "6px", border: "1px solid var(--border-light)" }}>
              <button
                onClick={() => setMatrixView("canvass")}
                style={{
                  padding: "5px 12px",
                  borderRadius: "4px",
                  border: "none",
                  background: matrixView === "canvass" ? "var(--bg-card)" : "transparent",
                  color: matrixView === "canvass" ? "var(--primary-navy)" : "var(--text-muted)",
                  fontWeight: matrixView === "canvass" ? 600 : 500,
                  fontSize: "12px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  boxShadow: matrixView === "canvass" ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
                  transition: "all 0.15s ease",
                }}
              >
                <Layers size={13} />
                Position Canvass Matrix
              </button>
              <button
                onClick={() => setMatrixView("cross_grade")}
                style={{
                  padding: "5px 12px",
                  borderRadius: "4px",
                  border: "none",
                  background: matrixView === "cross_grade" ? "var(--bg-card)" : "transparent",
                  color: matrixView === "cross_grade" ? "var(--primary-navy)" : "var(--text-muted)",
                  fontWeight: matrixView === "cross_grade" ? 600 : 500,
                  fontSize: "12px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  boxShadow: matrixView === "cross_grade" ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
                  transition: "all 0.15s ease",
                }}
              >
                <TableIcon size={13} />
                Grade Cross-Tabulation
              </button>
            </div>

            <button
              onClick={handleExportMatrixCSV}
              title="Export Current Matrix View as CSV"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 12px",
                background: "var(--bg-card)",
                border: "1px solid var(--border-light)",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: 600,
                color: "var(--text-main)",
                cursor: "pointer",
                boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                transition: "all 0.15s ease",
              }}
            >
              <Download size={13} />
              Export CSV
            </button>
          </div>
        </div>

        {/* Matrix Filter & Search Bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap", marginBottom: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: "220px", maxWidth: "360px" }}>
            <div style={{ position: "relative", width: "100%" }}>
              <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
              <input
                type="text"
                placeholder="Filter candidate, position, or section in matrix..."
                value={matrixSearch}
                onChange={(e) => setMatrixSearch(e.target.value)}
                style={{
                  width: "100%",
                  padding: "6px 10px 6px 30px",
                  fontSize: "12px",
                  borderRadius: "6px",
                  border: "1px solid var(--border-light)",
                  background: "var(--bg-subtle)",
                  color: "var(--text-main)",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "11.5px", color: "var(--text-muted)", fontWeight: 500 }}>Position:</span>
            <select
              value={matrixPosFilter}
              onChange={(e) => setMatrixPosFilter(e.target.value)}
              style={{
                padding: "5px 24px 5px 10px",
                borderRadius: "6px",
                fontSize: "12px",
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
        </div>

        {/* Tab 1: Position Canvass Matrix View */}
        {matrixView === "canvass" && (
          <div style={{ overflowX: "auto", border: "1px solid var(--border-light)", borderRadius: "8px", background: "var(--bg-card)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "12.5px" }}>
              <thead>
                <tr style={{ background: "var(--bg-subtle)", borderBottom: "1px solid var(--border-light)" }}>
                  <th style={{ padding: "10px 14px", fontWeight: 600, color: "var(--text-muted)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", width: "50px", textAlign: "center" }}>Rank</th>
                  <th style={{ padding: "10px 14px", fontWeight: 600, color: "var(--text-muted)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Candidate</th>
                  <th style={{ padding: "10px 14px", fontWeight: 600, color: "var(--text-muted)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Position</th>
                  <th style={{ padding: "10px 14px", fontWeight: 600, color: "var(--text-muted)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "right" }}>Votes Cast</th>
                  <th style={{ padding: "10px 14px", fontWeight: 600, color: "var(--text-muted)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "right" }}>Position Total</th>
                  <th style={{ padding: "10px 14px", fontWeight: 600, color: "var(--text-muted)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", width: "180px" }}>Vote Share</th>
                  <th style={{ padding: "10px 14px", fontWeight: 600, color: "var(--text-muted)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "center" }}>Standing</th>
                </tr>
              </thead>
              <tbody>
                {matrixCandidates.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: "28px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>
                      No candidates match the selected filters.
                    </td>
                  </tr>
                ) : (
                  matrixCandidates.map((r) => {
                    const posTotal = positionTotals[r.candidate.position] || 0;
                    const pct = posTotal > 0 ? Math.round((r.count / posTotal) * 100) : 0;
                    const posItems = results.filter((item) => item.candidate.position === r.candidate.position);
                    const rank = posItems.findIndex((item) => item.candidate.id === r.candidate.id) + 1;
                    const isLeader = rank === 1 && r.count > 0;
                    const avatar = base64ToImageUrl(r.candidate.image_url) || `https://ui-avatars.com/api/?name=${encodeURIComponent(r.candidate.name)}&background=E8F0FE&color=0A192F`;

                    return (
                      <tr
                        key={r.candidate.id}
                        style={{
                          borderBottom: "1px solid var(--border-light)",
                          background: isLeader ? "rgba(16, 185, 129, 0.02)" : "transparent",
                          transition: "background 0.15s ease",
                        }}
                      >
                        {/* Rank */}
                        <td style={{ padding: "12px 14px", textAlign: "center" }}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: "24px",
                              height: "24px",
                              borderRadius: "50%",
                              fontSize: "11px",
                              fontWeight: 700,
                              background: isLeader ? "var(--color-success)" : "var(--bg-subtle)",
                              color: isLeader ? "#FFFFFF" : "var(--text-muted)",
                            }}
                          >
                            {rank}
                          </span>
                        </td>

                        {/* Candidate with Image */}
                        <td style={{ padding: "12px 14px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <img
                              src={avatar}
                              alt={r.candidate.name}
                              style={{
                                width: "42px",
                                height: "42px",
                                borderRadius: "50%",
                                objectFit: "cover",
                                flexShrink: 0,
                                border: `2px solid ${isLeader ? "var(--color-success)" : "var(--border-light)"}`,
                              }}
                              onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(r.candidate.name)}&background=E8F0FE&color=0A192F`; }}
                            />
                            <div>
                              <div style={{ fontWeight: 600, color: "var(--text-main)", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px" }}>
                                <span>{r.candidate.name}</span>
                                {isCandidateDeactivated(r.candidate) && (
                                  <span style={{ fontSize: "9px", fontWeight: 700, color: "var(--color-warning, #D97706)", background: "var(--color-warning-bg, #FEF3C7)", border: "1px solid var(--color-warning-border, #FDE68A)", padding: "1px 5px", borderRadius: "3px" }}>
                                    DEACTIVATED
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                                {r.candidate.section || "Grade School"}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Position */}
                        <td style={{ padding: "12px 14px" }}>
                          <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--primary-navy)", background: "var(--bg-subtle)", padding: "3px 8px", borderRadius: "4px", border: "1px solid var(--border-light)" }}>
                            {r.candidate.position}
                          </span>
                        </td>

                        {/* Votes Cast */}
                        <td style={{ padding: "12px 14px", textAlign: "right", fontWeight: 700, fontSize: "13.5px", color: isLeader ? "var(--color-success)" : "var(--text-main)" }}>
                          {r.count}
                        </td>

                        {/* Position Total */}
                        <td style={{ padding: "12px 14px", textAlign: "right", color: "var(--text-muted)", fontSize: "12px" }}>
                          {posTotal}
                        </td>

                        {/* Share & Bar */}
                        <td style={{ padding: "12px 14px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <div style={{ flex: 1, background: "var(--bg-subtle)", height: "8px", borderRadius: "4px", overflow: "hidden" }}>
                              <div
                                style={{
                                  width: `${pct}%`,
                                  height: "100%",
                                  background: isLeader ? "var(--color-success)" : "var(--primary-navy)",
                                  borderRadius: "4px",
                                }}
                              />
                            </div>
                            <span style={{ fontSize: "11.5px", fontWeight: 600, color: "var(--text-main)", minWidth: "36px" }}>
                              {pct}%
                            </span>
                          </div>
                        </td>

                        {/* Standing Status */}
                        <td style={{ padding: "12px 14px", textAlign: "center" }}>
                          {isLeader ? (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "10.5px", fontWeight: 700, color: "var(--color-success)", background: "var(--color-success-bg)", border: "1px solid var(--color-success-border)", padding: "2px 8px", borderRadius: "4px" }}>
                              <CheckCircle2 size={11} />
                              LEADING
                            </span>
                          ) : (
                            <span style={{ fontSize: "10.5px", fontWeight: 500, color: "var(--text-muted)", background: "var(--bg-subtle)", padding: "2px 8px", borderRadius: "4px" }}>
                              {rank === 2 ? "Runner-Up" : "Contender"}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Grade-Level Cross-Tabulation Matrix View */}
        {matrixView === "cross_grade" && (
          <div style={{ overflowX: "auto", border: "1px solid var(--border-light)", borderRadius: "8px", background: "var(--bg-card)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "12.5px" }}>
              <thead>
                <tr style={{ background: "var(--bg-subtle)", borderBottom: "1px solid var(--border-light)" }}>
                  <th style={{ padding: "10px 14px", fontWeight: 600, color: "var(--text-muted)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", minWidth: "180px" }}>Candidate & Position</th>
                  {gradeLevels.map((grade) => (
                    <th key={grade} style={{ padding: "10px 10px", fontWeight: 600, color: "var(--text-muted)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "center", minWidth: "65px" }}>
                      {grade}
                    </th>
                  ))}
                  <th style={{ padding: "10px 14px", fontWeight: 600, color: "var(--text-muted)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "right" }}>Total Votes</th>
                  <th style={{ padding: "10px 14px", fontWeight: 600, color: "var(--text-muted)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "right" }}>Position Share</th>
                  <th style={{ padding: "10px 14px", fontWeight: 600, color: "var(--text-muted)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "center" }}>Top Grade Support</th>
                </tr>
              </thead>
              <tbody>
                {matrixCandidates.length === 0 ? (
                  <tr>
                    <td colSpan={gradeLevels.length + 4} style={{ padding: "28px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>
                      No candidates match the selected filters.
                    </td>
                  </tr>
                ) : (
                  matrixCandidates.map((r) => {
                    const posTotal = positionTotals[r.candidate.position] || 0;
                    const pct = posTotal > 0 ? Math.round((r.count / posTotal) * 100) : 0;
                    const avatar = base64ToImageUrl(r.candidate.image_url) || `https://ui-avatars.com/api/?name=${encodeURIComponent(r.candidate.name)}&background=E8F0FE&color=0A192F`;
                    const candGrades = candidateGradeBreakdown[r.candidate.id] || {};

                    // Determine grade with highest votes for this candidate
                    let topGradeName = "None";
                    let topGradeCount = 0;
                    gradeLevels.forEach((g) => {
                      const count = candGrades[g] || 0;
                      if (count > topGradeCount) {
                        topGradeCount = count;
                        topGradeName = g;
                      }
                    });

                    return (
                      <tr key={r.candidate.id} style={{ borderBottom: "1px solid var(--border-light)" }}>
                        {/* Candidate & Position */}
                        <td style={{ padding: "10px 14px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <img
                              src={avatar}
                              alt={r.candidate.name}
                              style={{ width: "36px", height: "36px", borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "1.5px solid var(--border-light)" }}
                              onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(r.candidate.name)}&background=E8F0FE&color=0A192F`; }}
                            />
                            <div>
                              <div style={{ fontWeight: 600, color: "var(--text-main)", fontSize: "12.5px" }}>
                                {r.candidate.name}
                              </div>
                              <div style={{ fontSize: "10.5px", color: "var(--primary-navy)", fontWeight: 500 }}>
                                {r.candidate.position}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Grade level breakdown counts */}
                        {gradeLevels.map((grade) => {
                          const count = candGrades[grade] || 0;
                          return (
                            <td key={grade} style={{ padding: "10px", textAlign: "center", color: count > 0 ? "var(--text-main)" : "var(--text-light)", fontWeight: count > 0 ? 600 : 400 }}>
                              {count > 0 ? (
                                <span style={{ background: "var(--bg-subtle)", padding: "2px 6px", borderRadius: "4px", fontSize: "11.5px" }}>
                                  {count}
                                </span>
                              ) : (
                                "0"
                              )}
                            </td>
                          );
                        })}

                        {/* Total Votes */}
                        <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 700, color: "var(--primary-navy)", fontSize: "13px" }}>
                          {r.count}
                        </td>

                        {/* Position Share */}
                        <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 600, color: "var(--text-main)", fontSize: "12px" }}>
                          {pct}%
                        </td>

                        {/* Top Supporting Grade */}
                        <td style={{ padding: "10px 14px", textAlign: "center" }}>
                          {topGradeCount > 0 ? (
                            <span style={{ fontSize: "10.5px", fontWeight: 600, color: "var(--primary-navy)", background: "var(--bg-subtle)", padding: "2px 7px", borderRadius: "4px", border: "1px solid var(--border-light)" }}>
                              {topGradeName} ({topGradeCount})
                            </span>
                          ) : (
                            <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {matrixCandidates.length > 0 && (
                <tfoot>
                  <tr style={{ background: "var(--bg-subtle)", borderTop: "2px solid var(--border-subtle)", fontWeight: 700 }}>
                    <td style={{ padding: "12px 14px", color: "var(--text-main)", fontSize: "12px", textTransform: "uppercase" }}>
                      Grade Level Totals
                    </td>
                    {gradeLevels.map((grade) => {
                      const totalForGrade = matrixCandidates.reduce((sum, r) => {
                        const candGrades = candidateGradeBreakdown[r.candidate.id] || {};
                        return sum + (candGrades[grade] || 0);
                      }, 0);
                      return (
                        <td key={grade} style={{ padding: "12px 10px", textAlign: "center", color: "var(--primary-navy)", fontSize: "12px" }}>
                          {totalForGrade}
                        </td>
                      );
                    })}
                    <td style={{ padding: "12px 14px", textAlign: "right", color: "var(--primary-navy)", fontSize: "13px" }}>
                      {matrixCandidates.reduce((sum, r) => sum + r.count, 0)}
                    </td>
                    <td style={{ padding: "12px 14px", textAlign: "right", color: "var(--text-muted)", fontSize: "11.5px" }}>
                      100%
                    </td>
                    <td style={{ padding: "12px 14px", textAlign: "center", color: "var(--text-muted)", fontSize: "11px" }}>
                      Turnout Summary
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>

    </div>
  );
};

export default ResultsDashboard;

