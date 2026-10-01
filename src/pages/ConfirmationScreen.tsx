import React from "react";
import { useLanguage } from "../context/LanguageContext";
import { CheckCircle2, LogOut } from "lucide-react";

const ConfirmationScreen: React.FC<{ handleLogout: () => void }> = ({ handleLogout }) => {
  const { t } = useLanguage();

  return (
    <div style={{ minHeight: "calc(100vh - 120px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div
        style={{
          maxWidth: "440px",
          width: "100%",
          margin: "0 auto",
          padding: "32px 24px",
          textAlign: "center",
          backgroundColor: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "8px",
          boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        }}
      >
        <div style={{
          width: "48px",
          height: "48px",
          borderRadius: "50%",
          backgroundColor: "rgba(16, 185, 129, 0.12)",
          border: "1px solid rgba(16, 185, 129, 0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 16px auto",
          color: "#10B981"
        }}>
          <CheckCircle2 size={26} />
        </div>
        <h2 style={{ marginBottom: "6px", fontSize: "20px", fontWeight: 600, color: "var(--text-main)", letterSpacing: "-0.01em" }}>
          {t.voteSubmittedTitle || "Vote Successfully Cast"}
        </h2>
        <p style={{ marginBottom: "20px", fontSize: "13px", lineHeight: "1.5", color: "var(--text-muted)", maxWidth: "340px", marginLeft: "auto", marginRight: "auto" }}>
          {t.voteSubmittedMsg || "Your official ballot choices have been securely recorded in the election database."}
        </p>
        <button className="btn-primary" onClick={handleLogout} style={{ width: "100%", padding: "8px 14px", fontSize: "13px", fontWeight: 500, borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
          <LogOut size={14} />
          {t.logoutButton || "Logout"}
        </button>
      </div>
    </div>
  );
};

export default ConfirmationScreen;

