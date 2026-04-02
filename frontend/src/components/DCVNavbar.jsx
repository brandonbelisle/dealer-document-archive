import { useState, useEffect } from "react";
import { SunIcon, MoonIcon, UserIcon, GearIcon, LogOutIcon, ChevronDown, BellIcon, AppsIcon, HomeIcon, TicketIcon } from "./Icons";
import AlertsDropdown from "./AlertsDropdown";
import * as api from "../api";

export default function DCVNavbar({ darkMode, setDarkMode, loggedInUser, page, setPage, setShowChangePassword, setChangePasswordForm, setChangePasswordError, setChangePasswordSuccess, handleLogout, setShowSubscriptionsModal, setAdminSection, onOpenHelpTicket }) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showAppsDropdown, setShowAppsDropdown] = useState(false);
  const [customApps, setCustomApps] = useState([]);

  const isAdmin = loggedInUser?.groups?.includes("Administrator");
  const dcvAccent = "#8b5cf6";
  const dcvAccentDark = "#6d28d9";
  const t = {
    accent: dcvAccent,
    accentSoft: darkMode ? "rgba(139,92,246,0.15)" : "rgba(139,92,246,0.08)",
    textMuted: darkMode ? "#94a3b8" : "#57606a",
    text: darkMode ? "#e5e7eb" : "#1f2937",
    border: darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
    surface: darkMode ? "#0d1117" : "#fff",
    navActive: darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)",
  };

  const apps = [
    { id: "home", name: "Home", icon: <HomeIcon size={20} />, onClick: () => { setPage("landing"); setShowAppsDropdown(false); } },
    { id: "dda", name: "Dealer Document Archive", icon: (
      <div style={{ width: 28, height: 28, borderRadius: 7, background: "linear-gradient(135deg,#0891b2,#0e7490)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 10, fontWeight: 800 }}>DDA</div>
    ), onClick: () => { setPage("dashboard"); setShowAppsDropdown(false); } },
    { id: "dcv", name: "Dealer Customer Vision", permission: "view_dcv", icon: (
      <div style={{ width: 28, height: 28, borderRadius: 7, background: `linear-gradient(135deg,${dcvAccent},${dcvAccentDark})`, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 10, fontWeight: 800 }}>DCV</div>
    ), onClick: () => { setPage("dcv"); setShowAppsDropdown(false); } },
    { id: "cht", name: "Credit Hold Tracker", icon: (
      <div style={{ width: 28, height: 28, borderRadius: 7, background: "linear-gradient(135deg,#f59e0b,#d97706)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 10, fontWeight: 800 }}>CHT</div>
    ), onClick: () => { setPage("cht"); setShowAppsDropdown(false); } },
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

  const filteredApps = apps.filter(app => !app.permission || loggedInUser?.permissions?.includes(app.permission));

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
        <div onClick={() => setPage("landing")} style={{ display: "flex", alignItems: "center", gap: 9, cursor: "pointer" }}>
          <div style={{
            width: 28,
            height: 28,
            borderRadius: 7,
            background: `linear-gradient(135deg,${dcvAccent},${dcvAccentDark})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontSize: 9,
            fontWeight: 800,
            letterSpacing: "-0.02em",
          }}>
            DCV
          </div>
          <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.03em", color: t.text }}>
            Dealer Customer Vision
          </span>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0, position: "relative", zIndex: 2 }}>
        {loggedInUser && (
          <div style={{ position: "relative" }}>
            <AlertsDropdown
              darkMode={darkMode}
              currentUserId={loggedInUser?.id}
              onNavigate={(alert) => {
                if (alert.type === 'cht_inquiry_assigned' || alert.type === 'cht_inquiry_updated') {
                  setPage("cht");
                }
              }}
              onShowToast={() => {}}
            />
          </div>
        )}

        <div style={{ position: "relative" }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowAppsDropdown(!showAppsDropdown);
            }}
            style={{
              background: showAppsDropdown ? navActiveBg : "transparent",
              border: "none",
              borderRadius: 8,
              padding: "6px 10px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              color: t.textMuted,
              fontFamily: "inherit",
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            <AppsIcon size={18} />
            <span style={{ display: window.innerWidth < 600 ? "none" : "inline" }}>Apps</span>
            <ChevronDown />
          </button>
          {showAppsDropdown && (
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
                minWidth: 220,
                animation: "fadeIn 0.15s ease",
              }}
            >
              {filteredApps.map((app) => (
                <button
                  key={app.id}
                  onClick={() => app.onClick?.()}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    width: "100%",
                    padding: "10px 12px",
                    background: "transparent",
                    border: "none",
                    borderRadius: 6,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    fontSize: 13,
                    fontWeight: 500,
                    color: t.text,
                    textAlign: "left",
                  }}
                >
                  {app.icon}
                  {app.name}
                </button>
              ))}
            </div>
          )}
        </div>

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
                color: dcvAccent,
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
                {isAdmin && (
                  <button
                    onClick={() => {
                      setPage("admin");
                      setAdminSection?.("users");
                      setShowProfileMenu(false);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      width: "100%",
                      padding: "10px 12px",
                      background: "transparent",
                      border: "none",
                      borderRadius: 6,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      fontSize: 13,
                      fontWeight: 500,
                      color: t.text,
                      textAlign: "left",
                    }}
                  >
                    <GearIcon size={16} /> Admin Center
                  </button>
                )}
                {(loggedInUser?.permissions?.includes("view_dda") || loggedInUser?.permissions?.includes("viewLocations") || loggedInUser?.permissions?.includes("viewFiles")) && (
                  <button
                    onClick={() => {
                      setPage("dashboard");
                      setShowProfileMenu(false);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      width: "100%",
                      padding: "10px 12px",
                      background: "transparent",
                      border: "none",
                      borderRadius: 6,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      fontSize: 13,
                      fontWeight: 500,
                      color: t.text,
                      textAlign: "left",
                    }}
                  >
                    Dashboard
                  </button>
                )}
                <button
                  onClick={() => { setDarkMode(!darkMode); setShowProfileMenu(false); }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    width: "100%",
                    padding: "10px 12px",
                    background: "transparent",
                    border: "none",
                    borderRadius: 6,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    fontSize: 13,
                    fontWeight: 500,
                    color: t.text,
                    textAlign: "left",
                  }}
                >
                  {darkMode ? <SunIcon size={16} /> : <MoonIcon size={16} />}
                  {darkMode ? "Light Mode" : "Dark Mode"}
                </button>
                <button
                  onClick={() => { handleLogout(); setShowProfileMenu(false); }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    width: "100%",
                    padding: "10px 12px",
                    background: "transparent",
                    border: "none",
                    borderRadius: 6,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    fontSize: 13,
                    fontWeight: 500,
                    color: "#ef4444",
                    textAlign: "left",
                  }}
                >
                  <LogOutIcon size={16} /> Logout
                </button>
              </div>
            )}
          </div>
        )}

        <button
          onClick={() => setDarkMode(!darkMode)}
          style={{
            background: "transparent",
            border: `1px solid ${t.border}`,
            borderRadius: 8,
            padding: 8,
            cursor: "pointer",
            color: t.textMuted,
            display: "flex",
          }}
        >
          {darkMode ? <SunIcon /> : <MoonIcon />}
        </button>
      </div>
    </nav>
  );
}