import React, { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { Student, Page } from "../types";
import { base64ToImageUrl } from "../utils/imageUtils";
import BubbleLoader from "../components/BubbleLoader";
import { CheckCircle2, Clock, RotateCw, MapPin, Eye, EyeOff, Vote, ShieldCheck, AlertCircle, RefreshCw } from "lucide-react";

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

  if (loading) return <div style={{ padding: "48px", textAlign: "center" }}><BubbleLoader message="Loading voter profile..." /></div>;
  if (error || !student) {
    return (
      <div style={{ maxWidth: "500px", margin: "40px auto", padding: "0 20px" }}>
        <div style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "8px", padding: "32px 24px", textAlign: "center" }}>
          <AlertCircle size={32} style={{ color: "#EF4444", marginBottom: "12px" }} />
          <p style={{ color: "#EF4444", fontWeight: 500, fontSize: "13px" }}>{error || "Student profile could not be loaded."}</p>
          <button className="btn-secondary" onClick={() => setPage("admin_voters")} style={{ marginTop: "16px", padding: "6px 14px", borderRadius: "6px", fontSize: "12px" }}>
            Return to Voters Roster
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", padding: "16px 20px" }}>
      {/* Modern Centered Student Voter Profile Card */}
      <div
        style={{
          borderRadius: "10px",
          padding: "24px 20px 16px 20px",
          textAlign: "center",
          marginBottom: "16px",
          backgroundColor: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        }}
      >
        {/* Top Centered Circular Photo */}
        <div style={{ position: "relative", display: "inline-block", marginBottom: "12px" }}>
          <img
            src={
              base64ToImageUrl(student.photo_url) ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(student.name)}&background=6366F1&color=ffffff`
            }
            alt={student.name}
            style={{
              width: "80px",
              height: "80px",
              borderRadius: "50%",
              objectFit: "cover",
              border: "2px solid var(--border-subtle)",
              display: "block",
            }}
            onError={(e) => {
              e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(student.name)}&background=6366F1&color=ffffff`;
            }}
          />
        </div>

        {/* Student Name Title */}
        <h1 style={{ margin: "0 0 4px 0", fontSize: "18px", color: "var(--text-main)", fontWeight: 600, letterSpacing: "-0.01em" }}>
          {student.name}
        </h1>

        {/* Meta Line */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            fontSize: "12px",
            fontWeight: 500,
            color: "var(--text-muted)",
            marginBottom: "14px",
          }}
        >
          <MapPin size={13} style={{ color: "var(--accent-primary)" }} />
          <span>DLMHS Voter &bull; Grade {student.grade} {student.section ? `• Section ${student.section}` : ""}</span>
        </div>

        {/* Action Button & Status Pill Row */}
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "18px" }}>
          <div className={`profile-voted-pill ${student.has_voted ? "voted" : "pending"}`} style={{ padding: "4px 12px", fontSize: "12px", borderRadius: "12px" }}>
            {student.has_voted ? <CheckCircle2 size={13} /> : <Clock size={13} />}
            {student.has_voted ? "Official Vote Cast" : "Voting Pending"}
          </div>

          <button className="btn-secondary" onClick={fetchStudentProfile} style={{ padding: "4px 10px", borderRadius: "6px", fontSize: "11.5px", display: "flex", alignItems: "center", gap: "4px" }}>
            <RotateCw size={12} />
            Refresh
          </button>

          {student.has_voted && (
            <button className="btn-secondary" onClick={handleResetStatus} disabled={isResetting} style={{ padding: "4px 10px", borderRadius: "6px", fontSize: "11.5px", color: "#EF4444", display: "flex", alignItems: "center", gap: "4px" }}>
              <RefreshCw size={12} />
              {isResetting ? "Resetting..." : "Reset Vote Status"}
            </button>
          )}
        </div>

        {/* Bottom 3-Column Stat Counter Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: "8px",
            paddingTop: "14px",
            borderTop: "1px solid var(--border-subtle)",
          }}
        >
          <div>
            <div style={{ fontSize: "10.5px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: "2px" }}>
              Student LRN
            </div>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-main)", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {student.id}
            </div>
          </div>
          <div>
            <div style={{ fontSize: "10.5px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: "2px" }}>
              Grade Level
            </div>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-main)" }}>
              {student.grade}
            </div>
          </div>
          <div>
            <div style={{ fontSize: "10.5px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: "2px" }}>
              Status
            </div>
            <div style={{ fontSize: "13px", fontWeight: 600, color: student.has_voted ? "#10B981" : "#F59E0B" }}>
              {student.has_voted ? "Voted" : "Pending"}
            </div>
          </div>
        </div>
      </div>

      {/* Security & Access Key Details Box */}
      <div style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "8px", padding: "16px", marginBottom: "16px", boxShadow: "0 1px 2px 0 rgba(0,0,0,0.05)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", paddingBottom: "10px", borderBottom: "1px solid var(--border-subtle)" }}>
          <ShieldCheck size={16} style={{ color: "var(--accent-primary)" }} />
          <div>
            <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: "var(--text-main)" }}>Student Credentials & Key</h3>
            <p style={{ margin: 0, fontSize: "11.5px", color: "var(--text-muted)" }}>LRN identification and passcode access details.</p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px" }}>
          <div style={{ minWidth: 0, backgroundColor: "var(--bg-main)", padding: "10px", borderRadius: "6px", border: "1px solid var(--border-subtle)" }}>
            <div style={{ fontSize: "10.5px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "2px" }}>
              Access Password
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              {(() => {
                const displayPw = student.password && student.password.startsWith("$2a$") ? "123456" : student.password;
                return (
                  <>
                    <span style={{ fontFamily: "monospace", fontSize: "12px", fontWeight: 600, color: "var(--text-main)", letterSpacing: showPassword ? "normal" : "0.15em" }}>
                      {displayPw ? (showPassword ? displayPw : "••••••••") : "Standard"}
                    </span>
                    {displayPw && (
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{ background: "none", border: "none", cursor: "pointer", padding: "2px", color: "var(--text-muted)", display: "inline-flex", alignItems: "center" }}
                        title={showPassword ? "Hide Password" : "Show Password"}
                      >
                        {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                    )}
                  </>
                );
              })()}
            </div>
          </div>

          <div style={{ minWidth: 0, backgroundColor: "var(--bg-main)", padding: "10px", borderRadius: "6px", border: "1px solid var(--border-subtle)" }}>
            <div style={{ fontSize: "10.5px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "2px" }}>
              Voting Time
            </div>
            <div style={{ fontSize: "12px", fontWeight: 500, color: "var(--text-main)" }}>
              {student.has_voted && resolvedVotedAt ? (
                new Date(resolvedVotedAt).toLocaleString("en-PH", {
                  month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: true
                })
              ) : (
                <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>Not Voted</span>
              )}
            </div>
          </div>

          <div style={{ minWidth: 0, backgroundColor: "var(--bg-main)", padding: "10px", borderRadius: "6px", border: "1px solid var(--border-subtle)" }}>
            <div style={{ fontSize: "10.5px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "2px" }}>
              Voting Location
            </div>
            <div style={{ fontSize: "11.5px", fontWeight: 500, color: "var(--text-main)", wordBreak: "break-word", lineHeight: 1.35 }} title={resolvedLocation || ""}>
              {student.has_voted && resolvedLocation ? (
                resolvedLocation
              ) : (
                <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>Not Voted</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Votes Cast Breakdown */}
      <div style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "8px", padding: "16px", boxShadow: "0 1px 2px 0 rgba(0,0,0,0.05)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
          <Vote size={16} style={{ color: "var(--accent-primary)" }} />
          <div>
            <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: "var(--text-main)" }}>Votes Cast Record</h3>
            <p style={{ margin: 0, fontSize: "11.5px", color: "var(--text-muted)" }}>Official ballot record of candidate choices.</p>
          </div>
        </div>

        {votes.length === 0 ? (
          <div style={{ padding: "28px 16px", textAlign: "center", backgroundColor: "var(--bg-main)", borderRadius: "6px", border: "1px dashed var(--border-subtle)" }}>
            <Vote size={24} style={{ color: "var(--text-light)", marginBottom: "6px" }} />
            <h4 style={{ margin: "0 0 2px 0", color: "var(--text-main)", fontSize: "13px", fontWeight: 500 }}>No Votes Cast Yet</h4>
            <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "12px" }}>
              This student has not submitted a ballot in the current election.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
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
                    padding: "10px 14px",
                    backgroundColor: "var(--bg-main)",
                    borderRadius: "6px",
                    border: "1px solid var(--border-subtle)",
                    borderLeft: "3px solid var(--accent-primary)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "8px" }}>
                    <div>
                      <div style={{ fontSize: "10.5px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 500 }}>Position</div>
                      <strong style={{ fontSize: "13px", color: "var(--text-main)" }}>{vote.candidate.position}</strong>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "10.5px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 500 }}>Selected Candidate</div>
                      <div style={{ fontWeight: 600, color: "#10B981", fontSize: "13px" }}>{vote.candidate.name}</div>
                    </div>
                  </div>
                  {(formattedTime || vote.location) && (
                    <div style={{ marginTop: "6px", paddingTop: "6px", borderTop: "1px dashed var(--border-subtle)", display: "flex", flexWrap: "wrap", gap: "6px" }}>
                      {formattedTime && (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "var(--text-muted)" }}>
                          <Clock size={11} />
                          {formattedTime}
                        </span>
                      )}
                      {vote.location && (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "var(--text-muted)" }}>
                          <MapPin size={11} />
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

