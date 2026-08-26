import React, { useState } from "react";
import { supabase } from "../supabase";
import { Page } from "../types";
import { fileToBase64, base64ToImageUrl } from "../utils/imageUtils";

const AdminRegister: React.FC<{ setPage: (p: Page) => void }> = ({ setPage }) => {
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
  const [clipboardAlert, setClipboardAlert] = useState(false);

  const blockClipboard = (e: React.ClipboardEvent) => {
    e.preventDefault();
    setClipboardAlert(true);
    setTimeout(() => setClipboardAlert(false), 3000);
  };

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
    setError("");
  };

  // Integrated Auto-Generate Password generator
  const generatePassword = (length = 6) => {
    const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const lowercase = "abcdefghijklmnopqrstuvwxyz";
    const numbers = "0123456789";
    const guaranteed = [
      uppercase[Math.floor(Math.random() * uppercase.length)],
      lowercase[Math.floor(Math.random() * lowercase.length)],
      numbers[Math.floor(Math.random() * numbers.length)],
    ];
    const all = uppercase + lowercase + numbers;
    for (let i = guaranteed.length; i < length; i++) {
      guaranteed.push(all[Math.floor(Math.random() * all.length)]);
    }
    const shuffled = guaranteed.sort(() => Math.random() - 0.5).join("");
    setForm((f) => ({ ...f, password: shuffled }));
    setError("");
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) return setError("Please enter student full name");
    if (!/^\d{12}$/.test(form.lrn)) return setError("LRN must be exactly 12 digits");
    if (!form.section.trim()) return setError("Please enter a section");

    const parsedAge = parseInt(form.age, 10);
    if (isNaN(parsedAge) || parsedAge < 5 || parsedAge > 100) {
      return setError("Please enter a valid age between 5 and 100");
    }

    if (!form.password.trim()) return setError("Please enter or generate a password");

    setLoading(true);
    setError("");

    try {
      const { data: existing } = await supabase
        .from("students")
        .select("id")
        .eq("id", form.lrn)
        .single();

      if (existing) {
        setError("A student with this LRN ID already exists in the system.");
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
        console.error("Supabase insert error:", insertError);
        setError(`Registration failed: ${insertError.message}`);
        throw insertError;
      }

      setSuccess(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    } finally {
      setLoading(false);
    }
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
            The student account for <strong>{form.name}</strong> (LRN: <code>{form.lrn}</code>) has been created and added to the official voters registry.
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
        <div style={{ marginBottom: "24px" }}>
          <span className="overline">Student Enrollment</span>
          <h1>Register New Student</h1>
          <p style={{ color: "var(--text-muted)" }}>
            Create a new student voter account with access credentials and profile details.
          </p>
        </div>

        <div className="card-box">
          {error && (
            <div style={{ color: "var(--color-danger)", background: "var(--color-danger-bg)", border: "1px solid var(--color-danger-border)", padding: "12px 16px", borderRadius: "8px", fontSize: "13px", marginBottom: "24px", fontWeight: 600 }}>
              {error}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "32px", alignItems: "start" }}>
            {/* Left Column: Basic Student Information */}
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
                    style={{ width: "100%", padding: "12px", height: "46px" }}
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

            {/* Right Column: Credentials & Custom Photo Upload */}
            <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              <div style={{ fontSize: "13px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-main)", paddingBottom: "8px", borderBottom: "1px solid var(--border-light)" }}>
                2. Credentials & Profile Photo
              </div>

              {/* Custom Photo Upload Zone */}
              <div
                style={{
                  background: "var(--bg-surface)",
                  border: "1px dashed var(--border-light)",
                  borderRadius: "14px",
                  padding: "20px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                  gap: "12px",
                }}
              >
                <div style={{ position: "relative" }}>
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="Avatar Preview"
                      style={{
                        width: "96px",
                        height: "96px",
                        borderRadius: "50%",
                        objectFit: "cover",
                        border: "3px solid var(--bg-main)",
                        boxShadow: "var(--shadow-sm)",
                      }}
                      onError={(e) => {
                        e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(form.name || "Student")}&background=E8F0FE&color=0A192F`;
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "96px",
                        height: "96px",
                        borderRadius: "50%",
                        background: "var(--accent-blue)",
                        color: "var(--primary-navy)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: "3px solid var(--bg-main)",
                        boxShadow: "var(--shadow-sm)",
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: "44px" }}>
                        person
                      </span>
                    </div>
                  )}
                  <span
                    className="material-symbols-outlined"
                    style={{
                      position: "absolute",
                      bottom: 0,
                      right: 0,
                      background: "var(--primary-navy)",
                      color: "var(--text-white)",
                      padding: "6px",
                      borderRadius: "50%",
                      fontSize: "14px",
                      boxShadow: "var(--shadow-xs)",
                    }}
                  >
                    photo_camera
                  </span>
                </div>

                <div>
                  <label
                    htmlFor="student-photo-file-input"
                    className="btn-top-nav"
                    style={{ cursor: "pointer", display: "inline-flex", margin: 0 }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                      upload_file
                    </span>
                    {previewUrl ? "Change Photo" : "Upload Profile Photo"}
                  </label>
                  <input
                    id="student-photo-file-input"
                    type="file"
                    accept="image/png, image/jpeg, image/jpg"
                    onChange={handleFileChange}
                    style={{ display: "none" }}
                  />
                  <p style={{ margin: "6px 0 0 0", fontSize: "11.5px", color: "var(--text-light)" }}>
                    Supported formats: PNG, JPG (Max 2MB)
                  </p>
                </div>
              </div>

              {/* Integrated Password Field + Generate Side Button */}
              <div>
                <label className="form-label" style={{ display: "block", marginBottom: "6px" }}>
                  Account Password *
                </label>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    name="password"
                    type="text"
                    placeholder="Enter or generate password"
                    value={form.password}
                    onChange={handleChange}
                    onCopy={blockClipboard}
                    onCut={blockClipboard}
                    onPaste={blockClipboard}
                    autoComplete="off"
                    style={{ flex: 1, padding: "12px", fontFamily: "var(--font-sans)", fontSize: "14px" }}
                  />
                  <button
                    type="button"
                    className="btn-top-nav primary"
                    onClick={() => generatePassword(6)}
                    title="Auto-generate a secure random 6-character password"
                    style={{ whiteSpace: "nowrap" }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                      key
                    </span>
                    Auto-Generate
                  </button>
                </div>
              </div>

              {/* Form Submission Button */}
              <div style={{ marginTop: "12px", paddingTop: "16px", borderTop: "1px solid var(--border-light)" }}>
                <button
                  className="btn-primary"
                  onClick={handleSubmit}
                  disabled={loading}
                  style={{ width: "100%", minHeight: "46px", fontSize: "15px", fontWeight: 700 }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
                    how_to_reg
                  </span>
                  {loading ? "Registering Student..." : "Register Student"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Clipboard Security Toast */}
      {clipboardAlert && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "var(--bg-main)",
            color: "var(--color-danger)",
            border: "1px solid var(--color-danger)",
            padding: "8px 14px",
            borderRadius: "8px",
            boxShadow: "var(--shadow-md)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "12px",
            fontWeight: 700,
            zIndex: 99999,
            whiteSpace: "nowrap",
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: "16px", color: "var(--color-danger)" }}>
            block
          </span>
          <span>Copying or pasting credentials is restricted for security.</span>
        </div>
      )}
    </div>
  );
};

export default AdminRegister;