import React, { useEffect, useState } from "react";
import { fetchAuditLogs, AuditLogItem } from "../utils/auditLogger";
import { ShieldAlert, RotateCw, Search, Filter, ShieldCheck, Activity } from "lucide-react";

export const AdminAuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAction, setFilterAction] = useState("All");

  const loadLogs = async () => {
    setLoading(true);
    const data = await fetchAuditLogs();
    setLogs(data);
    setLoading(false);
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const handleRefresh = async () => {
    await loadLogs();
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.performed_by.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.details && log.details.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesAction = filterAction === "All" || log.action.toUpperCase().includes(filterAction.toUpperCase());

    return matchesSearch && matchesAction;
  });

  const getActionBadgeStyle = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes("REGISTER") || act.includes("CREATE") || act.includes("ADD")) {
      return { bg: "rgba(16, 185, 129, 0.1)", text: "#10B981", border: "rgba(16, 185, 129, 0.2)" };
    }
    if (act.includes("DELETE") || act.includes("RESET") || act.includes("REMOVE")) {
      return { bg: "rgba(239, 68, 68, 0.1)", text: "#EF4444", border: "rgba(239, 68, 68, 0.2)" };
    }
    if (act.includes("TIMER") || act.includes("SETTING") || act.includes("UPDATE")) {
      return { bg: "rgba(245, 158, 11, 0.1)", text: "#F59E0B", border: "rgba(245, 158, 11, 0.2)" };
    }
    return { bg: "rgba(99, 102, 241, 0.1)", text: "#6366F1", border: "rgba(99, 102, 241, 0.2)" };
  };

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "16px 20px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
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
              <ShieldAlert size={14} />
            </div>
            <h1 style={{ margin: 0, fontSize: "18px", fontWeight: 600, color: "var(--text-main)", letterSpacing: "-0.01em" }}>
              System Security Audit Logs
            </h1>
            <span style={{
              padding: "2px 8px",
              borderRadius: "10px",
              fontSize: "11px",
              fontWeight: 500,
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-muted)"
            }}>
              {logs.length} Total Events
            </span>
          </div>
          <p style={{ margin: 0, fontSize: "12px", color: "var(--text-muted)" }}>
            Immutable operation log tracking administrative actions, security setting changes, and system events.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          className="btn-secondary"
          style={{ padding: "6px 12px", borderRadius: "6px", display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 500 }}
        >
          <RotateCw size={13} className={loading ? "spin" : ""} />
          Refresh Log
        </button>
      </div>

      {/* Toolbar & Filter Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "12px",
          marginBottom: "12px",
          flexWrap: "wrap",
          backgroundColor: "var(--bg-surface)",
          padding: "10px 14px",
          borderRadius: "8px",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <div style={{ flex: 1, minWidth: "240px", position: "relative" }}>
          <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-light)" }} />
          <input
            type="text"
            placeholder="Search action, performed by, or detail string..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              padding: "6px 10px 6px 30px",
              borderRadius: "6px",
              border: "1px solid var(--border-subtle)",
              backgroundColor: "var(--bg-main)",
              color: "var(--text-main)",
              fontSize: "12.5px",
            }}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Filter size={13} style={{ color: "var(--text-muted)" }} />
          <label style={{ fontSize: "12px", fontWeight: 500, color: "var(--text-muted)" }}>Category:</label>
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            style={{
              padding: "5px 28px 5px 10px",
              borderRadius: "6px",
              border: "1px solid var(--border-subtle)",
              backgroundColor: "var(--bg-main)",
              color: "var(--text-main)",
              fontSize: "12px",
              fontWeight: 500,
            }}
          >
            <option value="All">All Categories ({logs.length})</option>
            <option value="REGISTER">Voter Registration</option>
            <option value="CANDIDATE">Candidate Management</option>
            <option value="TIMER">Election Settings</option>
            <option value="RESET">Resets & Deletions</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div
        style={{
          backgroundColor: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "8px",
          boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
          overflow: "hidden",
        }}
      >
        {loading ? (
          <div style={{ padding: "36px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>
            <Activity size={16} className="spin" style={{ display: "block", margin: "0 auto 8px auto", color: "var(--accent-primary)" }} />
            Fetching security audit log stream...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div style={{ padding: "36px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>
            No security log entries match the search filter.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "12.5px" }}>
              <thead>
                <tr style={{ backgroundColor: "var(--bg-card)", color: "var(--text-muted)", borderBottom: "1px solid var(--border-subtle)" }}>
                  <th style={{ padding: "8px 12px", fontWeight: 600, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.03em" }}>Timestamp</th>
                  <th style={{ padding: "8px 12px", fontWeight: 600, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.03em" }}>Action</th>
                  <th style={{ padding: "8px 12px", fontWeight: 600, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.03em" }}>Performed By</th>
                  <th style={{ padding: "8px 12px", fontWeight: 600, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.03em" }}>Operation Metadata & Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((item, idx) => {
                  const styleBadge = getActionBadgeStyle(item.action);
                  return (
                    <tr
                      key={item.id || idx}
                      style={{
                        borderBottom: "1px solid var(--border-subtle)",
                        backgroundColor: idx % 2 === 0 ? "transparent" : "rgba(255, 255, 255, 0.015)",
                        transition: "background 150ms ease"
                      }}
                    >
                      <td style={{ padding: "8px 12px", whiteSpace: "nowrap", color: "var(--text-muted)", fontFamily: "monospace", fontSize: "11px" }}>
                        {item.created_at ? new Date(item.created_at).toLocaleString() : "Just now"}
                      </td>
                      <td style={{ padding: "8px 12px", whiteSpace: "nowrap" }}>
                        <span
                          style={{
                            padding: "2px 7px",
                            borderRadius: "4px",
                            backgroundColor: styleBadge.bg,
                            color: styleBadge.text,
                            border: `1px solid ${styleBadge.border}`,
                            fontWeight: 600,
                            fontSize: "11px",
                            letterSpacing: "0.01em",
                            fontFamily: "monospace"
                          }}
                        >
                          {item.action}
                        </span>
                      </td>
                      <td style={{ padding: "8px 12px", fontWeight: 500, color: "var(--text-main)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <ShieldCheck size={12} style={{ color: "var(--accent-primary)" }} />
                          {item.performed_by}
                        </div>
                      </td>
                      <td style={{ padding: "8px 12px", color: "var(--text-muted)", fontSize: "12px", lineHeight: "1.4" }}>
                        {item.details || "N/A"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

