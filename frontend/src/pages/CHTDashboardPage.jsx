import { useState, useEffect } from "react";
import * as api from "../api";
import { PlusIcon, XIcon, InboxIcon } from "../components/Icons";

export default function CHTDashboardPage({ loggedInUser, t, darkMode, activeTab = "dashboard" }) {
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const canSubmitInquiries = loggedInUser?.permissions?.includes("cht_inquiry_submit");
  const canViewInquiries = loggedInUser?.permissions?.includes("cht_inquiry_view");

  const chtAccent = "#f59e0b";
  const chtAccentDark = "#d97706";

  useEffect(() => {
    if (activeTab === "inquiries" && canViewInquiries) {
      loadInquiries();
    }
  }, [activeTab, canViewInquiries]);

  useEffect(() => {
    if (activeTab === "inquiries" && canViewInquiries) {
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

  const getStatusColor = (status) => {
    switch (status) {
      case "pending": return darkMode ? "#f59e0b" : "#d97706";
      case "in_review": return darkMode ? "#3b82f6" : "#2563eb";
      case "resolved": return darkMode ? "#22c55e" : "#16a34a";
      case "closed": return darkMode ? "#6b7280" : "#9ca3af";
      default: return darkMode ? "#6b7280" : "#9ca3af";
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "pending": return "Pending";
      case "in_review": return "In Review";
      case "resolved": return "Resolved";
      case "closed": return "Closed";
      default: return status;
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <style>{`
        .inquiry-row { transition: background 0.1s ease; }
        .inquiry-row:hover { background: ${darkMode ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)"}; }
      `}</style>

      <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
        {activeTab === "dashboard" && (
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 400,
          }}>
            <div style={{
              width: 80,
              height: 80,
              borderRadius: 20,
              background: `linear-gradient(135deg,${chtAccent},${chtAccentDark})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: 24,
              fontWeight: 800,
              marginBottom: 24,
            }}>
              CHT
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 700, margin: "0 0 12px", color: t.text }}>
              Credit Hold Tracker
            </h1>
            <p style={{ fontSize: 15, color: t.textMuted, margin: 0, textAlign: "center", maxWidth: 400 }}>
              Manage and track credit holds across your organization
            </p>
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
            ) : inquiries.length === 0 ? (
              <div style={{
                textAlign: "center",
                padding: 60,
                color: t.textMuted,
                background: darkMode ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)",
                borderRadius: 12,
              }}>
                <InboxIcon size={40} />
                <p style={{ margin: "12px 0 0", fontSize: 14 }}>No inquiries submitted yet</p>
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
                  gridTemplateColumns: "1fr 120px 140px",
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
                {inquiries.map((inquiry) => (
                  <div
                    key={inquiry.id}
                    className="inquiry-row"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 120px 140px",
                      gap: 12,
                      padding: "14px 16px",
                      borderBottom: `1px solid ${t.border}`,
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
                      <span style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: "3px 8px",
                        borderRadius: 6,
                        background: getStatusColor(inquiry.status) + "20",
                        color: getStatusColor(inquiry.status),
                      }}>
                        {getStatusLabel(inquiry.status)}
                      </span>
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
    </div>
  );
}