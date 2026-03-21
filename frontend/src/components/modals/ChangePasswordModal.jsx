import { ShieldIcon } from "../Icons";
import { Btn } from "../ui/Btn";

export default function ChangePasswordModal({
  show,
  form,
  setForm,
  error,
  setError,
  success,
  setSuccess,
  loading,
  onSubmit,
  onClose,
  t,
  darkMode,
}) {
  if (!show) return null;

  const handleClose = () => {
    onClose();
    setError("");
    setSuccess("");
    setForm({ current: "", new: "", confirm: "" });
  };

  const inputStyle = {
    width: "100%",
    padding: "10px 14px",
    fontSize: 13.5,
    fontFamily: "inherit",
    background: darkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
    border: `1px solid ${t.border}`,
    borderRadius: 8,
    color: t.text,
    outline: "none",
    boxSizing: "border-box",
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 260,
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
          background: "rgba(0,0,0,0.45)",
          backdropFilter: "blur(4px)",
        }}
        onClick={handleClose}
      />
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 420,
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
            alignItems: "center",
            gap: 10,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: t.accentSoft,
              color: t.accent,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ShieldIcon size={18} />
          </div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>
              Change Password
            </div>
            <div style={{ fontSize: 12, color: t.textMuted }}>
              Enter your current password and choose a new one
            </div>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <div>
            <label
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: t.textMuted,
                display: "block",
                marginBottom: 4,
              }}
            >
              Current Password
            </label>
            <input
              type="password"
              value={form.current}
              onChange={(e) => {
                setForm((p) => ({ ...p, current: e.target.value }));
                setError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && onSubmit()}
              placeholder="Enter current password"
              style={inputStyle}
            />
          </div>
          <div>
            <label
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: t.textMuted,
                display: "block",
                marginBottom: 4,
              }}
            >
              New Password
            </label>
            <input
              type="password"
              value={form.new}
              onChange={(e) => {
                setForm((p) => ({ ...p, new: e.target.value }));
                setError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && onSubmit()}
              placeholder="At least 6 characters"
              style={inputStyle}
            />
          </div>
          <div>
            <label
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: t.textMuted,
                display: "block",
                marginBottom: 4,
              }}
            >
              Confirm New Password
            </label>
            <input
              type="password"
              value={form.confirm}
              onChange={(e) => {
                setForm((p) => ({ ...p, confirm: e.target.value }));
                setError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && onSubmit()}
              placeholder="Re-enter new password"
              style={inputStyle}
            />
          </div>
        </div>
        {error && (
          <div
            style={{
              padding: "8px 12px",
              borderRadius: 7,
              marginBottom: 12,
              background: t.errorSoft,
              color: t.error,
              fontSize: 12.5,
              fontWeight: 500,
            }}
          >
            {error}
          </div>
        )}
        {success && (
          <div
            style={{
              padding: "8px 12px",
              borderRadius: 7,
              marginBottom: 12,
              background: t.successSoft,
              color: t.success,
              fontSize: 12.5,
              fontWeight: 500,
            }}
          >
            {success}
          </div>
        )}
        <div
          style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}
        >
          <button
            onClick={handleClose}
            style={{
              background: t.surface,
              border: `1px solid ${t.border}`,
              borderRadius: 8,
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              color: t.text,
              fontFamily: "inherit",
            }}
          >
            Cancel
          </button>
          <Btn
            primary
            darkMode={darkMode}
            t={t}
            onClick={onSubmit}
            style={{
              padding: "8px 18px",
              fontSize: 13,
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "Saving..." : "Change Password"}
          </Btn>
        </div>
      </div>
    </div>
  );
}
