import React, { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { Student, Page } from "../types";
import { base64ToImageUrl } from "../utils/imageUtils";
import BubbleLoader from "../components/BubbleLoader";

const StudentProfile: React.FC<{
  setPage: (p: Page) => void;
  studentId: string;
}> = ({ setPage, studentId }) => {
  const [student, setStudent] = useState<Student | null>(null);
  const [votes, setVotes] = useState<
    { id: string; candidate: { name: string; position: string }; voted_at?: string; location?: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isResetting, setIsResetting] = useState(false);

  // Resolved vote metadata: prefer student record, fall back to first vote row
  const [resolvedVotedAt, setResolvedVotedAt] = useState<string | null>(null);
  const [resolvedLocation, setResolvedLocation] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const fetchStudentProfile = async () => {
    setLoading(true);
    setError("");

    // ── 1. Fetch student record ──
    const { data: stuData, error: stuError } = await supabase
      .from("students")
      .select("*")
      .eq("id", studentId)
      .single();

    if (stuError || !stuData) {
      setError("Student profile not found.");
      setLoading(false);
      return;
    }

    setStudent(stuData as Student);

    // ── 2. Fetch votes ──
    let voteRows: any[] = [];
    const { data: votesFull, error: votesError } = await supabase
      .from("votes")
      .select("id, candidate_id, position, voted_at, location")
      .eq("student_id", studentId)
      .order("voted_at", { ascending: true });

    if (votesError) {
      const { data: votesBasic } = await supabase
        .from("votes")
        .select("id, candidate_id, position")
        .eq("student_id", studentId);
      voteRows = votesBasic || [];
    } else {
      voteRows = votesFull || [];
    }

    if (!voteRows || voteRows.length === 0) {
      setVotes([]);
      const studentVotedAt = (stuData as any).voted_at as string | null;
      const studentLocation = (stuData as any).vote_location as string | null;
      setResolvedVotedAt(studentVotedAt || null);
      setResolvedLocation(studentLocation || null);
      setLoading(false);
      return;
    }

    const candidateIds = [...new Set(voteRows.map((v: any) => v.candidate_id))];
    const { data: candidateRows } = await supabase
      .from("candidates")
      .select("id, name, position")
      .in("id", candidateIds);

    const candidateMap: Record<string, { name: string; position: string }> = {};
    (candidateRows || []).forEach((c: any) => {
      candidateMap[c.id] = { name: c.name, position: c.position };
    });

    const transformed = voteRows.map((vote: any) => ({
      id: vote.id,
      candidate: candidateMap[vote.candidate_id] || { name: "Unknown", position: vote.position || "" },
      voted_at: vote.voted_at as string | undefined,
      location: vote.location as string | undefined,
    }));

    setVotes(transformed);

    const studentVotedAt = (stuData as any).voted_at as string | null;
    const studentLocation = (stuData as any).vote_location as string | null;
    const firstVote = transformed[0];

    setResolvedVotedAt(studentVotedAt || firstVote?.voted_at || null);
    setResolvedLocation(
      studentLocation && studentLocation !== "Location unavailable"
        ? studentLocation
        : firstVote?.location && firstVote.location !== "Location unavailable"
        ? firstVote.location
        : studentLocation || firstVote?.location || null
    );

    setLoading(false);
  };

  useEffect(() => {
    fetchStudentProfile();
  }, [studentId]);

  const handleResetStatus = async () => {
    if (!window.confirm(`Are you sure you want to reset the voting status for ${student?.name}? This will clear their votes.`)) return;
    setIsResetting(true);
    try {
      await supabase.from("votes").delete().eq("student_id", studentId);
      await supabase.from("students").update({ has_voted: false, voted_at: null, vote_location: null }).eq("id", studentId);
      await fetchStudentProfile();
      alert("Student voting status reset successfully.");
    } catch (err: any) {
      alert("Failed to reset voting status: " + err.message);
    } finally {
      setIsResetting(false);
    }
  };

  if (loading) return <div className="screen-content flex-center"><BubbleLoader message="Loading voter profile..." /></div>;
  if (error || !student) {
    return (
      <div className="screen-content content-max-width">
        <div className="card-box flex-center" style={{ padding: "40px", flexDirection: "column" }}>
          <span className="material-symbols-outlined" style={{ fontSize: "48px", color: "var(--color-danger)", marginBottom: "12px" }}>error</span>
          <p style={{ color: "var(--color-danger)", fontWeight: 600 }}>{error || "Student profile could not be loaded."}</p>
          <button className="btn-top-nav" onClick={() => setPage("admin_voters")} style={{ marginTop: "16px" }}>
            Return to Voters List
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen-content content-max-width" style={{ maxWidth: "620px", margin: "0 auto" }}>
      {/* Modern Centered Student Voter Profile Card */}
      <div
        className="card-box"
        style={{
          borderRadius: "24px",
          padding: "36px 28px 24px 28px",
          textAlign: "center",
          marginBottom: "24px",
          boxShadow: "var(--shadow-md)",
          background: "var(--bg-card)",
          border: "1px solid var(--border-light)",
        }}
      >
        {/* Top Centered Circular Ring Photo */}
        <div style={{ position: "relative", display: "inline-block", marginBottom: "16px" }}>
          <img
            src={
              base64ToImageUrl(student.photo_url) ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(student.name)}&background=E8F0FE&color=0A192F`
            }
            alt={student.name}
            style={{
              width: "128px",
              height: "128px",
              borderRadius: "50%",
              objectFit: "cover",
              border: "4px solid var(--primary-navy)",
              boxShadow: "0 8px 20px rgba(10, 25, 47, 0.15)",
              display: "block",
            }}
            onError={(e) => {
              e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(student.name)}&background=E8F0FE&color=0A192F`;
            }}
          />
        </div>

        {/* Student Name Title */}
        <h1 style={{ margin: "0 0 6px 0", fontSize: "26px", color: "var(--primary-navy)", fontWeight: 800 }}>
          {student.name}
        </h1>

        {/* Sub-location / Grade & Section Meta Line */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            fontSize: "13.5px",
            fontWeight: 600,
            color: "var(--text-muted)",
            marginBottom: "18px",
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: "16px", color: "var(--primary-navy)" }}>
            location_on
          </span>
          <span>DLMHS Student Voter &bull; Grade {student.grade} {student.section ? `• Section ${student.section}` : ""}</span>
        </div>

        {/* Action Button & Status Pill Row */}
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "28px" }}>
          <div className={`profile-voted-pill ${student.has_voted ? "voted" : "pending"}`} style={{ padding: "6px 16px", fontSize: "13px" }}>
            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
              {student.has_voted ? "check_circle" : "pending"}
            </span>
            {student.has_voted ? "Official Vote Cast" : "Voting Pending"}
          </div>

          <button className="btn-top-nav" onClick={fetchStudentProfile} style={{ padding: "6px 14px", fontSize: "12.5px" }}>
            <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>refresh</span>
            Refresh
          </button>

          {student.has_voted && (
            <button className="btn-top-nav" onClick={handleResetStatus} disabled={isResetting} style={{ padding: "6px 14px", fontSize: "12.5px" }}>
              <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>restart_alt</span>
              {isResetting ? "Resetting..." : "Reset Vote Status"}
            </button>
          )}
        </div>

        {/* Bottom 3-Column Stat Counter Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: "12px",
            paddingTop: "20px",
            borderTop: "1px solid var(--border-light)",
          }}
        >
          <div>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-light)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>
              Student ID
            </div>
            <div style={{ fontSize: "15px", fontWeight: 800, color: "var(--primary-navy)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {student.id}
            </div>
          </div>
          <div>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-light)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>
              Grade Level
            </div>
            <div style={{ fontSize: "15px", fontWeight: 800, color: "var(--primary-navy)" }}>
              {student.grade}
            </div>
          </div>
          <div>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-light)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>
              Voting Status
            </div>
            <div style={{ fontSize: "14.5px", fontWeight: 800, color: student.has_voted ? "var(--color-success)" : "var(--color-warning)" }}>
              {student.has_voted ? "Voted" : "Pending"}
            </div>
          </div>
        </div>
      </div>

      {/* Security & Access Key Details Box */}
      <div className="card-box" style={{ borderRadius: "20px", marginBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px", paddingBottom: "14px", borderBottom: "1px solid var(--border-light)" }}>
          <div style={{ width: "38px", height: "38px", borderRadius: "10px", background: "var(--primary-navy)", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>badge</span>
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "var(--primary-navy)" }}>Student Credentials & Key</h3>
            <p style={{ margin: "2px 0 0 0", fontSize: "12.5px", color: "var(--text-muted)" }}>LRN student identification and login access key.</p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
          <div style={{ background: "var(--bg-surface)", padding: "12px 14px", borderRadius: "12px", border: "1px solid var(--border-light)" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-light)", textTransform: "uppercase", marginBottom: "4px" }}>
              Access Password
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              {(() => {
                const displayPw = student.password && student.password.startsWith("$2a$") ? "123456" : student.password;
                return (
                  <>
                    <span style={{ fontFamily: "var(--font-sans)", fontSize: "14.5px", fontWeight: 800, color: "var(--primary-navy)", letterSpacing: showPassword ? "normal" : "0.15em" }}>
                      {displayPw ? (showPassword ? displayPw : "••••••••") : "Standard"}
                    </span>
                    {displayPw && (
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{ background: "none", border: "none", cursor: "pointer", padding: "2px", color: "var(--text-light)", display: "inline-flex", alignItems: "center" }}
                        title={showPassword ? "Hide Password" : "Show Password"}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
                          {showPassword ? "visibility_off" : "visibility"}
                        </span>
                      </button>
                    )}
                  </>
                );
              })()}
            </div>
          </div>

          <div style={{ background: "var(--bg-surface)", padding: "12px 14px", borderRadius: "12px", border: "1px solid var(--border-light)" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-light)", textTransform: "uppercase", marginBottom: "4px" }}>
              Voting Time
            </div>
            <div style={{ fontSize: "12.5px", fontWeight: 700, color: "var(--primary-navy)" }}>
              {student.has_voted && resolvedVotedAt ? (
                new Date(resolvedVotedAt).toLocaleString("en-PH", {
                  month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: true
                })
              ) : (
                <span style={{ color: "var(--text-light)", fontStyle: "italic" }}>Not Voted</span>
              )}
            </div>
          </div>

          <div style={{ background: "var(--bg-surface)", padding: "12px 14px", borderRadius: "12px", border: "1px solid var(--border-light)" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-light)", textTransform: "uppercase", marginBottom: "4px" }}>
              Voting Location
            </div>
            <div style={{ fontSize: "12.5px", fontWeight: 700, color: "var(--primary-navy)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {student.has_voted && resolvedLocation ? (
                resolvedLocation
              ) : (
                <span style={{ color: "var(--text-light)", fontStyle: "italic" }}>Not Voted</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Votes Cast Breakdown */}
      <div className="card-box" style={{ borderRadius: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
          <div style={{ width: "38px", height: "38px", borderRadius: "10px", background: "var(--primary-navy)", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>how_to_vote</span>
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: "18px", color: "var(--primary-navy)", fontWeight: 800 }}>Votes Cast Record</h3>
            <p style={{ margin: "2px 0 0 0", fontSize: "12.5px", color: "var(--text-muted)" }}>Official ballot record of candidate choices.</p>
          </div>
        </div>

        {votes.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center", background: "var(--bg-surface)", borderRadius: "14px", border: "2px dashed var(--border-light)" }}>
            <span className="material-symbols-outlined" style={{ fontSize: "40px", color: "var(--border-subtle)", marginBottom: "8px" }}>
              inbox
            </span>
            <h4 style={{ margin: "0 0 4px 0", color: "var(--primary-navy)", fontSize: "15px" }}>No Votes Cast Yet</h4>
            <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "13px" }}>
              This student has not submitted a ballot in the current election cycle.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {votes.map((vote) => {
              const formattedTime = vote.voted_at
                ? new Date(vote.voted_at).toLocaleString("en-PH", {
                    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: true
                  })
                : null;
              return (
                <div
                  key={vote.id}
                  style={{
                    padding: "16px 20px",
                    background: "var(--bg-surface)",
                    borderRadius: "14px",
                    border: "1px solid var(--border-light)",
                    borderLeft: "4px solid var(--primary-navy)",
                  }}
                  className="hover-lift"
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
                    <div>
                      <div className="overline" style={{ color: "var(--text-light)", marginBottom: "2px" }}>Position</div>
                      <strong style={{ fontSize: "15px", color: "var(--primary-navy)" }}>{vote.candidate.position}</strong>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div className="overline" style={{ color: "var(--text-light)", marginBottom: "2px" }}>Selected Candidate</div>
                      <div style={{ fontWeight: 700, color: "var(--color-success)", fontSize: "15px" }}>{vote.candidate.name}</div>
                    </div>
                  </div>
                  {(formattedTime || vote.location) && (
                    <div style={{ marginTop: "10px", paddingTop: "8px", borderTop: "1px dashed var(--border-light)", display: "flex", flexWrap: "wrap", gap: "8px" }}>
                      {formattedTime && (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", background: "var(--bg-subtle)", padding: "3px 8px", borderRadius: "99px", border: "1px solid var(--border-light)" }}>
                          <span className="material-symbols-outlined" style={{ fontSize: "13px" }}>schedule</span>
                          {formattedTime}
                        </span>
                      )}
                      {vote.location && (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", background: "var(--bg-subtle)", padding: "3px 8px", borderRadius: "99px", border: "1px solid var(--border-light)" }}>
                          <span className="material-symbols-outlined" style={{ fontSize: "13px" }}>location_on</span>
                          {vote.location}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentProfile;
