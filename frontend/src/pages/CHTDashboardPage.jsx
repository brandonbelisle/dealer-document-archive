import { useState, useEffect } from "react";
import * as api from "../api";
import { PlusIcon, XIcon } from "../components/Icons";

export default function CHTDashboardPage({ loggedInUser, t, darkMode, activeTab = "dashboard" }) {
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const canSubmitInquiries = loggedInUser?.permissions?.includes("cht_inquiry_submit");
  const canViewAllInquiries = loggedInUser?.permissions?.includes("cht_inquiry_view_all");
  const canAcceptInquiries = loggedInUser?.permissions?.includes("cht_inquiry_accept");
  const canViewOwnInquiries = loggedInUser?.permissions?.includes("cht_inquiry_view");
  const canViewInquiries = canViewOwnInquiries || canViewAllInquiries;

  const chtAccent = "#f59e0b";
  const chtAccentDark = "#d97706";

  useEffect(() => {
    if ((activeTab === "inquiries" || activeTab === "dashboard") && canViewInquiries) {
      loadInquiries();
    }
  }, [activeTab, canViewInquiries]);

  const loadInquiries = async () => {
    setLoading(true);
    try {
      const data = await api.getCreditHoldInquiries();
      setInquiries(data.inquiries || []);
    } catch (err) {
      console.error("Failed to load inquiries:", err);
    } finally {
      setLoading(false);
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

  const nonClosedInquiries = inquiries.filter(i => i.status_name?.toLowerCase() !== "closed");

  const myInquiries = canViewAllInquiries 
    ? inquiries 
    : inquiries.filter(i => i.submitted_by === loggedInUser?.name || i.user_id === loggedInUser?.id);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <style>{`
        .inquiry-row { transition: background 0.1s ease; cursor: pointer; }
        .inquiry-row:hover { background: ${darkMode ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)"}; }
      `}</style>

      <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
        {activeTab === "dashboard" && (
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0, color: t.text }}>
                Credit Hold Dashboard
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

            {loading ? (
              <div style={{ textAlign: "center", padding: 60, color: t.textMuted }}>
                Loading...
              </div>
            ) : nonClosedInquiries.length === 0 ? (
              <div style={{
                textAlign: "center",
                padding: 80,
                color: t.textMuted,
                background: darkMode ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)",
                borderRadius: 12,
              }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
                <p style={{ margin: 0, fontSize: 15 }}>No open credit hold inquiries</p>
              </div>
            ) : (
              <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, overflow: "hidden" }}>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 100px 130px 130px 100px",
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
                  <div>Status</div>
                  <div>Submitted By</div>
                  <div>Submitted</div>
                  <div style={{ textAlign: "right" }}>Assigned To</div>
                </div>
                {nonClosedInquiries.map((inquiry, idx) => (
                  <div
                    key={inquiry.id}
                    className="inquiry-row"
                    onClick={() => setSelectedInquiry(inquiry)}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 100px 130px 130px 100px",
                      gap: 12,
                      padding: "14px 16px",
                      borderBottom: idx < nonClosedInquiries.length - 1 ? `1px solid ${t.border}` : "none",
                      alignItems: "center",
                    }}
                  >
                    <div style={{ fontWeight: 600, color: t.text }}>
                      {inquiry.invoice_number}
                    </div>
                    <div>
                      {getStatusBadge(inquiry.status_name, inquiry.status_color)}
                    </div>
                    <div style={{ fontSize: 13, color: t.textMuted }}>
                      {inquiry.submitted_by}
                    </div>
                    <div style={{ fontSize: 12, color: t.textMuted }}>
                      {formatDate(inquiry.created_at)}
                    </div>
                    <div style={{ fontSize: 12, color: inquiry.assigned_to_name ? t.text : t.textMuted, textAlign: "right" }}>
                      {inquiry.assigned_to_name || "—"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "inquiries" && (
          <div style={{ maxWidth: 900, margin: "0 auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: t.text }}>
                My Credit Hold Inquiries
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

            {loading ? (
              <div style={{ textAlign: "center", padding: 40, color: t.textMuted }}>
                Loading...
              </div>
            ) : myInquiries.length === 0 ? (
              <div style={{
                textAlign: "center",
                padding: 60,
                color: t.textMuted,
                background: darkMode ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)",
                borderRadius: 12,
              }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
                <p style={{ margin: 0, fontSize: 14 }}>No inquiries submitted yet</p>
              </div>
            ) : (
              <div style={{
                background: t.surface,
                border: `1px solid ${t.border}`,
                borderRadius: 12,
                overflow: "hidden",
              }}>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 100px 140px",
                  gap: 12,
                  padding: "12px 16px",
                  borderBottom: `1px solid ${t.border}`,
                  fontSize: 11,
                  fontWeight: 600,
                  color: t.textDim,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}>
                  <div>Invoice Number</div>
                  <div>Status</div>
                  <div style={{ textAlign: "right" }}>Submitted</div>
                </div>
                {myInquiries.map((inquiry, idx) => (
                  <div
                    key={inquiry.id}
                    className="inquiry-row"
                    onClick={() => setSelectedInquiry(inquiry)}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 100px 140px",
                      gap: 12,
                      padding: "14px 16px",
                      borderBottom: idx < myInquiries.length - 1 ? `1px solid ${t.border}` : "none",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, color: t.text, marginBottom: 4 }}>
                        {inquiry.invoice_number}
                      </div>
                      {inquiry.notes && (
                        <div style={{ fontSize: 12, color: t.textMuted }}>
                          {inquiry.notes.length > 50 ? inquiry.notes.slice(0, 50) + "..." : inquiry.notes}
                        </div>
                      )}
                    </div>
                    <div>
                      {getStatusBadge(inquiry.status_name, inquiry.status_color)}
                    </div>
                    <div style={{ fontSize: 12, color: t.textMuted, textAlign: "right" }}>
                      {formatDate(inquiry.created_at)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
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
              maxWidth: 500,
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

              {canAcceptInquiries && !selectedInquiry.assigned_to && (
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}