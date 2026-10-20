import React, { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { Page } from "../types";
import { logAuditAction } from "../utils/auditLogger";
import { clearElectionExpiryFlag } from "../utils/electionExpiry";
import { Clock, Trash2, AlertCircle, Calendar, RefreshCw, Zap } from "lucide-react";

const AdminElectionSettings: React.FC<{
  setPage: (p: Page) => void;
}> = ({ setPage: _setPage }) => {
  const [electionEndTime, setElectionEndTime] = useState<string | null>(null);
  const [timerInput, setTimerInput] = useState("");
  const [savingTimer, setSavingTimer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());

  // Ticking interval for live countdown
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchElectionSettings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("election_settings")
      .select("end_time")
      .eq("id", 1)
      .maybeSingle();

    if (!error && data) {
      setElectionEndTime(data.end_time);
      if (data.end_time) {
        // Convert ISO timestamp to local YYYY-MM-DDTHH:MM for datetime-local input
        const localDate = new Date(data.end_time);
        const tzOffset = localDate.getTimezoneOffset() * 60000;
        const localISOTime = new Date(localDate.getTime() - tzOffset)
          .toISOString()
          .slice(0, 16);
        setTimerInput(localISOTime);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchElectionSettings();
  }, []);

  const handleSaveTimer = async () => {
    if (!timerInput) return setError("Please select a valid date and time cutoff.");
    setSavingTimer(true);
    setError("");

    const utcDate = new Date(timerInput).toISOString();

    const { error: upsertError } = await supabase
      .from("election_settings")
      .upsert({ id: 1, end_time: utcDate });

    if (upsertError) {
      setError("Failed to save election timer: " + upsertError.message);
    } else {
      setElectionEndTime(utcDate);
      // Reset expiry flag so passwords are scrambled again at the new deadline
      clearElectionExpiryFlag();
      await logAuditAction("TIMER_UPDATED", "Admin", `Set election cutoff timer to ${new Date(utcDate).toLocaleString()}`);
      alert("Election countdown timer set successfully!");
    }
    setSavingTimer(false);
  };

  const handleClearTimer = async () => {
    if (!window.confirm("Are you sure you want to stop and clear the election countdown timer?")) return;
    setSavingTimer(true);
    setError("");

    const { error: clearError } = await supabase
      .from("election_settings")
      .upsert({ id: 1, end_time: null });

    if (clearError) {
      setError("Failed to clear election timer: " + clearError.message);
    } else {
      setElectionEndTime(null);
      setTimerInput("");
      alert("Election countdown timer cleared successfully.");
    }
    setSavingTimer(false);
  };

  // Quick preset helper
  const applyPreset = (hoursToAdd: number, specificHour?: number) => {
    const target = new Date();
    if (specificHour !== undefined) {
      target.setHours(specificHour, 0, 0, 0);
      if (target.getTime() <= Date.now()) {
        target.setDate(target.getDate() + 1); // Move to tomorrow if past hour today
      }
    } else {
      target.setTime(target.getTime() + hoursToAdd * 60 * 60 * 1000);
    }
    const tzOffset = target.getTimezoneOffset() * 60000;
    const localISOTime = new Date(target.getTime() - tzOffset)
      .toISOString()
      .slice(0, 16);
    setTimerInput(localISOTime);
    setError("");
  };

  // Calculate remaining time
  const getRemainingTime = () => {
    if (!electionEndTime) return null;
    const diff = new Date(electionEndTime).getTime() - now;
    if (diff <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true, totalMs: diff };
    }
    return {
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((diff / (1000 * 60)) % 60),
      seconds: Math.floor((diff / 1000) % 60),
      isExpired: false,
      totalMs: diff,
    };
  };

  const remaining = getRemainingTime();

  // Helper preview for selected input
  const getInputPreview = () => {
    if (!timerInput) return null;
    const target = new Date(timerInput).getTime();
    if (isNaN(target)) return null;
    const diff = target - now;
    if (diff <= 0) {
      return { text: "⚠️ Selected time is in the past. Setting this will lock voting immediately.", isWarning: true };
    }
    const d = Math.floor(diff / (1000 * 60 * 60 * 24));
    const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const m = Math.floor((diff / (1000 * 60)) % 60);
    const parts = [];
    if (d > 0) parts.push(`${d} day${d > 1 ? "s" : ""}`);
    if (h > 0) parts.push(`${h} hr${h > 1 ? "s" : ""}`);
    parts.push(`${m} min${m > 1 ? "s" : ""}`);
    return { text: `Target cutoff is in ${parts.join(", ")}`, isWarning: false };
  };

  const inputPreview = getInputPreview();

  if (loading) {
    return (
      <div style={{ padding: "48px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>
        <Clock size={16} className="spin" style={{ display: "block", margin: "0 auto 8px auto", color: "var(--accent-primary)" }} />
        Loading election configuration settings...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "680px", margin: "0 auto", padding: "16px 20px" }}>
      <div style={{ marginBottom: "16px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
            <div style={{
              width: "28px",
              height: "28px",
              borderRadius: "6px",
              backgroundColor: "rgba(99, 102, 241, 0.12)",
              border: "1px solid rgba(99, 102, 241, 0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--accent-primary)"
            }}>
              <Clock size={15} />
            </div>
            <h1 style={{ margin: 0, fontSize: "18px", fontWeight: 600, color: "var(--text-main)", letterSpacing: "-0.01em" }}>
              Election Deadline Controls
            </h1>
          </div>
          <p style={{ margin: 0, fontSize: "12px", color: "var(--text-muted)" }}>
            Configure the automated voting cutoff deadline. Students see a synchronized live countdown.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchElectionSettings}
          title="Refresh countdown from database"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            padding: "5px 10px",
            fontSize: "11.5px",
            borderRadius: "5px",
            border: "1px solid var(--border-subtle)",
            backgroundColor: "var(--bg-surface)",
            color: "var(--text-muted)",
            cursor: "pointer",
          }}
        >
          <RefreshCw size={12} />
          <span>Sync</span>
        </button>
      </div>

      <div
        style={{
          backgroundColor: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "10px",
          padding: "20px",
          boxShadow: "0 1px 3px 0 rgba(0,0,0,0.1)",
        }}
      >
        {error && (
          <div style={{
            backgroundColor: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.2)",
            color: "#EF4444",
            padding: "8px 12px",
            borderRadius: "6px",
            fontSize: "12px",
            marginBottom: "14px",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}>
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          {/* Active Live Countdown Display */}
          {electionEndTime && remaining ? (
            <div
              style={{
                backgroundColor: remaining.isExpired
                  ? "rgba(239, 68, 68, 0.06)"
                  : "rgba(16, 185, 129, 0.05)",
                border: `1px solid ${
                  remaining.isExpired
                    ? "rgba(239, 68, 68, 0.22)"
                    : "rgba(16, 185, 129, 0.22)"
                }`,
                borderRadius: "8px",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "14px",
              }}
            >
              {/* Header Status Bar */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span
                    style={{
                      display: "inline-block",
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      backgroundColor: remaining.isExpired ? "#EF4444" : "#10B981",
                      boxShadow: remaining.isExpired
                        ? "0 0 8px rgba(239, 68, 68, 0.7)"
                        : "0 0 8px rgba(16, 185, 129, 0.8)",
                    }}
                  />
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: remaining.isExpired ? "#EF4444" : "#10B981",
                    }}
                  >
                    {remaining.isExpired
                      ? "Voting Closed • Cutoff Expired"
                      : "Active Cutoff Timer Enforced"}
                  </span>
                </div>

                <span style={{ fontSize: "11.5px", color: "var(--text-muted)" }}>
                  Deadline:{" "}
                  <strong style={{ color: "var(--text-main)", fontFamily: "monospace" }}>
                    {new Date(electionEndTime).toLocaleString("en-PH", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                      second: "2-digit",
                      hour12: true,
                    })}
                  </strong>
                </span>
              </div>

              {/* Countdown Digits Grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: "8px",
                  textAlign: "center",
                }}
              >
                {[
                  { label: "DAYS", value: remaining.days },
                  { label: "HOURS", value: remaining.hours },
                  { label: "MINUTES", value: remaining.minutes },
                  { label: "SECONDS", value: remaining.seconds },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      backgroundColor: "var(--bg-main)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "6px",
                      padding: "10px 4px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--font-mono, monospace)",
                        fontSize: "24px",
                        fontWeight: 700,
                        color: remaining.isExpired ? "#EF4444" : "var(--accent-primary, #10B981)",
                        lineHeight: 1,
                        marginBottom: "4px",
                      }}
                    >
                      {String(item.value).padStart(2, "0")}
                    </span>
                    <span
                      style={{
                        fontSize: "9px",
                        fontWeight: 600,
                        letterSpacing: "0.1em",
                        color: "var(--text-muted)",
                        textTransform: "uppercase",
                      }}
                    >
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Subtext info */}
              <div style={{ fontSize: "11.5px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "6px" }}>
                <Clock size={12} style={{ color: remaining.isExpired ? "#EF4444" : "#10B981", flexShrink: 0 }} />
                <span>
                  {remaining.isExpired
                    ? "Voting is currently locked. To resume voting, extend the cutoff deadline below."
                    : "Live countdown is synchronized and ticking on the student login and ballot pages."}
                </span>
              </div>
            </div>
          ) : (
            <div
              style={{
                backgroundColor: "var(--bg-main)",
                border: "1px dashed var(--border-subtle)",
                borderRadius: "6px",
                padding: "12px 14px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <Calendar size={15} style={{ color: "var(--text-light)", flexShrink: 0 }} />
              <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 400 }}>
                No active election cutoff timer set. Voting remains open indefinitely until a deadline is saved.
              </span>
            </div>
          )}

          {/* Date & Time Input Field */}
          <div>
            <label style={{ display: "block", marginBottom: "6px", fontSize: "12px", fontWeight: 500, color: "var(--text-muted)" }}>
              Voting Cutoff Date & Time
            </label>
            <div style={{ position: "relative" }}>
              <input
                type="datetime-local"
                value={timerInput}
                onChange={(e) => {
                  setTimerInput(e.target.value);
                  setError("");
                }}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: "1px solid var(--border-subtle)",
                  backgroundColor: "var(--bg-main)",
                  color: "var(--text-main)",
                  fontSize: "13px",
                  fontFamily: "inherit"
                }}
              />
            </div>

            {inputPreview && (
              <div style={{
                marginTop: "6px",
                fontSize: "11.5px",
                color: inputPreview.isWarning ? "#EF4444" : "var(--accent-primary, #10B981)",
                display: "flex",
                alignItems: "center",
                gap: "5px"
              }}>
                <Zap size={11} />
                <span>{inputPreview.text}</span>
              </div>
            )}
          </div>

          {/* Quick Presets Row */}
          <div>
            <div style={{ fontSize: "11px", fontWeight: 500, color: "var(--text-muted)", marginBottom: "6px" }}>
              Quick Presets:
            </div>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {[
                { label: "+1 Hour", hours: 1 },
                { label: "+4 Hours", hours: 4 },
                { label: "+8 Hours", hours: 8 },
                { label: "Today 5:00 PM", hours: 0, specificHour: 17 },
                { label: "+24 Hours", hours: 24 },
                { label: "+3 Days", hours: 72 },
              ].map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => applyPreset(preset.hours, preset.specificHour)}
                  style={{
                    padding: "4px 9px",
                    fontSize: "11px",
                    borderRadius: "4px",
                    border: "1px solid var(--border-subtle)",
                    backgroundColor: "var(--bg-main)",
                    color: "var(--text-main)",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--accent-primary)";
                    e.currentTarget.style.color = "var(--accent-primary)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--border-subtle)";
                    e.currentTarget.style.color = "var(--text-main)";
                  }}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              className="btn-primary"
              onClick={handleSaveTimer}
              disabled={savingTimer}
              style={{ flex: 1, padding: "8px 14px", borderRadius: "6px", fontSize: "12.5px", fontWeight: 500, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
            >
              <Clock size={14} />
              {savingTimer ? "Saving..." : "Set Voting Cutoff"}
            </button>
            {electionEndTime && (
              <button
                className="btn-secondary"
                onClick={handleClearTimer}
                disabled={savingTimer}
                style={{ padding: "8px 14px", borderRadius: "6px", fontSize: "12.5px", color: "#EF4444", display: "flex", alignItems: "center", gap: "6px" }}
              >
                <Trash2 size={13} />
                Clear
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminElectionSettings;

