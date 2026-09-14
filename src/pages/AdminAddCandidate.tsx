import React, { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { Candidate, Page, POSITIONS } from "../types";
import { fileToBase64, base64ToImageUrl } from "../utils/imageUtils";
import { UserPlus, CheckCircle2, AlertCircle, ArrowLeft, Save, User, Upload } from "lucide-react";

const AdminAddCandidate: React.FC<{
  setPage: (p: Page) => void;
  candidateId?: string | null;
}> = ({ setPage, candidateId }) => {
  const [form, setForm] = useState({
    name: "",
    position: POSITIONS[0] as string,
    image_url: "",
    campaign_text: "",
    age: "",
    section: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (candidateId) {
      const loadCandidate = async () => {
        setIsLoading(true);
        const { data, error } = await supabase
          .from("candidates")
          .select("*")
          .eq("id", candidateId)
          .single();

        if (error || !data) {
          setError("Failed to load candidate details.");
        } else {
          const c = data as Candidate;
          setForm({
            name: c.name,
            position: c.position,
            image_url: c.image_url || "",
            campaign_text: c.campaign_text || "",
            age: c.age !== undefined && c.age !== null ? String(c.age) : "",
            section: c.section || "",
          });
        }
        setIsLoading(false);
      };
      loadCandidate();
    }
  }, [candidateId]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      const base64 = await fileToBase64(file);
      setForm({ ...form, image_url: base64 });
    }
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.position) {
      return setError("Candidate Name and Position are required.");
    }
    if (!form.age.trim()) {
      return setError("Age is required.");
    }
    const parsedAge = parseInt(form.age, 10);
    if (isNaN(parsedAge) || parsedAge < 5 || parsedAge > 100) {
      return setError("Please enter a valid age between 5 and 100.");
    }
    if (!form.section.trim()) {
      return setError("Section is required.");
    }

    setIsSubmitting(true);
    setError("");

    if (candidateId) {
      const { error: updateErr } = await supabase
        .from("candidates")
        .update({
          name: form.name.trim(),
          position: form.position,
          image_url: form.image_url,
          campaign_text: form.campaign_text.trim(),
          age: parsedAge,
          section: form.section.trim(),
        })
        .eq("id", candidateId);

      if (updateErr) {
        setError("Failed to update candidate: " + updateErr.message);
        setIsSubmitting(false);
        return;
      }
    } else {
      const { error: insertErr } = await supabase.from("candidates").insert([
        {
          name: form.name.trim(),
          position: form.position,
          image_url: form.image_url,
          campaign_text: form.campaign_text.trim(),
          age: parsedAge,
          section: form.section.trim(),
        },
      ]);

      if (insertErr) {
        setError("Failed to add candidate: " + insertErr.message);
        setIsSubmitting(false);
        return;
      }
    }

    setIsSubmitting(false);
    setSuccess(true);
  };

  if (isLoading) {
    return (
      <div style={{ padding: "48px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>
        <User size={16} className="spin" style={{ display: "block", margin: "0 auto 8px auto", color: "var(--accent-primary)" }} />
        Loading candidate profile data...
      </div>
    );
  }

  if (success) {
    return (
      <div style={{ maxWidth: "500px", margin: "40px auto", padding: "0 20px" }}>
        <div
          style={{
            backgroundColor: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "8px",
            padding: "32px 24px",
            textAlign: "center",
            boxShadow: "0 1px 2px 0 rgba(0,0,0,0.05)",
          }}
        >
          <div style={{
            width: "44px",
            height: "44px",
            borderRadius: "50%",
            backgroundColor: "rgba(16, 185, 129, 0.12)",
            border: "1px solid rgba(16, 185, 129, 0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 12px auto",
            color: "#10B981"
          }}>
            <CheckCircle2 size={22} />
          </div>
          <h2 style={{ fontSize: "18px", fontWeight: 600, color: "var(--text-main)", marginBottom: "6px" }}>
            {candidateId ? "Candidate Profile Updated!" : "Candidate Added!"}
          </h2>
          <p style={{ color: "var(--text-muted)", marginBottom: "20px", fontSize: "13px" }}>
            Candidate details for <strong>{form.name}</strong> ({form.position}) have been saved.
          </p>
          <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
            <button className="btn-primary" onClick={() => setPage("admin_setup")} style={{ padding: "8px 16px", borderRadius: "6px", fontSize: "12.5px" }}>
              Return to Roster
            </button>
            {!candidateId && (
              <button
                className="btn-secondary"
                onClick={() => {
                  setForm({ name: "", position: POSITIONS[0], image_url: "", campaign_text: "", age: "", section: "" });
                  setSuccess(false);
                }}
                style={{ padding: "8px 16px", borderRadius: "6px", fontSize: "12.5px" }}
              >
                Add Another
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "640px", margin: "0 auto", padding: "16px 20px" }}>
      <div style={{ marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
          <div style={{
            width: "26px",
            height: "26px",
            borderRadius: "6px",
            backgroundColor: "rgba(99, 102, 241, 0.12)",
            border: "1px solid rgba(99, 102, 241, 0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--accent-primary)"
          }}>
            <UserPlus size={14} />
          </div>
          <h1 style={{ margin: 0, fontSize: "18px", fontWeight: 600, color: "var(--text-main)", letterSpacing: "-0.01em" }}>
            {candidateId ? "Edit Candidate Profile" : "Register Candidate"}
          </h1>
        </div>
        <p style={{ margin: 0, fontSize: "12px", color: "var(--text-muted)" }}>
          {candidateId
            ? "Update candidate information, position, and campaign platform bio."
            : "Register a student candidate for the election roster."}
        </p>
      </div>

      <div
        style={{
          backgroundColor: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "8px",
          padding: "16px 20px",
          boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        }}
      >
        {error && (
          <div style={{
            backgroundColor: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.2)",
            color: "#EF4444",
            padding: "8px 12px",
            borderRadius: "6px",
            fontSize: "12px",
            marginBottom: "14px",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}>
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {/* Avatar Upload Banner */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px", padding: "14px 16px", backgroundColor: "var(--bg-main)", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
            <img
              src={
                base64ToImageUrl(form.image_url) ||
                form.image_url ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(form.name || "Candidate")}&background=10B981&color=ffffff`
              }
              alt="Candidate Preview"
              style={{ width: "56px", height: "56px", borderRadius: "50%", objectFit: "cover", border: "2px solid var(--accent-primary)", flexShrink: 0 }}
              onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(form.name || "Candidate")}&background=10B981&color=ffffff`; }}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1 }}>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-main)" }}>
                Candidate Photo
              </label>
              <label
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  padding: "6px 14px",
                  backgroundColor: "var(--accent-blue)",
                  border: "1px solid var(--border-blue)",
                  borderRadius: "6px",
                  color: "var(--accent-primary)",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  width: "fit-content",
                  transition: "all 0.15s ease",
                }}
              >
                <Upload size={14} />
                <span>{form.image_url ? "Change Photo" : "Upload Candidate Photo"}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{ display: "none" }}
                />
              </label>
            </div>
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", fontWeight: 500, color: "var(--text-muted)" }}>Full Name *</label>
            <input
              name="name"
              placeholder="e.g. Maria Santos"
              value={form.name}
              onChange={handleInputChange}
              style={{
                width: "100%",
                padding: "7px 10px",
                borderRadius: "6px",
                border: "1px solid var(--border-subtle)",
                backgroundColor: "var(--bg-main)",
                color: "var(--text-main)",
                fontSize: "13px"
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", fontWeight: 500, color: "var(--text-muted)" }}>Position *</label>
            <select
              name="position"
              value={form.position}
              onChange={handleInputChange}
              style={{
                width: "100%",
                padding: "7px 10px",
                borderRadius: "6px",
                border: "1px solid var(--border-subtle)",
                backgroundColor: "var(--bg-main)",
                color: "var(--text-main)",
                fontSize: "12.5px"
              }}
            >
              {POSITIONS.map((pos) => (
                <option key={pos} value={pos}>{pos}</option>
              ))}
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", fontWeight: 500, color: "var(--text-muted)" }}>Age *</label>
              <input
                type="number"
                name="age"
                placeholder="e.g. 16"
                value={form.age}
                onChange={handleInputChange}
                min="5"
                max="100"
                style={{
                  width: "100%",
                  padding: "7px 10px",
                  borderRadius: "6px",
                  border: "1px solid var(--border-subtle)",
                  backgroundColor: "var(--bg-main)",
                  color: "var(--text-main)",
                  fontSize: "13px"
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", fontWeight: 500, color: "var(--text-muted)" }}>Section / Class *</label>
              <input
                name="section"
                placeholder="e.g. Diamond / Grade 10-A"
                value={form.section}
                onChange={handleInputChange}
                style={{
                  width: "100%",
                  padding: "7px 10px",
                  borderRadius: "6px",
                  border: "1px solid var(--border-subtle)",
                  backgroundColor: "var(--bg-main)",
                  color: "var(--text-main)",
                  fontSize: "13px"
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", fontWeight: 500, color: "var(--text-muted)" }}>Campaign Platform / Biography</label>
            <textarea
              name="campaign_text"
              placeholder="Share candidate platform details, leadership experience, or slogan..."
              value={form.campaign_text}
              onChange={handleInputChange}
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: "6px",
                border: "1px solid var(--border-subtle)",
                backgroundColor: "var(--bg-main)",
                color: "var(--text-main)",
                fontSize: "12.5px",
                minHeight: "90px",
                resize: "vertical"
              }}
            />
          </div>

          <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
            <button
              className="btn-primary"
              onClick={handleSubmit}
              disabled={isSubmitting}
              style={{ flex: 1, padding: "8px 14px", borderRadius: "6px", fontSize: "12.5px", fontWeight: 500, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
            >
              <Save size={14} />
              {isSubmitting
                ? "Saving..."
                : candidateId
                ? "Update Candidate"
                : "Save Candidate"}
            </button>
            <button
              className="btn-secondary"
              onClick={() => setPage("admin_setup")}
              disabled={isSubmitting}
              style={{ padding: "8px 14px", borderRadius: "6px", fontSize: "12.5px", display: "flex", alignItems: "center", gap: "6px" }}
            >
              <ArrowLeft size={13} />
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAddCandidate;

