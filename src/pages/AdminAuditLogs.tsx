import React, { useEffect, useState } from "react";
import { fetchAuditLogs, AuditLogItem } from "../utils/auditLogger";

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

  const getActionBadgeColor = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes("REGISTER") || act.includes("CREATE") || act.includes("ADD")) {
      return { bg: "var(--color-success-bg)", text: "var(--color-success)", border: "var(--color-success-border)" };
    }
    if (act.includes("DELETE") || act.includes("RESET") || act.includes("REMOVE")) {
      return { bg: "var(--color-danger-bg)", text: "var(--color-danger)", border: "var(--color-danger-border)" };
    }
    if (act.includes("TIMER") || act.includes("SETTING") || act.includes("UPDATE")) {
      return { bg: "var(--color-warning-bg)", text: "var(--color-warning)", border: "var(--color-warning-border)" };
    }
    return { bg: "var(--color-info-bg)", text: "var(--color-info)", border: "var(--color-info-border)" };
  };

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "24px 16px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 800, color: "var(--primary-navy)", display: "flex", alignItems: "center", gap: "10px" }}>
            <span className="material-symbols-outlined" style={{ fontSize: "28px" }}>
              security
            </span>
            System Security Audit Logs
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: "13px", color: "var(--text-light)" }}>
            Immutable event log tracking admin operations, election settings, and voter actions.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="btn-primary"
          style={{ padding: "8px 16px", borderRadius: "var(--radius-md)", display: "flex", alignItems: "center", gap: "6px", fontSize: "13px" }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
            refresh
          </span>
          Refresh Logs
        </button>
      </div>

      {/* Controls Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "16px",
          marginBottom: "20px",
          flexWrap: "wrap",
          backgroundColor: "var(--bg-main)",
          padding: "16px",
          borderRadius: "var(--card-radius)",
          border: "1px solid var(--border-light)",
        }}
      >
        <div style={{ flex: 1, minWidth: "260px" }}>
          <input
            type="text"
            placeholder="Search action, admin, or detail logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              padding: "9px 14px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-light)",
              backgroundColor: "var(--bg-surface)",
              color: "var(--text-main)",
              fontSize: "13.5px",
            }}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <label style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--text-muted)" }}>Filter Category:</label>
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            style={{
              padding: "8px 36px 8px 14px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-light)",
              backgroundColor: "var(--bg-main)",
              color: "var(--primary-navy)",
              fontSize: "13px",
              fontWeight: 600,
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

      {/* Audit Table */}
      <div
        style={{
          backgroundColor: "var(--bg-main)",
          border: "1px solid var(--border-light)",
          borderRadius: "var(--card-radius)",
          boxShadow: "var(--shadow-sm)",
          overflow: "hidden",
        }}
      >
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--text-light)" }}>Loading security audit logs...</div>
        ) : filteredLogs.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--text-light)" }}>
            No audit logs found matching your filter criteria.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
              <thead>
                <tr style={{ backgroundColor: "var(--primary-navy)", color: "var(--text-white)" }}>
                  <th style={{ padding: "12px 16px", fontWeight: 700 }}>Timestamp</th>
                  <th style={{ padding: "12px 16px", fontWeight: 700 }}>Action</th>
                  <th style={{ padding: "12px 16px", fontWeight: 700 }}>Performed By</th>
                  <th style={{ padding: "12px 16px", fontWeight: 700 }}>Details / Metadata</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((item, idx) => {
                  const styleBadge = getActionBadgeColor(item.action);
                  return (
                    <tr
                      key={item.id || idx}
                      style={{
                        borderBottom: "1px solid var(--border-light)",
                        backgroundColor: idx % 2 === 0 ? "var(--bg-main)" : "var(--bg-surface)",
                      }}
                    >
                      <td style={{ padding: "12px 16px", whiteSpace: "nowrap", color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: "12px" }}>
                        {item.created_at ? new Date(item.created_at).toLocaleString() : "Just now"}
                      </td>
                      <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>
                        <span
                          style={{
                            padding: "4px 10px",
                            borderRadius: "var(--radius-sm)",
                            backgroundColor: styleBadge.bg,
                            color: styleBadge.text,
                            border: `1px solid ${styleBadge.border}`,
                            fontWeight: 700,
                            fontSize: "11.5px",
                            letterSpacing: "0.02em",
                          }}
                        >
                          {item.action}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px", fontWeight: 700, color: "var(--primary-navy)" }}>
                        {item.performed_by}
                      </td>
                      <td style={{ padding: "12px 16px", color: "var(--text-main)", lineHeight: 1.4 }}>
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
