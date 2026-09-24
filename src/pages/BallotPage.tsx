import React, { useState, useEffect } from "react";
import {
  Vote,
  CheckCircle2,
  Circle,
  Gavel,
  Lock,
  Check,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  ShieldCheck,
  Send,
  RotateCcw,
  XCircle,
  Info,
  Eye,
  Search,
  X,
} from "lucide-react";
import { supabase } from "../supabase";
import { Student, Candidate, Page, POSITIONS } from "../types";
import {
  BallotSelections,
  ConfirmationStep,
  DEFAULT_POSITION_VOTE_LIMITS,
  OvervoteNotice,
  PositionVoteLimits,
} from "../types/voting";
import { base64ToImageUrl } from "../utils/imageUtils";
import { isCandidateDeactivated } from "../utils/candidateUtils";
import { CountdownTimer } from "../components/CountdownTimer";
import { generateReceiptCode, saveVoteReceipt } from "../utils/receiptVerifier";
import { logAuditAction } from "../utils/auditLogger";
import { captureVoterLocation } from "../utils/locationCapture";
import { useLanguage } from "../context/LanguageContext";
import { seedSampleCandidatesIfEmpty } from "../utils/seedCandidates";
import { VoteSummaryModal } from "../components/voting/VoteSummaryModal";
import { VoteLockInModal } from "../components/voting/VoteLockInModal";

interface BallotPageProps {
  setPage: (p: Page) => void;
  currentUser: Student;
  searchTerm?: string;
  setSearchTerm?: (term: string) => void;
  onViewCandidate?: (id: string) => void;
}

const BallotPage: React.FC<BallotPageProps> = ({
  setPage,
  currentUser,
  searchTerm,
  setSearchTerm,
  onViewCandidate,
}) => {
  const { t } = useLanguage();

  // ---------------------------------------------------------------------------
  // Candidate & Ballot Selection State
  // ---------------------------------------------------------------------------
  // Candidate selections map: position -> array of selected candidate IDs.
  // Supports single or multi-seat positions, smooth deselect, and undervoting.
  const [selectedCandidates, setSelectedCandidates] = useState<BallotSelections>({});
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [positionLimits] = useState<PositionVoteLimits>(DEFAULT_POSITION_VOTE_LIMITS);

  // Transient warning notice displayed when user attempts to exceed a position's vote limit
  const [overvoteNotice, setOvervoteNotice] = useState<OvervoteNotice | null>(null);

  // ---------------------------------------------------------------------------
  // Two-Stage Confirmation Modal State Flow
  // ---------------------------------------------------------------------------
  // "idle" -> "summary" (Modal 1: Review choices/undervotes) -> "lock_in" (Modal 2: Final irreversible lock)
  const [confirmationStep, setConfirmationStep] = useState<ConfirmationStep>("idle");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState("");

  // UI accordion, timer, and loading states
  const [expandedCampaign, setExpandedCampaign] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [isTimerExpired, setIsTimerExpired] = useState(false);
  const [collapsedPositions, setCollapsedPositions] = useState<Record<string, boolean>>({});

  // ---------------------------------------------------------------------------
  // 1. Initial Verification & Candidate Loading
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const checkVotingStatus = async () => {
      try {
        if (currentUser.has_voted) {
          setPage("confirm");
          return;
        }

        const { data: studentData } = await supabase
          .from("students")
          .select("has_voted")
          .eq("id", currentUser.id)
          .maybeSingle();

        if (studentData?.has_voted) {
          setPage("confirm");
          return;
        }

        const { data: existingVotes } = await supabase
          .from("votes")
          .select("id")
          .eq("student_id", currentUser.id)
          .limit(1);

        if (existingVotes && existingVotes.length > 0) {
          setPage("confirm");
          return;
        }

        let { data, error: fetchError } = await supabase
          .from("candidates")
          .select("*");

        if (!fetchError && (!data || data.length === 0)) {
          await seedSampleCandidatesIfEmpty();
          const reFetch = await supabase.from("candidates").select("*");
          data = reFetch.data || [];
        }

        if (fetchError) {
          setError("Unable to load ballot: " + fetchError.message);
          setCandidates([]);
        } else {
          const allCandidates = (data || []) as Candidate[];
          setCandidates(allCandidates.filter((c) => !isCandidateDeactivated(c)));
        }
      } catch (err: any) {
        console.error("Ballot loading error:", err);
        setError("Network connection issue. Please check your connection and refresh.");
      } finally {
        setLoading(false);
      }
    };

    checkVotingStatus();
  }, [currentUser.id, setPage, currentUser.has_voted]);

  // ---------------------------------------------------------------------------
  // 2. Candidate Selection Handlers (Toggle, Deselect, Overvote Prevention)
  // ---------------------------------------------------------------------------
  /**
   * Toggles a candidate's selection status.
   * - If already selected: smoothly deselects / clears the choice.
   * - If not selected: checks limit. If limit is reached, STRICTLY PREVENTS
   *   selection and shows an immediate warning message.
   */
  const handleToggleCandidate = (position: string, candidateId: string) => {
    if (isTimerExpired) return;

    const currentSelections = selectedCandidates[position] || [];
    const isAlreadySelected = currentSelections.includes(candidateId);
    const maxAllowed = positionLimits[position] || 1;

    if (isAlreadySelected) {
      // Smooth toggle / deselect
      const updated = currentSelections.filter((id) => id !== candidateId);
      setSelectedCandidates((prev) => ({
        ...prev,
        [position]: updated,
      }));

      // Clear overvote warning if it was for this position
      if (overvoteNotice?.position === position) {
        setOvervoteNotice(null);
      }
    } else {
      // Strict prevention of overvoting
      if (currentSelections.length >= maxAllowed) {
        setOvervoteNotice({
          position,
          maxAllowed,
          message: `Maximum voting limit reached for ${position} (${maxAllowed} of ${maxAllowed}). Deselect your current candidate before selecting another.`,
        });
        return;
      }

      // Add selection
      setSelectedCandidates((prev) => ({
        ...prev,
        [position]: [...currentSelections, candidateId],
      }));

      // Clear any prior overvote warning for this position
      if (overvoteNotice?.position === position) {
        setOvervoteNotice(null);
      }
    }
  };

  /**
   * Clears all selections for a specific position (allows quick resetting/abstaining).
   */
  const handleClearPosition = (position: string) => {
    if (isTimerExpired) return;
    setSelectedCandidates((prev) => ({
      ...prev,
      [position]: [],
    }));
    if (overvoteNotice?.position === position) {
      setOvervoteNotice(null);
    }
  };

  // ---------------------------------------------------------------------------
  // 3. Search & Grouping Calculations
  // ---------------------------------------------------------------------------
  const isSearchActive = Boolean(searchTerm && searchTerm.trim().length > 0);
  const normalizedSearch = searchTerm?.toLowerCase().trim() || "";

  // Filter candidates according to search query
  const filteredCandidates = candidates.filter((c) => {
    if (!isSearchActive) return true;
    return (
      c.name.toLowerCase().includes(normalizedSearch) ||
      c.position.toLowerCase().includes(normalizedSearch) ||
      (c.section && c.section.toLowerCase().includes(normalizedSearch)) ||
      (c.campaign_text && c.campaign_text.toLowerCase().includes(normalizedSearch)) ||
      (c.age && String(c.age).includes(normalizedSearch))
    );
  });

  const grouped = POSITIONS.reduce<Record<string, Candidate[]>>((acc, pos) => {
    acc[pos] = filteredCandidates.filter((c) => c.position === pos);
    return acc;
  }, {});

  const matchingPositions = POSITIONS.filter(
    (pos) => (grouped[pos] || []).length > 0
  );

  // ---------------------------------------------------------------------------
  // 4. Two-Stage Submission Handlers
  // ---------------------------------------------------------------------------
  /**
   * Step 1: Intercept the initial "Submit Vote" action from the ballot page.
   * Instead of submitting immediately, opens Modal 1 (Vote Summary).
   */
  const handleInitiateReview = () => {
    if (isTimerExpired) {
      setError("The election deadline has passed. You can no longer submit your ballot.");
      return;
    }
    setError("");
    setSubmissionError("");
    setOvervoteNotice(null);
    // Open Stage 1: Summary Modal
    setConfirmationStep("summary");
  };

  /**
   * Step 2: User clicked "Confirm & Proceed" on the Summary Modal.
   * Advances to Modal 2 (Final Lock-In warning).
   */
  const handleProceedToLockIn = () => {
    setConfirmationStep("lock_in");
  };

  /**
   * User clicked "Edit Selections" on the Summary Modal.
   * Closes modal to return to ballot for adjustments.
   */
  const handleEditSelections = () => {
    setConfirmationStep("idle");
  };

  /**
   * User clicked "Go Back" on the Final Lock-In Modal.
   * Returns them to Stage 1 (Summary Modal).
   */
  const handleGoBackToSummary = () => {
    setConfirmationStep("summary");
  };

  /**
   * Step 3: Final Lock-In Submit.
   * Executes the actual backend Supabase submission, creates receipts, audit logs,
   * updates voter state, and navigates to confirmation.
   */
  const handleFinalSubmit = async () => {
    if (isTimerExpired) {
      setSubmissionError("The election deadline has passed. Ballot submissions are locked.");
      return;
    }

    setIsSubmitting(true);
    setSubmissionError("");

    const votedAt = new Date().toISOString();

    try {
      // 1. Double check election cutoff settings
      const { data: settings, error: settingsError } = await supabase
        .from("election_settings")
        .select("end_time")
        .eq("id", 1)
        .maybeSingle();

      if (!settingsError && settings?.end_time) {
        if (new Date() >= new Date(settings.end_time)) {
          setSubmissionError("The election deadline has passed. You can no longer submit your ballot.");
          setIsTimerExpired(true);
          setIsSubmitting(false);
          return;
        }
      }

      // 2. Double check if voter already cast ballot
      const { data: existingVotes } = await supabase
        .from("votes")
        .select("id")
        .eq("student_id", currentUser.id)
        .limit(1);

      if (existingVotes && existingVotes.length > 0) {
        setSubmissionError("You have already voted.");
        setIsSubmitting(false);
        return;
      }

      // 3. Capture voter location (GPS / IP fallback)
      const locResult = await captureVoterLocation();
      const locationText = locResult.locationString;

      // 4. Collect vote records for all selected candidates (Undervoted positions are excluded)
      const voteInsertsWithMeta: Array<{
        student_id: string;
        candidate_id: string;
        position: string;
        voted_at: string;
        location: string;
      }> = [];

      POSITIONS.forEach((position) => {
        const selectedIds = selectedCandidates[position] || [];
        selectedIds.forEach((candidateId) => {
          voteInsertsWithMeta.push({
            student_id: currentUser.id,
            candidate_id: candidateId,
            position,
            voted_at: votedAt,
            location: locationText,
          });
        });
      });

      // 5. Insert votes into Supabase if any candidates were selected
      if (voteInsertsWithMeta.length > 0) {
        const { error: voteError } = await supabase.from("votes").insert(voteInsertsWithMeta);

        if (voteError) {
          // Fallback insert without location column in case older schema exists
          const voteInsertsBase = voteInsertsWithMeta.map((v) => ({
            student_id: v.student_id,
            candidate_id: v.candidate_id,
            position: v.position,
          }));
          const { error: voteErrorBase } = await supabase.from("votes").insert(voteInsertsBase);
          if (voteErrorBase) throw voteErrorBase;
        }
      }

      // 6. Update student record as has_voted = true
      const { error: studentUpdateError } = await supabase
        .from("students")
        .update({ has_voted: true, voted_at: votedAt, vote_location: locationText })
        .eq("id", currentUser.id);

      if (studentUpdateError) {
        await supabase
          .from("students")
          .update({ has_voted: true })
          .eq("id", currentUser.id);
      }

      // 7. Generate receipt code and persist locally & remotely
      const receiptId = generateReceiptCode(currentUser.id, votedAt);
      await saveVoteReceipt(currentUser.id, receiptId, voteInsertsWithMeta.length);

      // 8. Log audit entry
      await logAuditAction(
        "VOTE_SUBMITTED",
        currentUser.name,
        `Cast ballot with ${voteInsertsWithMeta.length} vote(s) across ${POSITIONS.length} positions. Receipt: ${receiptId}. Location: ${locationText}`
      );

      // 9. Insert into receipts table
      const { error: receiptError } = await supabase.from("receipts").insert([
        {
          student_id: currentUser.id,
          receipt_id: receiptId,
          receipt_data: JSON.stringify({
            receipt_code: receiptId,
            positions_voted: voteInsertsWithMeta.length,
            total_positions: POSITIONS.length,
            voted_at: votedAt,
            location: locationText,
          }),
          timestamp: votedAt,
          student_name: currentUser.name,
          grade: currentUser.grade,
          voted_at: votedAt,
          location: locationText,
        },
      ]);

      if (receiptError) {
        await supabase.from("receipts").insert([
          {
            student_id: currentUser.id,
            receipt_data: JSON.stringify({
              receipt_code: receiptId,
              positions_voted: voteInsertsWithMeta.length,
            }),
          },
        ]);
      }

      // 10. Update local storage session
      localStorage.setItem(
        "currentUser",
        JSON.stringify({ ...currentUser, has_voted: true })
      );

      // Close modals and transition to confirmation screen
      setConfirmationStep("idle");
      setPage("confirm");
    } catch (err: any) {
      console.error("Submission failed:", err);
      const message = err instanceof Error ? err.message : "Please try again.";
      setSubmissionError("Submission failed: " + message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 5. Ballot Progress & Position Grouping Calculations
  // ---------------------------------------------------------------------------
  const totalPositions = POSITIONS.length;

  // Total candidate votes cast across all positions
  const totalVotesCast = Object.values(selectedCandidates).reduce(
    (sum, ids) => sum + (ids ? ids.length : 0),
    0
  );

  // Positions where the voter selected at least 1 candidate
  const positionsWithSelectionCount = POSITIONS.filter(
    (pos) => (selectedCandidates[pos] || []).length > 0
  ).length;

  // Fully voted positions (selected count == max allowed)
  const fullyVotedPositions = POSITIONS.filter(
    (pos) => (selectedCandidates[pos] || []).length >= (positionLimits[pos] || 1)
  );

  // Undervoted positions (selected count < max allowed, including blank positions)
  const undervotedPositions = POSITIONS.filter(
    (pos) => (selectedCandidates[pos] || []).length < (positionLimits[pos] || 1)
  );

  const blankPositions = POSITIONS.filter(
    (pos) => (selectedCandidates[pos] || []).length === 0
  );

  const isAllFullyVoted = fullyVotedPositions.length === totalPositions;

  if (loading) {
    return (
      <div className="screen-content flex-center" style={{ fontSize: "13px", color: "var(--text-muted)" }}>
        Loading electronic ballot...
      </div>
    );
  }

  return (
    <div className="screen-content content-max-width">
      {/* Real-time Countdown Banner */}
      <CountdownTimer
        onExpire={() => setIsTimerExpired(true)}
        onTimerLoaded={(endTime: string | null) => {
          if (endTime) {
            setIsTimerExpired(new Date() >= new Date(endTime));
          } else {
            setIsTimerExpired(false);
          }
        }}
      />

      {isTimerExpired && (
        <div
          style={{
            background: "var(--color-danger-bg)",
            border: "1px solid var(--color-danger-border)",
            borderRadius: "8px",
            padding: "10px 14px",
            color: "var(--color-danger)",
            display: "flex",
            gap: "8px",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <Gavel size={16} style={{ color: "var(--color-danger)" }} />
          <div>
            <h4 style={{ margin: 0, fontWeight: 600, fontSize: "13px", color: "var(--color-danger)" }}>
              ELECTION HAS OFFICIALLY ENDED
            </h4>
            <p style={{ margin: "2px 0 0 0", fontSize: "11.5px", color: "var(--color-danger)" }}>
              The cutoff deadline has been reached. Ballot submissions are locked.
            </p>
          </div>
        </div>
      )}

      {/* Header Banner & Student Welcome */}
      <div className="card-box" style={{ padding: "16px 20px", marginBottom: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <img
              src="/logo.png"
              alt="School Emblem"
              style={{
                width: "50px",
                height: "50px",
                borderRadius: "50%",
                objectFit: "cover",
                border: "2px solid var(--border-light)",
                flexShrink: 0,
              }}
            />
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px" }}>
                <h1 style={{ margin: 0, fontSize: "17px", color: "var(--text-main)", fontWeight: 700 }}>
                  Official Electronic Ballot
                </h1>
                <span
                  style={{
                    fontSize: "11px",
                    background: "var(--color-success-bg)",
                    color: "var(--color-success)",
                    padding: "2px 8px",
                    borderRadius: "99px",
                    fontWeight: 600,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    border: "1px solid var(--color-success-border)",
                  }}
                >
                  <ShieldCheck size={12} /> Verified Voter
                </span>
              </div>
              <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "12.5px" }}>
                Welcome, <strong>{currentUser.name}</strong> ({currentUser.grade}). Review profiles and cast your selections below.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search Filter Active Banner */}
      {isSearchActive && (
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-light)",
            borderRadius: "var(--radius-md)",
            padding: "10px 16px",
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "8px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Search size={15} style={{ color: "var(--primary-navy)" }} />
            <span style={{ fontSize: "12.5px", color: "var(--text-main)" }}>
              Filtering ballot for "<strong>{searchTerm}</strong>" — <strong>{filteredCandidates.length}</strong> candidate(s) found across {matchingPositions.length} position(s).
            </span>
          </div>
          {setSearchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              style={{
                background: "var(--bg-subtle)",
                border: "1px solid var(--border-light)",
                borderRadius: "4px",
                padding: "3px 10px",
                fontSize: "11px",
                fontWeight: 600,
                color: "var(--text-muted)",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <X size={12} />
              <span>Show All Positions</span>
            </button>
          )}
        </div>
      )}

      {/* Empty Search Results */}
      {isSearchActive && filteredCandidates.length === 0 && (
        <div
          className="card-box"
          style={{
            padding: "48px 24px",
            textAlign: "center",
            marginBottom: "20px",
          }}
        >
          <Search size={36} style={{ color: "var(--text-light)", marginBottom: "12px" }} />
          <h3 style={{ margin: "0 0 6px 0", fontSize: "16px", fontWeight: 700, color: "var(--text-main)" }}>
            No Candidates Found
          </h3>
          <p style={{ margin: "0 0 16px 0", fontSize: "12.5px", color: "var(--text-muted)" }}>
            No candidates matched "<strong>{searchTerm}</strong>". You can clear the search to view all positions.
          </p>
          {setSearchTerm && (
            <button
              type="button"
              className="btn-secondary-modal"
              onClick={() => setSearchTerm("")}
              style={{ margin: "0 auto" }}
            >
              Clear Search Filter
            </button>
          )}
        </div>
      )}

      {/* Voting Progress, Rules Notice & Quick-Jump Chips */}
      <div className="card-box" style={{ padding: "16px 20px", marginBottom: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", flexWrap: "wrap", gap: "6px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Vote size={15} style={{ color: "var(--primary-navy)" }} />
            <h3 style={{ margin: 0, fontSize: "13.5px", fontWeight: 700, color: "var(--text-main)" }}>
              Ballot Selections Progress
            </h3>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--primary-navy)" }}>
              {Math.round((positionsWithSelectionCount / totalPositions) * 100)}% Positions Voted
            </span>
            <span
              style={{
                fontSize: "11px",
                background: "var(--bg-subtle)",
                border: "1px solid var(--border-light)",
                padding: "2px 8px",
                borderRadius: "4px",
                fontWeight: 600,
                color: "var(--text-muted)",
              }}
            >
              {totalVotesCast} Candidate{totalVotesCast === 1 ? "" : "s"} Selected
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div
          style={{
            background: "var(--bg-subtle)",
            borderRadius: "99px",
            height: "6px",
            marginBottom: "12px",
            overflow: "hidden",
            border: "1px solid var(--border-light)",
          }}
        >
          <div
            style={{
              background: isAllFullyVoted ? "var(--color-success)" : "var(--primary-navy)",
              height: "100%",
              width: `${(positionsWithSelectionCount / totalPositions) * 100}%`,
              borderRadius: "99px",
              transition: "width 0.3s ease",
            }}
          />
        </div>

        {/* Informational Guidance on Voting Rules */}
        <div
          style={{
            fontSize: "11.5px",
            color: "var(--text-muted)",
            background: "var(--bg-subtle)",
            padding: "8px 12px",
            borderRadius: "6px",
            border: "1px solid var(--border-light)",
            marginBottom: "12px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <Info size={15} style={{ color: "var(--primary-navy)", flexShrink: 0 }} />
          <span>
            <strong>Voting Rules:</strong> You may <strong>undervote</strong> (leave positions blank or select fewer candidates). <strong>Overvoting is strictly prevented</strong>—deselect a candidate first if you wish to change choices.
          </span>
        </div>

        {/* Position Jump Chips */}
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {POSITIONS.map((pos) => {
            const posSelections = selectedCandidates[pos] || [];
            const isSelected = posSelections.length > 0;
            const maxAllowed = positionLimits[pos] || 1;
            const isFull = posSelections.length >= maxAllowed;

            // Highlight if matches search query
            const isMatchingSearch = matchingPositions.includes(pos);
            if (isSearchActive && !isMatchingSearch) return null;

            return (
              <button
                key={pos}
                type="button"
                onClick={() => {
                  const el = document.getElementById(`pos-section-${pos}`);
                  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "4px 9px",
                  borderRadius: "4px",
                  fontSize: "11px",
                  fontWeight: 600,
                  border: `1px solid ${
                    isFull
                      ? "var(--color-success-border)"
                      : isSelected
                      ? "var(--color-warning-border)"
                      : "var(--border-light)"
                  }`,
                  background: isFull
                    ? "var(--color-success-bg)"
                    : isSelected
                    ? "var(--color-warning-bg)"
                    : "var(--bg-subtle)",
                  color: isFull
                    ? "var(--color-success)"
                    : isSelected
                    ? "var(--color-warning)"
                    : "var(--text-muted)",
                  cursor: "pointer",
                }}
              >
                {isFull ? (
                  <CheckCircle2 size={11} />
                ) : isSelected ? (
                  <Circle size={11} style={{ fill: "currentColor" }} />
                ) : (
                  <Circle size={11} />
                )}
                <span>
                  {pos} ({posSelections.length}/{maxAllowed})
                </span>
              </button>
            );
          })}
        </div>

        {/* Status Indicators */}
        <div style={{ marginTop: "10px" }}>
          {blankPositions.length > 0 ? (
            <p style={{ margin: 0, fontSize: "11.5px", color: "var(--text-muted)" }}>
              {blankPositions.length} position(s) currently unselected (undervoted). You can proceed to review at any time.
            </p>
          ) : (
            <p style={{ margin: 0, fontSize: "11.5px", color: "var(--color-success)", fontWeight: 600 }}>
              ✓ All positions have candidate selections. Ready to review!
            </p>
          )}
        </div>
      </div>

      {error && (
        <div
          style={{
            color: "var(--color-danger)",
            background: "var(--color-danger-bg)",
            border: "1px solid var(--color-danger-border)",
            padding: "10px 14px",
            borderRadius: "6px",
            fontSize: "12px",
            marginBottom: "16px",
            fontWeight: 500,
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <AlertTriangle size={14} />
          <span>{error}</span>
        </div>
      )}

      {/* -----------------------------------------------------------------------
          Candidate Position Blocks
          ----------------------------------------------------------------------- */}
      {POSITIONS.map((position) => {
        const posCandidates = grouped[position] || [];
        if (isSearchActive && !posCandidates.length) return null;

        const posSelections = selectedCandidates[position] || [];
        const isCollapsed = isSearchActive ? false : collapsedPositions[position];
        const maxAllowed = positionLimits[position] || 1;
        const isLimitReached = posSelections.length >= maxAllowed;
        const isBlank = posSelections.length === 0;

        return (
          <div key={position} id={`pos-section-${position}`} style={{ marginBottom: "18px" }}>
            {/* Position Header Banner */}
            <div
              onClick={() => {
                if (!isSearchActive) {
                  setCollapsedPositions((prev) => ({ ...prev, [position]: !prev[position] }));
                }
              }}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 14px",
                background: "var(--bg-card)",
                borderRadius: "6px",
                border: "1px solid var(--border-light)",
                cursor: isSearchActive ? "default" : "pointer",
                userSelect: "none",
                marginBottom: isCollapsed ? "0" : "12px",
                transition: "all 0.15s ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <span
                  style={{
                    padding: "3px 8px",
                    background: "var(--primary-navy)",
                    color: "#FFFFFF",
                    borderRadius: "4px",
                    fontSize: "11.5px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  {position}
                </span>

                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "var(--text-muted)",
                    background: "var(--bg-subtle)",
                    padding: "2px 7px",
                    borderRadius: "4px",
                    border: "1px solid var(--border-light)",
                  }}
                >
                  Limit: {maxAllowed}
                </span>

                {/* Status Badge */}
                {isLimitReached ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      color: "var(--color-success)",
                      fontSize: "12px",
                      fontWeight: 600,
                    }}
                  >
                    <CheckCircle2 size={13} />
                    <span>Selected ({posSelections.length}/{maxAllowed})</span>
                  </div>
                ) : !isBlank ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      color: "var(--color-warning)",
                      fontSize: "12px",
                      fontWeight: 600,
                    }}
                  >
                    <AlertTriangle size={13} />
                    <span>Undervoted ({posSelections.length}/{maxAllowed})</span>
                  </div>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      color: "var(--text-light)",
                      fontSize: "12px",
                      fontWeight: 500,
                    }}
                  >
                    <Circle size={13} />
                    <span>No Selection (Blank)</span>
                  </div>
                )}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {/* Quick Deselect / Reset button for this position */}
                {posSelections.length > 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClearPosition(position);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "11px",
                      color: "var(--text-muted)",
                      display: "flex",
                      alignItems: "center",
                      gap: "3px",
                      padding: "2px 6px",
                      borderRadius: "3px",
                    }}
                    title={`Clear selections for ${position}`}
                  >
                    <RotateCcw size={11} />
                    <span>Clear</span>
                  </button>
                )}

                {!isSearchActive && (
                  <ChevronDown
                    size={15}
                    style={{
                      transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)",
                      transition: "transform 0.15s ease",
                      color: "var(--text-light)",
                    }}
                  />
                )}
              </div>
            </div>

            {/* Overvote Inline Warning Banner */}
            {overvoteNotice?.position === position && (
              <div className="overvote-warning-toast" role="alert">
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <AlertTriangle size={15} style={{ flexShrink: 0 }} />
                  <span>{overvoteNotice.message}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setOvervoteNotice(null)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "inherit",
                    padding: "2px",
                    display: "flex",
                  }}
                  aria-label="Dismiss warning"
                >
                  <XCircle size={14} />
                </button>
              </div>
            )}

            {/* Bigger Candidate Cards Grid */}
            {!isCollapsed && (
              <div
                className="candidate-grid"
                style={{
                  gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                  gap: "14px",
                }}
              >
                {posCandidates.map((c) => {
                  const avatar =
                    base64ToImageUrl(c.image_url) ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      c.name
                    )}&background=059669&color=ffffff&size=250`;
                  const isSelected = posSelections.includes(c.id);
                  const isSelectionDisabled = isLimitReached && !isSelected;

                  return (
                    <div
                      key={c.id}
                      onClick={() => handleToggleCandidate(position, c.id)}
                      className="candidate-card-box"
                      style={{
                        padding: "16px 18px",
                        opacity: isTimerExpired ? 0.6 : isSelectionDisabled ? 0.65 : 1,
                        cursor: isTimerExpired
                          ? "not-allowed"
                          : isSelectionDisabled
                          ? "not-allowed"
                          : "pointer",
                        border: isSelected
                          ? "2px solid var(--primary-navy)"
                          : "1px solid var(--border-light)",
                        background: isSelected ? "var(--color-success-bg)" : "var(--bg-card)",
                        position: "relative",
                        transition: "all 0.18s ease",
                        boxShadow: isSelected ? "0 4px 12px rgba(5, 150, 105, 0.15)" : "var(--shadow-xs)",
                      }}
                    >
                      {/* Selection Badge / Indicator */}
                      {isSelected ? (
                        <div
                          style={{
                            position: "absolute",
                            top: "10px",
                            right: "10px",
                            padding: "3px 10px",
                            borderRadius: "99px",
                            background: "var(--primary-navy)",
                            color: "#FFFFFF",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            fontSize: "11px",
                            fontWeight: 700,
                          }}
                        >
                          <Check size={12} />
                          <span>Selected</span>
                        </div>
                      ) : isSelectionDisabled ? (
                        <div
                          style={{
                            position: "absolute",
                            top: "10px",
                            right: "10px",
                            padding: "3px 8px",
                            borderRadius: "4px",
                            background: "var(--bg-subtle)",
                            color: "var(--text-light)",
                            fontSize: "10.5px",
                            fontWeight: 600,
                            border: "1px solid var(--border-light)",
                          }}
                        >
                          Limit Reached
                        </div>
                      ) : null}

                      {/* Bigger Candidate Avatar (64x64) & Bio Info */}
                      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                        <img
                          src={avatar}
                          alt={c.name}
                          style={{
                            width: "64px",
                            height: "64px",
                            borderRadius: "50%",
                            objectFit: "cover",
                            border: "2px solid var(--border-subtle)",
                            flexShrink: 0,
                            boxShadow: "0 2px 6px rgba(0, 0, 0, 0.08)",
                          }}
                          onError={(e) => {
                            e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                              c.name
                            )}&background=059669&color=ffffff&size=250`;
                          }}
                        />

                        <div style={{ minWidth: 0, flex: 1, paddingRight: isSelected ? "75px" : "0" }}>
                          <h4
                            style={{
                              fontSize: "15px",
                              margin: "0 0 3px 0",
                              color: "var(--text-main)",
                              fontWeight: 700,
                              lineHeight: 1.25,
                            }}
                          >
                            {c.name}
                          </h4>
                          <div style={{ display: "flex", gap: "5px", flexWrap: "wrap", alignItems: "center" }}>
                            {c.section && (
                              <span
                                style={{
                                  fontSize: "11px",
                                  background: "var(--color-success-bg)",
                                  color: "var(--color-success)",
                                  padding: "2px 6px",
                                  borderRadius: "4px",
                                  fontWeight: 600,
                                  border: "1px solid var(--color-success-border)",
                                }}
                              >
                                {c.section}
                              </span>
                            )}
                            {c.age && (
                              <span
                                style={{
                                  fontSize: "11px",
                                  background: "var(--bg-subtle)",
                                  color: "var(--text-muted)",
                                  padding: "2px 6px",
                                  borderRadius: "4px",
                                  fontWeight: 500,
                                  border: "1px solid var(--border-light)",
                                }}
                              >
                                Age {c.age}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Campaign Platform Accordion Preview */}
                      {c.campaign_text && (
                        <div
                          style={{
                            borderTop: "1px solid var(--border-light)",
                            paddingTop: "8px",
                            marginTop: "8px",
                          }}
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedCampaign(expandedCampaign === c.id ? null : c.id);
                            }}
                            style={{
                              background: "none",
                              border: "none",
                              color: "var(--primary-navy)",
                              fontSize: "11.5px",
                              fontWeight: 600,
                              cursor: "pointer",
                              padding: 0,
                              display: "flex",
                              alignItems: "center",
                              gap: "3px",
                            }}
                          >
                            <span>{expandedCampaign === c.id ? "Hide Platform" : "View Platform"}</span>
                            {expandedCampaign === c.id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                          </button>

                          {expandedCampaign === c.id && (
                            <div
                              style={{
                                fontSize: "12px",
                                color: "var(--text-muted)",
                                marginTop: "6px",
                                lineHeight: 1.4,
                                background: "var(--bg-subtle)",
                                padding: "8px 10px",
                                borderRadius: "4px",
                                border: "1px solid var(--border-light)",
                                fontStyle: "italic",
                                whiteSpace: "pre-wrap",
                              }}
                            >
                              "{c.campaign_text}"
                            </div>
                          )}
                        </div>
                      )}

                      {/* Action Bar: "View Full Profile" & Selection Hint */}
                      <div
                        style={{
                          marginTop: "8px",
                          paddingTop: "8px",
                          borderTop: "1px solid var(--border-light)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        {onViewCandidate && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onViewCandidate(c.id);
                            }}
                            style={{
                              background: "var(--bg-subtle)",
                              border: "1px solid var(--border-subtle)",
                              borderRadius: "4px",
                              padding: "3px 8px",
                              fontSize: "11px",
                              fontWeight: 600,
                              color: "var(--text-main)",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <Eye size={12} style={{ color: "var(--primary-navy)" }} />
                            <span>View Full Profile</span>
                          </button>
                        )}

                        <div
                          style={{
                            fontSize: "11px",
                            color: isSelected ? "var(--primary-navy)" : "var(--text-light)",
                            fontWeight: 600,
                          }}
                        >
                          {isSelected
                            ? "Click to Deselect"
                            : isSelectionDisabled
                            ? "Limit Reached"
                            : "Click to Select"}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* -----------------------------------------------------------------------
          Main Ballot Review & Submission Trigger Bar
          Intercepts submission to launch Modal 1 (Summary Confirmation)
          ----------------------------------------------------------------------- */}
      <div
        style={{
          marginTop: "24px",
          marginBottom: "32px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <button
          className="btn-primary full-width-mobile"
          onClick={handleInitiateReview}
          disabled={loading || isTimerExpired}
          style={{
            padding: "0 32px",
            height: "42px",
            fontSize: "14px",
            fontWeight: 700,
            borderRadius: "6px",
            minWidth: "280px",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            boxShadow: "0 2px 8px rgba(5, 150, 105, 0.25)",
          }}
        >
          {isTimerExpired ? (
            <>
              <Lock size={16} />
              <span>Deadline Closed</span>
            </>
          ) : (
            <>
              <Send size={16} />
              <span>
                {t.reviewConfirmBtn || "Review & Submit Ballot"}
                {totalVotesCast > 0 ? ` (${totalVotesCast} Selected)` : " (Blank Ballot)"}
              </span>
            </>
          )}
        </button>

        <p style={{ margin: 0, fontSize: "11.5px", color: "var(--text-light)", textAlign: "center" }}>
          Submission requires two-stage confirmation before permanently recording your vote.
        </p>
      </div>

      {/* -----------------------------------------------------------------------
          Stage 1 Confirmation Pop-Up: Vote Summary Modal
          ----------------------------------------------------------------------- */}
      <VoteSummaryModal
        isOpen={confirmationStep === "summary"}
        onEditSelections={handleEditSelections}
        onConfirmAndProceed={handleProceedToLockIn}
        positions={POSITIONS}
        positionLimits={positionLimits}
        selectedCandidates={selectedCandidates}
        candidates={candidates}
        voterName={currentUser.name}
        voterGrade={currentUser.grade}
        voterId={currentUser.id}
      />

      {/* -----------------------------------------------------------------------
          Stage 2 Confirmation Pop-Up: Final Lock-In Modal
          ----------------------------------------------------------------------- */}
      <VoteLockInModal
        isOpen={confirmationStep === "lock_in"}
        onGoBack={handleGoBackToSummary}
        onFinalSubmit={handleFinalSubmit}
        isSubmitting={isSubmitting}
        submissionError={submissionError}
        voterName={currentUser.name}
        voterId={currentUser.id}
        totalVotesCount={totalVotesCast}
        undervotedPositionsCount={undervotedPositions.length}
        totalPositions={totalPositions}
      />
    </div>
  );
};

export default BallotPage;
