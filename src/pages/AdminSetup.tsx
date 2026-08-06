import React, { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { Candidate, Page, POSITIONS } from "../types";
import { fileToBase64, base64ToImageUrl } from "../utils/imageUtils";

const AdminSetup: React.FC<{
  setPage: (p: Page) => void;
  onViewCandidate: (id: string) => void;
}> = ({ setPage, onViewCandidate }) => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);
  const [form, setForm] = useState({ name: "", position: POSITIONS[0] as string, image_url: "", campaign_text: "", age: "", section: "" });
  const [collapsedPositions, setCollapsedPositions] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Election Countdown states
  const [electionEndTime, setElectionEndTime] = useState<string | null>(null);
  const [timerInput, setTimerInput] = useState("");
  const [savingTimer, setSavingTimer] = useState(false);

  const fetchElectionSettings = async () => {
    const { data, error } = await supabase
      .from("election_settings")
      .select("end_time")
      .eq("id", 1)
      .maybeSingle();

    if (!error && data) {
      setElectionEndTime(data.end_time);
      if (data.end_time) {
        // Convert ISO timestamp to local YYYY-MM-DDTHH:MM for datetime-local input
        const localDate = new Date(data.end_time);
        const tzOffset = localDate.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(localDate.getTime() - tzOffset)).toISOString().slice(0, 16);
        setTimerInput(localISOTime);
      }
    }
  };

  const handleSaveTimer = async () => {
    if (!timerInput) return alert("Please select a date and time.");
    setSavingTimer(true);

    // Parse input date into ISO format for Postgres timestamptz
    const utcDate = new Date(timerInput).toISOString();

    const { error } = await supabase
      .from("election_settings")
      .upsert({ id: 1, end_time: utcDate });

    if (error) {
      alert("Failed to save election timer: " + error.message);
    } else {
      setElectionEndTime(utcDate);
      alert("Election countdown timer set successfully!");
    }
    setSavingTimer(false);
  };

  const handleClearTimer = async () => {
    if (!window.confirm("Are you sure you want to stop/clear the election countdown timer?")) return;
    setSavingTimer(true);

    const { error } = await supabase
      .from("election_settings")
      .upsert({ id: 1, end_time: null });

    if (error) {
      alert("Failed to clear election timer: " + error.message);
    } else {
      setElectionEndTime(null);
      setTimerInput("");
      alert("Election countdown timer cleared successfully.");
    }
    setSavingTimer(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      const base64 = await fileToBase64(file);
      setForm({ ...form, image_url: base64 });
    }
  };

  const handleSaveCandidate = async () => {
    if (!form.name.trim() || !form.position) {
      return alert("Name and Position are required.");
    }
    if (!form.age.trim()) {
      return alert("Age is required.");
    }
    const parsedAge = parseInt(form.age, 10);
    if (isNaN(parsedAge) || parsedAge < 5 || parsedAge > 100) {
      return alert("Please enter a valid age between 5 and 100.");
    }
    if (!form.section.trim()) {
      return alert("Section is required.");
    }

    setIsSubmitting(true);
    if (editingCandidate) {
      await supabase.from("candidates").update({
        name: form.name.trim(),
        position: form.position,
        image_url: form.image_url,
        campaign_text: form.campaign_text.trim(),
        age: parsedAge,
        section: form.section.trim(),
      }).eq("id", editingCandidate.id);
    } else {
      await supabase.from("candidates").insert([{
        name: form.name.trim(),
        position: form.position,
        image_url: form.image_url,
        campaign_text: form.campaign_text.trim(),
        age: parsedAge,
        section: form.section.trim(),
      }]);
    }
    await fetchCandidates();
    setEditingCandidate(null);
    setForm({ name: "", position: POSITIONS[0], image_url: "", campaign_text: "", age: "", section: "" });
    setIsSubmitting(false);
  };

  const handleEdit = (c: Candidate) => {
    setEditingCandidate(c);
    setForm({
      name: c.name,
      position: c.position as (typeof POSITIONS)[number],
      image_url: c.image_url || "",
      campaign_text: c.campaign_text || "",
      age: c.age !== undefined && c.age !== null ? String(c.age) : "",
      section: c.section || ""
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this candidate?")) return;
    setIsSubmitting(true);
    await supabase.from("candidates").delete().eq("id", id);
    await fetchCandidates();
    setIsSubmitting(false);
  };

  const handleCancelEdit = () => {
    setEditingCandidate(null);
    setForm({ name: "", position: POSITIONS[0], image_url: "", campaign_text: "", age: "", section: "" });
  };

  const fetchCandidates = async () => {
    const { data, error } = await supabase
      .from("candidates")
      .select("id, position, name, image_url, campaign_text, age, section")
      .order("position");

    if (error || !data) {
      setCandidates([]);
      return;
    }

    setCandidates(data as Candidate[]);
  };

  useEffect(() => {
    fetchCandidates();
    fetchElectionSettings();
  }, []);



  const grouped = POSITIONS.reduce<Record<string, Candidate[]>>((acc, pos) => {
    acc[pos] = candidates.filter((c) => c.position === pos);
    return acc;
  }, {});

  return (
    <div className="screen-content content-max-width">
      <div className="flex-between" style={{ marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
        <div className="dashboard-header-flex" style={{ display: "flex", alignItems: "center", gap: "20px", flexWrap: "wrap" }}>
          <div>
            <h1>Admin Dashboard</h1>
            <p>Phase 1: Pre-Election Setup</p>
          </div>
          <div className="dashboard-logos">
            <img
              src="/image.png"
              alt="Logo 1"
              className="dashboard-logo-img"
            />
            <img
              src="/image copy.png"
              alt="Logo 2"
              className="dashboard-logo-img"
            />
          </div>
        </div>
        <div className="action-buttons" style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button className="btn-outline-wide" onClick={() => setPage("admin_register")}>Register Student</button>
          <button className="btn-outline-wide" onClick={() => setPage("admin_voters")}>Voters List</button>
          <button className="btn-outline-wide" onClick={() => setPage("results")}>Live Results</button>
          <button className="btn-outline-wide" onClick={() => setPage("download_results")}>Download Results</button>
        </div>
      </div>

      <div className="admin-setup-forms-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "24px", marginBottom: "24px", alignItems: "start" }}>
        <div className="status-card">
          <h2 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span className="material-symbols-outlined" style={{ width: "32px", height: "32px", fontSize: "18px" }}>
              {editingCandidate ? 'edit' : 'person_add'}
            </span>
            {editingCandidate ? 'Edit Candidate' : 'Add New Candidate'}
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "16px" }}>
            <input
              name="name"
              placeholder="Candidate Name"
              value={form.name}
              onChange={handleInputChange}
            />
            <select
              name="position"
              value={form.position}
              onChange={handleInputChange}
              style={{ padding: "12px", border: "1px solid #0B1736", borderRadius: "6px", background: "#0B1736", color: "#FFFFFF" }}
            >
              {POSITIONS.map((pos) => (
                <option key={pos} value={pos}>{pos}</option>
              ))}
            </select>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <input
                type="number"
                name="age"
                placeholder="Age"
                value={form.age}
                onChange={handleInputChange}
                min="5"
                max="100"
              />
              <input
                name="section"
                placeholder="Section"
                value={form.section}
                onChange={handleInputChange}
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              {form.image_url && (
                <img
                  src={base64ToImageUrl(form.image_url) || form.image_url}
                  alt="Preview"
                  style={{ width: "48px", height: "48px", borderRadius: "50%", objectFit: "cover", border: "1px solid var(--border-light)" }}
                  onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(form.name || "Candidate")}&background=E8F0FE&color=0B1736`; }}
                />
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ flex: 1, padding: "10px", border: "1px solid var(--border-light)", borderRadius: "6px", background: "var(--bg-main)" }}
              />
            </div>
            <textarea
              name="campaign_text"
              placeholder="Campaign Platform / Biography (optional)"
              value={form.campaign_text}
              onChange={handleInputChange}
              style={{ minHeight: "100px", padding: "12px", border: "1px solid var(--border-light)", borderRadius: "6px" }}
            />
            <div className="action-buttons" style={{ display: "flex", gap: "8px" }}>
              <button className="btn-primary" onClick={handleSaveCandidate} disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : editingCandidate ? "Update Candidate" : "Add Candidate"}
              </button>
              {editingCandidate && (
                <button className="btn-outline-wide" onClick={handleCancelEdit} disabled={isSubmitting}>
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="status-card">
          <h2 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span className="material-symbols-outlined" style={{ width: "32px", height: "32px", fontSize: "18px" }}>
              timer
            </span>
            Election Countdown Settings
          </h2>
          <p style={{ fontSize: "13.5px", color: "var(--text-muted)", marginTop: "4px" }}>
            Set a voting deadline. The system will show a live countdown to students and automatically lock the voting once the timer expires.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "16px" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "flex-end" }}>
              <div style={{ flex: 1, minWidth: "240px" }}>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>
                  Select Voting Cutoff Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={timerInput}
                  onChange={(e) => setTimerInput(e.target.value)}
                  style={{ width: "100%", padding: "12px", border: "1px solid var(--border-light)", borderRadius: "6px", background: "var(--bg-main)" }}
                />
              </div>
              <div className="action-buttons" style={{ display: "flex", gap: "8px" }}>
                <button className="btn-primary" onClick={handleSaveTimer} disabled={savingTimer} style={{ padding: "12px 20px" }}>
                  {savingTimer ? "Saving..." : "Set Deadline"}
                </button>
                {electionEndTime && (
                  <button className="btn-outline-wide" onClick={handleClearTimer} disabled={savingTimer} style={{ padding: "12px 20px" }}>
                    Clear Timer
                  </button>
                )}
              </div>
            </div>

            {electionEndTime && (
              <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: "8px", padding: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                <span className="material-symbols-outlined" style={{ color: "#16A34A" }}>
                  check_circle
                </span>
                <span style={{ fontSize: "13.5px", color: "#166534", fontWeight: 500 }}>
                  Active Deadline: <strong>{new Date(electionEndTime).toLocaleString()}</strong>
                </span>
              </div>
            )}
          </div>
        </div>
      </div>


      <div style={{ background: "white", padding: "32px", borderRadius: "24px", border: "1px solid var(--border-light)", boxShadow: "0 10px 40px rgba(11,23,54,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "32px" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "var(--primary-navy)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(11,23,54,0.2)" }}>
            <span className="material-symbols-outlined" style={{ fontSize: "24px" }}>groups</span>
          </div>
          <h3 style={{ margin: 0, fontSize: "24px", color: "var(--primary-navy)", fontWeight: 800 }}>Current Candidates by Position</h3>
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
                  color: "#334155",
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
                  <span className="badge-light-blue" style={{ fontSize: "12px", padding: "3px 10px", borderRadius: "6px" }}>
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
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {posCandidates.map((c) => (
                    <div key={c.id} style={{ padding: "20px 24px", background: "linear-gradient(145deg, #ffffff, #f8fafc)", borderRadius: "16px", border: "1px solid var(--border-light)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "20px", transition: "transform 0.2s ease, box-shadow 0.2s ease" }} className="hover-lift">
                      <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                        <img
                          src={base64ToImageUrl(c.image_url) || `https://ui-avatars.com/api/?name=${c.name}&background=E8F0FE&color=0B1736`}
                          alt={c.name}
                          style={{ width: "56px", height: "56px", borderRadius: "50%", objectFit: "cover", border: "2px solid white", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                          onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}&background=E8F0FE&color=0B1736`; }}
                        />
                        <div>
                          <h4 style={{ margin: "0 0 4px 0", fontSize: "18px", color: "var(--primary-navy)", fontWeight: 700 }}>{c.name}</h4>
                          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                            {c.age && (
                              <span style={{ fontSize: "11px", background: "#EFF6FF", color: "#1E40AF", padding: "2px 8px", borderRadius: "4px", fontWeight: 700 }}>
                                Age: {c.age}
                              </span>
                            )}
                            {c.section && (
                              <span style={{ fontSize: "11px", background: "#ECFDF5", color: "#065F46", padding: "2px 8px", borderRadius: "4px", fontWeight: 700 }}>
                                Section: {c.section}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="action-buttons" style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                        <button className="btn-light-blue" onClick={() => onViewCandidate(c.id)} style={{ padding: "9px 18px", fontSize: "13px" }}>
                          View Profile
                        </button>
                        <button className="btn-outline-wide" onClick={() => handleEdit(c)} style={{ padding: "9px 18px", fontSize: "13px" }}>
                          Edit
                        </button>
                        <button className="btn-outline-wide" onClick={() => handleDelete(c.id)} style={{ padding: "9px 18px", fontSize: "13px" }}>
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
