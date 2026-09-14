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
} from "lucide-react";
import { supabase } from "../supabase";
import { Student, Candidate, Page, POSITIONS } from "../types";
import { base64ToImageUrl } from "../utils/imageUtils";
import { CountdownTimer } from "../components/CountdownTimer";
import { generateReceiptCode, saveVoteReceipt } from "../utils/receiptVerifier";
import { logAuditAction } from "../utils/auditLogger";
import { captureVoterLocation } from "../utils/locationCapture";
import { useLanguage } from "../context/LanguageContext";
import { seedSampleCandidatesIfEmpty } from "../utils/seedCandidates";

const BallotPage: React.FC<{
  setPage: (p: Page) => void;
  currentUser: Student;
}> = ({ setPage, currentUser }) => {
  const { t } = useLanguage();
  const [selectedCandidates, setSelectedCandidates] = useState<Record<string, string>>({});
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [expandedCampaign, setExpandedCampaign] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [isTimerExpired, setIsTimerExpired] = useState(false);
  const [collapsedPositions, setCollapsedPositions] = useState<Record<string, boolean>>({});

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
          setCandidates((data || []) as Candidate[]);
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

  const handleSubmit = async () => {
    if (isTimerExpired) {
      setError("The election deadline has passed. You can no longer submit your ballot.");
      return;
    }

    const missingPositions = POSITIONS.filter((pos) => !selectedCandidates[pos]);
    if (missingPositions.length > 0) {
      setError(`Please select one candidate for each position. Missing: ${missingPositions.join(", ")}`);
      return;
    }

    setLoading(true);
    setError("");

    const votedAt = new Date().toISOString();

    // Capture precise voter location (GPS + reverse geocoding + multi-service IP fallback)
    const locResult = await captureVoterLocation();
    const locationText = locResult.locationString;

    try {
      const { data: settings, error: settingsError } = await supabase
        .from("election_settings")
        .select("end_time")
        .eq("id", 1)
        .maybeSingle();

      if (!settingsError && settings?.end_time) {
        if (new Date() >= new Date(settings.end_time)) {
          setError("The election deadline has passed. You can no longer submit your ballot.");
          setIsTimerExpired(true);
          setLoading(false);
          return;
        }
      }
      const { data: existingVotes } = await supabase
        .from("votes")
        .select("id")
        .eq("student_id", currentUser.id)
        .limit(1);

      if (existingVotes && existingVotes.length > 0) {
        setError("You have already voted.");
        setLoading(false);
        return;
      }

      const voteInsertsWithMeta = POSITIONS.map((position) => ({
        student_id: currentUser.id,
        candidate_id: selectedCandidates[position]!,
        position,
        voted_at: votedAt,
        location: locationText,
      }));

      const { error: voteError } = await supabase.from("votes").insert(voteInsertsWithMeta);

      if (voteError) {
        const voteInsertsBase = POSITIONS.map((position) => ({
          student_id: currentUser.id,
          candidate_id: selectedCandidates[position]!,
          position,
        }));
        const { error: voteErrorBase } = await supabase.from("votes").insert(voteInsertsBase);
        if (voteErrorBase) throw voteErrorBase;
      }

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

      const receiptId = generateReceiptCode(currentUser.id, votedAt);
      await saveVoteReceipt(currentUser.id, receiptId, POSITIONS.length);
      await logAuditAction(
        "VOTE_SUBMITTED",
        currentUser.name,
        `Cast ballot for ${POSITIONS.length} positions. Receipt: ${receiptId}. Location: ${locationText}`
      );

      const { error: receiptError } = await supabase.from("receipts").insert([
        {
          student_id: currentUser.id,
          receipt_id: receiptId,
          receipt_data: JSON.stringify({ receipt_code: receiptId, positions_voted: POSITIONS.length, voted_at: votedAt, location: locationText }),
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
            receipt_data: JSON.stringify({ receipt_code: receiptId, positions_voted: POSITIONS.length }),
          },
        ]);
      }

      localStorage.setItem(
        "currentUser",
        JSON.stringify({ ...currentUser, has_voted: true })
      );

      setPage("confirm");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Please try again.";
      setError("Unexpected error: " + message);
    } finally {
      setLoading(false);
    }
  };

  const grouped = POSITIONS.reduce<Record<string, Candidate[]>>((acc, pos) => {
    acc[pos] = candidates.filter((c) => c.position === pos);
    return acc;
  }, {});

  const totalPositions = POSITIONS.length;
  const selectedCount = Object.keys(selectedCandidates).length;
  const allSelected = selectedCount === totalPositions;
  const incompletePositions = POSITIONS.filter((pos) => !selectedCandidates[pos]);

  if (loading) return <div className="screen-content flex-center" style={{ fontSize: "13px", color: "var(--text-muted)" }}>Loading electronic ballot...</div>;

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
            <h4 style={{ margin: 0, fontWeight: 600, fontSize: "13px", color: "var(--color-danger)" }}>ELECTION HAS OFFICIALLY ENDED</h4>
            <p style={{ margin: "2px 0 0 0", fontSize: "11.5px", color: "var(--color-danger)" }}>
              The cutoff deadline has been reached. Ballot submissions are locked.
            </p>
          </div>
        </div>
      )}

      {/* Header Banner & Student Welcome */}
      <div className="card-box" style={{ padding: "14px 16px", marginBottom: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <img
              src="/logo.png"
              alt="School Emblem"
              style={{ width: "36px", height: "36px", borderRadius: "50%", objectFit: "cover", border: "1px solid var(--border-light)", flexShrink: 0 }}
            />
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
                <h1 style={{ margin: 0, fontSize: "16px", color: "var(--text-main)", fontWeight: 600 }}>
                  Official Electronic Ballot
                </h1>
                <span
                  style={{
                    fontSize: "10.5px",
                    background: "var(--color-success-bg)",
                    color: "var(--color-success)",
                    padding: "1px 6px",
                    borderRadius: "99px",
                    fontWeight: 500,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "3px",
                    border: "1px solid var(--color-success-border)",
                  }}
                >
                  <ShieldCheck size={11} /> Verified Voter
                </span>
              </div>
              <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "12px" }}>
                Welcome, <strong>{currentUser.name}</strong> ({currentUser.grade}). Select <strong>one candidate per position</strong> before submission.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Voting Progress & Quick-Jump Chips */}
      <div className="card-box" style={{ padding: "14px 16px", marginBottom: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", flexWrap: "wrap", gap: "6px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Vote size={15} style={{ color: "var(--primary-navy)" }} />
            <h3 style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: "var(--text-main)" }}>Ballot Progress</h3>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "11.5px", fontWeight: 600, color: "var(--primary-navy)" }}>
              {Math.round((selectedCount / totalPositions) * 100)}%
            </span>
            <span style={{ fontSize: "11px", background: "var(--bg-subtle)", border: "1px solid var(--border-light)", padding: "2px 8px", borderRadius: "4px", fontWeight: 500, color: "var(--text-muted)" }}>
              {selectedCount}/{totalPositions} Selected
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div style={{ background: "var(--bg-subtle)", borderRadius: "99px", height: "6px", marginBottom: "12px", overflow: "hidden", border: "1px solid var(--border-light)" }}>
          <div
            style={{
              background: allSelected
                ? "var(--color-success)"
                : "var(--primary-navy)",
              height: "100%",
              width: `${(selectedCount / totalPositions) * 100}%`,
              borderRadius: "99px",
              transition: "width 0.3s ease",
            }}
          />
        </div>

        {/* Position Jump Chips */}
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {POSITIONS.map((pos) => {
            const isSelected = !!selectedCandidates[pos];
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
                  padding: "3px 8px",
                  borderRadius: "4px",
                  fontSize: "11px",
                  fontWeight: 500,
                  border: `1px solid ${isSelected ? "var(--color-success-border)" : "var(--border-light)"}`,
                  background: isSelected ? "var(--color-success-bg)" : "var(--bg-subtle)",
                  color: isSelected ? "var(--color-success)" : "var(--text-muted)",
                  cursor: "pointer",
                }}
              >
                {isSelected ? <CheckCircle2 size={11} /> : <Circle size={11} />}
                <span>{pos}</span>
              </button>
            );
          })}
        </div>

        {!allSelected && (
          <p style={{ marginTop: "8px", marginBottom: 0, fontSize: "11.5px", color: "var(--color-warning)", fontWeight: 500 }}>
            Remaining position(s): {incompletePositions.join(", ")}
          </p>
        )}
        {allSelected && (
          <p style={{ marginTop: "8px", marginBottom: 0, fontSize: "11.5px", color: "var(--color-success)", fontWeight: 500 }}>
            ✓ All positions selected! Ready for submission.
          </p>
        )}
      </div>

      {error && (
        <div style={{ color: "var(--color-danger)", background: "var(--color-danger-bg)", border: "1px solid var(--color-danger-border)", padding: "10px 14px", borderRadius: "6px", fontSize: "12px", marginBottom: "16px", fontWeight: 500, display: "flex", alignItems: "center", gap: "8px" }}>
          <AlertTriangle size={14} />
          <span>{error}</span>
        </div>
      )}

      {/* Candidate Position Blocks */}
      {POSITIONS.map((position) => {
        const posCandidates = grouped[position] || [];
        const selectedId = selectedCandidates[position];
        const isCollapsed = collapsedPositions[position];
        const selectedCandidate = posCandidates.find((c) => c.id === selectedId);

        return (
          <div key={position} id={`pos-section-${position}`} style={{ marginBottom: "16px" }}>
            <div
              onClick={() => setCollapsedPositions((prev) => ({ ...prev, [position]: !prev[position] }))}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "8px 12px",
                background: "var(--bg-card)",
                borderRadius: "6px",
                border: "1px solid var(--border-light)",
                cursor: "pointer",
                userSelect: "none",
                marginBottom: isCollapsed ? "0" : "10px",
                transition: "all 0.15s ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <span style={{ padding: "2px 6px", background: "var(--primary-navy)", color: "#FFFFFF", borderRadius: "4px", fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {position}
                </span>
                {selectedCandidate ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "var(--color-success)", fontSize: "12px", fontWeight: 500 }}>
                    <CheckCircle2 size={13} />
                    <span>Selected: {selectedCandidate.name}</span>
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "var(--color-danger)", fontSize: "12px", fontWeight: 500 }}>
                    <Circle size={13} />
                    <span>Selection Required</span>
                  </div>
                )}
              </div>
              <ChevronDown
                size={14}
                style={{
                  transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)",
                  transition: "transform 0.15s ease",
                  color: "var(--text-light)",
                }}
              />
            </div>

            {!isCollapsed && (
              <div className="candidate-grid">
                {posCandidates.map((c) => {
                  const avatar = base64ToImageUrl(c.image_url) || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}&background=E8F0FE&color=0A192F`;
                  const isSelected = selectedId === c.id;

                  return (
                    <div
                      key={c.id}
                      onClick={() => {
                        if (isTimerExpired) return;
                        setSelectedCandidates((prev) => ({ ...prev, [position]: c.id }));
                      }}
                      className="candidate-card-box"
                      style={{
                        opacity: isTimerExpired ? 0.6 : 1,
                        cursor: isTimerExpired ? "not-allowed" : "pointer",
                        border: isSelected ? "1px solid var(--primary-navy)" : "1px solid var(--border-light)",
                        background: isSelected ? "var(--accent-blue)" : "var(--bg-card)",
                        position: "relative",
                      }}
                    >
                      {/* Selection Badge Icon */}
                      {isSelected && (
                        <div style={{ position: "absolute", top: "8px", right: "8px", width: "20px", height: "20px", borderRadius: "50%", background: "var(--primary-navy)", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Check size={12} />
                        </div>
                      )}

                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <img
                          src={avatar}
                          alt={c.name}
                          style={{
                            width: "44px",
                            height: "44px",
                            borderRadius: "50%",
                            objectFit: "cover",
                            border: "1px solid var(--border-light)",
                            flexShrink: 0,
                          }}
                          onError={(e) => {
                            e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}&background=E8F0FE&color=0A192F`;
                          }}
                        />

                        <div style={{ minWidth: 0, flex: 1 }}>
                          <h4 style={{ fontSize: "13px", margin: "0 0 2px 0", color: "var(--text-main)", fontWeight: 600, lineHeight: 1.2 }}>{c.name}</h4>
                          <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                            {c.age && (
                              <span style={{ fontSize: "10px", background: "var(--bg-subtle)", color: "var(--text-muted)", padding: "1px 4px", borderRadius: "3px" }}>
                                Age {c.age}
                              </span>
                            )}
                            {c.section && (
                              <span style={{ fontSize: "10px", background: "var(--color-success-bg)", color: "var(--color-success)", padding: "1px 4px", borderRadius: "3px" }}>
                                {c.section}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {c.campaign_text && (
                        <div style={{ borderTop: "1px solid var(--border-light)", paddingTop: "6px", marginTop: "4px" }}>
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
                              fontSize: "11px",
                              fontWeight: 500,
                              cursor: "pointer",
                              padding: 0,
                              display: "flex",
                              alignItems: "center",
                              gap: "2px",
                            }}
                          >
                            <span>{expandedCampaign === c.id ? "Hide Platform" : "View Platform"}</span>
                            {expandedCampaign === c.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                          </button>

                          {expandedCampaign === c.id && (
                            <div style={{ fontSize: "11.5px", color: "var(--text-muted)", marginTop: "6px", lineHeight: 1.35, background: "var(--bg-subtle)", padding: "6px 8px", borderRadius: "4px", border: "1px solid var(--border-light)", fontStyle: "italic", whiteSpace: "pre-wrap" }}>
                              "{c.campaign_text}"
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Main Ballot Action Submission Bar */}
      <div style={{ marginTop: "24px", marginBottom: "32px", display: "flex", justifyContent: "center" }}>
        <button
          className="btn-primary full-width-mobile"
          onClick={handleSubmit}
          disabled={loading || isTimerExpired || !allSelected}
          style={{
            padding: "0 24px",
            height: "38px",
            fontSize: "13px",
            fontWeight: 500,
            borderRadius: "6px",
            minWidth: "220px",
          }}
        >
          {allSelected ? <Send size={14} /> : <Lock size={14} />}
          <span>
            {loading
              ? "Submitting..."
              : isTimerExpired
              ? "Deadline Closed"
              : allSelected
              ? (t.reviewConfirmBtn || "Submit Ballot")
              : `Select All Positions (${selectedCount}/${totalPositions})`}
          </span>
        </button>
      </div>
    </div>
  );
};

export default BallotPage;
