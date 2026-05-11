import { useState, useEffect, useCallback, useRef } from "react";
import * as api from "../api";
import { useSocket } from "../hooks/useSocket";
import { UploadCloudIcon, TrashIcon, SearchIcon, FileDocIcon, AlertTriangleIcon, CheckIcon, ClockIcon, EyeIcon, XIcon } from "../components/Icons";

export default function APDashboardPage({ loggedInUser, t, darkMode, addToast }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all"); // all, invoices, review
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [detailDoc, setDetailDoc] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [duplicateDoc, setDuplicateDoc] = useState(null);
  const [vendorFilter, setVendorFilter] = useState(null);
  const [statusHistory, setStatusHistory] = useState([]);
  const [excedeStatus, setExcedeStatus] = useState(null);
  const [checkingExcede, setCheckingExcede] = useState(false);
  const fileInputRef = useRef(null);

  const apAccent = "#22c55e";
  const apAccentDark = "#16a34a";

  const canUpload = loggedInUser?.permissions?.includes("ap_upload");
  const canReview = loggedInUser?.permissions?.includes("ap_review");

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getAPDocuments();
      setDocuments(data.documents || []);
    } catch (err) {
      console.error("Failed to load AP documents:", err);
      addToast?.("Error", "Failed to load documents", 5000, "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useSocket({
    onApDocumentsChanged: () => {
      loadDocuments();
    },
  });

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // Auto-poll for processing documents
  useEffect(() => {
    const hasProcessing = documents.some(d => d.status === 'processing' || d.status === 'uploaded');
    if (!hasProcessing) return;

    const interval = setInterval(() => {
      loadDocuments();
    }, 3000);

    return () => clearInterval(interval);
  }, [documents, loadDocuments]);

  const handleDrop = async (e) => {
    e.preventDefault();
    setDragOver(false);
    if (!canUpload) return;

    const files = Array.from(e.dataTransfer.files).filter(f => {
      const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      return allowed.includes(f.type);
    });

    if (files.length === 0) {
      addToast?.("Invalid files", "Only PDF and image files are allowed", 5000, "warning");
      return;
    }

    for (const file of files) {
      await uploadFile(file);
    }
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    for (const file of files) {
      await uploadFile(file);
    }
    e.target.value = "";
  };

  const uploadFile = async (file) => {
    setUploading(true);
    try {
      const result = await api.uploadAPDocument(file);
      addToast?.("Uploaded", `${file.name} is being processed`, 5000, "upload");
      setDocuments(prev => [{
        id: result.documentId,
        fileId: result.fileId,
        status: 'processing',
        documentType: 'unknown',
        vendorName: null,
        invoiceNumber: null,
        invoiceDate: null,
        invoiceAmount: null,
        poNumber: null,
        file: {
          name: file.name,
          originalName: file.name,
          mimeType: file.type,
          size: file.size,
          pages: 0,
        },
        uploadedBy: loggedInUser?.name,
        extractedFields: [],
      }, ...prev]);
    } catch (err) {
      console.error("Failed to upload:", err);
      addToast?.("Upload failed", err.message || "Failed to upload file", 5000, "error");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.deleteAPDocument(id);
      setDocuments(prev => prev.filter(d => d.id !== id));
      setDeleteConfirmId(null);
      addToast?.("Deleted", "Document deleted", 5000, "success");
    } catch (err) {
      console.error("Failed to delete:", err);
      addToast?.("Error", "Failed to delete document", 5000, "error");
    }
  };

  const handleUpdateDocument = async (id, updates) => {
    try {
      await api.updateAPDocument(id, updates);
      setDocuments(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
      addToast?.("Updated", "Document updated", 5000, "success");
    } catch (err) {
      console.error("Failed to update:", err);
      addToast?.("Error", "Failed to update document", 5000, "error");
    }
  };

  const openDetail = async (doc) => {
    setDetailDoc(doc);
    setDetailLoading(true);
    setStatusHistory([]);
    setExcedeStatus(null);
    try {
      const [docData, historyData] = await Promise.all([
        api.getAPDocument(doc.id),
        api.getAPDocumentHistory(doc.id),
      ]);
      setDetailDoc(docData.document);
      setStatusHistory(historyData.history || []);
    } catch (err) {
      console.error("Failed to load document detail:", err);
    } finally {
      setDetailLoading(false);
    }
  };

  const checkExcede = async (docId) => {
    setCheckingExcede(true);
    try {
      const data = await api.checkAPDocumentExcede(docId);
      setExcedeStatus(data);
    } catch (err) {
      console.error("Failed to check Excede:", err);
      addToast?.("Error", "Failed to check Excede", 5000, "error");
    } finally {
      setCheckingExcede(false);
    }
  };

  const filteredDocuments = documents.filter(d => {
    // Filter by tab
    if (activeFilter === "invoices") {
      if (d.documentType !== 'invoice') return false;
    } else if (activeFilter === "review") {
      if (d.status !== 'reviewing') return false;
    }

    // Filter by vendor click
    if (vendorFilter) {
      return (d.vendorName || "").toLowerCase() === vendorFilter.toLowerCase();
    }

    // Filter by search
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (d.vendorName || "").toLowerCase().includes(q) ||
      (d.invoiceNumber || "").toLowerCase().includes(q) ||
      (d.poNumber || "").toLowerCase().includes(q) ||
      (d.file?.name || "").toLowerCase().includes(q)
    );
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return isNaN(d) ? dateStr : d.toLocaleDateString();
  };

  const formatAmount = (amount) => {
    if (amount === null || amount === undefined) return "—";
    return `$${parseFloat(amount).toFixed(2)}`;
  };

  const formatSize = (bytes) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getStatusBadge = (status) => {
    const styles = {
      uploaded: { bg: "#6b7280", label: "Uploaded" },
      processing: { bg: "#3b82f6", label: "Processing" },
      classified: { bg: "#8b5cf6", label: "Classified" },
      extracted: { bg: "#22c55e", label: "Extracted" },
      reviewing: { bg: "#f59e0b", label: "Reviewing" },
      approved: { bg: "#10b981", label: "Approved" },
      posted: { bg: "#0891b2", label: "Posted" },
      rejected: { bg: "#ef4444", label: "Rejected" },
      archived: { bg: "#6b7280", label: "Archived" },
    };
    const s = styles[status] || { bg: "#6b7280", label: status };
    return (
      <span style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 8px",
        borderRadius: 12,
        fontSize: 11,
        fontWeight: 600,
        color: "white",
        background: s.bg,
      }}>
        {status === 'processing' && <ClockIcon size={10} />}
        {status === 'extracted' && <CheckIcon size={10} />}
        {(status === 'reviewing' || status === 'uploaded') && <AlertTriangleIcon size={10} />}
        {s.label}
      </span>
    );
  };

  const getTypeBadge = (type) => {
    const styles = {
      invoice: { bg: "#22c55e", label: "Invoice" },
      non_invoice: { bg: "#8b5cf6", label: "Non-Invoice" },
      unknown: { bg: "#6b7280", label: "Unknown" },
    };
    const s = styles[type] || { bg: "#6b7280", label: type };
    return (
      <span style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 8px",
        borderRadius: 12,
        fontSize: 11,
        fontWeight: 600,
        color: "white",
        background: s.bg,
      }}>
        {s.label}
      </span>
    );
  };

  const getConfidenceColor = (score) => {
    if (score >= 80) return "#22c55e";
    if (score >= 50) return "#f59e0b";
    return "#ef4444";
  };

  const reviewCount = documents.filter(d => d.status === 'reviewing').length;

  return (
    <div style={{ padding: "24px 32px", maxWidth: 1400, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: t.text }}>Accounts Payable</h1>
          <p style={{ fontSize: 13, color: t.textMuted, margin: "4px 0 0" }}>
            Upload invoices and documents for OCR extraction and workflow management
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ position: "relative" }}>
            <SearchIcon size={16} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: t.textMuted }} />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: "8px 12px 8px 34px",
                borderRadius: 8,
                border: `1px solid ${t.border}`,
                background: t.surface,
                color: t.text,
                fontSize: 13,
                width: 240,
                outline: "none",
              }}
            />
          </div>
        </div>
      </div>

      {/* Vendor Filter Banner */}
      {vendorFilter && (
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 12px",
          borderRadius: 8,
          background: darkMode ? "rgba(34,197,94,0.1)" : "rgba(34,197,94,0.05)",
          border: `1px solid ${darkMode ? "rgba(34,197,94,0.3)" : "rgba(34,197,94,0.2)"}`,
          marginBottom: 16,
        }}>
          <span style={{ fontSize: 13, color: t.text }}>
            Showing invoices for: <strong>{vendorFilter}</strong>
          </span>
          <button
            onClick={() => setVendorFilter(null)}
            style={{
              background: "transparent",
              border: "none",
              color: apAccent,
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <XIcon size={14} /> Clear filter
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {[
          { id: "all", label: "All Documents", count: documents.length },
          { id: "invoices", label: "Invoices", count: documents.filter(d => d.documentType === 'invoice').length },
          { id: "review", label: "Review Queue", count: reviewCount },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveFilter(tab.id)}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: `1px solid ${activeFilter === tab.id ? apAccent : t.border}`,
              background: activeFilter === tab.id ? (darkMode ? "rgba(34,197,94,0.15)" : "rgba(34,197,94,0.08)") : t.surface,
              color: activeFilter === tab.id ? apAccent : t.textMuted,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {tab.label}
            <span style={{
              padding: "1px 6px",
              borderRadius: 10,
              fontSize: 11,
              background: activeFilter === tab.id ? apAccent : t.border,
              color: activeFilter === tab.id ? "white" : t.textMuted,
            }}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Upload Zone */}
      {canUpload && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${dragOver ? apAccent : t.border}`,
            borderRadius: 12,
            padding: "32px",
            textAlign: "center",
            cursor: "pointer",
            background: dragOver ? (darkMode ? "rgba(34,197,94,0.1)" : "rgba(34,197,94,0.05)") : t.surface,
            marginBottom: 24,
            transition: "all 0.2s ease",
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
            onChange={handleFileSelect}
            style={{ display: "none" }}
          />
          <UploadCloudIcon size={32} style={{ color: dragOver ? apAccent : t.textMuted, marginBottom: 8 }} />
          <div style={{ fontSize: 14, fontWeight: 600, color: t.text }}>
            {uploading ? "Uploading..." : "Drag & drop files here, or click to browse"}
          </div>
          <div style={{ fontSize: 12, color: t.textMuted, marginTop: 4 }}>
            Supports PDF, JPEG, PNG
          </div>
        </div>
      )}

      {/* Documents Table */}
      <div style={{
        background: t.surface,
        border: `1px solid ${t.border}`,
        borderRadius: 12,
        overflow: "hidden",
      }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: activeFilter === "review" 
            ? "2fr 1fr 1fr 100px 100px 120px" 
            : "2fr 1fr 1fr 1fr 1fr 1fr 100px 120px",
          gap: 12,
          padding: "12px 16px",
          borderBottom: `1px solid ${t.border}`,
          fontSize: 11,
          fontWeight: 700,
          color: t.textMuted,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}>
          <div>File</div>
          {activeFilter !== "review" && <div>Vendor</div>}
          {activeFilter !== "review" && <div>Invoice #</div>}
          {activeFilter !== "review" && <div>Date</div>}
          {activeFilter !== "review" && <div>Amount</div>}
          {activeFilter !== "review" && <div>PO #</div>}
          {activeFilter === "review" && <div>Detected Type</div>}
          <div>Status</div>
          <div style={{ textAlign: "right" }}>Actions</div>
        </div>

        {loading && documents.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: t.textMuted }}>
            Loading documents...
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: t.textMuted }}>
            <FileDocIcon size={32} style={{ marginBottom: 8, opacity: 0.5 }} />
            <div>No documents found</div>
            {searchQuery && <div style={{ fontSize: 12, marginTop: 4 }}>Try adjusting your search</div>}
          </div>
        ) : (
          filteredDocuments.map((doc) => (
            <div
              key={doc.id}
              style={{
                display: "grid",
                gridTemplateColumns: activeFilter === "review" 
                  ? "2fr 1fr 1fr 100px 100px 120px" 
                  : "2fr 1fr 1fr 1fr 1fr 1fr 100px 120px",
                gap: 12,
                padding: "12px 16px",
                borderBottom: `1px solid ${t.border}`,
                alignItems: "center",
                fontSize: 13,
                color: t.text,
              }}
            >
              <div>
                <div style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                  <FileDocIcon size={14} style={{ color: t.textMuted }} />
                  {doc.file?.name || "Untitled"}
                  {doc.isDuplicate && (
                    <span style={{
                      padding: "1px 6px",
                      borderRadius: 10,
                      fontSize: 10,
                      fontWeight: 700,
                      background: "#ef4444",
                      color: "white",
                      marginLeft: 4,
                    }}>
                      DUPLICATE
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: t.textMuted, marginTop: 2 }}>
                  {formatSize(doc.file?.size)} · {doc.file?.pages || 0} pages
                </div>
              </div>

              {activeFilter !== "review" && (
                <div>
                  {doc.vendorName ? (
                    <div>
                      <button
                        onClick={() => setVendorFilter(doc.vendorName)}
                        style={{
                          background: "transparent",
                          border: "none",
                          padding: 0,
                          fontWeight: 500,
                          color: apAccent,
                          cursor: "pointer",
                          fontSize: 13,
                          textDecoration: "underline",
                          textDecorationColor: "transparent",
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.textDecorationColor = apAccent}
                        onMouseLeave={(e) => e.currentTarget.style.textDecorationColor = "transparent"}
                        title={`Filter by ${doc.vendorName}`}
                      >
                        {doc.vendorName}
                      </button>
                      {doc.extractedFields?.find(f => f.field === 'vendor_name') && (
                        <div style={{
                          fontSize: 10,
                          color: getConfidenceColor(doc.extractedFields.find(f => f.field === 'vendor_name').confidence),
                        }}>
                          {doc.extractedFields.find(f => f.field === 'vendor_name').confidence}% confidence
                        </div>
                      )}
                    </div>
                  ) : (
                    <span style={{ color: t.textMuted }}>—</span>
                  )}
                </div>
              )}

              {activeFilter !== "review" && <div>{doc.invoiceNumber || <span style={{ color: t.textMuted }}>—</span>}</div>}
              {activeFilter !== "review" && <div>{formatDate(doc.invoiceDate)}</div>}
              {activeFilter !== "review" && <div>{formatAmount(doc.invoiceAmount)}</div>}
              {activeFilter !== "review" && <div>{doc.poNumber || <span style={{ color: t.textMuted }}>—</span>}</div>}

              {activeFilter === "review" && (
                <div>{getTypeBadge(doc.documentType)}</div>
              )}

              <div>{getStatusBadge(doc.status)}</div>

              <div style={{ textAlign: "right", display: "flex", gap: 6, justifyContent: "flex-end" }}>
                {doc.isDuplicate && (
                  <button
                    onClick={() => setDuplicateDoc(doc)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#ef4444",
                      cursor: "pointer",
                      padding: 4,
                      borderRadius: 4,
                    }}
                    title="View Duplicate"
                  >
                    <AlertTriangleIcon size={14} />
                  </button>
                )}
                <button
                  onClick={() => openDetail(doc)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: t.textMuted,
                    cursor: "pointer",
                    padding: 4,
                    borderRadius: 4,
                  }}
                  title="View Details"
                >
                  <EyeIcon size={14} />
                </button>
                {canUpload && (
                  <button
                    onClick={() => setDeleteConfirmId(doc.id)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#ef4444",
                      cursor: "pointer",
                      padding: 4,
                      borderRadius: 4,
                    }}
                    title="Delete"
                  >
                    <TrashIcon size={14} />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Document Detail Modal */}
      {detailDoc && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: 24,
        }}
        onClick={() => setDetailDoc(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: t.surface,
              border: `1px solid ${t.border}`,
              borderRadius: 12,
              maxWidth: 800,
              width: "100%",
              maxHeight: "90vh",
              overflow: "auto",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Modal Header */}
            <div style={{
              padding: "16px 20px",
              borderBottom: `1px solid ${t.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, color: t.text }}>{detailDoc.file?.name || "Document Details"}</h3>
                <div style={{ fontSize: 12, color: t.textMuted, marginTop: 4 }}>
                  {formatSize(detailDoc.file?.size)} · {detailDoc.file?.pages || 0} pages · Uploaded {formatDate(detailDoc.createdAt)}
                </div>
              </div>
              <button
                onClick={() => setDetailDoc(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: t.textMuted,
                  cursor: "pointer",
                  padding: 4,
                }}
              >
                <XIcon size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: 20 }}>
              {detailLoading ? (
                <div style={{ textAlign: "center", padding: 40, color: t.textMuted }}>Loading details...</div>
              ) : (
                <>
                  {/* Status and Type */}
                  <div style={{ display: "flex", gap: 12, marginBottom: 20, alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 11, color: t.textMuted, marginBottom: 4 }}>STATUS</div>
                      {getStatusBadge(detailDoc.status)}
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: t.textMuted, marginBottom: 4 }}>TYPE</div>
                      {getTypeBadge(detailDoc.documentType)}
                    </div>
                  </div>

                  {/* Workflow Actions */}
                  {canReview && detailDoc.status !== 'archived' && detailDoc.status !== 'processing' && detailDoc.status !== 'uploaded' && (
                    <div style={{
                      background: darkMode ? "rgba(34,197,94,0.1)" : "rgba(34,197,94,0.05)",
                      border: `1px solid ${darkMode ? "rgba(34,197,94,0.3)" : "rgba(34,197,94,0.2)"}`,
                      borderRadius: 8,
                      padding: 16,
                      marginBottom: 20,
                    }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: t.text, marginBottom: 8 }}>
                        Workflow Actions
                      </div>

                      {/* Reviewing status actions */}
                      {detailDoc.status === 'reviewing' && (
                        <>
                          <div style={{ fontSize: 12, color: t.textMuted, marginBottom: 12 }}>
                            This document needs review. Please classify it.
                          </div>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <button
                              onClick={() => handleUpdateDocument(detailDoc.id, { documentType: 'invoice', status: 'extracted' })}
                              style={{
                                padding: "6px 12px", borderRadius: 6, border: "none",
                                background: "#22c55e", color: "white",
                                fontSize: 12, fontWeight: 600, cursor: "pointer",
                              }}
                            >
                              Mark as Invoice
                            </button>
                            <button
                              onClick={() => handleUpdateDocument(detailDoc.id, { documentType: 'non_invoice', status: 'extracted' })}
                              style={{
                                padding: "6px 12px", borderRadius: 6, border: `1px solid ${t.border}`,
                                background: t.surface, color: t.text,
                                fontSize: 12, fontWeight: 600, cursor: "pointer",
                              }}
                            >
                              Mark as Non-Invoice
                            </button>
                            <button
                              onClick={() => handleUpdateDocument(detailDoc.id, { status: 'rejected' })}
                              style={{
                                padding: "6px 12px", borderRadius: 6, border: "none",
                                background: "#ef4444", color: "white",
                                fontSize: 12, fontWeight: 600, cursor: "pointer",
                              }}
                            >
                              Reject
                            </button>
                          </div>
                        </>
                      )}

                      {/* Extracted status actions */}
                      {detailDoc.status === 'extracted' && (
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button
                            onClick={() => handleUpdateDocument(detailDoc.id, { status: 'approved' })}
                            style={{
                              padding: "6px 12px", borderRadius: 6, border: "none",
                              background: "#10b981", color: "white",
                              fontSize: 12, fontWeight: 600, cursor: "pointer",
                            }}
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleUpdateDocument(detailDoc.id, { status: 'rejected' })}
                            style={{
                              padding: "6px 12px", borderRadius: 6, border: "none",
                              background: "#ef4444", color: "white",
                              fontSize: 12, fontWeight: 600, cursor: "pointer",
                            }}
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => handleUpdateDocument(detailDoc.id, { status: 'archived' })}
                            style={{
                              padding: "6px 12px", borderRadius: 6, border: `1px solid ${t.border}`,
                              background: t.surface, color: t.text,
                              fontSize: 12, fontWeight: 600, cursor: "pointer",
                            }}
                          >
                            Archive
                          </button>
                        </div>
                      )}

                      {/* Approved status actions */}
                      {detailDoc.status === 'approved' && (
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button
                            onClick={() => handleUpdateDocument(detailDoc.id, { status: 'posted' })}
                            style={{
                              padding: "6px 12px", borderRadius: 6, border: "none",
                              background: "#0891b2", color: "white",
                              fontSize: 12, fontWeight: 600, cursor: "pointer",
                            }}
                          >
                            Mark Posted
                          </button>
                          <button
                            onClick={() => handleUpdateDocument(detailDoc.id, { status: 'rejected' })}
                            style={{
                              padding: "6px 12px", borderRadius: 6, border: "none",
                              background: "#ef4444", color: "white",
                              fontSize: 12, fontWeight: 600, cursor: "pointer",
                            }}
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => handleUpdateDocument(detailDoc.id, { status: 'archived' })}
                            style={{
                              padding: "6px 12px", borderRadius: 6, border: `1px solid ${t.border}`,
                              background: t.surface, color: t.text,
                              fontSize: 12, fontWeight: 600, cursor: "pointer",
                            }}
                          >
                            Archive
                          </button>
                        </div>
                      )}

                      {/* Posted status actions */}
                      {detailDoc.status === 'posted' && (
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button
                            onClick={() => handleUpdateDocument(detailDoc.id, { status: 'archived' })}
                            style={{
                              padding: "6px 12px", borderRadius: 6, border: `1px solid ${t.border}`,
                              background: t.surface, color: t.text,
                              fontSize: 12, fontWeight: 600, cursor: "pointer",
                            }}
                          >
                            Archive
                          </button>
                        </div>
                      )}

                      {/* Rejected status actions */}
                      {detailDoc.status === 'rejected' && (
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button
                            onClick={() => handleUpdateDocument(detailDoc.id, { status: 'uploaded' })}
                            style={{
                              padding: "6px 12px", borderRadius: 6, border: `1px solid ${t.border}`,
                              background: t.surface, color: t.text,
                              fontSize: 12, fontWeight: 600, cursor: "pointer",
                            }}
                          >
                            Reprocess
                          </button>
                          <button
                            onClick={() => handleUpdateDocument(detailDoc.id, { status: 'archived' })}
                            style={{
                              padding: "6px 12px", borderRadius: 6, border: `1px solid ${t.border}`,
                              background: t.surface, color: t.text,
                              fontSize: 12, fontWeight: 600, cursor: "pointer",
                            }}
                          >
                            Archive
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Extracted Fields */}
                  <div style={{ marginBottom: 20 }}>
                    <h4 style={{ fontSize: 13, fontWeight: 700, color: t.textMuted, margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Extracted Fields
                    </h4>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      {[
                        { label: "Vendor Name", key: "vendor_name", value: detailDoc.vendorName },
                        { label: "Invoice Number", key: "invoice_number", value: detailDoc.invoiceNumber },
                        { label: "Invoice Date", key: "invoice_date", value: formatDate(detailDoc.invoiceDate) },
                        { label: "Invoice Amount", key: "invoice_amount", value: formatAmount(detailDoc.invoiceAmount) },
                        { label: "PO Number", key: "po_number", value: detailDoc.poNumber },
                      ].map(field => {
                        const extractedField = detailDoc.extractedFields?.find(f => f.field === field.key);
                        return (
                          <div key={field.key} style={{
                            padding: 12,
                            borderRadius: 8,
                            border: `1px solid ${t.border}`,
                            background: darkMode ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)",
                          }}>
                            <div style={{ fontSize: 11, color: t.textMuted, marginBottom: 4 }}>{field.label}</div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: t.text }}>
                              {field.value || "—"}
                            </div>
                            {extractedField && (
                              <div style={{
                                fontSize: 10,
                                color: getConfidenceColor(extractedField.confidence),
                                marginTop: 4,
                              }}>
                                {extractedField.confidence}% confidence
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Excede Lookup */}
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                      <h4 style={{ fontSize: 13, fontWeight: 700, color: t.textMuted, margin: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Excede Status
                      </h4>
                      <button
                        onClick={() => checkExcede(detailDoc.id)}
                        disabled={checkingExcede}
                        style={{
                          padding: "4px 12px",
                          borderRadius: 6,
                          border: `1px solid ${t.border}`,
                          background: t.surface,
                          color: t.textMuted,
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        {checkingExcede ? "Checking..." : "Check Excede"}
                      </button>
                    </div>

                    {excedeStatus && (
                      <div style={{
                        padding: 12,
                        borderRadius: 8,
                        border: `1px solid ${t.border}`,
                        background: darkMode ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)",
                      }}>
                        {!excedeStatus.checked ? (
                          <div style={{ fontSize: 13, color: t.textMuted }}>
                            {excedeStatus.message || "Not checked"}
                          </div>
                        ) : excedeStatus.error ? (
                          <div style={{ fontSize: 13, color: "#ef4444" }}>
                            Error: {excedeStatus.error}
                          </div>
                        ) : excedeStatus.found ? (
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "#22c55e", marginBottom: 4 }}>
                              <CheckIcon size={12} /> Found in Excede
                            </div>
                            {excedeStatus.excedeData && (
                              <div style={{ fontSize: 12, color: t.textMuted }}>
                                <div>Vendor: {excedeStatus.excedeData.VendorName || "—"}</div>
                                <div>Invoice: {excedeStatus.excedeData.InvoiceNo || "—"}</div>
                                <div>Posted: {excedeStatus.excedeData.PostedDate ? new Date(excedeStatus.excedeData.PostedDate).toLocaleDateString() : "—"}</div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div style={{ fontSize: 13, color: t.textMuted }}>
                            Not found in Excede
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Status History */}
                  {statusHistory.length > 0 && (
                    <div style={{ marginBottom: 20 }}>
                      <h4 style={{ fontSize: 13, fontWeight: 700, color: t.textMuted, margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Status History
                      </h4>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {statusHistory.map((entry, idx) => (
                          <div key={idx} style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            padding: "8px 12px",
                            borderRadius: 6,
                            border: `1px solid ${t.border}`,
                            background: darkMode ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)",
                          }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span style={{ fontSize: 12, color: t.textMuted }}>{entry.old_status}</span>
                              <span style={{ fontSize: 11, color: t.textMuted }}>→</span>
                              <span style={{ fontSize: 12, fontWeight: 600, color: t.text }}>{entry.new_status}</span>
                            </div>
                            <div style={{ marginLeft: "auto", fontSize: 11, color: t.textMuted }}>
                              {entry.changed_by_name || "System"} · {formatDate(entry.changed_at)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Extracted Text Preview */}
                  {detailDoc.extractedText && (
                    <div>
                      <h4 style={{ fontSize: 13, fontWeight: 700, color: t.textMuted, margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Extracted Text
                      </h4>
                      <pre style={{
                        background: darkMode ? "#0d1117" : "#f6f8fa",
                        border: `1px solid ${t.border}`,
                        borderRadius: 8,
                        padding: 12,
                        fontSize: 12,
                        color: t.text,
                        maxHeight: 200,
                        overflow: "auto",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        margin: 0,
                      }}>
                        {detailDoc.extractedText}
                      </pre>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Review Modal */}
      {duplicateDoc && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: 24,
        }}
        onClick={() => setDuplicateDoc(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: t.surface,
              border: `1px solid ${t.border}`,
              borderRadius: 12,
              maxWidth: 600,
              width: "100%",
              maxHeight: "90vh",
              overflow: "auto",
            }}
          >
            <div style={{
              padding: "16px 20px",
              borderBottom: `1px solid ${t.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, color: "#ef4444" }}>
                  <AlertTriangleIcon size={16} style={{ marginRight: 6 }} />
                  Potential Duplicate Detected
                </h3>
                <div style={{ fontSize: 12, color: t.textMuted, marginTop: 4 }}>
                  This document may be a duplicate of an existing invoice
                </div>
              </div>
              <button
                onClick={() => setDuplicateDoc(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: t.textMuted,
                  cursor: "pointer",
                  padding: 4,
                }}
              >
                <XIcon size={20} />
              </button>
            </div>

            <div style={{ padding: 20 }}>
              <div style={{
                background: darkMode ? "rgba(239,68,68,0.1)" : "rgba(239,68,68,0.05)",
                border: `1px solid ${darkMode ? "rgba(239,68,68,0.3)" : "rgba(239,68,68,0.2)"}`,
                borderRadius: 8,
                padding: 16,
                marginBottom: 20,
              }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: t.text, marginBottom: 8 }}>
                  Current Document
                </div>
                <div style={{ fontSize: 13, color: t.text }}>
                  <div><strong>File:</strong> {duplicateDoc.file?.name}</div>
                  <div><strong>Vendor:</strong> {duplicateDoc.vendorName || "—"}</div>
                  <div><strong>Invoice #:</strong> {duplicateDoc.invoiceNumber || "—"}</div>
                  <div><strong>Date:</strong> {formatDate(duplicateDoc.invoiceDate)}</div>
                  <div><strong>Amount:</strong> {formatAmount(duplicateDoc.invoiceAmount)}</div>
                </div>
              </div>

              <div style={{ fontSize: 13, color: t.textMuted, marginBottom: 16 }}>
                The system detected this invoice matches an existing record. Please review both documents to confirm if this is a duplicate.
              </div>

              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button
                  onClick={() => {
                    handleUpdateDocument(duplicateDoc.id, { isDuplicate: 0, duplicateOfId: null });
                    setDuplicateDoc(null);
                  }}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 8,
                    border: `1px solid ${t.border}`,
                    background: t.surface,
                    color: t.text,
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  Not a Duplicate
                </button>
                <button
                  onClick={() => {
                    handleUpdateDocument(duplicateDoc.id, { status: 'rejected' });
                    setDuplicateDoc(null);
                  }}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 8,
                    border: "none",
                    background: "#ef4444",
                    color: "white",
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  Reject Duplicate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
        }}
        onClick={() => setDeleteConfirmId(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: t.surface,
              border: `1px solid ${t.border}`,
              borderRadius: 12,
              padding: 24,
              maxWidth: 400,
              width: "100%",
            }}
          >
            <h3 style={{ margin: "0 0 8px", fontSize: 16, color: t.text }}>Delete Document?</h3>
            <p style={{ margin: 0, fontSize: 13, color: t.textMuted }}>
              This will permanently delete the document and its extracted data. This action cannot be undone.
            </p>
            <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
              <button
                onClick={() => setDeleteConfirmId(null)}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: `1px solid ${t.border}`,
                  background: t.surface,
                  color: t.text,
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: "none",
                  background: "#ef4444",
                  color: "white",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
