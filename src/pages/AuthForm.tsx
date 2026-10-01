import React, { useState, useCallback, useEffect } from "react";
import { supabase } from "../supabase";
import { User, Student, Admin, Page, ADMIN_IDENTIFIER, ADMIN_PASSWORD } from "../types";
import { CountdownTimer } from "../components/CountdownTimer";
import { ThemeToggle } from "../components/ThemeToggle";
import "./AuthForm.css";

// Crisp 14px-16px SVG Micro Icons (Linear / Raycast Style)
const UserIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const LockIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const MailIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
);

const EyeIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
    <path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
    <line x1="2" y1="2" x2="22" y2="22" />
  </svg>
);

const GraduationCapIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
    <path d="M6 12v5c3 3 9 3 12 0v-5" />
  </svg>
);

const ShieldBadgeIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </svg>
);

const AlertCircleIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const HelpCircleIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const CloseIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const BanIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
  </svg>
);

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
  const [isTimerExpired, setIsTimerExpired] = useState(false);
  const [isCountdownActive, setIsCountdownActive] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  useEffect(() => {
    if (lockoutSeconds <= 0) return;

    const timer = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) {
          setFailedAttempts(0);
          setError("");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [lockoutSeconds]);

  const handleTimerLoaded = useCallback((endTime: string | null) => {
    if (endTime) {
      const expired = new Date() >= new Date(endTime);
      setIsTimerExpired(expired);
      setIsCountdownActive(!expired);
    } else {
      setIsTimerExpired(false);
      setIsCountdownActive(false);
    }
  }, []);

  const blockClipboard = (e: React.ClipboardEvent) => {
    e.preventDefault();
    setClipboardAlert(true);
    setTimeout(() => setClipboardAlert(false), 3000);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleFacultyChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setFacultyForm({ ...facultyForm, [e.target.name]: e.target.value });

  const switchTab = (tab: "student" | "faculty") => {
    setActiveTab(tab);
    setError("");
  };

  const handleStudentLogin = async () => {
    if (isTimerExpired) {
      setError("Election period has ended. Student voting is now closed.");
      return;
    }

    if (lockoutSeconds > 0) {
      setError(`Too many failed login attempts. Please wait ${lockoutSeconds} seconds to try again.`);
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
      const nextAttempts = failedAttempts + 1;
      setFailedAttempts(nextAttempts);

      if (nextAttempts >= 3) {
        setLockoutSeconds(15);
        setError("Too many failed password attempts. Please wait 15 seconds to try again.");
      } else {
        const remaining = 3 - nextAttempts;
        setError(`Invalid LRN or password. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining before temporary 15s lockout.`);
      }
      setLoading(false);
      return;
    }

    setFailedAttempts(0);
    setLockoutSeconds(0);

    const studentUser: Student = {
      ...student,
      id: String(student.id),
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
    const cleanEmail = email.trim().toLowerCase();

    if (
      (cleanEmail === ADMIN_IDENTIFIER.toLowerCase() ||
        cleanEmail === "admin@gmail.com" ||
        cleanEmail === "admin@school.edu.ph" ||
        cleanEmail === "admin@school.edu") &&
      password === ADMIN_PASSWORD
    ) {
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

  return (
    <div className="linear-portal-viewport">
      {/* Subtle Background Surface Grid Effect */}
      <div className="linear-grid-overlay" />

      {/* Main Glassmorphic Container Card */}
      <div className="linear-portal-card">

        {/* LEFT PANEL: Compact High-Density Form */}
        <div className="linear-form-panel">

          {/* Top Brand Header */}
          <div className="linear-brand-header">
            <div className="linear-header-text">
              <h1 className="linear-title">Portal Login</h1>
              <p className="linear-subtitle">Access your SSLG voting ballot securely</p>
            </div>
          </div>

          {/* Segmented Pill Tabs */}
          <div className="linear-tab-segmented">
            <button
              type="button"
              className={`linear-tab-item ${activeTab === "student" ? "active" : ""}`}
              onClick={() => switchTab("student")}
            >
              <GraduationCapIcon />
              <span>Student</span>
            </button>
            <button
              type="button"
              className={`linear-tab-item ${activeTab === "faculty" ? "active" : ""}`}
              onClick={() => switchTab("faculty")}
            >
              <ShieldBadgeIcon />
              <span>Faculty Admin</span>
            </button>
          </div>

          {/* Alert Notification Badge */}
          {error && (
            <div className="linear-alert-badge error">
              <AlertCircleIcon />
              <span>{error}</span>
            </div>
          )}

          {/* Form Controls */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              activeTab === "student" ? handleStudentLogin() : handleFacultyLogin();
            }}
            className="linear-form-body"
          >
            {activeTab === "student" ? (
              <>
                {isTimerExpired ? (
                  <div className="linear-alert-badge warning">
                    <BanIcon />
                    <span>Student voting is currently closed.</span>
                  </div>
                ) : lockoutSeconds > 0 ? (
                  <div className="linear-alert-badge warning">
                    <BanIcon />
                    <span>Too many failed attempts. Try again in {lockoutSeconds}s.</span>
                  </div>
                ) : null}

                <div className="linear-field-stack">
                  <div className="linear-field-group">
                    <label className="linear-field-label">
                      Learner Reference Number (LRN)
                    </label>
                    <div className="linear-input-wrapper">
                      <span className="linear-input-icon">
                        <UserIcon />
                      </span>
                      <input
                        name="identifier"
                        aria-label="LRN Identifier"
                        placeholder="Enter 12-digit LRN"
                        className="linear-input"
                        value={form.identifier}
                        onChange={handleChange}
                        disabled={isTimerExpired || lockoutSeconds > 0}
                        autoComplete="off"
                        maxLength={12}
                      />
                    </div>
                  </div>

                  <div className="linear-field-group">
                    <label className="linear-field-label">Password</label>
                    <div className="linear-input-wrapper">
                      <span className="linear-input-icon">
                        <LockIcon />
                      </span>
                      <input
                        name="password"
                        type={showPassword ? "text" : "password"}
                        aria-label="Student Password"
                        placeholder="Enter password"
                        className="linear-input"
                        value={form.password}
                        onChange={handleChange}
                        disabled={isTimerExpired || lockoutSeconds > 0}
                        onCopy={blockClipboard}
                        onCut={blockClipboard}
                        onPaste={blockClipboard}
                        autoComplete="off"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="linear-input-action"
                        title={showPassword ? "Hide password" : "Show password"}
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="linear-btn-primary"
                  disabled={loading || isTimerExpired || lockoutSeconds > 0}
                >
                  <span>
                    {lockoutSeconds > 0
                      ? `Locked Out (${lockoutSeconds}s)`
                      : loading
                      ? "Authenticating..."
                      : "Continue to Ballot"}
                  </span>
                  <ArrowRightIcon />
                </button>
              </>
            ) : (
              <>
                <div className="linear-field-stack">
                  <div className="linear-field-group">
                    <label className="linear-field-label">Faculty / Admin Email</label>
                    <div className="linear-input-wrapper">
                      <span className="linear-input-icon">
                        <MailIcon />
                      </span>
                      <input
                        name="email"
                        aria-label="Faculty Email"
                        placeholder="Admin Email"
                        className="linear-input"
                        value={facultyForm.email}
                        onChange={handleFacultyChange}
                        autoComplete="off"
                      />
                    </div>
                  </div>

                  <div className="linear-field-group">
                    <label className="linear-field-label">Password</label>
                    <div className="linear-input-wrapper">
                      <span className="linear-input-icon">
                        <LockIcon />
                      </span>
                      <input
                        name="password"
                        type={showPassword ? "text" : "password"}
                        aria-label="Faculty Password"
                        placeholder="Enter admin password"
                        className="linear-input"
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
                        className="linear-input-action"
                        title={showPassword ? "Hide password" : "Show password"}
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="linear-btn-primary"
                  disabled={loading}
                >
                  <span>{loading ? "Authenticating..." : "Access Admin Console"}</span>
                  <ArrowRightIcon />
                </button>
              </>
            )}
          </form>

          {/* Live Status Badge */}
          <div className={`linear-status-row ${isTimerExpired ? "closed" : "active"}`}>
            <span className="linear-status-pulse" />
            <span className="linear-status-text">
              {isTimerExpired ? "Election Period Closed" : "Election Live • Voting Open"}
            </span>
          </div>

          {/* Footer Toolbar */}
          <div className="linear-footer-toolbar">
            <button
              type="button"
              className="linear-link-button"
              onClick={() => setShowForgotPasswordModal(true)}
            >
              <HelpCircleIcon />
              <span>Password Help</span>
            </button>

            <div className="linear-toolbar-divider" />

            <ThemeToggle compact />
          </div>
        </div>

        {/* RIGHT PANEL: High-Precision Raycast/Vercel Timer & Branding Display */}
        <div className="linear-info-panel">
          <div className="linear-info-inner">
            <div className={`linear-avatar-ring ${!isCountdownActive ? "large-logo" : ""}`}>
              <img
                src="/logo.png"
                alt="School Emblem"
                className="linear-school-logo"
              />
            </div>

            <div className="linear-info-heading">
              <h2 className="linear-info-title">Student Voting System</h2>
              <p className="linear-info-subtitle">Official SSLG Supreme Secondary Learner Government</p>
            </div>

            {/* Glass Timer Card Container */}
            <div className="linear-timer-card">
              <CountdownTimer
                onExpire={() => {
                  setIsTimerExpired(true);
                  setIsCountdownActive(false);
                }}
                onTimerLoaded={handleTimerLoaded}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Raycast-style Command Dialog / Help Modal */}
      {showForgotPasswordModal && (
        <div
          className="linear-modal-backdrop"
          onClick={() => setShowForgotPasswordModal(false)}
        >
          <div
            className="linear-modal-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="linear-modal-header">
              <div className="linear-modal-title-group">
                <HelpCircleIcon />
                <h3>How to Retrieve Your Voting Password</h3>
              </div>
              <button
                className="linear-modal-close-btn"
                onClick={() => setShowForgotPasswordModal(false)}
                aria-label="Close dialog"
              >
                <CloseIcon />
              </button>
            </div>

            <p className="linear-modal-description">
              Follow these simple steps to obtain your plain-text voter password or voting access key:
            </p>

            <div className="linear-steps-list">
              <div className="linear-step-item">
                <div className="linear-step-number">01</div>
                <div className="linear-step-content">
                  <div className="linear-step-title">Contact Class Adviser</div>
                  <div className="linear-step-desc">
                    Reach out to your section Adviser or SSLG Comelec Representative.
                  </div>
                </div>
              </div>

              <div className="linear-step-item">
                <div className="linear-step-number">02</div>
                <div className="linear-step-content">
                  <div className="linear-step-title">Provide 12-Digit LRN</div>
                  <div className="linear-step-desc">
                    Present your 12-digit Learner Reference Number and Student ID card.
                  </div>
                </div>
              </div>

              <div className="linear-step-item">
                <div className="linear-step-number">03</div>
                <div className="linear-step-content">
                  <div className="linear-step-title">Receive Plain-Text Key</div>
                  <div className="linear-step-desc">
                    Your Adviser will look up your voter account and give you your access key (e.g. <code className="linear-code-chip">123456</code>).
                  </div>
                </div>
              </div>

              <div className="linear-step-item">
                <div className="linear-step-number">04</div>
                <div className="linear-step-content">
                  <div className="linear-step-title">Cast Your Vote</div>
                  <div className="linear-step-desc">
                    Return to this portal, enter your LRN & password, and cast your vote!
                  </div>
                </div>
              </div>
            </div>

            <div className="linear-modal-tip">
              <strong>Note for Faculty:</strong> Admin voters list export containing credentials is available in the <em>Admin Console → Voters List</em>.
            </div>

            <button
              onClick={() => setShowForgotPasswordModal(false)}
              className="linear-btn-primary full-width"
            >
              Understand & Return
            </button>
          </div>
        </div>
      )}

      {/* Floating Micro-Toast for Restricted Clipboard */}
      {clipboardAlert && (
        <div className="linear-toast-notification">
          <BanIcon />
          <span>Clipboard actions restricted for secure input fields</span>
        </div>
      )}
    </div>
  );
};

export default AuthForm;