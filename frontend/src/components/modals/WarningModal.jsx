import { AlertTriangleIcon } from "../Icons";

export default function WarningModal({ warningModal, setWarningModal, t, darkMode, onDeleteAll }) {
  if (!warningModal) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 300,
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
          background: "rgba(0,0,0,0.5)",
          backdropFilter: "blur(4px)",
        }}
        onClick={() => setWarningModal(null)}
      />
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 480,
          background: t.surface,
          border: `1px solid ${t.border}`,
          borderRadius: 14,
          padding: "28px 24px",
          boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
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
              background: t.warnSoft,
              color: t.warn,
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
              {warningModal.title}
            </div>
            <div
              style={{ fontSize: 13, color: t.textMuted, lineHeight: 1.5 }}
            >
              {warningModal.message}
            </div>
          </div>
        </div>
        <div
          style={{ display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap" }}
        >
          <button
            onClick={() => setWarningModal(null)}
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
          {warningModal.onConfirmUnlink && (
            <button
              onClick={() => {
                warningModal.onConfirmUnlink();
                setWarningModal(null);
              }}
              style={{
                background: t.warnSoft,
                border: `1px solid ${t.warn}`,
                borderRadius: 8,
                padding: "8px 18px",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                color: t.warn,
                fontFamily: "inherit",
              }}
            >
              Yes, Unlink Files
            </button>
          )}
          {warningModal.onConfirmDeleteAll && (
            <button
              onClick={() => {
                if (warningModal.onDeleteAllClick) {
                  warningModal.onDeleteAllClick();
                } else if (onDeleteAll) {
                  onDeleteAll();
                }
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
              Delete Folder and Files
            </button>
          )}
          {!warningModal.onConfirmUnlink && !warningModal.onConfirmDeleteAll && warningModal.onConfirm && (
            <button
              onClick={() => {
                warningModal.onConfirm();
                setWarningModal(null);
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
              Confirm
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
