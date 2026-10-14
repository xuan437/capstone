/**
 * electionExpiry.ts
 * Runs once when the election countdown reaches zero.
 * Scrambles every student password so that no one can log in
 * after the election has officially ended.
 */
import { supabase } from "../supabase";
import { logAuditAction } from "./auditLogger";

/** Generates a random 12-char alphanumeric string */
function randomPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  return Array.from({ length: 12 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}

/**
 * Fetches every student and updates their password to a random value.
 * Uses a localStorage flag so the operation runs exactly once per device
 * (even if the component re-mounts or the page is refreshed while expired).
 */
export async function scrambleAllStudentPasswords(): Promise<void> {
  const FLAG_KEY = "election_passwords_scrambled";

  // Guard: only run once
  if (localStorage.getItem(FLAG_KEY) === "true") return;
  localStorage.setItem(FLAG_KEY, "true");

  try {
    // 1. Fetch all student IDs
    const { data: students, error: fetchErr } = await supabase
      .from("students")
      .select("id");

    if (fetchErr || !students || students.length === 0) {
      console.warn("[electionExpiry] Could not fetch students:", fetchErr?.message);
      localStorage.removeItem(FLAG_KEY); // allow retry
      return;
    }

    // 2. Update each student with a new random password
    const updates = students.map((s: { id: string }) =>
      supabase
        .from("students")
        .update({ password: randomPassword() })
        .eq("id", s.id)
    );

    await Promise.all(updates);

    // 3. Log the bulk action to the audit trail
    await logAuditAction(
      "STUDENT_REGISTERED", // reuse closest category; audit log will show details
      "System",
      `Election ended: all ${students.length} student passwords were automatically randomized to prevent post-election logins.`
    );

    console.log(`[electionExpiry] Scrambled passwords for ${students.length} students.`);
  } catch (err) {
    console.error("[electionExpiry] Error scrambling passwords:", err);
    localStorage.removeItem(FLAG_KEY); // allow retry on next load
  }
}

/**
 * Clears the scramble flag so that if a new election is configured,
 * the expiry action can fire again.  Call this whenever the admin
 * sets a new end_time in AdminElectionSettings.
 */
export function clearElectionExpiryFlag(): void {
  localStorage.removeItem("election_passwords_scrambled");
}
