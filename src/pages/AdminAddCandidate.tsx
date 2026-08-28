import React, { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { Candidate, Page, POSITIONS } from "../types";
import { fileToBase64, base64ToImageUrl } from "../utils/imageUtils";

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
    return <div className="screen-content flex-center">Loading candidate data...</div>;
  }

  if (success) {
    return (
      <div className="screen-content content-max-width">
        <div className="card-box flex-center" style={{ padding: "48px 32px", flexDirection: "column", textAlign: "center", maxWidth: "560px", margin: "40px auto" }}>
          <span className="material-symbols-outlined confirm-success-icon" style={{ marginBottom: "20px" }}>
            check_circle
          </span>
          <h2 style={{ fontSize: "24px", color: "var(--primary-navy)", marginBottom: "8px" }}>
            {candidateId ? "Candidate Updated!" : "Candidate Added!"}
          </h2>
          <p style={{ color: "var(--text-muted)", marginBottom: "32px" }}>
            The candidate information has been successfully saved to the election roster.
          </p>
          <div style={{ display: "flex", gap: "12px", width: "100%", justifyContent: "center" }}>
            <button className="btn-primary" onClick={() => setPage("admin_setup")} style={{ width: "auto", padding: "12px 28px" }}>
              Return to Dashboard
            </button>
            {!candidateId && (
              <button
                className="btn-outline-wide"
                onClick={() => {
                  setForm({ name: "", position: POSITIONS[0], image_url: "", campaign_text: "", age: "", section: "" });
                  setSuccess(false);
                }}
                style={{ width: "auto", padding: "12px 28px" }}
              >
                Add Another Candidate
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="screen-content content-max-width">
      <div style={{ maxWidth: "720px", margin: "0 auto", width: "100%" }}>
        <div style={{ marginBottom: "24px" }}>
          <span className="overline">Candidate Management</span>
          <h1>{candidateId ? "Edit Candidate Profile" : "Add New Candidate"}</h1>
          <p style={{ color: "var(--text-muted)" }}>
            {candidateId
              ? "Update candidate information, position, and campaign platform text."
              : "Register a new student candidate for the upcoming election."}
          </p>
        </div>

        <div className="card-box">
          {error && (
            <div style={{ color: "var(--color-danger)", background: "var(--color-danger-bg)", border: "1px solid var(--color-danger-border)", padding: "12px 16px", borderRadius: "8px", fontSize: "13px", marginBottom: "24px", fontWeight: 600 }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Candidate Image Upload & Avatar Preview */}
            <div style={{ display: "flex", alignItems: "center", gap: "20px", padding: "16px", background: "var(--bg-surface)", borderRadius: "12px", border: "1px solid var(--border-light)" }}>
              <img
                src={
                  base64ToImageUrl(form.image_url) ||
                  form.image_url ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(form.name || "Candidate")}&background=E8F0FE&color=0A192F`
                }
                alt="Candidate Preview"
                style={{ width: "72px", height: "72px", borderRadius: "50%", objectFit: "cover", border: "2px solid var(--bg-main)", boxShadow: "var(--shadow-sm)" }}
                onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(form.name || "Candidate")}&background=E8F0FE&color=0A192F`; }}
              />
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 700, marginBottom: "6px" }}>
                  Candidate Photo
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{ padding: "8px 12px", fontSize: "13px" }}
                />
              </div>
            </div>

            <div>
              <label className="form-label" style={{ display: "block", marginBottom: "6px" }}>Full Name *</label>
              <input
                name="name"
                placeholder="e.g. Maria Santos"
                value={form.name}
                onChange={handleInputChange}
              />
            </div>

            <div>
              <label className="form-label" style={{ display: "block", marginBottom: "6px" }}>Position *</label>
              <select
                name="position"
                value={form.position}
                onChange={handleInputChange}
                style={{ width: "100%", padding: "12px 36px 12px 14px" }}
              >
                {POSITIONS.map((pos) => (
                  <option key={pos} value={pos}>{pos}</option>
                ))}
              </select>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div>
                <label className="form-label" style={{ display: "block", marginBottom: "6px" }}>Age *</label>
                <input
                  type="number"
                  name="age"
                  placeholder="e.g. 16"
                  value={form.age}
                  onChange={handleInputChange}
                  min="5"
                  max="100"
                />
              </div>
              <div>
                <label className="form-label" style={{ display: "block", marginBottom: "6px" }}>Section *</label>
                <input
                  name="section"
                  placeholder="e.g. Diamond / Grade 10-A"
                  value={form.section}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div>
              <label className="form-label" style={{ display: "block", marginBottom: "6px" }}>Campaign Platform / Biography (Optional)</label>
              <textarea
                name="campaign_text"
                placeholder="Share candidate platform details, leadership experience, or campaign slogan..."
                value={form.campaign_text}
                onChange={handleInputChange}
                style={{ minHeight: "120px", resize: "vertical" }}
              />
            </div>

            <div style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
              <button
                className="btn-top-nav primary"
                onClick={handleSubmit}
                disabled={isSubmitting}
                style={{ flex: 1 }}
              >
                {isSubmitting
                  ? "Saving..."
                  : candidateId
                  ? "Update Candidate"
                  : "Save Candidate"}
              </button>
              <button
                className="btn-top-nav"
                onClick={() => setPage("admin_setup")}
                disabled={isSubmitting}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAddCandidate;
