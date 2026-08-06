import React, { useState } from "react";
import { supabase } from "../supabase";
import { Page } from "../types";
import ReturnButton from "../components/ReturnButton";
import { fileToBase64, base64ToImageUrl } from "../utils/imageUtils";
import PasswordGenerator from "../components/PasswordGenerator";

const AdminRegister: React.FC<{ setPage: (p: Page) => void }> = ({ setPage }) => {
  const [form, setForm] = useState({
    name: "",
    lrn: "",
    grade: "G7",
    section: "",
    age: "",
    password: ""
  });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [clipboardAlert, setClipboardAlert] = useState(false);

  const blockClipboard = (e: React.ClipboardEvent) => {
    e.preventDefault();
    setClipboardAlert(true);
    setTimeout(() => setClipboardAlert(false), 3000);
  };

  const [photoBase64, setPhotoBase64] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      const base64 = await fileToBase64(file);
      setPhotoBase64(base64);
      setPreviewUrl(base64ToImageUrl(base64));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) return setError("Please enter student name");
    if (!/^\d{12}$/.test(form.lrn)) return setError("LRN must be exactly 12 digits");
    if (!form.section.trim()) return setError("Please enter a section");

    // Validate age range safely
    const parsedAge = parseInt(form.age, 10);
    if (isNaN(parsedAge) || parsedAge < 5 || parsedAge > 100) {
      return setError("Please enter a valid age");
    }

    if (!form.password) return setError("Please enter a password");

    setLoading(true);
    setError("");

    try {
      const { data: existing } = await supabase
        .from("students")
        .select("id")
        .eq("id", form.lrn)
        .single();

      if (existing) {
        setError("A student with this LRN already exists");
        setLoading(false);
        return;
      }

      const { error: insertError } = await supabase.from("students").insert([
        {
          id: form.lrn,
          name: form.name.trim(),
          password: form.password,
          grade: form.grade,
          section: form.section.trim(),
          age: parsedAge,
          has_voted: false,
          photo_url: photoBase64,
        },
      ]);

      if (insertError) {
        console.error('Supabase insert error:', insertError);
        const detailed = insertError.message || JSON.stringify(insertError);
        setError(`Insert failed: ${detailed}`);
        throw insertError;
      }

      setSuccess(true);
      setForm({ name: "", lrn: "", grade: "G7", section: "", age: "", password: "" });
      setPreviewUrl(null);
      setPhotoBase64(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="screen-content content-max-width">
        <ReturnButton onClick={() => setPage("admin_setup")} />
        <div className="card-box" style={{ textAlign: "center", padding: "60px 20px" }}>
          <span className="material-symbols-outlined" style={{ fontSize: "64px", color: "#10b981", marginBottom: "20px" }}>
            check_circle
          </span>
          <h2>Student Registered Successfully!</h2>
          <p>The student has been added to the voters list.</p>
          <button className="btn-primary" onClick={() => setSuccess(false)} style={{ marginTop: "20px" }}>
            Register Another Student
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen-content content-max-width">
      <ReturnButton onClick={() => setPage("admin_setup")} />
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
        <h1 style={{ marginBottom: "8px" }}>Register New Student</h1>
        <p style={{ color: "#64748b", marginBottom: "32px" }}>Add a new student to the voters list</p>

        <div className="card-box" style={{ background: "var(--bg-main)", padding: "32px" }}>
          {error && (
            <div style={{ color: "#D92D20", background: "#FEF3F2", padding: "12px", borderRadius: "8px", fontSize: "12px", marginBottom: "24px", fontWeight: 600 }}>
              {error}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "40px" }}>
            {/* Left Column */}
            <div>
              {/* Profile Picture Upload Section */}
              <div style={{ marginBottom: "32px", textAlign: "center" }}>
                <div style={{ marginBottom: "16px" }}>
                  {previewUrl ? (
                    <img src={previewUrl} alt="Preview" style={{ width: "140px", height: "140px", borderRadius: "50%", objectFit: "cover", border: "4px solid var(--border-light)" }} onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(form.name || "Student")}&background=E8F0FE&color=0B1736`; }} />
                  ) : (
                    <div style={{ width: "140px", height: "140px", borderRadius: "50%", background: "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto", border: "4px solid var(--border-light)" }}>
                      <span className="material-symbols-outlined" style={{ fontSize: "56px", color: "#94a3b8" }}>person</span>
                    </div>
                  )}
                </div>

                <label style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: "8px" }}>
                  Profile Picture
                </label>
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/jpg"
                  onChange={handleFileChange}
                  style={{ padding: "10px", border: "1px solid var(--border-light)", borderRadius: "6px", background: "var(--bg-main)", fontSize: "13px", width: "100%", maxWidth: "250px", margin: "0 auto" }}
                />
              </div>

              {/* Full Name Input */}
              <div style={{ marginBottom: "20px" }}>
                <label style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "8px", display: "block" }}>Full Name *</label>
                <input name="name" placeholder="Enter student full name" value={form.name} onChange={handleChange} style={{ width: "100%", padding: "14px", border: "1px solid var(--border-light)", borderRadius: "6px", background: "var(--bg-main)", fontSize: "14px" }} />
              </div>

              {/* LRN Input */}
              <div style={{ marginBottom: "20px" }}>
                <label style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "8px", display: "block" }}>LRN *</label>
                <input name="lrn" placeholder="Enter LRN" value={form.lrn} onChange={handleChange} maxLength={12} autoComplete="off" style={{ width: "100%", padding: "14px", border: "1px solid var(--border-light)", borderRadius: "6px", background: "var(--bg-main)", fontSize: "14px", fontFamily: "monospace" }} />
              </div>
            </div>

            {/* Right Column */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              {/* Dynamic Grid for Grade, Section, and Age Input Fields */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
                <div>
                  <label style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "8px", display: "block" }}>Grade Level *</label>
                  <select name="grade" value={form.grade} onChange={handleChange} style={{ width: "100%", padding: "14px", border: "1px solid var(--border-light)", borderRadius: "6px", background: "var(--bg-main)", fontSize: "14px", height: "50px" }}>
                    <option value="G7">Grade 7</option>
                    <option value="G8">Grade 8</option>
                    <option value="G9">Grade 9</option>
                    <option value="G10">Grade 10</option>
                    <option value="G11">Grade 11</option>
                    <option value="G12">Grade 12</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "8px", display: "block" }}>Age *</label>
                  <input name="age" type="number" min={5} max={100} placeholder="Age" value={form.age} onChange={handleChange} style={{ width: "100%", padding: "14px", border: "1px solid var(--border-light)", borderRadius: "6px", background: "var(--bg-main)", fontSize: "14px", height: "50px", boxSizing: "border-box" }} />
                </div>
              </div>
              
              <div style={{ marginBottom: "20px" }}>
                <label style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "8px", display: "block" }}>Section *</label>
                <input name="section" placeholder="e.g., Einstein" value={form.section} onChange={handleChange} style={{ width: "100%", padding: "14px", border: "1px solid var(--border-light)", borderRadius: "6px", background: "var(--bg-main)", fontSize: "14px", height: "50px", boxSizing: "border-box" }} />
              </div>

              {/* Password Input */}
              <div style={{ marginBottom: "20px" }}>
                <label style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "8px", display: "block" }}>Password *</label>
                <input name="password" type="text" placeholder="Enter login password" value={form.password} onChange={handleChange} onCopy={blockClipboard} onCut={blockClipboard} onPaste={blockClipboard} autoComplete="off" style={{ width: "100%", padding: "14px", border: "1px solid var(--border-light)", borderRadius: "6px", background: "var(--bg-main)", fontSize: "14px" }} />
              </div>

              <PasswordGenerator onGenerate={(pw) => setForm(f => ({ ...f, password: pw }))} />

              <div style={{ marginTop: "auto", paddingTop: "20px", borderTop: "1px solid var(--border-light)" }}>
                <button className="btn-primary" onClick={handleSubmit} disabled={loading} style={{ width: "100%", padding: "16px", fontSize: "16px", fontWeight: 700 }}>
                  {loading ? "Registering..." : "Register Student"}
                </button>
              </div>
            </div>
          </div>
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

export default AdminRegister;