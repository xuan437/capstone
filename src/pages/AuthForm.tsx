import React, { useState, useCallback } from "react";

import { supabase } from "../supabase";
import { User, Student, Admin, Page, ADMIN_IDENTIFIER, ADMIN_PASSWORD } from "../types";

import { CountdownTimer } from "../components/CountdownTimer";
import { ThemeToggle } from "../components/ThemeToggle";

import "./AuthForm.css";



const AuthForm: React.FC<{
  setPage: (p: Page) => void;
  setCurrentUser: (u: User) => void;
}> = ({ setPage, setCurrentUser }) => {
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
            <h2 className="split-form-title">LOGIN</h2>
          </div>

          {/* Login Tabs */}
          <div style={{ display: "flex", width: "100%", borderBottom: "2px solid #E2E8F0", marginBottom: "20px" }}>
            <button style={tabStyle(activeTab === "student")} onClick={() => switchTab("student")}>
              <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>school</span>
              Student
            </button>
            <button style={tabStyle(activeTab === "faculty")} onClick={() => switchTab("faculty")}>
              <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>badge</span>
              Faculty
            </button>
          </div>

          {error && (
            <div style={{ color: "#D92D20", background: "#FEF3F2", padding: "10px 14px", borderRadius: "8px", fontSize: "12.5px", marginBottom: "16px", fontWeight: 600, border: "1px solid #FEE2E2", width: "100%", boxSizing: "border-box" }}>
              {error}
            </div>
          )}

          {activeTab === "student" ? (
            <>
              {isTimerExpired && (
                <div style={{ color: "#EF4444", background: "#FEF2F2", border: "1px solid #FEE2E2", borderRadius: "8px", padding: "10px 14px", fontSize: "13px", fontWeight: 600, textAlign: "center", marginBottom: "16px", width: "100%", boxSizing: "border-box" }}>
                  Student voting has ended. Login is closed.
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: "14px", width: "100%", marginBottom: "16px" }}>
                <div className="input-with-icon-wrapper">
                  <span className="material-symbols-outlined input-icon-prefix">person</span>
                  <input
                    name="identifier"
                    aria-label="LRN Identifier"
                    placeholder="LRN"
                    className="split-input-field"
                    value={form.identifier}
                    onChange={handleChange}
                    disabled={isTimerExpired}
                    autoComplete="off"
                  />
                </div>

                <div className="input-with-icon-wrapper">
                  <span className="material-symbols-outlined input-icon-prefix">lock</span>
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    aria-label="Student Password"
                    placeholder="Password"
                    className="split-input-field"
                    style={{ paddingRight: "40px" }}
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
                    style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#64748B", display: "flex", alignItems: "center" }}
                    title={showPassword ? "Hide Password" : "Show Password"}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                      {showPassword ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>
              </div>

              {/* Login Now Pill Button matching screenshot */}
              <button
                className="btn-login-now-pill"
                onClick={handleStudentLogin}
                disabled={loading || isTimerExpired}
              >
                {loading ? "Authenticating..." : "Login Now"}
              </button>
            </>
          ) : (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: "14px", width: "100%", marginBottom: "16px" }}>
                <div className="input-with-icon-wrapper">
                  <span className="material-symbols-outlined input-icon-prefix">mail</span>
                  <input
                    name="email"
                    aria-label="Faculty Email"
                    placeholder="Email"
                    className="split-input-field"
                    value={facultyForm.email}
                    onChange={handleFacultyChange}
                    autoComplete="off"
                  />
                </div>

                <div className="input-with-icon-wrapper">
                  <span className="material-symbols-outlined input-icon-prefix">lock</span>
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    aria-label="Faculty Password"
                    placeholder="Password"
                    className="split-input-field"
                    style={{ paddingRight: "40px" }}
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
                    style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#64748B", display: "flex", alignItems: "center" }}
                    title={showPassword ? "Hide Password" : "Show Password"}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                      {showPassword ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>
              </div>

              {/* Login Now Pill Button matching screenshot */}
              <button
                className="btn-login-now-pill"
                onClick={handleFacultyLogin}
                disabled={loading}
              >
                {loading ? "Authenticating..." : "Login Now"}
              </button>
            </>
          )}

          {/* Status Banner UNDER Login Now button as requested */}
          <div className={isTimerExpired ? "under-login-status-banner closed" : "under-login-status-banner open"}>
            <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
              {isTimerExpired ? "block" : "how_to_vote"}
            </span>
            <span>{isTimerExpired ? "ELECTION CLOSED" : "ELECTION IS OPEN - VOTE NOW!"}</span>
          </div>

          {/* Links Below */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px", marginTop: "20px", flexWrap: "wrap", justifyContent: "center" }}>
            <button
              type="button"
              onClick={() => setShowForgotPasswordModal(true)}
              style={{ background: "none", border: "none", color: "var(--primary-navy, #0A192F)", fontSize: "12.5px", fontWeight: 600, cursor: "pointer" }}
            >
              Forgot Password / Help
            </button>
            <span style={{ color: "#CBD5E1" }}>•</span>
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