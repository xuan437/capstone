import { supabase } from "../supabase";

export interface AuditLogItem {
  id?: number | string;
  action: string;
  performed_by: string;
  details?: string;
  created_at?: string;
}

const LOCAL_STORAGE_KEY = "capstone_audit_logs";

export async function logAuditAction(
  action: string,
  performedBy: string = "Admin",
  details: string = ""
): Promise<void> {
  const timestamp = new Date().toISOString();
  
  // Local storage backup
  try {
    const existing = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || "[]");
    const newEntry: AuditLogItem = {
      id: Date.now(),
      action,
      performed_by: performedBy,
      details,
      created_at: timestamp,
    };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify([newEntry, ...existing].slice(0, 100)));
  } catch (e) {
    console.error("Local audit storage error:", e);
  }

  // Supabase audit_logs insert
  try {
    const { error } = await supabase.from("audit_logs").insert([
      {
        action,
        performed_by: performedBy,
        details,
        created_at: timestamp,
      },
    ]);
    if (error) {
      console.warn("Supabase audit log notice (offline/table fallback):", error.message);
    }
  } catch (err) {
    console.warn("Supabase audit log exception:", err);
  }
}

export async function fetchAuditLogs(): Promise<AuditLogItem[]> {
  try {
    const { data, error } = await supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (!error && data && data.length > 0) {
      return data as AuditLogItem[];
    }
  } catch (err) {
    console.warn("Supabase fetch audit logs fallback:", err);
  }

  // Fallback to local storage
  try {
    const local = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || "[]");
    return local as AuditLogItem[];
  } catch {
    return [];
  }
}
