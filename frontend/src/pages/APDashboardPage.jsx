import { useState, useEffect, useCallback, useRef } from "react";
import * as api from "../api";
import { useSocket } from "../hooks/useSocket";
import { UploadCloudIcon, TrashIcon, SearchIcon, FileDocIcon, AlertTriangleIcon, CheckIcon, ClockIcon } from "../components/Icons";

export default function APDashboardPage({ loggedInUser, t, darkMode, addToast }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const fileInputRef = useRef(null);

  const apAccent = "#22c55e";
  const apAccentDark = "#16a34a";

  const canUpload = loggedInUser?.permissions?.includes("ap_upload");

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
      // Immediately add a placeholder to the list
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

  const filteredDocuments = documents.filter(d => {
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

  const getConfidenceColor = (score) => {
    if (score >= 80) return "#22c55e";
    if (score >= 50) return "#f59e0b";
    return "#ef4444";
  };

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
          gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr 100px 120px",
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
          <div>Vendor</div>
          <div>Invoice #</div>
          <div>Date</div>
          <div>Amount</div>
          <div>PO #</div>
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
                gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr 100px 120px",
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
                </div>
                <div style={{ fontSize: 11, color: t.textMuted, marginTop: 2 }}>
                  {formatSize(doc.file?.size)} · {doc.file?.pages || 0} pages
                </div>
              </div>

              <div>
                {doc.vendorName ? (
                  <div>
                    <div style={{ fontWeight: 500 }}>{doc.vendorName}</div>
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

              <div>{doc.invoiceNumber || <span style={{ color: t.textMuted }}>—</span>}</div>
              <div>{formatDate(doc.invoiceDate)}</div>
              <div>{formatAmount(doc.invoiceAmount)}</div>
              <div>{doc.poNumber || <span style={{ color: t.textMuted }}>—</span>}</div>

              <div>{getStatusBadge(doc.status)}</div>

              <div style={{ textAlign: "right", display: "flex", gap: 6, justifyContent: "flex-end" }}>
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
