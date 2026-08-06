import React, { useState, useEffect } from "react";
import { supabase } from "../supabase";
import "./AdminVotersList.css";
import type { Student, Page } from "../types";
import ReturnButton from "../components/ReturnButton";
import { base64ToImageUrl } from "../utils/imageUtils";

const AdminVotersList: React.FC<{
  setPage: (p: Page) => void;
  onViewProfile: (id: string) => void;
}> = ({ setPage, onViewProfile }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [gradeFilter, setGradeFilter] = useState<string>("All");
  const [loading, setLoading] = useState(true);
  const [showPdfAuth, setShowPdfAuth] = useState(false);
  const [pdfAuthInput, setPdfAuthInput] = useState("");
  const [pdfAuthError, setPdfAuthError] = useState("");

  const fetchStudentsWithVotes = async () => {
    setLoading(true);

    const { data: studentsData, error: studentsError } = await supabase
      .from("students")
      .select("id, name, grade, section, password, photo_url, has_voted")
      .order("name");

    if (studentsError || !studentsData) {
      setStudents([]);
      setLoading(false);
      return;
    }

    const { data: votesData, error: votesError } = await supabase
      .from("votes")
      .select("student_id");

    if (votesError) {
      setStudents(studentsData.map((s) => ({ ...s, has_voted: !!s.has_voted })));
      setLoading(false);
      return;
    }

    const votedStudentIds = new Set(
      (votesData || []).map((v: any) => v.student_id).filter(Boolean)
    );

    setStudents(
      studentsData.map((s) => ({
        ...s,
        has_voted: votedStudentIds.has(s.id) || !!s.has_voted,
      }))
    );
    setLoading(false);
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
    setLoading(true);
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      
      const element = document.createElement("div");
      element.style.padding = "40px";
      element.style.fontFamily = "sans-serif";
      
      element.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0b1736; padding-bottom: 16px; margin-bottom: 24px;">
          <div>
            <h1 style="color: #0b1736; margin: 0; font-size: 24px;">Voters Registry List</h1>
            <p style="color: #64748b; margin: 4px 0 0 0; font-size: 13px;">GUSELA Online Voting System</p>
          </div>
          <div style="text-align: right;">
            <p style="color: #64748b; margin: 0; font-size: 12px; font-weight: 600;">Date Generated:</p>
            <p style="color: #0b1736; margin: 2px 0 0 0; font-size: 13px; font-weight: 700;">${new Date().toLocaleDateString()}</p>
          </div>
        </div>
        <div style="margin-bottom: 20px;">
          <span style="font-size: 12px; color: #64748b; font-weight: 700; text-transform: uppercase;">Filtered Grade:</span>
          <span style="font-size: 13px; color: #0b1736; font-weight: 700; margin-left: 6px; padding: 3px 8px; background: #e2e8f0; border-radius: 4px;">${gradeFilter}</span>
        </div>
      `;

      const table = document.createElement("table");
      table.style.width = "100%";
      table.style.borderCollapse = "collapse";
      table.style.fontSize = "11px";

      table.innerHTML = `
        <thead>
          <tr style="background-color: #0b1736; text-align: left; color: #ffffff;">
            <th style="padding: 10px; font-weight: 700; border: 1px solid #cbd5e1;">LRN</th>
            <th style="padding: 10px; font-weight: 700; border: 1px solid #cbd5e1;">Name</th>
            <th style="padding: 10px; font-weight: 700; border: 1px solid #cbd5e1;">Grade</th>
            <th style="padding: 10px; font-weight: 700; border: 1px solid #cbd5e1;">Section</th>
            <th style="padding: 10px; font-weight: 700; border: 1px solid #cbd5e1;">Password</th>
            <th style="padding: 10px; font-weight: 700; border: 1px solid #cbd5e1; text-align: center;">Has Voted</th>
          </tr>
        </thead>
        <tbody>
          ${filteredStudents.map((s, idx) => `
            <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
              <td style="padding: 8px 10px; font-family: monospace; border: 1px solid #e2e8f0;">${s.id}</td>
              <td style="padding: 8px 10px; font-weight: 600; color: #0b1736; border: 1px solid #e2e8f0;">${s.name}</td>
              <td style="padding: 8px 10px; border: 1px solid #e2e8f0;">${s.grade}</td>
              <td style="padding: 8px 10px; border: 1px solid #e2e8f0;">${s.section || "N/A"}</td>
              <td style="padding: 8px 10px; font-family: monospace; border: 1px solid #e2e8f0;">${s.password || "N/A"}</td>
              <td style="padding: 8px 10px; text-align: center; border: 1px solid #e2e8f0; font-weight: 700; color: ${s.has_voted ? '#059669' : '#dc2626'};">
                ${s.has_voted ? "Yes" : "No"}
              </td>
            </tr>
          `).join("")}
        </tbody>
      `;
      element.appendChild(table);

      const opt = {
        margin: 0.4,
        filename: `voter_slips_${gradeFilter}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'in' as const, format: 'letter', orientation: 'portrait' as const }
      };

      await html2pdf().set(opt).from(element).toPdf().save();
    } catch (err) {
      console.error("PDF generation failed:", err);
    } finally {
      setLoading(false);
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

  const filteredStudents =
    gradeFilter === "All" ? students : students.filter((s) => s.grade === gradeFilter);

  return (
    <div className="screen-content content-max-width">
      <ReturnButton onClick={() => setPage("admin_setup")} />

      <div className="flex-between" style={{ marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <span className="overline">Student Registry</span>
          <h1>Voters List Dashboard</h1>
        </div>
        <div className="action-buttons" style={{ display: "flex", gap: "8px" }}>
          <button className="btn-light-blue" onClick={handleDownloadClick} style={{ width: "auto", padding: "8px 16px", background: "#DC2626", color: "#FFFFFF" }}>
            Download PDF
          </button>
          <button className="btn-light-blue" onClick={() => setPage("results")} style={{ width: "auto", padding: "8px 16px" }}>
            Live Results
          </button>
          <button className="btn-outline-wide" onClick={fetchStudentsWithVotes} style={{ width: "auto", padding: "8px 16px" }}>
            Refresh
          </button>
        </div>
      </div>

      <div style={{ marginBottom: "20px", display: "flex", alignItems: "center", gap: "12px" }}>
        <label style={{ fontWeight: 600, fontSize: "14px", color: "var(--text-muted)" }}>
          Filter by Grade:
        </label>
        <select
          value={gradeFilter}
          onChange={(e) => setGradeFilter(e.target.value)}
          style={{ padding: "8px 16px", border: "1px solid var(--border-light)", borderRadius: "6px", background: "var(--bg-main)", fontSize: "14px" }}
        >
          <option value="All">All Grades</option>
          <option value="G7">Grade 7</option>
          <option value="G8">Grade 8</option>
          <option value="G9">Grade 9</option>
          <option value="G10">Grade 10</option>
          <option value="G11">Grade 11</option>
          <option value="G12">Grade 12</option>
        </select>
      </div>

      {/* Voter Stats Summary */}
      {!loading && (
        <div className="stat-grid">
          <div className="stat-box light">
            <span className="overline" style={{ color: "var(--primary-navy)", marginBottom: "4px" }}>Total Voters</span>
            <h1 style={{ fontSize: "32px", margin: 0 }}>{students.length}</h1>
            <span className="material-symbols-outlined watermark-icon" style={{ color: "rgba(11,23,54,0.06)" }}>group</span>
          </div>
          <div className="stat-box light">
            <span className="overline" style={{ color: "var(--accent-teal)", marginBottom: "4px" }}>Voted</span>
            <h1 style={{ fontSize: "32px", margin: 0 }}>{students.filter((s) => s.has_voted).length}</h1>
            <span className="material-symbols-outlined watermark-icon" style={{ color: "rgba(18,183,106,0.08)" }}>how_to_vote</span>
          </div>
          <div className="stat-box light">
            <span className="overline" style={{ color: "#D97706", marginBottom: "4px" }}>Not Yet Voted</span>
            <h1 style={{ fontSize: "32px", margin: 0 }}>{students.filter((s) => !s.has_voted).length}</h1>
            <span className="material-symbols-outlined watermark-icon" style={{ color: "rgba(217,119,6,0.08)" }}>pending</span>
          </div>
        </div>
      )}

      <div style={{ background: "white", padding: "32px", borderRadius: "24px", border: "1px solid var(--border-light)", boxShadow: "0 10px 40px rgba(11,23,54,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "32px" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "var(--primary-navy)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(11,23,54,0.2)" }}>
            <span className="material-symbols-outlined" style={{ fontSize: "24px" }}>group</span>
          </div>
          <h3 style={{ margin: 0, fontSize: "24px", color: "var(--primary-navy)", fontWeight: 800 }}>Voters Registry List</h3>
        </div>

        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
            <span className="material-symbols-outlined" style={{ fontSize: "32px", animation: "spin 1s linear infinite" }}>sync</span>
            <p style={{ marginTop: "12px", fontWeight: 600 }}>Loading registry...</p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", background: "#f8fafc", borderRadius: "16px", border: "2px dashed var(--border-light)" }}>
            <span className="material-symbols-outlined" style={{ fontSize: "40px", color: "#cbd5e1", marginBottom: "12px" }}>search_off</span>
            <p style={{ margin: 0, color: "var(--text-muted)", fontWeight: 500 }}>No students found matching the criteria.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {filteredStudents.map((s) => (
              <div key={s.id} style={{ padding: "20px 24px", background: "linear-gradient(145deg, #ffffff, #f8fafc)", borderRadius: "16px", border: "1px solid var(--border-light)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "24px", transition: "transform 0.2s ease, box-shadow 0.2s ease", flexWrap: "wrap" }} className="hover-lift">
                <div style={{ display: "flex", alignItems: "center", gap: "20px", minWidth: "220px" }}>
                  <img
                    src={
                      base64ToImageUrl(s.photo_url) ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=E8F0FE&color=0B1736`
                    }
                    alt={s.name}
                    style={{ width: "56px", height: "56px", borderRadius: "16px", objectFit: "cover", border: "2px solid white", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                    onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=E8F0FE&color=0B1736`; }}
                  />
                  <div>
                    <h4 style={{ margin: "0 0 6px 0", fontSize: "16px", color: "var(--primary-navy)", fontWeight: 700 }}>{s.name}</h4>
                    <div style={{ fontFamily: "monospace", fontSize: "13px", color: "var(--text-muted)" }}>LRN: {s.id}</div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "32px", flexWrap: "wrap", flex: 1, justifyContent: "flex-end" }}>
                  <div>
                    <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#94a3b8", marginBottom: "6px" }}>Grade</div>
                    <div style={{ display: "inline-block", padding: "4px 12px", background: "#f1f5f9", color: "#334155", borderRadius: "6px", fontSize: "13px", fontWeight: 600 }}>
                      {s.grade}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#94a3b8", marginBottom: "6px" }}>Section</div>
                    <div style={{ display: "inline-block", padding: "4px 12px", background: "#f1f5f9", color: "#334155", borderRadius: "6px", fontSize: "13px", fontWeight: 600 }}>
                      {s.section || "N/A"}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#94a3b8", marginBottom: "6px" }}>Password</div>
                    <div style={{ display: "inline-block", padding: "4px 12px", background: "#f1f5f9", color: "#334155", borderRadius: "6px", fontSize: "13px", fontWeight: 600, fontFamily: "monospace" }}>
                      {s.password || "N/A"}
                    </div>
                  </div>

                  <div style={{ minWidth: "100px" }}>
                    <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#94a3b8", marginBottom: "6px" }}>Status</div>
                    {s.has_voted ? (
                      <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "4px 12px", background: "#ecfdf5", border: "1px solid #a7f3d0", color: "#059669", borderRadius: "6px", fontSize: "12px", fontWeight: 700 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>check_circle</span>
                        Voted
                      </div>
                    ) : (
                      <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "4px 12px", background: "white", border: "1px solid var(--border-light)", color: "#64748b", borderRadius: "6px", fontSize: "12px", fontWeight: 600 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>pending</span>
                        Pending
                      </div>
                    )}
                  </div>

                  <button className="btn-light-blue" onClick={() => onViewProfile(s.id)} style={{ width: "auto", padding: "10px 20px", fontSize: "13px", height: "fit-content", borderRadius: "8px" }}>
                    View Profile
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      </div>
    </div>

    {/* PDF Password Auth Modal */}
    {showPdfAuth && (
      <div style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 99999, backdropFilter: "blur(4px)"
      }}>
        <div style={{
          background: "#fff", borderRadius: "16px", padding: "32px",
          width: "100%", maxWidth: "380px", boxShadow: "0 20px 60px rgba(0,0,0,0.2)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
            <span className="material-symbols-outlined" style={{ fontSize: "28px", color: "#DC2626" }}>lock</span>
            <h3 style={{ margin: 0, color: "#0b1736", fontSize: "18px", fontWeight: 800 }}>Confirm PDF Download</h3>
          </div>
          <p style={{ margin: "0 0 20px 0", color: "#64748b", fontSize: "13px" }}>
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
              width: "100%", padding: "12px 14px", border: `1px solid ${pdfAuthError ? "#DC2626" : "#E2E8F0"}`,
              borderRadius: "8px", fontSize: "14px", boxSizing: "border-box",
              outline: "none", marginBottom: "8px", background: "#F8FAFC"
            }}
          />
          {pdfAuthError && (
            <p style={{ margin: "0 0 12px 0", color: "#DC2626", fontSize: "12px", fontWeight: 600 }}>
              {pdfAuthError}
            </p>
          )}
          <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
            <button
              onClick={() => setShowPdfAuth(false)}
              style={{
                flex: 1, padding: "11px", borderRadius: "8px",
                border: "1px solid #E2E8F0", background: "#F8FAFC",
                color: "#64748b", fontWeight: 600, cursor: "pointer", fontSize: "14px"
              }}
            >
              Cancel
            </button>
            <button
              onClick={handlePdfAuthSubmit}
              style={{
                flex: 1, padding: "11px", borderRadius: "8px",
                border: "none", background: "#DC2626",
                color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: "14px"
              }}
            >
              Download
            </button>
          </div>
        </div>
      </div>
    )}
  );
};

export default AdminVotersList;
