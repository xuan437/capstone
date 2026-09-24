import type { Candidate } from "../types";

/**
 * Checks if a candidate is marked as deactivated.
 * Uses both Supabase campaign_text tag and local persistence for instant sync.
 */
export const isCandidateDeactivated = (c: Candidate): boolean => {
  if (c.campaign_text && c.campaign_text.startsWith("[DEACTIVATED]")) {
    return true;
  }
  try {
    const raw = localStorage.getItem("deactivated_candidate_ids");
    if (raw) {
      const ids: string[] = JSON.parse(raw);
      if (ids.includes(c.id)) return true;
    }
  } catch {
    // Ignore parsing errors
  }
  return false;
};

/**
 * Returns clean manifesto text without the [DEACTIVATED] prefix.
 */
export const getCleanCampaignText = (campaignText?: string): string => {
  if (!campaignText) return "";
  return campaignText.replace(/^\[DEACTIVATED\]\s*/, "").trim();
};

/**
 * Sync local storage list of deactivated candidate IDs.
 */
export const setCandidateDeactivatedLocal = (id: string, deactivated: boolean) => {
  try {
    const raw = localStorage.getItem("deactivated_candidate_ids");
    const ids: string[] = raw ? JSON.parse(raw) : [];
    if (deactivated) {
      if (!ids.includes(id)) ids.push(id);
    } else {
      const idx = ids.indexOf(id);
      if (idx > -1) ids.splice(idx, 1);
    }
    localStorage.setItem("deactivated_candidate_ids", JSON.stringify(ids));
  } catch {
    // Ignore storage errors
  }
};
