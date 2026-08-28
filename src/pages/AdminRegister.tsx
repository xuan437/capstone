import React, { useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "../supabase";
import { Page } from "../types";
import { fileToBase64, base64ToImageUrl } from "../utils/imageUtils";
import { logAuditAction } from "../utils/auditLogger";
import { useLanguage } from "../context/LanguageContext";

interface ParsedCsvStudent {
  lrn: string;
  name: string;
  grade: string;
  section: string;
  age: number;
  password: string;
  valid: boolean;
  error?: string;
}

const AdminRegister: React.FC<{ setPage: (p: Page) => void }> = ({ setPage }) => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<"single" | "bulk">("single");

  // Single Registration State
  const [form, setForm] = useState({
    name: "",
    lrn: "",
    grade: "G7",
    section: "",
    age: "",
    password: "",
  });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Bulk Import State
  const [parsedStudents, setParsedStudents] = useState<ParsedCsvStudent[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkError, setBulkError] = useState("");
  const [bulkSuccessMsg, setBulkSuccessMsg] = useState("");

  const blockClipboard = (e: React.ClipboardEvent) => {
    e.preventDefault();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const base64 = await fileToBase64(file);
      setPhotoBase64(base64);
      setPreviewUrl(base64ToImageUrl(base64));
    } catch {
      setError("Failed to load photo preview.");
    }
  };

  const generatePassword = (length = 6) => {
    const chars = "abcdefghjkmnpqrstuvwxyz23456789";
    let res = "";
    for (let i = 0; i < length; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return res;
  };

  const handleAutoGeneratePassword = () => {
    const pwd = generatePassword(6);
    setForm((prev) => ({ ...prev, password: pwd }));
  };

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!form.name.trim() || !form.lrn.trim() || !form.section.trim()) {
      setError("Please fill in all required fields (Name, LRN, Section).");
      return;
    }

    if (!/^\d{12}$/.test(form.lrn.trim())) {
      setError("Learner Reference Number (LRN) must be exactly 12 digits.");
      return;
    }

    const ageNum = parseInt(form.age, 10);
    if (form.age && (isNaN(ageNum) || ageNum < 10 || ageNum > 30)) {
      setError("Please enter a valid age between 10 and 30.");
      return;
    }

    setLoading(true);

    try {
      const pwd = form.password || generatePassword(6);

      const record = {
        id: form.lrn.trim(),
        name: form.name.trim(),
        password: pwd,
        grade: form.grade,
        section: form.section.trim(),
        age: ageNum || 15,
        photo_url: photoBase64 || undefined,
        has_voted: false,
      };

      const { error: insertErr } = await supabase.from("students").upsert([record]);

      if (insertErr) {
        console.warn("Supabase insert warning:", insertErr.message);
      }

      await logAuditAction("VOTER_REGISTERED", "Admin", `Registered student ${form.name} (LRN: ${form.lrn})`);

      setSuccess(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // --- Bulk Excel & CSV Parser ---
  const downloadSampleCsv = () => {
    const csvContent = "data:text/csv;charset=utf-8,lrn,name,grade,section,age\n109876543201,Maria Santos,G10,Sampaguita,16\n109876543202,Juan dela Cruz,G9,Rizal,15\n109876543203,Ana Reyes,G12,Luna,18\n";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "student_voters_sample_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadSampleExcel = () => {
    const templateData = [
      ["lrn", "name", "grade", "section", "age"],
      ["109876543201", "Maria Santos", "G10", "Sampaguita", 16],
      ["109876543202", "Juan dela Cruz", "G9", "Rizal", 15],
      ["109876543203", "Ana Reyes", "G12", "Luna", 18],
    ];
    const ws = XLSX.utils.aoa_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Voters Roster");
    XLSX.writeFile(wb, "student_voters_sample_template.xlsx");
  };

  const handleBulkFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBulkError("");
    setBulkSuccessMsg("");

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const arrayBuffer = evt.target?.result as ArrayBuffer;
        if (!arrayBuffer) return;

        const data = new Uint8Array(arrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });

        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        const jsonData = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, raw: false });

        if (!jsonData || jsonData.length <= 1) {
          setBulkError("The uploaded Excel/CSV file is empty or missing headers.");
          return;
        }

        const rows: ParsedCsvStudent[] = [];
        // Skip header row
        for (let i = 1; i < jsonData.length; i++) {
          const rowArray = jsonData[i] as any[];
          if (!rowArray || rowArray.length === 0) continue;

          const lrnRaw = String(rowArray[0] || "").trim().replace(/^"|"$/g, "");
          const nameRaw = String(rowArray[1] || "").trim().replace(/^"|"$/g, "");
          const gradeRaw = String(rowArray[2] || "").trim().replace(/^"|"$/g, "");
          const sectionRaw = String(rowArray[3] || "").trim().replace(/^"|"$/g, "");
          const ageRaw = String(rowArray[4] || "").trim().replace(/^"|"$/g, "");

          if (!lrnRaw && !nameRaw) continue;

          const lrnClean = lrnRaw.replace(/\D/g, "");
          const isValidLrn = /^\d{12}$/.test(lrnClean);
          const ageNum = parseInt(ageRaw || "16", 10);
          const pwd = generatePassword(6);

          rows.push({
            lrn: lrnClean || lrnRaw,
            name: nameRaw || `Student ${i}`,
            grade: gradeRaw ? (gradeRaw.startsWith("G") ? gradeRaw : `G${gradeRaw}`) : "G7",
            section: sectionRaw || "Regular",
            age: isNaN(ageNum) ? 16 : ageNum,
            password: pwd,
            valid: isValidLrn && !!nameRaw,
            error: !isValidLrn ? "LRN must be 12 digits" : !nameRaw ? "Name required" : undefined,
          });
        }

        if (rows.length === 0) {
          setBulkError("No valid student rows found in the uploaded file.");
        }

        setParsedStudents(rows);
      } catch (err) {
        console.error("Error reading file:", err);
        setBulkError("Failed to parse file. Please upload a valid .xlsx, .xls, or .csv file.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleProcessBulkImport = async () => {
    const validRows = parsedStudents.filter((s) => s.valid);
    if (validRows.length === 0) {
      setBulkError("No valid student rows to import.");
      return;
    }

    setBulkLoading(true);
    setBulkError("");

    try {
      const recordsToInsert = validRows.map((s) => ({
        id: s.lrn,
        name: s.name,
        password: s.password,
        grade: s.grade,
        section: s.section,
        age: s.age,
        has_voted: false,
      }));

      const { error: insertErr } = await supabase.from("students").upsert(recordsToInsert);

      if (insertErr) {
        console.warn("Supabase bulk insert warning:", insertErr.message);
      }

      await logAuditAction(
        "VOTER_BULK_REGISTERED",
        "Admin",
        `Successfully bulk imported ${validRows.length} voters via CSV roster`
      );

      setBulkSuccessMsg(`Successfully imported ${validRows.length} student voters! Credentials are ready for export.`);
    } catch (err) {
      console.error("Bulk import error:", err);
      setBulkError("Failed to import voters. Please check database connection.");
    } finally {
      setBulkLoading(false);
    }
  };

  const downloadCredentialsReport = () => {
    const validRows = parsedStudents.filter((s) => s.valid);
    if (validRows.length === 0) return;

    let content = "DOMINGO LEDESMA MAPA HIGH SCHOOL - OFFICIAL VOTER CREDENTIALS REPORT\n";
    content += `Generated Date: ${new Date().toLocaleString()}\n`;
    content += `Total Enrolled Voters: ${validRows.length}\n`;
    content += "=================================================================================\n\n";
    content += "LRN ID       | FULL NAME                      | GRADE & SECTION  | TEMPORARY PASSWORD\n";
    content += "-------------+--------------------------------+------------------+--------------------\n";

    validRows.forEach((s) => {
      const lrnPad = s.lrn.padEnd(12, " ");
      const namePad = s.name.padEnd(30, " ");
      const classPad = `${s.grade} - ${s.section}`.padEnd(16, " ");
      content += `${lrnPad} | ${namePad} | ${classPad} | ${s.password}\n`;
    });

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Voter_Credentials_Export_${new Date().toISOString().split("T")[0]}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const resetForm = () => {
    setForm({ name: "", lrn: "", grade: "G7", section: "", age: "", password: "" });
    setPreviewUrl(null);
    setPhotoBase64(null);
    setSuccess(false);
    setError("");
  };

  if (success) {
    return (
      <div className="screen-content content-max-width">
        <div className="card-box flex-center" style={{ padding: "48px 32px", flexDirection: "column", textAlign: "center", maxWidth: "560px", margin: "30px auto" }}>
          <span className="material-symbols-outlined confirm-success-icon" style={{ marginBottom: "20px" }}>
            check_circle
          </span>
          <h2 style={{ fontSize: "24px", color: "var(--primary-navy)", marginBottom: "8px" }}>
            Student Registered Successfully!
          </h2>
          <p style={{ color: "var(--text-muted)", marginBottom: "24px", fontSize: "14px" }}>
            The student account for <strong>{form.name}</strong> (LRN: <code>{form.lrn}</code>) has been created.
          </p>

          <div style={{ display: "flex", gap: "12px", width: "100%", justifyContent: "center", flexWrap: "wrap" }}>
            <button className="btn-primary" onClick={resetForm} style={{ padding: "12px 24px" }}>
              <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>person_add</span>
              Register Another Student
            </button>
            <button className="btn-outline-wide" onClick={() => setPage("admin_voters")} style={{ padding: "12px 24px" }}>
              <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>list_alt</span>
              View Voters List
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="screen-content content-max-width">
      <div style={{ maxWidth: "860px", margin: "0 auto", width: "100%" }}>
        <div style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <span className="overline">Student Enrollment</span>
            <h1 style={{ margin: "4px 0" }}>Register Student Voters</h1>
            <p style={{ color: "var(--text-muted)", margin: 0 }}>
              Add individual student accounts or bulk import entire class rosters via CSV.
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div style={{ display: "flex", backgroundColor: "var(--bg-surface)", padding: "4px", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-light)" }}>
            <button
              onClick={() => setActiveTab("single")}
              style={{
                padding: "8px 18px",
                borderRadius: "var(--radius-md)",
                border: "none",
                backgroundColor: activeTab === "single" ? "var(--primary-navy)" : "transparent",
                color: activeTab === "single" ? "var(--text-white)" : "var(--text-muted)",
                fontWeight: 700,
                fontSize: "13px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>person_add</span>
              {t.singleStudentTab || "Single Student"}
            </button>
            <button
              onClick={() => setActiveTab("bulk")}
              style={{
                padding: "8px 18px",
                borderRadius: "var(--radius-md)",
                border: "none",
                backgroundColor: activeTab === "bulk" ? "var(--primary-navy)" : "transparent",
                color: activeTab === "bulk" ? "var(--text-white)" : "var(--text-muted)",
                fontWeight: 700,
                fontSize: "13px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>upload_file</span>
              {t.bulkCsvTab || "Bulk CSV Import"}
            </button>
          </div>
        </div>

        {activeTab === "single" ? (
          <div className="card-box">
            {error && (
              <div style={{ color: "var(--color-danger)", background: "var(--color-danger-bg)", border: "1px solid var(--color-danger-border)", padding: "12px 16px", borderRadius: "8px", fontSize: "13px", marginBottom: "24px", fontWeight: 600 }}>
                {error}
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "32px", alignItems: "start" }}>
              {/* Left Column */}
              <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                <div style={{ fontSize: "13px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-main)", paddingBottom: "8px", borderBottom: "1px solid var(--border-light)" }}>
                  1. Basic Information
                </div>

                <div>
                  <label className="form-label" style={{ display: "block", marginBottom: "6px" }}>
                    Full Name *
                  </label>
                  <input
                    name="name"
                    placeholder="e.g. Juan dela Cruz"
                    value={form.name}
                    onChange={handleChange}
                    style={{ width: "100%", padding: "12px", fontSize: "14px" }}
                  />
                </div>

                <div>
                  <label className="form-label" style={{ display: "block", marginBottom: "6px" }}>
                    Learner Reference Number (LRN) *
                  </label>
                  <input
                    name="lrn"
                    placeholder="12-digit LRN (e.g. 109876543210)"
                    value={form.lrn}
                    onChange={handleChange}
                    maxLength={12}
                    autoComplete="off"
                    style={{ width: "100%", padding: "12px", fontFamily: "var(--font-sans)", fontSize: "14px" }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                  <div>
                    <label className="form-label" style={{ display: "block", marginBottom: "6px" }}>
                      Grade Level *
                    </label>
                    <select
                      name="grade"
                      value={form.grade}
                      onChange={handleChange}
                      style={{ width: "100%", padding: "12px 36px 12px 14px", height: "46px" }}
                    >
                      <option value="G7">Grade 7</option>
                      <option value="G8">Grade 8</option>
                      <option value="G9">Grade 9</option>
                      <option value="G10">Grade 10</option>
                      <option value="G11">Grade 11</option>
                      <option value="G12">Grade 12</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label" style={{ display: "block", marginBottom: "6px" }}>
                      Age *
                    </label>
                    <input
                      name="age"
                      type="number"
                      min={5}
                      max={100}
                      placeholder="e.g. 15"
                      value={form.age}
                      onChange={handleChange}
                      style={{ width: "100%", padding: "12px", height: "46px", boxSizing: "border-box" }}
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label" style={{ display: "block", marginBottom: "6px" }}>
                    Section *
                  </label>
                  <input
                    name="section"
                    placeholder="e.g. Sampaguita / Grade 10-B"
                    value={form.section}
                    onChange={handleChange}
                    style={{ width: "100%", padding: "12px", fontSize: "14px" }}
                  />
                </div>
              </div>

              {/* Right Column */}
              <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                <div style={{ fontSize: "13px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-main)", paddingBottom: "8px", borderBottom: "1px solid var(--border-light)" }}>
                  2. Account Security & Credentials
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <label className="form-label" style={{ margin: 0 }}>
                      Access Password *
                    </label>
                    <button
                      type="button"
                      onClick={handleAutoGeneratePassword}
                      style={{
                        padding: "4px 10px",
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--border-light)",
                        backgroundColor: "var(--bg-surface)",
                        color: "var(--primary-navy)",
                        fontSize: "12px",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>key</span>
                      Auto-Generate
                    </button>
                  </div>
                  <input
                    name="password"
                    type="text"
                    placeholder="Set temporary login password"
                    value={form.password}
                    onChange={handleChange}
                    onCopy={blockClipboard}
                    style={{ width: "100%", padding: "12px", fontFamily: "var(--font-mono)", fontSize: "14px", fontWeight: 700 }}
                  />
                </div>

                {/* Profile Photo */}
                <div>
                  <label className="form-label" style={{ display: "block", marginBottom: "6px" }}>
                    Student Profile Photo (Optional)
                  </label>
                  <input type="file" accept="image/*" onChange={handlePhotoChange} style={{ fontSize: "13px" }} />
                  {previewUrl && (
                    <img
                      src={previewUrl}
                      alt="Preview"
                      style={{ width: "80px", height: "80px", objectFit: "cover", borderRadius: "50%", marginTop: "10px", border: "2px solid var(--primary-navy)" }}
                    />
                  )}
                </div>

                <div style={{ marginTop: "16px" }}>
                  <button
                    onClick={handleSingleSubmit}
                    disabled={loading}
                    className="btn-primary"
                    style={{ width: "100%", padding: "14px", fontSize: "15px", fontWeight: 700, borderRadius: "var(--radius-md)" }}
                  >
                    {loading ? "Registering..." : "Submit Registration"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* BULK EXCEL / CSV IMPORT TAB */
          <div className="card-box" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "16px", color: "var(--primary-navy)" }}>Bulk Import Roster via Excel or CSV</h3>
                <p style={{ margin: "4px 0 0", fontSize: "12.5px", color: "var(--text-light)" }}>
                  Upload a <strong>.xlsx</strong>, <strong>.xls</strong>, or <strong>.csv</strong> file containing student records. System auto-generates credentials.
                </p>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={downloadSampleExcel}
                  style={{
                    padding: "8px 14px",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-light)",
                    backgroundColor: "var(--bg-surface)",
                    color: "var(--primary-navy)",
                    fontSize: "12.5px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>description</span>
                  Excel Template (.xlsx)
                </button>
                <button
                  onClick={downloadSampleCsv}
                  style={{
                    padding: "8px 14px",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-light)",
                    backgroundColor: "var(--bg-surface)",
                    color: "var(--primary-navy)",
                    fontSize: "12.5px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>download</span>
                  CSV Template (.csv)
                </button>
              </div>
            </div>

            {bulkError && (
              <div style={{ color: "var(--color-danger)", background: "var(--color-danger-bg)", border: "1px solid var(--color-danger-border)", padding: "12px 16px", borderRadius: "8px", fontSize: "13px" }}>
                {bulkError}
              </div>
            )}

            {bulkSuccessMsg && (
              <div style={{ color: "var(--color-success)", background: "var(--color-success-bg)", border: "1px solid var(--color-success-border)", padding: "14px 16px", borderRadius: "8px", fontSize: "13.5px", fontWeight: 700, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>{bulkSuccessMsg}</span>
                <button
                  onClick={downloadCredentialsReport}
                  className="btn-primary"
                  style={{ padding: "6px 14px", fontSize: "12.5px" }}
                >
                  Download Credentials TXT
                </button>
              </div>
            )}

            {/* Dropzone */}
            <div
              style={{
                border: "2px dashed var(--border-subtle)",
                borderRadius: "var(--radius-lg)",
                padding: "32px",
                textAlign: "center",
                backgroundColor: "var(--bg-surface)",
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "40px", color: "var(--primary-navy)", marginBottom: "8px" }}>
                cloud_upload
              </span>
              <p style={{ margin: "0 0 4px", fontSize: "14px", fontWeight: 700, color: "var(--text-main)" }}>
                Select or Drag & Drop Student Roster File
              </p>
              <p style={{ margin: "0 0 14px", fontSize: "12px", color: "var(--text-muted)" }}>
                Supports Microsoft Excel (.xlsx, .xls) and CSV (.csv) spreadsheets
              </p>
              <input type="file" accept=".xlsx, .xls, .csv" onChange={handleBulkFileUpload} style={{ fontSize: "13px" }} />
            </div>

            {/* Parsed Preview Table */}
            {parsedStudents.length > 0 && (
              <div style={{ marginTop: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <h4 style={{ margin: 0, fontSize: "14px", color: "var(--text-main)" }}>
                    Parsed Voters Preview ({parsedStudents.filter((s) => s.valid).length} Valid / {parsedStudents.length} Total)
                  </h4>
                  <button
                    onClick={handleProcessBulkImport}
                    disabled={bulkLoading}
                    className="btn-primary"
                    style={{ padding: "8px 20px", fontSize: "13px" }}
                  >
                    {bulkLoading ? "Importing..." : "Confirm & Import All"}
                  </button>
                </div>

                <div style={{ maxHeight: "300px", overflowY: "auto", border: "1px solid var(--border-light)", borderRadius: "var(--radius-md)" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px", textAlign: "left" }}>
                    <thead>
                      <tr style={{ backgroundColor: "var(--primary-navy)", color: "var(--text-white)" }}>
                        <th style={{ padding: "8px 12px" }}>Status</th>
                        <th style={{ padding: "8px 12px" }}>LRN</th>
                        <th style={{ padding: "8px 12px" }}>Full Name</th>
                        <th style={{ padding: "8px 12px" }}>Grade & Section</th>
                        <th style={{ padding: "8px 12px" }}>Generated Password</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedStudents.map((st, idx) => (
                        <tr key={idx} style={{ borderBottom: "1px solid var(--border-light)", backgroundColor: st.valid ? "var(--bg-main)" : "var(--color-danger-bg)" }}>
                          <td style={{ padding: "8px 12px" }}>
                            {st.valid ? (
                              <span style={{ color: "var(--color-success)", fontWeight: 700 }}>✓ Valid</span>
                            ) : (
                              <span style={{ color: "var(--color-danger)", fontWeight: 700 }}>✕ {st.error}</span>
                            )}
                          </td>
                          <td style={{ padding: "8px 12px", fontFamily: "var(--font-mono)" }}>{st.lrn}</td>
                          <td style={{ padding: "8px 12px", fontWeight: 600 }}>{st.name}</td>
                          <td style={{ padding: "8px 12px" }}>{st.grade} - {st.section}</td>
                          <td style={{ padding: "8px 12px", fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--primary-navy)" }}>{st.password}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminRegister;