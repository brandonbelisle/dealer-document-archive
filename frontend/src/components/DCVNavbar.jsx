import { useState, useEffect, useRef } from "react";
import { UserIcon, ShieldIcon, GearIcon, LogOutIcon, ChevronDown, BellIcon, AppsIcon, HomeIcon, TicketIcon, SearchIcon } from "./Icons";
import AlertsDropdown from "./AlertsDropdown";
import * as api from "../api";

export default function DCVNavbar({ darkMode, setDarkMode, loggedInUser, page, setPage, setShowChangePassword, setChangePasswordForm, setChangePasswordError, setChangePasswordSuccess, handleLogout, setShowSubscriptionsModal, setAdminSection, onOpenHelpTicket, onSelectCustomer }) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showAppsDropdown, setShowAppsDropdown] = useState(false);
  const [customApps, setCustomApps] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  const isAdmin = loggedInUser?.groups?.includes("Administrator");
  const dcvAccent = "#8b5cf6";
  const dcvAccentDark = "#6d28d9";
  const t = {
    accent: dcvAccent,
    accentSoft: darkMode ? "rgba(139,92,246,0.15)" : "rgba(139,92,246,0.08)",
    textMuted: darkMode ? "#94a3b8" : "#57606a",
  };

  const apps = [
    { id: "home", name: "Home", icon: <HomeIcon size={20} />, onClick: () => { setPage("landing"); setShowAppsDropdown(false); } },
    { id: "dda", name: "Dealer Document Archive", permission: "view_dda", icon: (
      <div style={{ width: 28, height: 28, borderRadius: 7, background: "linear-gradient(135deg,#0891b2,#0e7490)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 10, fontWeight: 800 }}>DDA</div>
    ), onClick: () => { setPage("dashboard"); setShowAppsDropdown(false); } },
    { id: "dcv", name: "Dealer Customer Vision", permission: "view_dcv", icon: (
      <div style={{ width: 28, height: 28, borderRadius: 7, background: `linear-gradient(135deg,${dcvAccent},${dcvAccentDark})`, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 10, fontWeight: 800 }}>DCV</div>
    ), onClick: () => { setPage("dcv"); setShowAppsDropdown(false); } },
    { id: "cht", name: "Credit Hold Tracker", permission: "view_cht", icon: (
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
  const surfaceBg = darkMode ? "rgba(15,17,20,0.98)" : "#fff";

  useEffect(() => {
    api.getCustomApps().then(setCustomApps).catch(() => {});
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSearchResults(false);
      }
      setShowAppsDropdown(false);
    };
    if (showAppsDropdown || showSearchResults) {
      setTimeout(() => document.addEventListener("click", handleClickOutside), 0);
    }
    return () => document.removeEventListener("click", handleClickOutside);
  }, [showAppsDropdown, showSearchResults]);

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    if (searchQuery.trim().length < 1) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setSearching(true);
      setShowSearchResults(true);
      try {
        const results = await api.searchDcvCustomers(searchQuery);
        setSearchResults(results);
      } catch (err) {
        console.error('Search error:', err);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  const handleSelectCustomer = (customer) => {
    setSearchQuery("");
    setSearchResults([]);
    setShowSearchResults(false);
    if (onSelectCustomer) {
      onSelectCustomer(customer);
    }
  };

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
      <div style={{ display: "flex", alignItems: "center", gap: 8, color: darkMode ? "#e5e7eb" : "#1f2937", cursor: "pointer" }} onClick={() => setPage("landing")}>
        <div style={{
          width: 24,
          height: 24,
          borderRadius: 6,
          background: `linear-gradient(135deg,${dcvAccent},${dcvAccentDark})`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontSize: 8,
          fontWeight: 800,
        }}>
          DCV
        </div>
        <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.03em" }}>Dealer Customer Vision</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, maxWidth: 400, margin: "0 20px" }}>
        <div ref={searchRef} style={{ position: "relative", width: "100%" }}>
          <div style={{ position: "relative" }}>
            <SearchIcon size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: darkMode ? "#6b7280" : "#9ca3af" }} />
            <input
              type="text"
              placeholder="Search customers by ID or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery.trim().length >= 1 && setShowSearchResults(true)}
              style={{
                width: "100%",
                padding: "8px 12px 8px 36px",
                fontSize: 13,
                border: `1px solid ${darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
                borderRadius: 8,
                background: darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.02)",
                color: darkMode ? "#e5e7eb" : "#1f2937",
                fontFamily: "inherit",
                outline: "none",
              }}
            />
          </div>
          {showSearchResults && (searching || searchResults.length > 0 || searchQuery.trim().length >= 1) && (
            <div style={{
              position: "absolute",
              top: "calc(100% + 4px)",
              left: 0,
              right: 0,
              background: surfaceBg,
              border: `1px solid ${darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
              borderRadius: 8,
              boxShadow: darkMode ? "0 8px 30px rgba(0,0,0,0.4)" : "0 8px 30px rgba(0,0,0,0.12)",
              maxHeight: 300,
              overflowY: "auto",
              zIndex: 200,
            }}>
              {searching ? (
                <div style={{ padding: 16, textAlign: "center", color: darkMode ? "#6b7280" : "#9ca3af", fontSize: 13 }}>
                  Searching...
                </div>
              ) : searchResults.length === 0 ? (
                <div style={{ padding: 16, textAlign: "center", color: darkMode ? "#6b7280" : "#9ca3af", fontSize: 13 }}>
                  No customers found
                </div>
              ) : (
                searchResults.map((customer) => (
                  <div
                    key={customer.id}
                    onClick={() => handleSelectCustomer(customer)}
                    style={{
                      padding: "10px 12px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      borderBottom: `1px solid ${darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}`,
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                  >
                    <div style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      background: `linear-gradient(135deg,${dcvAccent},${dcvAccentDark})`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      fontSize: 11,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}>
                      {customer.name?.charAt(0)?.toUpperCase() || "C"}
                    </div>
                    <div style={{ flex: 1,minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: darkMode ? "#e5e7eb" : "#1f2937", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {customer.name || "Unknown"}
                      </div>
                      <div style={{ fontSize: 11, color: darkMode ? "#6b7280" : "#9ca3af" }}>
                        ID: {customer.cusId}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
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
                  background: loggedInUser.avatarUrl ? "transparent" : (darkMode ? "rgba(139,92,246,0.15)" : "rgba(139,92,246,0.08)"),
                  color: dcvAccent,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  overflow: "hidden",
                }}
              >
                {loggedInUser.avatarUrl ? (
                  <img
                    src={loggedInUser.avatarUrl}
                    alt={loggedInUser.name || "User"}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }}
                  />
                ) : null}
                <span style={{ display: loggedInUser.avatarUrl ? "none" : "flex" }}>
                  {loggedInUser.name?.charAt(0) || "U"}
                </span>
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
                  ...(loggedInUser?.authProvider !== 'saml' ? [{ l: "Change Password", i: <ShieldIcon /> }] : []),
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
                      if (item.l === "Settings") {
                        setPage("settings");
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
        <AlertsDropdown darkMode={darkMode} currentUserId={loggedInUser?.id} onNavigate={(alert) => {
            if (alert.file_id) {
              setPage("dashboard");
              setTimeout(() => {
                setPage("folders");
                setTimeout(() => setPage("file-detail"), 100);
              }, 100);
            }
          }} />
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setShowAppsDropdown(!showAppsDropdown)}
            style={{
              background: showAppsDropdown ? navActiveBg : "transparent",
              border: "none",
              cursor: "pointer",
              color: darkMode ? "#c9d1d9" : "#57606a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 8,
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              fontFamily: "inherit",
              transition: "background 0.2s",
            }}
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
                background: surfaceBg,
                border: `1px solid ${darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
                borderRadius: 12,
                boxShadow: darkMode ? "0 8px 30px rgba(0,0,0,0.4)" : "0 8px 30px rgba(0,0,0,0.12)",
                padding: 8,
                animation: "fadeIn 0.15s ease",
              }}
            >
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4 }}>
                {filteredApps.map((app) => (
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
                    <div style={{ color: t.accent, display: "flex", alignItems: "center" }}>
                      {app.icon}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}