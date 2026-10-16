import React, { useState, useEffect, useCallback } from "react";
import {
  Stamp,
  ShieldCheck,
  ShieldX,
  KeyRound,
  Loader2,
  Copy,
  CheckCircle2,
  AlertTriangle,
  FileSearch,
  Download,
  Upload,
  Fingerprint,
  Info,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { supabase } from "../supabase";
import { logAuditAction } from "../utils/auditLogger";
import { POSITIONS, Candidate, Page } from "../types";
import {
  generateSealKeyPair,
  sealElectionResults,
  verifyElectionSeal,
  SealPackage,
  ElectionResultsPayload,
  VerificationResult,
  SealKeyPair,
  sha256Hex,
  parseSealPackage,
} from "../utils/digitalSeal";
import "../components/seal/DigitalSeal.css";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type Tab = "generate" | "verify";

interface RawVote {
  candidate_id: string;
  student_id: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function fetchElectionResults(): Promise<ElectionResultsPayload | null> {
  const [candRes, voteRes, stuRes] = await Promise.all([
    supabase.from("candidates").select("*"),
    supabase.from("votes").select("candidate_id, student_id"),
    supabase.from("students").select("id", { count: "exact", head: true }),
  ]);

  if (candRes.error || voteRes.error) return null;

  const candidates = (candRes.data || []) as Candidate[];
  const votes = (voteRes.data || []) as RawVote[];
  const totalVoters = stuRes.count || 0;

  const tallied = POSITIONS.flatMap((pos) => {
    return candidates
      .filter((c) => c.position === pos)
      .map((c) => ({
        id: c.id,
        name: c.name,
        position: c.position,
        partylist: c.partylist || "",
        vote_count: votes.filter((v) => v.candidate_id === c.id).length,
      }))
      .sort((a, b) => b.vote_count - a.vote_count);
  });

  const uniqueVoters = new Set(votes.map((v) => v.student_id)).size;

  return {
    candidates: tallied,
    total_votes: votes.length,
    total_voters: totalVoters,
    generated_at: new Date().toISOString(),
    election_label: "SSLG General Election",
  };
}

// ---------------------------------------------------------------------------
// AdminDigitalSeal Page
// ---------------------------------------------------------------------------
const AdminDigitalSeal: React.FC<{ setPage: (p: Page) => void }> = () => {
  const [activeTab, setActiveTab] = useState<Tab>("generate");

  // --- Generate tab state ---
  const [keyPair, setKeyPair] = useState<SealKeyPair | null>(null);
  const [sealPackage, setSealPackage] = useState<SealPackage | null>(null);
  const [generating, setGenerating] = useState(false);
  const [sealing, setSealing] = useState(false);
  const [genError, setGenError] = useState("");
  const [sealerName, setSealerName] = useState("Faculty Admin");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [savedSealId, setSavedSealId] = useState<string | null>(null);
  const [savingToDb, setSavingToDb] = useState(false);

  // --- Verify tab state ---
  const [verifyInput, setVerifyInput] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<VerificationResult | null>(null);
  const [verifyError, setVerifyError] = useState("");
  const [loadingLatestSeal, setLoadingLatestSeal] = useState(false);

  // --- Shared ---
  const [liveResults, setLiveResults] = useState<ElectionResultsPayload | null>(null);
  const [loadingResults, setLoadingResults] = useState(true);

  useEffect(() => {
    fetchElectionResults().then((r) => {
      setLiveResults(r);
      setLoadingResults(false);
    });
  }, []);

  // ── Copy helper ──────────────────────────────────────────────────────────
  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // Ignore
    }
  };

  // ── Step 1: Generate key pair ─────────────────────────────────────────────
  const handleGenerateKeys = async () => {
    setGenerating(true);
    setGenError("");
    setSealPackage(null);
    setSavedSealId(null);
    try {
      const kp = await generateSealKeyPair();
      setKeyPair(kp);
    } catch (err) {
      setGenError("Failed to generate key pair: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setGenerating(false);
    }
  };

  // ── Step 2: Seal election results ────────────────────────────────────────
  const handleSeal = async () => {
    if (!keyPair || !liveResults) return;
    setSealing(true);
    setGenError("");
    try {
      const payload: ElectionResultsPayload = {
        ...liveResults,
        generated_at: new Date().toISOString(),
      };
      const pkg = await sealElectionResults(keyPair.privateKey, keyPair.publicKeyJwk, payload, sealerName);
      setSealPackage(pkg);
      await logAuditAction(
        "DIGITAL_SEAL_CREATED",
        sealerName,
        `Cryptographic digital seal created for election results. SHA-256: ${pkg.payload_hash}`
      );
    } catch (err) {
      setGenError("Failed to seal results: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setSealing(false);
    }
  };

  // ── Step 3: Save to Supabase ──────────────────────────────────────────────
  const handleSaveToDb = async () => {
    if (!sealPackage) return;
    setSavingToDb(true);
    try {
      const sealJson = JSON.stringify(sealPackage);
      const { data, error } = await supabase.from("election_seals").insert([{
        sealed_at: sealPackage.sealed_at,
        sealed_by: sealPackage.sealed_by,
        payload_hash: sealPackage.payload_hash,
        seal_json: sealJson,
      }]).select("id").single();

      if (error) {
        // Fallback: try without select if table columns differ
        const { error: e2 } = await supabase.from("election_seals").insert([{
          sealed_at: sealPackage.sealed_at,
          sealed_by: sealPackage.sealed_by,
          payload_hash: sealPackage.payload_hash,
          seal_json: sealJson,
        }]);
        if (e2) throw e2;
        setSavedSealId("saved");
      } else {
        setSavedSealId(data?.id || "saved");
      }

      await logAuditAction("DIGITAL_SEAL_SAVED", sealPackage.sealed_by, `Seal persisted to database. Hash: ${sealPackage.payload_hash}`);
    } catch (err) {
      setGenError("Failed to save seal: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setSavingToDb(false);
    }
  };

  // ── Download seal as JSON file ────────────────────────────────────────────
  const handleDownloadSeal = () => {
    if (!sealPackage) return;
    const blob = new Blob([JSON.stringify(sealPackage, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `election-seal-${sealPackage.payload_hash.substring(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Load latest seal from DB ──────────────────────────────────────────────
  const handleLoadLatestFromDb = useCallback(async () => {
    setLoadingLatestSeal(true);
    setVerifyError("");
    try {
      const { data, error } = await supabase
        .from("election_seals")
        .select("seal_json")
        .order("sealed_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data?.seal_json) {
        setVerifyError("No seal records found in the database.");
      } else {
        setVerifyInput(JSON.stringify(JSON.parse(data.seal_json), null, 2));
      }
    } catch (err) {
      setVerifyError("Failed to load seal: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setLoadingLatestSeal(false);
    }
  }, []);

  // ── Verify seal ───────────────────────────────────────────────────────────
  const handleVerify = async () => {
    if (!verifyInput.trim()) {
      setVerifyError("Please paste or load a seal package to verify.");
      return;
    }
    setVerifying(true);
    setVerifyResult(null);
    setVerifyError("");
    try {
      let pkg: SealPackage;
      try {
        pkg = parseSealPackage(verifyInput);
      } catch {
        throw new Error("Invalid seal JSON format. Please paste a valid seal package.");
      }

      // Re-fetch current results for comparison
      const currentResults = await fetchElectionResults();
      if (currentResults) {
        // Remove generated_at since it changes each fetch
        const normalizedCurrent: ElectionResultsPayload = {
          ...currentResults,
          generated_at: JSON.parse(pkg.payload_json).generated_at,
        };
        const result = await verifyElectionSeal(pkg, normalizedCurrent);
        setVerifyResult(result);
      } else {
        const result = await verifyElectionSeal(pkg);
        setVerifyResult(result);
      }

      await logAuditAction(
        "DIGITAL_SEAL_VERIFIED",
        "Admin",
        `Verification of seal (hash: ${pkg.payload_hash}) completed.`
      );
    } catch (err) {
      setVerifyError(err instanceof Error ? err.message : "Verification failed.");
    } finally {
      setVerifying(false);
    }
  };

  // ── Upload seal from file ─────────────────────────────────────────────────
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      try {
        setVerifyInput(JSON.stringify(JSON.parse(text), null, 2));
        setVerifyError("");
      } catch {
        setVerifyError("Invalid JSON file.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="seal-page">
      {/* Page Header */}
      <div className="seal-page-header">
        <div className="seal-page-icon"><Stamp size={20} /></div>
        <div>
          <h1 className="seal-page-title">Cryptographic Digital Seal</h1>
          <p className="seal-page-subtitle">
            Sign and verify the authenticity of election results using ECDSA P-256
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="seal-tabs">
        <button className={`seal-tab ${activeTab === "generate" ? "active" : ""}`} onClick={() => setActiveTab("generate")}>
          <Stamp size={13} />
          Generate &amp; Seal
        </button>
        <button className={`seal-tab ${activeTab === "verify" ? "active" : ""}`} onClick={() => setActiveTab("verify")}>
          <FileSearch size={13} />
          Verify Seal
        </button>
      </div>

      {/* ================================================================
          TAB: GENERATE & SEAL
          ================================================================ */}
      {activeTab === "generate" && (
        <>
          {/* Results snapshot info */}
          <div className="seal-card">
            <div className="seal-card-header">
              <div className="seal-card-icon ic-key"><Fingerprint size={14} /></div>
              <div>
                <div className="seal-card-title">Live Election Snapshot</div>
                <div className="seal-card-desc">Results captured at time of sealing</div>
              </div>
            </div>
            <div className="seal-card-body">
              {loadingResults ? (
                <div className="seal-loading">
                  <Loader2 size={18} className="seal-spin" style={{ color: "var(--accent-primary)" }} />
                  Loading election results…
                </div>
              ) : liveResults ? (
                <div className="seal-meta-grid">
                  <div className="seal-meta-cell">
                    <div className="seal-meta-label">Total Votes Cast</div>
                    <div className="seal-meta-value">{liveResults.total_votes.toLocaleString()}</div>
                  </div>
                  <div className="seal-meta-cell">
                    <div className="seal-meta-label">Registered Voters</div>
                    <div className="seal-meta-value">{liveResults.total_voters.toLocaleString()}</div>
                  </div>
                  <div className="seal-meta-cell">
                    <div className="seal-meta-label">Candidates</div>
                    <div className="seal-meta-value">{liveResults.candidates.length}</div>
                  </div>
                  <div className="seal-meta-cell">
                    <div className="seal-meta-label">Positions</div>
                    <div className="seal-meta-value">{POSITIONS.length}</div>
                  </div>
                </div>
              ) : (
                <div className="seal-status-banner error">
                  <AlertTriangle size={16} className="seal-status-icon" />
                  <span className="seal-status-text">Unable to load election results.</span>
                </div>
              )}
            </div>
          </div>

          {/* Step 1: Generate Keys */}
          <div className="seal-card">
            <div className="seal-card-header">
              <div className="seal-card-icon ic-key"><KeyRound size={14} /></div>
              <div>
                <div className="seal-card-title">Step 1 — Generate Key Pair</div>
                <div className="seal-card-desc">Creates a one-time ECDSA P-256 signing key</div>
              </div>
            </div>
            <div className="seal-card-body">
              <div className="seal-steps">
                <div className="seal-step"><div className="seal-step-num">1</div>
                  <div className="seal-step-text">Click <strong>Generate Keys</strong> to create a unique cryptographic key pair (private + public).</div>
                </div>
                <div className="seal-step"><div className="seal-step-num">2</div>
                  <div className="seal-step-text">The <strong>private key</strong> signs the results. It never leaves this session.</div>
                </div>
                <div className="seal-step"><div className="seal-step-num">3</div>
                  <div className="seal-step-text">The <strong>public key</strong> is stored in the seal package for future verification by anyone.</div>
                </div>
              </div>

              <label className="seal-field-label">Sealed By (Admin Name)</label>
              <input
                type="text"
                value={sealerName}
                onChange={(e) => setSealerName(e.target.value)}
                style={{
                  width: "100%", boxSizing: "border-box", padding: "8px 12px",
                  borderRadius: "8px", border: "1px solid var(--border-subtle)",
                  background: "var(--bg-main)", color: "var(--text-main)",
                  fontSize: "12.5px", marginBottom: "12px", fontFamily: "inherit",
                }}
              />

              {keyPair && (
                <>
                  <div className="seal-fingerprint">
                    <Fingerprint size={12} />
                    {keyPair.publicKeyFingerprint}
                  </div>
                  <div className="seal-key-warning">
                    <AlertTriangle size={13} />
                    This session holds the private key. Do not close this tab until you have saved the seal package.
                  </div>
                </>
              )}

              {genError && (
                <div className="seal-status-banner tampered" style={{ marginBottom: 12 }}>
                  <AlertTriangle size={15} className="seal-status-icon" />
                  <span className="seal-status-text">{genError}</span>
                </div>
              )}

              <button className="seal-btn seal-btn-generate" onClick={handleGenerateKeys} disabled={generating}>
                {generating ? <Loader2 size={14} className="seal-spin" /> : <KeyRound size={14} />}
                {keyPair ? "Regenerate Key Pair" : "Generate Key Pair"}
              </button>
            </div>
          </div>

          {/* Step 2: Seal Results */}
          {keyPair && (
            <div className="seal-card">
              <div className="seal-card-header">
                <div className="seal-card-icon ic-generate"><Stamp size={14} /></div>
                <div>
                  <div className="seal-card-title">Step 2 — Apply Digital Seal</div>
                  <div className="seal-card-desc">Signs the election results with the private key</div>
                </div>
              </div>
              <div className="seal-card-body">
                {sealPackage ? (
                  <>
                    {/* Visual stamp */}
                    <div className="seal-stamp">
                      <div className="seal-stamp-ring">
                        <ShieldCheck size={30} className="seal-stamp-icon" />
                      </div>
                      <div className="seal-stamp-id">SEALED #{sealPackage.payload_hash.substring(0, 12).toUpperCase()}</div>
                      <div className="seal-stamp-info">
                        <strong>{sealPackage.sealed_by}</strong>
                        {new Date(sealPackage.sealed_at).toLocaleString("en-PH", {
                          year: "numeric", month: "short", day: "numeric",
                          hour: "2-digit", minute: "2-digit", second: "2-digit",
                        })}
                      </div>
                    </div>

                    {/* Hash */}
                    <label className="seal-field-label">SHA-256 Payload Hash</label>
                    <div className="seal-hash-value" style={{ marginBottom: 12 }}>{sealPackage.payload_hash}</div>

                    {/* Signature (truncated preview) */}
                    <label className="seal-field-label">ECDSA Signature (Base64url)</label>
                    <div className="seal-hash-value" style={{ marginBottom: 12, fontSize: 10 }}>
                      {sealPackage.signature_b64.substring(0, 64)}…
                    </div>

                    <div className="seal-btn-row">
                      <button className="seal-btn seal-btn-copy" onClick={() => copyToClipboard(JSON.stringify(sealPackage), "seal")}>
                        {copiedField === "seal" ? <CheckCircle2 size={13} /> : <Copy size={13} />}
                        {copiedField === "seal" ? "Copied!" : "Copy Seal JSON"}
                      </button>
                      <button className="seal-btn seal-btn-ghost" onClick={handleDownloadSeal}>
                        <Download size={13} /> Download .json
                      </button>
                    </div>

                    <div className="seal-divider" />

                    {/* Save to DB */}
                    {savedSealId ? (
                      <div className="seal-status-banner valid">
                        <CheckCircle2 size={16} className="seal-status-icon" />
                        <span className="seal-status-text">
                          <strong className="seal-status-title">Saved to Database</strong>
                          Seal has been persisted and can be retrieved for verification at any time.
                        </span>
                      </div>
                    ) : (
                      <button className="seal-btn seal-btn-generate" onClick={handleSaveToDb} disabled={savingToDb}>
                        {savingToDb ? <Loader2 size={13} className="seal-spin" /> : <Upload size={13} />}
                        {savingToDb ? "Saving…" : "Save Seal to Database"}
                      </button>
                    )}
                  </>
                ) : (
                  <button className="seal-btn seal-btn-generate" onClick={handleSeal} disabled={sealing || !liveResults}>
                    {sealing ? <Loader2 size={14} className="seal-spin" /> : <Stamp size={14} />}
                    {sealing ? "Sealing Results…" : "Apply Digital Seal to Results"}
                  </button>
                )}

                {/* Reseal */}
                {sealPackage && (
                  <button
                    className="seal-btn seal-btn-danger"
                    style={{ marginTop: 8 }}
                    onClick={() => { setSealPackage(null); setSavedSealId(null); }}
                  >
                    <RefreshCw size={13} /> Reseal (Create New Seal)
                  </button>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* ================================================================
          TAB: VERIFY
          ================================================================ */}
      {activeTab === "verify" && (
        <div className="seal-card">
          <div className="seal-card-header">
            <div className="seal-card-icon ic-verify"><FileSearch size={14} /></div>
            <div>
              <div className="seal-card-title">Verify Election Seal</div>
              <div className="seal-card-desc">
                Authenticate a seal package to confirm results have not been altered
              </div>
            </div>
          </div>
          <div className="seal-card-body">
            <div className="seal-steps" style={{ marginBottom: 14 }}>
              <div className="seal-step"><div className="seal-step-num">1</div>
                <div className="seal-step-text">Load the seal from the <strong>database</strong>, upload a <strong>.json file</strong>, or paste the JSON manually.</div>
              </div>
              <div className="seal-step"><div className="seal-step-num">2</div>
                <div className="seal-step-text">Click <strong>Verify</strong> — the system will check the ECDSA signature and compare the current results hash.</div>
              </div>
            </div>

            <div className="seal-btn-row" style={{ marginBottom: 12 }}>
              <button className="seal-btn seal-btn-ghost" onClick={handleLoadLatestFromDb} disabled={loadingLatestSeal}>
                {loadingLatestSeal ? <Loader2 size={13} className="seal-spin" /> : <Download size={13} />}
                Load Latest from DB
              </button>
              <label className="seal-btn seal-btn-ghost" style={{ cursor: "pointer", textAlign: "center" }}>
                <Upload size={13} /> Upload .json
                <input type="file" accept=".json,application/json" style={{ display: "none" }} onChange={handleFileUpload} />
              </label>
            </div>

            <label className="seal-field-label">Seal Package JSON</label>
            <textarea
              className="seal-textarea"
              placeholder={'Paste seal JSON here…\n{\n  "public_key_jwk": "...",\n  "signature_b64": "...",\n  ...'}
              value={verifyInput}
              onChange={(e) => { setVerifyInput(e.target.value); setVerifyResult(null); setVerifyError(""); }}
              rows={6}
            />

            {verifyError && (
              <div className="seal-status-banner error" style={{ marginBottom: 12 }}>
                <AlertTriangle size={15} className="seal-status-icon" />
                <span className="seal-status-text">{verifyError}</span>
              </div>
            )}

            <button className="seal-btn seal-btn-verify" onClick={handleVerify} disabled={verifying || !verifyInput.trim()}>
              {verifying ? <Loader2 size={14} className="seal-spin" /> : <ShieldCheck size={14} />}
              {verifying ? "Verifying…" : "Verify Seal Integrity"}
            </button>

            {/* Verification result */}
            {verifyResult && (
              <>
                <div className="seal-divider" />

                <div className={`seal-status-banner ${verifyResult.status}`}>
                  <div className="seal-status-icon">
                    {verifyResult.status === "valid" ? <ShieldCheck size={20} /> :
                     verifyResult.status === "tampered" ? <ShieldX size={20} /> :
                     <AlertTriangle size={20} />}
                  </div>
                  <div className="seal-status-text">
                    <strong className="seal-status-title">
                      {verifyResult.status === "valid" ? "✅ AUTHENTIC" :
                       verifyResult.status === "tampered" ? "⚠️ TAMPERED / INVALID" : "⚠️ ERROR"}
                    </strong>
                    {verifyResult.message}
                  </div>
                </div>

                {verifyResult.sealedBy && (
                  <div className="seal-meta-grid" style={{ marginTop: 12 }}>
                    <div className="seal-meta-cell">
                      <div className="seal-meta-label">Sealed By</div>
                      <div className="seal-meta-value">{verifyResult.sealedBy}</div>
                    </div>
                    <div className="seal-meta-cell">
                      <div className="seal-meta-label">Sealed At</div>
                      <div className="seal-meta-value">
                        {verifyResult.sealedAt
                          ? new Date(verifyResult.sealedAt).toLocaleString("en-PH")
                          : "—"}
                      </div>
                    </div>
                  </div>
                )}

                {verifyResult.payloadHash && (
                  <>
                    <label className="seal-field-label" style={{ marginTop: 12 }}>Sealed Hash (stored)</label>
                    <div className={`seal-hash-value ${verifyResult.hashMatch ? "match" : "no-match"}`}>
                      {verifyResult.payloadHash}
                    </div>
                    {verifyResult.currentHash && (
                      <>
                        <label className="seal-field-label" style={{ marginTop: 8 }}>Current Data Hash (live)</label>
                        <div className={`seal-hash-value ${verifyResult.hashMatch ? "match" : "no-match"}`}>
                          {verifyResult.currentHash}
                        </div>
                      </>
                    )}
                    <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <span className={`seal-pill ${verifyResult.hashMatch ? "green" : "red"}`}>
                        {verifyResult.hashMatch ? <CheckCircle2 size={10} /> : <ShieldX size={10} />}
                        {verifyResult.hashMatch ? "Hash Match" : "Hash Mismatch"}
                      </span>
                      <span className={`seal-pill ${verifyResult.status === "valid" ? "green" : "red"}`}>
                        {verifyResult.status === "valid" ? <ShieldCheck size={10} /> : <ShieldX size={10} />}
                        {verifyResult.status === "valid" ? "Signature Valid" : "Signature Invalid"}
                      </span>
                    </div>
                  </>
                )}
              </>
            )}

            {/* Clear */}
            {(verifyInput || verifyResult) && (
              <button
                className="seal-btn seal-btn-danger"
                style={{ marginTop: 12 }}
                onClick={() => { setVerifyInput(""); setVerifyResult(null); setVerifyError(""); }}
              >
                <Trash2 size={12} /> Clear
              </button>
            )}
          </div>
        </div>
      )}

      {/* Info footer */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "12px 16px", background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: 10, fontSize: 11.5, color: "var(--text-muted)", lineHeight: 1.6 }}>
        <Info size={14} style={{ color: "var(--text-light)", flexShrink: 0, marginTop: 1 }} />
        <span>
          This system uses <strong>ECDSA P-256</strong> via the browser Web Crypto API. Private keys are generated in-session and never transmitted. The public key and signature are stored in the seal package for independent verification.
        </span>
      </div>
    </div>
  );
};

export default AdminDigitalSeal;
