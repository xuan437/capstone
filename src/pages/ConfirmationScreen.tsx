import React from "react";
import { useLanguage } from "../context/LanguageContext";

const ConfirmationScreen: React.FC<{ handleLogout: () => void }> = ({ handleLogout }) => {
  const { t } = useLanguage();

  return (
    <div className="screen-content flex-center" style={{ minHeight: "calc(100vh - 180px)", padding: "var(--space-2-5)" }}>
      <div
        className="card-box"
        style={{
          maxWidth: "520px",
          width: "100%",
          margin: "0 auto",
          padding: "var(--space-6) var(--space-5)",
          textAlign: "center",
        }}
      >
        <div style={{ marginBottom: "var(--space-3.5)" }}>
          <span className="material-symbols-outlined confirm-success-icon">
            task_alt
          </span>
        </div>
        <h2 style={{ marginBottom: "var(--space-1-5)", fontSize: "28px", fontWeight: 700, color: "var(--primary-navy)" }}>
          {t.voteSubmittedTitle || "You have voted successfully!"}
        </h2>
        <p style={{ marginBottom: "var(--space-5)", fontSize: "16px", lineHeight: "1.6", color: "var(--text-muted)", maxWidth: "380px", marginLeft: "auto", marginRight: "auto" }}>
          {t.voteSubmittedMsg || "Your vote has been recorded. Thank you for participating in the election."}
        </p>
        <button className="btn-primary" onClick={handleLogout} style={{ width: "100%", padding: "var(--space-2)" }}>
          {t.logoutButton || "Logout"}
        </button>
      </div>
    </div>
  );
};

export default ConfirmationScreen;
