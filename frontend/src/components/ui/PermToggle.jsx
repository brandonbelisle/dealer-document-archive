export default function PermToggle({ checked, onChange, label, desc, t, darkMode }) {
  return (
    <div
      onClick={onChange}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 14px",
        borderRadius: 8,
        cursor: "pointer",
        background: checked ? t.accentSoft : "transparent",
        border: `1px solid ${checked ? t.accent + "40" : t.border}`,
        transition: "all 0.2s",
      }}
    >
      <div
        style={{
          width: 36,
          height: 20,
          borderRadius: 10,
          background: checked
            ? t.accent
            : darkMode
              ? "#2a2e35"
              : "#d4d0c8",
          position: "relative",
          transition: "background 0.2s",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 16,
            height: 16,
            borderRadius: "50%",
            background: "#fff",
            position: "absolute",
            top: 2,
            left: checked ? 18 : 2,
            transition: "left 0.2s",
            boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
          }}
        />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 12.5,
            fontWeight: 600,
            color: checked ? t.text : t.textMuted,
          }}
        >
          {label}
        </div>
        {desc && (
          <div style={{ fontSize: 10.5, color: t.textDim, marginTop: 1 }}>
            {desc}
          </div>
        )}
      </div>
    </div>
  );
}
