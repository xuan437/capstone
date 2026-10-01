import React, { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { Page } from "../types";
import { logAuditAction } from "../utils/auditLogger";
import { Clock, CheckCircle2, Trash2, AlertCircle, Calendar } from "lucide-react";

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

  if (loading) {
    return (
      <div style={{ padding: "48px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>
        <Clock size={16} className="spin" style={{ display: "block", margin: "0 auto 8px auto", color: "var(--accent-primary)" }} />
        Loading election configuration settings...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "640px", margin: "0 auto", padding: "16px 20px" }}>
      <div style={{ marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
          <div style={{
            width: "26px",
            height: "26px",
            borderRadius: "6px",
            backgroundColor: "rgba(99, 102, 241, 0.12)",
            border: "1px solid rgba(99, 102, 241, 0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--accent-primary)"
          }}>
            <Clock size={14} />
          </div>
          <h1 style={{ margin: 0, fontSize: "18px", fontWeight: 600, color: "var(--text-main)", letterSpacing: "-0.01em" }}>
            Election Deadline Controls
          </h1>
        </div>
        <p style={{ margin: 0, fontSize: "12px", color: "var(--text-muted)" }}>
          Set the automated voting cutoff deadline. Students will see a live countdown timer, and voting automatically locks upon expiration.
        </p>
      </div>

      <div
        style={{
          backgroundColor: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "8px",
          padding: "16px",
          boxShadow: "0 1px 2px 0 rgba(0,0,0,0.05)",
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

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
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
          </div>

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

          {electionEndTime ? (
            <div
              style={{
                backgroundColor: "rgba(16, 185, 129, 0.08)",
                border: "1px solid rgba(16, 185, 129, 0.2)",
                borderRadius: "6px",
                padding: "12px 14px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <CheckCircle2 size={16} style={{ color: "#10B981", flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: "10.5px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.03em", color: "#10B981" }}>
                  Active Cutoff Timer Enforced
                </div>
                <strong style={{ fontSize: "13px", color: "var(--text-main)", fontFamily: "monospace" }}>
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
                No active election cutoff timer set. Voting remains open indefinitely.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminElectionSettings;

