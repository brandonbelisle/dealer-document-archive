import { FolderClosedIcon } from "./Icons";

export default function LandingPage({ setPage, t, darkMode }) {
  const apps = [
    {
      id: "dda",
      name: "Dealer Document Archive",
      icon: (
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          background: `linear-gradient(135deg,${t.accent},${t.accentDark || t.accent})`,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "white", fontSize: 14, fontWeight: 800,
        }}>
          DDA
        </div>
      ),
      onClick: () => setPage("folders"),
    },
  ];

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "calc(100vh - 55px)",
      animation: "fadeIn 0.3s ease",
    }}>
      <div style={{
        width: 72, height: 72, borderRadius: 18,
        background: `linear-gradient(135deg,${t.accent},${t.accentDark || t.accent})`,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "white", fontSize: 18, fontWeight: 800,
        marginBottom: 20,
        boxShadow: `0 8px 32px ${t.accent}40`,
      }}>
        DDA
      </div>
      <h1 style={{ fontSize: 28, fontWeight: 700, margin: "0 0 48px", color: t.text }}>
        Applications
      </h1>
      <div style={{
        display: "flex",
        gap: 32,
        flexWrap: "wrap",
        justifyContent: "center",
      }}>
        {apps.map((app) => (
          <div
            key={app.id}
            onClick={app.onClick}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 14,
              padding: "28px 32px",
              background: t.surface,
              border: `1px solid ${t.border}`,
              borderRadius: 16,
              cursor: "pointer",
              transition: "all 0.2s ease",
              minWidth: 180,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = t.accent;
              e.currentTarget.style.boxShadow = `0 4px 20px ${t.accent}20`;
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = t.border;
              e.currentTarget.style.boxShadow = "none";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            {app.icon}
            <div style={{ fontSize: 14, fontWeight: 600, color: t.text }}>
              {app.name}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
