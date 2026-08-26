import React, { useState, useEffect, useRef } from "react";
import { Page, User, Student } from "../types";
import { ThemeToggle } from "./ThemeToggle";
import { translations, LanguageCode } from "../utils/translations";
import "./AdminLayout.css";

interface VoterLayoutProps {
  children: React.ReactNode;
  activePage: Page;
  setPage: (p: Page) => void;
  currentUser: User | Student | null;
  handleLogout: () => void;
  searchTerm?: string;
  setSearchTerm?: (term: string) => void;
}

type ModalType = "process" | "rules" | "privacy" | "terms";

const VoterLayout: React.FC<VoterLayoutProps> = ({
  children,
  activePage,
  setPage,
  currentUser,
  handleLogout,
  searchTerm: _searchTerm,
  setSearchTerm: _setSearchTerm,
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(true); // Open settings by default for voters

  const [lang, setLang] = useState<LanguageCode>(() => {
    const saved = localStorage.getItem("app_lang");
    return (saved === "en" || saved === "tl" || saved === "ceb" ? saved : "en") as LanguageCode;
  });

  const [activeModalType, setActiveModalType] = useState<ModalType | null>(null);
  const [isModalRendered, setIsModalRendered] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const changeLanguage = (newLang: LanguageCode) => {
    setLang(newLang);
    localStorage.setItem("app_lang", newLang);
    window.dispatchEvent(new Event("languageChange"));
  };

  useEffect(() => {
    if (activeModalType) {
      const modalWidth = 380;
      const modalHeight = 420;
      const centeredX = Math.max(20, (window.innerWidth - modalWidth) / 2);
      const centeredY = Math.max(20, (window.innerHeight - modalHeight) / 2);
      setPosition({ x: centeredX, y: centeredY });

      const timer = setTimeout(() => setIsModalRendered(true), 10);
      return () => clearTimeout(timer);
    } else {
      setIsModalRendered(false);
    }
  }, [activeModalType]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      setPosition({
        x: e.clientX - dragStart.current.x,
        y: e.clientY - dragStart.current.y,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest(".close-btn")) return;
    setIsDragging(true);
    dragStart.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  const closeModal = () => {
    setIsModalRendered(false);
    setTimeout(() => setActiveModalType(null), 200);
  };

  const t = translations[lang] || {};

  const modalConfig: Record<ModalType, { title: string; content: string; icon: string }> = {
    process: {
      title: t.electionProcessTitle || "Election Guidelines",
      content: t.electionProcessContent || "1. Log in with your verified credentials.\n2. Cast your ballot securely.\n3. Confirm submission.",
      icon: "how_to_vote",
    },
    rules: {
      title: t.votingRulesTitle || "System Voting Rules",
      content: t.votingRulesContent || "1. One verified profile per unique voter.\n2. Complete within active voting hours.\n3. Security bypass attempts will lock session.",
      icon: "gavel",
    },
    privacy: {
      title: t.privacyPolicyTitle || "Privacy & Data Protection",
      content: t.privacyPolicyContent || "1. Vote data is fully encrypted to maintain anonymity.\n2. Audit logs are collected strictly for system validation.",
      icon: "shield",
    },
    terms: {
      title: t.termsOfServiceTitle || "Terms of Platform Service",
      content: t.termsOfServiceContent || "1. Intended for authorized organizational voting use.\n2. Automated scripts or disruptive actions are prohibited.",
      icon: "description",
    },
  };

  const renderUnifiedBlockContent = (type: ModalType, text: string) => {
    if (!text) return null;

    const lines = text
      .split("\n")
      .map((line) => {
        let clean = line.trim();
        clean = clean.replace(/^(\d+[\.\)]|[-*•])\s*/, "");
        return clean;
      })
      .filter((line) => line.length > 0);

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {lines.map((line, i) => {
          let theme = { bg: "#F8FAFC", border: "#94A3B8", text: "#334155" };

          if (type === "rules") {
            const ruleThemes = [
              { bg: "#F8FAFC", border: "#94A3B8", text: "#334155" },
              { bg: "#F0FDF4", border: "#BBF7D0", text: "#166534" },
              { bg: "#FEF2F2", border: "#FEE2E2", text: "#991B1B" },
            ];
            theme = ruleThemes[i % ruleThemes.length];
          } else if (type === "process") {
            const processThemes = [
              { bg: "#EFF6FF", border: "#BFDBFE", text: "#1E40AF" },
              { bg: "#F0FDF4", border: "#BBF7D0", text: "#166534" },
              { bg: "#F5F3FF", border: "#DDD6FE", text: "#5B21B6" },
            ];
            theme = processThemes[i % processThemes.length];
          } else if (type === "privacy") {
            const privacyThemes = [
              { bg: "#F0FDFA", border: "#99F6E4", text: "#115E59" },
              { bg: "#F8FAFC", border: "#CBD5E1", text: "#334155" },
            ];
            theme = i === 0 ? privacyThemes[0] : privacyThemes[1];
          } else if (type === "terms") {
            const termsThemes = [
              { bg: "#FFFBEB", border: "#FEF3C7", text: "#92400E" },
              { bg: "#F8FAFC", border: "#CBD5E1", text: "#334155" },
            ];
            theme = i === 0 ? termsThemes[0] : termsThemes[1];
          }

          return (
            <div
              key={i}
              style={{
                backgroundColor: theme.bg,
                borderLeft: `4px solid ${theme.border}`,
                padding: "12px 14px",
                borderRadius: "0 8px 8px 0",
                boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
              }}
            >
              <p
                style={{
                  margin: "0",
                  fontSize: "14px",
                  lineHeight: "1.5",
                  color: theme.text,
                  textAlign: "left",
                  fontFamily: "var(--font-sans)",
                }}
              >
                {line}
              </p>
            </div>
          );
        })}
      </div>
    );
  };

  const activeModalDetails = activeModalType ? modalConfig[activeModalType] : null;

  return (
    <div className="admin-layout-root">
      {/* Sidebar Mobile Overlay Backdrop */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 999,
            backdropFilter: "blur(2px)",
          }}
        />
      )}

      {/* Left Vertical Brand Sidebar Navigation */}
      <aside className={`admin-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="admin-sidebar-header">
          <img src="/image.png" alt="School Logo" className="admin-sidebar-logo" />
          <div>
            <h2 className="admin-brand-title">SSG E-Voting</h2>
            <p className="admin-brand-subtitle">Student Voter Portal</p>
          </div>
        </div>

        <nav className="admin-sidebar-nav">
          {/* Main Ballot Navigation Item */}
          <button
            className={`admin-nav-item ${activePage === "ballot" ? "active" : ""}`}
            onClick={() => {
              setPage("ballot");
              setSidebarOpen(false);
            }}
          >
            <span className="material-symbols-outlined">how_to_vote</span>
            <span>Official Ballot</span>
          </button>

          {/* Settings Section Navigation Item */}
          <button
            className={`admin-nav-item ${settingsOpen ? "active" : ""}`}
            onClick={() => setSettingsOpen(!settingsOpen)}
            style={{ marginTop: "6px" }}
          >
            <span className="material-symbols-outlined">settings</span>
            <span>Settings</span>
            <span
              className="material-symbols-outlined"
              style={{
                marginLeft: "auto",
                fontSize: "18px",
                transform: settingsOpen ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.2s ease",
              }}
            >
              expand_more
            </span>
          </button>

          {/* Expandable Settings Options Panel */}
          {settingsOpen && (
            <div className="admin-settings-submenu">
              {/* Language Selection */}
              <div>
                <div className="admin-settings-section-title">Language</div>
                <div className="admin-lang-pill">
                  {(["en", "tl", "ceb"] as LanguageCode[]).map((l) => (
                    <button
                      key={l}
                      className={`admin-lang-btn ${lang === l ? "active" : ""}`}
                      onClick={() => changeLanguage(l)}
                    >
                      {l === "en" ? "English" : l === "tl" ? "Tagalog" : "Bisaya"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Contact Information */}
              <div>
                <div className="admin-settings-section-title">Contact Admin</div>
                <a
                  href="https://mail.google.com/mail/?view=cm&fs=1&tf=1&to=emjaygusela@gmail.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="admin-sub-link"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>mail</span>
                  <span>admin@gmail.com</span>
                </a>
                <a href="tel:09168562198" className="admin-sub-link">
                  <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>call</span>
                  <span>09168562198</span>
                </a>
              </div>

              {/* About & Policies */}
              <div>
                <div className="admin-settings-section-title">System Policies</div>
                <button className="admin-sub-link" onClick={() => setActiveModalType("process")}>
                  <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>how_to_vote</span>
                  <span>{t.electionProcess || "Election Process"}</span>
                </button>
                <button className="admin-sub-link" onClick={() => setActiveModalType("rules")}>
                  <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>gavel</span>
                  <span>{t.votingRules || "Voting Rules"}</span>
                </button>
                <button className="admin-sub-link" onClick={() => setActiveModalType("privacy")}>
                  <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>shield</span>
                  <span>{t.privacyPolicy || "Privacy Policy"}</span>
                </button>
                <button className="admin-sub-link" onClick={() => setActiveModalType("terms")}>
                  <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>description</span>
                  <span>{t.termsOfService || "Terms of Service"}</span>
                </button>
              </div>
            </div>
          )}
        </nav>

        {/* Sidebar Footer: Student Profile Badge + Theme Toggle + Logout */}
        <div className="admin-sidebar-footer">
          {/* Student Profile Chip inside Sidebar */}
          <div className="admin-user-badge-sidebar">
            <div className="admin-avatar-circle-sidebar">
              {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : "V"}
            </div>
            <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
              <span style={{ fontSize: "13px", fontWeight: 700, color: "#FFFFFF", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {currentUser?.name || "Verified Voter"}
              </span>
              <span style={{ fontSize: "11px", color: "#10B981", fontWeight: 700, display: "flex", alignItems: "center", gap: "4px" }}>
                ● Active Session
              </span>
            </div>
          </div>

          {/* Theme Toggle row inside Sidebar */}
          <div className="sidebar-theme-toggle-row">
            <span>Theme Mode</span>
            <ThemeToggle compact />
          </div>

          <button className="admin-nav-item" onClick={handleLogout} style={{ color: "#EF4444", padding: "8px 12px" }}>
            <span className="material-symbols-outlined" style={{ color: "#EF4444" }}>logout</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Dashboard Area */}
      <div className="admin-main-area">
        {/* Top Header Navigation Bar */}
        <header className="admin-top-header">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", width: "100%" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <button className="admin-mobile-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
                <span className="material-symbols-outlined" style={{ fontSize: "24px" }}>menu</span>
              </button>

              <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-main)" }}>
                {activePage === "ballot" ? "Official Electronic Ballot" : activePage === "confirm" ? "Vote Submitted" : "Live Standings"}
              </div>
            </div>

            {/* Global Voter Search Bar */}
            <div className="admin-search-wrapper" style={{ maxWidth: "280px" }}>
              <span className="material-symbols-outlined" style={{ color: "var(--text-light)", fontSize: "18px" }}>
                search
              </span>
              <input
                type="text"
                placeholder="Search candidates..."
                value={_searchTerm || ""}
                onChange={(e) => _setSearchTerm && _setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </header>

        {/* Main Content Workspace Container */}
        <main className="admin-content-container">
          {children}
        </main>
      </div>

      {/* Draggable Policy Modal */}
      {activeModalType && activeModalDetails && (
        <div
          style={{
            position: "fixed",
            left: `${position.x}px`,
            top: `${position.y}px`,
            width: "380px",
            background: "#FFFFFF",
            borderRadius: "16px",
            boxShadow: "0px 20px 50px rgba(15, 23, 42, 0.22)",
            border: "1px solid #E2E8F0",
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            userSelect: isDragging ? "none" : "auto",
            opacity: isModalRendered ? 1 : 0,
            transform: isModalRendered ? "scale(1)" : "scale(0.95)",
            transition: isDragging
              ? "none"
              : "opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1), transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          {/* Header Handle */}
          <div
            onMouseDown={handleMouseDown}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "16px 20px",
              background: "#F8FAFC",
              borderBottom: "1px solid #E2E8F0",
              cursor: isDragging ? "grabbing" : "grab",
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "22px", color: "#1E3A8A" }}>
              {activeModalDetails.icon}
            </span>
            <h3 style={{ margin: "0", fontSize: "15px", fontWeight: 600, color: "#0F172A", flex: 1 }}>
              {activeModalDetails.title}
            </h3>
            <button
              className="close-btn"
              onClick={closeModal}
              style={{
                background: "none",
                border: "none",
                fontSize: "20px",
                cursor: "pointer",
                color: "#94A3B8",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "4px",
                fontWeight: 400,
              }}
            >
              ×
            </button>
          </div>

          {/* Content Block */}
          <div style={{ padding: "20px", maxHeight: "320px", overflowY: "auto", background: "#FFFFFF" }}>
            {renderUnifiedBlockContent(activeModalType, activeModalDetails.content)}
          </div>

          {/* Footer Close Button */}
          <div style={{ padding: "14px 20px", borderTop: "1px solid #F1F5F9", background: "#F8FAFC" }}>
            <button
              onClick={closeModal}
              style={{
                width: "100%",
                padding: "10px",
                background: "#0F172A",
                color: "#FFFFFF",
                border: "none",
                borderRadius: "8px",
                fontWeight: 600,
                fontSize: "13.5px",
                cursor: "pointer",
              }}
            >
              {t.closeButton || "Close"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VoterLayout;
