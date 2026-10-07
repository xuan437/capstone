import React, { useState, useEffect, useRef } from "react";
import "./CandidateProfile.css";
import { supabase } from "../supabase";
import type { Candidate, Page, User, Student } from "../types";
import { fileToBase64, getCandidatePhoto, getRealisticFallbackPhoto } from "../utils/imageUtils";
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
  Flag,
  X,
} from "lucide-react";
import { logAuditAction } from "../utils/auditLogger";
import {
  isCandidateDeactivated,
  getCleanCampaignText,
  setCandidateDeactivatedLocal,
} from "../utils/candidateUtils";
import { PartyList } from "../types";
import { fetchPartyLists, getPartyListBadgeDetails, removeCandidatePartylist } from "../utils/partylistUtils";

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
  const [partylists, setPartylists] = useState<PartyList[]>([]);
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
      const [candidateRes, fetchedParties] = await Promise.all([
        supabase
          .from("candidates")
          .select("id, position, name, image_url, campaign_text, age, section, partylist")
          .eq("id", candidateId)
          .single(),
        fetchPartyLists(),
      ]);

      setPartylists(fetchedParties);

      if (candidateRes.error || !candidateRes.data) {
        setCandidate(null);
        setLoading(false);
        return;
      }

      setCandidate(candidateRes.data as Candidate);

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

  const handleRemovePartylist = async () => {
    if (!candidate) return;
    if (!window.confirm(`Remove partylist affiliation from ${candidate.name}? Candidate will run as an Independent candidate.`)) {
      return;
    }
    try {
      await removeCandidatePartylist(candidate.id);
      await logAuditAction(
        "CANDIDATE_PARTYLIST_REMOVED",
        "Admin",
        `Removed partylist affiliation from ${candidate.name} (${candidate.position}) — set to Independent`
      );
      setCandidate((prev) => (prev ? { ...prev, partylist: undefined } : null));
      setPhotoToast("Partylist affiliation removed (now Independent).");
      setTimeout(() => setPhotoToast(null), 3000);
    } catch (err: any) {
      setPhotoError("Failed to remove partylist: " + (err.message || "Unknown error"));
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

  const avatar = getCandidatePhoto(candidate.image_url, candidate.name, candidate.id);
  const partyBadge = getPartyListBadgeDetails(candidate.partylist, partylists);
  const isDeactivated = isCandidateDeactivated(candidate);

  return (
    <div className="cp-page">
      {/* ── Top navigation ── */}
      <div className="cp-topnav">
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
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          <ArrowLeft size={15} />
          <span>{isAdmin ? "Back to Candidate Roster" : "Back to Official Ballot"}</span>
        </button>

        <span className="cp-topnav-badge">
          <ShieldCheck size={13} style={{ color: "var(--primary-navy)" }} />
          Official SSLG Candidate Profile
        </span>
      </div>

      {/* ── Hero card ── */}
      <div className="cp-hero">
        {/* Banner */}
        <div className="cp-hero-banner">
          <div className="cp-hero-banner-mesh" />

          {/* Deactivated ribbon */}
          {isDeactivated && (
            <div
              style={{
                position: "absolute",
                top: 18,
                right: -36,
                background: "#d97706",
                color: "#fff",
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                padding: "5px 48px",
                transform: "rotate(45deg)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
              }}
            >
              Deactivated
            </div>
          )}
        </div>

        {/* Avatar */}
        <div className="cp-avatar-wrap">
          <div className="cp-avatar-ring">
            <div
              className="cp-avatar-inner"
              onClick={() => setShowPhotoViewer(true)}
              title="Click to view full photo"
            >
              <img
                src={avatar}
                alt={candidate.name}
                className="cp-avatar-img"
                onError={(e) => {
                  e.currentTarget.src = getRealisticFallbackPhoto(candidate.name, candidate.id);
                }}
              />
              {uploadingPhoto && (
                <div className="cp-avatar-upload-overlay">
                  <RefreshCw size={20} className="spin" />
                  <span>Uploading...</span>
                </div>
              )}
            </div>

            {isAdmin && (
              <button
                type="button"
                className="cp-camera-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                disabled={uploadingPhoto}
                title="Upload or replace candidate photo"
              >
                <Camera size={14} />
              </button>
            )}
          </div>

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

        {/* Hero body */}
        <div className="cp-hero-body">
          {/* Name */}
          <h1 className="cp-name">{candidate.name}</h1>

          {/* Pills */}
          <div className="cp-pills">
            <span className="cp-pill-position">
              <Award size={14} />
              <span>Candidate for {candidate.position}</span>
            </span>

            <span
              className="cp-pill-partylist"
              style={{
                color: partyBadge.color,
                background: partyBadge.bg,
                borderColor: partyBadge.border,
              }}
            >
              <Flag size={13} />
              <span>
                {partyBadge.isIndependent
                  ? "Independent Candidate"
                  : `[${partyBadge.code}] ${partyBadge.name} Partylist`}
              </span>
            </span>
          </div>

          {/* Photo action ribbon */}
          <div className="cp-photo-actions">
            <button
              type="button"
              className="cp-photo-btn cp-photo-btn-view"
              onClick={() => setShowPhotoViewer(true)}
            >
              <Maximize2 size={12} />
              <span>View Full Resolution</span>
            </button>

            {isAdmin && (
              <>
                <button
                  type="button"
                  className="cp-photo-btn cp-photo-btn-upload"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto}
                >
                  <Upload size={12} />
                  <span>{candidate.image_url ? "Change Photo" : "Upload Photo"}</span>
                </button>

                {candidate.image_url && (
                  <button
                    type="button"
                    className="cp-photo-btn cp-photo-btn-remove"
                    onClick={handleRemovePhoto}
                    disabled={uploadingPhoto}
                  >
                    <Trash2 size={12} />
                    <span>Remove Photo</span>
                  </button>
                )}
              </>
            )}
          </div>

          {/* Toast / error */}
          {photoToast && (
            <div className="cp-toast cp-toast-success">
              <Check size={14} /> {photoToast}
            </div>
          )}
          {photoError && (
            <div className="cp-toast cp-toast-error">
              <AlertCircle size={14} /> {photoError}
            </div>
          )}

          {/* Admin action buttons */}
          {isAdmin && (
            <div className="cp-admin-actions">
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
                  color: isDeactivated ? "var(--color-success)" : "var(--color-warning, #D97706)",
                  borderColor: isDeactivated
                    ? "var(--color-success-border)"
                    : "var(--color-warning-border, rgba(217, 119, 6, 0.3))",
                }}
              >
                {isDeactivated ? <CheckCircle2 size={14} /> : <PowerOff size={14} />}
                <span>
                  {isDeleting
                    ? "Updating..."
                    : isDeactivated
                    ? "Reactivate Candidate"
                    : "Deactivate Candidate"}
                </span>
              </button>

              {candidate.partylist &&
                candidate.partylist.trim().toLowerCase() !== "independent" && (
                  <button
                    type="button"
                    className="btn-secondary-modal"
                    onClick={handleRemovePartylist}
                    style={{
                      padding: "0 16px",
                      height: "36px",
                      fontSize: "13px",
                      color: "var(--color-danger)",
                      borderColor: "var(--color-danger-border)",
                      background: "var(--color-danger-bg)",
                    }}
                    title="Remove partylist affiliation (Make candidate Independent)"
                  >
                    <X size={14} />
                    <span>Remove Partylist</span>
                  </button>
                )}
            </div>
          )}

          <hr className="cp-divider" />

          {/* ── Stat grid ── */}
          <div className="cp-stats-grid">
            {/* Partylist */}
            <div className="cp-stat-card">
              <div className="cp-stat-label">
                <Flag size={11} style={{ color: "var(--primary-navy)" }} />
                Partylist Affiliation
              </div>
              <div className="cp-stat-value">
                {candidate.partylist &&
                candidate.partylist.trim().toLowerCase() !== "independent"
                  ? candidate.partylist
                  : "Independent"}
              </div>
              {isAdmin &&
                candidate.partylist &&
                candidate.partylist.trim().toLowerCase() !== "independent" && (
                  <button
                    type="button"
                    className="cp-remove-party-btn"
                    onClick={handleRemovePartylist}
                    title="Remove partylist (Make Independent)"
                  >
                    <X size={10} />
                    <span>Remove</span>
                  </button>
                )}
            </div>

            {/* Section */}
            <div className="cp-stat-card">
              <div className="cp-stat-label">
                <BookOpen size={11} style={{ color: "var(--primary-navy)" }} />
                Section / Strand
              </div>
              <div className="cp-stat-value">{candidate.section || "—"}</div>
            </div>

            {/* Age */}
            <div className="cp-stat-card">
              <div className="cp-stat-label">
                <Calendar size={11} style={{ color: "var(--primary-navy)" }} />
                Age
              </div>
              <div className="cp-stat-value">
                {candidate.age ? `${candidate.age} Years Old` : "—"}
              </div>
            </div>

            {/* Ballot Status */}
            <div className="cp-stat-card">
              <div className="cp-stat-label">
                <UserIcon size={11} style={{ color: "var(--primary-navy)" }} />
                Ballot Status
              </div>
              <div
                className="cp-stat-value"
                style={{
                  color: isDeactivated
                    ? "var(--color-warning, #D97706)"
                    : "var(--color-success)",
                }}
              >
                {isDeactivated ? "Deactivated" : "Active Candidate"}
              </div>
            </div>

            {/* Votes — admin only */}
            {isAdmin && (
              <div className="cp-stat-card cp-stat-card-votes">
                <div className="cp-stat-label">Recorded Votes</div>
                <div className="cp-stat-value">{voteCount}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Campaign Platform ── */}
      <div className="cp-campaign-card">
        <div className="cp-campaign-header">
          <div className="cp-campaign-icon-box">
            <Megaphone size={18} />
          </div>
          <div>
            <h3 className="cp-campaign-title">Campaign Platform &amp; Goals</h3>
            <p className="cp-campaign-sub">
              Official agenda, advocacy, and student government platform for {candidate.name}.
            </p>
          </div>
        </div>

        {getCleanCampaignText(candidate.campaign_text) ? (
          <div className="cp-campaign-text-box">
            <span className="cp-campaign-quote-mark">"</span>
            {getCleanCampaignText(candidate.campaign_text)}
          </div>
        ) : (
          <div className="cp-campaign-empty">
            <Megaphone size={28} style={{ color: "var(--text-light)", marginBottom: "8px", display: "block", margin: "0 auto 8px" }} />
            No campaign platform text has been submitted for this candidate yet.
          </div>
        )}
      </div>

      {/* ── Return footer (students only) ── */}
      {!isAdmin && (
        <div className="cp-return-footer">
          <button
            type="button"
            className="btn-primary"
            onClick={handleReturn}
            style={{
              padding: "0 28px",
              height: "42px",
              fontSize: "13.5px",
              fontWeight: 600,
              borderRadius: "8px",
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

      {/* Full-resolution photo viewer */}
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
