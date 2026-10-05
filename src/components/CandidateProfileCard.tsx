import React from "react";
import {
  MessageCircle,
  Camera,
  Globe,
  BadgeCheck,
  ExternalLink,
  Eye,
  Edit3,
  PowerOff,
  CheckCircle2,
} from "lucide-react";
import { Candidate, PartyList } from "../types";
import { base64ToImageUrl } from "../utils/imageUtils";
import {
  isCandidateDeactivated,
  getCleanCampaignText,
} from "../utils/candidateUtils";
import { getPartyListBadgeDetails } from "../utils/partylistUtils";
import "./CandidateProfileCard.css";

interface CandidateProfileCardProps {
  candidate: Candidate;
  partylists: PartyList[];
  onViewCandidate: (id: string) => void;
  onEditCandidate: (id: string) => void;
  onToggleDeactivate: (candidate: Candidate) => void;
  onRemovePartylist?: (candidate: Candidate) => void;
  isSubmitting?: boolean;
}

export const CandidateProfileCard: React.FC<CandidateProfileCardProps> = ({
  candidate,
  partylists,
  onViewCandidate,
  onEditCandidate,
  onToggleDeactivate,
  isSubmitting,
}) => {
  const isDeactivated = isCandidateDeactivated(candidate);
  const badge = getPartyListBadgeDetails(candidate.partylist, partylists);

  // Avatar URL
  const avatar =
    base64ToImageUrl(candidate.image_url) ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      candidate.name
    )}&background=059669&color=ffffff&size=200`;

  // First name initial for the stylish top-left monogram circle
  const initial = (candidate.name.trim().charAt(0) || "C").toLowerCase();

  // Derive nickname from first name (e.g. "Maria Santos" → "@maria")
  const nickname = `@${candidate.name.trim().split(/\s+/)[0].toLowerCase().replace(/[^a-z0-9]/g, "")}`;

  // Clean campaign text
  const cleanBio =
    getCleanCampaignText(candidate.campaign_text) ||
    `Dedicated candidate running for ${candidate.position}. Committed to student welfare, transparency, and service excellence.`;

  const renderBioWithHighlights = (text: string) => {
    // If text contains party name, position, or keywords, highlight them
    const keywords = [
      badge.name,
      candidate.section,
      "Leadership",
      "Governance",
      "Digital",
      "Student",
      "Welfare",
      "Academic",
      "Empowering",
    ].filter(Boolean) as string[];

    if (!keywords.length) return text;

    // Highlight matches
    const regex = new RegExp(`(${keywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join("|")})`, "gi");
    const parts = text.split(regex);

    return parts.map((part, i) => {
      const isMatch = keywords.some(k => k.toLowerCase() === part.toLowerCase());
      if (isMatch) {
        return (
          <span key={i} className="showcase-bio-highlight">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div className={`candidate-showcase-card ${isDeactivated ? "is-deactivated" : ""}`}>
      {/* Top Left Monogram Circle Badge (stylized yellow initial on dark navy) */}
      <div
        className="showcase-monogram"
        title={`Candidate Initial: ${initial.toUpperCase()}`}
      >
        {initial}
      </div>

      {/* Top Right Admin Controls & Status Badge */}
      <div className="showcase-top-actions">
        {/* Status Pill */}
        <span className={`showcase-status-pill ${isDeactivated ? "deactivated" : "active"}`}>
          {isDeactivated ? "Deactivated" : "Active"}
        </span>

        {/* Quick Edit */}
        <button
          type="button"
          className="showcase-quick-btn"
          onClick={() => onEditCandidate(candidate.id)}
          title={`Edit ${candidate.name}`}
          aria-label="Edit candidate"
        >
          <Edit3 size={12} />
        </button>

        {/* Quick Deactivate / Reactivate */}
        <button
          type="button"
          className="showcase-quick-btn"
          onClick={() => onToggleDeactivate(candidate)}
          disabled={isSubmitting}
          title={isDeactivated ? "Reactivate candidate" : "Deactivate candidate"}
          aria-label="Toggle status"
          style={{
            color: isDeactivated ? "var(--color-success, #10b981)" : "var(--color-warning, #f59e0b)",
          }}
        >
          {isDeactivated ? <CheckCircle2 size={12} /> : <PowerOff size={12} />}
        </button>
      </div>

      {/* Centered Avatar with Yellow Halo Ring */}
      <div className="showcase-avatar-wrapper" onClick={() => onViewCandidate(candidate.id)}>
        <div className="showcase-avatar-ring" />
        <img
          src={avatar}
          alt={candidate.name}
          className="showcase-avatar-img"
          onError={(e) => {
            e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
              candidate.name
            )}&background=059669&color=ffffff&size=200`;
          }}
        />
      </div>

      {/* Candidate Name */}
      <h3
        className="showcase-name"
        onClick={() => onViewCandidate(candidate.id)}
        title="Click to view candidate profile"
      >
        {candidate.name}
      </h3>

      {/* Role / Position Subtitle with Partylist */}
      <div className="showcase-role">
        <span>{candidate.position}</span>
        {candidate.partylist && !badge.isIndependent && (
          <>
            <span>•</span>
            <span className="showcase-party-tag">{badge.name}</span>
          </>
        )}
        {candidate.section && (
          <>
            <span>•</span>
            <span style={{ opacity: 0.85 }}>{candidate.section}</span>
          </>
        )}
      </div>

      {/* Bio / Campaign Text (with highlighted terms in dark mode) */}
      <p className="showcase-bio" title={cleanBio}>
        {renderBioWithHighlights(cleanBio)}
      </p>

      {/* Nickname Pill — click to view profile */}
      <button
        type="button"
        className="showcase-email-pill"
        onClick={() => onViewCandidate(candidate.id)}
        title={`View profile for ${candidate.name}`}
      >
        <span>{nickname}</span>
      </button>

      {/* Bottom Row of 6 Social / Action Icons Matching Reference Mockup */}
      <div className="showcase-icons-row">
        {/* 1. Message / Advocacy */}
        <button
          type="button"
          className="showcase-icon-btn"
          title={`Message: ${candidate.name}`}
          onClick={() => onViewCandidate(candidate.id)}
        >
          <MessageCircle size={16} />
        </button>

        {/* 2. Photo Gallery */}
        <button
          type="button"
          className="showcase-icon-btn"
          title="Candidate Photo & Gallery"
          onClick={() => onViewCandidate(candidate.id)}
        >
          <Camera size={16} />
        </button>

        {/* 3. Globe / Platform */}
        <button
          type="button"
          className="showcase-icon-btn"
          title="Campaign Platform & Manifesto"
          onClick={() => onViewCandidate(candidate.id)}
        >
          <Globe size={16} />
        </button>

        {/* 4. Verified / Credentials */}
        <button
          type="button"
          className="showcase-icon-btn"
          title="Student Credentials & Academic Honors"
          onClick={() => onViewCandidate(candidate.id)}
        >
          <BadgeCheck size={16} />
        </button>

        {/* 5. GitHub / Portfolio */}
        <button
          type="button"
          className="showcase-icon-btn"
          title="Student Portfolio & Project Submissions"
          onClick={() => onViewCandidate(candidate.id)}
        >
          <ExternalLink size={16} />
        </button>

        {/* 6. View Profile (Primary View Action) */}
        <button
          type="button"
          className="showcase-icon-btn"
          title="View Full Candidate Profile"
          onClick={() => onViewCandidate(candidate.id)}
          style={{ color: "var(--primary-navy)" }}
        >
          <Eye size={16} />
        </button>
      </div>
    </div>
  );
};

export default CandidateProfileCard;
