import React, { useState, useEffect } from "react";
import { supabase } from "../supabase";
import type { Candidate, Page } from "../types";
import { base64ToImageUrl } from "../utils/imageUtils";
import BubbleLoader from "../components/BubbleLoader";

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

  if (loading) return <div className="screen-content flex-center"><BubbleLoader message="Loading candidate profile..." /></div>;
  if (!candidate) {
    return (
      <div className="screen-content content-max-width">
        <div className="card-box flex-center" style={{ padding: "40px", flexDirection: "column" }}>
          <span className="material-symbols-outlined" style={{ fontSize: "48px", color: "var(--color-danger)", marginBottom: "12px" }}>error</span>
          <p style={{ color: "var(--color-danger)", fontWeight: 600 }}>Candidate profile could not be found.</p>
          <button className="btn-top-nav" onClick={() => setPage("admin_setup")} style={{ marginTop: "16px" }}>
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const avatar =
    base64ToImageUrl(candidate.image_url) ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(candidate.name)}&background=E8F0FE&color=0A192F`;

  return (
    <div className="screen-content content-max-width" style={{ maxWidth: "620px", margin: "0 auto" }}>
      {/* Modern Centered Candidate Profile Card */}
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
            src={avatar}
            alt={candidate.name}
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
              e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(candidate.name)}&background=E8F0FE&color=0A192F`;
            }}
          />
        </div>

        {/* Candidate Name Title */}
        <h1 style={{ margin: "0 0 6px 0", fontSize: "26px", color: "var(--primary-navy)", fontWeight: 800 }}>
          {candidate.name}
        </h1>

        {/* Sub-location / Running Meta Line */}
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
          <span>SSLG Candidate &bull; Running for {candidate.position}</span>
        </div>

        {/* Action Button Row */}
        <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginBottom: "28px" }}>
          <button
            type="button"
            className="btn-top-nav primary"
            onClick={() => setPage("admin_add_candidate")}
            style={{ padding: "8px 22px", fontSize: "13px" }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
              edit
            </span>
            Edit Candidate Profile
          </button>
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
              Total Votes
            </div>
            <div style={{ fontSize: "24px", fontWeight: 800, color: "var(--primary-navy)" }}>
              {voteCount}
            </div>
          </div>
          <div>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-light)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>
              Position
            </div>
            <div style={{ fontSize: "15px", fontWeight: 800, color: "var(--primary-navy)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {candidate.position}
            </div>
          </div>
          <div>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-light)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>
              Section
            </div>
            <div style={{ fontSize: "15px", fontWeight: 800, color: "var(--primary-navy)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {candidate.section || "—"}
            </div>
          </div>
        </div>
      </div>

      {/* Campaign Platform & Biography Card */}
      <div className="card-box" style={{ borderRadius: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px", paddingBottom: "14px", borderBottom: "1px solid var(--border-light)" }}>
          <div style={{ width: "38px", height: "38px", borderRadius: "10px", background: "var(--primary-navy)", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>campaign</span>
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "var(--primary-navy)" }}>Campaign Platform & Statement</h3>
            <p style={{ margin: "2px 0 0 0", fontSize: "12.5px", color: "var(--text-muted)" }}>Official campaign statement, vision, and candidate goals.</p>
          </div>
        </div>

        {candidate.campaign_text ? (
          <div
            style={{
              padding: "20px",
              background: "var(--bg-surface)",
              borderRadius: "14px",
              border: "1px solid var(--border-light)",
              borderLeft: "4px solid var(--primary-navy)",
              lineHeight: 1.85,
              fontSize: "14.5px",
              color: "var(--text-main)",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              overflowWrap: "anywhere",
            }}
          >
            "{candidate.campaign_text}"
          </div>
        ) : (
          <div style={{ padding: "32px 20px", textAlign: "center", background: "var(--bg-surface)", borderRadius: "14px", border: "2px dashed var(--border-light)" }}>
            <span className="material-symbols-outlined" style={{ fontSize: "36px", color: "var(--border-subtle)", marginBottom: "8px" }}>
              description
            </span>
            <p style={{ margin: 0, color: "var(--text-muted)", fontWeight: 500, fontSize: "13.5px" }}>
              No campaign platform or biography submitted for this candidate.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CandidateProfile;
