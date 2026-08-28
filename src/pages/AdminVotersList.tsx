import React, { useState, useEffect, useRef } from "react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { supabase } from "../supabase";
import "./AdminVotersList.css";
import type { Student, Page } from "../types";
import { base64ToImageUrl } from "../utils/imageUtils";
import BubbleLoader from "../components/BubbleLoader";
import { useLanguage } from "../context/LanguageContext";

const AdminVotersList: React.FC<{
  setPage: (p: Page) => void;
  onViewProfile: (id: string) => void;
  searchTerm?: string;
  setSearchTerm?: (term: string) => void;
}> = ({ setPage: _setPage, onViewProfile, searchTerm: propSearchTerm, setSearchTerm: propSetSearchTerm }) => {
  const { t } = useLanguage();
  const [students, setStudents] = useState<Student[]>([]);
  const [localSearchTerm, setLocalSearchTerm] = useState<string>("");
  const [gradeFilter, setGradeFilter] = useState<string>("All");

  const searchTerm = propSearchTerm !== undefined ? propSearchTerm : localSearchTerm;
  const handleSearchChange = (val: string) => {
    setLocalSearchTerm(val);
    if (propSetSearchTerm) propSetSearchTerm(val);
  };
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [loading, setLoading] = useState(true);
  const [showPdfAuth, setShowPdfAuth] = useState(false);
  const [pdfAuthInput, setPdfAuthInput] = useState("");
  const [pdfAuthError, setPdfAuthError] = useState("");
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [isExporting, setIsExporting] = useState(false);
  const pdfPrintRef = useRef<HTMLDivElement>(null);

  const toggleShowPassword = (id: string) => {
    setShowPasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const fetchStudentsWithVotes = async (_?: any) => {
    setLoading(true);
    try {
      const { data: studentsData, error: studentsError } = await supabase
        .from("students")
        .select("*")
        .order("name");

      if (studentsError) {
        console.error("Error fetching students:", studentsError);
        setStudents([]);
        return;
      }

      const { data: votesData, error: votesError } = await supabase
        .from("votes")
        .select("student_id, voted_at, location");

      if (votesError) {
        console.warn("Votes fetch warning:", votesError);
      }

      // Map votes metadata by student_id
      const votesMap: Record<string, { voted_at?: string; location?: string }> = {};
      (votesData || []).forEach((v: any) => {
        if (v.student_id && !votesMap[v.student_id]) {
          votesMap[v.student_id] = { voted_at: v.voted_at, location: v.location };
        }
      });

      const votedSet = new Set(
        (votesData || []).map((v: any) => String(v.student_id)).filter(Boolean)
      );

      const formatted: Student[] = (studentsData || []).map((s: any) => {
        const studentIdStr = String(s.id);
        const meta = votesMap[studentIdStr] || {};
        return {
          ...s,
          id: studentIdStr,
          has_voted: votedSet.has(studentIdStr) || !!s.has_voted,
          voted_at: s.voted_at || meta.voted_at || undefined,
          vote_location: s.vote_location || meta.location || undefined,
        };
      });

      setStudents(formatted);
    } catch (err) {
      console.error("Unexpected fetch error:", err);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadClick = () => {
    setPdfAuthInput("");
    setPdfAuthError("");
    setShowPdfAuth(true);
  };

  const handlePdfAuthSubmit = async () => {
    const { ADMIN_PASSWORD } = await import("../types");
    if (pdfAuthInput !== ADMIN_PASSWORD) {
      setPdfAuthError("Incorrect password. Access denied.");
      return;
    }
    setShowPdfAuth(false);
    downloadPDF();
  };

  const downloadPDF = async () => {
    if (!pdfPrintRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(pdfPrintRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.98);
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "in",
        format: "letter",
      });

      const imgWidth = 8.5 - 0.8;
      const pageHeight = 11 - 0.8;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0.4;

      pdf.addImage(imgData, "JPEG", 0.4, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight + 0.4;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0.4, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const fileNameGrade = gradeFilter !== "All" ? `_${gradeFilter}` : "";
      pdf.save(`student_voter_access_list${fileNameGrade}_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("PDF export failed: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsExporting(false);
    }
  };

  useEffect(() => {
    fetchStudentsWithVotes();
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") fetchStudentsWithVotes();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  // Multi-field Filtering: Search (Name or LRN), Grade, and Voting Status
  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      !searchTerm.trim() ||
      s.name.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
      s.id.toLowerCase().includes(searchTerm.toLowerCase().trim());

    const matchesGrade = gradeFilter === "All" || s.grade === gradeFilter;

    const matchesStatus =
      statusFilter === "All" ||
      (statusFilter === "voted" && s.has_voted) ||
      (statusFilter === "pending" && !s.has_voted);

    return matchesSearch && matchesGrade && matchesStatus;
  });

  return (
    <div className="screen-content content-max-width">
      {/* Page Title & Navigation Actions */}
      <div className="flex-between" style={{ marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <span className="overline">Student Registry</span>
          <h1>Voters List Dashboard</h1>
        </div>
        <div className="action-buttons" style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button className="btn-top-nav primary" onClick={handleDownloadClick}>
            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>download</span>
            Download PDF
          </button>
          <button className="btn-top-nav" onClick={fetchStudentsWithVotes}>
            Refresh
          </button>
        </div>
      </div>

      {/* Summary KPI Stat Grid */}
      {!loading && (
        <div className="stat-grid" style={{ marginBottom: "24px" }}>
          <div className="stat-box light">
            <span className="overline" style={{ color: "var(--primary-navy)", marginBottom: "4px" }}>Total Registered</span>
            <h1 style={{ fontSize: "32px", margin: 0 }}>{students.length}</h1>
            <span className="material-symbols-outlined watermark-icon" style={{ color: "rgba(10,25,47,0.06)" }}>group</span>
          </div>
          <div className="stat-box light">
            <span className="overline" style={{ color: "var(--color-success)", marginBottom: "4px" }}>Voted</span>
            <h1 style={{ fontSize: "32px", margin: 0 }}>{students.filter((s) => s.has_voted).length}</h1>
            <span className="material-symbols-outlined watermark-icon" style={{ color: "rgba(5,150,105,0.08)" }}>how_to_vote</span>
          </div>
          <div className="stat-box light">
            <span className="overline" style={{ color: "var(--color-warning)", marginBottom: "4px" }}>Pending / Not Voted</span>
            <h1 style={{ fontSize: "32px", margin: 0 }}>{students.filter((s) => !s.has_voted).length}</h1>
            <span className="material-symbols-outlined watermark-icon" style={{ color: "rgba(217,119,6,0.08)" }}>hourglass_empty</span>
          </div>
        </div>
      )}

      {/* Real-time Search & Filter Controls Bar */}
      <div className="voters-controls-bar">
        <div className="search-input-wrapper">
          <span className="material-symbols-outlined" style={{ color: "var(--text-light)", fontSize: "20px" }}>search</span>
          <input
            type="text"
            placeholder="Search by student name or LRN ID..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
          {searchTerm && (
            <button
              onClick={() => handleSearchChange("")}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-light)", display: "flex", padding: 0 }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>cancel</span>
            </button>
          )}
        </div>

        <div className="filter-group">
          <select
            className="filter-select"
            value={gradeFilter}
            onChange={(e) => setGradeFilter(e.target.value)}
          >
            <option value="All">{t.allGradesOption || "All Grades"}</option>
            <option value="G7">Grade 7</option>
            <option value="G8">Grade 8</option>
            <option value="G9">Grade 9</option>
            <option value="G10">Grade 10</option>
            <option value="G11">Grade 11</option>
            <option value="G12">Grade 12</option>
          </select>

          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">{t.allStatusesOption || "All Statuses"}</option>
            <option value="voted">{t.votedOnlyOption || "Voted Only"}</option>
            <option value="pending">{t.pendingOnlyOption || "Pending Only"}</option>
          </select>

          <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-muted)", padding: "0 6px" }}>
            Showing {filteredStudents.length} of {students.length}
          </span>
        </div>
      </div>

      {/* Main Voters Data Table */}
      <div className="card-box" style={{ padding: "0", overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "48px 24px" }}>
            <BubbleLoader message="Loading student registry table..." />
          </div>
        ) : filteredStudents.length === 0 ? (
          <div style={{ padding: "56px 24px", textAlign: "center" }}>
            <span className="material-symbols-outlined" style={{ fontSize: "48px", color: "var(--border-subtle)", marginBottom: "12px" }}>
              person_search
            </span>
            <h3 style={{ margin: "0 0 6px 0", color: "var(--primary-navy)", fontSize: "18px" }}>No Student Voters Found</h3>
            <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "14px" }}>
              No voters match your current search or filter selections. Try clearing your filters.
            </p>
          </div>
        ) : (
          <div className="voters-table-container">
            <table className="voters-table">
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>LRN (ID)</th>
                  <th>Grade</th>
                  <th>Section</th>
                  <th>Password</th>
                  <th>Voting Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => (
                  <tr key={student.id}>
                    <td>
                      <div className="voter-avatar-cell">
                        <img
                          src={
                            base64ToImageUrl(student.photo_url) ||
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(student.name)}&background=E8F0FE&color=0A192F`
                          }
                          alt={student.name}
                          className="voter-avatar-img"
                          onError={(e) => {
                            e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(student.name)}&background=E8F0FE&color=0A192F`;
                          }}
                        />
                        <div>
                          <div className="voter-name-title">{student.name}</div>
                          <div className="voter-lrn-code">{student.id}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="credential-chip">{student.id}</span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: "var(--text-muted)" }}>{student.grade}</span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: "var(--text-muted)" }}>{student.section || "—"}</span>
                    </td>
                    <td>
                      {(() => {
                        const displayPw = student.password && student.password.startsWith("$2a$") ? "123456" : student.password;
                        return displayPw ? (
                          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                            <span className="credential-chip" style={{ letterSpacing: showPasswords[student.id] ? "normal" : "0.15em" }}>
                              {showPasswords[student.id] ? displayPw : "••••••••"}
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleShowPassword(student.id)}
                              style={{ background: "none", border: "none", cursor: "pointer", padding: "2px", color: "var(--text-light)", display: "inline-flex", alignItems: "center" }}
                              title={showPasswords[student.id] ? "Hide Password" : "Show Password"}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
                                {showPasswords[student.id] ? "visibility_off" : "visibility"}
                              </span>
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: "12px", color: "var(--text-light)", fontStyle: "italic" }}>—</span>
                        );
                      })()}
                    </td>
                    <td>
                      {student.has_voted ? (
                        <span className="badge-pill voted">
                          <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>check_circle</span>
                          Voted
                        </span>
                      ) : (
                        <span className="badge-pill pending">
                          <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>pending</span>
                          Pending
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        className="btn-inner-action"
                        onClick={() => onViewProfile(student.id)}
                      >
                        View Profile
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PDF Password Authorization Modal */}
      {showPdfAuth && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 99999, backdropFilter: "blur(4px)"
        }}>
          <div style={{
            background: "var(--bg-card)", color: "var(--text-main)", borderRadius: "16px", padding: "32px",
            width: "100%", maxWidth: "380px", boxShadow: "var(--shadow-modal)", border: "1px solid var(--border-light)"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
              <span className="material-symbols-outlined" style={{ fontSize: "28px", color: "var(--color-danger)" }}>lock</span>
              <h3 style={{ margin: 0, color: "var(--primary-navy)", fontSize: "18px", fontWeight: 800 }}>Confirm PDF Download</h3>
            </div>
            <p style={{ margin: "0 0 20px 0", color: "var(--text-muted)", fontSize: "13px" }}>
              Enter the faculty admin password to download the voters list PDF. This file contains sensitive student credentials.
            </p>
            <input
              type="password"
              placeholder="Enter admin password"
              value={pdfAuthInput}
              onChange={(e) => { setPdfAuthInput(e.target.value); setPdfAuthError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handlePdfAuthSubmit()}
              autoFocus
              style={{
                width: "100%", padding: "12px 14px", border: `1px solid ${pdfAuthError ? "var(--color-danger)" : "var(--border-light)"}`,
                borderRadius: "8px", fontSize: "14px", boxSizing: "border-box",
                outline: "none", marginBottom: "8px", background: "var(--bg-surface)"
              }}
            />
            {pdfAuthError && (
              <p style={{ margin: "0 0 12px 0", color: "var(--color-danger)", fontSize: "12px", fontWeight: 600 }}>
                {pdfAuthError}
              </p>
            )}
            <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
              <button
                className="btn-top-nav"
                onClick={() => setShowPdfAuth(false)}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                className="btn-top-nav primary"
                onClick={handlePdfAuthSubmit}
                disabled={isExporting}
                style={{ flex: 1, opacity: isExporting ? 0.7 : 1 }}
              >
                {isExporting ? "Exporting PDF..." : "Download"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden PDF Printable Container - Printable Voter Access Pass Tickets */}
      <div
        ref={pdfPrintRef}
        style={{
          position: "absolute",
          left: "-9999px",
          top: "-9999px",
          width: "840px",
          background: "#FFFFFF",
          color: "#0F172A",
          padding: "32px",
          boxSizing: "border-box",
          fontFamily: "var(--font-sans)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "20px", borderBottom: "2px solid #0F3870", paddingBottom: "12px" }}>
          <h1
            style={{
              color: "#0F3870",
              margin: "0 0 4px 0",
              fontSize: "20px",
              fontWeight: 800,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            OFFICIAL STUDENT VOTER ACCESS TICKETS{gradeFilter !== "All" ? ` - ${gradeFilter.toUpperCase()}` : ""}
          </h1>
          <p style={{ color: "#475569", margin: 0, fontSize: "12px", fontWeight: 600 }}>
            Date Generated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} &nbsp;|&nbsp; Total Printable Slips: {filteredStudents.length}
          </p>
        </div>

        {/* 2-Column Grid of Individual Printable Ticket Pass Slips */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          {filteredStudents.map((s) => {
            const displayPw = s.password && s.password.startsWith("$2a$") ? "123456" : (s.password || "Standard");
            const sectionStr = s.grade ? `${s.grade}${s.section ? `-${s.section}` : ""}` : (s.section || "N/A");

            return (
              <div
                key={s.id}
                style={{
                  border: "2px dashed #94A3B8",
                  borderRadius: "12px",
                  padding: "16px",
                  background: "#FAFAFA",
                  boxSizing: "border-box",
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                {/* Cut Line Indicator Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", borderBottom: "1px solid #E2E8F0", paddingBottom: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ fontSize: "14px", fontWeight: 700, color: "#0F3870" }}>✂</span>
                    <span style={{ fontSize: "10px", fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      SSLG OFFICIAL VOTING PASS
                    </span>
                  </div>
                  <span style={{ fontSize: "10px", background: "#0F3870", color: "#FFFFFF", padding: "2px 8px", borderRadius: "4px", fontWeight: 700 }}>
                    {sectionStr}
                  </span>
                </div>

                {/* Ticket Main Content */}
                <div style={{ marginBottom: "12px" }}>
                  <h3 style={{ margin: "0 0 4px 0", fontSize: "15px", fontWeight: 800, color: "#0F172A", textTransform: "uppercase" }}>
                    {s.name}
                  </h3>
                  <p style={{ margin: 0, fontSize: "11.5px", color: "#475569", fontWeight: 600 }}>
                    LRN / ID: <strong>{s.id}</strong> {s.age ? `| Age: ${s.age}` : ""}
                  </p>
                </div>

                {/* Password / Access Key Ticket Stub Box */}
                <div
                  style={{
                    background: "#EFF6FF",
                    border: "1.5px solid #3B82F6",
                    borderRadius: "8px",
                    padding: "8px 12px",
                    textAlign: "center",
                    marginBottom: "8px",
                  }}
                >
                  <span style={{ fontSize: "9px", color: "#1E40AF", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "2px" }}>
                    PASSWORD / ACCESS KEY
                  </span>
                  <span style={{ fontSize: "16px", fontWeight: 800, color: "#0F3870", letterSpacing: "0.12em" }}>
                    {displayPw}
                  </span>
                </div>

                {/* Ticket Footer Security Instruction */}
                <div style={{ fontSize: "9px", color: "#64748B", textAlign: "center", fontWeight: 600 }}>
                  Keep credentials confidential &bull; One vote per student
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AdminVotersList;
