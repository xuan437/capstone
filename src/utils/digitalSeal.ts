/**
 * Cryptographic Digital Seal Utility
 * ====================================
 * Implements ECDSA P-256 asymmetric signing using the browser Web Crypto API.
 *
 * Flow:
 *   1. Admin calls generateSealKeyPair() -> gets { privateKey, publicKeyJwk }
 *   2. Admin calls sealElectionResults(privateKey, resultsData) -> gets SealPackage
 *   3. SealPackage is stored in Supabase (election_seals table)
 *   4. Anyone calls verifyElectionSeal(sealPackage, currentResultsData) -> boolean
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Canonical election results data that is sealed */
export interface ElectionResultsPayload {
  candidates: Array<{
    id: string;
    name: string;
    position: string;
    partylist?: string;
    vote_count: number;
  }>;
  total_votes: number;
  total_voters: number;
  generated_at: string; // ISO timestamp at time of seal
  election_label: string;
}

/** The complete seal package stored in DB */
export interface SealPackage {
  /** ECDSA P-256 public key in JWK format (JSON string) */
  public_key_jwk: string;
  /** Base64url-encoded ECDSA signature */
  signature_b64: string;
  /** SHA-256 hex digest of the canonical payload */
  payload_hash: string;
  /** ISO timestamp when the seal was created */
  sealed_at: string;
  /** Name of the admin who created the seal */
  sealed_by: string;
  /** Serialized canonical payload (for future verification without DB) */
  payload_json: string;
}

export type VerificationStatus = "valid" | "tampered" | "error";

export interface VerificationResult {
  status: VerificationStatus;
  message: string;
  sealedAt?: string;
  sealedBy?: string;
  payloadHash?: string;
  currentHash?: string;
  hashMatch?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Encode ArrayBuffer to base64url string */
function bufToBase64url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

/** Decode base64url string to ArrayBuffer */
function base64urlToBuf(b64: string): ArrayBuffer {
  const base64 = b64.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

/** Canonical JSON serialization (sorted keys, no extra whitespace) */
export function canonicalize(obj: unknown): string {
  if (obj === null || typeof obj !== "object" || Array.isArray(obj)) {
    return JSON.stringify(obj);
  }
  const sorted: Record<string, unknown> = {};
  Object.keys(obj as Record<string, unknown>)
    .sort()
    .forEach((k) => {
      sorted[k] = (obj as Record<string, unknown>)[k];
    });
  return "{" + Object.entries(sorted).map(([k, v]) => `${JSON.stringify(k)}:${canonicalize(v)}`).join(",") + "}";
}

/** SHA-256 hex digest of a string */
export async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ---------------------------------------------------------------------------
// Key Generation
// ---------------------------------------------------------------------------

export interface SealKeyPair {
  privateKey: CryptoKey;
  publicKeyJwk: string; // JSON string of the exported JWK public key
  publicKeyFingerprint: string; // SHA-256 of the public key JWK (short ID)
}

/** Generate a fresh ECDSA P-256 key pair for sealing an election. */
export async function generateSealKeyPair(): Promise<SealKeyPair> {
  const pair = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true, // extractable (needed to export JWK for storage)
    ["sign", "verify"]
  );

  const pubJwk = await crypto.subtle.exportKey("jwk", pair.publicKey);
  const pubJwkStr = JSON.stringify(pubJwk);
  const fingerprint = (await sha256Hex(pubJwkStr)).substring(0, 16).toUpperCase();

  return {
    privateKey: pair.privateKey,
    publicKeyJwk: pubJwkStr,
    publicKeyFingerprint: fingerprint,
  };
}

// ---------------------------------------------------------------------------
// Seal (Sign)
// ---------------------------------------------------------------------------

/**
 * Create a cryptographic seal over the given election results payload.
 * The private key signs the canonical JSON representation.
 */
export async function sealElectionResults(
  privateKey: CryptoKey,
  publicKeyJwk: string,
  payload: ElectionResultsPayload,
  sealedBy: string
): Promise<SealPackage> {
  const payloadJson = canonicalize(payload);
  const payloadHash = await sha256Hex(payloadJson);

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: { name: "SHA-256" } },
    privateKey,
    new TextEncoder().encode(payloadJson)
  );

  return {
    public_key_jwk: publicKeyJwk,
    signature_b64: bufToBase64url(signature),
    payload_hash: payloadHash,
    sealed_at: new Date().toISOString(),
    sealed_by: sealedBy,
    payload_json: payloadJson,
  };
}

// ---------------------------------------------------------------------------
// Verify
// ---------------------------------------------------------------------------

/**
 * Verify the authenticity and integrity of a seal package.
 * Optionally re-fetches current results to confirm they match what was sealed.
 */
export async function verifyElectionSeal(
  sealPackage: SealPackage,
  currentPayload?: ElectionResultsPayload
): Promise<VerificationResult> {
  try {
    // 1. Import the stored public key
    const pubJwk = JSON.parse(sealPackage.public_key_jwk);
    const publicKey = await crypto.subtle.importKey(
      "jwk",
      pubJwk,
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["verify"]
    );

    // 2. Verify the signature against the stored payload
    const isSignatureValid = await crypto.subtle.verify(
      { name: "ECDSA", hash: { name: "SHA-256" } },
      publicKey,
      base64urlToBuf(sealPackage.signature_b64),
      new TextEncoder().encode(sealPackage.payload_json)
    );

    if (!isSignatureValid) {
      return {
        status: "tampered",
        message: "⚠️ Signature verification FAILED. The seal is invalid or the record has been tampered with.",
        sealedAt: sealPackage.sealed_at,
        sealedBy: sealPackage.sealed_by,
      };
    }

    // 3. Verify stored hash matches payload
    const recomputedHash = await sha256Hex(sealPackage.payload_json);
    const hashMatch = recomputedHash === sealPackage.payload_hash;

    // 4. If current payload provided, compare it to sealed payload
    let currentHash: string | undefined;
    let dataMatch = true;
    if (currentPayload) {
      const currentJson = canonicalize(currentPayload);
      currentHash = await sha256Hex(currentJson);
      dataMatch = currentHash === sealPackage.payload_hash;
    }

    if (!hashMatch || !dataMatch) {
      return {
        status: "tampered",
        message: "⚠️ Results data has been MODIFIED since sealing. The current data does not match the sealed record.",
        sealedAt: sealPackage.sealed_at,
        sealedBy: sealPackage.sealed_by,
        payloadHash: sealPackage.payload_hash,
        currentHash,
        hashMatch: hashMatch && dataMatch,
      };
    }

    return {
      status: "valid",
      message: "✅ Seal is AUTHENTIC. The election results are genuine and have not been altered since sealing.",
      sealedAt: sealPackage.sealed_at,
      sealedBy: sealPackage.sealed_by,
      payloadHash: sealPackage.payload_hash,
      currentHash,
      hashMatch: true,
    };
  } catch (err) {
    return {
      status: "error",
      message: `Error during verification: ${err instanceof Error ? err.message : "Unknown error"}`,
    };
  }
}

/** Parse a SealPackage from a JSON string (from DB or file) */
export function parseSealPackage(json: string): SealPackage {
  return JSON.parse(json) as SealPackage;
}
