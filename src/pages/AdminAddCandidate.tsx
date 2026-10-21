import React, { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { Page, POSITIONS, PartyList } from "../types";
import { fileToBase64, getCandidatePhoto, getRealisticFallbackPhoto } from "../utils/imageUtils";
import { logAuditAction } from "../utils/auditLogger";
import { fetchPartyLists, getPartyListBadgeDetails } from "../utils/partylistUtils";
import {
  UserPlus,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Save,
  Upload,
  Camera,
  Flag,
  X,
} from "lucide-react";
import { FaceCaptureModal } from "../components/biometrics/FaceCaptureModal";
import { getSectionsForGrade, FIXED_GRADE_LEVELS, formatGradeSection } from "../utils/sectionConstants";

interface AdminAddCandidateProps {
  setPage: (p: Page) => void;
}

const AdminAddCandidate: React.FC<AdminAddCandidateProps> = ({ setPage }) => {
  const [form, setForm] = useState({
    lastName: "",
    firstName: "",
    middleName: "",
    position: POSITIONS[0] as string,
    partylist: "Independent",
    image_url: "",
    campaign_text: "",
    age: "17",
    grade: "G12",
    section: "GAS",
  });
  const [partylists, setPartylists] = useState<PartyList[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);

  useEffect(() => {
    fetchPartyLists().then((list) => setPartylists(list));
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    if (name === "grade") {
      const allowed = getSectionsForGrade(value);
      setForm((prev) => ({
        ...prev,
        grade: value,
        section: allowed[0] || "",
      }));
      setError("");
      return;
    }

    if (name === "position") {
      let defaultGrade = form.grade;
      let defaultSec = form.section;
      if (value.includes("Gr 7") || value.includes("Grade 7")) {
        defaultGrade = "G7";
        defaultSec = "Lopez";
      } else if (value.includes("Gr 8") || value.includes("Grade 8")) {
        defaultGrade = "G8";
        defaultSec = "Sapa";
      } else if (value.includes("Gr 9") || value.includes("Grade 9")) {
        defaultGrade = "G9";
        defaultSec = "Libaton";
      } else if (value.includes("Gr 10") || value.includes("Grade 10")) {
        defaultGrade = "G10";
        defaultSec = "Timowain";
      } else if (value.includes("Gr 11") || value.includes("Grade 11")) {
        defaultGrade = "G11";
        defaultSec = "TECHPRO";
      } else if (value.includes("Gr 12") || value.includes("Grade 12")) {
        defaultGrade = "G12";
        defaultSec = "GAS";
      }

      setForm((prev) => ({ ...prev, position: value, grade: defaultGrade, section: defaultSec }));
      setError("");
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      const base64 = await fileToBase64(file);
      setForm({ ...form, image_url: base64 });
    }
  };

  // Compute final combined full name from structured parts
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

  const handleRegisterCandidate = async () => {
    if (!form.lastName.trim()) {
      return setError("Last Name is required.");
    }
    if (!form.firstName.trim()) {
      return setError("First Name is required.");
    }
    if (!form.position) {
      return setError("Candidate Position is required.");
    }
    const parsedAge = parseInt(form.age, 10);
    if (!form.age.trim() || isNaN(parsedAge) || parsedAge < 10 || parsedAge > 25) {
      return setError("Please enter a valid age between 10 and 25.");
    }
    if (!form.section.trim()) {
      return setError("Section is required.");
    }

    const finalFullName = getCombinedFullName();
    const assignedPartylist = form.partylist === "Independent" ? null : form.partylist.trim();
    const fullGradeSection = formatGradeSection(form.grade, form.section.trim());

    setIsSubmitting(true);
    setError("");

    try {
      let { error: insertErr } = await supabase.from("candidates").insert([
        {
          name: finalFullName,
          position: form.position,
          partylist: assignedPartylist,
          image_url: form.image_url,
          campaign_text: form.campaign_text.trim(),
          age: parsedAge,
          section: fullGradeSection,
        },
      ]);

      if (insertErr) {
        // Fallback without partylist column if remote DB has not yet applied migration
        const fallbackRes = await supabase.from("candidates").insert([
          {
            name: finalFullName,
            position: form.position,
            image_url: form.image_url,
            campaign_text: form.campaign_text.trim(),
            age: parsedAge,
            section: fullGradeSection,
          },
        ]);
        if (fallbackRes.error) {
          throw insertErr;
        }
      }

      await logAuditAction(
        "CANDIDATE_REGISTERED",
        "Admin",
        `Enrolled new candidate ${finalFullName} running for ${form.position}${assignedPartylist ? ` (${assignedPartylist})` : " (Independent)"}`
      );

      setIsSubmitting(false);
      setSuccess(true);
    } catch (err: any) {
      setError("Failed to add candidate: " + (err.message || "Unknown error"));
      setIsSubmitting(false);
    }
  };

  const candidateDisplayName = getCombinedFullName() || "Candidate";

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
            Candidate Successfully Registered!
          </h2>
          <p style={{ color: "var(--text-muted)", marginBottom: "20px", fontSize: "13px" }}>
            Official records for <strong>{candidateDisplayName}</strong> running for <strong>{form.position}</strong> have been recorded.
          </p>
          <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
            <button
              className="btn-primary"
              onClick={() => setPage("admin_setup")}
              style={{ padding: "8px 18px", borderRadius: "6px", fontSize: "13px", fontWeight: 600 }}
            >
              Return to Roster
            </button>
            <button
              className="btn-secondary"
              onClick={() => {
                setForm({
                  lastName: "",
                  firstName: "",
                  middleName: "",
                  position: POSITIONS[0],
                  partylist: "Independent",
                  image_url: "",
                  campaign_text: "",
                  age: "17",
                  grade: "G12",
                  section: "GAS",
                });
                setSuccess(false);
              }}
              style={{ padding: "8px 18px", borderRadius: "6px", fontSize: "13px" }}
            >
              Add Another Candidate
            </button>
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
    <div style={{ maxWidth: "820px", margin: "0 auto", padding: "16px 20px" }}>
      <div style={{ marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px" }}>
          <div
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "6px",
              backgroundColor: "var(--color-success-bg)",
              border: "1px solid var(--color-success-border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--primary-navy)",
            }}
          >
            <UserPlus size={15} />
          </div>
          <h1 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "var(--text-main)", letterSpacing: "-0.01em" }}>
            Register Candidate
          </h1>
        </div>
        <p style={{ margin: 0, fontSize: "12px", color: "var(--text-muted)" }}>
          Register an official student candidate for the SSLG election roster.
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

        <p style={{ margin: "0 0 12px 0", fontSize: "11.5px", color: "var(--text-muted)" }}>
          Fields marked with <span style={{ color: "#ef4444", fontWeight: 600 }}>*</span> are required.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Avatar Upload Banner */}
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
              src={getCandidatePhoto(form.image_url, candidateDisplayName)}
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
                e.currentTarget.src = getRealisticFallbackPhoto(candidateDisplayName);
              }}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", flex: 1 }}>
              <label style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--text-main)" }}>
                Candidate Photo <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
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

                <button
                  type="button"
                  onClick={() => setShowCameraModal(true)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    padding: "6px 14px",
                    backgroundColor: "rgba(16, 185, 129, 0.12)",
                    border: "1px solid rgba(16, 185, 129, 0.3)",
                    borderRadius: "6px",
                    color: "#10B981",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <Camera size={14} />
                  <span>Take with Camera</span>
                </button>
              </div>
            </div>
          </div>

          {/* 3-Box Structured Name Inputs: Last Name, First Name, Middle Name */}
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
                alignItems: "end",
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
                    height: "16px",
                    lineHeight: "16px",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                  title="Last Name"
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
                    height: "16px",
                    lineHeight: "16px",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                  title="First Name"
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
                    height: "16px",
                    lineHeight: "16px",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                  title="Middle Name (Optional)"
                >
                  Middle Name <span style={{ color: "var(--text-light)", fontWeight: 400 }}>(Opt)</span>
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

            {/* Live Full Name Preview */}
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

          {/* Partylist Selector */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-main)", display: "flex", alignItems: "center", gap: "6px" }}>
                <Flag size={14} style={{ color: "var(--primary-navy)" }} />
                <span>Partylist Affiliation</span>
              </label>
              {form.partylist && form.partylist !== "Independent" && (
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: "4px",
                      ...(() => {
                        const badge = getPartyListBadgeDetails(form.partylist, partylists);
                        return {
                          color: badge.color,
                          background: badge.bg,
                          border: `1px solid ${badge.border}`,
                        };
                      })(),
                    }}
                  >
                    {form.partylist} Slate
                  </span>
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, partylist: "Independent" }))}
                    style={{
                      background: "var(--color-danger-bg)",
                      border: "1px solid var(--color-danger-border)",
                      color: "var(--color-danger)",
                      borderRadius: "4px",
                      fontSize: "11px",
                      fontWeight: 600,
                      padding: "2px 7px",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "3px",
                    }}
                    title="Remove partylist (Make Independent)"
                  >
                    <X size={11} />
                    <span>Remove</span>
                  </button>
                </div>
              )}
            </div>
            <select
              name="partylist"
              value={form.partylist}
              onChange={handleInputChange}
              style={inputStyle}
            >
              <option value="Independent">Independent (No Partylist)</option>
              {partylists.map((party) => (
                <option key={party.id} value={party.name}>
                  {party.name} {party.code ? `(${party.code})` : ""}
                </option>
              ))}
            </select>
            <span style={{ fontSize: "11px", color: "var(--text-light)", marginTop: "4px", display: "block" }}>
              Assign candidate to an official partylist slate or keep as an Independent.
            </span>
          </div>

          {/* Age & Dependent Grade/Section Row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", fontWeight: 600, color: "var(--text-main)" }}>
                Age <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                type="number"
                name="age"
                placeholder="e.g. 17"
                value={form.age}
                onChange={handleInputChange}
                min={10}
                max={25}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", fontWeight: 600, color: "var(--text-main)" }}>
                Grade Level <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <select
                name="grade"
                value={form.grade}
                onChange={handleInputChange}
                style={inputStyle}
              >
                {FIXED_GRADE_LEVELS.map((g) => (
                  <option key={g.code} value={g.code}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", fontWeight: 600, color: "var(--text-main)" }}>
                Official Section <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <select
                name="section"
                value={form.section}
                onChange={handleInputChange}
                style={inputStyle}
              >
                {getSectionsForGrade(form.grade).map((sec) => (
                  <option key={sec} value={sec}>
                    {sec}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <span style={{ fontSize: "11px", color: "var(--text-light)", marginTop: "-6px", display: "block" }}>
            Fixed sections for {FIXED_GRADE_LEVELS.find((g) => g.code === form.grade)?.label || form.grade}: {getSectionsForGrade(form.grade).join(", ")}
          </span>

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

          {/* Action Submission Buttons */}
          <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
            <button
              type="button"
              className="btn-primary"
              onClick={handleRegisterCandidate}
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
              <span>{isSubmitting ? "Saving..." : "Save Candidate"}</span>
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

      {/* Camera Capture Modal */}
      {showCameraModal && (
        <FaceCaptureModal
          isOpen={showCameraModal}
          onClose={() => setShowCameraModal(false)}
          onCapture={(base64) => {
            setForm((prev) => ({ ...prev, image_url: base64 }));
            setShowCameraModal(false);
          }}
          title="Capture Candidate Portrait"
          subtitle="Align candidate face with the camera to capture official election portrait."
        />
      )}
    </div>
  );
};

export default AdminAddCandidate;
