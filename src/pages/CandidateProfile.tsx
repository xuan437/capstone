import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../supabase";
import type { Candidate, Page, User, Student } from "../types";
import { fileToBase64, base64ToImageUrl } from "../utils/imageUtils";
import BubbleLoader from "../components/BubbleLoader";
import PhotoViewerModal from "../components/PhotoViewerModal";
import {
  Edit3,
  Megaphone,
  AlertCircle,
  Award,
  Camera,
  Maximize2,
  Trash2,
  Check,
  RefreshCw,
  Upload,
  ArrowLeft,
  ShieldCheck,
  User as UserIcon,
  Calendar,
  BookOpen,
  PowerOff,
  CheckCircle2,
} from "lucide-react";
import { logAuditAction } from "../utils/auditLogger";
import {
  isCandidateDeactivated,
  getCleanCampaignText,
  setCandidateDeactivatedLocal,
} from "../utils/candidateUtils";

interface CandidateProfileProps {
  setPage: (p: Page) => void;
  candidateId: string;
  currentUser?: User | Student | null;
}

const CandidateProfile: React.FC<CandidateProfileProps> = ({
  setPage,
  candidateId,
  currentUser,
}) => {
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [voteCount, setVoteCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoToast, setPhotoToast] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [showPhotoViewer, setShowPhotoViewer] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = currentUser && "isAdmin" in currentUser && currentUser.isAdmin;

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("candidates")
        .select("id, position, name, image_url, campaign_text, age, section")
        .eq("id", candidateId)
        .single();

      if (error || !data) {
        setCandidate(null);
        setLoading(false);
        return;
      }

      setCandidate(data as Candidate);

      // Only fetch vote count if admin or if needed for stats
      const { count } = await supabase
        .from("votes")
        .select("*", { count: "exact", head: true })
        .eq("candidate_id", candidateId);

      setVoteCount(count || 0);
      setLoading(false);
    };

    run();
  }, [candidateId]);

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
        .from("candidates")
        .update({ image_url: base64 })
        .eq("id", candidateId);

      if (updateErr) throw updateErr;

      setCandidate((prev) => (prev ? { ...prev, image_url: base64 } : null));
      setPhotoToast("Profile picture updated successfully!");
      setTimeout(() => setPhotoToast(null), 3500);
    } catch (err: any) {
      setPhotoError(err.message || "Failed to update profile picture.");
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemovePhoto = async () => {
    if (!window.confirm("Are you sure you want to remove this candidate's profile picture?")) return;
    setUploadingPhoto(true);
    setPhotoError(null);

    try {
      const { error: updateErr } = await supabase
        .from("candidates")
        .update({ image_url: null })
        .eq("id", candidateId);

      if (updateErr) throw updateErr;

      setCandidate((prev) => (prev ? { ...prev, image_url: undefined } : null));
      setPhotoToast("Profile picture removed.");
      setTimeout(() => setPhotoToast(null), 3500);
    } catch (err: any) {
      setPhotoError(err.message || "Failed to remove photo.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleToggleDeactivateCandidate = async () => {
    if (!candidate) return;
    const isDeactivated = isCandidateDeactivated(candidate);
    const actionLabel = isDeactivated ? "reactivate" : "deactivate";
    if (!window.confirm(`Are you sure you want to ${actionLabel} ${candidate.name}?`)) return;
    setIsDeleting(true);
    try {
      const cleanText = getCleanCampaignText(candidate.campaign_text);
      const newCampaignText = isDeactivated ? cleanText : `[DEACTIVATED] ${cleanText}`.trim();
      const { error: updateErr } = await supabase
        .from("candidates")
        .update({ campaign_text: newCampaignText })
        .eq("id", candidateId);

      if (updateErr) throw updateErr;

      setCandidateDeactivatedLocal(candidateId, !isDeactivated);
      await logAuditAction(
        isDeactivated ? "CANDIDATE_REACTIVATED" : "CANDIDATE_DEACTIVATED",
        "Admin",
        `${isDeactivated ? "Reactivated" : "Deactivated"} candidate ${candidate.name} running for ${candidate.position}`
      );
      setCandidate((prev) => (prev ? { ...prev, campaign_text: newCampaignText } : null));
      alert(`Candidate ${candidate.name} has been ${isDeactivated ? "reactivated" : "deactivated"} successfully.`);
    } catch (err: any) {
      alert(`Failed to ${actionLabel} candidate: ` + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleReturn = () => {
    if (isAdmin) {
      setPage("admin_setup");
    } else {
      setPage("ballot");
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "64px 20px", textAlign: "center" }}>
        <BubbleLoader message="Loading official candidate profile..." />
      </div>
    );
  }

  if (!candidate) {
    return (
      <div style={{ maxWidth: "560px", margin: "40px auto", padding: "0 20px" }}>
        <div
          style={{
            backgroundColor: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-lg)",
            padding: "36px 28px",
            textAlign: "center",
          }}
        >
          <AlertCircle size={36} style={{ color: "var(--color-danger)", marginBottom: "12px" }} />
          <h3 style={{ margin: "0 0 6px", color: "var(--text-main)", fontSize: "16px", fontWeight: 700 }}>
            Candidate Profile Not Found
          </h3>
          <p style={{ color: "var(--text-muted)", fontSize: "13px", margin: "0 0 20px" }}>
            The requested candidate profile may have been removed or is unavailable.
          </p>
          <button
            className="btn-primary"
            onClick={handleReturn}
            style={{ padding: "8px 18px", borderRadius: "6px", fontSize: "13px" }}
          >
            {isAdmin ? "Return to Candidate Roster" : "Return to Ballot"}
          </button>
        </div>
      </div>
    );
  }

  const avatar =
    base64ToImageUrl(candidate.image_url) ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      candidate.name
    )}&background=059669&color=ffffff&size=300`;

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", padding: "20px 24px" }}>
      {/* Top Breadcrumb Navigation */}
      <div style={{ marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button
          type="button"
          onClick={handleReturn}
          className="btn-secondary-modal"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "6px 14px",
            height: "34px",
            fontSize: "12.5px",
            fontWeight: 600,
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          <ArrowLeft size={15} />
          <span>{isAdmin ? "Back to Candidate Roster" : "Back to Official Ballot"}</span>
        </button>

        <span
          style={{
            fontSize: "11px",
            color: "var(--text-muted)",
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
          }}
        >
          <ShieldCheck size={14} style={{ color: "var(--primary-navy)" }} />
          Official SSLG Candidate Profile
        </span>
      </div>

      {/* Hero Profile Card */}
      <div
        className="card-box"
        style={{
          borderRadius: "var(--radius-xl)",
          padding: "36px 32px 28px",
          marginBottom: "20px",
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border-subtle)",
          boxShadow: "var(--shadow-md)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Subtle decorative background gradient accent */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "100px",
            background: "linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.04) 100%)",
            borderBottom: "1px solid var(--border-light)",
          }}
        />

        {/* Candidate Portrait & Top Controls */}
        <div style={{ position: "relative", textAlign: "center", paddingTop: "20px" }}>
          {/* Avatar Ring */}
          <div style={{ position: "relative", display: "inline-block", marginBottom: "16px" }}>
            <div
              style={{
                width: "140px",
                height: "140px",
                borderRadius: "50%",
                padding: "4px",
                background: "linear-gradient(135deg, var(--primary-navy), #34D399)",
                boxShadow: "0 8px 24px rgba(5, 150, 105, 0.25)",
                margin: "0 auto",
                position: "relative",
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
                  src={avatar}
                  alt={candidate.name}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                    transition: "transform 0.2s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                  onError={(e) => {
                    e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      candidate.name
                    )}&background=059669&color=ffffff&size=300`;
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
                      fontSize: "11px",
                      gap: "6px",
                    }}
                  >
                    <RefreshCw size={20} className="spin" />
                    <span>Uploading...</span>
                  </div>
                )}
              </div>

              {/* Admin Camera Quick Action */}
              {isAdmin && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  disabled={uploadingPhoto}
                  title="Upload or replace candidate photo"
                  style={{
                    position: "absolute",
                    bottom: "2px",
                    right: "2px",
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    backgroundColor: "var(--primary-navy)",
                    color: "#ffffff",
                    border: "3px solid var(--bg-card)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.25)",
                    padding: 0,
                    transition: "transform 0.15s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.1)")}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                >
                  <Camera size={16} />
                </button>
              )}
            </div>

            {/* Hidden File Input for Admin */}
            {isAdmin && (
              <input
                type="file"
                ref={fileInputRef}
                onChange={handlePhotoUpload}
                accept="image/png, image/jpeg, image/webp"
                style={{ display: "none" }}
              />
            )}
          </div>

          {/* Quick Photo Actions Ribbon for Admin & Full View for Student */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              marginBottom: "16px",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={() => setShowPhotoViewer(true)}
              style={{
                background: "var(--bg-subtle)",
                border: "1px solid var(--border-light)",
                borderRadius: "20px",
                padding: "4px 12px",
                fontSize: "11.5px",
                fontWeight: 600,
                color: "var(--text-muted)",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              <Maximize2 size={12} />
              <span>View Full Resolution</span>
            </button>

            {isAdmin && (
              <>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  style={{
                    background: "var(--color-success-bg)",
                    border: "1px solid var(--color-success-border)",
                    borderRadius: "20px",
                    padding: "4px 12px",
                    fontSize: "11.5px",
                    fontWeight: 600,
                    color: "var(--primary-navy)",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <Upload size={12} />
                  <span>{candidate.image_url ? "Change Photo" : "Upload Photo"}</span>
                </button>

                {candidate.image_url && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    disabled={uploadingPhoto}
                    style={{
                      background: "var(--color-danger-bg)",
                      border: "1px solid var(--color-danger-border)",
                      borderRadius: "20px",
                      padding: "4px 12px",
                      fontSize: "11.5px",
                      fontWeight: 600,
                      color: "var(--color-danger)",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <Trash2 size={12} />
                    <span>Remove Photo</span>
                  </button>
                )}
              </>
            )}
          </div>

          {/* Toast / Feedback */}
          {photoToast && (
            <div
              style={{
                marginBottom: "12px",
                fontSize: "12px",
                color: "var(--color-success)",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                fontWeight: 600,
                background: "var(--color-success-bg)",
                padding: "4px 12px",
                borderRadius: "4px",
              }}
            >
              <Check size={14} /> {photoToast}
            </div>
          )}

          {photoError && (
            <div
              style={{
                marginBottom: "12px",
                fontSize: "12px",
                color: "var(--color-danger)",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                fontWeight: 600,
                background: "var(--color-danger-bg)",
                padding: "4px 12px",
                borderRadius: "4px",
              }}
            >
              <AlertCircle size={14} /> {photoError}
            </div>
          )}

          {/* Candidate Name & Position */}
          <h1
            style={{
              margin: "0 0 6px 0",
              fontSize: "26px",
              fontWeight: 700,
              color: "var(--text-main)",
              letterSpacing: "-0.02em",
            }}
          >
            {candidate.name}
          </h1>

          {/* Position Pill */}
          <div style={{ marginBottom: "16px" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "5px 16px",
                background: "var(--primary-navy)",
                color: "#FFFFFF",
                borderRadius: "99px",
                fontSize: "13px",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                boxShadow: "0 2px 8px rgba(5, 150, 105, 0.25)",
              }}
            >
              <Award size={15} />
              <span>Candidate for {candidate.position}</span>
            </span>
          </div>

          {/* Admin Management Action Row */}
          {isAdmin && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "10px",
                marginBottom: "24px",
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                className="btn-confirm-modal"
                onClick={() => setPage("admin_edit_candidate")}
                style={{ padding: "0 18px", height: "36px", fontSize: "13px" }}
              >
                <Edit3 size={14} />
                <span>Edit Candidate Details</span>
              </button>

              <button
                type="button"
                className="btn-secondary-modal"
                onClick={handleToggleDeactivateCandidate}
                disabled={isDeleting}
                style={{
                  padding: "0 16px",
                  height: "36px",
                  fontSize: "13px",
                  color: isCandidateDeactivated(candidate) ? "var(--color-success)" : "var(--color-warning, #D97706)",
                  borderColor: isCandidateDeactivated(candidate) ? "var(--color-success-border)" : "var(--color-warning-border, rgba(217, 119, 6, 0.3))",
                }}
              >
                {isCandidateDeactivated(candidate) ? <CheckCircle2 size={14} /> : <PowerOff size={14} />}
                <span>{isDeleting ? "Updating..." : (isCandidateDeactivated(candidate) ? "Reactivate Candidate" : "Deactivate Candidate")}</span>
              </button>
            </div>
          )}

          {/* 4-Column Stat Counter Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: "12px",
              paddingTop: "20px",
              borderTop: "1px solid var(--border-light)",
            }}
          >
            <div
              style={{
                background: "var(--bg-subtle)",
                borderRadius: "var(--radius-md)",
                padding: "12px 14px",
                border: "1px solid var(--border-light)",
                textAlign: "left",
              }}
            >
              <div
                style={{
                  fontSize: "10.5px",
                  fontWeight: 600,
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  marginBottom: "4px",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <BookOpen size={12} style={{ color: "var(--primary-navy)" }} />
                <span>Section / Strand</span>
              </div>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-main)" }}>
                {candidate.section || "Grade School"}
              </div>
            </div>

            <div
              style={{
                background: "var(--bg-subtle)",
                borderRadius: "var(--radius-md)",
                padding: "12px 14px",
                border: "1px solid var(--border-light)",
                textAlign: "left",
              }}
            >
              <div
                style={{
                  fontSize: "10.5px",
                  fontWeight: 600,
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  marginBottom: "4px",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <Calendar size={12} style={{ color: "var(--primary-navy)" }} />
                <span>Age</span>
              </div>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-main)" }}>
                {candidate.age ? `${candidate.age} Years Old` : "Registered"}
              </div>
            </div>

            <div
              style={{
                background: "var(--bg-subtle)",
                borderRadius: "var(--radius-md)",
                padding: "12px 14px",
                border: "1px solid var(--border-light)",
                textAlign: "left",
              }}
            >
              <div
                style={{
                  fontSize: "10.5px",
                  fontWeight: 600,
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  marginBottom: "4px",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <UserIcon size={12} style={{ color: "var(--primary-navy)" }} />
                <span>Ballot Status</span>
              </div>
              <div style={{ fontSize: "14px", fontWeight: 700, color: isCandidateDeactivated(candidate) ? "var(--color-warning, #D97706)" : "var(--color-success)" }}>
                {isCandidateDeactivated(candidate) ? "Deactivated" : "Active Candidate"}
              </div>
            </div>

            {isAdmin && (
              <div
                style={{
                  background: "var(--color-success-bg)",
                  borderRadius: "var(--radius-md)",
                  padding: "12px 14px",
                  border: "1px solid var(--color-success-border)",
                  textAlign: "left",
                }}
              >
                <div
                  style={{
                    fontSize: "10.5px",
                    fontWeight: 600,
                    color: "var(--color-success)",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    marginBottom: "4px",
                  }}
                >
                  Recorded Votes
                </div>
                <div style={{ fontSize: "18px", fontWeight: 800, color: "var(--color-success)" }}>
                  {voteCount}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Official Campaign Platform & Statement Box */}
      <div
        className="card-box"
        style={{
          borderRadius: "var(--radius-xl)",
          padding: "24px 28px",
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border-subtle)",
          boxShadow: "var(--shadow-sm)",
          marginBottom: "24px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "16px",
            paddingBottom: "12px",
            borderBottom: "1px solid var(--border-light)",
          }}
        >
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "8px",
              backgroundColor: "var(--color-success-bg)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--primary-navy)",
            }}
          >
            <Megaphone size={18} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "var(--text-main)" }}>
              Campaign Platform & Goals
            </h3>
            <p style={{ margin: "2px 0 0", fontSize: "12px", color: "var(--text-muted)" }}>
              Official agenda, advocacy, and student government platform for {candidate.name}.
            </p>
          </div>
        </div>

        {getCleanCampaignText(candidate.campaign_text) ? (
          <div
            style={{
              padding: "20px 24px",
              backgroundColor: "var(--bg-surface)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-light)",
              borderLeft: "4px solid var(--primary-navy)",
              lineHeight: "1.75",
              fontSize: "14.5px",
              color: "var(--text-main)",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              position: "relative",
            }}
          >
            <span
              style={{
                position: "absolute",
                top: "10px",
                right: "16px",
                fontSize: "44px",
                color: "var(--border-subtle)",
                fontFamily: "Georgia, serif",
                lineHeight: 1,
                userSelect: "none",
              }}
            >
              “
            </span>
            "{getCleanCampaignText(candidate.campaign_text)}"
          </div>
        ) : (
          <div
            style={{
              padding: "36px 20px",
              textAlign: "center",
              backgroundColor: "var(--bg-surface)",
              borderRadius: "var(--radius-md)",
              border: "1px dashed var(--border-light)",
            }}
          >
            <Megaphone size={28} style={{ color: "var(--text-light)", marginBottom: "8px" }} />
            <p style={{ margin: 0, color: "var(--text-muted)", fontWeight: 500, fontSize: "13px" }}>
              No campaign platform text has been submitted for this candidate yet.
            </p>
          </div>
        )}
      </div>

      {/* Return Button Footer for Student / Voter */}
      {!isAdmin && (
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <button
            type="button"
            className="btn-primary"
            onClick={handleReturn}
            style={{
              padding: "0 28px",
              height: "42px",
              fontSize: "13.5px",
              fontWeight: 600,
              borderRadius: "6px",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <ArrowLeft size={16} />
            <span>Return to Electronic Ballot</span>
          </button>
        </div>
      )}

      {/* Full Resolution Photo Viewer Modal */}
      {showPhotoViewer && (
        <PhotoViewerModal
          imageUrl={avatar}
          title={`${candidate.name} — Candidate Photo`}
          onClose={() => setShowPhotoViewer(false)}
        />
      )}
    </div>
  );
};

export default CandidateProfile;
