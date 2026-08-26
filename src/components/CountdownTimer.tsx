import React, { useState, useEffect } from "react";
import { supabase } from "../supabase";

interface CountdownTimerProps {
  onExpire?: () => void;
  onTimerLoaded?: (endTime: string | null) => void;
  compact?: boolean;
}

interface CircularDialProps {
  value: number;
  max: number;
  label: string;
}

const CircularDial: React.FC<CircularDialProps> = ({ value, max, label }) => {
  const r = 38;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(1, Math.max(0, value / max));
  const dashoffset = circ * (1 - pct);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
      <div
        style={{
          position: "relative",
          width: "96px",
          height: "96px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg
          width="96"
          height="96"
          viewBox="0 0 100 100"
          style={{ transform: "rotate(-90deg)", overflow: "visible" }}
        >
          {/* Background Dotted Ring */}
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke="var(--border-light)"
            strokeWidth="3.5"
            strokeDasharray="4 4"
          />
          {/* Active System Navy Progress Ring */}
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke="var(--primary-navy)"
            strokeWidth="4"
            strokeDasharray={`${circ}`}
            strokeDashoffset={dashoffset}
            strokeLinecap="round"
            style={{
              transition: "stroke-dashoffset 0.5s ease",
              filter: "drop-shadow(0 2px 6px rgba(10, 25, 47, 0.25))",
            }}
          />
        </svg>

        {/* Center Monospace Readout */}
        <span
          style={{
            position: "absolute",
            fontSize: "24px",
            fontWeight: 800,
            fontFamily: "var(--font-mono)",
            color: "var(--primary-navy)",
            letterSpacing: "-0.02em",
          }}
        >
          {String(value).padStart(2, "0")}
        </span>
      </div>

      {/* Unit Label */}
      <span
        style={{
          fontSize: "11px",
          fontWeight: 700,
          letterSpacing: "0.25em",
          color: "var(--text-muted)",
          textTransform: "uppercase",
          fontFamily: "var(--font-sans)",
        }}
      >
        {label}
      </span>
    </div>
  );
};

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  onExpire,
  onTimerLoaded,
  compact = false,
}) => {
  const [endTime, setEndTime] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    totalMs: number;
  } | null>(null);

  useEffect(() => {
    const fetchEndTime = async () => {
      try {
        const { data, error } = await supabase
          .from("election_settings")
          .select("end_time")
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error("Error fetching election countdown:", error);
          return;
        }

        if (data && data.end_time) {
          setEndTime(data.end_time);
          if (onTimerLoaded) onTimerLoaded(data.end_time);
        } else if (!data) {
          const defaultEndTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
          const { error: insertError } = await supabase
            .from("election_settings")
            .upsert({ id: 1, end_time: defaultEndTime });

          if (!insertError) {
            setEndTime(defaultEndTime);
            if (onTimerLoaded) onTimerLoaded(defaultEndTime);
          }
        } else {
          setEndTime(null);
          if (onTimerLoaded) onTimerLoaded(null);
        }
      } catch (err) {
        console.error("Unexpected fetch error in CountdownTimer:", err);
      }
    };

    fetchEndTime();

    const channel = supabase
      .channel("realtime-countdown-timer")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "election_settings",
        },
        (payload: any) => {
          const newEndTime = payload.new ? payload.new.end_time : null;
          setEndTime(newEndTime);
          if (onTimerLoaded) onTimerLoaded(newEndTime);
        }
      )
      .subscribe();

    const pollInterval = setInterval(fetchEndTime, 3000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [onTimerLoaded]);

  useEffect(() => {
    if (!endTime) {
      setTimeLeft(null);
      return;
    }

    const calculateTimeLeft = () => {
      const difference = +new Date(endTime) - +new Date();
      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0 });
        if (onExpire) onExpire();
        return;
      }

      setTimeLeft({
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
        totalMs: difference,
      });
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [endTime, onExpire]);

  if (!endTime || !timeLeft) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "12px", fontSize: "12px", color: "var(--text-muted)" }}>
        <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>schedule</span>
        <span>Loading Election Countdown...</span>
      </div>
    );
  }

  const isExpired = timeLeft.totalMs <= 0;

  if (compact) {
    if (isExpired) {
      return <span style={{ color: "var(--color-danger)", fontWeight: 700 }}>Voting Closed</span>;
    }
    return (
      <span style={{ fontFamily: "var(--font-sans)", fontWeight: 700, color: "var(--primary-navy)" }}>
        {timeLeft.days > 0 ? `${timeLeft.days}d ` : ""}
        {String(timeLeft.hours).padStart(2, "0")}:
        {String(timeLeft.minutes).padStart(2, "0")}:
        {String(timeLeft.seconds).padStart(2, "0")}
      </span>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "24px",
        padding: "28px 24px",
        background: isExpired ? "var(--color-danger-bg)" : "var(--bg-card)",
        border: `1px solid ${isExpired ? "var(--color-danger-border)" : "var(--border-light)"}`,
        borderRadius: "20px",
        boxShadow: "var(--shadow-sm)",
        width: "100%",
        maxWidth: "540px",
        boxSizing: "border-box",
        margin: "0 auto 24px auto",
        transition: "all 0.3s ease",
        textAlign: "center",
      }}
    >
      {/* Top System Title Header */}
      <div>
        <h3
          style={{
            margin: 0,
            fontSize: "15px",
            fontWeight: 800,
            letterSpacing: "0.4em",
            color: isExpired ? "var(--color-danger)" : "var(--primary-navy)",
            fontFamily: "var(--font-sans)",
            textTransform: "uppercase",
          }}
        >
          {isExpired ? "ELECTION CLOSED" : "C O U N T D O W N"}
        </h3>
      </div>

      {!isExpired && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "20px",
            flexWrap: "wrap",
            width: "100%",
          }}
        >
          <CircularDial value={timeLeft.days} max={30} label="DAYS" />
          <CircularDial value={timeLeft.hours} max={24} label="HOURS" />
          <CircularDial value={timeLeft.minutes} max={60} label="MINUTES" />
          <CircularDial value={timeLeft.seconds} max={60} label="SECONDS" />
        </div>
      )}
    </div>
  );
};