import React, { useState, useEffect } from "react";
import { ChevronDown, Edit3, Trash2, Eye } from "lucide-react";
import { supabase } from "../supabase";
import { Candidate, Page, POSITIONS } from "../types";
import { base64ToImageUrl } from "../utils/imageUtils";
import { seedSampleCandidatesIfEmpty } from "../utils/seedCandidates";

const AdminSetup: React.FC<{
  setPage: (p: Page) => void;
  onViewCandidate: (id: string) => void;
  onEditCandidate: (id: string | null) => void;
  searchTerm?: string;
}> = ({ setPage, onViewCandidate, onEditCandidate, searchTerm }) => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [collapsedPositions, setCollapsedPositions] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this candidate?")) return;
    setIsSubmitting(true);
    await supabase.from("candidates").delete().eq("id", id);
    await fetchCandidates();
    setIsSubmitting(false);
  };

  const filteredCandidates = candidates.filter((c) => {
    if (!searchTerm?.trim()) return true;
    const term = searchTerm.toLowerCase().trim();
    return (
      c.name.toLowerCase().includes(term) ||
      c.position.toLowerCase().includes(term) ||
      (c.section && c.section.toLowerCase().includes(term))
    );
  });

  const grouped = POSITIONS.reduce<Record<string, Candidate[]>>((acc, pos) => {
    acc[pos] = filteredCandidates.filter((c) => c.position === pos);
    return acc;
  }, {});

  return (
    <div className="screen-content content-max-width">
      {/* Header Bar */}
      <div className="flex-between" style={{ marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <span className="overline">Console Management</span>
          <h1>Candidate Roster</h1>
        </div>
      </div>

      {/* Main Roster: Current Candidates by Position */}
      <div className="card-box" style={{ padding: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
          <img
            src="/logo.png"
            alt="School Logo"
            style={{ width: "44px", height: "44px", borderRadius: "50%", objectFit: "cover", border: "1px solid var(--border-light)", flexShrink: 0 }}
          />
          <div>
            <h3 style={{ margin: 0, fontSize: "14px", color: "var(--text-main)", fontWeight: 600 }}>Candidates by Position</h3>
            <p style={{ margin: "2px 0 0 0", color: "var(--text-muted)", fontSize: "12px" }}>Manage standing candidates, view candidate profiles, or update entries.</p>
          </div>
        </div>

        {POSITIONS.map((position) => {
          const posCandidates = grouped[position] || [];
          if (!posCandidates.length) return null;
          const isCollapsed = collapsedPositions[position];

          return (
            <div key={position} style={{ marginBottom: "16px" }}>
              <div
                onClick={() => setCollapsedPositions(prev => ({ ...prev, [position]: !prev[position] }))}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 12px",
                  background: "var(--bg-subtle)",
                  color: "var(--text-main)",
                  borderRadius: "6px",
                  cursor: "pointer",
                  userSelect: "none",
                  marginBottom: isCollapsed ? "0" : "10px",
                  border: "1px solid var(--border-light)",
                  transition: "background 0.15s ease"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "11.5px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--primary-navy)" }}>
                    {position}
                  </span>
                  <span style={{ fontSize: "11px", background: "var(--bg-card)", border: "1px solid var(--border-light)", padding: "1px 6px", borderRadius: "4px", color: "var(--text-muted)" }}>
                    {posCandidates.length} {posCandidates.length === 1 ? 'Candidate' : 'Candidates'}
                  </span>
                </div>
                <ChevronDown
                  size={14}
                  style={{
                    transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)",
                    transition: "transform 0.15s ease",
                    color: "var(--text-light)"
                  }}
                />
              </div>

              {!isCollapsed && (
                <div className="candidate-grid">
                  {posCandidates.map((c) => (
                    <div key={c.id} className="candidate-card-box">
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <img
                          src={base64ToImageUrl(c.image_url) || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}&background=E8F0FE&color=0A192F`}
                          alt={c.name}
                          style={{ width: "36px", height: "36px", borderRadius: "50%", objectFit: "cover", border: "1px solid var(--border-light)", flexShrink: 0 }}
                          onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}&background=E8F0FE&color=0A192F`; }}
                        />
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <h4 style={{ margin: "0 0 2px 0", fontSize: "13px", color: "var(--text-main)", fontWeight: 600, lineHeight: 1.2 }}>{c.name}</h4>
                          <div style={{ display: "flex", gap: "4px", alignItems: "center", flexWrap: "wrap" }}>
                            {c.age && (
                              <span style={{ fontSize: "10.5px", background: "var(--bg-subtle)", color: "var(--text-muted)", padding: "1px 5px", borderRadius: "3px" }}>
                                Age: {c.age}
                              </span>
                            )}
                            {c.section && (
                              <span style={{ fontSize: "10.5px", background: "var(--color-success-bg)", color: "var(--color-success)", padding: "1px 5px", borderRadius: "3px" }}>
                                {c.section}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {c.campaign_text && (
                        <div style={{ fontSize: "11.5px", color: "var(--text-muted)", fontStyle: "italic", background: "var(--bg-subtle)", padding: "6px 8px", borderRadius: "4px", border: "1px solid var(--border-light)", lineHeight: 1.35 }}>
                          "{c.campaign_text.length > 65 ? c.campaign_text.slice(0, 65) + "..." : c.campaign_text}"
                        </div>
                      )}

                      <div style={{ display: "flex", gap: "6px", justifyContent: "space-between", paddingTop: "6px", borderTop: "1px solid var(--border-light)" }}>
                        <button className="btn-inner-action" onClick={() => onViewCandidate(c.id)} style={{ flex: 1 }}>
                          <Eye size={12} />
                          <span>Profile</span>
                        </button>
                        <button className="btn-inner-action outline" onClick={() => { onEditCandidate(c.id); setPage("admin_add_candidate"); }} style={{ flex: 1 }}>
                          <Edit3 size={12} />
                          <span>Edit</span>
                        </button>
                        <button className="btn-inner-action danger" onClick={() => handleDelete(c.id)} disabled={isSubmitting} style={{ flex: 1 }}>
                          <Trash2 size={12} />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
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
