import React, { useState, useEffect } from "react";
import {
  ChevronDown,
  Edit3,
  Eye,
  Search,
  X,
  PowerOff,
  CheckCircle2,
} from "lucide-react";
import { supabase } from "../supabase";
import { Candidate, Page, POSITIONS } from "../types";
import { base64ToImageUrl } from "../utils/imageUtils";
import { seedSampleCandidatesIfEmpty } from "../utils/seedCandidates";
import { logAuditAction } from "../utils/auditLogger";
import {
  isCandidateDeactivated,
  getCleanCampaignText,
  setCandidateDeactivatedLocal,
} from "../utils/candidateUtils";

interface AdminSetupProps {
  setPage: (p: Page) => void;
  onViewCandidate: (id: string) => void;
  onEditCandidate: (id: string | null) => void;
  searchTerm?: string;
  setSearchTerm?: (term: string) => void;
}

const AdminSetup: React.FC<AdminSetupProps> = ({
  setPage,
  onViewCandidate,
  onEditCandidate,
  searchTerm,
  setSearchTerm,
}) => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [collapsedPositions, setCollapsedPositions] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "deactivated">("all");

  const fetchCandidates = async () => {
    let { data, error } = await supabase
      .from("candidates")
      .select("id, position, name, image_url, campaign_text, age, section")
      .order("position");

    if (!error && (!data || data.length === 0)) {
      await seedSampleCandidatesIfEmpty();
      const reFetch = await supabase
        .from("candidates")
        .select("id, position, name, image_url, campaign_text, age, section")
        .order("position");
      data = reFetch.data || [];
    }

    if (error || !data) {
      setCandidates([]);
      return;
    }

    setCandidates(data as Candidate[]);
  };

  useEffect(() => {
    fetchCandidates();
  }, []);

  const handleToggleDeactivate = async (candidate: Candidate) => {
    const isDeactivated = isCandidateDeactivated(candidate);
    const actionLabel = isDeactivated ? "reactivate" : "deactivate";
    if (!window.confirm(`Are you sure you want to ${actionLabel} candidate ${candidate.name}?`)) return;

    setIsSubmitting(true);
    try {
      const cleanText = getCleanCampaignText(candidate.campaign_text);
      const newCampaignText = isDeactivated
        ? cleanText
        : `[DEACTIVATED] ${cleanText}`.trim();

      const { error: updateErr } = await supabase
        .from("candidates")
        .update({ campaign_text: newCampaignText })
        .eq("id", candidate.id);

      if (updateErr) throw updateErr;

      setCandidateDeactivatedLocal(candidate.id, !isDeactivated);

      await logAuditAction(
        isDeactivated ? "CANDIDATE_REACTIVATED" : "CANDIDATE_DEACTIVATED",
        "Admin",
        `${isDeactivated ? "Reactivated" : "Deactivated"} candidate ${candidate.name} running for ${candidate.position}`
      );

      await fetchCandidates();
    } catch (err: any) {
      alert(`Failed to ${actionLabel} candidate: ` + (err.message || "Unknown error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Multi-field search filtering (name, position, section, age, campaign text)
  const isSearchActive = Boolean(searchTerm && searchTerm.trim().length > 0);
  const normalizedSearch = searchTerm?.toLowerCase().trim() || "";

  const filteredCandidates = candidates.filter((c) => {
    const isDeactivated = isCandidateDeactivated(c);
    if (statusFilter === "active" && isDeactivated) return false;
    if (statusFilter === "deactivated" && !isDeactivated) return false;

    if (!isSearchActive) return true;
    const cleanCampaign = getCleanCampaignText(c.campaign_text);
    return (
      c.name.toLowerCase().includes(normalizedSearch) ||
      c.position.toLowerCase().includes(normalizedSearch) ||
      (c.section && c.section.toLowerCase().includes(normalizedSearch)) ||
      cleanCampaign.toLowerCase().includes(normalizedSearch) ||
      (c.age && String(c.age).includes(normalizedSearch))
    );
  });

  const grouped = POSITIONS.reduce<Record<string, Candidate[]>>((acc, pos) => {
    acc[pos] = filteredCandidates.filter((c) => c.position === pos);
    return acc;
  }, {});

  const matchingPositionsCount = POSITIONS.filter((pos) => (grouped[pos] || []).length > 0).length;

  return (
    <div className="screen-content content-max-width">
      {/* Header Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <span className="overline">Console Management</span>
          <h1 style={{ fontSize: "20px", fontWeight: 700, margin: 0, color: "var(--text-main)" }}>
            Candidate Roster & Profiles
          </h1>
        </div>

        {/* Status Filter Toggle */}
        <div style={{ display: "inline-flex", background: "var(--bg-subtle)", padding: "3px", borderRadius: "6px", border: "1px solid var(--border-light)" }}>
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            style={{
              padding: "5px 12px",
              borderRadius: "4px",
              border: "none",
              background: statusFilter === "all" ? "var(--bg-card)" : "transparent",
              color: statusFilter === "all" ? "var(--primary-navy)" : "var(--text-muted)",
              fontWeight: statusFilter === "all" ? 600 : 500,
              fontSize: "12px",
              cursor: "pointer",
              boxShadow: statusFilter === "all" ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
            }}
          >
            All ({candidates.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("active")}
            style={{
              padding: "5px 12px",
              borderRadius: "4px",
              border: "none",
              background: statusFilter === "active" ? "var(--bg-card)" : "transparent",
              color: statusFilter === "active" ? "var(--color-success)" : "var(--text-muted)",
              fontWeight: statusFilter === "active" ? 600 : 500,
              fontSize: "12px",
              cursor: "pointer",
              boxShadow: statusFilter === "active" ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
            }}
          >
            Active ({candidates.filter((c) => !isCandidateDeactivated(c)).length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("deactivated")}
            style={{
              padding: "5px 12px",
              borderRadius: "4px",
              border: "none",
              background: statusFilter === "deactivated" ? "var(--bg-card)" : "transparent",
              color: statusFilter === "deactivated" ? "var(--color-warning)" : "var(--text-muted)",
              fontWeight: statusFilter === "deactivated" ? 600 : 500,
              fontSize: "12px",
              cursor: "pointer",
              boxShadow: statusFilter === "deactivated" ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
            }}
          >
            Deactivated ({candidates.filter((c) => isCandidateDeactivated(c)).length})
          </button>
        </div>
      </div>

      {/* Active Search Summary Banner */}
      {isSearchActive && (
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-light)",
            borderRadius: "var(--radius-md)",
            padding: "10px 16px",
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "8px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Search size={15} style={{ color: "var(--primary-navy)" }} />
            <span style={{ fontSize: "12.5px", color: "var(--text-main)" }}>
              Found <strong>{filteredCandidates.length}</strong> candidate(s) matching "<strong>{searchTerm}</strong>" across {matchingPositionsCount} position(s).
            </span>
          </div>
          {setSearchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              style={{
                background: "var(--bg-subtle)",
                border: "1px solid var(--border-light)",
                borderRadius: "4px",
                padding: "3px 10px",
                fontSize: "11px",
                fontWeight: 600,
                color: "var(--text-muted)",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <X size={12} />
              <span>Clear Search</span>
            </button>
          )}
        </div>
      )}

      {/* Empty Search Results State */}
      {isSearchActive && filteredCandidates.length === 0 && (
        <div
          className="card-box"
          style={{
            padding: "48px 24px",
            textAlign: "center",
            marginBottom: "20px",
          }}
        >
          <Search size={36} style={{ color: "var(--text-light)", marginBottom: "12px" }} />
          <h3 style={{ margin: "0 0 6px 0", fontSize: "16px", fontWeight: 700, color: "var(--text-main)" }}>
            No Candidates Found
          </h3>
          <p style={{ margin: "0 0 16px 0", fontSize: "12.5px", color: "var(--text-muted)" }}>
            No candidate matched your search query "<strong>{searchTerm}</strong>". Check spelling or search by position.
          </p>
          {setSearchTerm && (
            <button
              type="button"
              className="btn-secondary-modal"
              onClick={() => setSearchTerm("")}
              style={{ margin: "0 auto" }}
            >
              Reset Search Filter
            </button>
          )}
        </div>
      )}

      {/* Main Roster: Current Candidates by Position */}
      <div className="card-box" style={{ padding: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
          <img
            src="/logo.png"
            alt="School Logo"
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              objectFit: "cover",
              border: "1px solid var(--border-light)",
              flexShrink: 0,
            }}
          />
          <div>
            <h3 style={{ margin: 0, fontSize: "15px", color: "var(--text-main)", fontWeight: 700 }}>
              Candidates by Position Roster
            </h3>
            <p style={{ margin: "2px 0 0 0", color: "var(--text-muted)", fontSize: "12px" }}>
              Total {candidates.length} registered candidate profiles across SSLG executive and grade-level positions.
            </p>
          </div>
        </div>

        {POSITIONS.map((position) => {
          const posCandidates = grouped[position] || [];
          if (!posCandidates.length) return null;

          // When searching, automatically force open so matches are immediately visible
          const isCollapsed = isSearchActive ? false : collapsedPositions[position];

          return (
            <div key={position} style={{ marginBottom: "18px" }}>
              {/* Position Header Banner */}
              <div
                onClick={() => {
                  if (!isSearchActive) {
                    setCollapsedPositions((prev) => ({ ...prev, [position]: !prev[position] }));
                  }
                }}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 14px",
                  background: "var(--bg-subtle)",
                  color: "var(--text-main)",
                  borderRadius: "6px",
                  cursor: isSearchActive ? "default" : "pointer",
                  userSelect: "none",
                  marginBottom: isCollapsed ? "0" : "12px",
                  border: "1px solid var(--border-light)",
                  transition: "background 0.15s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      color: "var(--primary-navy)",
                    }}
                  >
                    {position}
                  </span>
                  <span
                    style={{
                      fontSize: "11px",
                      background: "var(--bg-card)",
                      border: "1px solid var(--border-light)",
                      padding: "2px 8px",
                      borderRadius: "4px",
                      color: "var(--text-muted)",
                      fontWeight: 600,
                    }}
                  >
                    {posCandidates.length} {posCandidates.length === 1 ? "Candidate" : "Candidates"}
                  </span>
                </div>

                {!isSearchActive && (
                  <ChevronDown
                    size={15}
                    style={{
                      transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)",
                      transition: "transform 0.15s ease",
                      color: "var(--text-light)",
                    }}
                  />
                )}
              </div>

              {/* Big Candidate Cards Grid */}
              {!isCollapsed && (
                <div className="candidate-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "14px" }}>
                  {posCandidates.map((c) => {
                    const avatar =
                      base64ToImageUrl(c.image_url) ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        c.name
                      )}&background=059669&color=ffffff&size=200`;

                    return (
                      <div
                        key={c.id}
                        className="candidate-card-box"
                        style={{
                          padding: "18px",
                          gap: "14px",
                          borderRadius: "var(--radius-md)",
                          border: `1px solid ${isCandidateDeactivated(c) ? "var(--color-warning-border, #FDE68A)" : "var(--border-light)"}`,
                          background: "var(--bg-card)",
                          boxShadow: "var(--shadow-xs)",
                          opacity: isCandidateDeactivated(c) ? 0.88 : 1,
                        }}
                      >
                        {/* Header: Large Avatar (64x64) and Info */}
                        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                          <img
                            src={avatar}
                            alt={c.name}
                            style={{
                              width: "64px",
                              height: "64px",
                              borderRadius: "50%",
                              objectFit: "cover",
                              border: `2px solid ${isCandidateDeactivated(c) ? "var(--color-warning)" : "var(--border-subtle)"}`,
                              flexShrink: 0,
                              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                              filter: isCandidateDeactivated(c) ? "grayscale(40%)" : "none",
                            }}
                            onError={(e) => {
                              e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                c.name
                              )}&background=059669&color=ffffff&size=200`;
                            }}
                          />
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px", flexWrap: "wrap" }}>
                              <h4
                                style={{
                                  margin: 0,
                                  fontSize: "15px",
                                  color: "var(--text-main)",
                                  fontWeight: 700,
                                  lineHeight: 1.25,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {c.name}
                              </h4>
                              {isCandidateDeactivated(c) ? (
                                <span
                                  style={{
                                    fontSize: "9.5px",
                                    fontWeight: 700,
                                    color: "var(--color-warning, #D97706)",
                                    background: "var(--color-warning-bg, #FEF3C7)",
                                    border: "1px solid var(--color-warning-border, #FDE68A)",
                                    padding: "1px 6px",
                                    borderRadius: "4px",
                                    letterSpacing: "0.03em",
                                  }}
                                >
                                  DEACTIVATED
                                </span>
                              ) : (
                                <span
                                  style={{
                                    fontSize: "9.5px",
                                    fontWeight: 700,
                                    color: "var(--color-success)",
                                    background: "var(--color-success-bg)",
                                    border: "1px solid var(--color-success-border)",
                                    padding: "1px 6px",
                                    borderRadius: "4px",
                                    letterSpacing: "0.03em",
                                  }}
                                >
                                  ACTIVE
                                </span>
                              )}
                            </div>
                            <div style={{ display: "flex", gap: "5px", alignItems: "center", flexWrap: "wrap" }}>
                              {c.section && (
                                <span
                                  style={{
                                    fontSize: "11px",
                                    background: "var(--color-success-bg)",
                                    color: "var(--color-success)",
                                    padding: "2px 6px",
                                    borderRadius: "4px",
                                    fontWeight: 600,
                                    border: "1px solid var(--color-success-border)",
                                  }}
                                >
                                  {c.section}
                                </span>
                              )}
                              {c.age && (
                                <span
                                  style={{
                                    fontSize: "11px",
                                    background: "var(--bg-subtle)",
                                    color: "var(--text-muted)",
                                    padding: "2px 6px",
                                    borderRadius: "4px",
                                    fontWeight: 500,
                                    border: "1px solid var(--border-light)",
                                  }}
                                >
                                  Age {c.age}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Platform / Bio Preview Quote Box */}
                        {getCleanCampaignText(c.campaign_text) ? (
                          <div
                            style={{
                              fontSize: "12px",
                              color: "var(--text-muted)",
                              fontStyle: "italic",
                              background: "var(--bg-subtle)",
                              padding: "8px 12px",
                              borderRadius: "6px",
                              border: "1px solid var(--border-light)",
                              lineHeight: 1.45,
                              whiteSpace: "pre-wrap",
                              wordBreak: "break-word",
                            }}
                          >
                            "{getCleanCampaignText(c.campaign_text).length > 90 ? getCleanCampaignText(c.campaign_text).slice(0, 90) + "..." : getCleanCampaignText(c.campaign_text)}"
                          </div>
                        ) : (
                          <div
                            style={{
                              fontSize: "11.5px",
                              color: "var(--text-light)",
                              fontStyle: "italic",
                              padding: "4px 8px",
                            }}
                          >
                            No platform text submitted.
                          </div>
                        )}

                        {/* Action Buttons Row */}
                        <div
                          style={{
                            display: "flex",
                            gap: "8px",
                            justifyContent: "space-between",
                            paddingTop: "10px",
                            borderTop: "1px solid var(--border-light)",
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => onViewCandidate(c.id)}
                            style={{
                              flex: 1.2,
                              height: "34px",
                              fontSize: "12px",
                              fontWeight: 600,
                              background: "var(--primary-navy)",
                              color: "#FFFFFF",
                              border: "1px solid var(--primary-navy)",
                              borderRadius: "4px",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "6px",
                              boxShadow: "0 1px 2px rgba(5, 150, 105, 0.2)",
                              transition: "background 0.15s ease",
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--navy-hover)")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "var(--primary-navy)")}
                          >
                            <Eye size={14} style={{ color: "#FFFFFF" }} />
                            <span style={{ color: "#FFFFFF", fontWeight: 600 }}>View Profile</span>
                          </button>

                          <button
                            type="button"
                            className="btn-inner-action outline"
                            onClick={() => {
                              onEditCandidate(c.id);
                              setPage("admin_edit_candidate");
                            }}
                            style={{
                              flex: 1,
                              height: "32px",
                              fontSize: "12px",
                              fontWeight: 600,
                              borderRadius: "4px",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "4px",
                            }}
                          >
                            <Edit3 size={13} />
                            <span>Edit</span>
                          </button>

                          {/* Deactivate / Reactivate Action */}
                          <button
                            type="button"
                            className="btn-inner-action"
                            onClick={() => handleToggleDeactivate(c)}
                            disabled={isSubmitting}
                            style={{
                              flex: 1.1,
                              height: "32px",
                              fontSize: "12px",
                              fontWeight: 600,
                              borderRadius: "4px",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "4px",
                              color: isCandidateDeactivated(c) ? "var(--color-success, #059669)" : "var(--color-warning, #D97706)",
                              borderColor: isCandidateDeactivated(c) ? "var(--color-success-border, rgba(5, 150, 105, 0.3))" : "var(--color-warning-border, rgba(217, 119, 6, 0.3))",
                              background: isCandidateDeactivated(c) ? "var(--color-success-bg, rgba(5, 150, 105, 0.08))" : "var(--color-warning-bg, rgba(217, 119, 6, 0.08))",
                            }}
                            title={isCandidateDeactivated(c) ? "Reactivate candidate" : "Deactivate candidate (preserves records & votes)"}
                          >
                            {isCandidateDeactivated(c) ? <CheckCircle2 size={13} /> : <PowerOff size={13} />}
                            <span>{isCandidateDeactivated(c) ? "Reactivate" : "Deactivate"}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AdminSetup;
