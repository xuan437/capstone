import React, { useState, useEffect } from "react";
import { supabase } from "../supabase";
import type { Candidate, Page } from "../types";
import { base64ToImageUrl } from "../utils/imageUtils";
import BubbleLoader from "../components/BubbleLoader";
import { Edit3, Megaphone, AlertCircle, Award } from "lucide-react";

const CandidateProfile: React.FC<{
  setPage: (p: Page) => void;
  candidateId: string;
}> = ({ setPage, candidateId }) => {
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [voteCount, setVoteCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("candidates")
        .select("id, position, name, image_url, campaign_text, age, section")
        .eq("id", candidateId)
        .single();

      if (error || !data) {
        setCandidate(null);
        setLoading(false);
        return;
      }

      setCandidate(data as Candidate);

      const { count } = await supabase
        .from("votes")
        .select("*", { count: "exact", head: true })
        .eq("candidate_id", candidateId);

      setVoteCount(count || 0);
      setLoading(false);
    };

    run();
  }, [candidateId]);

  if (loading) return <div style={{ padding: "48px", textAlign: "center" }}><BubbleLoader message="Loading candidate profile..." /></div>;
  if (!candidate) {
    return (
      <div style={{ maxWidth: "500px", margin: "40px auto", padding: "0 20px" }}>
        <div style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "8px", padding: "32px 24px", textAlign: "center" }}>
          <AlertCircle size={32} style={{ color: "#EF4444", marginBottom: "12px" }} />
          <p style={{ color: "#EF4444", fontWeight: 500, fontSize: "13px" }}>Candidate profile could not be found.</p>
          <button className="btn-secondary" onClick={() => setPage("admin_setup")} style={{ marginTop: "16px", padding: "6px 14px", borderRadius: "6px", fontSize: "12px" }}>
            Return to Candidate Roster
          </button>
        </div>
      </div>
    );
  }

  const avatar =
    base64ToImageUrl(candidate.image_url) ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(candidate.name)}&background=6366F1&color=ffffff`;

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", padding: "16px 20px" }}>
      {/* Modern Centered Candidate Profile Card */}
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
        {/* Top Centered Circular Ring Photo */}
        <div style={{ position: "relative", display: "inline-block", marginBottom: "12px" }}>
          <img
            src={avatar}
            alt={candidate.name}
            style={{
              width: "80px",
              height: "80px",
              borderRadius: "50%",
              objectFit: "cover",
              border: "2px solid var(--border-subtle)",
              display: "block",
            }}
            onError={(e) => {
              e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(candidate.name)}&background=6366F1&color=ffffff`;
            }}
          />
        </div>

        {/* Candidate Name Title */}
        <h1 style={{ margin: "0 0 4px 0", fontSize: "18px", color: "var(--text-main)", fontWeight: 600, letterSpacing: "-0.01em" }}>
          {candidate.name}
        </h1>

        {/* Running Meta Line */}
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
          <Award size={13} style={{ color: "var(--accent-primary)" }} />
          <span>SSLG Candidate &bull; Running for {candidate.position}</span>
        </div>

        {/* Action Button Row */}
        <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginBottom: "18px" }}>
          <button
            type="button"
            className="btn-primary"
            onClick={() => setPage("admin_add_candidate")}
            style={{ padding: "6px 14px", fontSize: "12px", borderRadius: "6px", display: "flex", alignItems: "center", gap: "4px" }}
          >
            <Edit3 size={13} />
            Edit Profile
          </button>
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
              Total Votes
            </div>
            <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--accent-primary)" }}>
              {voteCount}
            </div>
          </div>
          <div>
            <div style={{ fontSize: "10.5px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: "2px" }}>
              Position
            </div>
            <div style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--text-main)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {candidate.position}
            </div>
          </div>
          <div>
            <div style={{ fontSize: "10.5px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: "2px" }}>
              Section
            </div>
            <div style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--text-main)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {candidate.section || "—"}
            </div>
          </div>
        </div>
      </div>

      {/* Campaign Platform & Biography Card */}
      <div style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "8px", padding: "16px", boxShadow: "0 1px 2px 0 rgba(0,0,0,0.05)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", paddingBottom: "10px", borderBottom: "1px solid var(--border-subtle)" }}>
          <Megaphone size={16} style={{ color: "var(--accent-primary)" }} />
          <div>
            <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: "var(--text-main)" }}>Campaign Platform & Statement</h3>
            <p style={{ margin: 0, fontSize: "11.5px", color: "var(--text-muted)" }}>Official campaign statement, vision, and candidate goals.</p>
          </div>
        </div>

        {candidate.campaign_text ? (
          <div
            style={{
              padding: "14px",
              backgroundColor: "var(--bg-main)",
              borderRadius: "6px",
              border: "1px solid var(--border-subtle)",
              borderLeft: "3px solid var(--accent-primary)",
              lineHeight: "1.6",
              fontSize: "12.5px",
              color: "var(--text-main)",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              overflowWrap: "anywhere",
            }}
          >
            "{candidate.campaign_text}"
          </div>
        ) : (
          <div style={{ padding: "24px 16px", textAlign: "center", backgroundColor: "var(--bg-main)", borderRadius: "6px", border: "1px dashed var(--border-subtle)" }}>
            <Megaphone size={22} style={{ color: "var(--text-light)", marginBottom: "6px" }} />
            <p style={{ margin: 0, color: "var(--text-muted)", fontWeight: 400, fontSize: "12px" }}>
              No campaign platform or biography submitted for this candidate.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CandidateProfile;

