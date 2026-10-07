import React, { useEffect, useState, useMemo, useRef } from "react";
import { fetchAuditLogs, AuditLogItem } from "../utils/auditLogger";
import {
  ShieldAlert,
  RotateCw,
  Search,
  ShieldCheck,
  Activity,
  LogIn,
  LogOut,
  GraduationCap,
  Download,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ChevronDown,
  Check,
  Layers,
  UserCheck,
  Award,
  Vote,
} from "lucide-react";

interface CategoryOption {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties; className?: string }>;
  color: string;
}

const CATEGORIES: CategoryOption[] = [
  { id: "All", label: "All Categories", icon: Layers, color: "var(--text-muted)" },
  { id: "LOGIN", label: "Logins & Sessions", icon: LogIn, color: "#0284C7" },
  { id: "REGISTER", label: "Voter Registration", icon: UserCheck, color: "#10B981" },
  { id: "CANDIDATE", label: "Candidate Management", icon: Award, color: "#F59E0B" },
  { id: "VOTE", label: "Votes & Ballots", icon: Vote, color: "#059669" },
  { id: "SECURITY", label: "Security & Access Key", icon: ShieldCheck, color: "#6366F1" },
  { id: "TIMER", label: "Election Settings", icon: Clock, color: "#D97706" },
  { id: "RESET", label: "Resets & Deletions", icon: AlertTriangle, color: "#EF4444" },
];

export const AdminAuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAction, setFilterAction] = useState("All");
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const loadLogs = async () => {
    setLoading(true);
    const data = await fetchAuditLogs();
    setLogs(data);
    setLoading(false);
  };

  useEffect(() => {
    loadLogs();
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsCategoryOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleRefresh = async () => {
    await loadLogs();
  };

  // Metric counts
  const metrics = useMemo(() => {
    const total = logs.length;
    const sessionLogs = logs.filter((l) => {
      const act = l.action.toUpperCase();
      return act.includes("LOGIN") || act.includes("LOGOUT") || act.includes("SESSION") || act.includes("LOCKOUT");
    }).length;
    const adminLogs = logs.filter((l) => {
      const p = (l.performed_by || "").toLowerCase();
      return p.includes("admin") || p.includes("faculty");
    }).length;
    const voterLogs = logs.filter((l) => {
      const p = (l.performed_by || "").toLowerCase();
      const a = l.action.toUpperCase();
      return (!p.includes("admin") && !p.includes("system") && !p.includes("unauthenticated")) || a.includes("STUDENT") || a.includes("VOTE");
    }).length;
    const securityLogs = logs.filter((l) => {
      const act = l.action.toUpperCase();
      return act.includes("SECURITY") || act.includes("PASSWORD") || act.includes("KEY") || act.includes("ACCESS") || act.includes("LOCKOUT") || act.includes("DENIED");
    }).length;
    const resetLogs = logs.filter((l) => {
      const act = l.action.toUpperCase();
      return act.includes("RESET") || act.includes("DELETE") || act.includes("REMOVE") || act.includes("CLEAR");
    }).length;

    return { total, sessionLogs, adminLogs, voterLogs, securityLogs, resetLogs };
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm ||
        log.action.toLowerCase().includes(q) ||
        log.performed_by.toLowerCase().includes(q) ||
        (log.details && log.details.toLowerCase().includes(q));

      let matchesAction = true;
      if (filterAction === "LOGIN") {
        const act = log.action.toUpperCase();
        matchesAction = act.includes("LOGIN") || act.includes("LOGOUT") || act.includes("SESSION") || act.includes("LOCKOUT");
      } else if (filterAction === "SECURITY") {
        const act = log.action.toUpperCase();
        matchesAction = act.includes("SECURITY") || act.includes("PASSWORD") || act.includes("KEY") || act.includes("ACCESS") || act.includes("BALLOT") || act.includes("AUTH") || act.includes("LOCKOUT") || act.includes("DENIED");
      } else if (filterAction === "RESET") {
        const act = log.action.toUpperCase();
        matchesAction = act.includes("RESET") || act.includes("DELETE") || act.includes("REMOVE") || act.includes("CLEAR");
      } else if (filterAction === "VOTE") {
        const act = log.action.toUpperCase();
        matchesAction = act.includes("VOTE") || act.includes("BALLOT") || act.includes("RECEIPT");
      } else if (filterAction !== "All") {
        matchesAction = log.action.toUpperCase().includes(filterAction.toUpperCase());
      }

      return matchesSearch && matchesAction;
    });
  }, [logs, searchTerm, filterAction]);

  const handleExportCSV = () => {
    if (!filteredLogs.length) return;
    const headers = ["ID", "Timestamp", "Action", "Performed By", "Details"];
    const rows = filteredLogs.map((item, idx) => [
      String(item.id || idx + 1),
      item.created_at ? new Date(item.created_at).toISOString() : new Date().toISOString(),
      `"${item.action.replace(/"/g, '""')}"`,
      `"${item.performed_by.replace(/"/g, '""')}"`,
      `"${(item.details || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `sslg_security_audit_logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getActionBadgeDetails = (action: string) => {
    const act = action.toUpperCase();

    // Login & Sessions
    if (act === "STUDENT_LOGIN" || act === "ADMIN_LOGIN") {
      return {
        bg: "rgba(14, 165, 233, 0.12)",
        text: "#0284C7",
        border: "rgba(14, 165, 233, 0.28)",
        Icon: LogIn,
      };
    }
    if (act.includes("LOGOUT")) {
      return {
        bg: "rgba(100, 116, 139, 0.12)",
        text: "#64748B",
        border: "rgba(100, 116, 139, 0.25)",
        Icon: LogOut,
      };
    }
    if (act.includes("FAIL") || act.includes("LOCKOUT") || act.includes("DENIED")) {
      return {
        bg: "rgba(239, 68, 68, 0.12)",
        text: "#EF4444",
        border: "rgba(239, 68, 68, 0.28)",
        Icon: AlertTriangle,
      };
    }

    // Registrations & Adds
    if (act.includes("REGISTER") || act.includes("CREATE") || act.includes("ADD")) {
      return {
        bg: "rgba(16, 185, 129, 0.12)",
        text: "#10B981",
        border: "rgba(16, 185, 129, 0.25)",
        Icon: CheckCircle2,
      };
    }

    // Voting
    if (act.includes("VOTE") || act.includes("BALLOT")) {
      return {
        bg: "rgba(5, 150, 105, 0.14)",
        text: "#059669",
        border: "rgba(5, 150, 105, 0.3)",
        Icon: CheckCircle2,
      };
    }

    // Deletions / Resets
    if (act.includes("DELETE") || act.includes("RESET") || act.includes("REMOVE")) {
      return {
        bg: "rgba(239, 68, 68, 0.1)",
        text: "#EF4444",
        border: "rgba(239, 68, 68, 0.2)",
        Icon: AlertTriangle,
      };
    }

    // Settings
    if (act.includes("TIMER") || act.includes("SETTING") || act.includes("UPDATE")) {
      return {
        bg: "rgba(245, 158, 11, 0.12)",
        text: "#D97706",
        border: "rgba(245, 158, 11, 0.25)",
        Icon: Clock,
      };
    }

    // Default
    return {
      bg: "rgba(99, 102, 241, 0.1)",
      text: "#6366F1",
      border: "rgba(99, 102, 241, 0.2)",
      Icon: Activity,
    };
  };

  const renderPerformedBy = (performedBy: string) => {
    const isSys = performedBy.toLowerCase().includes("system");
    const isAdmin = performedBy.toLowerCase().includes("admin") || performedBy.toLowerCase().includes("faculty");
    const isUnauth = performedBy.toLowerCase().includes("unauthenticated") || performedBy.toLowerCase().includes("unknown");

    if (isAdmin) {
      return (
        <div style={{ display: "inline-flex", alignItems: "center", gap: "5px", color: "var(--primary-navy)", fontWeight: 600 }}>
          <ShieldCheck size={13} style={{ color: "var(--primary-navy)" }} />
          <span>{performedBy}</span>
        </div>
      );
    }

    if (isSys) {
      return (
        <div style={{ display: "inline-flex", alignItems: "center", gap: "5px", color: "#64748B", fontWeight: 500 }}>
          <Activity size={12} />
          <span>System Daemon</span>
        </div>
      );
    }

    if (isUnauth) {
      return (
        <div style={{ display: "inline-flex", alignItems: "center", gap: "5px", color: "#EF4444", fontWeight: 500 }}>
          <AlertTriangle size={12} />
          <span>{performedBy}</span>
        </div>
      );
    }

    return (
      <div style={{ display: "inline-flex", alignItems: "center", gap: "5px", color: "var(--text-main)", fontWeight: 600 }}>
        <GraduationCap size={13} style={{ color: "#0284C7" }} />
        <span>{performedBy}</span>
      </div>
    );
  };

  const activeCategory = CATEGORIES.find((c) => c.id === filterAction) || CATEGORIES[0];
  const ActiveCategoryIcon = activeCategory.icon;

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "16px 20px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <div style={{
              width: "28px",
              height: "28px",
              borderRadius: "6px",
              backgroundColor: "rgba(99, 102, 241, 0.12)",
              border: "1px solid rgba(99, 102, 241, 0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--accent-primary)"
            }}>
              <ShieldAlert size={15} />
            </div>
            <h1 style={{ margin: 0, fontSize: "19px", fontWeight: 700, color: "var(--text-main)", letterSpacing: "-0.01em" }}>
              System Security & Session Audit Logs
            </h1>
            <span style={{
              padding: "2px 8px",
              borderRadius: "10px",
              fontSize: "11px",
              fontWeight: 600,
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-muted)"
            }}>
              {logs.length} Total Records
            </span>
          </div>
          <p style={{ margin: 0, fontSize: "12px", color: "var(--text-muted)" }}>
            Immutable security log stream recording logins, session events, ballot actions, and administrative operations.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            onClick={handleExportCSV}
            className="btn-secondary"
            disabled={filteredLogs.length === 0}
            style={{ padding: "6px 12px", borderRadius: "6px", display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 500 }}
            title="Export filtered audit logs as CSV"
          >
            <Download size={13} />
            Export CSV
          </button>
          <button
            onClick={handleRefresh}
            className="btn-secondary"
            style={{ padding: "6px 12px", borderRadius: "6px", display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 500 }}
          >
            <RotateCw size={13} className={loading ? "spin" : ""} />
            Refresh Log
          </button>
        </div>
      </div>

      {/* Metric Summary Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "10px",
          marginBottom: "14px",
        }}
      >
        <div style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "8px", padding: "12px 14px" }}>
          <div style={{ fontSize: "10.5px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "4px" }}>
            Total Audit Records
          </div>
          <div style={{ fontSize: "20px", fontWeight: 700, color: "var(--text-main)" }}>
            {metrics.total}
          </div>
        </div>

        <div
          onClick={() => setFilterAction(filterAction === "LOGIN" ? "All" : "LOGIN")}
          style={{
            backgroundColor: filterAction === "LOGIN" ? "rgba(14, 165, 233, 0.08)" : "var(--bg-surface)",
            border: `1px solid ${filterAction === "LOGIN" ? "rgba(14, 165, 233, 0.4)" : "var(--border-subtle)"}`,
            borderRadius: "8px",
            padding: "12px 14px",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
            <span style={{ fontSize: "10.5px", fontWeight: 600, color: "#0284C7", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Login & Sessions
            </span>
            <LogIn size={13} style={{ color: "#0284C7" }} />
          </div>
          <div style={{ fontSize: "20px", fontWeight: 700, color: "#0284C7" }}>
            {metrics.sessionLogs}
          </div>
        </div>

        <div
          onClick={() => setFilterAction(filterAction === "REGISTER" ? "All" : "REGISTER")}
          style={{
            backgroundColor: filterAction === "REGISTER" ? "rgba(16, 185, 129, 0.08)" : "var(--bg-surface)",
            border: `1px solid ${filterAction === "REGISTER" ? "rgba(16, 185, 129, 0.4)" : "var(--border-subtle)"}`,
            borderRadius: "8px",
            padding: "12px 14px",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
            <span style={{ fontSize: "10.5px", fontWeight: 600, color: "#10B981", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Admin Operations
            </span>
            <ShieldCheck size={13} style={{ color: "#10B981" }} />
          </div>
          <div style={{ fontSize: "20px", fontWeight: 700, color: "#10B981" }}>
            {metrics.adminLogs}
          </div>
        </div>

        <div
          onClick={() => setFilterAction(filterAction === "VOTE" ? "All" : "VOTE")}
          style={{
            backgroundColor: filterAction === "VOTE" ? "rgba(99, 102, 241, 0.08)" : "var(--bg-surface)",
            border: `1px solid ${filterAction === "VOTE" ? "rgba(99, 102, 241, 0.4)" : "var(--border-subtle)"}`,
            borderRadius: "8px",
            padding: "12px 14px",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
            <span style={{ fontSize: "10.5px", fontWeight: 600, color: "var(--accent-primary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Voter Activity
            </span>
            <GraduationCap size={13} style={{ color: "var(--accent-primary)" }} />
          </div>
          <div style={{ fontSize: "20px", fontWeight: 700, color: "var(--accent-primary)" }}>
            {metrics.voterLogs}
          </div>
        </div>
      </div>

      {/* Toolbar & Modern Filter Bar */}
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

        {/* Modern Category Dropdown */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <label style={{ fontSize: "12px", fontWeight: 500, color: "var(--text-muted)" }}>Category:</label>
          <div ref={dropdownRef} style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => setIsCategoryOpen(!isCategoryOpen)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "7px",
                padding: "6px 11px",
                borderRadius: "7px",
                border: `1px solid ${isCategoryOpen ? "var(--primary-navy)" : "var(--border-subtle)"}`,
                backgroundColor: "var(--bg-main)",
                color: "var(--text-main)",
                fontSize: "12px",
                fontWeight: 500,
                cursor: "pointer",
                boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                transition: "all 0.15s ease",
              }}
            >
              <ActiveCategoryIcon size={13} style={{ color: activeCategory.color }} />
              <span>{activeCategory.label}</span>
              {activeCategory.id === "All" ? (
                <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 400 }}>({logs.length})</span>
              ) : activeCategory.id === "LOGIN" ? (
                <span style={{ fontSize: "11px", color: "#0284C7", fontWeight: 600 }}>({metrics.sessionLogs})</span>
              ) : null}
              <ChevronDown
                size={13}
                style={{
                  color: "var(--text-muted)",
                  marginLeft: "2px",
                  transform: isCategoryOpen ? "rotate(180deg)" : "none",
                  transition: "transform 0.15s ease",
                }}
              />
            </button>

            {isCategoryOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 5px)",
                  right: 0,
                  zIndex: 100,
                  minWidth: "220px",
                  backgroundColor: "var(--bg-card)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "9px",
                  boxShadow: "0 10px 25px -5px rgba(0,0,0,0.18), 0 8px 10px -6px rgba(0,0,0,0.1)",
                  padding: "5px",
                }}
              >
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = filterAction === cat.id;
                  let countBadge: string | null = null;
                  if (cat.id === "All") countBadge = `(${logs.length})`;
                  else if (cat.id === "LOGIN") countBadge = `(${metrics.sessionLogs})`;

                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setFilterAction(cat.id);
                        setIsCategoryOpen(false);
                      }}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "8px",
                        padding: "7px 10px",
                        borderRadius: "6px",
                        border: "none",
                        backgroundColor: isSelected ? "var(--bg-subtle)" : "transparent",
                        color: isSelected ? "var(--primary-navy)" : "var(--text-main)",
                        fontSize: "12px",
                        fontWeight: isSelected ? 600 : 500,
                        cursor: "pointer",
                        textAlign: "left",
                        transition: "background 0.12s ease",
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = "var(--bg-subtle)";
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div
                          style={{
                            width: "22px",
                            height: "22px",
                            borderRadius: "5px",
                            backgroundColor: "rgba(0,0,0,0.04)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Icon size={13} style={{ color: cat.color }} />
                        </div>
                        <span>{cat.label}</span>
                        {countBadge && (
                          <span style={{ fontSize: "11px", color: isSelected ? "var(--primary-navy)" : "var(--text-muted)", opacity: 0.8 }}>
                            {countBadge}
                          </span>
                        )}
                      </div>
                      {isSelected && <Check size={13} style={{ color: "var(--primary-navy)" }} />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
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
                  <th style={{ padding: "8px 12px", fontWeight: 600, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.03em", width: "155px" }}>Timestamp</th>
                  <th style={{ padding: "8px 12px", fontWeight: 600, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.03em", width: "190px" }}>Action</th>
                  <th style={{ padding: "8px 12px", fontWeight: 600, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.03em", width: "180px" }}>Performed By</th>
                  <th style={{ padding: "8px 12px", fontWeight: 600, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.03em" }}>Operation Metadata & Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((item, idx) => {
                  const badge = getActionBadgeDetails(item.action);
                  const Icon = badge.Icon;
                  return (
                    <tr
                      key={item.id || idx}
                      style={{
                        borderBottom: "1px solid var(--border-subtle)",
                        backgroundColor: idx % 2 === 0 ? "transparent" : "rgba(255, 255, 255, 0.015)",
                        transition: "background 150ms ease"
                      }}
                    >
                      <td style={{ padding: "9px 12px", whiteSpace: "nowrap", color: "var(--text-muted)", fontFamily: "monospace", fontSize: "11px" }}>
                        {item.created_at ? new Date(item.created_at).toLocaleString() : "Just now"}
                      </td>
                      <td style={{ padding: "9px 12px", whiteSpace: "nowrap" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "3px 8px",
                            borderRadius: "5px",
                            backgroundColor: badge.bg,
                            color: badge.text,
                            border: `1px solid ${badge.border}`,
                            fontWeight: 600,
                            fontSize: "11px",
                            letterSpacing: "0.01em",
                            fontFamily: "monospace"
                          }}
                        >
                          <Icon size={11} />
                          {item.action}
                        </span>
                      </td>
                      <td style={{ padding: "9px 12px", fontSize: "12px" }}>
                        {renderPerformedBy(item.performed_by)}
                      </td>
                      <td style={{ padding: "9px 12px", color: "var(--text-main)", fontSize: "12px", lineHeight: "1.45" }}>
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
