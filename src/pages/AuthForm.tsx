import React, { useState, useCallback } from "react";

import { supabase } from "../supabase";
import { User, Student, Admin, Page, ADMIN_IDENTIFIER, ADMIN_PASSWORD } from "../types";

import { CountdownTimer } from "../components/CountdownTimer";

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

    let student: any = null;
    let fetchError: any = null;

    // First attempt authentication using the RPC function (supports hashed passwords)
    const { data: rpcData, error: rpcError } = await supabase.rpc("verify_student_login", {
      student_lrn: identifier,
      input_password: password,
    });

    if (!rpcError && rpcData && rpcData.length > 0) {
      student = rpcData[0];
    } else {
      // Fallback to direct query
      const { data: queryData, error: queryError } = await supabase
        .from("students")
        .select("*")
        .eq("id", identifier)
        .eq("password", password)
        .maybeSingle();

      student = queryData;
      fetchError = queryError;
    }

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
    borderBottom: isActive ? "3px solid var(--primary-navy, #0B1736)" : "3px solid transparent",
    background: "transparent",
    color: isActive ? "var(--primary-navy, #0B1736)" : "#94A3B8",
    fontWeight: isActive ? 700 : 500,
    fontSize: "14px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
  });



  return (
    <div className="split-login-container">
      {/* LEFT PANEL: Login Form & Controls */}
      <div className="login-form-side">
        {/* Real-time Countdown Banner */}
        <CountdownTimer
          onExpire={() => setIsTimerExpired(true)}
          onTimerLoaded={handleTimerLoaded}
        />

        <div className="auth-wrapper card-box" style={{ marginTop: "24px", zIndex: 10, width: "100%", maxWidth: "420px" }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "12px",
              marginBottom: "24px",
            }}
          >
            <img
              src="/logo.png"
              alt="School Logo"
              style={{
                width: "140px",
                height: "140px",
                borderRadius: "50%",
                border: "3px solid var(--border-light)",
                objectFit: "cover",
              }}
            />
            <h2 style={{ margin: 0, textAlign: "center" }}>Student Voting System</h2>
          </div>

          {/* Login Tabs */}
          <div
            style={{
              display: "flex",
              borderBottom: "1px solid var(--border-light, #E2E8F0)",
              marginBottom: "24px",
            }}
          >
            <button style={tabStyle(activeTab === "student")} onClick={() => switchTab("student")}>
              <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>school</span>
              Student
            </button>
            <button style={tabStyle(activeTab === "faculty")} onClick={() => switchTab("faculty")}>
              <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>badge</span>
              Faculty
            </button>
          </div>

          {error && (
            <div
              style={{
                color: "#D92D20",
                background: "#FEF3F2",
                padding: "12px",
                borderRadius: "8px",
                fontSize: "12px",
                marginBottom: "16px",
                fontWeight: 600,
              }}
            >
              {error}
            </div>
          )}

          {activeTab === "student" ? (
            <>
              {isTimerExpired && (
                <div style={{ color: "#EF4444", background: "#FEF2F2", border: "1px solid #FEE2E2", borderRadius: "8px", padding: "12px", fontSize: "13px", fontWeight: 600, textAlign: "center", marginBottom: "16px" }}>
                  Student voting has ended. Login is closed.
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "24px" }}>
                <input name="identifier" aria-label="LRN Identifier" placeholder="LRN" value={form.identifier} onChange={handleChange} disabled={isTimerExpired} autoComplete="off" />
                <input
                  name="password"
                  type="password"
                  aria-label="Student Password"
                  placeholder="Password"
                  value={form.password}
                  onChange={handleChange}
                  disabled={isTimerExpired}
                  onCopy={blockClipboard}
                  onCut={blockClipboard}
                  onPaste={blockClipboard}
                  autoComplete="off"
                />
              </div>
              <button className="btn-primary" onClick={handleStudentLogin} disabled={loading || isTimerExpired}>
                {loading ? "Processing..." : "Login as Student"}
              </button>
            </>
          ) : (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "24px" }}>
                <input name="email" aria-label="Faculty Email" placeholder="Email" value={facultyForm.email} onChange={handleFacultyChange} autoComplete="off" />
                <input
                  name="password"
                  type="password"
                  aria-label="Faculty Password"
                  placeholder="Password"
                  value={facultyForm.password}
                  onChange={handleFacultyChange}
                  onCopy={blockClipboard}
                  onCut={blockClipboard}
                  onPaste={blockClipboard}
                  autoComplete="off"
                />
              </div>
              <button className="btn-primary" onClick={handleFacultyLogin} disabled={loading}>
                {loading ? "Processing..." : "Login as Faculty"}
              </button>
            </>
          )}
        </div>
      </div>



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