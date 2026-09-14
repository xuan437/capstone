import React, { useState, useEffect, useRef } from "react";
import {
  LayoutDashboard,
  Users,
  UserPlus,
  UserCheck,
  Clock,
  ShieldAlert,
  BarChart3,
  FileSpreadsheet,
  Settings,
  LogOut,
  Search,
  Menu,
  ChevronDown,
  Mail,
  Phone,
  Vote,
  Gavel,
  Shield,
  FileText,
  X,
} from "lucide-react";
import { Page, User } from "../types";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageCode } from "../utils/translations";
import { useLanguage } from "../context/LanguageContext";
import "./AdminLayout.css";

interface AdminLayoutProps {
  children: React.ReactNode;
  activePage: Page;
  setPage: (p: Page) => void;
  currentUser: User | null;
  handleLogout: () => void;
  searchTerm?: string;
  setSearchTerm?: (term: string) => void;
}

type ModalType = "process" | "rules" | "privacy" | "terms";

const AdminLayout: React.FC<AdminLayoutProps> = ({
  children,
  activePage,
  setPage,
  currentUser,
  handleLogout,
  searchTerm,
  setSearchTerm,
}) => {
  const { lang, setLanguage, t } = useLanguage();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleToggleSidebar = () => {
    if (window.innerWidth <= 900) {
      setSidebarOpen((prev) => !prev);
    } else {
      setSidebarCollapsed((prev) => !prev);
    }
  };

  const [activeModalType, setActiveModalType] = useState<ModalType | null>(null);
  const [isModalRendered, setIsModalRendered] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

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

  const modalConfig: Record<ModalType, { title: string; content: string; IconComponent: React.ComponentType<{ size?: number }> }> = {
    process: {
      title: t.electionProcessTitle || "Election Guidelines",
      content: t.electionProcessContent || "1. Log in with your verified credentials.\n2. Cast your ballot securely.\n3. Confirm submission.",
      IconComponent: Vote,
    },
    rules: {
      title: t.votingRulesTitle || "System Voting Rules",
      content: t.votingRulesContent || "1. One verified profile per unique voter.\n2. Complete within active voting hours.\n3. Security bypass attempts will lock session.",
      IconComponent: Gavel,
    },
    privacy: {
      title: t.privacyPolicyTitle || "Privacy & Data Protection",
      content: t.privacyPolicyContent || "1. Vote data is fully encrypted to maintain anonymity.\n2. Audit logs are collected strictly for system validation.",
      IconComponent: Shield,
    },
    terms: {
      title: t.termsOfServiceTitle || "Terms of Platform Service",
      content: t.termsOfServiceContent || "1. Intended for authorized organizational voting use.\n2. Automated scripts or disruptive actions are prohibited.",
      IconComponent: FileText,
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
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {lines.map((line, i) => {
          let theme = { bg: "var(--bg-subtle)", border: "var(--border-subtle)", text: "var(--text-main)" };

          if (type === "rules") {
            const ruleThemes = [
              { bg: "var(--bg-subtle)", border: "var(--border-subtle)", text: "var(--text-main)" },
              { bg: "var(--color-success-bg)", border: "var(--color-success-border)", text: "var(--color-success)" },
              { bg: "var(--color-danger-bg)", border: "var(--color-danger-border)", text: "var(--color-danger)" },
            ];
            theme = ruleThemes[i % ruleThemes.length];
          } else if (type === "process") {
            const processThemes = [
              { bg: "var(--color-info-bg)", border: "var(--color-info-border)", text: "var(--color-info)" },
              { bg: "var(--color-success-bg)", border: "var(--color-success-border)", text: "var(--color-success)" },
              { bg: "var(--accent-blue)", border: "var(--border-blue)", text: "var(--primary-navy)" },
            ];
            theme = processThemes[i % processThemes.length];
          }

          return (
            <div
              key={i}
              style={{
                backgroundColor: theme.bg,
                borderLeft: `3px solid ${theme.border}`,
                padding: "10px 12px",
                borderRadius: "0 6px 6px 0",
              }}
            >
              <p
                style={{
                  margin: "0",
                  fontSize: "12.5px",
                  lineHeight: "1.4",
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

  const navItems: { label: string; page: Page; IconComponent: React.ComponentType<{ size?: number }> }[] = [
    { label: t.navDashboard || "Dashboard", page: "admin_setup", IconComponent: LayoutDashboard },
    { label: t.navVotersList || "Voters Registry", page: "admin_voters", IconComponent: Users },
    { label: t.navAddCandidate || "Add Candidate", page: "admin_add_candidate", IconComponent: UserPlus },
    { label: t.navRegisterStudent || "Register Student", page: "admin_register", IconComponent: UserCheck },
    { label: t.navCountdown || "Election Settings", page: "admin_election_settings", IconComponent: Clock },
    { label: t.navAuditLogs || "Audit Logs", page: "admin_audit_logs", IconComponent: ShieldAlert },
    { label: t.navLiveResults || "Live Standings", page: "results", IconComponent: BarChart3 },
    { label: t.navDownloadPdf || "Export Results", page: "download_results", IconComponent: FileSpreadsheet },
  ];

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
            backdropFilter: "blur(4px)",
          }}
        />
      )}

      {/* Left Vertical Brand Sidebar Navigation */}
      <aside className={`admin-sidebar ${sidebarOpen ? "open" : ""} ${sidebarCollapsed ? "collapsed" : ""}`}>
        <div className="admin-sidebar-header">
          <div className="admin-logo-wrapper" style={{ overflow: "hidden", padding: 0 }}>
            <img
              src="/logo.png"
              alt="SSLG School Emblem"
              style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }}
            />
          </div>
          <div>
            <h2 className="admin-brand-title">SSLG Console</h2>
            <p className="admin-brand-subtitle">v2.4 • Admin Portal</p>
          </div>
        </div>

        <nav className="admin-sidebar-nav">
          {navItems.map((item) => {
            const isActive = activePage === item.page;
            const Icon = item.IconComponent;
            return (
              <button
                key={item.page}
                className={`admin-nav-item ${isActive ? "active" : ""}`}
                title={item.label}
                onClick={() => {
                  setPage(item.page);
                  setSidebarOpen(false);
                }}
              >
                <Icon size={15} />
                <span>{item.label}</span>
              </button>
            );
          })}

          {/* Settings Section Navigation Item */}
          <button
            className={`admin-nav-item ${settingsOpen ? "active" : ""}`}
            title="Preferences"
            onClick={() => setSettingsOpen(!settingsOpen)}
            style={{ marginTop: "4px" }}
          >
            <Settings size={15} />
            <span>Preferences</span>
            <ChevronDown
              size={14}
              className="admin-nav-chevron"
              style={{
                marginLeft: "auto",
                transform: settingsOpen ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.15s ease",
              }}
            />
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
                      onClick={() => setLanguage(l)}
                    >
                      {l === "en" ? "EN" : l === "tl" ? "TL" : "CEB"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Contact Information */}
              <div>
                <div className="admin-settings-section-title">Support</div>
                <a
                  href="mailto:emjaygusela@gmail.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="admin-sub-link"
                >
                  <Mail size={13} />
                  <span>admin@school.edu</span>
                </a>
                <a href="tel:09168562198" className="admin-sub-link">
                  <Phone size={13} />
                  <span>09168562198</span>
                </a>
              </div>

              {/* About & Policies */}
              <div>
                <div className="admin-settings-section-title">Guidelines</div>
                <button className="admin-sub-link" onClick={() => setActiveModalType("process")}>
                  <Vote size={13} />
                  <span>{t.electionProcess || "Guidelines"}</span>
                </button>
                <button className="admin-sub-link" onClick={() => setActiveModalType("rules")}>
                  <Gavel size={13} />
                  <span>{t.votingRules || "Voting Rules"}</span>
                </button>
                <button className="admin-sub-link" onClick={() => setActiveModalType("privacy")}>
                  <Shield size={13} />
                  <span>{t.privacyPolicy || "Privacy Policy"}</span>
                </button>
                <button className="admin-sub-link" onClick={() => setActiveModalType("terms")}>
                  <FileText size={13} />
                  <span>{t.termsOfService || "Terms"}</span>
                </button>
              </div>
            </div>
          )}
        </nav>

        {/* Sidebar Footer: Admin Profile Badge + Theme Toggle + Logout */}
        <div className="admin-sidebar-footer">
          {/* Admin Profile Chip inside Sidebar */}
          <div className="admin-user-badge-sidebar" title={currentUser?.name || "Faculty Admin"}>
            <div className="admin-avatar-circle-sidebar">
              {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : "A"}
            </div>
            <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
              <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-main)", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {currentUser?.name || "Faculty Admin"}
              </span>
              <span style={{ fontSize: "10.5px", color: "var(--color-success)", fontWeight: 500, display: "flex", alignItems: "center", gap: "4px" }}>
                <span className="live-dot-green" /> Active Admin
              </span>
            </div>
          </div>

          {/* Theme Toggle row inside Sidebar */}
          <div className="sidebar-theme-toggle-row">
            <span>Theme Mode</span>
            <ThemeToggle compact />
          </div>

          <button className="admin-nav-item logout-btn" title="Sign Out" onClick={handleLogout}>
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Dashboard Area */}
      <div className="admin-main-area">
        {/* Top Header Navigation Bar */}
        <header className="admin-top-header">
          <div style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%" }}>
            <button className="admin-mobile-toggle" onClick={handleToggleSidebar} title="Toggle Navigation Sidebar">
              <Menu size={18} />
            </button>

            {/* Global Admin Search Bar */}
            <div className="admin-search-wrapper">
              <Search size={14} style={{ color: "var(--text-light)" }} />
              <input
                type="text"
                placeholder="Search voters or candidates..."
                value={searchTerm || ""}
                onChange={(e) => setSearchTerm && setSearchTerm(e.target.value)}
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
            width: "360px",
            background: "var(--bg-card)",
            borderRadius: "10px",
            boxShadow: "var(--shadow-modal)",
            border: "1px solid var(--border-subtle)",
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            userSelect: isDragging ? "none" : "auto",
            opacity: isModalRendered ? 1 : 0,
            transform: isModalRendered ? "scale(1)" : "scale(0.96)",
            transition: isDragging
              ? "none"
              : "opacity 0.15s ease, transform 0.15s ease",
          }}
        >
          {/* Header Handle */}
          <div
            onMouseDown={handleMouseDown}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "12px 16px",
              background: "var(--bg-surface)",
              borderBottom: "1px solid var(--border-light)",
              cursor: isDragging ? "grabbing" : "grab",
            }}
          >
            <span style={{ color: "var(--accent-primary)", display: "inline-flex" }}>
              <activeModalDetails.IconComponent size={16} />
            </span>
            <h3 style={{ margin: "0", fontSize: "13px", fontWeight: 600, color: "var(--text-main)", flex: 1 }}>
              {activeModalDetails.title}
            </h3>
            <button
              className="close-btn"
              onClick={closeModal}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--text-light)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "2px",
              }}
            >
              <X size={14} />
            </button>
          </div>

          {/* Content Block */}
          <div style={{ padding: "16px", maxHeight: "280px", overflowY: "auto", background: "var(--bg-card)" }}>
            {renderUnifiedBlockContent(activeModalType, activeModalDetails.content)}
          </div>

          {/* Footer Close Button */}
          <div style={{ padding: "10px 16px", borderTop: "1px solid var(--border-light)", background: "var(--bg-surface)" }}>
            <button
              onClick={closeModal}
              style={{
                width: "100%",
                padding: "8px",
                background: "var(--primary-navy)",
                color: "#FFFFFF",
                border: "none",
                borderRadius: "6px",
                fontWeight: 500,
                fontSize: "12.5px",
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

export default AdminLayout;
