import { useState, useEffect } from "react";
import { GearIcon, TicketIcon } from "./Icons";
import * as api from "../api";

export default function LandingPage({ setPage, t, darkMode, loggedInUser, onOpenHelpTicket }) {
  const isAdmin = loggedInUser?.groups?.includes("Administrator");
  const [logoUrl, setLogoUrl] = useState(null);
  const [customApps, setCustomApps] = useState([]);

  useEffect(() => {
    const logoType = darkMode ? "dark" : "light";
    const url = `/api/settings/logo/${logoType}?t=${Date.now()}`;
    setLogoUrl(url);
  }, [darkMode]);

  useEffect(() => {
    api.getCustomApps().then(setCustomApps).catch(console.error);
  }, []);

  const apps = [
    {
      id: "dda",
      name: "Dealer Document Archive",
      permission: "view_dda",
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
    {
      id: "dcv",
      name: "Dealer Customer Vision",
      permission: "view_dcv",
      icon: (
        <div style={{
          width: 56, height: 56, borderRadius: 14,
          background: "linear-gradient(135deg,#8b5cf6,#6d28d9)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "white", fontSize: 16, fontWeight: 800,
        }}>
          DCV
        </div>
      ),
      onClick: () => setPage("dcv"),
    },
    {
      id: "cht",
      name: "Credit Hold Tracker",
      permission: "view_cht",
      icon: (
        <div style={{
          width: 56, height: 56, borderRadius: 14,
          background: "linear-gradient(135deg,#f59e0b,#d97706)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "white", fontSize: 16, fontWeight: 800,
        }}>
          CHT
        </div>
      ),
      onClick: () => setPage("cht"),
    },
    {
      id: "help",
      name: "Submit Help Ticket",
      permission: "view_help",
      icon: (
        <div style={{
          width: 56, height: 56, borderRadius: 14,
          background: "linear-gradient(135deg,#10b981,#059669)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "white",
        }}>
          <TicketIcon size={28} />
        </div>
      ),
      onClick: () => { if (onOpenHelpTicket) onOpenHelpTicket(); },
    },
    ...customApps
      .filter((app) => loggedInUser?.customAppIds?.includes(app.id))
      .map((app) => ({
        id: app.id,
        name: app.name,
        icon: (
          <div style={{
            width: 56, height: 56, borderRadius: 14,
            background: "linear-gradient(135deg, #88c0d0, #5b9bd5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "white", fontSize: 16, fontWeight: 800,
          }}>
            {app.abbreviation || app.name.substring(0, 2).toUpperCase()}
          </div>
        ),
        onClick: () => { window.open(app.link, "_blank"); },
      })),
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
  ].filter(app => !app.permission || loggedInUser?.permissions?.includes(app.permission));

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "calc(100vh - 55px)",
      animation: "fadeIn 0.3s ease",
      padding: "20px 200px",
      boxSizing: "border-box",
      width: "100%",
    }}>
      {logoUrl && (
        <img
          src={logoUrl}
          alt="Logo"
          onError={() => setLogoUrl(null)}
          style={{
            height: 240,
            maxWidth: "100%",
            objectFit: "contain",
            marginBottom: 24,
          }}
        />
      )}
      <h1 style={{ fontSize: 28, fontWeight: 700, margin: "0 0 48px", color: t.text }}>
        Applications
      </h1>
      <div style={{
        display: "grid",
        gap: 32,
        gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
        width: "100%",
        maxWidth: 1400,
      }}>
        {apps.map((app) => (
          <div
            key={app.id}
            onClick={app.onClick}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 14,
              width: "100%",
              aspectRatio: "1 / 1",
              background: t.surface,
              border: `1px solid ${t.border}`,
              borderRadius: 16,
              cursor: "pointer",
              transition: "all 0.2s ease",
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
            <div style={{ fontSize: 14, fontWeight: 600, color: t.text, textAlign: "center", padding: "0 10px" }}>
              {app.name}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}