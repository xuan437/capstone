import { supabase } from "../supabase";
import { PartyList } from "../types";
import { logAuditAction } from "./auditLogger";

const LOCAL_STORAGE_KEY = "capstone_partylists";

export const PRESET_PARTYLIST_COLORS = [
  { label: "Sapphire Blue", color: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE" },
  { label: "Emerald Green", color: "#059669", bg: "#ECFDF5", border: "#A7F3D0" },
  { label: "Crimson Red", color: "#DC2626", bg: "#FEF2F2", border: "#FECACA" },
  { label: "Amber Gold", color: "#D97706", bg: "#FFFBEB", border: "#FDE68A" },
  { label: "Royal Violet", color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE" },
  { label: "Teal Cyan", color: "#0D9488", bg: "#F0FDFA", border: "#99F6E4" },
  { label: "Rose Magenta", color: "#E11D48", bg: "#FFF1F2", border: "#FECDD3" },
  { label: "Slate Neutral", color: "#475569", bg: "#F8FAFC", border: "#CBD5E1" },
];

export const DEFAULT_PARTYLISTS: PartyList[] = [
  {
    id: "pl-sandigan",
    name: "SANDIGAN",
    code: "SDG",
    color: "#2563EB",
    description: "Samahan ng Demokratiko at Makabagong Mag-aaral - Focused on transparent student leadership, digital governance, and student empowerment.",
    created_at: new Date().toISOString(),
  },
  {
    id: "pl-tagumpay",
    name: "TAGUMPAY",
    code: "TGP",
    color: "#059669",
    description: "Tapat at May Dangal na Pamumuno - Advocating for student welfare, campus mental health advocacy, and inclusive school programs.",
    created_at: new Date().toISOString(),
  },
  {
    id: "pl-alab",
    name: "ALAB",
    code: "ALB",
    color: "#DC2626",
    description: "Alyansa ng Lider-Kabataan para sa Aktibong Bukas - Committed to sports development, arts excellence, and community involvement.",
    created_at: new Date().toISOString(),
  },
];

const INITIALIZED_KEY = "capstone_partylists_initialized";

/**
 * Fetch all registered partylists from Supabase with resilient localStorage backup.
 */
export async function fetchPartyLists(): Promise<PartyList[]> {
  const isInitialized = localStorage.getItem(INITIALIZED_KEY) === "true";

  try {
    const { data, error } = await supabase
      .from("partylists")
      .select("*")
      .order("name");

    if (!error && data) {
      if (data.length > 0 || isInitialized) {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
        localStorage.setItem(INITIALIZED_KEY, "true");
        return data as PartyList[];
      }

      // First run only: If Supabase table is brand new and empty, seed defaults
      if (!isInitialized && data.length === 0) {
        try {
          const { error: insertErr } = await supabase.from("partylists").insert(
            DEFAULT_PARTYLISTS.map((p) => ({
              name: p.name,
              code: p.code,
              color: p.color,
              description: p.description,
            }))
          );
          if (!insertErr) {
            localStorage.setItem(INITIALIZED_KEY, "true");
            const { data: refetched } = await supabase.from("partylists").select("*").order("name");
            if (refetched && refetched.length > 0) {
              localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(refetched));
              return refetched as PartyList[];
            }
          }
        } catch (e) {
          console.warn("Could not seed default partylists to Supabase:", e);
        }
      }
    }
  } catch (err) {
    console.warn("Supabase fetch partylists notice (offline/table fallback):", err);
  }

  // Local storage fallback
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.error("Local partylist read error:", e);
  }

  if (isInitialized) {
    return [];
  }

  // Very first initialization fallback
  localStorage.setItem(INITIALIZED_KEY, "true");
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(DEFAULT_PARTYLISTS));
  return DEFAULT_PARTYLISTS;
}

/**
 * Create a new partylist in Supabase and local cache.
 */
export async function createPartyList(
  partylist: Omit<PartyList, "id" | "created_at">
): Promise<PartyList> {
  const newId = `pl-${Date.now()}`;
  const timestamp = new Date().toISOString();
  const newParty: PartyList = {
    id: newId,
    name: partylist.name.trim(),
    code: (partylist.code || partylist.name.slice(0, 3)).toUpperCase().trim(),
    color: partylist.color || "#2563EB",
    description: partylist.description?.trim() || "",
    created_at: timestamp,
  };

  // Try Supabase insert
  try {
    const { data, error } = await supabase
      .from("partylists")
      .insert([
        {
          name: newParty.name,
          code: newParty.code,
          color: newParty.color,
          description: newParty.description,
        },
      ])
      .select()
      .maybeSingle();

    if (!error && data) {
      newParty.id = data.id || newParty.id;
    }
  } catch (err) {
    console.warn("Supabase create partylist notice:", err);
  }

  // Update local cache
  try {
    const current = await fetchPartyLists();
    const updated = [...current.filter((p) => p.name.toLowerCase() !== newParty.name.toLowerCase()), newParty];
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error("Local partylist write error:", e);
  }

  await logAuditAction(
    "PARTYLIST_CREATED",
    "Admin",
    `Created new partylist "${newParty.name}" (${newParty.code})`
  );

  return newParty;
}

/**
 * Update an existing partylist.
 */
export async function updatePartyList(
  id: string,
  updates: Partial<PartyList>,
  oldName?: string
): Promise<void> {
  try {
    await supabase
      .from("partylists")
      .update({
        name: updates.name?.trim(),
        code: updates.code?.toUpperCase().trim(),
        color: updates.color,
        description: updates.description?.trim(),
      })
      .eq("id", id);
  } catch (err) {
    console.warn("Supabase update partylist notice:", err);
  }

  // Update local storage
  try {
    const current = await fetchPartyLists();
    const updated = current.map((p) => (p.id === id ? { ...p, ...updates } : p));
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error("Local partylist update error:", e);
  }

  // If partylist name changed, update affiliated candidates
  if (oldName && updates.name && oldName.trim() !== updates.name.trim()) {
    try {
      await supabase
        .from("candidates")
        .update({ partylist: updates.name.trim() })
        .eq("partylist", oldName.trim());
    } catch (e) {
      console.warn("Could not cascade candidate partylist name update:", e);
    }
  }

  await logAuditAction(
    "PARTYLIST_UPDATED",
    "Admin",
    `Updated partylist "${updates.name || id}"`
  );
}

/**
 * Delete a partylist and clear candidate assignments.
 */
export async function deletePartyList(id: string, name: string): Promise<void> {
  try {
    await supabase.from("partylists").delete().eq("id", id);
  } catch (err) {
    console.warn("Supabase delete partylist notice:", err);
  }

  // Update local storage
  try {
    const current = await fetchPartyLists();
    const updated = current.filter((p) => p.id !== id);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    localStorage.setItem(INITIALIZED_KEY, "true");
  } catch (e) {
    console.error("Local partylist delete error:", e);
  }

  // Revert candidates assigned to this partylist to Independent (empty)
  try {
    await supabase
      .from("candidates")
      .update({ partylist: null })
      .eq("partylist", name);
  } catch (e) {
    console.warn("Could not unassign deleted partylist from candidates:", e);
  }

  await logAuditAction(
    "PARTYLIST_DELETED",
    "Admin",
    `Deleted partylist "${name}" and unassigned related candidates`
  );
}

/**
 * Remove or clear a candidate's partylist affiliation (sets them as Independent).
 */
export async function removeCandidatePartylist(candidateId: string): Promise<void> {
  await assignCandidatePartylist(candidateId, null);
}

/**
 * Assign or change a candidate's partylist.
 */
export async function assignCandidatePartylist(
  candidateId: string,
  partylistName: string | null
): Promise<void> {
  const cleanPartylist = partylistName && partylistName.trim().length > 0 && partylistName.trim().toLowerCase() !== "independent"
    ? partylistName.trim()
    : null;

  try {
    const { error } = await supabase
      .from("candidates")
      .update({ partylist: cleanPartylist })
      .eq("id", candidateId);

    if (error) {
      console.warn("Supabase assign partylist error:", error.message);
    }
  } catch (err) {
    console.warn("Supabase candidate partylist update notice:", err);
  }
}

/**
 * Helper to get badge visual styling for any partylist name.
 */
export function getPartyListBadgeDetails(
  partylistName?: string | null,
  allPartylists: PartyList[] = []
): {
  name: string;
  code: string;
  color: string;
  bg: string;
  border: string;
  isIndependent: boolean;
} {
  if (!partylistName || partylistName.trim() === "" || partylistName.trim().toLowerCase() === "independent") {
    return {
      name: "Independent",
      code: "IND",
      color: "#EF4444",
      bg: "rgba(239, 68, 68, 0.08)",
      border: "rgba(239, 68, 68, 0.25)",
      isIndependent: true,
    };
  }

  const clean = partylistName.trim();
  const matched = allPartylists.find(
    (p) => p.name.toLowerCase() === clean.toLowerCase() || (p.code && p.code.toLowerCase() === clean.toLowerCase())
  );

  if (matched) {
    const hex = matched.color || "#2563EB";
    return {
      name: matched.name,
      code: matched.code || matched.name.slice(0, 3).toUpperCase(),
      color: hex,
      bg: `${hex}15`,
      border: `${hex}35`,
      isIndependent: false,
    };
  }

  // Fallback hash color for arbitrary string
  return {
    name: clean,
    code: clean.slice(0, 3).toUpperCase(),
    color: "#2563EB",
    bg: "rgba(37, 99, 235, 0.08)",
    border: "rgba(37, 99, 235, 0.25)",
    isIndependent: false,
  };
}
