import { useState, useEffect } from "react";
import { GearIcon } from "./Icons";

export default function LandingPage({ setPage, t, darkMode, loggedInUser }) {
  const isAdmin = loggedInUser?.groups?.includes("Administrator");
  const [logoUrl, setLogoUrl] = useState(null);

  useEffect(() => {
    const logoType = darkMode ? "dark" : "light";
    const url = `/api/settings/logo/${logoType}?t=${Date.now()}`;
    setLogoUrl(url);
  }, [darkMode]);

  const apps = [
    {
      id: "dda",
      name: "Dealer Document Archive",
      icon: (
        <div style={{
          width: 56, height: 56, borderRadius: 14,
          background: `linear-gradient(135deg,${t.accent},${t.accentDark || t.accent})`,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "white", fontSize: 16, fontWeight: 800,
        }}>
          DDA
        </div>
      ),
      onClick: () => setPage("dashboard"),
    },
    ...(isAdmin ? [{
      id: "admin",
      name: "Admin Center",
      icon: (
        <div style={{
          width: 56, height: 56, borderRadius: 14,
          background: `linear-gradient(135deg,${t.textMuted},${t.textDim})`,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "white",
        }}>
          <GearIcon size={28} />
        </div>
      ),
      onClick: () => setPage("admin"),
    }] : []),
  ];

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "calc(100vh - 55px)",
      animation: "fadeIn 0.3s ease",
      paddingTop: 20,
    }}>
      {logoUrl && (
        <img
          src={logoUrl}
          alt="Logo"
          onError={() => setLogoUrl(null)}
          style={{
            height: 120,
            maxWidth: 560,
            objectFit: "contain",
            marginBottom: 24,
          }}
        />
      )}
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
              padding: "32px 40px",
              background: t.surface,
              border: `1px solid ${t.border}`,
              borderRadius: 16,
              cursor: "pointer",
              transition: "all 0.2s ease",
              minWidth: 200,
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