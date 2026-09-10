import React, { useState, useCallback } from "react";

import { supabase } from "../supabase";
import { User, Student, Admin, Page, ADMIN_IDENTIFIER, ADMIN_PASSWORD } from "../types";

import { CountdownTimer } from "../components/CountdownTimer";
import { ThemeToggle } from "../components/ThemeToggle";
import { useLanguage } from "../context/LanguageContext";

import "./AuthForm.css";

const AuthForm: React.FC<{
  setPage: (p: Page) => void;
  setCurrentUser: (u: User) => void;
}> = ({ setPage, setCurrentUser }) => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<"student" | "faculty">("student");
  const [form, setForm] = useState({ identifier: "", password: "" });
  const [facultyForm, setFacultyForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [clipboardAlert, setClipboardAlert] = useState(false);

  // Candidates drawer removed


  // Countdown timer states
  const [isTimerExpired, setIsTimerExpired] = useState(false);

  // Use callback to stabilize listeners sent down to children
  const handleTimerLoaded = useCallback((endTime: string | null) => {
    if (endTime) {
      setIsTimerExpired(new Date() >= new Date(endTime));
    } else {
      setIsTimerExpired(false);
    }
  }, []);

  const blockClipboard = (e: React.ClipboardEvent) => {
    e.preventDefault();
    setClipboardAlert(true);
    setTimeout(() => setClipboardAlert(false), 3000);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleFacultyChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => setFacultyForm({ ...facultyForm, [e.target.name]: e.target.value });

  const switchTab = (tab: "student" | "faculty") => {
    setActiveTab(tab);
    setError("");
  };

  const handleStudentLogin = async () => {
    if (isTimerExpired) {
      setError("Election period has ended. Student voting is now closed.");
      return;
    }
    setLoading(true);
    setError("");
    const identifier = form.identifier.trim();
    const password = form.password.trim();

    if (!/^\d{12}$/.test(identifier)) {
      setError("LRN must be exactly 12 digits (numbers only).");
      setLoading(false);
      return;
    }

    // Direct plain-text password query & string comparison
    const { data: student, error: fetchError } = await supabase
      .from("students")
      .select("*")
      .eq("id", identifier)
      .eq("password", password)
      .maybeSingle();

    if (fetchError) {
      console.error("Student login error:", fetchError);
      setError(`Login failed: ${fetchError.message}`);
      setLoading(false);
      return;
    }

    if (!student) {
      setError("Invalid LRN credentials. Please try again.");
      setLoading(false);
      return;
    }

    const studentUser: Student = {
      ...student,
      id: String(student.id)
    };

    localStorage.setItem("currentUser", JSON.stringify(studentUser));
    setCurrentUser(studentUser);
    setPage(studentUser.has_voted ? "confirm" : "ballot");
    setLoading(false);
  };

  const handleFacultyLogin = () => {
    setLoading(true);
    setError("");
    const { email, password } = facultyForm;

    if (email === ADMIN_IDENTIFIER && password === ADMIN_PASSWORD) {
      const adminUser: Admin = { name: "Faculty Admin", id: "admin", isAdmin: true };
      localStorage.setItem("currentUser", JSON.stringify(adminUser));
      setCurrentUser(adminUser);
      setLoading(false);
      setPage("admin_setup");
    } else {
      setError("Invalid faculty credentials. Please try again.");
      setLoading(false);
    }
  };

  const tabStyle = (isActive: boolean): React.CSSProperties => ({
    flex: 1,
    padding: "12px 0",
    border: "none",
    borderBottom: isActive ? "3px solid var(--primary-navy, #0A192F)" : "3px solid transparent",
    background: "transparent",
    color: isActive ? "var(--primary-navy, #0A192F)" : "#94A3B8",
    fontWeight: isActive ? 700 : 500,
    fontSize: "14px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
  });



  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);

  return (
    <div className="split-card-portal-container">
      {/* 2-Panel Split Container Card matching uploaded screenshot */}
      <div className="split-card-wrapper">
        {/* LEFT PANEL: Login Credentials Form */}
        <div className="split-left-section">
          {/* Header */}
          <div className="split-form-header">
            <h2 className="split-form-title">PORTAL LOGIN</h2>
            <p className="split-form-subtitle">Enter your credentials to access your voting ballot</p>
          </div>

          {/* Clean Segmented Pill Tabs */}
          <div className="login-tab-pill-container">
            <button
              type="button"
              className={`login-tab-btn ${activeTab === "student" ? "active" : ""}`}
              onClick={() => switchTab("student")}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>school</span>
              <span>Student</span>
            </button>
            <button
              type="button"
              className={`login-tab-btn ${activeTab === "faculty" ? "active" : ""}`}
              onClick={() => switchTab("faculty")}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>badge</span>
              <span>Faculty</span>
            </button>
          </div>

          {error && (
            <div className="login-error-alert">
              <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>error</span>
              <span>{error}</span>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              activeTab === "student" ? handleStudentLogin() : handleFacultyLogin();
            }}
            style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}
          >
            {activeTab === "student" ? (
              <>
                {isTimerExpired && (
                  <div className="login-expired-alert">
                    Student voting has ended. Login is closed.
                  </div>
                )}

                <div className="login-fields-stack">
                  <div className="login-field-group">
                    <label className="login-field-label">Learner Reference Number (LRN)</label>
                    <div className="input-with-icon-wrapper">
                      <span className="material-symbols-outlined input-icon-prefix">person</span>
                      <input
                        name="identifier"
                        aria-label="LRN Identifier"
                        placeholder="Enter 12-digit LRN"
                        className="split-input-field"
                        value={form.identifier}
                        onChange={handleChange}
                        disabled={isTimerExpired}
                        autoComplete="off"
                        maxLength={12}
                      />
                    </div>
                  </div>

                  <div className="login-field-group">
                    <label className="login-field-label">Password</label>
                    <div className="input-with-icon-wrapper">
                      <span className="material-symbols-outlined input-icon-prefix">lock</span>
                      <input
                        name="password"
                        type={showPassword ? "text" : "password"}
                        aria-label="Student Password"
                        placeholder="Enter your password"
                        className="split-input-field"
                        value={form.password}
                        onChange={handleChange}
                        disabled={isTimerExpired}
                        onCopy={blockClipboard}
                        onCut={blockClipboard}
                        onPaste={blockClipboard}
                        autoComplete="off"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="password-toggle-btn"
                        title={showPassword ? "Hide Password" : "Show Password"}
                      >
                        <span className="material-symbols-outlined">
                          {showPassword ? "visibility_off" : "visibility"}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn-login-now-pill"
                  disabled={loading || isTimerExpired}
                >
                  <span>{loading ? "Authenticating..." : "Login Now"}</span>
                  <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>arrow_forward</span>
                </button>
              </>
            ) : (
              <>
                <div className="login-fields-stack">
                  <div className="login-field-group">
                    <label className="login-field-label">Faculty / Admin Email</label>
                    <div className="input-with-icon-wrapper">
                      <span className="material-symbols-outlined input-icon-prefix">mail</span>
                      <input
                        name="email"
                        aria-label="Faculty Email"
                        placeholder="Enter admin email"
                        className="split-input-field"
                        value={facultyForm.email}
                        onChange={handleFacultyChange}
                        autoComplete="off"
                      />
                    </div>
                  </div>

                  <div className="login-field-group">
                    <label className="login-field-label">Password</label>
                    <div className="input-with-icon-wrapper">
                      <span className="material-symbols-outlined input-icon-prefix">lock</span>
                      <input
                        name="password"
                        type={showPassword ? "text" : "password"}
                        aria-label="Faculty Password"
                        placeholder="Enter admin password"
                        className="split-input-field"
                        value={facultyForm.password}
                        onChange={handleFacultyChange}
                        onCopy={blockClipboard}
                        onCut={blockClipboard}
                        onPaste={blockClipboard}
                        autoComplete="off"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="password-toggle-btn"
                        title={showPassword ? "Hide Password" : "Show Password"}
                      >
                        <span className="material-symbols-outlined">
                          {showPassword ? "visibility_off" : "visibility"}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn-login-now-pill"
                  disabled={loading}
                >
                  <span>{loading ? "Authenticating..." : "Login Now"}</span>
                  <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>arrow_forward</span>
                </button>
              </>
            )}
          </form>

          {/* Status Banner UNDER Login Now button */}
          <div className={isTimerExpired ? "under-login-status-banner closed" : "under-login-status-banner open"}>
            <span className="status-live-dot" />
            <span>{isTimerExpired ? "ELECTION CLOSED" : "ELECTION IS OPEN — VOTE NOW"}</span>
          </div>

          {/* Secondary Actions Row */}
          <div className="login-footer-actions">
            <button
              type="button"
              className="login-help-link"
              onClick={() => setShowForgotPasswordModal(true)}
            >
              Forgot Password / Help
            </button>
            <span className="login-footer-divider">•</span>
            <ThemeToggle compact />
          </div>
        </div>

        {/* RIGHT PANEL: Real-time Countdown Timer Banner */}
        <div className="split-right-section">
          <div className="timer-card-glass">
            <img
              src="/logo.png"
              alt="School Logo"
              style={{ width: "76px", height: "76px", borderRadius: "50%", border: "3px solid #FFFFFF", objectFit: "cover", marginBottom: "14px", boxShadow: "0 4px 14px rgba(0,0,0,0.2)" }}
            />
            <h3 style={{ margin: "0 0 4px 0", fontSize: "18px", fontWeight: 800, color: "#FFFFFF" }}>
              Student Voting System
            </h3>
            <p style={{ margin: "0 0 20px 0", fontSize: "12px", color: "#94A3B8" }}>
              Official SSLG Student Council Elections
            </p>

            {/* Countdown Timer Block on the Right */}
            <div style={{ width: "100%", background: "rgba(255, 255, 255, 0.95)", borderRadius: "14px", padding: "16px", color: "#0F172A", boxShadow: "0 8px 24px rgba(0, 0, 0, 0.15)" }}>
              <CountdownTimer
                onExpire={() => setIsTimerExpired(true)}
                onTimerLoaded={handleTimerLoaded}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password / Help Modal */}
      {showForgotPasswordModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            zIndex: 99999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            boxSizing: "border-box",
          }}
          onClick={() => setShowForgotPasswordModal(false)}
        >
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: "20px",
              padding: "32px",
              maxWidth: "460px",
              width: "100%",
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.2)",
              position: "relative",
              boxSizing: "border-box",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", borderBottom: "1px solid #E2E8F0", paddingBottom: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span className="material-symbols-outlined" style={{ color: "var(--primary-navy, #0A192F)", fontSize: "24px" }}>help_center</span>
                <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "var(--primary-navy, #0A192F)" }}>
                  How to Get Your Password
                </h3>
              </div>
              <button
                onClick={() => setShowForgotPasswordModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748B", display: "flex", alignItems: "center" }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "22px" }}>close</span>
              </button>
            </div>

            <p style={{ margin: "0 0 20px 0", fontSize: "13px", color: "#475569", lineHeight: 1.5 }}>
              Follow these steps to retrieve your plain-text password or voting access key:
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "24px" }}>
              <div style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
                <div style={{ background: "#F1F5F9", color: "var(--primary-navy, #0A192F)", width: "28px", height: "28px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "13px", flexShrink: 0 }}>
                  1
                </div>
                <div>
                  <div style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--primary-navy, #0A192F)", marginBottom: "2px" }}>
                    Contact Your Class Adviser
                  </div>
                  <div style={{ fontSize: "12.5px", color: "#64748B", lineHeight: 1.4 }}>
                    Reach out to your section Class Adviser or SSLG Comelec Representative.
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
                <div style={{ background: "#F1F5F9", color: "var(--primary-navy, #0A192F)", width: "28px", height: "28px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "13px", flexShrink: 0 }}>
                  2
                </div>
                <div>
                  <div style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--primary-navy, #0A192F)", marginBottom: "2px" }}>
                    Provide Your 12-Digit LRN
                  </div>
                  <div style={{ fontSize: "12.5px", color: "#64748B", lineHeight: 1.4 }}>
                    Present your 12-digit Learner Reference Number and Student ID for identity verification.
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
                <div style={{ background: "#F1F5F9", color: "var(--primary-navy, #0A192F)", width: "28px", height: "28px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "13px", flexShrink: 0 }}>
                  3
                </div>
                <div>
                  <div style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--primary-navy, #0A192F)", marginBottom: "2px" }}>
                    Receive Your Plain-Text Access Key
                  </div>
                  <div style={{ fontSize: "12.5px", color: "#64748B", lineHeight: 1.4 }}>
                    Your Adviser will provide your assigned password (e.g. <code style={{ background: "#F1F5F9", padding: "2px 6px", borderRadius: "4px", fontWeight: 700, color: "var(--primary-navy, #0A192F)" }}>123456</code>).
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
                <div style={{ background: "#F1F5F9", color: "var(--primary-navy, #0A192F)", width: "28px", height: "28px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "13px", flexShrink: 0 }}>
                  4
                </div>
                <div>
                  <div style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--primary-navy, #0A192F)", marginBottom: "2px" }}>
                    Login & Cast Your Ballot
                  </div>
                  <div style={{ fontSize: "12.5px", color: "#64748B", lineHeight: 1.4 }}>
                    Enter your LRN and password in the login portal above to open your ballot.
                  </div>
                </div>
              </div>
            </div>

            <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "10px", padding: "12px 14px", fontSize: "12px", color: "#475569", lineHeight: 1.5, marginBottom: "20px" }}>
              <strong>📌 Admin Note:</strong> Faculty admins can export the full printable password list from <em>Admin Dashboard → Voters List → Export PDF</em>.
            </div>

            <button
              onClick={() => setShowForgotPasswordModal(false)}
              className="btn-royal-blue"
              style={{ width: "100%", padding: "12px" }}
            >
              Got It, Thanks!
            </button>
          </div>
        </div>
      )}

      {/* Clipboard Security Toast */}
      {clipboardAlert && (
        <div style={{
          position: "fixed",
          bottom: "24px",
          left: "50%",
          transform: "translateX(-50%)",
          background: "#FFFFFF",
          color: "#DC2626",
          border: "1px solid #000000",
          padding: "6px 10px",
          borderRadius: "4px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          fontSize: "11px",
          fontWeight: 650,
          zIndex: 99999,
          animation: "slideUpIn 0.22s ease",
          whiteSpace: "nowrap",
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: "14px", color: "#DC2626" }}>block</span>
          <span>Invalid Action</span>
        </div>
      )}
    </div>
  );
};

export default AuthForm;