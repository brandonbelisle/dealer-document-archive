import { getTheme } from "../theme";
import { UsersIcon } from "../components/Icons";

export default function DCVPage({ t, darkMode }) {
  const theme = getTheme(darkMode);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "calc(100vh - 55px)",
        padding: "40px 200px",
        boxSizing: "border-box",
        width: "100%",
      }}
    >
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: 16,
          background: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 24,
        }}
      >
        <span style={{ color: "white", fontSize: 28, fontWeight: 800 }}>DCV</span>
      </div>
      <h1 style={{ fontSize: 28, fontWeight: 700, margin: "0 0 12px", color: theme.text }}>
        Dealer Customer Vision
      </h1>
      <p style={{ fontSize: 15, color: theme.textMuted, margin: 0, textAlign: "center", maxWidth: 500 }}>
        View and manage customer data synced from your DMS system.
      </p>
      
      <div
        style={{
          marginTop: 48,
          padding: "24px 32px",
          background: theme.surface,
          border: `1px solid ${theme.border}`,
          borderRadius: 12,
          maxWidth: 600,
          width: "100%",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <UsersIcon size={20} style={{ color: theme.textMuted }} />
          <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: theme.text }}>
            Coming Soon
          </h2>
        </div>
        <p style={{ fontSize: 14, color: theme.textMuted, margin: 0, lineHeight: 1.6 }}>
          Customer data management features are being developed. Check back later for updates on 
          customer search, filtering, and detailed customer information views.
        </p>
      </div>
    </div>
  );
}