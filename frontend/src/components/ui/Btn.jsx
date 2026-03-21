export function Btn({ children, onClick, primary, style: s = {}, darkMode, t }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: primary
          ? darkMode
            ? `linear-gradient(135deg,${t.accent},${t.accentDark})`
            : t.accent
          : t.surface,
        color: primary ? "#fff" : t.text,
        border: primary ? "none" : `1px solid ${t.border}`,
        borderRadius: 8,
        padding: "8px 16px",
        fontSize: 12.5,
        fontWeight: 600,
        cursor: "pointer",
        fontFamily: "inherit",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        ...s,
      }}
    >
      {children}
    </button>
  );
}

export function SmallBtn({ children, onClick, title, t }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="icon-btn"
      style={{
        background: "transparent",
        border: "none",
        borderRadius: 6,
        padding: 5,
        cursor: "pointer",
        color: t.textDim,
        display: "flex",
        alignItems: "center",
      }}
    >
      {children}
    </button>
  );
}
