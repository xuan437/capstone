import React, { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { Page } from "../types";

const AdminElectionSettings: React.FC<{
  setPage: (p: Page) => void;
}> = ({ setPage: _setPage }) => {
  const [electionEndTime, setElectionEndTime] = useState<string | null>(null);
  const [timerInput, setTimerInput] = useState("");
  const [savingTimer, setSavingTimer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  if (loading) {
    return <div className="screen-content flex-center">Loading election settings...</div>;
  }

  return (
    <div className="screen-content content-max-width">
      <div style={{ maxWidth: "720px", margin: "0 auto", width: "100%" }}>
        <div style={{ marginBottom: "24px" }}>
          <span className="overline">System Configuration</span>
          <h1>Election Countdown Settings</h1>
          <p style={{ color: "var(--text-muted)" }}>
            Configure the automated voting cutoff deadline. Students will see a live countdown timer, and voting will automatically lock upon expiration.
          </p>
        </div>

        <div className="card-box">
          {error && (
            <div style={{ color: "var(--color-danger)", background: "var(--color-danger-bg)", border: "1px solid var(--color-danger-border)", padding: "12px 16px", borderRadius: "8px", fontSize: "13px", marginBottom: "24px", fontWeight: 600 }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <div>
              <label className="form-label" style={{ display: "block", marginBottom: "8px" }}>
                Voting Cutoff Date & Time *
              </label>
              <input
                type="datetime-local"
                value={timerInput}
                onChange={(e) => {
                  setTimerInput(e.target.value);
                  setError("");
                }}
                style={{ width: "100%", padding: "14px", fontSize: "15px" }}
              />
            </div>

            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <button
                className="btn-top-nav primary"
                onClick={handleSaveTimer}
                disabled={savingTimer}
                style={{ flex: 1, minWidth: "160px" }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>timer</span>
                {savingTimer ? "Saving..." : "Set Voting Deadline"}
              </button>
              {electionEndTime && (
                <button
                  className="btn-top-nav"
                  onClick={handleClearTimer}
                  disabled={savingTimer}
                >
                  Clear Timer
                </button>
              )}
            </div>

            {electionEndTime ? (
              <div
                style={{
                  background: "var(--color-success-bg)",
                  border: "1px solid var(--color-success-border)",
                  borderRadius: "12px",
                  padding: "16px 20px",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                }}
              >
                <span className="material-symbols-outlined" style={{ color: "var(--color-success)", fontSize: "24px" }}>
                  check_circle
                </span>
                <div>
                  <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-success)" }}>
                    Active Cutoff Deadline
                  </div>
                  <strong style={{ fontSize: "16px", color: "var(--primary-navy)" }}>
                    {new Date(electionEndTime).toLocaleString("en-PH", {
                      weekday: "short",
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                      hour12: true,
                    })}
                  </strong>
                </div>
              </div>
            ) : (
              <div
                style={{
                  background: "var(--bg-surface)",
                  border: "1px dashed var(--border-light)",
                  borderRadius: "12px",
                  padding: "16px 20px",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                }}
              >
                <span className="material-symbols-outlined" style={{ color: "var(--text-light)", fontSize: "24px" }}>
                  hourglass_disabled
                </span>
                <span style={{ fontSize: "14px", color: "var(--text-muted)", fontWeight: 500 }}>
                  No active election cutoff timer configured. Voting remains open indefinitely.
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminElectionSettings;
