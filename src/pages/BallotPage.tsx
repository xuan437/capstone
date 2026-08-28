import React, { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { Student, Candidate, Page, POSITIONS } from "../types";
import { base64ToImageUrl } from "../utils/imageUtils";
import { CountdownTimer } from "../components/CountdownTimer";
import { generateReceiptCode, saveVoteReceipt } from "../utils/receiptVerifier";
import { logAuditAction } from "../utils/auditLogger";
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
      if (currentUser.has_voted) {
        setPage("confirm");
        return;
      }

      const { data: studentData } = await supabase
        .from("students")
        .select("has_voted")
        .eq("id", currentUser.id)
        .single();

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
        setError("Error fetching candidates: " + fetchError.message);
        setCandidates([]);
      } else {
        setCandidates((data || []) as Candidate[]);
      }

      setLoading(false);
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

    // --- Capture voted_at timestamp immediately ---
    const votedAt = new Date().toISOString();

    // --- Location capture: High-Accuracy GPS first, IP-based fallback if denied/HTTP ---
    let locationText = "Location unavailable";
    try {
      // Primary: Request high accuracy GPS coords
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error("Geolocation not supported by browser"));
          return;
        }
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 5000,           // 5 second timeout for GPS lock
          enableHighAccuracy: true, // Forces GPS/Wi-Fi positioning instead of IP
          maximumAge: 0,           // Force fresh coords
        });
      });
      const { latitude, longitude, accuracy } = position.coords;
      locationText = `${latitude.toFixed(6)}, ${longitude.toFixed(6)} (±${Math.round(accuracy)}m)`;
    } catch (gpsError) {
      // Fallback: If GPS fails (denied, HTTP, timeout), use IP-based Geolocation
      try {
        const ipRes = await fetch("https://ipapi.co/json/", { signal: AbortSignal.timeout(4000) });
        if (ipRes.ok) {
          const ipData = await ipRes.json();
          const city    = ipData.city    || "";
          const region  = ipData.region  || "";
          const country = ipData.country_name || ipData.country || "";
          const ip      = ipData.ip      || "";
          if (city || region || country) {
            locationText = [city, region, country].filter(Boolean).join(", ");
            if (ip) locationText += ` (IP: ${ip})`;
          }
        }
      } catch (ipError) {
        locationText = "Location unavailable";
      }
    }


    try {
      // Direct database cutoff validation check
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

      // ── Insert votes: try with time/location, fall back to base columns ──
      const voteInsertsWithMeta = POSITIONS.map((position) => ({
        student_id: currentUser.id,
        candidate_id: selectedCandidates[position]!,
        position,
        voted_at: votedAt,
        location: locationText,
      }));

      const { error: voteError } = await supabase.from("votes").insert(voteInsertsWithMeta);

      if (voteError) {
        // Columns may not exist yet — retry without new fields
        const voteInsertsBase = POSITIONS.map((position) => ({
          student_id: currentUser.id,
          candidate_id: selectedCandidates[position]!,
          position,
        }));
        const { error: voteErrorBase } = await supabase.from("votes").insert(voteInsertsBase);
        if (voteErrorBase) throw voteErrorBase;
      }

      // ── Mark student as voted: try with metadata, fall back to base ──
      const { error: studentUpdateError } = await supabase
        .from("students")
        .update({ has_voted: true, voted_at: votedAt, vote_location: locationText })
        .eq("id", currentUser.id);

      if (studentUpdateError) {
        // Columns may not exist yet — retry without new fields
        await supabase
          .from("students")
          .update({ has_voted: true })
          .eq("id", currentUser.id);
      }

      // ── Insert cryptographic receipt ──
      const receiptId = generateReceiptCode(currentUser.id, votedAt);
      await saveVoteReceipt(currentUser.id, receiptId, POSITIONS.length);
      await logAuditAction("VOTE_SUBMITTED", currentUser.name, `Cast ballot for ${POSITIONS.length} positions. Receipt: ${receiptId}`);

      const { error: receiptError } = await supabase.from("receipts").insert([
        {
          student_id: currentUser.id,
          receipt_id: receiptId,
          receipt_data: JSON.stringify({ receipt_code: receiptId, positions_voted: POSITIONS.length, voted_at: votedAt }),
          timestamp: votedAt,
          student_name: currentUser.name,
          grade: currentUser.grade,
          voted_at: votedAt,
          location: locationText,
        },
      ]);

      if (receiptError) {
        // Fallback retry
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

  if (loading) return <div className="screen-content flex-center">Loading ballot...</div>;

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
            borderRadius: "12px",
            padding: "16px 24px",
            color: "var(--color-danger)",
            display: "flex",
            gap: "12px",
            alignItems: "center",
            marginBottom: "24px",
            boxShadow: "var(--shadow-xs)"
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: "28px", color: "var(--color-danger)" }}>
            gavel
          </span>
          <div>
            <h4 style={{ margin: 0, fontWeight: 700, fontSize: "15px", color: "var(--color-danger)" }}>ELECTION HAS OFFICIALLY ENDED</h4>
            <p style={{ margin: "2px 0 0 0", fontSize: "13px", color: "var(--color-danger)" }}>
              The cutoff deadline has been reached. Ballot submissions and candidate selections are now locked.
            </p>
          </div>
        </div>
      )}

      {/* Header Banner & Student Welcome */}
      <div className="ballot-header-banner">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
            <h1 style={{ margin: 0, fontSize: "24px", color: "var(--text-main)", fontWeight: 800 }}>
              Official Electronic Ballot
            </h1>
            <span
              style={{
                fontSize: "11px",
                background: "var(--color-success-bg)",
                color: "var(--color-success)",
                padding: "3px 10px",
                borderRadius: "99px",
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                border: "1px solid var(--color-success-border)",
              }}
            >
              ● Verified Voter
            </span>
          </div>
          <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "14px" }}>
            Welcome, <strong>{currentUser.name}</strong> ({currentUser.grade}). Please select{" "}
            <strong>one official candidate per position</strong> before final submission.
          </p>
        </div>

        <div className="dashboard-logos" style={{ display: "flex", gap: "12px" }}>
          <img src="/image.png" alt="School Logo" className="dashboard-logo-img" />
          <img src="/image copy.png" alt="System Logo" className="dashboard-logo-img" />
        </div>
      </div>

      {/* Voting Progress & Quick-Jump Chips */}
      <div className="ballot-progress-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span className="material-symbols-outlined" style={{ fontSize: "22px", color: "var(--primary-navy)" }}>
              how_to_vote
            </span>
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "var(--text-main)" }}>Voting Progress</h3>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "13px", fontWeight: 800, color: "var(--primary-navy)" }}>
              {Math.round((selectedCount / totalPositions) * 100)}% Completed
            </span>
            <span className={`badge-${allSelected ? "accent-teal" : "light-blue"}`} style={{ borderRadius: "8px", padding: "4px 12px", fontWeight: 700 }}>
              {selectedCount}/{totalPositions} Selected
            </span>
          </div>
        </div>

        {/* Animated Progress Bar */}
        <div style={{ background: "var(--bg-surface)", borderRadius: "99px", height: "10px", marginBottom: "18px", overflow: "hidden", border: "1px solid var(--border-light)" }}>
          <div
            style={{
              background: allSelected
                ? "linear-gradient(90deg, #10B981 0%, #059669 100%)"
                : "linear-gradient(90deg, var(--primary-navy) 0%, #38BDF8 100%)",
              height: "100%",
              width: `${(selectedCount / totalPositions) * 100}%`,
              borderRadius: "99px",
              transition: "width 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          />
        </div>

        {/* Quick Jump Position Chips */}
        <div className="position-tabs-scroll">
          {POSITIONS.map((pos) => {
            const isSelected = !!selectedCandidates[pos];
            return (
              <div
                key={pos}
                className={`position-chip-item ${isSelected ? "selected" : ""}`}
                onClick={() => {
                  const el = document.getElementById(`pos-section-${pos}`);
                  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
                  {isSelected ? "check_circle" : "radio_button_unchecked"}
                </span>
                <span>{pos}</span>
              </div>
            );
          })}
        </div>

        {!allSelected && (
          <p style={{ marginTop: "14px", marginBottom: 0, fontSize: "12.5px", color: "var(--color-danger)", fontWeight: 600 }}>
            ⚠️ Remaining position(s) required: {incompletePositions.join(", ")}
          </p>
        )}
        {allSelected && (
          <p style={{ marginTop: "14px", marginBottom: 0, fontSize: "12.5px", color: "var(--color-success)", fontWeight: 600 }}>
            ✓ All positions selected! Click below to submit your official ballot.
          </p>
        )}
      </div>

      {error && (
        <div style={{ color: "var(--color-danger)", background: "var(--color-danger-bg)", border: "1px solid var(--color-danger-border)", padding: "14px 18px", borderRadius: "12px", fontSize: "13px", marginBottom: "24px", fontWeight: 600, display: "flex", alignItems: "center", gap: "10px" }}>
          <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>error</span>
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
          <div key={position} id={`pos-section-${position}`} style={{ marginBottom: "28px" }}>
            <div
              onClick={() => setCollapsedPositions((prev) => ({ ...prev, [position]: !prev[position] }))}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "16px 22px",
                background: "var(--bg-card)",
                borderRadius: "16px",
                border: "1px solid var(--border-light)",
                cursor: "pointer",
                userSelect: "none",
                marginBottom: isCollapsed ? "0" : "20px",
                boxShadow: "var(--shadow-xs)",
                transition: "all 0.2s ease",
              }}
              className="hover-lift"
            >
              <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
                <div style={{ padding: "6px 14px", background: "var(--primary-navy)", color: "var(--text-white)", borderRadius: "8px", fontSize: "13px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {position}
                </div>
                {selectedCandidate ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--color-success)", fontSize: "13.5px", fontWeight: 700 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>check_circle</span>
                    Selected: {selectedCandidate.name}
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--color-danger)", fontSize: "13.5px", fontWeight: 700 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>radio_button_unchecked</span>
                    Selection Required
                  </div>
                )}
              </div>
              <span
                className="material-symbols-outlined"
                style={{
                  transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)",
                  transition: "transform 0.2s ease",
                  color: "var(--text-muted)",
                }}
              >
                expand_more
              </span>
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
                      className={`candidate-card-modern ${isSelected ? "selected" : ""}`}
                      style={{
                        opacity: isTimerExpired ? 0.6 : 1,
                        cursor: isTimerExpired ? "not-allowed" : "pointer",
                      }}
                    >
                      {/* Floating Selection Checkmark Badge */}
                      {isSelected && (
                        <div className="selected-badge-floating">
                          <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>check</span>
                        </div>
                      )}

                      <div style={{ display: "flex", justifyContent: "center", marginBottom: "12px" }}>
                        <img
                          src={avatar}
                          alt={c.name}
                          style={{
                            width: "88px",
                            height: "88px",
                            borderRadius: "50%",
                            objectFit: "cover",
                            border: isSelected ? "3px solid var(--primary-navy)" : "3px solid var(--bg-surface)",
                            boxShadow: "var(--shadow-sm)",
                            transition: "border 0.2s ease",
                          }}
                          onError={(e) => {
                            e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}&background=E8F0FE&color=0A192F`;
                          }}
                        />
                      </div>

                      <div style={{ textAlign: "center", marginBottom: "12px", width: "100%" }}>
                        <h3 style={{ fontSize: "17px", margin: "0 0 6px 0", color: "var(--primary-navy)", fontWeight: 800 }}>{c.name}</h3>
                        <div style={{ display: "flex", gap: "6px", justifyContent: "center", flexWrap: "wrap" }}>
                          {c.age && (
                            <span style={{ fontSize: "11px", background: "var(--accent-blue)", color: "var(--primary-navy)", padding: "2px 8px", borderRadius: "4px", fontWeight: 700 }}>
                              Age: {c.age}
                            </span>
                          )}
                          {c.section && (
                            <span style={{ fontSize: "11px", background: "var(--color-success-bg)", color: "var(--color-success)", padding: "2px 8px", borderRadius: "4px", fontWeight: 700 }}>
                              Section: {c.section}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Campaign Platform Expandable Drawer */}
                      {c.campaign_text && (
                        <div style={{ borderTop: "1px solid var(--border-light)", paddingTop: "12px", marginTop: "auto", width: "100%" }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedCampaign(expandedCampaign === c.id ? null : c.id);
                            }}
                            style={{
                              background: "none",
                              border: "none",
                              color: "var(--primary-navy)",
                              fontSize: "12px",
                              fontWeight: 700,
                              cursor: "pointer",
                              padding: 0,
                              display: "flex",
                              alignItems: "center",
                              margin: "0 auto",
                              gap: "2px",
                            }}
                          >
                            <span>{expandedCampaign === c.id ? "Hide Platform" : "View Campaign Platform"}</span>
                            <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
                              {expandedCampaign === c.id ? "expand_less" : "expand_more"}
                            </span>
                          </button>

                          {expandedCampaign === c.id && (
                            <div style={{ fontSize: "12.5px", color: "var(--text-muted)", marginTop: "10px", lineHeight: 1.5, textAlign: "left", background: "var(--bg-surface)", padding: "10px 12px", borderRadius: "8px", border: "1px solid var(--border-light)", fontStyle: "italic", whiteSpace: "pre-wrap" }}>
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
      <div style={{ marginTop: "32px", marginBottom: "48px", display: "flex", justifyContent: "center" }}>
        <button
          className="btn-primary"
          onClick={handleSubmit}
          disabled={loading || isTimerExpired || !allSelected}
          style={{
            padding: "16px 36px",
            fontSize: "15px",
            fontWeight: 800,
            borderRadius: "99px",
            boxShadow: "var(--shadow-md)",
            minWidth: "280px",
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
            {allSelected ? "how_to_vote" : "lock"}
          </span>
          <span>
            {loading
              ? "Submitting Secure Ballot..."
              : isTimerExpired
              ? "Election Deadline Closed"
              : allSelected
              ? (t.reviewConfirmBtn || "Submit Official Ballot")
              : `Select All Positions (${selectedCount}/${totalPositions})`}
          </span>
        </button>
      </div>
    </div>
  );
};

export default BallotPage;
