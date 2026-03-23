import { useState, useEffect, useRef, useCallback } from "react";
import * as api from "../api";
import { PlusIcon, XIcon, ChevronDown, SearchIcon } from "../components/Icons";
import { useSocket } from "../hooks/useSocket";

export default function CHTDashboardPage({ loggedInUser, t, darkMode, openInquiryId, onInquiryOpened }) {
  const [inquiries, setInquiries] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [responses, setResponses] = useState([]);
  const [loadingResponses, setLoadingResponses] = useState(false);
  const [showStatusUpdate, setShowStatusUpdate] = useState(false);
  const [selectedStatusId, setSelectedStatusId] = useState("");
  const [responseText, setResponseText] = useState("");
  const [submittingResponse, setSubmittingResponse] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [decisionFilter, setDecisionFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const userDropdownRef = useRef(null);
  const [quickEditInquiryId, setQuickEditInquiryId] = useState(null);
  const [quickEditStatusId, setQuickEditStatusId] = useState("");
  const [quickEditResponse, setQuickEditResponse] = useState("");
  const [quickEditSubmitting, setQuickEditSubmitting] = useState(false);
  const [quickEditError, setQuickEditError] = useState("");
  const [statusUpdateError, setStatusUpdateError] = useState("");

  const canSubmitInquiries = loggedInUser?.permissions?.includes("cht_inquiry_submit");
  const canViewAllInquiries = loggedInUser?.permissions?.includes("cht_inquiry_view_all");
  const canAcceptInquiries = loggedInUser?.permissions?.includes("cht_inquiry_accept");
  const canViewOwnInquiries = loggedInUser?.permissions?.includes("cht_inquiry_view");
  const canViewInquiries = canViewOwnInquiries || canViewAllInquiries;
  const canViewMetrics = loggedInUser?.permissions?.includes("cht_view_metrics");

  const chtAccent = "#f59e0b";
  const chtAccentDark = "#d97706";

  const loadInquiries = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getCreditHoldInquiries();
      setInquiries(data.inquiries || []);
    } catch (err) {
      console.error("Failed to load inquiries:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useSocket({
    onChtInquiriesChanged: () => {
      if (canViewInquiries) {
        loadInquiries();
      }
    },
  });

  useEffect(() => {
    if (canViewInquiries) {
      loadInquiries();
      loadStatuses();
      loadUsers();
    }
  }, [canViewInquiries, loadInquiries]);

  useEffect(() => {
    if (openInquiryId && inquiries.length > 0) {
      const inquiry = inquiries.find((i) => i.id === openInquiryId);
      if (inquiry) {
        handleSelectInquiry(inquiry);
        if (onInquiryOpened) onInquiryOpened();
      }
    }
  }, [openInquiryId, inquiries]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target)) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadStatuses = async () => {
    try {
      const data = await api.getCreditHoldStatuses();
      setStatuses(data.statuses || []);
    } catch (err) {
      console.error("Failed to load statuses:", err);
    }
  };

  const loadUsers = async () => {
    try {
      const data = await api.getUsers();
      const uniqueSubmitters = new Map();
      (inquiries || []).forEach((inq) => {
        if (inq.user_id && inq.submitted_by && !uniqueSubmitters.has(inq.user_id)) {
          uniqueSubmitters.set(inq.user_id, { id: inq.user_id, name: inq.submitted_by });
        }
      });
      if (data.users) {
        setUsers(data.users.map((u) => ({ id: u.id, name: u.name || u.display_name || u.email })));
      } else {
        setUsers(Array.from(uniqueSubmitters.values()));
      }
    } catch (err) {
      console.error("Failed to load users:", err);
    }
  };

  const loadResponses = async (inquiryId) => {
    setLoadingResponses(true);
    try {
      const data = await api.getCreditHoldInquiryResponses(inquiryId);
      setResponses(data.responses || []);
    } catch (err) {
      console.error("Failed to load responses:", err);
    } finally {
      setLoadingResponses(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!invoiceNumber.trim()) {
      setError("Invoice number is required");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const data = await api.createCreditHoldInquiry(invoiceNumber.trim(), notes.trim());
      setInquiries((prev) => [data.inquiry, ...prev]);
      setShowModal(false);
      setInvoiceNumber("");
      setNotes("");
    } catch (err) {
      setError(err.message || "Failed to submit inquiry");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAccept = async (inquiryId) => {
    try {
      const data = await api.acceptCreditHoldInquiry(inquiryId);
      setInquiries((prev) =>
        prev.map((inq) => (inq.id === inquiryId ? data.inquiry : inq))
      );
      if (selectedInquiry?.id === inquiryId) {
        setSelectedInquiry(data.inquiry);
      }
    } catch (err) {
      console.error("Failed to accept inquiry:", err);
    }
  };

const handleStatusUpdate = async () => {
    if (!selectedStatusId || !responseText.trim()) return;
    setSubmittingResponse(true);
    setStatusUpdateError("");
    try {
      const data = await api.respondToCreditHoldInquiry(selectedInquiry.id, selectedStatusId, responseText);
      setInquiries((prev) =>
        prev.map((inq) => (inq.id === selectedInquiry.id ? data.inquiry : inq))
      );
      setSelectedInquiry(data.inquiry);
      await loadResponses(selectedInquiry.id);
      setShowStatusUpdate(false);
      setSelectedStatusId("");
      setResponseText("");
    } catch (err) {
      console.error("Failed to update status:", err);
      setStatusUpdateError(err.message || "Failed to update decision. This inquiry may have already been finalized.");
    } finally {
      setSubmittingResponse(false);
    }
  };

  const handleSelectInquiry = (inquiry) => {
    setSelectedInquiry(inquiry);
    setResponses([]);
    setShowStatusUpdate(false);
    setSelectedStatusId("");
    setResponseText("");
    setStatusUpdateError("");
    setQuickEditError("");
    if (canAcceptInquiries || canViewAllInquiries) {
      loadResponses(inquiry.id);
    }
  };

  const handleQuickEditDecision = async () => {
    if (!quickEditInquiryId || !quickEditStatusId || !quickEditResponse.trim()) return;
    setQuickEditSubmitting(true);
    setQuickEditError("");
    try {
      const data = await api.respondToCreditHoldInquiry(quickEditInquiryId, quickEditStatusId, quickEditResponse);
      setInquiries((prev) =>
        prev.map((inq) => (inq.id === quickEditInquiryId ? data.inquiry : inq))
      );
      setQuickEditInquiryId(null);
      setQuickEditStatusId("");
      setQuickEditResponse("");
    } catch (err) {
      console.error("Failed to update decision:", err);
      setQuickEditError(err.message || "Failed to update decision. This inquiry may have already been finalized.");
    } finally {
      setQuickEditSubmitting(false);
    }
  };

  const getFilteredInquiries = () => {
    let filtered = canViewAllInquiries 
      ? [...inquiries] 
      : inquiries.filter(i => i.submitted_by === loggedInUser?.name || i.user_id === loggedInUser?.id);

    // Filter by decision
    if (decisionFilter && decisionFilter !== "all") {
      filtered = filtered.filter((i) => String(i.status_id) === decisionFilter);
    }

    const now = new Date();
    if (dateFilter === "today") {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      filtered = filtered.filter((i) => new Date(i.created_at) >= today);
    } else if (dateFilter === "month") {
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      filtered = filtered.filter((i) => new Date(i.created_at) >= firstOfMonth);
    } else if (dateFilter === "year") {
      const firstOfYear = new Date(now.getFullYear(), 0, 1);
      filtered = filtered.filter((i) => new Date(i.created_at) >= firstOfYear);
    }

    if (userFilter) {
      filtered = filtered.filter((i) => i.user_id === userFilter);
    }

    return filtered;
  };

  const filteredInquiries = getFilteredInquiries();

  const getStatusColor = (statusColor) => {
    return statusColor || (darkMode ? "#6b7280" : "#9ca3af");
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatDateTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatTimeToClose = (createdAt, decisionAt) => {
    if (!decisionAt) return null;
    const start = new Date(createdAt);
    const end = new Date(decisionAt);
    const diffMs = end - start;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    const diffMinutes = Math.floor((diffMs / (1000 * 60)) % 60);
    
    if (diffDays > 0) {
      const remainingHours = diffHours % 24;
      if (remainingHours > 0) {
        return `${diffDays}d ${remainingHours}h`;
      }
      return `${diffDays}d`;
    }
    if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}m`;
    }
    if (diffMinutes > 0) {
      return `${diffMinutes}m`;
    }
    return "<1m";
  };

  const getStatusBadge = (statusName, statusColor) => (
    <span style={{
      fontSize: 11,
      fontWeight: 600,
      padding: "3px 8px",
      borderRadius: 6,
      background: getStatusColor(statusColor) + "20",
      color: getStatusColor(statusColor),
      whiteSpace: "nowrap",
    }}>
      {statusName || "Pending"}
    </span>
  );

  const filteredUsers = users.filter((u) => 
    u.name?.toLowerCase().includes(userSearch.toLowerCase())
  );

  const getSelectedUserName = () => {
    if (!userFilter) return "All Users";
    const user = users.find((u) => u.id === userFilter);
    return user?.name || "All Users";
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <style>{`
        .inquiry-row { transition: background 0.1s ease; cursor: pointer; }
        .inquiry-row:hover { background: ${darkMode ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)"}; }
      `}</style>

      <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0, color: t.text }}>
              Credit Hold Inquiry
            </h2>
            {canSubmitInquiries && (
              <button
                onClick={() => setShowModal(true)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 14px",
                  background: `linear-gradient(135deg,${chtAccent},${chtAccentDark})`,
                  border: "none",
                  borderRadius: 8,
                  color: "white",
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                <PlusIcon size={14} /> New Inquiry
              </button>
            )}
          </div>

          {/* Filters */}
          <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
            {/* Decision Filter */}
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Decision
              </label>
              <select
                value={decisionFilter}
                onChange={(e) => setDecisionFilter(e.target.value)}
                style={{
                  padding: "8px 12px",
                  border: `1px solid ${t.border}`,
                  borderRadius: 6,
                  fontSize: 13,
                  background: darkMode ? "rgba(255,255,255,0.05)" : "#fff",
                  color: t.text,
                  outline: "none",
                  fontFamily: "inherit",
                  minWidth: 140,
                }}
              >
                <option value="all">All Decisions</option>
                {statuses.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* Date Filter */}
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Date
              </label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                style={{
                  padding: "8px 12px",
                  border: `1px solid ${t.border}`,
                  borderRadius: 6,
                  fontSize: 13,
                  background: darkMode ? "rgba(255,255,255,0.05)" : "#fff",
                  color: t.text,
                  outline: "none",
                  fontFamily: "inherit",
                  minWidth: 120,
                }}
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="month">This Month</option>
                <option value="year">This Year</option>
              </select>
            </div>

            {/* User Filter - only for users who can view all */}
            {canViewAllInquiries && (
              <div style={{ display: "flex", flexDirection: "column", gap: 4, position: "relative" }} ref={userDropdownRef}>
                <label style={{ fontSize: 11, fontWeight: 600, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Submitted By
                </label>
                <div
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  style={{
                    padding: "8px 12px",
                    border: `1px solid ${t.border}`,
                    borderRadius: 6,
                    fontSize: 13,
                    background: darkMode ? "rgba(255,255,255,0.05)" : "#fff",
                    color: t.text,
                    fontFamily: "inherit",
                    minWidth: 180,
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {getSelectedUserName()}
                  </span>
                  <ChevronDown />
                </div>
                {showUserDropdown && (
                  <div style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    marginTop: 4,
                    background: t.surface,
                    border: `1px solid ${t.border}`,
                    borderRadius: 8,
                    boxShadow: darkMode ? "0 8px 24px rgba(0,0,0,0.4)" : "0 8px 24px rgba(0,0,0,0.15)",
                    zIndex: 100,
                    maxHeight: 280,
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                  }}>
                    <div style={{ padding: 8, borderBottom: `1px solid ${t.border}` }}>
                      <div style={{ position: "relative" }}>
                        <input
                          type="text"
                          placeholder="Search users..."
                          value={userSearch}
                          onChange={(e) => setUserSearch(e.target.value)}
                          style={{
                            width: "100%",
                            padding: "6px 8px 6px 28px",
                            border: `1px solid ${t.border}`,
                            borderRadius: 6,
                            fontSize: 12,
                            background: darkMode ? "rgba(255,255,255,0.05)" : "#fff",
                            color: t.text,
                            outline: "none",
                            fontFamily: "inherit",
                          }}
                        />
                        <div style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: t.textMuted }}>
                          <SearchIcon size={14} />
                        </div>
                      </div>
                    </div>
                    <div style={{ overflow: "auto", flex: 1 }}>
                      <div
                        onClick={() => { setUserFilter(""); setShowUserDropdown(false); setUserSearch(""); }}
                        style={{
                          padding: "8px 12px",
                          cursor: "pointer",
                          fontSize: 13,
                          background: !userFilter ? t.accentSoft : "transparent",
                          color: !userFilter ? chtAccent : t.text,
                          fontWeight: !userFilter ? 600 : 400,
                        }}
                      >
                        All Users
                      </div>
                      {filteredUsers.map((user) => (
                        <div
                          key={user.id}
                          onClick={() => { setUserFilter(user.id); setShowUserDropdown(false); setUserSearch(""); }}
                          style={{
                            padding: "8px 12px",
                            cursor: "pointer",
                            fontSize: 13,
                            background: userFilter === user.id ? t.accentSoft : "transparent",
                            color: userFilter === user.id ? chtAccent : t.text,
                            fontWeight: userFilter === user.id ? 600 : 400,
                          }}
                        >
                          {user.name}
                        </div>
                      ))}
                      {filteredUsers.length === 0 && (
                        <div style={{ padding: 12, color: t.textMuted, fontSize: 12, textAlign: "center" }}>
                          No users found
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Clear Filters */}
            {(decisionFilter !== "all" || dateFilter !== "all" || userFilter) && (
              <div style={{ display: "flex", alignItems: "flex-end" }}>
                <button
                  onClick={() => { setDecisionFilter("all"); setDateFilter("all"); setUserFilter(""); }}
                  style={{
                    padding: "8px 12px",
                    border: `1px solid ${t.border}`,
                    borderRadius: 6,
                    fontSize: 12,
                    background: "transparent",
                    color: t.textMuted,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    whiteSpace: "nowrap",
                  }}
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: 60, color: t.textMuted }}>
              Loading...
            </div>
          ) : filteredInquiries.length === 0 ? (
            <div style={{
              textAlign: "center",
              padding: 80,
              color: t.textMuted,
              background: darkMode ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)",
              borderRadius: 12,
            }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
              <p style={{ margin: 0, fontSize: 15 }}>No inquiries found</p>
            </div>
          ) : (
            <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, overflow: "hidden" }}>
              <div style={{
                display: "grid",
                gridTemplateColumns: canViewMetrics ? "1fr 120px 120px 120px 80px 100px" : "1fr 120px 120px 120px 100px",
                gap: 12,
                padding: "12px 16px",
                borderBottom: `1px solid ${t.border}`,
                fontSize: 11,
                fontWeight: 600,
                color: t.textDim,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                background: darkMode ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)",
              }}>
                <div>Invoice Number</div>
                <div>Decision</div>
                <div>Submitted By</div>
                <div>Submitted</div>
                {canViewMetrics && <div>Time to Close</div>}
                <div style={{ textAlign: "right" }}>Assigned To</div>
              </div>
              {filteredInquiries.map((inquiry, idx) => {
                const isLocked = inquiry.decision_at !== null;
                return (
                  <div
                    key={inquiry.id}
                    className="inquiry-row"
                    onClick={() => handleSelectInquiry(inquiry)}
                    style={{
                      display: "grid",
                      gridTemplateColumns: canViewMetrics ? "1fr 120px 120px 120px 80px 100px" : "1fr 120px 120px 120px 100px",
                      gap: 12,
                      padding: "14px 16px",
                      borderBottom: idx < filteredInquiries.length - 1 ? `1px solid ${t.border}` : "none",
                      alignItems: "center",
                    }}
                  >
                    <div style={{ fontWeight: 600, color: t.text }}>
                      {inquiry.invoice_number}
                    </div>
                    <div onClick={(e) => e.stopPropagation()}>
                      {canAcceptInquiries && !isLocked ? (
                        <div style={{ position: "relative" }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setQuickEditInquiryId(quickEditInquiryId === inquiry.id ? null : inquiry.id);
                              setQuickEditStatusId(String(inquiry.status_id || ""));
                              setQuickEditResponse("");
                            }}
                            style={{
                              background: "transparent",
                              border: "none",
                              cursor: "pointer",
                              padding: 0,
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            {getStatusBadge(inquiry.status_name, inquiry.status_color)}
                            <ChevronDown size={12} style={{ color: t.textMuted }} />
                          </button>
                          {quickEditInquiryId === inquiry.id && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                position: "absolute",
                                top: "100%",
                                left: 0,
                                marginTop: 4,
                                background: t.surface,
                                border: `1px solid ${t.border}`,
                                borderRadius: 8,
                                boxShadow: darkMode ? "0 8px 24px rgba(0,0,0,0.4)" : "0 8px 24px rgba(0,0,0,0.15)",
                                zIndex: 200,
                                minWidth: 200,
                                padding: 8,
                              }}
                            >
                              <div style={{ fontSize: 11, fontWeight: 600, color: t.textMuted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                Change Decision
                              </div>
                              <select
                                value={quickEditStatusId}
                                onChange={(e) => setQuickEditStatusId(e.target.value)}
                                style={{
                                  width: "100%",
                                  padding: "6px 8px",
                                  border: `1px solid ${t.border}`,
                                  borderRadius: 6,
                                  fontSize: 12,
                                  background: darkMode ? "rgba(255,255,255,0.05)" : "#fff",
                                  color: t.text,
                                  outline: "none",
                                  fontFamily: "inherit",
                                  marginBottom: 8,
                                }}
                              >
                                {statuses.map((s) => (
                                  <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                              </select>
                              <textarea
                                placeholder="Add response (required)..."
                                value={quickEditResponse}
                                onChange={(e) => setQuickEditResponse(e.target.value)}
                                rows={2}
                                style={{
                                  width: "100%",
                                  padding: "6px 8px",
                                  border: `1px solid ${t.border}`,
                                  borderRadius: 6,
                                  fontSize: 12,
                                  background: darkMode ? "rgba(255,255,255,0.05)" : "#fff",
                                  color: t.text,
                                  outline: "none",
                                  fontFamily: "inherit",
                                  resize: "vertical",
                                  marginBottom: 8,
                                  boxSizing: "border-box",
                                }}
                              />
                              {quickEditError && (
                                <div style={{ fontSize: 11, color: t.error, marginBottom: 8 }}>
                                  {quickEditError}
                                </div>
                              )}
                              <div style={{ display: "flex", gap: 6 }}>
                                <button
                                  onClick={() => { setQuickEditInquiryId(null); setQuickEditStatusId(""); setQuickEditResponse(""); }}
                                  style={{
                                    flex: 1,
                                    padding: "6px 10px",
                                    background: "transparent",
                                    border: `1px solid ${t.border}`,
                                    borderRadius: 6,
                                    color: t.textMuted,
                                    fontSize: 12,
                                    cursor: "pointer",
                                    fontFamily: "inherit",
                                  }}
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={handleQuickEditDecision}
                                  disabled={!quickEditStatusId || !quickEditResponse.trim() || quickEditSubmitting}
                                  style={{
                                    flex: 1,
                                    padding: "6px 10px",
                                    background: `linear-gradient(135deg,${chtAccent},${chtAccentDark})`,
                                    border: "none",
                                    borderRadius: 6,
                                    color: "white",
                                    fontSize: 12,
                                    fontWeight: 600,
                                    cursor: quickEditSubmitting || !quickEditStatusId || !quickEditResponse.trim() ? "not-allowed" : "pointer",
                                    fontFamily: "inherit",
                                    opacity: !quickEditStatusId || !quickEditResponse.trim() ? 0.5 : 1,
                                  }}
                                >
                                  {quickEditSubmitting ? "Saving..." : "Save"}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          {getStatusBadge(inquiry.status_name, inquiry.status_color)}
                          {isLocked && (
                            <span style={{ fontSize: 10, color: t.textDim, marginLeft: 2 }}>🔒</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: 13, color: t.textMuted }}>
                      {inquiry.submitted_by}
                    </div>
                    <div style={{ fontSize: 12, color: t.textMuted }}>
                      {formatDate(inquiry.created_at)}
                    </div>
                    {canViewMetrics && (
                      <div style={{ fontSize: 12, color: t.textMuted }}>
                        {formatTimeToClose(inquiry.created_at, inquiry.decision_at) || "—"}
                      </div>
                    )}
                    <div style={{ fontSize: 12, color: inquiry.assigned_to_name ? t.text : t.textMuted, textAlign: "right" }}>
                      {inquiry.assigned_to_name || "—"}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ marginTop: 12, fontSize: 12, color: t.textMuted }}>
            Showing {filteredInquiries.length} of {inquiries.length} inquiries
          </div>
        </div>
      </div>

      {showModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => !submitting && setShowModal(false)}
        >
          <div
            style={{
              background: t.surface,
              borderRadius: 12,
              width: "100%",
              maxWidth: 440,
              boxShadow: darkMode ? "0 20px 50px rgba(0,0,0,0.5)" : "0 20px 50px rgba(0,0,0,0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <form onSubmit={handleSubmit}>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "16px 20px",
                borderBottom: `1px solid ${t.border}`,
              }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: t.text }}>
                  New Credit Hold Inquiry
                </h3>
                <button
                  type="button"
                  onClick={() => !submitting && setShowModal(false)}
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: submitting ? "not-allowed" : "pointer",
                    color: t.textMuted,
                    padding: 4,
                    opacity: submitting ? 0.5 : 1,
                  }}
                  disabled={submitting}
                >
                  <XIcon size={18} />
                </button>
              </div>

              <div style={{ padding: 20 }}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{
                    display: "block",
                    fontSize: 12,
                    fontWeight: 600,
                    color: t.textMuted,
                    marginBottom: 6,
                  }}>
                    Invoice Number *
                  </label>
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder="Enter invoice number"
                    autoFocus
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      border: `1px solid ${error && !invoiceNumber.trim() ? t.error : t.border}`,
                      borderRadius: 8,
                      fontSize: 14,
                      background: darkMode ? "rgba(255,255,255,0.05)" : "#fff",
                      color: t.text,
                      outline: "none",
                      fontFamily: "inherit",
                      boxSizing: "border-box",
                    }}
                    disabled={submitting}
                  />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{
                    display: "block",
                    fontSize: 12,
                    fontWeight: 600,
                    color: t.textMuted,
                    marginBottom: 6,
                  }}>
                    Notes
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Additional details (optional)"
                    rows={4}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      border: `1px solid ${t.border}`,
                      borderRadius: 8,
                      fontSize: 14,
                      background: darkMode ? "rgba(255,255,255,0.05)" : "#fff",
                      color: t.text,
                      outline: "none",
                      fontFamily: "inherit",
                      resize: "vertical",
                      boxSizing: "border-box",
                    }}
                    disabled={submitting}
                  />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{
                    display: "block",
                    fontSize: 12,
                    fontWeight: 600,
                    color: t.textMuted,
                    marginBottom: 6,
                  }}>
                    Submitted By
                  </label>
                  <div style={{
                    padding: "10px 12px",
                    background: darkMode ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                    borderRadius: 8,
                    fontSize: 14,
                    color: t.text,
                  }}>
                    {loggedInUser?.name || "Unknown User"}
                  </div>
                </div>

                {error && (
                  <div style={{
                    padding: "10px 12px",
                    background: darkMode ? "rgba(239,68,68,0.1)" : "rgba(239,68,68,0.1)",
                    border: `1px solid ${t.error}`,
                    borderRadius: 8,
                    color: t.error,
                    fontSize: 13,
                    marginBottom: 16,
                  }}>
                    {error}
                  </div>
                )}
              </div>

              <div style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                padding: "16px 20px",
                borderTop: `1px solid ${t.border}`,
              }}>
                <button
                  type="button"
                  onClick={() => !submitting && setShowModal(false)}
                  style={{
                    padding: "8px 16px",
                    background: "transparent",
                    border: `1px solid ${t.border}`,
                    borderRadius: 8,
                    color: t.textMuted,
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: submitting ? "not-allowed" : "pointer",
                    fontFamily: "inherit",
                    opacity: submitting ? 0.5 : 1,
                  }}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: "8px 16px",
                    background: `linear-gradient(135deg,${chtAccent},${chtAccentDark})`,
                    border: "none",
                    borderRadius: 8,
                    color: "white",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: submitting ? "not-allowed" : "pointer",
                    fontFamily: "inherit",
                    opacity: submitting ? 0.7 : 1,
                  }}
                  disabled={submitting}
                >
                  {submitting ? "Submitting..." : "Submit Inquiry"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedInquiry && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setSelectedInquiry(null)}
        >
          <div
            style={{
              background: t.surface,
              borderRadius: 12,
              width: "100%",
              maxWidth: 560,
              maxHeight: "90vh",
              overflow: "auto",
              boxShadow: darkMode ? "0 20px 50px rgba(0,0,0,0.5)" : "0 20px 50px rgba(0,0,0,0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              padding: 20,
              borderBottom: `1px solid ${t.border}`,
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: t.text }}>
                  {selectedInquiry.invoice_number}
                </h3>
                <div style={{ marginTop: 8 }}>
                  {getStatusBadge(selectedInquiry.status_name, selectedInquiry.status_color)}
                </div>
              </div>
              <button
                onClick={() => setSelectedInquiry(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: t.textMuted,
                  padding: 4,
                }}
              >
                <XIcon size={20} />
              </button>
            </div>

            <div style={{ padding: 20 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
                    Submitted By
                  </div>
                  <div style={{ fontSize: 14, color: t.text }}>
                    {selectedInquiry.submitted_by}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
                    Submitted On
                  </div>
                  <div style={{ fontSize: 14, color: t.text }}>
                    {formatDateTime(selectedInquiry.created_at)}
                  </div>
                </div>
              </div>

              {selectedInquiry.assigned_to_name && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
                    Assigned To
                  </div>
                  <div style={{ fontSize: 14, color: t.text }}>
                    {selectedInquiry.assigned_to_name}
                  </div>
                </div>
              )}

              {selectedInquiry.notes && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
                    Notes
                  </div>
                  <div style={{
                    fontSize: 14,
                    color: t.text,
                    padding: 12,
                    background: darkMode ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                    borderRadius: 8,
                    whiteSpace: "pre-wrap",
                  }}>
                    {selectedInquiry.notes}
                  </div>
                </div>
              )}

              {canAcceptInquiries && showStatusUpdate && (
                <div style={{ marginBottom: 16, padding: 16, background: darkMode ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)", borderRadius: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: t.text, marginBottom: 12 }}>
                    Update Decision
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: t.textMuted, marginBottom: 4, display: "block" }}>
                      New Decision *
                    </label>
                    <select
                      value={selectedStatusId}
                      onChange={(e) => setSelectedStatusId(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        border: `1px solid ${t.border}`,
                        borderRadius: 6,
                        fontSize: 13,
                        background: darkMode ? "rgba(255,255,255,0.05)" : "#fff",
                        color: t.text,
                        outline: "none",
                        fontFamily: "inherit",
                      }}
                    >
                      <option value="">Select decision...</option>
                      {statuses.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: t.textMuted, marginBottom: 4, display: "block" }}>
                      Response *
                    </label>
                    <textarea
                      value={responseText}
                      onChange={(e) => setResponseText(e.target.value)}
                      placeholder="Enter your response..."
                      rows={3}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        border: `1px solid ${t.border}`,
                        borderRadius: 6,
                        fontSize: 13,
                        background: darkMode ? "rgba(255,255,255,0.05)" : "#fff",
                        color: t.text,
                        outline: "none",
                        fontFamily: "inherit",
                        resize: "vertical",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                  {statusUpdateError && (
                    <div style={{ marginBottom: 12, padding: "8px 12px", background: darkMode ? "rgba(239,68,68,0.1)" : "rgba(239,68,68,0.1)", border: `1px solid ${t.error}`, borderRadius: 6, color: t.error, fontSize: 12 }}>
                      {statusUpdateError}
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={handleStatusUpdate}
                      disabled={!selectedStatusId || !responseText.trim() || submittingResponse}
                      style={{
                        padding: "8px 16px",
                        background: `linear-gradient(135deg,${chtAccent},${chtAccentDark})`,
                        border: "none",
                        borderRadius: 6,
                        color: "white",
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: submittingResponse ? "not-allowed" : "pointer",
                        fontFamily: "inherit",
                        opacity: !selectedStatusId || !responseText.trim() ? 0.5 : 1,
                      }}
                    >
                      {submittingResponse ? "Updating..." : "Update Decision"}
                    </button>
                    <button
                      onClick={() => { setShowStatusUpdate(false); setSelectedStatusId(""); setResponseText(""); }}
                      style={{
                        padding: "8px 16px",
                        background: "transparent",
                        border: `1px solid ${t.border}`,
                        borderRadius: 6,
                        color: t.textMuted,
                        fontSize: 13,
                        fontWeight: 500,
                        cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {responses.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
                    Response History
                  </div>
                  {loadingResponses ? (
                    <div style={{ color: t.textMuted, fontSize: 13 }}>Loading...</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {responses.map((r) => (
                        <div key={r.id} style={{ padding: 12, background: darkMode ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)", borderRadius: 8 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: t.text }}>{r.user_name}</span>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              {r.status_name && getStatusBadge(r.status_name, r.status_color)}
                              <span style={{ fontSize: 11, color: t.textMuted }}>{formatDateTime(r.created_at)}</span>
                            </div>
                          </div>
                          <div style={{ fontSize: 13, color: t.text, whiteSpace: "pre-wrap" }}>{r.response}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {canAcceptInquiries && !selectedInquiry.assigned_to && !showStatusUpdate && !selectedInquiry.decision_at && (
                <button
                  onClick={() => handleAccept(selectedInquiry.id)}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    background: `linear-gradient(135deg,${chtAccent},${chtAccentDark})`,
                    border: "none",
                    borderRadius: 8,
                    color: "white",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    marginTop: 8,
                  }}
                >
                  Accept & Assign to Me
                </button>
              )}

              {canAcceptInquiries && selectedInquiry.assigned_to && !showStatusUpdate && !selectedInquiry.decision_at && (
                <button
                  onClick={() => setShowStatusUpdate(true)}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    background: "transparent",
                    border: `1px solid ${chtAccent}`,
                    borderRadius: 8,
                    color: chtAccent,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    marginTop: 8,
                  }}
                >
                  Update Decision
                </button>
              )}

              {selectedInquiry.decision_at && (
                <div style={{ marginTop: 16, padding: 12, background: darkMode ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)", borderRadius: 8, textAlign: "center" }}>
                  <div style={{ fontSize: 12, color: t.textMuted }}>
                    This inquiry has been finalized and cannot be modified.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}