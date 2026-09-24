import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { Candidate } from "../../types";
import { BallotSelections, PositionVoteLimits } from "../../types/voting";
import { base64ToImageUrl } from "../../utils/imageUtils";
import {
  CheckCircle2,
  AlertTriangle,
  Circle,
  ArrowRight,
  Edit3,
  X,
  ClipboardCheck,
  User,
} from "lucide-react";
import "./VotingModals.css";

interface VoteSummaryModalProps {
  isOpen: boolean;
  onEditSelections: () => void;
  onConfirmAndProceed: () => void;
  positions: readonly string[];
  positionLimits: PositionVoteLimits;
  selectedCandidates: BallotSelections;
  candidates: Candidate[];
  voterName: string;
  voterGrade?: string;
  voterId?: string;
}

export const VoteSummaryModal: React.FC<VoteSummaryModalProps> = ({
  isOpen,
  onEditSelections,
  onConfirmAndProceed,
  positions,
  positionLimits,
  selectedCandidates,
  candidates,
  voterName,
  voterGrade,
  voterId,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Build a lookup map of candidates by ID for O(1) retrieval
  const candidateMap = new Map<string, Candidate>(
    candidates.map((c) => [c.id, c])
  );

  // Calculate high-level summary counts
  let totalAllowedVotes = 0;
  let totalCastVotes = 0;
  let undervotedPositionsCount = 0;
  let fullyVotedPositionsCount = 0;
  let blankPositionsCount = 0;

  const positionSummaries = positions.map((position) => {
    const maxAllowed = positionLimits[position] || 1;
    totalAllowedVotes += maxAllowed;

    const selectedIds = selectedCandidates[position] || [];
    const count = selectedIds.length;
    totalCastVotes += count;

    const chosenCandidates = selectedIds
      .map((id) => candidateMap.get(id))
      .filter((c): c is Candidate => Boolean(c));

    let status: "full" | "undervote" | "blank";
    let statusNotice: string;

    if (count === 0) {
      status = "blank";
      blankPositionsCount += 1;
      undervotedPositionsCount += 1;
      statusNotice = "No selection made (Blank)";
    } else if (count < maxAllowed) {
      status = "undervote";
      undervotedPositionsCount += 1;
      statusNotice = `Undervoted: ${count} of ${maxAllowed} candidate${maxAllowed > 1 ? "s" : ""} selected`;
    } else {
      status = "full";
      fullyVotedPositionsCount += 1;
      statusNotice = `Fully Voted (${count} of ${maxAllowed})`;
    }

    return {
      position,
      maxAllowed,
      selectedCount: count,
      chosenCandidates,
      status,
      statusNotice,
    };
  });

  const modalContent = (
    <div
      className="voting-modal-backdrop"
      onClick={onEditSelections}
      role="dialog"
      aria-modal="true"
      aria-labelledby="summary-modal-title"
    >
      <div
        className="voting-modal-container"
        style={{ width: "min(680px, 94vw)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="voting-modal-header">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <span className="voting-modal-step-tag">Step 1 of 2</span>
              <h3 id="summary-modal-title" className="voting-modal-title">
                <ClipboardCheck size={18} style={{ color: "var(--primary-navy)" }} />
                Review Your Ballot Selections
              </h3>
            </div>
            <p className="voting-modal-subtitle">
              Verify all chosen candidates before proceeding. Positions with fewer or no selections are clearly flagged.
            </p>
          </div>

          <button
            type="button"
            onClick={onEditSelections}
            aria-label="Close summary and edit selections"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text-light)",
              padding: "4px",
              display: "flex",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="voting-modal-body">
          {/* Voter Info Ribbon */}
          <div
            style={{
              background: "var(--bg-subtle)",
              border: "1px solid var(--border-light)",
              borderRadius: "var(--radius-md)",
              padding: "10px 14px",
              marginBottom: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "8px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <User size={15} style={{ color: "var(--primary-navy)" }} />
              <span style={{ fontSize: "12px", color: "var(--text-main)" }}>
                Voter: <strong>{voterName}</strong>
                {voterGrade && ` (${voterGrade})`}
              </span>
            </div>
            {voterId && (
              <span style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                LRN: {voterId}
              </span>
            )}
          </div>

          {/* Quick Metrics Ribbon */}
          <div className="ballot-stats-ribbon">
            <div className="ballot-stat-card">
              <span className="ballot-stat-label">Total Votes Cast</span>
              <span className="ballot-stat-value">
                {totalCastVotes} / {totalAllowedVotes}
              </span>
            </div>

            <div className={`ballot-stat-card ${fullyVotedPositionsCount === positions.length ? "stat-success" : ""}`}>
              <span className="ballot-stat-label">Complete Positions</span>
              <span className="ballot-stat-value" style={{ color: "var(--color-success)" }}>
                <CheckCircle2 size={16} />
                {fullyVotedPositionsCount} / {positions.length}
              </span>
            </div>

            <div className={`ballot-stat-card ${undervotedPositionsCount > 0 ? "stat-warning" : ""}`}>
              <span className="ballot-stat-label">Undervoted / Blank</span>
              <span className="ballot-stat-value" style={{ color: undervotedPositionsCount > 0 ? "var(--color-warning)" : "var(--text-muted)" }}>
                {undervotedPositionsCount > 0 ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
                {undervotedPositionsCount}
              </span>
            </div>
          </div>

          {/* Grouped Position List */}
          <div className="summary-position-list">
            {positionSummaries.map((item) => (
              <div
                key={item.position}
                className={`summary-position-item status-${item.status}`}
              >
                {/* Position Title & Status Badge */}
                <div className="summary-pos-header">
                  <div className="summary-pos-name">
                    <span>{item.position}</span>
                    <span
                      style={{
                        fontSize: "10.5px",
                        fontWeight: 500,
                        color: "var(--text-muted)",
                        background: "var(--bg-subtle)",
                        padding: "1px 6px",
                        borderRadius: "3px",
                        border: "1px solid var(--border-light)",
                      }}
                    >
                      Limit: {item.maxAllowed}
                    </span>
                  </div>

                  <span className={`summary-pos-badge badge-${item.status}`}>
                    {item.status === "full" && <CheckCircle2 size={12} />}
                    {item.status === "undervote" && <AlertTriangle size={12} />}
                    {item.status === "blank" && <Circle size={12} />}
                    {item.statusNotice}
                  </span>
                </div>

                {/* Candidate Selection(s) or Blank notice */}
                {item.chosenCandidates.length > 0 ? (
                  <div className="summary-candidate-chips">
                    {item.chosenCandidates.map((c) => {
                      const avatar =
                        base64ToImageUrl(c.image_url) ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(
                          c.name
                        )}&background=E8F0FE&color=0A192F`;

                      return (
                        <div key={c.id} className="summary-candidate-row">
                          <img
                            src={avatar}
                            alt={c.name}
                            className="summary-candidate-img"
                            onError={(e) => {
                              e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                c.name
                              )}&background=E8F0FE&color=0A192F`;
                            }}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-main)" }}>
                              {c.name}
                            </div>
                            <div style={{ display: "flex", gap: "6px", marginTop: "2px" }}>
                              {c.section && (
                                <span style={{ fontSize: "10.5px", color: "var(--color-success)", fontWeight: 500 }}>
                                  Section: {c.section}
                                </span>
                              )}
                              {c.age && (
                                <span style={{ fontSize: "10.5px", color: "var(--text-muted)" }}>
                                  Age {c.age}
                                </span>
                              )}
                            </div>
                          </div>
                          <span
                            style={{
                              fontSize: "11px",
                              color: "var(--color-success)",
                              fontWeight: 600,
                              background: "var(--color-success-bg)",
                              padding: "2px 8px",
                              borderRadius: "4px",
                            }}
                          >
                            Selected
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="summary-blank-notice">
                    <AlertTriangle size={13} style={{ color: "var(--color-warning)" }} />
                    <span>
                      No selection made. An undervote (blank ballot) will be recorded for {item.position}.
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Undervote reassurance note */}
          {undervotedPositionsCount > 0 && (
            <div
              style={{
                marginTop: "16px",
                padding: "10px 14px",
                borderRadius: "var(--radius-sm)",
                background: "var(--color-warning-bg)",
                border: "1px solid var(--color-warning-border)",
                fontSize: "11.5px",
                color: "var(--color-warning)",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <AlertTriangle size={14} style={{ flexShrink: 0 }} />
              <span>
                You have {undervotedPositionsCount} undervoted or skipped position(s). This is completely permitted. Click <strong>Edit Selections</strong> if you wish to choose candidates, or <strong>Confirm & Proceed</strong> to move to final lock-in.
              </span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="voting-modal-footer">
          <button
            type="button"
            className="btn-secondary-modal"
            onClick={onEditSelections}
          >
            <Edit3 size={14} />
            <span>Edit Selections</span>
          </button>

          <button
            type="button"
            className="btn-confirm-modal"
            onClick={onConfirmAndProceed}
          >
            <span>Confirm & Proceed</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined"
    ? createPortal(modalContent, document.body)
    : modalContent;
};
