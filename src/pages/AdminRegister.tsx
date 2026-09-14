import React, { useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "../supabase";
import { Page } from "../types";
import { fileToBase64, base64ToImageUrl } from "../utils/imageUtils";
import { logAuditAction } from "../utils/auditLogger";
import { useLanguage } from "../context/LanguageContext";
import { UserPlus, UploadCloud, CheckCircle2, FileText, Download, Key, AlertCircle, List, UserCheck, Upload, User } from "lucide-react";

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
      <div style={{ maxWidth: "520px", margin: "40px auto", padding: "0 20px" }}>
        <div
          style={{
            backgroundColor: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "8px",
            padding: "32px 24px",
            textAlign: "center",
            boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
          }}
        >
          <div style={{
            width: "44px",
            height: "44px",
            borderRadius: "50%",
            backgroundColor: "rgba(16, 185, 129, 0.12)",
            border: "1px solid rgba(16, 185, 129, 0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 14px auto",
            color: "#10B981"
          }}>
            <CheckCircle2 size={22} />
          </div>
          <h2 style={{ fontSize: "18px", fontWeight: 600, color: "var(--text-main)", marginBottom: "6px" }}>
            Student Registered Successfully!
          </h2>
          <p style={{ color: "var(--text-muted)", marginBottom: "20px", fontSize: "13px" }}>
            Student account for <strong>{form.name}</strong> (LRN: <code style={{ fontFamily: "monospace" }}>{form.lrn}</code>) is ready.
          </p>

          <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
            <button className="btn-primary" onClick={resetForm} style={{ padding: "8px 16px", borderRadius: "6px", fontSize: "12.5px", display: "flex", alignItems: "center", gap: "6px" }}>
              <UserPlus size={14} />
              Register Another
            </button>
            <button className="btn-secondary" onClick={() => setPage("admin_voters")} style={{ padding: "8px 16px", borderRadius: "6px", fontSize: "12.5px", display: "flex", alignItems: "center", gap: "6px" }}>
              <List size={14} />
              Voters Roster
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "860px", margin: "0 auto", padding: "16px 20px" }}>
      <div style={{ marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
            <div style={{
              width: "26px",
              height: "26px",
              borderRadius: "6px",
              backgroundColor: "rgba(99, 102, 241, 0.12)",
              border: "1px solid rgba(99, 102, 241, 0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--accent-primary)"
            }}>
              <UserPlus size={14} />
            </div>
            <h1 style={{ margin: 0, fontSize: "18px", fontWeight: 600, color: "var(--text-main)", letterSpacing: "-0.01em" }}>
              Register Student Voters
            </h1>
          </div>
          <p style={{ margin: 0, fontSize: "12px", color: "var(--text-muted)" }}>
            Add individual student accounts or bulk import entire class rosters via Excel/CSV spreadsheets.
          </p>
        </div>

        {/* Mode Switcher Tabs */}
        <div style={{ display: "flex", backgroundColor: "var(--bg-surface)", padding: "3px", borderRadius: "6px", border: "1px solid var(--border-subtle)" }}>
          <button
            onClick={() => setActiveTab("single")}
            style={{
              padding: "5px 12px",
              borderRadius: "4px",
              border: "none",
              backgroundColor: activeTab === "single" ? "var(--bg-card)" : "transparent",
              color: activeTab === "single" ? "var(--text-main)" : "var(--text-muted)",
              fontWeight: 500,
              fontSize: "12px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              transition: "all 150ms ease"
            }}
          >
            <UserCheck size={13} />
            {t.singleStudentTab || "Single Student"}
          </button>
          <button
            onClick={() => setActiveTab("bulk")}
            style={{
              padding: "5px 12px",
              borderRadius: "4px",
              border: "none",
              backgroundColor: activeTab === "bulk" ? "var(--bg-card)" : "transparent",
              color: activeTab === "bulk" ? "var(--text-main)" : "var(--text-muted)",
              fontWeight: 500,
              fontSize: "12px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              transition: "all 150ms ease"
            }}
          >
            <UploadCloud size={13} />
            {t.bulkCsvTab || "Bulk CSV Import"}
          </button>
        </div>
      </div>

      {activeTab === "single" ? (
        <div
          style={{
            backgroundColor: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "8px",
            padding: "16px 20px",
            boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
          }}
        >
          {error && (
            <div style={{
              backgroundColor: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.2)",
              color: "#EF4444",
              padding: "8px 12px",
              borderRadius: "6px",
              fontSize: "12px",
              marginBottom: "16px",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}>
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px", alignItems: "start" }}>
            {/* Left Column */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.03em", color: "var(--text-muted)", paddingBottom: "6px", borderBottom: "1px solid var(--border-subtle)" }}>
                Basic Student Identity
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", fontWeight: 500, color: "var(--text-muted)" }}>
                  Full Name *
                </label>
                <input
                  name="name"
                  placeholder="e.g. Juan dela Cruz"
                  value={form.name}
                  onChange={handleChange}
                  style={{
                    width: "100%",
                    padding: "7px 10px",
                    borderRadius: "6px",
                    border: "1px solid var(--border-subtle)",
                    backgroundColor: "var(--bg-main)",
                    color: "var(--text-main)",
                    fontSize: "13px"
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", fontWeight: 500, color: "var(--text-muted)" }}>
                  Learner Reference Number (LRN) *
                </label>
                <input
                  name="lrn"
                  placeholder="12-digit LRN (e.g. 109876543210)"
                  value={form.lrn}
                  onChange={handleChange}
                  maxLength={12}
                  autoComplete="off"
                  style={{
                    width: "100%",
                    padding: "7px 10px",
                    borderRadius: "6px",
                    border: "1px solid var(--border-subtle)",
                    backgroundColor: "var(--bg-main)",
                    color: "var(--text-main)",
                    fontFamily: "monospace",
                    fontSize: "13px"
                  }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", fontWeight: 500, color: "var(--text-muted)" }}>
                    Grade Level *
                  </label>
                  <select
                    name="grade"
                    value={form.grade}
                    onChange={handleChange}
                    style={{
                      width: "100%",
                      padding: "7px 10px",
                      borderRadius: "6px",
                      border: "1px solid var(--border-subtle)",
                      backgroundColor: "var(--bg-main)",
                      color: "var(--text-main)",
                      fontSize: "12.5px"
                    }}
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
                  <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", fontWeight: 500, color: "var(--text-muted)" }}>
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
                    style={{
                      width: "100%",
                      padding: "7px 10px",
                      borderRadius: "6px",
                      border: "1px solid var(--border-subtle)",
                      backgroundColor: "var(--bg-main)",
                      color: "var(--text-main)",
                      fontSize: "13px"
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", fontWeight: 500, color: "var(--text-muted)" }}>
                  Section / Class Track *
                </label>
                <input
                  name="section"
                  placeholder="e.g. Sampaguita / Grade 10-B"
                  value={form.section}
                  onChange={handleChange}
                  style={{
                    width: "100%",
                    padding: "7px 10px",
                    borderRadius: "6px",
                    border: "1px solid var(--border-subtle)",
                    backgroundColor: "var(--bg-main)",
                    color: "var(--text-main)",
                    fontSize: "13px"
                  }}
                />
              </div>
            </div>

            {/* Right Column */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.03em", color: "var(--text-muted)", paddingBottom: "6px", borderBottom: "1px solid var(--border-subtle)" }}>
                Account Passcode & Photo
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                  <label style={{ margin: 0, fontSize: "12px", fontWeight: 500, color: "var(--text-muted)" }}>
                    Access Password *
                  </label>
                  <button
                    type="button"
                    onClick={handleAutoGeneratePassword}
                    className="btn-secondary"
                    style={{
                      padding: "4px 10px",
                      borderRadius: "6px",
                      fontSize: "11.5px",
                      fontWeight: 600,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                      backgroundColor: "var(--accent-blue)",
                      borderColor: "var(--border-blue)",
                      color: "var(--accent-primary)",
                      cursor: "pointer",
                    }}
                  >
                    <Key size={13} />
                    <span>Auto-Generate</span>
                  </button>
                </div>
                <input
                  name="password"
                  type="text"
                  placeholder="Set temporary login password"
                  value={form.password}
                  onChange={handleChange}
                  onCopy={blockClipboard}
                  style={{
                    width: "100%",
                    padding: "7px 10px",
                    borderRadius: "6px",
                    border: "1px solid var(--border-subtle)",
                    backgroundColor: "var(--bg-main)",
                    color: "var(--text-main)",
                    fontFamily: "monospace",
                    fontSize: "13px",
                    fontWeight: 600
                  }}
                />
              </div>

              {/* Profile Photo */}
              <div>
                <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", fontWeight: 500, color: "var(--text-muted)" }}>
                  Profile Photo (Optional)
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 14px", backgroundColor: "var(--bg-main)", borderRadius: "6px", border: "1px solid var(--border-subtle)" }}>
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="Preview"
                      style={{ width: "42px", height: "42px", objectFit: "cover", borderRadius: "50%", border: "2px solid var(--accent-primary)", flexShrink: 0 }}
                    />
                  ) : (
                    <div style={{ width: "42px", height: "42px", borderRadius: "50%", backgroundColor: "var(--bg-subtle)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-light)", flexShrink: 0 }}>
                      <User size={20} />
                    </div>
                  )}
                  <label
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      padding: "6px 14px",
                      backgroundColor: "var(--accent-blue)",
                      border: "1px solid var(--border-blue)",
                      borderRadius: "6px",
                      color: "var(--accent-primary)",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <Upload size={14} />
                    <span>{photoBase64 ? "Photo Loaded" : "Choose Profile Photo"}</span>
                    <input type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: "none" }} />
                  </label>
                </div>
              </div>

              <div style={{ marginTop: "12px" }}>
                <button
                  onClick={handleSingleSubmit}
                  disabled={loading}
                  className="btn-primary"
                  style={{ width: "100%", padding: "8px 14px", fontSize: "13px", fontWeight: 500, borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
                >
                  <UserPlus size={14} />
                  {loading ? "Registering..." : "Submit Registration"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* BULK EXCEL / CSV IMPORT TAB */
        <div
          style={{
            backgroundColor: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "8px",
            padding: "16px 20px",
            boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
            display: "flex",
            flexDirection: "column",
            gap: "14px"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: "var(--text-main)" }}>Bulk Import Student Roster</h3>
              <p style={{ margin: "2px 0 0", fontSize: "12px", color: "var(--text-muted)" }}>
                Upload <strong>.xlsx</strong>, <strong>.xls</strong>, or <strong>.csv</strong> rosters. System auto-assigns credentials.
              </p>
            </div>
            <div style={{ display: "flex", gap: "6px" }}>
              <button
                onClick={downloadSampleExcel}
                className="btn-secondary"
                style={{ padding: "5px 10px", borderRadius: "6px", fontSize: "11.5px", fontWeight: 500, display: "flex", alignItems: "center", gap: "4px" }}
              >
                <FileText size={13} />
                Excel Template (.xlsx)
              </button>
              <button
                onClick={downloadSampleCsv}
                className="btn-secondary"
                style={{ padding: "5px 10px", borderRadius: "6px", fontSize: "11.5px", fontWeight: 500, display: "flex", alignItems: "center", gap: "4px" }}
              >
                <Download size={13} />
                CSV Template (.csv)
              </button>
            </div>
          </div>

          {bulkError && (
            <div style={{
              backgroundColor: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.2)",
              color: "#EF4444",
              padding: "8px 12px",
              borderRadius: "6px",
              fontSize: "12px",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}>
              <AlertCircle size={14} />
              <span>{bulkError}</span>
            </div>
          )}

          {bulkSuccessMsg && (
            <div style={{
              backgroundColor: "rgba(16, 185, 129, 0.1)",
              border: "1px solid rgba(16, 185, 129, 0.2)",
              color: "#10B981",
              padding: "10px 12px",
              borderRadius: "6px",
              fontSize: "12.5px",
              fontWeight: 500,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <CheckCircle2 size={15} />
                <span>{bulkSuccessMsg}</span>
              </div>
              <button
                onClick={downloadCredentialsReport}
                className="btn-primary"
                style={{ padding: "4px 10px", fontSize: "11.5px", borderRadius: "4px" }}
              >
                Download Passwords (.txt)
              </button>
            </div>
          )}

          {/* Dropzone */}
          <div
            style={{
              border: "2px dashed var(--border-blue)",
              borderRadius: "10px",
              padding: "28px 20px",
              textAlign: "center",
              backgroundColor: "var(--accent-blue)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            <UploadCloud size={32} style={{ color: "var(--accent-primary)", marginBottom: "2px" }} />
            <p style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: "var(--text-main)" }}>
              Upload Roster Spreadsheet
            </p>
            <p style={{ margin: 0, fontSize: "12px", color: "var(--text-muted)" }}>
              Supports Microsoft Excel (.xlsx, .xls) and standard CSV files
            </p>
            <label
              style={{
                marginTop: "8px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                padding: "8px 20px",
                backgroundColor: "var(--primary-navy)",
                color: "#ffffff",
                borderRadius: "6px",
                fontSize: "12.5px",
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: "var(--shadow-sm)",
                transition: "all 0.15s ease",
              }}
            >
              <FileText size={15} />
              <span>Choose Spreadsheet File</span>
              <input type="file" accept=".xlsx, .xls, .csv" onChange={handleBulkFileUpload} style={{ display: "none" }} />
            </label>
          </div>

          {/* Parsed Preview Table */}
          {parsedStudents.length > 0 && (
            <div style={{ marginTop: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <h4 style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: "var(--text-main)" }}>
                  Parsed Roster Preview ({parsedStudents.filter((s) => s.valid).length} Valid / {parsedStudents.length} Total)
                </h4>
                <button
                  onClick={handleProcessBulkImport}
                  disabled={bulkLoading}
                  className="btn-primary"
                  style={{ padding: "6px 14px", fontSize: "12px", borderRadius: "6px" }}
                >
                  {bulkLoading ? "Importing..." : "Confirm & Import Roster"}
                </button>
              </div>

              <div style={{ maxHeight: "260px", overflowY: "auto", border: "1px solid var(--border-subtle)", borderRadius: "6px" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", textAlign: "left" }}>
                  <thead>
                    <tr style={{ backgroundColor: "var(--bg-card)", color: "var(--text-muted)", borderBottom: "1px solid var(--border-subtle)" }}>
                      <th style={{ padding: "6px 10px" }}>Status</th>
                      <th style={{ padding: "6px 10px" }}>LRN</th>
                      <th style={{ padding: "6px 10px" }}>Full Name</th>
                      <th style={{ padding: "6px 10px" }}>Grade & Section</th>
                      <th style={{ padding: "6px 10px" }}>Auto Password</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedStudents.map((st, idx) => (
                      <tr key={idx} style={{ borderBottom: "1px solid var(--border-subtle)", backgroundColor: st.valid ? "transparent" : "rgba(239, 68, 68, 0.05)" }}>
                        <td style={{ padding: "6px 10px" }}>
                          {st.valid ? (
                            <span style={{ color: "#10B981", fontWeight: 600, fontSize: "11px" }}>✓ Valid</span>
                          ) : (
                            <span style={{ color: "#EF4444", fontWeight: 600, fontSize: "11px" }}>✕ {st.error}</span>
                          )}
                        </td>
                        <td style={{ padding: "6px 10px", fontFamily: "monospace" }}>{st.lrn}</td>
                        <td style={{ padding: "6px 10px", fontWeight: 500 }}>{st.name}</td>
                        <td style={{ padding: "6px 10px" }}>{st.grade} - {st.section}</td>
                        <td style={{ padding: "6px 10px", fontFamily: "monospace", fontWeight: 600, color: "var(--accent-primary)" }}>{st.password}</td>
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
  );
};

export default AdminRegister;