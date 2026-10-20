import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import {
  Users,
  Vote,
  Clock,
  Download,
  RefreshCw,
  Search,
  X,
  CheckCircle2,
  Clock3,
  Eye,
  EyeOff,
  Lock,
  UserSearch,
} from "lucide-react";
import { supabase } from "../supabase";
import "./AdminVotersList.css";
import type { Student, Page } from "../types";
import { getStudentPhoto, getRealisticFallbackPhoto } from "../utils/imageUtils";
import BubbleLoader from "../components/BubbleLoader";
import PhotoViewerModal from "../components/PhotoViewerModal";
import { useLanguage } from "../context/LanguageContext";
import { logAuditAction } from "../utils/auditLogger";
import { formatGradeSection } from "../utils/sectionConstants";

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
  const [viewingPhotoStudent, setViewingPhotoStudent] = useState<Student | null>(null);
  const pdfPrintRef = useRef<HTMLDivElement>(null);

  // Reset passcode authorization states
  const [resetPasscodeStudent, setResetPasscodeStudent] = useState<Student | null>(null);
  const [resetPasscodeAuthInput, setResetPasscodeAuthInput] = useState("");
  const [resetPasscodeAuthError, setResetPasscodeAuthError] = useState("");
  const [newlyGeneratedPassword, setNewlyGeneratedPassword] = useState<{ student: Student; pass: string } | null>(null);
  const [isResettingPasscode, setIsResettingPasscode] = useState(false);

  // Reset vote status authorization states
  const [resetVoteStudent, setResetVoteStudent] = useState<Student | null>(null);
  const [resetVoteAuthInput, setResetVoteAuthInput] = useState("");
  const [resetVoteAuthError, setResetVoteAuthError] = useState("");
  const [isResettingVote, setIsResettingVote] = useState(false);

  const handleResetPasscodeSubmit = async () => {
    if (!resetPasscodeStudent) return;
    const { ADMIN_PASSWORD } = await import("../types");
    if (resetPasscodeAuthInput !== ADMIN_PASSWORD) {
      setResetPasscodeAuthError("Incorrect admin password. Access denied.");
      await logAuditAction(
        "SECURITY_ACCESS_KEY_DENIED",
        "Admin",
        `Denied unauthorized password reset attempt for ${resetPasscodeStudent.name} (LRN: ${resetPasscodeStudent.id})`
      );
      return;
    }

    setIsResettingPasscode(true);
    setResetPasscodeAuthError("");

    const chars = "abcdefghjkmnpqrstuvwxyz23456789";
    let newPass = "";
    for (let i = 0; i < 6; i++) {
      newPass += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    try {
      const { error: updateErr } = await supabase
        .from("students")
        .update({ password: newPass })
        .eq("id", resetPasscodeStudent.id);

      if (updateErr) throw updateErr;

      setStudents((prev) =>
        prev.map((s) => (s.id === resetPasscodeStudent.id ? { ...s, password: newPass } : s))
      );

      await logAuditAction(
        "VOTER_PASSWORD_RESET",
        "Admin",
        `Admin generated new passcode for student ${resetPasscodeStudent.name} (LRN: ${resetPasscodeStudent.id})`
      );

      setNewlyGeneratedPassword({ student: resetPasscodeStudent, pass: newPass });
      setResetPasscodeStudent(null);
      setResetPasscodeAuthInput("");
    } catch (err: any) {
      setResetPasscodeAuthError("Failed to update passcode: " + (err.message || "Unknown error"));
    } finally {
      setIsResettingPasscode(false);
    }
  };

  const handleResetVoteSubmit = async () => {
    if (!resetVoteStudent) return;
    const { ADMIN_PASSWORD } = await import("../types");
    if (resetVoteAuthInput !== ADMIN_PASSWORD) {
      setResetVoteAuthError("Incorrect admin password. Access denied.");
      await logAuditAction(
        "VOTE_RESET_DENIED",
        "Admin",
        `Denied unauthorized vote reset attempt on voter ${resetVoteStudent.name} (LRN: ${resetVoteStudent.id}) — incorrect admin password`
      );
      return;
    }
    setIsResettingVote(true);
    setResetVoteAuthError("");
    try {
      await supabase.from("votes").delete().eq("student_id", resetVoteStudent.id);
      await supabase.from("students").update({ has_voted: false, voted_at: null, vote_location: null }).eq("id", resetVoteStudent.id);
      setStudents((prev) =>
        prev.map((s) => (s.id === resetVoteStudent.id ? { ...s, has_voted: false, voted_at: undefined, vote_location: undefined } : s))
      );
      await logAuditAction(
        "VOTE_STATUS_RESET",
        "Admin",
        `Reset voting status and cleared cast votes for voter ${resetVoteStudent.name} (LRN: ${resetVoteStudent.id})`
      );
      setResetVoteStudent(null);
      setResetVoteAuthInput("");
      alert(`Voting status for ${resetVoteStudent.name} was successfully reset.`);
    } catch (err: any) {
      setResetVoteAuthError("Failed to reset vote: " + (err.message || "Unknown error"));
    } finally {
      setIsResettingVote(false);
    }
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

      const formatted: Student[] = (studentsData || [])
        .filter((s: any) => {
          const id = String(s.id || "").toLowerCase().trim();
          const name = String(s.name || "").toLowerCase().trim();
          const email = String(s.email || "").toLowerCase().trim();
          if (id === "admin" || id === "admin@gmail.com") return false;
          if (name === "admin" || name === "administrator" || name === "faculty admin") return false;
          if (email === "admin@gmail.com") return false;
          if (s.isAdmin) return false;
          return true;
        })
        .map((s: any) => {
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
      await logAuditAction(
        "SECURITY_EXPORT_DENIED",
        "Admin",
        `Denied attempt to export student credentials PDF — incorrect admin password`
      );
      return;
    }
    setShowPdfAuth(false);
    setPdfAuthInput("");
    await logAuditAction(
      "SECURITY_CREDENTIALS_EXPORTED",
      "Admin",
      `Exported student voter access passcodes list as PDF (Filter: ${gradeFilter})`
    );
    downloadPDF();
  };

  const downloadPDF = async () => {
    if (!pdfPrintRef.current) return;
    setIsExporting(true);
    try {
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "in",
        format: "letter",
      });

      const PAGE_W = 8.5;
      const PAGE_H = 11;
      const MARGIN = 0.4;
      const CONTENT_W = PAGE_W - MARGIN * 2;
      const CONTENT_H = PAGE_H - MARGIN * 2;

      // Render the entire hidden container as one high-res canvas
      const fullCanvas = await html2canvas(pdfPrintRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#FFFFFF",
      });

      const totalWidthPx = fullCanvas.width;

      // How many inches does one pixel represent horizontally?
      const pxPerInchW = totalWidthPx / CONTENT_W;

      // Find all direct card children to calculate their pixel offsets
      const grid = pdfPrintRef.current.querySelector(
        "div[style*='grid-template-columns']"
      ) as HTMLElement | null;

      // Collect the top/bottom pixel positions of each grid row
      const rowBoundaries: { topPx: number; bottomPx: number }[] = [];

      if (grid) {
        const gridChildren = Array.from(grid.children) as HTMLElement[];
        const rootRect = pdfPrintRef.current.getBoundingClientRect();

        for (let i = 0; i < gridChildren.length; i += 2) {
          const leftCard = gridChildren[i];
          const rightCard = gridChildren[i + 1] || leftCard;
          const leftRect = leftCard.getBoundingClientRect();
          const rightRect = rightCard.getBoundingClientRect();

          // Offset relative to the container
          const topPx = (Math.min(leftRect.top, rightRect.top) - rootRect.top) * 2; // *2 for scale:2
          const bottomPx = (Math.max(leftRect.bottom, rightRect.bottom) - rootRect.top) * 2;
          rowBoundaries.push({ topPx, bottomPx });
        }
      }

      // If we couldn't find card rows, fall back to slicing by fixed page height
      if (rowBoundaries.length === 0) {
        const headerCanvas = await html2canvas(pdfPrintRef.current, {
          scale: 2, useCORS: true, logging: false, backgroundColor: "#FFFFFF",
        });
        const imgData = headerCanvas.toDataURL("image/jpeg", 0.95);
        const imgH = (headerCanvas.height * CONTENT_W) / headerCanvas.width;
        let heightLeft = imgH;
        let pos = MARGIN;
        pdf.addImage(imgData, "JPEG", MARGIN, pos, CONTENT_W, imgH);
        heightLeft -= CONTENT_H;
        while (heightLeft > 0) {
          pos = heightLeft - imgH + MARGIN;
          pdf.addPage();
          pdf.addImage(imgData, "JPEG", MARGIN, pos, CONTENT_W, imgH);
          heightLeft -= CONTENT_H;
        }
      } else {
        // Render the header separately (everything above first card row)
        const headerHeightPx = rowBoundaries[0]?.topPx ?? 0;

        // Group rows into pages
        let currentPageRows: typeof rowBoundaries = [];
        let currentPageHeightIn = headerHeightPx / pxPerInchW; // header height in inches
        let isFirstPage = true;

        const flushPage = async (rows: typeof rowBoundaries, includeHeader: boolean) => {
          // Slice the fullCanvas for this set of rows
          const topPx = includeHeader ? 0 : rows[0].topPx;
          const bottomPx = rows[rows.length - 1].bottomPx;
          const sliceH = Math.ceil(bottomPx - topPx);

          const sliceCanvas = document.createElement("canvas");
          sliceCanvas.width = totalWidthPx;
          sliceCanvas.height = sliceH;
          const ctx = sliceCanvas.getContext("2d")!;
          ctx.drawImage(fullCanvas, 0, -topPx);

          const sliceImgH = (sliceH * CONTENT_W) / totalWidthPx;
          const imgData = sliceCanvas.toDataURL("image/jpeg", 0.95);
          pdf.addImage(imgData, "JPEG", MARGIN, MARGIN, CONTENT_W, sliceImgH);
        };

        for (let ri = 0; ri < rowBoundaries.length; ri++) {
          const row = rowBoundaries[ri];
          const rowHeightIn = (row.bottomPx - row.topPx) / pxPerInchW;

          if (
            currentPageRows.length > 0 &&
            currentPageHeightIn + rowHeightIn + 0.1 > CONTENT_H
          ) {
            // Flush current page
            await flushPage(currentPageRows, isFirstPage);
            pdf.addPage();
            isFirstPage = false;
            currentPageRows = [];
            currentPageHeightIn = 0;
          }

          currentPageRows.push(row);
          currentPageHeightIn += rowHeightIn + 0.1; // 0.1in gap between rows
        }

        // Flush last page
        if (currentPageRows.length > 0) {
          await flushPage(currentPageRows, isFirstPage);
        }
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
      <div className="flex-between" style={{ marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
            <div style={{
              width: "28px",
              height: "28px",
              borderRadius: "6px",
              backgroundColor: "rgba(99, 102, 241, 0.12)",
              border: "1px solid rgba(99, 102, 241, 0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--accent-primary)"
            }}>
              <Users size={15} />
            </div>
            <h1 style={{ margin: 0, fontSize: "20px", fontWeight: 700, color: "var(--text-main)" }}>
              Students List
            </h1>
          </div>
          <p style={{ margin: 0, fontSize: "12px", color: "var(--text-muted)" }}>
            Official student voters directory and ballot participation status.
          </p>
        </div>
        <div className="action-buttons" style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button className="btn-top-nav primary" onClick={handleDownloadClick}>
            <Download size={14} />
            <span>Export PDF</span>
          </button>
          <button className="btn-top-nav" onClick={fetchStudentsWithVotes}>
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Stat Grid */}
      {!loading && (
        <div className="stat-grid" style={{ marginBottom: "16px" }}>
          <div className="stat-box light">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span className="overline" style={{ color: "var(--primary-navy)", marginBottom: "2px" }}>Total Registered</span>
              <Users size={15} style={{ color: "var(--primary-navy)", opacity: 0.7 }} />
            </div>
            <h1 style={{ fontSize: "24px", margin: 0, fontWeight: 600 }}>{students.length}</h1>
          </div>
          <div className="stat-box light">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span className="overline" style={{ color: "var(--color-success)", marginBottom: "2px" }}>Voted</span>
              <Vote size={15} style={{ color: "var(--color-success)", opacity: 0.7 }} />
            </div>
            <h1 style={{ fontSize: "24px", margin: 0, fontWeight: 600 }}>{students.filter((s) => s.has_voted).length}</h1>
          </div>
          <div className="stat-box light">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span className="overline" style={{ color: "var(--color-warning)", marginBottom: "2px" }}>Not Voted</span>
              <Clock size={15} style={{ color: "var(--color-warning)", opacity: 0.7 }} />
            </div>
            <h1 style={{ fontSize: "24px", margin: 0, fontWeight: 600 }}>{students.filter((s) => !s.has_voted).length}</h1>
          </div>
        </div>
      )}

      {/* Real-time Search & Filter Controls Bar */}
      <div className="voters-controls-bar">
        <div className="search-input-wrapper">
          <Search size={14} style={{ color: "var(--text-light)" }} />
          <input
            type="text"
            placeholder="Search student name or LRN..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
          {searchTerm && (
            <button
              onClick={() => handleSearchChange("")}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-light)", display: "flex", padding: 0 }}
            >
              <X size={14} />
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

          <span style={{ fontSize: "11.5px", fontWeight: 500, color: "var(--text-light)", padding: "0 4px" }}>
            {filteredStudents.length} of {students.length}
          </span>
        </div>
      </div>

      {/* Main Voters Data Table */}
      <div className="card-box" style={{ padding: "0", overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "32px 16px" }}>
            <BubbleLoader message="Loading student registry table..." />
          </div>
        ) : filteredStudents.length === 0 ? (
          <div style={{ padding: "40px 16px", textAlign: "center" }}>
            <UserSearch size={32} style={{ color: "var(--text-light)", marginBottom: "8px" }} />
            <h3 style={{ margin: "0 0 4px 0", color: "var(--text-main)", fontSize: "14px", fontWeight: 600 }}>No Student Voters Found</h3>
            <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "12px" }}>
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
                  <th>Grade & Section</th>
                  <th>Passcode</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => (
                  <tr key={student.id}>
                    <td>
                      <div className="voter-avatar-cell">
                        <img
                          src={getStudentPhoto(student.photo_url, student.name, student.id)}
                          alt={student.name}
                          className="voter-avatar-img"
                          onClick={() => setViewingPhotoStudent(student)}
                          title="Click to view full photo"
                          onError={(e) => {
                            e.currentTarget.src = getRealisticFallbackPhoto(student.name, student.id);
                          }}
                        />
                        <div className="voter-name-title">
                          {student.name}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="credential-chip">{student.id}</span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 500, color: "var(--text-muted)", fontSize: "12px" }}>
                        {formatGradeSection(student.grade, student.section)}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                        <span className="credential-chip" style={{ letterSpacing: "0.15em" }}>
                          ••••••••
                        </span>
                        <button
                          type="button"
                          className="btn-inner-action"
                          onClick={() => {
                            setResetPasscodeStudent(student);
                            setResetPasscodeAuthInput("");
                            setResetPasscodeAuthError("");
                          }}
                          style={{
                            padding: "2px 7px",
                            fontSize: "11px",
                            backgroundColor: "var(--bg-subtle)",
                            border: "1px solid var(--border-light)",
                            color: "var(--text-muted)",
                            borderRadius: "4px",
                            cursor: "pointer",
                          }}
                          title={`Generate new temporary passcode for ${student.name}`}
                        >
                          Reset
                        </button>
                      </div>
                    </td>
                    <td>
                      {student.has_voted ? (
                        <span className="badge-pill voted">
                          <CheckCircle2 size={12} />
                          Voted
                        </span>
                      ) : (
                        <span className="badge-pill pending">
                          <Clock3 size={12} />
                          Not Voted
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: "6px", alignItems: "center", justifyContent: "flex-end" }}>
                        <button
                          className="btn-inner-action"
                          onClick={() => onViewProfile(student.id)}
                        >
                          Profile
                        </button>
                        {student.has_voted && (
                          <button
                            className="btn-inner-action"
                            onClick={() => {
                              if (window.confirm(`Are you sure you want to reset the voting status for ${student.name}? This will erase their submitted votes.`)) {
                                setResetVoteStudent(student);
                                setResetVoteAuthInput("");
                                setResetVoteAuthError("");
                              }
                            }}
                            title="Reset Vote Status (Requires Admin Password)"
                            style={{
                              color: "var(--color-danger, #EF4444)",
                              borderColor: "var(--color-danger-border, rgba(239, 68, 68, 0.3))",
                              background: "var(--color-danger-bg, rgba(239, 68, 68, 0.05))",
                            }}
                          >
                            Reset Vote
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PDF Password Authorization Modal */}
      {showPdfAuth && typeof document !== "undefined" && createPortal(
        <div
          className="policy-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowPdfAuth(false);
          }}
        >
          <div
            className="policy-modal-content"
            style={{
              width: "100%",
              maxWidth: "340px",
              padding: "24px",
              borderRadius: "10px",
              background: "#FFFFFF",
              backgroundColor: "#FFFFFF",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <Lock size={18} style={{ color: "var(--color-danger)" }} />
              <h3 style={{ margin: 0, color: "var(--text-main)", fontSize: "15px", fontWeight: 600 }}>Confirm PDF Export</h3>
            </div>
            <p style={{ margin: "0 0 16px 0", color: "var(--text-muted)", fontSize: "12px", lineHeight: "1.4" }}>
              Enter faculty admin password to download the voter credentials PDF.
            </p>
            <input
              type="password"
              placeholder="Enter admin password"
              value={pdfAuthInput}
              onChange={(e) => { setPdfAuthInput(e.target.value); setPdfAuthError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handlePdfAuthSubmit()}
              autoFocus
              style={{
                width: "100%", padding: "8px 10px", border: `1px solid ${pdfAuthError ? "var(--color-danger)" : "var(--border-light)"}`,
                borderRadius: "6px", fontSize: "12.5px", boxSizing: "border-box",
                outline: "none", marginBottom: "6px", background: "var(--bg-surface)", color: "var(--text-main)"
              }}
            />
            {pdfAuthError && (
              <p style={{ margin: "0 0 10px 0", color: "var(--color-danger)", fontSize: "11px", fontWeight: 500 }}>
                {pdfAuthError}
              </p>
            )}
            <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
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
                {isExporting ? "Exporting..." : "Download"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Reset Passcode Authorization Modal */}
      {resetPasscodeStudent && typeof document !== "undefined" && createPortal(
        <div
          className="policy-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setResetPasscodeStudent(null);
              setResetPasscodeAuthInput("");
              setResetPasscodeAuthError("");
            }
          }}
        >
          <div
            className="policy-modal-content"
            style={{
              width: "100%",
              maxWidth: "360px",
              padding: "24px",
              borderRadius: "10px",
              background: "#FFFFFF",
              backgroundColor: "#FFFFFF",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <Lock size={18} style={{ color: "var(--accent-primary)" }} />
              <h3 style={{ margin: 0, color: "var(--text-main)", fontSize: "15px", fontWeight: 600 }}>Reset Voter Passcode</h3>
            </div>
            <p style={{ margin: "0 0 16px 0", color: "var(--text-muted)", fontSize: "12px", lineHeight: "1.45" }}>
              Enter administrator password to generate a new temporary login passcode for <strong>{resetPasscodeStudent.name}</strong> ({resetPasscodeStudent.id}):
            </p>
            <input
              type="password"
              placeholder="Enter admin password"
              value={resetPasscodeAuthInput}
              onChange={(e) => { setResetPasscodeAuthInput(e.target.value); setResetPasscodeAuthError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleResetPasscodeSubmit()}
              autoFocus
              style={{
                width: "100%", padding: "9px 12px", border: `1px solid ${resetPasscodeAuthError ? "var(--color-danger)" : "var(--border-subtle)"}`,
                borderRadius: "6px", fontSize: "13px", boxSizing: "border-box",
                outline: "none", marginBottom: "6px", background: "var(--bg-subtle)", color: "var(--text-main)"
              }}
            />
            {resetPasscodeAuthError && (
              <p style={{ margin: "0 0 10px 0", color: "var(--color-danger)", fontSize: "11px", fontWeight: 500 }}>
                {resetPasscodeAuthError}
              </p>
            )}
            <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => { setResetPasscodeStudent(null); setResetPasscodeAuthInput(""); setResetPasscodeAuthError(""); }}
                style={{ flex: 1, padding: "8px 12px", borderRadius: "6px", fontSize: "12px" }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleResetPasscodeSubmit}
                disabled={isResettingPasscode}
                style={{ flex: 1, padding: "8px 12px", borderRadius: "6px", fontSize: "12px" }}
              >
                {isResettingPasscode ? "Resetting..." : "Generate New"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Newly Generated Passcode Display Modal */}
      {newlyGeneratedPassword && typeof document !== "undefined" && createPortal(
        <div
          className="policy-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setNewlyGeneratedPassword(null);
            }
          }}
        >
          <div
            className="policy-modal-content"
            style={{
              width: "100%",
              maxWidth: "380px",
              padding: "24px",
              borderRadius: "10px",
              background: "#FFFFFF",
              backgroundColor: "#FFFFFF",
              textAlign: "center",
            }}
          >
            <div style={{
              width: "44px",
              height: "44px",
              borderRadius: "50%",
              background: "rgba(16, 185, 129, 0.12)",
              color: "var(--color-success)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 12px auto"
            }}>
              <CheckCircle2 size={24} />
            </div>
            <h3 style={{ margin: "0 0 6px 0", color: "var(--text-main)", fontSize: "16px", fontWeight: 700 }}>
              Passcode Reset Successful
            </h3>
            <p style={{ margin: "0 0 16px 0", color: "var(--text-muted)", fontSize: "12.5px" }}>
              New temporary login passcode for <strong>{newlyGeneratedPassword.student.name}</strong>:
            </p>
            <div style={{
              background: "var(--bg-subtle)",
              border: "1px dashed var(--border-light)",
              borderRadius: "8px",
              padding: "12px 16px",
              marginBottom: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "10px"
            }}>
              <code style={{ fontSize: "18px", fontWeight: 700, letterSpacing: "0.1em", color: "var(--accent-primary)" }}>
                {newlyGeneratedPassword.pass}
              </code>
              <button
                type="button"
                className="btn-inner-action"
                onClick={() => {
                  navigator.clipboard.writeText(newlyGeneratedPassword.pass);
                  alert("Passcode copied to clipboard!");
                }}
                style={{
                  padding: "6px 12px",
                  fontSize: "12px",
                  fontWeight: 600,
                  backgroundColor: "var(--accent-primary)",
                  color: "#FFFFFF",
                  borderRadius: "5px",
                  border: "none",
                  cursor: "pointer"
                }}
              >
                Copy
              </button>
            </div>
            <p style={{ margin: "0 0 16px 0", color: "var(--text-muted)", fontSize: "11px" }}>
              Please provide this passcode to the student. For security, it will not be displayed again.
            </p>
            <button
              type="button"
              className="btn-primary"
              onClick={() => setNewlyGeneratedPassword(null)}
              style={{ width: "100%", padding: "9px 16px", borderRadius: "6px", fontSize: "13px" }}
            >
              Done
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* Reset Vote Status Authorization Modal */}
      {resetVoteStudent && typeof document !== "undefined" && createPortal(
        <div
          className="policy-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setResetVoteStudent(null);
              setResetVoteAuthInput("");
              setResetVoteAuthError("");
            }
          }}
        >
          <div
            className="policy-modal-content"
            style={{
              background: "#FFFFFF",
              backgroundColor: "#FFFFFF",
              color: "var(--text-main)",
              borderRadius: "10px",
              padding: "24px",
              width: "100%",
              maxWidth: "350px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <Lock size={18} style={{ color: "var(--color-danger)" }} />
              <h3 style={{ margin: 0, color: "var(--text-main)", fontSize: "15px", fontWeight: 600 }}>Reset Vote Status</h3>
            </div>
            <p style={{ margin: "0 0 16px 0", color: "var(--text-muted)", fontSize: "12px", lineHeight: "1.4" }}>
              Resetting will clear submitted votes for <strong>{resetVoteStudent.name}</strong> ({resetVoteStudent.id}). Enter administrator password to confirm:
            </p>
            <input
              type="password"
              placeholder="Enter admin password"
              value={resetVoteAuthInput}
              onChange={(e) => { setResetVoteAuthInput(e.target.value); setResetVoteAuthError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleResetVoteSubmit()}
              autoFocus
              style={{
                width: "100%", padding: "8px 10px", border: `1px solid ${resetVoteAuthError ? "var(--color-danger)" : "var(--border-light)"}`,
                borderRadius: "6px", fontSize: "12.5px", boxSizing: "border-box",
                outline: "none", marginBottom: "6px", background: "var(--bg-surface)", color: "var(--text-main)"
              }}
            />
            {resetVoteAuthError && (
              <p style={{ margin: "0 0 10px 0", color: "var(--color-danger)", fontSize: "11px", fontWeight: 500 }}>
                {resetVoteAuthError}
              </p>
            )}
            <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
              <button
                className="btn-secondary"
                onClick={() => { setResetVoteStudent(null); setResetVoteAuthInput(""); setResetVoteAuthError(""); }}
                style={{ flex: 1, padding: "8px 12px", borderRadius: "6px", fontSize: "12px" }}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleResetVoteSubmit}
                disabled={isResettingVote}
                style={{ flex: 1, padding: "8px 12px", borderRadius: "6px", fontSize: "12px", background: "var(--color-danger)", borderColor: "var(--color-danger)" }}
              >
                {isResettingVote ? "Resetting..." : "Confirm Reset"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Full Photo Viewer Modal for Admin Inspection */}
      {viewingPhotoStudent && (
        <PhotoViewerModal
          imageUrl={getStudentPhoto(viewingPhotoStudent.photo_url, viewingPhotoStudent.name, viewingPhotoStudent.id)}
          title={viewingPhotoStudent.name}
          subtitle={`LRN: ${viewingPhotoStudent.id} • Grade ${viewingPhotoStudent.grade}${viewingPhotoStudent.section ? ` - ${viewingPhotoStudent.section}` : ""}`}
          onClose={() => setViewingPhotoStudent(null)}
        />
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
        <div style={{ textAlign: "center", marginBottom: "20px", borderBottom: "2px solid #0D7A3E", paddingBottom: "12px" }}>
          <h1
            style={{
              color: "#0D7A3E",
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
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", alignItems: "stretch" }}>
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
                  breakInside: "avoid",
                  pageBreakInside: "avoid",
                }}
              >
                {/* Cut Line Indicator Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", borderBottom: "1px solid #E2E8F0", paddingBottom: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ fontSize: "14px", fontWeight: 700, color: "#0D7A3E" }}>✂</span>
                    <span style={{ fontSize: "10px", fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      SSLG OFFICIAL VOTING PASS
                    </span>
                  </div>
                  <span style={{ fontSize: "10px", background: "#0D7A3E", color: "#FFFFFF", padding: "2px 8px", borderRadius: "4px", fontWeight: 700 }}>
                    {sectionStr}
                  </span>
                </div>

                {/* Ticket Main Content */}
                <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "12px" }}>
                  <img
                    src={getStudentPhoto(s.photo_url, s.name, s.id)}
                    alt={s.name}
                    crossOrigin="anonymous"
                    style={{
                      width: "48px",
                      height: "48px",
                      borderRadius: "6px",
                      objectFit: "cover",
                      border: "1px solid #CBD5E1",
                      flexShrink: 0,
                    }}
                    onError={(e) => {
                      e.currentTarget.src = getRealisticFallbackPhoto(s.name, s.id);
                    }}
                  />
                  <div>
                    <h3 style={{ margin: "0 0 4px 0", fontSize: "15px", fontWeight: 800, color: "#0F172A", textTransform: "uppercase" }}>
                      {s.name}
                    </h3>
                    <p style={{ margin: 0, fontSize: "11.5px", color: "#475569", fontWeight: 600 }}>
                      LRN / ID: <strong>{s.id}</strong> {s.age ? `| Age: ${s.age}` : ""}
                    </p>
                  </div>
                </div>

                {/* Password / Access Key Ticket Stub Box */}
                <div
                  style={{
                    background: "#ECFDF5",
                    border: "1.5px solid #10B981",
                    borderRadius: "8px",
                    padding: "8px 12px",
                    textAlign: "center",
                    marginBottom: "8px",
                  }}
                >
                  <span style={{ fontSize: "9px", color: "#065F46", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: "2px" }}>
                    PASSWORD / ACCESS KEY
                  </span>
                  <span style={{ fontSize: "16px", fontWeight: 800, color: "#0D7A3E", letterSpacing: "0.12em" }}>
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
