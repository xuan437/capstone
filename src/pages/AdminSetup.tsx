import React, { useState, useEffect } from "react";
import {
  ChevronDown,
  Search,
  X,
  Flag,
} from "lucide-react";
import { supabase } from "../supabase";
import { Candidate, Page, POSITIONS, PartyList } from "../types";
import { seedSampleCandidatesIfEmpty } from "../utils/seedCandidates";
import { logAuditAction } from "../utils/auditLogger";
import {
  isCandidateDeactivated,
  getCleanCampaignText,
  setCandidateDeactivatedLocal,
} from "../utils/candidateUtils";
import { fetchPartyLists, removeCandidatePartylist } from "../utils/partylistUtils";
import CandidateProfileCard from "../components/CandidateProfileCard";
import { ALL_UNIQUE_SECTIONS } from "../utils/sectionConstants";

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
  const [partylists, setPartylists] = useState<PartyList[]>([]);
  const [collapsedPositions, setCollapsedPositions] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "deactivated">("all");
  const [partylistFilter, setPartylistFilter] = useState<string>("all");
  const [sectionFilter, setSectionFilter] = useState<string>("all");

  const fetchCandidates = async () => {
    let { data, error } = await supabase
      .from("candidates")
      .select("id, position, name, image_url, campaign_text, age, section, partylist")
      .order("position");

    if (!error && (!data || data.length === 0)) {
      await seedSampleCandidatesIfEmpty();
      const reFetch = await supabase
        .from("candidates")
        .select("id, position, name, image_url, campaign_text, age, section, partylist")
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
    fetchPartyLists().then((list) => setPartylists(list));
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

  const handleRemoveCandidatePartylist = async (candidate: Candidate) => {
    if (!window.confirm(`Remove partylist affiliation from ${candidate.name}? They will run as an Independent candidate.`)) {
      return;
    }
    setCandidates((prev) =>
      prev.map((c) => (c.id === candidate.id ? { ...c, partylist: undefined } : c))
    );
    try {
      await removeCandidatePartylist(candidate.id);
      await fetchCandidates();
    } catch (err: any) {
      console.error("Error removing candidate partylist:", err);
    }
  };

  // Multi-field search filtering (name, position, section, age, campaign text)
  const isSearchActive = Boolean(searchTerm && searchTerm.trim().length > 0);
  const normalizedSearch = searchTerm?.toLowerCase().trim() || "";

  const filteredCandidates = candidates.filter((c) => {
    const isDeactivated = isCandidateDeactivated(c);
    if (statusFilter === "active" && isDeactivated) return false;
    if (statusFilter === "deactivated" && !isDeactivated) return false;

    // Partylist filtering
    if (partylistFilter !== "all") {
      if (partylistFilter === "independent") {
        const isInd = !c.partylist || c.partylist.trim() === "" || c.partylist.trim().toLowerCase() === "independent";
        if (!isInd) return false;
      } else {
        if (!c.partylist || c.partylist.toLowerCase() !== partylistFilter.toLowerCase()) return false;
      }
    }

    // Section filtering
    if (sectionFilter !== "all") {
      if (!c.section) return false;
      const sectionLower = c.section.toLowerCase();
      // Match if section contains the filter name (handles both "Lopez" and "Grade 7 - Lopez" formats)
      if (!sectionLower.includes(sectionFilter.toLowerCase())) return false;
    }

    if (!isSearchActive) return true;
    const cleanCampaign = getCleanCampaignText(c.campaign_text);
    return (
      c.name.toLowerCase().includes(normalizedSearch) ||
      c.position.toLowerCase().includes(normalizedSearch) ||
      (c.partylist && c.partylist.toLowerCase().includes(normalizedSearch)) ||
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

        {/* Status, Section & Partylist Filters */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {/* Section Filter Select */}
          <select
            value={sectionFilter}
            onChange={(e) => setSectionFilter(e.target.value)}
          >
            <option value="all">All Sections</option>
            {ALL_UNIQUE_SECTIONS.map((sec) => (
              <option key={sec} value={sec}>{sec}</option>
            ))}
          </select>

          {/* Partylist Filter Select */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <Flag size={13} style={{ color: "var(--primary-navy)" }} />
            <select
              value={partylistFilter}
              onChange={(e) => setPartylistFilter(e.target.value)}
            >
              <option value="all">All Partylists</option>
              <option value="independent">Independent Only</option>
              {partylists.map((party) => (
                <option key={party.id} value={party.name}>
                  {party.name} Slate
                </option>
              ))}
            </select>
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

              {/* Candidate Showcase Profile Cards Grid */}
              {!isCollapsed && (
                <div
                  className="candidate-grid"
                  style={{
                    gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))",
                    gap: "22px",
                    marginTop: "10px",
                  }}
                >
                  {posCandidates.map((c) => (
                    <CandidateProfileCard
                      key={c.id}
                      candidate={c}
                      partylists={partylists}
                      onViewCandidate={onViewCandidate}
                      onEditCandidate={(id) => {
                        onEditCandidate(id);
                        setPage("admin_edit_candidate");
                      }}
                      onToggleDeactivate={handleToggleDeactivate}
                      onRemovePartylist={handleRemoveCandidatePartylist}
                      isSubmitting={isSubmitting}
                    />
                  ))}
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
