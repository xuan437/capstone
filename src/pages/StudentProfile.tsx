import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../supabase";
import { Student, Page } from "../types";
import { fileToBase64, getStudentPhoto, getRealisticFallbackPhoto } from "../utils/imageUtils";
import BubbleLoader from "../components/BubbleLoader";
import PhotoViewerModal from "../components/PhotoViewerModal";
import {
  CheckCircle2,
  Clock,
  RotateCw,
  MapPin,
  Eye,
  EyeOff,
  Vote,
  ShieldCheck,
  AlertCircle,
  Camera,
  Maximize2,
  Trash2,
  Upload,
  Check,
  Lock,
} from "lucide-react";
import { logAuditAction } from "../utils/auditLogger";

const StudentProfile: React.FC<{
  setPage: (p: Page) => void;
  studentId: string;
}> = ({ setPage, studentId }) => {
  const [student, setStudent] = useState<Student | null>(null);
  const [votes, setVotes] = useState<
    { id: string; candidate: { name: string; position: string }; voted_at?: string; location?: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Photo upload and preview states
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoToast, setPhotoToast] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [showPhotoViewer, setShowPhotoViewer] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Resolved vote metadata: prefer student record, fall back to first vote row
  const [resolvedVotedAt, setResolvedVotedAt] = useState<string | null>(null);
  const [resolvedLocation, setResolvedLocation] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // View Access Password Authorization State
  const [showPasswordAuthModal, setShowPasswordAuthModal] = useState(false);
  const [passwordAuthInput, setPasswordAuthInput] = useState("");
  const [passwordAuthError, setPasswordAuthError] = useState("");

  const handleTogglePasswordView = () => {
    if (showPassword) {
      setShowPassword(false);
    } else {
      setShowPasswordAuthModal(true);
      setPasswordAuthInput("");
      setPasswordAuthError("");
    }
  };

  const handleConfirmPasswordAuth = async () => {
    const { ADMIN_PASSWORD } = await import("../types");
    if (passwordAuthInput !== ADMIN_PASSWORD) {
      setPasswordAuthError("Incorrect administrator password. Access denied.");
      if (student) {
        await logAuditAction(
          "SECURITY_ACCESS_KEY_DENIED",
          "Admin",
          `Denied attempt to reveal access passcode for voter ${student.name} (LRN: ${student.id}) — incorrect admin password`
        );
      }
      return;
    }
    setShowPassword(true);
    setShowPasswordAuthModal(false);
    setPasswordAuthInput("");
    setPasswordAuthError("");
    if (student) {
      await logAuditAction(
        "SECURITY_ACCESS_KEY_REVEALED",
        "Admin",
        `Administrator revealed access passcode for voter ${student.name} (LRN: ${student.id})`
      );
    }
  };

  // View Votes Cast Record Authorization State
  const [showVotesCast, setShowVotesCast] = useState(false);
  const [showVotesAuthModal, setShowVotesAuthModal] = useState(false);
  const [votesAuthInput, setVotesAuthInput] = useState("");
  const [votesAuthError, setVotesAuthError] = useState("");

  const handleToggleVotesCast = () => {
    if (showVotesCast) {
      setShowVotesCast(false);
    } else {
      setShowVotesAuthModal(true);
      setVotesAuthInput("");
      setVotesAuthError("");
    }
  };

  const handleConfirmVotesAuth = async () => {
    const { ADMIN_PASSWORD } = await import("../types");
    if (votesAuthInput !== ADMIN_PASSWORD) {
      setVotesAuthError("Incorrect administrator password. Access denied.");
      if (student) {
        await logAuditAction(
          "BALLOT_ACCESS_DENIED",
          "Admin",
          `Denied attempt to inspect votes cast record for voter ${student.name} (LRN: ${student.id}) — incorrect admin password`
        );
      }
      return;
    }
    setShowVotesCast(true);
    setShowVotesAuthModal(false);
    setVotesAuthInput("");
    setVotesAuthError("");
    try {
      if (student) {
        await logAuditAction(
          "VOTES_CAST_RECORD_VIEWED",
          "Admin",
          `Admin authorized access to view votes cast record for voter ${student.name} (${student.id})`
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchStudentProfile = async () => {
    setLoading(true);
    setError("");

    // ── 1. Fetch student record ──
    const { data: stuData, error: stuError } = await supabase
      .from("students")
      .select("*")
      .eq("id", studentId)
      .single();

    if (stuError || !stuData) {
      setError("Student profile not found.");
      setLoading(false);
      return;
    }

    setStudent(stuData as Student);

    // ── 2. Fetch votes ──
    let voteRows: any[] = [];
    const { data: votesFull, error: votesError } = await supabase
      .from("votes")
      .select("id, candidate_id, position, voted_at, location")
      .eq("student_id", studentId)
      .order("voted_at", { ascending: true });

    if (votesError) {
      const { data: votesBasic } = await supabase
        .from("votes")
        .select("id, candidate_id, position")
        .eq("student_id", studentId);
      voteRows = votesBasic || [];
    } else {
      voteRows = votesFull || [];
    }

    if (!voteRows || voteRows.length === 0) {
      setVotes([]);
      const studentVotedAt = (stuData as any).voted_at as string | null;
      const studentLocation = (stuData as any).vote_location as string | null;
      setResolvedVotedAt(studentVotedAt || null);
      setResolvedLocation(studentLocation || null);
      setLoading(false);
      return;
    }

    const candidateIds = [...new Set(voteRows.map((v: any) => v.candidate_id))];
    const { data: candidateRows } = await supabase
      .from("candidates")
      .select("id, name, position")
      .in("id", candidateIds);

    const candidateMap: Record<string, { name: string; position: string }> = {};
    (candidateRows || []).forEach((c: any) => {
      candidateMap[c.id] = { name: c.name, position: c.position };
    });

    const transformed = voteRows.map((vote: any) => ({
      id: vote.id,
      candidate: candidateMap[vote.candidate_id] || { name: "Unknown", position: vote.position || "" },
      voted_at: vote.voted_at as string | undefined,
      location: vote.location as string | undefined,
    }));

    setVotes(transformed);

    const studentVotedAt = (stuData as any).voted_at as string | null;
    const studentLocation = (stuData as any).vote_location as string | null;
    const firstVote = transformed[0];

    setResolvedVotedAt(studentVotedAt || firstVote?.voted_at || null);
    setResolvedLocation(
      studentLocation && studentLocation !== "Location unavailable"
        ? studentLocation
        : firstVote?.location && firstVote.location !== "Location unavailable"
        ? firstVote.location
        : studentLocation || firstVote?.location || null
    );

    setLoading(false);
  };

  useEffect(() => {
    fetchStudentProfile();
  }, [studentId]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setPhotoError("Please select a valid image file (JPG, PNG, WebP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setPhotoError("Image size exceeds 5MB limit.");
      return;
    }

    setUploadingPhoto(true);
    setPhotoError(null);

    try {
      const base64 = await fileToBase64(file);
      const { error: updateErr } = await supabase
        .from("students")
        .update({ photo_url: base64 })
        .eq("id", studentId);

      if (updateErr) throw updateErr;

      setStudent((prev) => (prev ? { ...prev, photo_url: base64 } : null));
      setPhotoToast("Voter photo updated successfully!");
      setTimeout(() => setPhotoToast(null), 3500);
    } catch (err: any) {
      setPhotoError(err.message || "Failed to update voter photo.");
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemovePhoto = async () => {
    if (!window.confirm(`Are you sure you want to remove the photo for ${student?.name}?`)) return;
    setUploadingPhoto(true);
    setPhotoError(null);

    try {
      const { error: updateErr } = await supabase
        .from("students")
        .update({ photo_url: null })
        .eq("id", studentId);

      if (updateErr) throw updateErr;

      setStudent((prev) => (prev ? { ...prev, photo_url: undefined } : null));
      setPhotoToast("Voter photo removed.");
      setTimeout(() => setPhotoToast(null), 3500);
    } catch (err: any) {
      setPhotoError(err.message || "Failed to remove photo.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  if (loading) return <div style={{ padding: "48px", textAlign: "center" }}><BubbleLoader message="Loading voter profile..." /></div>;
  if (error || !student) {
    return (
      <div style={{ maxWidth: "500px", margin: "40px auto", padding: "0 20px" }}>
        <div style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "8px", padding: "32px 24px", textAlign: "center" }}>
          <AlertCircle size={32} style={{ color: "#EF4444", marginBottom: "12px" }} />
          <p style={{ color: "#EF4444", fontWeight: 500, fontSize: "13px" }}>{error || "Student profile could not be loaded."}</p>
          <button className="btn-secondary" onClick={() => setPage("admin_voters")} style={{ marginTop: "16px", padding: "6px 14px", borderRadius: "6px", fontSize: "12px" }}>
            Return to Voters Roster
          </button>
        </div>
      </div>
    );
  }

  const avatarUrl = getStudentPhoto(student.photo_url, student.name, student.id);

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", padding: "16px 20px" }}>
      {/* Modern Centered Student Voter Profile Card */}
      <div
        style={{
          borderRadius: "10px",
          padding: "24px 20px 16px 20px",
          textAlign: "center",
          marginBottom: "16px",
          backgroundColor: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        }}
      >
        {/* Top Centered Circular Photo with Interactive Controls */}
        <div style={{ position: "relative", display: "inline-block", marginBottom: "14px" }}>
          <div
            style={{
              position: "relative",
              width: "96px",
              height: "96px",
              borderRadius: "50%",
              padding: "3px",
              background: student.has_voted
                ? "linear-gradient(135deg, #10B981, #059669)"
                : "linear-gradient(135deg, var(--accent-primary, #6366F1), #8B5CF6)",
              boxShadow: student.has_voted
                ? "0 4px 14px rgba(16, 185, 129, 0.25)"
                : "0 4px 14px rgba(99, 102, 241, 0.25)",
              margin: "0 auto",
            }}
          >
            <div
              style={{
                width: "100%",
                height: "100%",
                borderRadius: "50%",
                overflow: "hidden",
                position: "relative",
                cursor: "pointer",
                backgroundColor: "var(--bg-card)",
              }}
              onClick={() => setShowPhotoViewer(true)}
              title="Click to view full photo"
            >
              <img
                src={avatarUrl}
                alt={student.name}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                }}
                onError={(e) => {
                  e.currentTarget.src = getRealisticFallbackPhoto(student.name, student.id);
                }}
              />

              {uploadingPhoto && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    backgroundColor: "rgba(0, 0, 0, 0.65)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#ffffff",
                    fontSize: "10px",
                    gap: "4px",
                  }}
                >
                  <RotateCw size={18} style={{ animation: "spin 1s linear infinite" }} />
                  <span>Saving...</span>
                </div>
              )}
            </div>

            {/* Quick Camera Action Badge */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              disabled={uploadingPhoto}
              title="Change voter photo"
              style={{
                position: "absolute",
                bottom: "-2px",
                right: "-2px",
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                backgroundColor: student.has_voted ? "#10B981" : "var(--accent-primary, #6366F1)",
                color: "#ffffff",
                border: "2px solid var(--bg-surface)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: "0 2px 6px rgba(0, 0, 0, 0.2)",
                padding: 0,
                transition: "transform 0.15s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.1)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
            >
              <Camera size={15} />
            </button>
          </div>

          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handlePhotoUpload}
            accept="image/png, image/jpeg, image/webp, image/gif"
            style={{ display: "none" }}
          />

          {/* Quick Photo Actions Buttons */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", marginTop: "10px" }}>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhoto}
              style={{
                background: "var(--bg-subtle, rgba(99, 102, 241, 0.08))",
                border: "1px solid var(--border-subtle)",
                borderRadius: "14px",
                padding: "3px 10px",
                fontSize: "11px",
                fontWeight: 500,
                color: "var(--accent-primary)",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <Upload size={11} />
              {student.photo_url ? "Change Photo" : "Upload Photo"}
            </button>

            {student.photo_url && (
              <>
                <button
                  type="button"
                  onClick={() => setShowPhotoViewer(true)}
                  style={{
                    background: "var(--bg-subtle, rgba(0,0,0,0.04))",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "14px",
                    padding: "3px 8px",
                    fontSize: "11px",
                    fontWeight: 500,
                    color: "var(--text-muted)",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "3px",
                  }}
                  title="View full resolution"
                >
                  <Maximize2 size={11} />
                  View
                </button>
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  disabled={uploadingPhoto}
                  style={{
                    background: "transparent",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "14px",
                    padding: "3px 8px",
                    fontSize: "11px",
                    fontWeight: 500,
                    color: "#EF4444",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "3px",
                  }}
                  title="Remove voter photo"
                >
                  <Trash2 size={11} />
                  Remove
                </button>
              </>
            )}
          </div>

          {/* Toast / Feedback Message */}
          {photoToast && (
            <div
              style={{
                marginTop: "6px",
                fontSize: "11.5px",
                color: "#10B981",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                fontWeight: 500,
              }}
            >
              <Check size={13} /> {photoToast}
            </div>
          )}
          {photoError && (
            <div
              style={{
                marginTop: "6px",
                fontSize: "11.5px",
                color: "#EF4444",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                fontWeight: 500,
              }}
            >
              <AlertCircle size={13} /> {photoError}
            </div>
          )}
        </div>

        {/* Student Name Title */}
        <h1 style={{ margin: "0 0 4px 0", fontSize: "18px", color: "var(--text-main)", fontWeight: 600, letterSpacing: "-0.01em" }}>
          {student.name}
        </h1>

        {/* Meta Line */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            fontSize: "12px",
            fontWeight: 500,
            color: "var(--text-muted)",
            marginBottom: "14px",
          }}
        >
          <MapPin size={13} style={{ color: "var(--accent-primary)" }} />
          <span>DLMHS Voter &bull; Grade {student.grade} {student.section ? `• Section ${student.section}` : ""}</span>
        </div>

        {/* Action Button & Status Pill Row */}
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "18px" }}>
          <div className={`profile-voted-pill ${student.has_voted ? "voted" : "pending"}`} style={{ padding: "4px 12px", fontSize: "12px", borderRadius: "12px" }}>
            {student.has_voted ? <CheckCircle2 size={13} /> : <Clock size={13} />}
            {student.has_voted ? "Official Vote Cast" : "Voting Pending"}
          </div>

          <button className="btn-secondary" onClick={fetchStudentProfile} style={{ padding: "4px 10px", borderRadius: "6px", fontSize: "11.5px", display: "flex", alignItems: "center", gap: "4px" }}>
            <RotateCw size={12} />
            Refresh
          </button>
        </div>

        {/* Bottom 3-Column Stat Counter Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: "8px",
            paddingTop: "14px",
            borderTop: "1px solid var(--border-subtle)",
          }}
        >
          <div>
            <div style={{ fontSize: "10.5px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: "2px" }}>
              Student LRN
            </div>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-main)", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {student.id}
            </div>
          </div>
          <div>
            <div style={{ fontSize: "10.5px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: "2px" }}>
              Grade Level
            </div>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-main)" }}>
              {student.grade}
            </div>
          </div>
          <div>
            <div style={{ fontSize: "10.5px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: "2px" }}>
              Status
            </div>
            <div style={{ fontSize: "13px", fontWeight: 600, color: student.has_voted ? "#10B981" : "#F59E0B" }}>
              {student.has_voted ? "Voted" : "Pending"}
            </div>
          </div>
        </div>
      </div>

      {/* Security & Access Key Details Box */}
      <div style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "8px", padding: "16px", marginBottom: "16px", boxShadow: "0 1px 2px 0 rgba(0,0,0,0.05)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", paddingBottom: "10px", borderBottom: "1px solid var(--border-subtle)" }}>
          <ShieldCheck size={16} style={{ color: "var(--accent-primary)" }} />
          <div>
            <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: "var(--text-main)" }}>Student Credentials & Key</h3>
            <p style={{ margin: 0, fontSize: "11.5px", color: "var(--text-muted)" }}>LRN identification and passcode access details.</p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px" }}>
          <div style={{ minWidth: 0, backgroundColor: "var(--bg-main)", padding: "10px", borderRadius: "6px", border: "1px solid var(--border-subtle)" }}>
            <div style={{ fontSize: "10.5px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "2px" }}>
              Access Password
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              {(() => {
                const displayPw = student.password && student.password.startsWith("$2a$") ? "123456" : student.password;
                return (
                  <>
                    <span style={{ fontFamily: "monospace", fontSize: "12px", fontWeight: 600, color: "var(--text-main)", letterSpacing: showPassword ? "normal" : "0.15em" }}>
                      {displayPw ? (showPassword ? displayPw : "••••••••") : "Standard"}
                    </span>
                    {displayPw && (
                      <button
                        type="button"
                        onClick={handleTogglePasswordView}
                        style={{ background: "none", border: "none", cursor: "pointer", padding: "2px", color: "var(--text-muted)", display: "inline-flex", alignItems: "center" }}
                        title={showPassword ? "Hide Password" : "Show Password"}
                      >
                        {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                    )}
                  </>
                );
              })()}
            </div>
          </div>

          <div style={{ minWidth: 0, backgroundColor: "var(--bg-main)", padding: "10px", borderRadius: "6px", border: "1px solid var(--border-subtle)" }}>
            <div style={{ fontSize: "10.5px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "2px" }}>
              Voting Time
            </div>
            <div style={{ fontSize: "12px", fontWeight: 500, color: "var(--text-main)" }}>
              {student.has_voted && resolvedVotedAt ? (
                new Date(resolvedVotedAt).toLocaleString("en-PH", {
                  month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: true
                })
              ) : (
                <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>Not Voted</span>
              )}
            </div>
          </div>

          <div style={{ minWidth: 0, backgroundColor: "var(--bg-main)", padding: "10px", borderRadius: "6px", border: "1px solid var(--border-subtle)" }}>
            <div style={{ fontSize: "10.5px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "2px" }}>
              Voting Location
            </div>
            <div style={{ fontSize: "11.5px", fontWeight: 500, color: "var(--text-main)", wordBreak: "break-word", lineHeight: 1.35 }} title={resolvedLocation || ""}>
              {student.has_voted && resolvedLocation ? (
                resolvedLocation
              ) : (
                <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>Not Voted</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Votes Cast Breakdown */}
      <div style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "8px", padding: "16px", boxShadow: "0 1px 2px 0 rgba(0,0,0,0.05)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px", flexWrap: "wrap", gap: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Vote size={16} style={{ color: "var(--accent-primary)" }} />
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: "var(--text-main)" }}>Votes Cast Record</h3>
                {votes.length > 0 && (
                  <span style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    padding: "2px 6px",
                    borderRadius: "4px",
                    background: showVotesCast ? "rgba(16, 185, 129, 0.12)" : "rgba(245, 158, 11, 0.12)",
                    color: showVotesCast ? "#10B981" : "#D97706",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "3px",
                    textTransform: "uppercase",
                    letterSpacing: "0.03em",
                  }}>
                    {showVotesCast ? <Check size={11} /> : <Lock size={11} />}
                    {showVotesCast ? "Unlocked" : "Protected"}
                  </span>
                )}
              </div>
              <p style={{ margin: 0, fontSize: "11.5px", color: "var(--text-muted)" }}>Official ballot record of candidate choices (Protected by Ballot Secrecy).</p>
            </div>
          </div>

          {votes.length > 0 && (
            <button
              type="button"
              className={showVotesCast ? "btn-secondary" : "btn-primary"}
              onClick={handleToggleVotesCast}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                fontSize: "12px",
                fontWeight: 600,
                padding: "5px 12px",
                borderRadius: "6px",
                cursor: "pointer",
                ...(showVotesCast ? {} : { background: "var(--primary-navy)", borderColor: "var(--primary-navy)" }),
              }}
            >
              {showVotesCast ? (
                <>
                  <EyeOff size={13} />
                  <span>Hide Votes</span>
                </>
              ) : (
                <>
                  <Lock size={13} />
                  <span>View Votes Record</span>
                </>
              )}
            </button>
          )}
        </div>

        {votes.length === 0 ? (
          <div style={{ padding: "28px 16px", textAlign: "center", backgroundColor: "var(--bg-main)", borderRadius: "6px", border: "1px dashed var(--border-subtle)" }}>
            <Vote size={24} style={{ color: "var(--text-light)", marginBottom: "6px" }} />
            <h4 style={{ margin: "0 0 2px 0", color: "var(--text-main)", fontSize: "13px", fontWeight: 500 }}>No Votes Cast Yet</h4>
            <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "12px" }}>
              This student has not submitted a ballot in the current election.
            </p>
          </div>
        ) : !showVotesCast ? (
          <div style={{
            padding: "28px 16px",
            textAlign: "center",
            backgroundColor: "var(--bg-main)",
            borderRadius: "6px",
            border: "1px dashed var(--border-subtle)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}>
            <div style={{
              width: "42px",
              height: "42px",
              borderRadius: "50%",
              background: "rgba(5, 150, 105, 0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--primary-navy)",
              marginBottom: "10px",
            }}>
              <Lock size={20} />
            </div>
            <h4 style={{ margin: "0 0 4px 0", color: "var(--text-main)", fontSize: "13.5px", fontWeight: 600 }}>
              Ballot Secrecy Protected
            </h4>
            <p style={{ margin: "0 0 14px 0", color: "var(--text-muted)", fontSize: "12px", maxWidth: "420px", lineHeight: "1.45" }}>
              Candidate choices are confidential under SSLG election guidelines. Administrator password authorization is required to audit and inspect this voter's choices.
            </p>
            <button
              type="button"
              className="btn-primary"
              onClick={handleToggleVotesCast}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "7px 16px",
                borderRadius: "6px",
                fontSize: "12.5px",
                fontWeight: 600,
                background: "var(--primary-navy)",
                borderColor: "var(--primary-navy)",
                cursor: "pointer",
              }}
            >
              <Lock size={13} />
              <span>Enter Admin Password to View</span>
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {votes.map((vote) => {
              const formattedTime = vote.voted_at
                ? new Date(vote.voted_at).toLocaleString("en-PH", {
                    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: true
                  })
                : null;
              return (
                <div
                  key={vote.id}
                  style={{
                    padding: "10px 14px",
                    backgroundColor: "var(--bg-main)",
                    borderRadius: "6px",
                    border: "1px solid var(--border-subtle)",
                    borderLeft: "3px solid var(--accent-primary)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "8px" }}>
                    <div>
                      <div style={{ fontSize: "10.5px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 500 }}>Position</div>
                      <strong style={{ fontSize: "13px", color: "var(--text-main)" }}>{vote.candidate.position}</strong>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "10.5px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 500 }}>Selected Candidate</div>
                      <div style={{ fontWeight: 600, color: "#10B981", fontSize: "13px" }}>{vote.candidate.name}</div>
                    </div>
                  </div>
                  {(formattedTime || vote.location) && (
                    <div style={{ marginTop: "6px", paddingTop: "6px", borderTop: "1px dashed var(--border-subtle)", display: "flex", flexWrap: "wrap", gap: "6px" }}>
                      {formattedTime && (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "var(--text-muted)" }}>
                          <Clock size={11} />
                          {formattedTime}
                        </span>
                      )}
                      {vote.location && (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "var(--text-muted)" }}>
                          <MapPin size={11} />
                          {vote.location}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Full Resolution Photo Viewer Modal */}
      {showPhotoViewer && (
        <PhotoViewerModal
          imageUrl={avatarUrl}
          title={`${student.name} — Voter Photo`}
          onClose={() => setShowPhotoViewer(false)}
        />
      )}

      {/* Admin Password Authorization Modal for Viewing Access Password */}
      {showPasswordAuthModal && typeof document !== "undefined" && createPortal(
        <div
          className="policy-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowPasswordAuthModal(false);
              setPasswordAuthInput("");
              setPasswordAuthError("");
            }
          }}
        >
          <div
            className="policy-modal-content"
            style={{
              width: "100%",
              maxWidth: "360px",
              padding: "24px",
              borderRadius: "10px",
              background: "var(--bg-card)",
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              boxShadow: "var(--shadow-modal)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <Lock size={18} style={{ color: "var(--primary-navy)" }} />
              <h3 style={{ margin: 0, color: "var(--text-main)", fontSize: "15px", fontWeight: 600 }}>
                Reveal Voter Password
              </h3>
            </div>
            <p style={{ margin: "0 0 16px 0", color: "var(--text-muted)", fontSize: "12px", lineHeight: "1.45" }}>
              Enter administrator password to decrypt and view this student's access password.
            </p>
            <input
              type="password"
              placeholder="Enter admin password"
              value={passwordAuthInput}
              onChange={(e) => {
                setPasswordAuthInput(e.target.value);
                setPasswordAuthError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && handleConfirmPasswordAuth()}
              autoFocus
              style={{
                width: "100%",
                padding: "9px 12px",
                border: `1px solid ${passwordAuthError ? "var(--color-danger)" : "var(--border-subtle)"}`,
                borderRadius: "6px",
                fontSize: "13px",
                boxSizing: "border-box",
                outline: "none",
                marginBottom: "6px",
                background: "var(--bg-subtle)",
                color: "var(--text-main)",
              }}
            />
            {passwordAuthError && (
              <p style={{ margin: "0 0 10px 0", color: "var(--color-danger)", fontSize: "11.5px", fontWeight: 500 }}>
                {passwordAuthError}
              </p>
            )}
            <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setShowPasswordAuthModal(false);
                  setPasswordAuthInput("");
                  setPasswordAuthError("");
                }}
                style={{ flex: 1, padding: "8px 12px", borderRadius: "6px", fontSize: "12px" }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleConfirmPasswordAuth}
                style={{ flex: 1, padding: "8px 12px", borderRadius: "6px", fontSize: "12px", background: "var(--primary-navy)", borderColor: "var(--primary-navy)" }}
              >
                Reveal
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Admin Password Authorization Modal for Viewing Votes Cast Record */}
      {showVotesAuthModal && typeof document !== "undefined" && createPortal(
        <div
          className="policy-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowVotesAuthModal(false);
              setVotesAuthInput("");
              setVotesAuthError("");
            }
          }}
        >
          <div
            className="policy-modal-content"
            style={{
              width: "100%",
              maxWidth: "360px",
              padding: "24px",
              borderRadius: "10px",
              background: "var(--bg-card)",
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              boxShadow: "var(--shadow-modal)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <Lock size={18} style={{ color: "var(--primary-navy)" }} />
              <h3 style={{ margin: 0, color: "var(--text-main)", fontSize: "15px", fontWeight: 600 }}>
                Authorize Ballot Access
              </h3>
            </div>
            <p style={{ margin: "0 0 16px 0", color: "var(--text-muted)", fontSize: "12px", lineHeight: "1.45" }}>
              Enter administrator password to inspect the official votes cast record for <strong>{student.name}</strong>.
            </p>
            <input
              type="password"
              placeholder="Enter admin password"
              value={votesAuthInput}
              onChange={(e) => {
                setVotesAuthInput(e.target.value);
                setVotesAuthError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && handleConfirmVotesAuth()}
              autoFocus
              style={{
                width: "100%",
                padding: "9px 12px",
                border: `1px solid ${votesAuthError ? "var(--color-danger)" : "var(--border-subtle)"}`,
                borderRadius: "6px",
                fontSize: "13px",
                boxSizing: "border-box",
                outline: "none",
                marginBottom: "6px",
                background: "var(--bg-subtle)",
                color: "var(--text-main)",
              }}
            />
            {votesAuthError && (
              <p style={{ margin: "0 0 10px 0", color: "var(--color-danger)", fontSize: "11.5px", fontWeight: 500 }}>
                {votesAuthError}
              </p>
            )}
            <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setShowVotesAuthModal(false);
                  setVotesAuthInput("");
                  setVotesAuthError("");
                }}
                style={{ flex: 1, padding: "8px 12px", borderRadius: "6px", fontSize: "12px" }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleConfirmVotesAuth}
                style={{ flex: 1, padding: "8px 12px", borderRadius: "6px", fontSize: "12px", background: "var(--primary-navy)", borderColor: "var(--primary-navy)" }}
              >
                Unlock & View
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};

export default StudentProfile;
