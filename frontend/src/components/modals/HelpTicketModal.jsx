import { useState, useRef } from "react";
import * as api from "../../api";
import { XIcon, UploadCloudIcon } from "../Icons";

export default function HelpTicketModal({ show, onClose, darkMode, loggedInUser }) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef(null);

  if (!show) return null;

  const t = {
    text: darkMode ? "#e5e7eb" : "#1f2937",
    textMuted: darkMode ? "#94a3b8" : "#6b7280",
    textDim: darkMode ? "#6b7280" : "#9ca3af",
    surface: darkMode ? "#1c1f26" : "#fff",
    border: darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
    accent: darkMode ? "#88c0d0" : "#0891b2",
    accentSoft: darkMode ? "rgba(136,192,208,0.15)" : "rgba(8,145,178,0.08)",
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter(file => file.size <= 25 * 1024 * 1024);
    if (validFiles.length !== files.length) {
      setError("Some files were too large (max 25MB each)");
    }
    setAttachments(prev => [...prev, ...validFiles]);
    e.target.value = "";
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const handleSubmit = async () => {
    if (!subject.trim()) {
      setError("Please enter a subject");
      return;
    }
    if (!message.trim()) {
      setError("Please describe your issue");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await api.submitHelpTicket(subject.trim(), message.trim(), attachments);
      setSuccess(true);
      setSubject("");
      setMessage("");
      setAttachments([]);
      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 2000);
    } catch (err) {
      setError(err.message || "Failed to submit help ticket. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      setSubject("");
      setMessage("");
      setAttachments([]);
      setError("");
      setSuccess(false);
      onClose();
    }
  };

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
      padding: 20,
    }} onClick={handleClose}>
      <div
        style={{
          background: t.surface,
          borderRadius: 16,
          width: "100%",
          maxWidth: 560,
          maxHeight: "90vh",
          overflow: "auto",
          boxShadow: darkMode ? "0 20px 60px rgba(0,0,0,0.5)" : "0 20px 60px rgba(0,0,0,0.2)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: "20px 24px",
          borderBottom: `1px solid ${t.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: t.text }}>
            Submit Help Ticket
          </h2>
          <button
            onClick={handleClose}
            disabled={submitting}
            style={{
              background: "transparent",
              border: "none",
              cursor: submitting ? "not-allowed" : "pointer",
              padding: 4,
              display: "flex",
              color: t.textMuted,
            }}
          >
            <XIcon size={20} />
          </button>
        </div>

        {success ? (
          <div style={{ padding: 60, textAlign: "center" }}>
            <div style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: darkMode ? "rgba(34,197,94,0.15)" : "rgba(34,197,94,0.1)",
              margin: "0 auto 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, color: t.text, marginBottom: 8 }}>
              Ticket Submitted
            </div>
            <div style={{ fontSize: 14, color: t.textMuted }}>
              We'll get back to you as soon as possible.
            </div>
          </div>
        ) : (
          <div style={{ padding: "20px 24px" }}>
            {/* User Info */}
            <div style={{
              background: darkMode ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
              borderRadius: 8,
              padding: "12px 16px",
              marginBottom: 20,
            }}>
              <div style={{ fontSize: 12, color: t.textMuted, marginBottom: 4 }}>Submitting as</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: t.text }}>
                {loggedInUser?.name || "Unknown User"}
              </div>
              <div style={{ fontSize: 12, color: t.textMuted }}>
                {loggedInUser?.email || ""}
              </div>
            </div>

            {/* Subject */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: t.text, display: "block", marginBottom: 8 }}>
                Subject
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Brief summary of your issue"
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  fontSize: 14,
                  border: `1px solid ${t.border}`,
                  borderRadius: 8,
                  background: darkMode ? "#1a1a1a" : "#fff",
                  color: t.text,
                  fontFamily: "inherit",
                }}
              />
            </div>

            {/* Message */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: t.text, display: "block", marginBottom: 8 }}>
                Please describe the issue you are having
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe your issue in detail..."
                rows={6}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  fontSize: 14,
                  border: `1px solid ${t.border}`,
                  borderRadius: 8,
                  background: darkMode ? "#1a1a1a" : "#fff",
                  color: t.text,
                  fontFamily: "inherit",
                  resize: "vertical",
                  minHeight: 120,
                }}
              />
            </div>

            {/* Attachments */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: t.text, display: "block", marginBottom: 8 }}>
                Attachments (optional)
              </label>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileSelect}
                style={{ display: "none" }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: "100%",
                  padding: "24px",
                  border: `2px dashed ${t.border}`,
                  borderRadius: 8,
                  background: "transparent",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 8,
                  color: t.textMuted,
                }}
              >
                <UploadCloudIcon size={24} />
                <span style={{ fontSize: 13 }}>Click to upload files (max 25MB each)</span>
              </button>
              {attachments.length > 0 && (
                <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                  {attachments.map((file, index) => (
                    <div
                      key={index}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "10px 12px",
                        background: darkMode ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                        borderRadius: 8,
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: t.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {file.name}
                        </div>
                        <div style={{ fontSize: 11, color: t.textMuted }}>
                          {formatFileSize(file.size)}
                        </div>
                      </div>
                      <button
                        onClick={() => removeAttachment(index)}
                        style={{
                          background: "transparent",
                          border: "none",
                          cursor: "pointer",
                          padding: 4,
                          display: "flex",
                          color: t.textMuted,
                        }}
                      >
                        <XIcon size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Error */}
            {error && (
              <div style={{
                padding: "12px 16px",
                borderRadius: 8,
                marginBottom: 16,
                background: darkMode ? "rgba(239,68,68,0.15)" : "rgba(239,68,68,0.1)",
                color: "#ef4444",
                fontSize: 13,
              }}>
                {error}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button
                onClick={handleClose}
                disabled={submitting}
                style={{
                  background: "transparent",
                  border: `1px solid ${t.border}`,
                  borderRadius: 8,
                  padding: "10px 20px",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: submitting ? "not-allowed" : "pointer",
                  color: t.text,
                  fontFamily: "inherit",
                  opacity: submitting ? 0.5 : 1,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || !subject.trim() || !message.trim()}
                style={{
                  background: t.accent,
                  border: "none",
                  borderRadius: 8,
                  padding: "10px 20px",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: submitting ? "not-allowed" : "pointer",
                  color: "#fff",
                  fontFamily: "inherit",
                  opacity: submitting || !subject.trim() || !message.trim() ? 0.5 : 1,
                }}
              >
                {submitting ? "Submitting..." : "Submit"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}