import { AlertTriangleIcon } from "../Icons";

export default function ConfirmDeleteModal({ 
  isOpen, 
  onClose, 
  title, 
  message, 
  itemCount, 
  itemType, 
  onConfirm, 
  confirmText = "Delete",
  t, 
  darkMode 
}) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 400,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(4px)",
        }}
        onClick={onClose}
      />
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 440,
          background: t.surface,
          border: `1px solid ${t.border}`,
          borderRadius: 14,
          padding: "28px 24px",
          boxShadow: "0 20px 50px rgba(0,0,0,0.4)",
          animation: "modalIn 0.2s ease",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 14,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 10,
              flexShrink: 0,
              background: darkMode ? "rgba(239,68,68,0.15)" : "rgba(220,38,38,0.1)",
              color: t.error,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <AlertTriangleIcon size={22} />
          </div>
          <div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 700,
                marginBottom: 6,
                color: t.text,
              }}
            >
              {title}
            </div>
            <div
              style={{ fontSize: 13, color: t.textMuted, lineHeight: 1.5 }}
            >
              {message}
            </div>
            {itemCount !== undefined && itemCount > 0 && (
              <div
                style={{
                  marginTop: 12,
                  padding: "10px 14px",
                  background: darkMode ? "rgba(239,68,68,0.1)" : "rgba(220,38,38,0.08)",
                  borderRadius: 8,
                  border: `1px solid ${t.error}33`,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: t.error }}>
                  {itemCount} {itemType || "item"}{itemCount !== 1 ? "s" : ""} will be permanently deleted
                </div>
                <div style={{ fontSize: 11, color: t.textDim, marginTop: 4 }}>
                  This action cannot be undone.
                </div>
              </div>
            )}
          </div>
        </div>
        <div
          style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}
        >
          <button
            onClick={onClose}
            style={{
              background: t.surface,
              border: `1px solid ${t.border}`,
              borderRadius: 8,
              padding: "8px 18px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              color: t.text,
              fontFamily: "inherit",
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            style={{
              background: t.error,
              border: "none",
              borderRadius: 8,
              padding: "8px 18px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              color: "#fff",
              fontFamily: "inherit",
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
