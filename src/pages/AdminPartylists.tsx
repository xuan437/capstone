import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Flag,
  Plus,
  Edit3,
  Trash2,
  Users,
  CheckCircle2,
  AlertCircle,
  X,
  Search,
  ChevronDown,
  UserCheck,
  UserMinus,
  Layers,
  Sparkles,
} from "lucide-react";
import { supabase } from "../supabase";
import { Candidate, Page, PartyList, POSITIONS } from "../types";
import {
  fetchPartyLists,
  createPartyList,
  updatePartyList,
  deletePartyList,
  assignCandidatePartylist,
  PRESET_PARTYLIST_COLORS,
} from "../utils/partylistUtils";
import { base64ToImageUrl } from "../utils/imageUtils";

interface AdminPartylistsProps {
  setPage: (p: Page) => void;
  searchTerm?: string;
  setSearchTerm?: (term: string) => void;
  onViewCandidate?: (id: string) => void;
}

export const AdminPartylists: React.FC<AdminPartylistsProps> = ({
  setPage: _setPage,
  searchTerm,
  setSearchTerm,
  onViewCandidate,
}) => {
  const [partylists, setPartylists] = useState<PartyList[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingParty, setEditingParty] = useState<PartyList | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assigningParty, setAssigningParty] = useState<PartyList | null>(null);

  // Form Fields
  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formColor, setFormColor] = useState("#2563EB");
  const [formDescription, setFormDescription] = useState("");
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Expanded cards tracker
  const [expandedSlates, setExpandedSlates] = useState<Record<string, boolean>>({});

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [fetchedParties, { data: candidateData }] = await Promise.all([
        fetchPartyLists(),
        supabase.from("candidates").select("*").order("position"),
      ]);
      setPartylists(fetchedParties);
      setCandidates((candidateData || []) as Candidate[]);
    } catch (e) {
      console.error("Error loading partylist dashboard data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setEditingParty(null);
    setFormName("");
    setFormCode("");
    setFormColor("#2563EB");
    setFormDescription("");
    setFormError("");
    setIsFormModalOpen(true);
  };

  const openEditModal = (party: PartyList) => {
    setEditingParty(party);
    setFormName(party.name);
    setFormCode(party.code || party.name.slice(0, 3));
    setFormColor(party.color || "#2563EB");
    setFormDescription(party.description || "");
    setFormError("");
    setIsFormModalOpen(true);
  };

  const handleSavePartylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError("Partylist Name is required.");
      return;
    }

    const cleanName = formName.trim();
    const cleanCode = (formCode.trim() || cleanName.slice(0, 3)).toUpperCase();

    // Check duplicate name
    const isDuplicate = partylists.some(
      (p) =>
        p.name.toLowerCase() === cleanName.toLowerCase() &&
        (!editingParty || p.id !== editingParty.id)
    );
    if (isDuplicate) {
      setFormError(`A partylist named "${cleanName}" already exists.`);
      return;
    }

    setIsSubmitting(true);
    setFormError("");

    try {
      if (editingParty) {
        await updatePartyList(
          editingParty.id,
          {
            name: cleanName,
            code: cleanCode,
            color: formColor,
            description: formDescription.trim(),
          },
          editingParty.name
        );
        showToast(`Partylist "${cleanName}" updated successfully!`);
      } else {
        await createPartyList({
          name: cleanName,
          code: cleanCode,
          color: formColor,
          description: formDescription.trim(),
        });
        showToast(`Partylist "${cleanName}" created successfully!`);
      }

      setIsFormModalOpen(false);
      await loadData();
    } catch (err: any) {
      setFormError(err.message || "Failed to save partylist.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePartylist = async (party: PartyList) => {
    const candidateCount = candidates.filter(
      (c) => c.partylist && c.partylist.toLowerCase() === party.name.toLowerCase()
    ).length;

    const confirmMsg = candidateCount > 0
      ? `Are you sure you want to delete partylist "${party.name}"? ${candidateCount} assigned candidate(s) will be set to Independent.`
      : `Are you sure you want to delete partylist "${party.name}"?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      await deletePartyList(party.id, party.name);
      showToast(`Partylist "${party.name}" deleted.`);
      await loadData();
    } catch (err: any) {
      alert("Failed to delete partylist: " + (err.message || "Unknown error"));
    }
  };

  const openAssignModal = (party: PartyList) => {
    setAssigningParty(party);
    setIsAssignModalOpen(true);
  };

  const handleToggleCandidateAssignment = async (candidateId: string, currentParty: string | undefined, targetPartyName: string) => {
    const isCurrentlyInTarget = currentParty && currentParty.toLowerCase() === targetPartyName.toLowerCase();
    const newPartylistValue = isCurrentlyInTarget ? null : targetPartyName;

    // Optimistically update candidate
    setCandidates((prev) =>
      prev.map((c) => (c.id === candidateId ? { ...c, partylist: newPartylistValue || undefined } : c))
    );

    await assignCandidatePartylist(candidateId, newPartylistValue);
  };

  const handleRemoveCandidateFromSlate = async (candidateId: string, candidateName: string, partyName: string) => {
    // Optimistically revert candidate to independent
    setCandidates((prev) =>
      prev.map((c) => (c.id === candidateId ? { ...c, partylist: undefined } : c))
    );

    try {
      await assignCandidatePartylist(candidateId, null);
      showToast(`Removed ${candidateName} from ${partyName} (now Independent)`);
    } catch (err: any) {
      console.error("Failed to remove candidate from partylist:", err);
      showToast("Error updating candidate partylist");
    }
  };

  const toggleSlateExpanded = (partyId: string) => {
    setExpandedSlates((prev) => ({
      ...prev,
      [partyId]: !prev[partyId],
    }));
  };

  // Filter candidates and partylists by search term if active
  const normalizedSearch = searchTerm?.toLowerCase().trim() || "";
  const isSearchActive = normalizedSearch.length > 0;

  const filteredPartylists = partylists.filter((p) => {
    if (!isSearchActive) return true;
    const matchesParty =
      p.name.toLowerCase().includes(normalizedSearch) ||
      (p.code && p.code.toLowerCase().includes(normalizedSearch)) ||
      (p.description && p.description.toLowerCase().includes(normalizedSearch));

    const matchesCandidate = candidates.some(
      (c) =>
        c.partylist &&
        c.partylist.toLowerCase() === p.name.toLowerCase() &&
        (c.name.toLowerCase().includes(normalizedSearch) || c.position.toLowerCase().includes(normalizedSearch))
    );

    return matchesParty || matchesCandidate;
  });

  const totalAffiliatedCandidates = candidates.filter(
    (c) => c.partylist && c.partylist.trim().length > 0 && c.partylist.trim().toLowerCase() !== "independent"
  ).length;

  const independentCandidates = candidates.filter(
    (c) => !c.partylist || c.partylist.trim().length === 0 || c.partylist.trim().toLowerCase() === "independent"
  );

  return (
    <div className="screen-content content-max-width">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            background: "var(--color-success)",
            color: "#ffffff",
            padding: "12px 20px",
            borderRadius: "var(--radius-md)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            zIndex: 9999,
            fontWeight: 600,
            fontSize: "13.5px",
            animation: "fadeIn 0.2s ease",
          }}
        >
          <CheckCircle2 size={18} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
          flexWrap: "wrap",
          gap: "14px",
        }}
      >
        <div>
          <span className="overline">Console Management</span>
          <h1 style={{ fontSize: "22px", fontWeight: 700, margin: "2px 0 0 0", color: "var(--text-main)" }}>
            Partylist Slates & Affiliations
          </h1>
          <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "var(--text-muted)" }}>
            Manage political parties, assign candidates to slates, and display partylist branding to student voters.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 18px",
            background: "var(--primary-navy)",
            color: "#ffffff",
            border: "none",
            borderRadius: "var(--radius-md)",
            fontSize: "13.5px",
            fontWeight: 600,
            cursor: "pointer",
            boxShadow: "var(--shadow-sm)",
            transition: "all 0.15s ease",
          }}
        >
          <Plus size={16} />
          <span>Add New Partylist</span>
        </button>
      </div>

      {/* Stats Cards Row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "14px",
          marginBottom: "20px",
        }}
      >
        <div className="card-box" style={{ padding: "16px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
            <div
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "8px",
                background: "rgba(37, 99, 235, 0.1)",
                color: "var(--primary-navy)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Flag size={18} />
            </div>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>
              Active Partylists
            </span>
          </div>
          <div style={{ fontSize: "26px", fontWeight: 700, color: "var(--text-main)" }}>
            {partylists.length}
          </div>
          <span style={{ fontSize: "11px", color: "var(--text-light)" }}>Official political parties registered</span>
        </div>

        <div className="card-box" style={{ padding: "16px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
            <div
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "8px",
                background: "rgba(5, 150, 105, 0.1)",
                color: "var(--color-success)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Users size={18} />
            </div>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>
              Slated Candidates
            </span>
          </div>
          <div style={{ fontSize: "26px", fontWeight: 700, color: "var(--text-main)" }}>
            {totalAffiliatedCandidates}
          </div>
          <span style={{ fontSize: "11px", color: "var(--text-light)" }}>Running under an official partylist</span>
        </div>

        <div className="card-box" style={{ padding: "16px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
            <div
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "8px",
                background: "rgba(100, 116, 139, 0.1)",
                color: "#64748B",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <UserCheck size={18} />
            </div>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>
              Independent Candidates
            </span>
          </div>
          <div style={{ fontSize: "26px", fontWeight: 700, color: "var(--text-main)" }}>
            {independentCandidates.length}
          </div>
          <span style={{ fontSize: "11px", color: "var(--text-light)" }}>Not affiliated with any partylist</span>
        </div>
      </div>

      {/* Active Search Banner */}
      {isSearchActive && (
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-light)",
            borderRadius: "var(--radius-md)",
            padding: "10px 16px",
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "8px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Search size={15} style={{ color: "var(--primary-navy)" }} />
            <span style={{ fontSize: "12.5px", color: "var(--text-main)" }}>
              Found <strong>{filteredPartylists.length}</strong> partylist(s) matching "<strong>{searchTerm}</strong>".
            </span>
          </div>
          {setSearchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              style={{
                background: "var(--bg-subtle)",
                border: "1px solid var(--border-light)",
                borderRadius: "4px",
                padding: "3px 10px",
                fontSize: "11px",
                fontWeight: 600,
                color: "var(--text-muted)",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <X size={12} />
              <span>Clear Search</span>
            </button>
          )}
        </div>
      )}

      {/* Partylist Cards Section */}
      {loading ? (
        <div className="card-box" style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
          Loading partylists and slates...
        </div>
      ) : filteredPartylists.length === 0 ? (
        <div className="card-box" style={{ padding: "48px 20px", textAlign: "center" }}>
          <Flag size={40} style={{ color: "var(--text-light)", marginBottom: "12px" }} />
          <h3 style={{ margin: "0 0 6px 0", fontSize: "16px", fontWeight: 700, color: "var(--text-main)" }}>
            No Partylists Found
          </h3>
          <p style={{ margin: "0 0 16px 0", fontSize: "13px", color: "var(--text-muted)" }}>
            {isSearchActive
              ? `No partylists matched "${searchTerm}". Clear search or create a new one.`
              : "No political partylists created yet. Click 'Add New Partylist' to get started."}
          </p>
          <button
            type="button"
            onClick={openCreateModal}
            style={{
              padding: "8px 16px",
              background: "var(--primary-navy)",
              color: "#ffffff",
              border: "none",
              borderRadius: "6px",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Create First Partylist
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "30px" }}>
          {filteredPartylists.map((party) => {
            const partyCandidates = candidates.filter(
              (c) => c.partylist && c.partylist.toLowerCase() === party.name.toLowerCase()
            );
            const isExpanded = expandedSlates[party.id] !== false; // default open
            const partyColor = party.color || "#2563EB";

            return (
              <div
                key={party.id}
                className="card-box"
                style={{
                  padding: "0",
                  overflow: "hidden",
                  border: "1px solid var(--border-light)",
                  borderRadius: "var(--radius-md)",
                  boxShadow: "var(--shadow-xs)",
                }}
              >
                {/* Color Top Border Accent */}
                <div style={{ height: "4px", background: partyColor }} />

                {/* Card Header */}
                <div
                  style={{
                    padding: "16px 20px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                    gap: "12px",
                    borderBottom: "1px solid var(--border-light)",
                    background: "var(--bg-card)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "14px", flex: 1, minWidth: "260px" }}>
                    {/* Badge Icon */}
                    <div
                      style={{
                        width: "44px",
                        height: "44px",
                        borderRadius: "10px",
                        background: `${partyColor}15`,
                        border: `1.5px solid ${partyColor}40`,
                        color: partyColor,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        fontWeight: 800,
                        fontSize: "13px",
                        letterSpacing: "0.05em",
                      }}
                    >
                      {party.code || party.name.slice(0, 3).toUpperCase()}
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                        <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "var(--text-main)" }}>
                          {party.name}
                        </h3>
                        {party.code && (
                          <span
                            style={{
                              fontSize: "10.5px",
                              fontWeight: 700,
                              background: `${partyColor}15`,
                              color: partyColor,
                              border: `1px solid ${partyColor}35`,
                              padding: "2px 7px",
                              borderRadius: "4px",
                              letterSpacing: "0.05em",
                            }}
                          >
                            {party.code}
                          </span>
                        )}
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 600,
                            color: "var(--text-muted)",
                            background: "var(--bg-subtle)",
                            padding: "2px 8px",
                            borderRadius: "4px",
                            border: "1px solid var(--border-light)",
                          }}
                        >
                          {partyCandidates.length} Candidate{partyCandidates.length === 1 ? "" : "s"}
                        </span>
                      </div>

                      {party.description && (
                        <p
                          style={{
                            margin: "6px 0 0 0",
                            fontSize: "12.5px",
                            color: "var(--text-muted)",
                            lineHeight: "1.4",
                          }}
                        >
                          {party.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Header Action Buttons */}
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <button
                      type="button"
                      onClick={() => openAssignModal(party)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "6px 12px",
                        background: "var(--bg-subtle)",
                        border: "1px solid var(--border-light)",
                        borderRadius: "6px",
                        fontSize: "12px",
                        fontWeight: 600,
                        color: "var(--primary-navy)",
                        cursor: "pointer",
                      }}
                      title="Assign or remove candidates from this partylist slate"
                    >
                      <Layers size={13} />
                      <span>Manage Slate</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => openEditModal(party)}
                      style={{
                        padding: "6px 10px",
                        background: "var(--bg-subtle)",
                        border: "1px solid var(--border-light)",
                        borderRadius: "6px",
                        fontSize: "12px",
                        fontWeight: 600,
                        color: "var(--text-main)",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                      title="Edit partylist details"
                    >
                      <Edit3 size={13} />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeletePartylist(party)}
                      style={{
                        padding: "6px 8px",
                        background: "var(--color-danger-bg)",
                        border: "1px solid var(--color-danger-border)",
                        borderRadius: "6px",
                        color: "var(--color-danger)",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                      }}
                      title="Delete partylist"
                    >
                      <Trash2 size={13} />
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleSlateExpanded(party.id)}
                      style={{
                        padding: "6px 8px",
                        background: "var(--bg-subtle)",
                        border: "1px solid var(--border-light)",
                        borderRadius: "6px",
                        color: "var(--text-muted)",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                      }}
                      title={isExpanded ? "Collapse slate" : "Expand slate"}
                    >
                      <ChevronDown
                        size={15}
                        style={{
                          transform: isExpanded ? "rotate(0deg)" : "rotate(-90deg)",
                          transition: "transform 0.15s ease",
                        }}
                      />
                    </button>
                  </div>
                </div>

                {/* Candidate Slate Roster */}
                {isExpanded && (
                  <div style={{ padding: "16px 20px", background: "var(--bg-subtle)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                      <span style={{ fontSize: "11.5px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                        Official Slate Candidates ({partyCandidates.length})
                      </span>
                      {partyCandidates.length === 0 && (
                        <button
                          type="button"
                          onClick={() => openAssignModal(party)}
                          style={{
                            fontSize: "11.5px",
                            fontWeight: 600,
                            color: "var(--primary-navy)",
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            padding: 0,
                            textDecoration: "underline",
                          }}
                        >
                          + Assign candidates to this slate
                        </button>
                      )}
                    </div>

                    {partyCandidates.length === 0 ? (
                      <div
                        style={{
                          padding: "20px",
                          textAlign: "center",
                          background: "var(--bg-card)",
                          borderRadius: "6px",
                          border: "1px dashed var(--border-light)",
                        }}
                      >
                        <p style={{ margin: 0, fontSize: "12.5px", color: "var(--text-muted)" }}>
                          No candidates currently affiliated with <strong>{party.name}</strong>.
                        </p>
                      </div>
                    ) : (
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                          gap: "10px",
                        }}
                      >
                        {partyCandidates.map((c) => {
                          const avatar =
                            base64ToImageUrl(c.image_url) ||
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(
                              c.name
                            )}&background=059669&color=ffffff&size=150`;

                          return (
                            <div
                              key={c.id}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: "10px",
                                padding: "10px 12px",
                                background: "var(--bg-card)",
                                borderRadius: "6px",
                                border: "1px solid var(--border-light)",
                              }}
                            >
                              <img
                                src={avatar}
                                alt={c.name}
                                style={{
                                  width: "38px",
                                  height: "38px",
                                  borderRadius: "50%",
                                  objectFit: "cover",
                                  border: `1.5px solid ${partyColor}`,
                                  flexShrink: 0,
                                }}
                                onError={(e) => {
                                  e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                    c.name
                                  )}&background=059669&color=ffffff&size=150`;
                                }}
                              />
                              <div style={{ flex: "1 1 auto", minWidth: 0, overflow: "hidden" }}>
                                <div
                                  style={{
                                    fontSize: "13px",
                                    fontWeight: 700,
                                    color: "var(--text-main)",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                  title={c.name}
                                >
                                  {c.name}
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px", minWidth: 0 }}>
                                  <span
                                    style={{
                                      fontSize: "10.5px",
                                      fontWeight: 600,
                                      color: "var(--primary-navy)",
                                      background: "rgba(37, 99, 235, 0.08)",
                                      padding: "2px 7px",
                                      borderRadius: "4px",
                                      display: "inline-block",
                                      whiteSpace: "nowrap",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      maxWidth: "120px",
                                      flexShrink: 0,
                                    }}
                                    title={c.position}
                                  >
                                    {c.position}
                                  </span>
                                  {c.section && (
                                    <span
                                      style={{
                                        fontSize: "10.5px",
                                        color: "var(--text-muted)",
                                        whiteSpace: "nowrap",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        flex: "0 1 auto",
                                      }}
                                      title={c.section}
                                    >
                                      {c.section}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0, marginLeft: "auto" }}>
                                {onViewCandidate && (
                                  <button
                                    type="button"
                                    onClick={() => onViewCandidate(c.id)}
                                    style={{
                                      background: "var(--bg-subtle)",
                                      border: "1px solid var(--border-light)",
                                      color: "var(--text-muted)",
                                      cursor: "pointer",
                                      fontSize: "11px",
                                      fontWeight: 600,
                                      padding: "3px 8px",
                                      borderRadius: "4px",
                                    }}
                                    title="View profile"
                                  >
                                    View
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveCandidateFromSlate(c.id, c.name, party.name)}
                                  style={{
                                    background: "var(--color-danger-bg)",
                                    border: "1px solid var(--color-danger-border)",
                                    color: "var(--color-danger)",
                                    cursor: "pointer",
                                    fontSize: "11px",
                                    fontWeight: 600,
                                    padding: "3px 8px",
                                    borderRadius: "4px",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "3px",
                                  }}
                                  title={`Remove ${c.name} from ${party.name} slate`}
                                >
                                  <UserMinus size={11} />
                                  <span>Remove</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Independent Candidates Card */}
          <div
            className="card-box"
            style={{
              padding: "0",
              overflow: "hidden",
              border: "1px solid var(--border-light)",
              borderRadius: "var(--radius-md)",
              boxShadow: "var(--shadow-xs)",
            }}
          >
            <div style={{ height: "4px", background: "#64748B" }} />
            <div
              style={{
                padding: "16px 20px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "10px",
                borderBottom: "1px solid var(--border-light)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "8px",
                    background: "rgba(100, 116, 139, 0.1)",
                    border: "1px solid rgba(100, 116, 139, 0.3)",
                    color: "#64748B",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    fontSize: "12px",
                  }}
                >
                  IND
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "var(--text-main)" }}>
                      Independent Candidates
                    </h3>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 600,
                        color: "var(--text-muted)",
                        background: "var(--bg-subtle)",
                        padding: "2px 8px",
                        borderRadius: "4px",
                        border: "1px solid var(--border-light)",
                      }}
                    >
                      {independentCandidates.length} Candidate{independentCandidates.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "var(--text-muted)" }}>
                    Candidates not affiliated with any registered partylist slate.
                  </p>
                </div>
              </div>
            </div>

            {/* Independent Candidates Grid */}
            <div style={{ padding: "16px 20px", background: "var(--bg-subtle)" }}>
              {independentCandidates.length === 0 ? (
                <p style={{ margin: 0, fontSize: "12.5px", color: "var(--text-muted)", textAlign: "center" }}>
                  All candidates are currently affiliated with a registered partylist slate.
                </p>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                    gap: "10px",
                  }}
                >
                  {independentCandidates.map((c) => {
                    const avatar =
                      base64ToImageUrl(c.image_url) ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        c.name
                      )}&background=64748B&color=ffffff&size=150`;

                    return (
                      <div
                        key={c.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "10px",
                          padding: "10px 12px",
                          background: "var(--bg-card)",
                          borderRadius: "6px",
                          border: "1px solid var(--border-light)",
                        }}
                      >
                        <img
                          src={avatar}
                          alt={c.name}
                          style={{
                            width: "38px",
                            height: "38px",
                            borderRadius: "50%",
                            objectFit: "cover",
                            border: "1.5px solid #94A3B8",
                            flexShrink: 0,
                          }}
                        />
                        <div style={{ flex: "1 1 auto", minWidth: 0, overflow: "hidden" }}>
                          <div
                            style={{
                              fontSize: "13px",
                              fontWeight: 700,
                              color: "var(--text-main)",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                            title={c.name}
                          >
                            {c.name}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px", minWidth: 0 }}>
                            <span
                              style={{
                                fontSize: "10.5px",
                                fontWeight: 600,
                                color: "var(--text-muted)",
                                background: "var(--bg-subtle)",
                                padding: "2px 7px",
                                borderRadius: "4px",
                                border: "1px solid var(--border-light)",
                                display: "inline-block",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                maxWidth: "120px",
                                flexShrink: 0,
                              }}
                              title={c.position}
                            >
                              {c.position}
                            </span>
                            <span
                              style={{
                                fontSize: "10px",
                                fontWeight: 600,
                                color: "#64748B",
                                background: "rgba(100, 116, 139, 0.1)",
                                padding: "1px 5px",
                                borderRadius: "3px",
                                whiteSpace: "nowrap",
                                flexShrink: 0,
                              }}
                            >
                              Independent
                            </span>
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0, marginLeft: "auto" }}>
                          {onViewCandidate && (
                            <button
                              type="button"
                              onClick={() => onViewCandidate(c.id)}
                              style={{
                                background: "none",
                                border: "none",
                                color: "var(--text-muted)",
                                cursor: "pointer",
                                fontSize: "11px",
                                padding: "4px",
                              }}
                            >
                              View
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          MODAL: Create / Edit Partylist
          ------------------------------------------------------------- */}
      {isFormModalOpen && typeof document !== "undefined" && createPortal(
        <div
          className="policy-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsFormModalOpen(false);
          }}
        >
          <div
            className="policy-modal-content"
            style={{
              maxWidth: "520px",
              width: "100%",
              padding: "24px",
              maxHeight: "90vh",
              overflowY: "auto",
              background: "#FFFFFF",
              backgroundColor: "#FFFFFF",
            }}
          >
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Flag size={18} style={{ color: "var(--primary-navy)" }} />
                <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "var(--text-main)" }}>
                  {editingParty ? "Edit Partylist Details" : "Create New Partylist"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsFormModalOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  padding: "4px",
                  borderRadius: "4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div
                style={{
                  background: "var(--color-danger-bg)",
                  border: "1px solid var(--color-danger-border)",
                  color: "var(--color-danger)",
                  padding: "10px 14px",
                  borderRadius: "6px",
                  fontSize: "12.5px",
                  marginBottom: "16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <AlertCircle size={15} style={{ flexShrink: 0 }} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSavePartylist}>
              {/* Partylist Name */}
              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-main)", marginBottom: "6px" }}>
                  Partylist Official Name <span style={{ color: "var(--color-danger)" }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., SANDIGAN, TAGUMPAY, ALAB"
                  value={formName}
                  onChange={(e) => {
                    setFormName(e.target.value);
                    if (!formCode && e.target.value.length >= 3) {
                      setFormCode(e.target.value.slice(0, 3).toUpperCase());
                    }
                  }}
                  required
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: "1px solid var(--border-subtle)",
                    background: "var(--bg-subtle)",
                    color: "var(--text-main)",
                    fontSize: "13.5px",
                    boxSizing: "border-box",
                    outline: "none",
                  }}
                />
              </div>

              {/* Acronym / Short Code */}
              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-main)", marginBottom: "6px" }}>
                  Short Code / Acronym (2-5 letters)
                </label>
                <input
                  type="text"
                  placeholder="e.g., SDG, TGP, ALB"
                  maxLength={6}
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: "1px solid var(--border-subtle)",
                    background: "var(--bg-subtle)",
                    color: "var(--text-main)",
                    fontSize: "13.5px",
                    letterSpacing: "0.05em",
                    boxSizing: "border-box",
                    outline: "none",
                  }}
                />
                <span style={{ fontSize: "11px", color: "var(--text-light)", marginTop: "4px", display: "block" }}>
                  Displayed on candidate tags, student ballots, and quick badges.
                </span>
              </div>

              {/* Color Scheme Picker */}
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-main)", marginBottom: "8px" }}>
                  Branding Color & Badge Accent
                </label>

                {/* Preset Palette Swatches */}
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "10px" }}>
                  {PRESET_PARTYLIST_COLORS.map((preset) => {
                    const isSelected = formColor.toLowerCase() === preset.color.toLowerCase();
                    return (
                      <button
                        key={preset.color}
                        type="button"
                        onClick={() => setFormColor(preset.color)}
                        title={preset.label}
                        style={{
                          width: "28px",
                          height: "28px",
                          borderRadius: "50%",
                          background: preset.color,
                          border: isSelected ? "3px solid #ffffff" : "2px solid transparent",
                          outline: isSelected ? `2px solid ${preset.color}` : "none",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                      />
                    );
                  })}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div
                    style={{
                      position: "relative",
                      width: "36px",
                      height: "36px",
                      borderRadius: "8px",
                      overflow: "hidden",
                      border: "1.5px solid var(--border-subtle)",
                      background: formColor,
                      flexShrink: 0,
                      boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                    }}
                  >
                    <input
                      type="color"
                      value={formColor}
                      onChange={(e) => setFormColor(e.target.value)}
                      style={{
                        position: "absolute",
                        top: "-8px",
                        left: "-8px",
                        width: "56px",
                        height: "56px",
                        border: "none",
                        cursor: "pointer",
                        opacity: 0,
                      }}
                    />
                  </div>
                  <input
                    type="text"
                    value={formColor}
                    onChange={(e) => setFormColor(e.target.value)}
                    style={{
                      width: "110px",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "1px solid var(--border-subtle)",
                      background: "var(--bg-subtle)",
                      color: "var(--text-main)",
                      fontSize: "12.5px",
                      fontFamily: "var(--font-mono)",
                      outline: "none",
                    }}
                  />
                  <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 500 }}>Custom HEX</span>
                </div>
              </div>

              {/* Live Badge Preview */}
              <div
                style={{
                  padding: "12px 14px",
                  background: "var(--bg-subtle)",
                  borderRadius: "8px",
                  border: "1px solid var(--border-subtle)",
                  marginBottom: "16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span style={{ fontSize: "11.5px", fontWeight: 600, color: "var(--text-muted)" }}>
                  Live Badge Preview:
                </span>
                <span
                  style={{
                    fontSize: "11.5px",
                    fontWeight: 700,
                    color: formColor,
                    background: `${formColor}18`,
                    border: `1.5px solid ${formColor}40`,
                    padding: "3px 10px",
                    borderRadius: "99px",
                    letterSpacing: "0.03em",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                  }}
                >
                  <Sparkles size={11} />
                  [{formCode || formName.slice(0, 3).toUpperCase() || "PL"}] {formName || "Sample Partylist"}
                </span>
              </div>

              {/* Description / Platform Slogan */}
              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-main)", marginBottom: "6px" }}>
                  Platform Advocacy / Vision Statement
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe this partylist's key advocacies, core values, or slogan..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: "1px solid var(--border-subtle)",
                    background: "var(--bg-subtle)",
                    color: "var(--text-main)",
                    fontSize: "13px",
                    boxSizing: "border-box",
                    resize: "vertical",
                    outline: "none",
                    fontFamily: "inherit",
                  }}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  style={{
                    padding: "9px 18px",
                    background: "var(--bg-subtle)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "8px",
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "var(--text-muted)",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    padding: "9px 22px",
                    background: isSubmitting ? "var(--text-light)" : "var(--primary-navy)",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: isSubmitting ? "not-allowed" : "pointer",
                    boxShadow: "0 2px 8px rgba(16, 185, 129, 0.25)",
                    transition: "all 0.15s ease",
                  }}
                >
                  {isSubmitting ? "Saving..." : editingParty ? "Save Changes" : "Create Partylist"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* -------------------------------------------------------------
          MODAL: Manage Slate / Assign Candidates
          ------------------------------------------------------------- */}
      {isAssignModalOpen && assigningParty && typeof document !== "undefined" && createPortal(
        <div
          className="policy-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsAssignModalOpen(false);
          }}
        >
          <div
            className="policy-modal-content"
            style={{
              maxWidth: "680px",
              width: "100%",
              padding: "24px",
              maxHeight: "85vh",
              overflowY: "auto",
              background: "#FFFFFF",
              backgroundColor: "#FFFFFF",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "16px",
                borderBottom: "1px solid var(--border-light)",
                paddingBottom: "14px",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Layers size={18} style={{ color: assigningParty.color || "var(--primary-navy)" }} />
                  <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "var(--text-main)" }}>
                    Manage Slate: {assigningParty.name}
                  </h3>
                </div>
                <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "var(--text-muted)" }}>
                  Click candidates to assign them to or unassign them from this partylist.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  padding: "4px",
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Candidates grouped by position */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "20px" }}>
              {POSITIONS.map((pos) => {
                const posCandidates = candidates.filter((c) => c.position === pos);
                if (posCandidates.length === 0) return null;

                return (
                  <div key={pos} style={{ background: "var(--bg-subtle)", borderRadius: "8px", padding: "12px 14px", border: "1px solid var(--border-light)" }}>
                    <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--primary-navy)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                      {pos}
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {posCandidates.map((c) => {
                        const isAssigned = c.partylist && c.partylist.toLowerCase() === assigningParty.name.toLowerCase();
                        const isOtherParty = c.partylist && !isAssigned && c.partylist.trim().toLowerCase() !== "independent";

                        return (
                          <div
                            key={c.id}
                            onClick={() => handleToggleCandidateAssignment(c.id, c.partylist, assigningParty.name)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "8px 12px",
                              background: isAssigned ? `${assigningParty.color || "#2563EB"}12` : "var(--bg-card)",
                              borderRadius: "6px",
                              border: isAssigned
                                ? `1.5px solid ${assigningParty.color || "var(--primary-navy)"}`
                                : "1px solid var(--border-light)",
                              cursor: "pointer",
                              transition: "all 0.15s ease",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <input
                                type="checkbox"
                                checked={Boolean(isAssigned)}
                                onChange={() => {}} // handled by parent onClick
                                style={{ cursor: "pointer", accentColor: assigningParty.color || "var(--primary-navy)" }}
                              />
                              <div>
                                <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-main)" }}>
                                  {c.name}
                                </span>
                                {c.section && (
                                  <span style={{ fontSize: "11px", color: "var(--text-muted)", marginLeft: "8px" }}>
                                    ({c.section})
                                  </span>
                                )}
                              </div>
                            </div>

                            <div>
                              {isAssigned ? (
                                <span
                                  style={{
                                    fontSize: "11px",
                                    fontWeight: 700,
                                    color: assigningParty.color || "var(--primary-navy)",
                                    background: `${assigningParty.color || "#2563EB"}20`,
                                    padding: "2px 8px",
                                    borderRadius: "4px",
                                  }}
                                >
                                  In Slate
                                </span>
                              ) : isOtherParty ? (
                                <span
                                  style={{
                                    fontSize: "10.5px",
                                    fontWeight: 500,
                                    color: "var(--text-light)",
                                    background: "var(--bg-subtle)",
                                    padding: "2px 6px",
                                    borderRadius: "4px",
                                  }}
                                >
                                  Currently in: {c.partylist}
                                </span>
                              ) : (
                                <span
                                  style={{
                                    fontSize: "10.5px",
                                    color: "var(--text-light)",
                                  }}
                                >
                                  Independent
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => {
                  setIsAssignModalOpen(false);
                  showToast(`Slate updated for ${assigningParty.name}`);
                }}
                style={{
                  padding: "9px 20px",
                  background: "var(--primary-navy)",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default AdminPartylists;
