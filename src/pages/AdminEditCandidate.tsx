import React, { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { Candidate, Page, POSITIONS, PartyList } from "../types";
import { fileToBase64, getCandidatePhoto, getRealisticFallbackPhoto } from "../utils/imageUtils";
import { logAuditAction } from "../utils/auditLogger";
import { fetchPartyLists, getPartyListBadgeDetails } from "../utils/partylistUtils";
import { getSectionsForGrade, FIXED_GRADE_LEVELS, formatGradeSection, normalizeStrand } from "../utils/sectionConstants";
import { FaceCaptureModal } from "../components/biometrics/FaceCaptureModal";
import {
  Edit3,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Save,
  User,
  Upload,
  Camera,
  Eye,
  Flag,
  X,
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
    partylist: "Independent",
    image_url: "",
    campaign_text: "",
    age: "",
    grade: "G12",
    section: "GAS",
  });
  const [partylists, setPartylists] = useState<PartyList[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);

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
        let loadedGrade = "G12";
        let loadedSection = "GAS";

        if (c.section) {
          const raw = c.section.trim();
          if (raw.includes(" - ")) {
            const parts = raw.split(" - ");
            const numMatch = parts[0].match(/\d+/);
            if (numMatch) loadedGrade = `G${numMatch[0]}`;
            loadedSection = normalizeStrand(parts[1].trim());
          } else {
            const normalized = normalizeStrand(raw);
            const foundGrade = FIXED_GRADE_LEVELS.find((g) =>
              getSectionsForGrade(g.code).some((s) => s.toLowerCase() === normalized.toLowerCase())
            );
            if (foundGrade) {
              loadedGrade = foundGrade.code;
              loadedSection = normalized;
            } else {
              loadedSection = normalized;
            }
          }
        }

        // Validate that loadedSection exists in allowed sections for loadedGrade
        const allowed = getSectionsForGrade(loadedGrade);
        const match = allowed.find((s) => s.toLowerCase() === loadedSection.toLowerCase());
        if (match) {
          loadedSection = match;
        } else if (allowed.length > 0) {
          loadedSection = allowed[0];
        }

        setForm({
          lastName: parsed.lastName,
          firstName: parsed.firstName,
          middleName: parsed.middleName,
          position: c.position,
          partylist: c.partylist || "Independent",
          image_url: c.image_url || "",
          campaign_text: c.campaign_text || "",
          age: c.age !== undefined && c.age !== null ? String(c.age) : "",
          grade: loadedGrade,
          section: loadedSection,
        });
      }
      setIsLoading(false);
    };

    fetchPartyLists().then((list) => setPartylists(list));
    loadCandidate();
  }, [candidateId]);

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
      let { error: updateErr } = await supabase
        .from("candidates")
        .update({
          name: finalFullName,
          position: form.position,
          partylist: assignedPartylist,
          image_url: form.image_url,
          campaign_text: form.campaign_text.trim(),
          age: parsedAge,
          section: fullGradeSection,
        })
        .eq("id", candidateId);

      if (updateErr) {
        // Fallback without partylist in case remote DB column not yet added
        const fallbackRes = await supabase
          .from("candidates")
          .update({
            name: finalFullName,
            position: form.position,
            image_url: form.image_url,
            campaign_text: form.campaign_text.trim(),
            age: parsedAge,
            section: fullGradeSection,
          })
          .eq("id", candidateId);
        if (fallbackRes.error) {
          throw updateErr;
        }
      }

      await logAuditAction(
        "CANDIDATE_UPDATED",
        "Admin",
        `Updated candidate profile for ${finalFullName} (${form.position})${assignedPartylist ? ` - Slate: ${assignedPartylist}` : " - Independent"}`
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
    <div style={{ maxWidth: "820px", margin: "0 auto", padding: "16px 20px" }}>
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

        <p style={{ margin: "0 0 12px 0", fontSize: "11.5px", color: "var(--text-muted)" }}>
          Fields marked with <span style={{ color: "#ef4444", fontWeight: 600 }}>*</span> are required.
        </p>

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
              src={getCandidatePhoto(form.image_url, candidateDisplayName, candidateId || undefined)}
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
                e.currentTarget.src = getRealisticFallbackPhoto(candidateDisplayName, candidateId || undefined);
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
              Change, remove, or assign this candidate's official partylist affiliation.
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

      {/* Camera Portrait Modal */}
      {showCameraModal && (
        <FaceCaptureModal
          isOpen={showCameraModal}
          onClose={() => setShowCameraModal(false)}
          onCapture={(base64) => {
            setForm((prev) => ({ ...prev, image_url: base64 }));
            setShowCameraModal(false);
          }}
          title="Capture Candidate Portrait"
          subtitle="Align candidate face with the camera to update official election portrait."
        />
      )}
    </div>
  );
};

export default AdminEditCandidate;
