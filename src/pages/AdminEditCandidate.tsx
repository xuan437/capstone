import React, { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { Candidate, Page, POSITIONS } from "../types";
import { fileToBase64, base64ToImageUrl } from "../utils/imageUtils";
import { logAuditAction } from "../utils/auditLogger";
import {
  Edit3,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Save,
  User,
  Upload,
  Eye,
} from "lucide-react";

interface AdminEditCandidateProps {
  setPage: (p: Page) => void;
  candidateId: string | null;
  onViewCandidate?: (id: string) => void;
}

const AdminEditCandidate: React.FC<AdminEditCandidateProps> = ({
  setPage,
  candidateId,
  onViewCandidate,
}) => {
  const [form, setForm] = useState({
    lastName: "",
    firstName: "",
    middleName: "",
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

  // Helper to parse existing single full name string into structured parts
  const parseCandidateName = (fullName: string) => {
    if (!fullName) return { lastName: "", firstName: "", middleName: "" };
    const trimmed = fullName.trim();

    // Format: "LastName, FirstName MiddleName"
    if (trimmed.includes(",")) {
      const [lastPart, firstPart] = trimmed.split(",");
      const tokens = (firstPart || "").trim().split(/\s+/);
      return {
        lastName: (lastPart || "").trim(),
        firstName: tokens[0] || "",
        middleName: tokens.slice(1).join(" ") || "",
      };
    }

    // Format: "FirstName [MiddleName...] LastName"
    const tokens = trimmed.split(/\s+/);
    if (tokens.length === 1) {
      return { lastName: tokens[0], firstName: "", middleName: "" };
    } else if (tokens.length === 2) {
      return { firstName: tokens[0], middleName: "", lastName: tokens[1] };
    } else {
      const firstName = tokens[0];
      const lastName = tokens[tokens.length - 1];
      const middleName = tokens.slice(1, -1).join(" ");
      return { firstName, middleName, lastName };
    }
  };

  useEffect(() => {
    if (!candidateId) {
      setError("No candidate ID specified for editing.");
      return;
    }

    const loadCandidate = async () => {
      setIsLoading(true);
      setError("");
      const { data, error } = await supabase
        .from("candidates")
        .select("*")
        .eq("id", candidateId)
        .single();

      if (error || !data) {
        setError("Failed to load candidate details: " + (error?.message || "Not found"));
      } else {
        const c = data as Candidate;
        const parsed = parseCandidateName(c.name);
        setForm({
          lastName: parsed.lastName,
          firstName: parsed.firstName,
          middleName: parsed.middleName,
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

  const getCombinedFullName = () => {
    const fn = form.firstName.trim();
    const mn = form.middleName.trim();
    const ln = form.lastName.trim();

    if (!fn && !ln) return "";
    if (mn) {
      return `${fn} ${mn} ${ln}`.trim();
    }
    return `${fn} ${ln}`.trim();
  };

  const handleUpdate = async () => {
    if (!candidateId) {
      return setError("Invalid candidate ID. Unable to update.");
    }
    if (!form.lastName.trim()) {
      return setError("Last Name is required.");
    }
    if (!form.firstName.trim()) {
      return setError("First Name is required.");
    }
    if (!form.position) {
      return setError("Candidate Position is required.");
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

    const finalFullName = getCombinedFullName();

    setIsSubmitting(true);
    setError("");

    try {
      const { error: updateErr } = await supabase
        .from("candidates")
        .update({
          name: finalFullName,
          position: form.position,
          image_url: form.image_url,
          campaign_text: form.campaign_text.trim(),
          age: parsedAge,
          section: form.section.trim(),
        })
        .eq("id", candidateId);

      if (updateErr) {
        throw updateErr;
      }

      await logAuditAction(
        "CANDIDATE_UPDATED",
        "Admin",
        `Updated candidate profile for ${finalFullName} (${form.position})`
      );

      setIsSubmitting(false);
      setSuccess(true);
    } catch (err: any) {
      setError("Failed to update candidate: " + (err.message || "Unknown error"));
      setIsSubmitting(false);
    }
  };

  const candidateDisplayName = getCombinedFullName() || "Candidate";

  if (!candidateId) {
    return (
      <div style={{ maxWidth: "520px", margin: "40px auto", padding: "0 20px" }}>
        <div
          style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-lg)",
            padding: "36px 24px",
            textAlign: "center",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <AlertCircle size={32} style={{ color: "var(--color-danger)", margin: "0 auto 12px auto" }} />
          <h2 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-main)", marginBottom: "8px" }}>
            No Candidate Selected
          </h2>
          <p style={{ color: "var(--text-muted)", fontSize: "13px", marginBottom: "20px" }}>
            Please select a candidate from the roster to edit their details.
          </p>
          <button
            className="btn-primary"
            onClick={() => setPage("admin_setup")}
            style={{ padding: "8px 18px", borderRadius: "6px", fontSize: "13px", fontWeight: 600 }}
          >
            Return to Roster
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div style={{ padding: "48px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>
        <User size={16} className="spin" style={{ display: "block", margin: "0 auto 8px auto", color: "var(--primary-navy)" }} />
        Loading candidate profile data...
      </div>
    );
  }

  if (success) {
    return (
      <div style={{ maxWidth: "520px", margin: "40px auto", padding: "0 20px" }}>
        <div
          style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-lg)",
            padding: "36px 24px",
            textAlign: "center",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              backgroundColor: "var(--color-success-bg)",
              border: "1px solid var(--color-success-border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 14px auto",
              color: "var(--color-success)",
            }}
          >
            <CheckCircle2 size={24} />
          </div>
          <h2 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-main)", marginBottom: "6px" }}>
            Candidate Profile Updated!
          </h2>
          <p style={{ color: "var(--text-muted)", marginBottom: "20px", fontSize: "13px" }}>
            Changes for <strong>{candidateDisplayName}</strong> running for <strong>{form.position}</strong> have been recorded.
          </p>
          <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
            <button
              className="btn-primary"
              onClick={() => setPage("admin_setup")}
              style={{ padding: "8px 18px", borderRadius: "6px", fontSize: "13px", fontWeight: 600 }}
            >
              Return to Roster
            </button>
            {onViewCandidate && candidateId && (
              <button
                className="btn-secondary"
                onClick={() => onViewCandidate(candidateId)}
                style={{
                  padding: "8px 18px",
                  borderRadius: "6px",
                  fontSize: "13px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <Eye size={14} />
                <span>View Profile</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 12px",
    borderRadius: "6px",
    border: "1px solid var(--border-subtle)",
    backgroundColor: "var(--bg-main)",
    color: "var(--text-main)",
    fontSize: "13px",
    boxSizing: "border-box",
  };

  return (
    <div style={{ maxWidth: "680px", margin: "0 auto", padding: "16px 20px" }}>
      <div style={{ marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px" }}>
          <div
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "6px",
              backgroundColor: "rgba(5, 150, 105, 0.12)",
              border: "1px solid rgba(5, 150, 105, 0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--primary-navy)",
            }}
          >
            <Edit3 size={15} />
          </div>
          <h1 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "var(--text-main)", letterSpacing: "-0.01em" }}>
            Edit Candidate Profile
          </h1>
        </div>
        <p style={{ margin: 0, fontSize: "12px", color: "var(--text-muted)" }}>
          Update candidate information, position, and campaign platform details.
        </p>
      </div>

      <div
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-lg)",
          padding: "20px 24px",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        {error && (
          <div
            style={{
              backgroundColor: "var(--color-danger-bg)",
              border: "1px solid var(--color-danger-border)",
              color: "var(--color-danger)",
              padding: "10px 14px",
              borderRadius: "6px",
              fontSize: "12.5px",
              marginBottom: "16px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontWeight: 500,
            }}
          >
            <AlertCircle size={15} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Avatar Preview & Upload */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              padding: "14px 18px",
              backgroundColor: "var(--bg-subtle)",
              borderRadius: "8px",
              border: "1px solid var(--border-light)",
            }}
          >
            <img
              src={
                base64ToImageUrl(form.image_url) ||
                form.image_url ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(
                  candidateDisplayName
                )}&background=059669&color=ffffff&size=160`
              }
              alt="Candidate Preview"
              style={{
                width: "60px",
                height: "60px",
                borderRadius: "50%",
                objectFit: "cover",
                border: "2px solid var(--primary-navy)",
                flexShrink: 0,
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
              }}
              onError={(e) => {
                e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                  candidateDisplayName
                )}&background=059669&color=ffffff&size=160`;
              }}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1 }}>
              <label style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--text-main)" }}>
                Candidate Photo
              </label>
              <label
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  padding: "6px 14px",
                  backgroundColor: "var(--color-success-bg)",
                  border: "1px solid var(--color-success-border)",
                  borderRadius: "6px",
                  color: "var(--primary-navy)",
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
                  accept="image/png, image/jpeg, image/webp"
                  onChange={handleFileChange}
                  style={{ display: "none" }}
                />
              </label>
            </div>
          </div>

          {/* Structured Name Inputs */}
          <div>
            <label
              style={{
                display: "block",
                marginBottom: "6px",
                fontSize: "12.5px",
                fontWeight: 600,
                color: "var(--text-main)",
              }}
            >
              Candidate Name *
            </label>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
                gap: "10px",
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "4px",
                    fontSize: "11px",
                    fontWeight: 500,
                    color: "var(--text-muted)",
                  }}
                >
                  Last Name *
                </label>
                <input
                  name="lastName"
                  placeholder="e.g. Santos"
                  value={form.lastName}
                  onChange={handleInputChange}
                  required
                  style={inputStyle}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "4px",
                    fontSize: "11px",
                    fontWeight: 500,
                    color: "var(--text-muted)",
                  }}
                >
                  First Name *
                </label>
                <input
                  name="firstName"
                  placeholder="e.g. Maria Sofia"
                  value={form.firstName}
                  onChange={handleInputChange}
                  required
                  style={inputStyle}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: "4px",
                    fontSize: "11px",
                    fontWeight: 500,
                    color: "var(--text-muted)",
                  }}
                >
                  Middle Name <span style={{ color: "var(--text-light)", fontWeight: 400 }}>(Optional)</span>
                </label>
                <input
                  name="middleName"
                  placeholder="e.g. Alvarez"
                  value={form.middleName}
                  onChange={handleInputChange}
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Live Name Preview */}
            {(form.firstName || form.lastName) && (
              <div
                style={{
                  marginTop: "8px",
                  fontSize: "11.5px",
                  color: "var(--text-muted)",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <span>Full Name Preview:</span>
                <span
                  style={{
                    fontWeight: 700,
                    color: "var(--primary-navy)",
                    background: "var(--bg-subtle)",
                    padding: "2px 8px",
                    borderRadius: "4px",
                    border: "1px solid var(--border-light)",
                  }}
                >
                  {getCombinedFullName()}
                </span>
              </div>
            )}
          </div>

          {/* Position Selector */}
          <div>
            <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", fontWeight: 600, color: "var(--text-main)" }}>
              Position *
            </label>
            <select
              name="position"
              value={form.position}
              onChange={handleInputChange}
              style={inputStyle}
            >
              {POSITIONS.map((pos) => (
                <option key={pos} value={pos}>
                  {pos}
                </option>
              ))}
            </select>
          </div>

          {/* Age & Section Row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", fontWeight: 600, color: "var(--text-main)" }}>
                Age *
              </label>
              <input
                type="number"
                name="age"
                placeholder="e.g. 17"
                value={form.age}
                onChange={handleInputChange}
                min="5"
                max="100"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", fontWeight: 600, color: "var(--text-main)" }}>
                Section / Strand *
              </label>
              <input
                name="section"
                placeholder="e.g. STEM-A / Grade 12"
                value={form.section}
                onChange={handleInputChange}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Campaign Platform / Bio */}
          <div>
            <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", fontWeight: 600, color: "var(--text-main)" }}>
              Campaign Platform & Goals
            </label>
            <textarea
              name="campaign_text"
              placeholder="Share candidate advocacy, leadership experience, vision statement, or platform slogans..."
              value={form.campaign_text}
              onChange={handleInputChange}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "6px",
                border: "1px solid var(--border-subtle)",
                backgroundColor: "var(--bg-main)",
                color: "var(--text-main)",
                fontSize: "13px",
                minHeight: "100px",
                resize: "vertical",
                lineHeight: "1.5",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
            <button
              type="button"
              className="btn-primary"
              onClick={handleUpdate}
              disabled={isSubmitting}
              style={{
                flex: 1,
                padding: "10px 16px",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
              }}
            >
              <Save size={15} />
              <span>{isSubmitting ? "Updating..." : "Update Candidate"}</span>
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setPage("admin_setup")}
              disabled={isSubmitting}
              style={{
                padding: "10px 16px",
                borderRadius: "6px",
                fontSize: "13px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <ArrowLeft size={14} />
              <span>Cancel</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminEditCandidate;
