import React, { useState, useEffect } from "react";
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
      {/* Header & Main Navigation Bar */}
      <div className="flex-between" style={{ marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
        <div className="dashboard-header-flex" style={{ display: "flex", alignItems: "center", gap: "20px", flexWrap: "wrap" }}>
          <div>
            <h1>Admin Dashboard</h1>
          </div>
          <div className="dashboard-logos">
            <img src="/image.png" alt="Logo 1" className="dashboard-logo-img" />
            <img src="/image copy.png" alt="Logo 2" className="dashboard-logo-img" />
          </div>
        </div>
      </div>

      {/* Main Roster: Current Candidates by Position */}
      <div className="card-box">
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "32px" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "var(--primary-navy)", color: "var(--text-white)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "var(--shadow-sm)" }}>
            <span className="material-symbols-outlined" style={{ fontSize: "24px" }}>groups</span>
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: "24px", color: "var(--primary-navy)", fontWeight: 800 }}>Current Candidates by Position</h3>
            <p style={{ margin: "4px 0 0 0", color: "var(--text-muted)", fontSize: "13.5px" }}>Manage standing candidates, view candidate profiles, or update entries.</p>
          </div>
        </div>

        {POSITIONS.map((position) => {
          const posCandidates = grouped[position] || [];
          if (!posCandidates.length) return null;
          const isCollapsed = collapsedPositions[position];

          return (
            <div key={position} style={{ marginBottom: "24px" }}>
              <div
                onClick={() => setCollapsedPositions(prev => ({ ...prev, [position]: !prev[position] }))}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "14px 20px",
                  background: "linear-gradient(135deg, #f8fafc, #f1f5f9)",
                  color: "var(--text-muted)",
                  borderRadius: "12px",
                  cursor: "pointer",
                  userSelect: "none",
                  marginBottom: isCollapsed ? "0" : "16px",
                  border: "1px solid var(--border-light)",
                  transition: "background 0.2s ease"
                }}
                className="hover-lift"
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ fontSize: "14px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--primary-navy)" }}>
                    {position}
                  </span>
                  <span className="badge-cyan" style={{ fontSize: "12px", padding: "3px 10px", borderRadius: "6px" }}>
                    {posCandidates.length} {posCandidates.length === 1 ? 'Candidate' : 'Candidates'}
                  </span>
                </div>
                <span className="material-symbols-outlined" style={{
                  transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)",
                  transition: "transform 0.2s ease",
                  color: "var(--text-muted)"
                }}>
                  expand_more
                </span>
              </div>

              {!isCollapsed && (
                <div className="candidate-grid">
                  {posCandidates.map((c) => (
                    <div key={c.id} className="candidate-card-box hover-lift">
                      <div style={{ display: "flex", alignItems: "flex-start", gap: "16px" }}>
                        <img
                          src={base64ToImageUrl(c.image_url) || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}&background=E8F0FE&color=0A192F`}
                          alt={c.name}
                          style={{ width: "52px", height: "52px", borderRadius: "50%", objectFit: "cover", border: "2px solid white", boxShadow: "var(--shadow-sm)", flexShrink: 0 }}
                          onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}&background=E8F0FE&color=0A192F`; }}
                        />
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <h4 style={{ margin: "0 0 6px 0", fontSize: "16px", color: "var(--primary-navy)", fontWeight: 700, lineHeight: 1.3 }}>{c.name}</h4>
                          <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
                            {c.age && (
                              <span style={{ fontSize: "11px", background: "var(--accent-blue)", color: "var(--primary-navy)", padding: "2px 8px", borderRadius: "4px", fontWeight: 700 }}>
                                Age: {c.age}
                              </span>
                            )}
                            {c.section && (
                              <span style={{ fontSize: "11px", background: "var(--color-success-bg)", color: "var(--color-success)", padding: "2px 8px", borderRadius: "4px", fontWeight: 700 }}>
                                Section: {c.section}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {c.campaign_text && (
                        <div style={{ fontSize: "12.5px", color: "var(--text-muted)", fontStyle: "italic", background: "var(--bg-main)", padding: "10px 12px", borderRadius: "8px", border: "1px solid var(--border-light)", lineHeight: 1.4 }}>
                          "{c.campaign_text.length > 75 ? c.campaign_text.slice(0, 75) + "..." : c.campaign_text}"
                        </div>
                      )}

                      <div style={{ display: "flex", gap: "8px", justifyContent: "space-between", paddingTop: "8px", borderTop: "1px solid var(--border-light)" }}>
                        <button className="btn-inner-action" onClick={() => onViewCandidate(c.id)} style={{ flex: 1 }}>
                          Profile
                        </button>
                        <button className="btn-inner-action outline" onClick={() => { onEditCandidate(c.id); setPage("admin_add_candidate"); }} style={{ flex: 1 }}>
                          Edit
                        </button>
                        <button className="btn-inner-action danger" onClick={() => handleDelete(c.id)} disabled={isSubmitting} style={{ flex: 1 }}>
                          Delete
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
