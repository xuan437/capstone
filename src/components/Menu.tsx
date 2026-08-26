import React, { useState, useEffect, useRef } from "react";
import { User } from "../types";
import { translations, LanguageCode } from "../utils/translations";
import "./DropdownMenu.css";
import "./PolicyModal.css";

interface MenuProps {
  currentUser: User | null;
  handleLogout: () => void;
}

type ModalType = "process" | "rules" | "privacy" | "terms";

const Menu: React.FC<MenuProps> = ({ currentUser, handleLogout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [lang, setLang] = useState<LanguageCode>(() => {
    const saved = localStorage.getItem("app_lang");
    return (saved === "en" || saved === "tl" || saved === "ceb" ? saved : "en") as LanguageCode;
  });

  const [activeModalType, setActiveModalType] = useState<ModalType | null>(null);
  const [isModalRendered, setIsModalRendered] = useState(false);

  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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

  const changeLanguage = (newLang: LanguageCode) => {
    setLang(newLang);
    localStorage.setItem("app_lang", newLang);
    window.dispatchEvent(new Event("languageChange"));
  };

  const closeModal = () => {
    setIsModalRendered(false);
    setTimeout(() => setActiveModalType(null), 200);
  };

  const t = translations[lang] || {};

  const getSessionLabels = (l: LanguageCode) => {
    switch (l) {
      case "tl":
        return { loggedInAs: "Naka-log in bilang", logout: "Mag-logout" };
      case "ceb":
        return { loggedInAs: "Naka-log in isip", logout: "Mag-logout" };
      default:
        return { loggedInAs: "Logged in as", logout: "Logout" };
    }
  };

  const sessionLabels = getSessionLabels(lang);

  // FIXED: Content elements now have reliable multi-line text string fallbacks to avoid blank windows
  const modalConfig: Record<ModalType, { title: string; content: string; icon: string }> = {
    process: { 
      title: t.electionProcessTitle || "Election Guidelines", 
      content: t.electionProcessContent || "1. Log in with your verified credentials.\n2. Cast your ballot securely.\n3. Confirm submission.", 
      icon: "how_to_vote" 
    },
    rules: { 
      title: t.votingRulesTitle || "System Voting Rules", 
      content: t.votingRulesContent || "1. One verified profile per unique voter.\n2. Complete within active voting hours.\n3. Security bypass attempts will lock session.", 
      icon: "gavel" 
    },
    privacy: { 
      title: t.privacyPolicyTitle || "Privacy & Data Protection", 
      content: t.privacyPolicyContent || "1. Vote data is fully encrypted to maintain anonymity.\n2. Audit logs are collected strictly for system validation.", 
      icon: "shield" 
    },
    terms: { 
      title: t.termsOfServiceTitle || "Terms of Platform Service", 
      content: t.termsOfServiceContent || "1. Intended for authorized organizational voting use.\n2. Automated scripts or disruptive actions are prohibited.", 
      icon: "description" 
    },
  };

  const handleAboutClick = (type: ModalType) => {
    setIsOpen(false);
    setActiveModalType(type);
  };

  const renderUnifiedBlockContent = (type: ModalType, text: string) => {
    if (!text) return null;

    const lines = text.split("\n")
      .map(line => {
        let clean = line.trim();
        clean = clean.replace(/^(\d+[\.\)]|[-*•])\s*/, "");
        return clean;
      })
      .filter(line => line.length > 0);

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {lines.map((line, i) => {
          let theme = { bg: "#F8FAFC", border: "#94A3B8", text: "#334155" };

          if (type === "rules") {
            const ruleThemes = [
              { bg: "#F8FAFC", border: "#94A3B8", text: "#334155" },
              { bg: "#F0FDF4", border: "#BBF7D0", text: "#166534" },
              { bg: "#FEF2F2", border: "#FEE2E2", text: "#991B1B" }
            ];
            theme = ruleThemes[i % ruleThemes.length];
          } else if (type === "process") {
            const processThemes = [
              { bg: "#EFF6FF", border: "#BFDBFE", text: "#1E40AF" },
              { bg: "#F0FDF4", border: "#BBF7D0", text: "#166534" },
              { bg: "#F5F3FF", border: "#DDD6FE", text: "#5B21B6" }
            ];
            theme = processThemes[i % processThemes.length];
          } else if (type === "privacy") {
            const privacyThemes = [
              { bg: "#F0FDFA", border: "#99F6E4", text: "#115E59" },
              { bg: "#F8FAFC", border: "#CBD5E1", text: "#334155" }
            ];
            theme = i === 0 ? privacyThemes[0] : privacyThemes[1];
          } else if (type === "terms") {
            const termsThemes = [
              { bg: "#FFFBEB", border: "#FEF3C7", text: "#92400E" },
              { bg: "#F8FAFC", border: "#CBD5E1", text: "#334155" }
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
                boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
              }}
            >
              <p style={{ 
                margin: "0", 
                fontSize: "14px", 
                lineHeight: "1.5", 
                color: theme.text, 
                textAlign: "left", 
                fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" 
              }}>
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
    <div className="dropdown-container" ref={containerRef} style={{ position: "relative", display: "inline-block", fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" }}>
      <style>{`
        .dropdown-container, .dropdown-menu, .dropdown-item, .lang-btn, .dropdown-section-label, .dropdown-user-name, .close-btn, h3, p, button, a {
          font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
        }
        .dropdown-trigger .chevron {
          transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }
        .dropdown-trigger.active .chevron {
          transform: rotate(180deg) !important;
        }
        .dropdown-item, .lang-btn, .close-btn {
          transition: all 0.15s ease-in-out !important;
        }
        .dropdown-section-label {
          font-weight: 700 !important;
          letter-spacing: 0.05em !important;
          text-transform: uppercase !important;
        }
        .dropdown-user-name {
          font-weight: 600 !important;
        }
        .dropdown-item span {
          font-weight: 500 !important;
        }
      `}</style>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`dropdown-trigger ${isOpen ? "active" : ""}`}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <span className="material-symbols-outlined">menu</span>
        <span className="material-symbols-outlined chevron">expand_more</span>
      </button>

      <div 
        className="dropdown-menu"
        style={{
          display: "block",
          opacity: isOpen ? 1 : 0,
          visibility: isOpen ? "visible" : "hidden",
          transform: isOpen ? "translateY(0) scale(1)" : "translateY(-10px) scale(0.96)",
          transformOrigin: "top right",
          transition: "opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1), transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), visibility 0.2s"
        }}
      >
        {/* Language Selector */}
        <div className="lang-selector-pill">
          {["en", "tl", "ceb"].map((l) => (
            <button
              key={l}
              onClick={() => changeLanguage(l as LanguageCode)}
              className={`lang-btn ${lang === l ? "active" : ""}`}
              style={{ fontWeight: lang === l ? 700 : 500 }}
            >
              {l === "en" ? "English" : l === "tl" ? "Tagalog" : "Bisaya"}
            </button>
          ))}
        </div>

        {/* Contact Section */}
        <div className="dropdown-section">
          <div className="dropdown-section-label">{t.contactSectionTitle || "Contact"}</div>
          <div className="dropdown-list">
            <a href="https://mail.google.com/mail/?view=cm&fs=1&tf=1&to=emjaygusela@gmail.com" target="_blank" rel="noopener noreferrer" className="dropdown-item">
              <span className="material-symbols-outlined dropdown-item-icon">mail</span>
              <span>admin@gmail.com</span>
            </a>
            <a href="tel:09168562198" className="dropdown-item">
              <span className="material-symbols-outlined dropdown-item-icon">call</span>
              <span>09168562198</span>
            </a>
          </div>
        </div>

        {/* About Section */}
        <div className="dropdown-section">
          <div className="dropdown-section-label">{t.aboutSectionTitle || "About Platform"}</div>
          <div className="dropdown-list">
            <button onClick={() => handleAboutClick("process")} className="dropdown-item">
              <span className="material-symbols-outlined dropdown-item-icon">how_to_vote</span>
              <span>{t.electionProcess || "Election Process"}</span>
            </button>
            <button onClick={() => handleAboutClick("rules")} className="dropdown-item">
              <span className="material-symbols-outlined dropdown-item-icon">gavel</span>
              <span>{t.votingRules || "Voting Rules"}</span>
            </button>
            <button onClick={() => handleAboutClick("privacy")} className="dropdown-item">
              <span className="material-symbols-outlined dropdown-item-icon">shield</span>
              <span>{t.privacyPolicy || "Privacy Policy"}</span>
            </button>
            <button onClick={() => handleAboutClick("terms")} className="dropdown-item">
              <span className="material-symbols-outlined dropdown-item-icon">description</span>
              <span>{t.termsOfService || "Terms of Service"}</span>
            </button>
          </div>
        </div>

        {/* Session Data Handling */}
        {currentUser && (
          <div className="dropdown-section">
            <div className="dropdown-user-row">
              <span className="material-symbols-outlined dropdown-user-avatar">account_circle</span>
              <span className="dropdown-user-name">
                {sessionLabels.loggedInAs}: {currentUser.name}
              </span>
            </div>
            <div className="dropdown-list">
              <button
                onClick={() => {
                  setIsOpen(false);
                  handleLogout();
                }}
                className="dropdown-item logout-btn"
              >
                <span className="material-symbols-outlined dropdown-item-icon">logout</span>
                <span style={{ fontWeight: 600 }}>{sessionLabels.logout}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Floating Freely Draggable Framed Screen Portal */}
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
            transition: isDragging ? "none" : "opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1), transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)"
          }}
        >
          {/* Draggable Header Handle */}
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
                fontWeight: 400
              }}
            >
              ×
            </button>
          </div>

          {/* Scrolling Block Card Layout Container */}
          <div style={{ padding: "20px", maxHeight: "320px", overflowY: "auto", background: "#FFFFFF" }}>
            {renderUnifiedBlockContent(activeModalType, activeModalDetails.content)}
          </div>

          {/* Footer Close Actions Bar */}
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
                cursor: "pointer"
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

export default Menu;