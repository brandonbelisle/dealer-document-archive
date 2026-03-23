import { useState, useEffect } from "react";
import { SunIcon, MoonIcon, UserIcon, ShieldIcon, GearIcon, LogOutIcon, ChevronDown, BellIcon, AppsIcon, HomeIcon, LinkIcon, TicketIcon } from "./Icons";
import AlertsDropdown from "./AlertsDropdown";
import * as api from "../api";

export default function CHTNavbar({ darkMode, setDarkMode, loggedInUser, page, setPage, setShowChangePassword, setChangePasswordForm, setChangePasswordError, setChangePasswordSuccess, handleLogout, setShowSubscriptionsModal, setAdminSection, onOpenHelpTicket }) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showAppsDropdown, setShowAppsDropdown] = useState(false);
  const [customApps, setCustomApps] = useState([]);

  const isAdmin = loggedInUser?.groups?.includes("Administrator");
  const chtAccent = "#f59e0b";
  const chtAccentDark = "#d97706";
  const t = {
    accent: chtAccent,
    accentSoft: darkMode ? "rgba(245,158,11,0.15)" : "rgba(245,158,11,0.08)",
    textMuted: darkMode ? "#94a3b8" : "#57606a",
    text: darkMode ? "#e5e7eb" : "#1f2937",
    border: darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
    surface: darkMode ? "#0d1117" : "#fff",
  };

  const apps = [
    { id: "home", name: "Home", icon: <HomeIcon size={20} />, onClick: () => { setPage("landing"); setShowAppsDropdown(false); } },
    { id: "dda", name: "Dealer Document Archive", icon: (
      <div style={{ width: 28, height: 28, borderRadius: 7, background: "linear-gradient(135deg,#88c0d0,#88c0d0)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 10, fontWeight: 800 }}>DDA</div>
    ), onClick: () => { setPage("dashboard"); setShowAppsDropdown(false); } },
    { id: "cht", name: "Credit Hold Tracker", icon: (
      <div style={{ width: 28, height: 28, borderRadius: 7, background: `linear-gradient(135deg,${chtAccent},${chtAccentDark})`, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 10, fontWeight: 800 }}>CHT</div>
    ), onClick: () => { setPage("cht-dashboard"); setShowAppsDropdown(false); } },
    { id: "help", name: "Submit Help Ticket", icon: (
      <div style={{ width: 28, height: 28, borderRadius: 7, background: "linear-gradient(135deg,#10b981,#059669)", display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
        <TicketIcon size={14} />
      </div>
    ), onClick: () => { setShowAppsDropdown(false); onOpenHelpTicket?.(); } },
    ...customApps.map((app) => ({
      id: app.id,
      name: app.name,
      icon: (
        <div style={{ width: 28, height: 28, borderRadius: 7, background: "linear-gradient(135deg, #88c0d0, #5b9bd5)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 10, fontWeight: 800 }}>
          {app.abbreviation || app.name.substring(0, 2).toUpperCase()}
        </div>
      ),
      onClick: () => { window.open(app.link, "_blank"); setShowAppsDropdown(false); },
    })),
    ...(isAdmin ? [{ id: "admin", name: "Admin Center", icon: <GearIcon size={20} />, onClick: () => { setPage("admin"); setAdminSection?.("users"); setShowAppsDropdown(false); } }] : []),
  ];

  const navActiveBg = darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)";

  useEffect(() => {
    api.getCustomApps().then(setCustomApps).catch(() => {});
  }, []);

  useEffect(() => {
    const handleClickOutside = () => {
      setShowAppsDropdown(false);
    };
    if (showAppsDropdown) {
      setTimeout(() => document.addEventListener("click", handleClickOutside), 0);
    }
    return () => document.removeEventListener("click", handleClickOutside);
  }, [showAppsDropdown]);

  return (
    <nav style={{
      borderBottom: `1px solid ${t.border}`,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 24px",
      height: 54,
      backdropFilter: "blur(12px)",
      background: darkMode ? "rgba(15,17,20,0.92)" : "rgba(240,237,232,0.88)",
      position: "sticky",
      top: 0,
      zIndex: 100,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div onClick={() => setPage("cht-dashboard")} style={{ display: "flex", alignItems: "center", gap: 9, cursor: "pointer" }}>
          <div style={{
            width: 28,
            height: 28,
            borderRadius: 7,
            background: `linear-gradient(135deg,${chtAccent},${chtAccentDark})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontSize: 9,
            fontWeight: 800,
            letterSpacing: "-0.02em",
          }}>
            CHT
          </div>
          <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.03em", color: t.text }}>
            Credit Hold Tracker
          </span>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0, position: "relative", zIndex: 2 }}>
        {loggedInUser && (
          <div style={{ position: "relative" }}>
            <div
              onClick={(e) => {
                e.stopPropagation();
                setShowProfileMenu(!showProfileMenu);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
                padding: "4px 8px",
                borderRadius: 8,
                background: showProfileMenu ? navActiveBg : "transparent",
              }}
            >
              <div style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: loggedInUser.avatarUrl ? "transparent" : t.accentSoft,
                color: chtAccent,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                overflow: "hidden",
              }}>
                {loggedInUser.avatarUrl ? (
                  <img src={loggedInUser.avatarUrl} alt={loggedInUser.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }} />
                ) : null}
                <span style={{ display: loggedInUser.avatarUrl ? "none" : "flex" }}>
                  {loggedInUser.name.charAt(0)}
                </span>
              </div>
              <span style={{ fontSize: 12, fontWeight: 500, color: t.textMuted }}>
                {loggedInUser.name}
              </span>
              <ChevronDown />
            </div>
            {showProfileMenu && (
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: "absolute",
                  top: "calc(100% + 6px)",
                  right: 0,
                  zIndex: 200,
                  background: t.surface,
                  border: `1px solid ${t.border}`,
                  borderRadius: 10,
                  boxShadow: darkMode ? "0 8px 30px rgba(0,0,0,0.4)" : "0 8px 30px rgba(0,0,0,0.12)",
                  padding: 4,
                  minWidth: 200,
                  animation: "fadeIn 0.15s ease",
                }}
              >
                <div style={{ padding: "10px 12px 8px", borderBottom: `1px solid ${t.border}`, marginBottom: 4 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: t.text }}>{loggedInUser.name}</div>
                  <div style={{ fontSize: 10.5, color: darkMode ? "#6b7280" : "#9ca3af", marginTop: 2 }}>
                    {loggedInUser.groups?.join(", ")}
                  </div>
                </div>
                {[
                  { l: "My Account", i: <UserIcon /> },
                  { l: "Change Password", i: <ShieldIcon /> },
                  { l: "My Subscriptions", i: <BellIcon /> },
                ].map((item) => (
                  <div
                    key={item.l}
                    onClick={() => {
                      setShowProfileMenu(false);
                      if (item.l === "Change Password") {
                        setShowChangePassword(true);
                        setChangePasswordForm({ current: "", new: "", confirm: "" });
                        setChangePasswordError("");
                        setChangePasswordSuccess("");
                      }
                      if (item.l === "My Subscriptions") {
                        setShowSubscriptionsModal(true);
                      }
                    }}
                    className="folder-select-item"
                    style={{
                      padding: "8px 12px",
                      borderRadius: 7,
                      cursor: "pointer",
                      fontSize: 13,
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      color: t.text,
                      fontWeight: 500,
                    }}
                  >
                    <span style={{ color: t.textMuted }}>{item.i}</span> {item.l}
                  </div>
                ))}
                <div style={{ borderTop: `1px solid ${t.border}`, marginTop: 4, paddingTop: 4 }}>
                  <div
                    onClick={() => {
                      setShowProfileMenu(false);
                      handleLogout();
                    }}
                    className="folder-select-item"
                    style={{
                      padding: "8px 12px",
                      borderRadius: 7,
                      cursor: "pointer",
                      fontSize: 13,
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      color: darkMode ? "#f87171" : "#ef4444",
                      fontWeight: 500,
                    }}
                  >
                    <LogOutIcon /> Sign Out
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setShowAppsDropdown(!showAppsDropdown)}
            style={{
              background: showAppsDropdown ? navActiveBg : "transparent",
              border: `1px solid ${t.border}`,
              borderRadius: 7,
              padding: "6px 10px",
              cursor: "pointer",
              color: showAppsDropdown ? chtAccent : t.textMuted,
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 13,
              fontWeight: 600,
              fontFamily: "inherit",
            }}
            title="Applications"
          >
            <AppsIcon size={14} />
          </button>
          {showAppsDropdown && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 6px)",
                right: 0,
                zIndex: 200,
                background: t.surface,
                border: `1px solid ${t.border}`,
                borderRadius: 12,
                boxShadow: darkMode ? "0 8px 30px rgba(0,0,0,0.4)" : "0 8px 30px rgba(0,0,0,0.12)",
                padding: 8,
                animation: "fadeIn 0.15s ease",
              }}
            >
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4 }}>
                {apps.map((app) => (
                  <div
                    key={app.id}
                    onClick={app.onClick}
                    title={app.name}
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 10,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "transparent",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = t.accentSoft}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                  >
                    <div style={{ color: chtAccent, display: "flex", alignItems: "center" }}>
                      {app.icon}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <AlertsDropdown darkMode={darkMode} onNavigate={() => {}} />
        <button
          onClick={() => setDarkMode(!darkMode)}
          style={{
            background: t.surface,
            border: `1px solid ${t.border}`,
            borderRadius: 7,
            padding: 6,
            cursor: "pointer",
            color: t.textMuted,
            display: "flex",
            alignItems: "center",
          }}
        >
          {darkMode ? <SunIcon /> : <MoonIcon />}
        </button>
      </div>
    </nav>
  );
}