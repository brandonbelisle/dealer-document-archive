import { useState } from "react";
import { SunIcon, MoonIcon, UserIcon, ArrowLeftIcon, ShieldIcon, GearIcon, LogOutIcon, ChevronDown, BellIcon } from "./Icons";
import AlertsDropdown from "./AlertsDropdown";

export default function LandingNavbar({ darkMode, setDarkMode, loggedInUser, page, setPage, setShowChangePassword, setChangePasswordForm, setChangePasswordError, setChangePasswordSuccess, handleLogout, setShowSubscriptionsModal }) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const showBackButton = page === "admin";

  const navActiveBg = darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)";
  const surfaceBg = darkMode ? "rgba(15,17,20,0.98)" : "#fff";

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      height: 55,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 20px",
      gap: 12,
      borderBottom: `1px solid ${darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
      background: darkMode ? "rgba(13,17,23,0.95)" : "rgba(255,255,255,0.95)",
      backdropFilter: "blur(12px)",
      zIndex: 100,
    }}>
      <div style={{ display: "flex", alignItems: "center" }}>
        {showBackButton && (
          <button
            onClick={() => setPage("landing")}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: darkMode ? "#c9d1d9" : "#57606a",
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              fontFamily: "inherit",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)"}
            onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
          >
            <ArrowLeftIcon /> Back
          </button>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, position: "relative" }}>
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
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: darkMode ? "rgba(136,192,208,0.15)" : "rgba(6,78,59,0.08)",
                  color: darkMode ? "#88c0d0" : "#064e3b",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                }}
              >
                {loggedInUser.name?.charAt(0) || "U"}
              </div>
              <span style={{ fontSize: 12, fontWeight: 500, color: darkMode ? "#94a3b8" : "#57606a" }}>
                {loggedInUser.name || "User"}
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
                  background: surfaceBg,
                  border: `1px solid ${darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
                  borderRadius: 10,
                  boxShadow: darkMode ? "0 8px 30px rgba(0,0,0,0.4)" : "0 8px 30px rgba(0,0,0,0.12)",
                  padding: 4,
                  minWidth: 200,
                  animation: "fadeIn 0.15s ease",
                }}
              >
                <div style={{ padding: "10px 12px 8px", borderBottom: `1px solid ${darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`, marginBottom: 4 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: darkMode ? "#e5e7eb" : "#1f2937" }}>
                    {loggedInUser.name}
                  </div>
                  <div style={{ fontSize: 10.5, color: darkMode ? "#6b7280" : "#9ca3af", marginTop: 2 }}>
                    {loggedInUser.groups?.join(", ")}
                  </div>
                </div>
                {[
                  { l: "My Account", i: <UserIcon /> },
                  { l: "Change Password", i: <ShieldIcon /> },
                  { l: "My Subscriptions", i: <BellIcon /> },
                  { l: "Settings", i: <GearIcon /> },
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
                      color: darkMode ? "#e5e7eb" : "#1f2937",
                      fontWeight: 500,
                    }}
                  >
                    <span style={{ color: darkMode ? "#6b7280" : "#9ca3af" }}>{item.i}</span> {item.l}
                  </div>
                ))}
                <div style={{ borderTop: `1px solid ${darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`, marginTop: 4, paddingTop: 4 }}>
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
        <AlertsDropdown darkMode={darkMode} onNavigate={(alert) => {
            if (alert.file_id) {
              setPage("dashboard");
              setTimeout(() => {
                setPage("folders");
                setTimeout(() => setPage("file-detail"), 100);
              }, 100);
            }
          }} />
        <button
          onClick={() => setDarkMode(!darkMode)}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: darkMode ? "#c9d1d9" : "#57606a",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 8,
            borderRadius: 8,
            transition: "background 0.2s",
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)"}
          onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
        >
          {darkMode ? <SunIcon /> : <MoonIcon />}
        </button>
      </div>
    </div>
  );
}