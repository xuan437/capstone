import React from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Lock,
  Loader2,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import "./VotingModals.css";

interface VoteLockInModalProps {
  isOpen: boolean;
  onGoBack: () => void;
  onFinalSubmit: () => void;
  isSubmitting: boolean;
  submissionError: string;
  voterName: string;
  voterId?: string;
  totalVotesCount: number;
  undervotedPositionsCount: number;
  totalPositions: number;
}

export const VoteLockInModal: React.FC<VoteLockInModalProps> = ({
  isOpen,
  onGoBack,
  onFinalSubmit,
  isSubmitting,
  submissionError,
  voterName,
  voterId,
  totalVotesCount,
  undervotedPositionsCount,
  totalPositions,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="voting-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lock-in-modal-title"
    >
      <div
        className="voting-modal-container"
        style={{ width: "min(520px, 94vw)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="voting-modal-header">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <span
                className="voting-modal-step-tag"
                style={{
                  background: "var(--color-warning-bg)",
                  color: "var(--color-warning)",
                  borderColor: "var(--color-warning-border)",
                }}
              >
                Step 2 of 2: Final Lock-In
              </span>
              <h3 id="lock-in-modal-title" className="voting-modal-title">
                <Lock size={18} style={{ color: "var(--color-warning)" }} />
                Final Ballot Submission
              </h3>
            </div>
            <p className="voting-modal-subtitle">
              Irreversible action. Please confirm that you are ready to permanently cast your official ballot.
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="voting-modal-body">
          {/* Prominent High-Impact Warning Box */}
          <div className="lock-in-warning-box">
            <AlertTriangle size={22} className="lock-in-warning-icon" />
            <div>
              <h4 className="lock-in-warning-title">
                Are you absolutely sure?
              </h4>
              <p className="lock-in-warning-text">
                Once submitted, your electronic ballot is <strong>cryptographically sealed</strong> and cannot be modified, rescinded, or resubmitted. Your student voting status will be permanently marked as <strong>VOTED</strong>.
              </p>
            </div>
          </div>

          {/* Quick Recap Breakdown */}
          <div className="lock-in-summary-card">
            <div className="lock-in-row">
              <span className="lock-in-row-label">Voter Name</span>
              <span className="lock-in-row-value">{voterName}</span>
            </div>

            {voterId && (
              <div className="lock-in-row">
                <span className="lock-in-row-label">Student LRN / ID</span>
                <span className="lock-in-row-value" style={{ fontFamily: "var(--font-mono)" }}>
                  {voterId}
                </span>
              </div>
            )}

            <div className="lock-in-row">
              <span className="lock-in-row-label">Total Votes Being Cast</span>
              <span className="lock-in-row-value" style={{ color: "var(--primary-navy)" }}>
                {totalVotesCount} Candidate{totalVotesCount === 1 ? "" : "s"} Selected
              </span>
            </div>

            <div className="lock-in-row">
              <span className="lock-in-row-label">Blank / Undervoted Positions</span>
              <span
                className="lock-in-row-value"
                style={{
                  color: undervotedPositionsCount > 0 ? "var(--color-warning)" : "var(--color-success)",
                }}
              >
                {undervotedPositionsCount === 0 ? "None (Full Ballot)" : `${undervotedPositionsCount} of ${totalPositions} Position(s)`}
              </span>
            </div>
          </div>

          {/* Security & Verification Notice */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "11px",
              color: "var(--text-muted)",
              padding: "8px 12px",
              background: "var(--bg-subtle)",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border-light)",
            }}
          >
            <ShieldCheck size={16} style={{ color: "var(--color-success)", flexShrink: 0 }} />
            <span>
              A digital receipt code and audit log entry will be generated automatically to verify cryptographic integrity.
            </span>
          </div>

          {/* Error Message if API call fails */}
          {submissionError && (
            <div
              style={{
                marginTop: "12px",
                padding: "10px 12px",
                background: "var(--color-danger-bg)",
                border: "1px solid var(--color-danger-border)",
                color: "var(--color-danger)",
                borderRadius: "var(--radius-sm)",
                fontSize: "12px",
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <AlertTriangle size={15} style={{ flexShrink: 0 }} />
              <span>{submissionError}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="voting-modal-footer">
          <button
            type="button"
            className="btn-secondary-modal"
            onClick={onGoBack}
            disabled={isSubmitting}
          >
            <ArrowLeft size={14} />
            <span>Go Back</span>
          </button>

          <button
            type="button"
            className="btn-confirm-modal"
            onClick={onFinalSubmit}
            disabled={isSubmitting}
            style={{
              background: isSubmitting ? "var(--navy-hover)" : "var(--color-success)",
              borderColor: isSubmitting ? "var(--navy-hover)" : "var(--color-success)",
            }}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={14} className="spin" />
                <span>Recording Ballot...</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={14} />
                <span>Final Submit</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
