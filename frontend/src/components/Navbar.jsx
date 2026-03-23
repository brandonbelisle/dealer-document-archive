import { useState, useRef, useEffect } from "react";
import { fmtSize } from "../utils/helpers";
import * as api from "../api";
import HighlightedName from "./HighlightedName";
import {
  DashboardIcon,
  FolderClosedIcon,
  InboxIcon,
  UploadCloudIcon,
  SearchIcon,
  XIcon,
  ChevronDown,
  ChevronIcon,
  MapPinIcon,
  FileDocIcon,
  SunIcon,
  MoonIcon,
  UserIcon,
  ShieldIcon,
  GearIcon,
  WrenchIcon,
  LogOutIcon,
  AppsIcon,
  HomeIcon,
  BellIcon,
  MenuIcon,
  LinkIcon,
  TicketIcon,
} from "./Icons";
import AlertsDropdown from "./AlertsDropdown";

export default function Navbar({
  page,
  setPage,
  darkMode,
  setDarkMode,
  isLoggedIn,
  loggedInUser,
  locations,
  departments,
  folders,
  files,
  unsortedFiles,
  stagedFiles,
  activeLocation,
  setActiveLocation,
  activeDepartment,
  setActiveDepartment,
  setActiveFolderId,
  setSelectedFile,
  dashboardData,
  setViewingFileId,
  setFolderSearch,
  expandedLocations,
  setExpandedLocations,
  showDeptDropdown,
  setShowDeptDropdown,
  showProfileMenu,
  setShowProfileMenu,
  setShowChangePassword,
  setChangePasswordForm,
  setChangePasswordError,
  setChangePasswordSuccess,
  setAdminSection,
  handleLogout,
  foldersInLocation,
  foldersInDepartment,
  deptsInLocation,
  filesInFolder,
  setShowSubscriptionsModal,
  setViewingFileIdFromAlert,
  onOpenHelpTicket,
  t,
}) {
  const [globalSearch, setGlobalSearch] = useState("");
  const [globalSearchFocused, setGlobalSearchFocused] = useState(false);
  const globalSearchRef = useRef(null);
  const [searchResults, setSearchResults] = useState({ folders: [], files: [], ocrFiles: [] });
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimer = useRef(null);
  const [showAppsDropdown, setShowAppsDropdown] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1200);
  const [customApps, setCustomApps] = useState([]);

  const isMobile = windowWidth < 1100;
  const needsRightAlign = windowWidth < 1400;

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    api.getCustomApps().then(setCustomApps).catch(() => {});
  }, []);

  const q = globalSearch.trim();

  const isAdmin = loggedInUser?.groups?.includes("Administrator");
  const canViewLocations = loggedInUser?.permissions?.includes("viewLocations") || loggedInUser?.permissions?.includes("viewFiles");

const apps = [
    { id: "home", name: "Home", icon: <HomeIcon size={20} />, onClick: () => { setPage("landing"); setSelectedFile(null); setShowAppsDropdown(false); } },
    { id: "dda", name: "Dealer Document Archive", permission: "view_dda", icon: (
      <div style={{ width: 28, height: 28, borderRadius: 7, background: `linear-gradient(135deg,${t.accent},${t.accentDark || t.accent})`, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 10, fontWeight: 800 }}>DDA</div>
    ), onClick: () => { setPage("dashboard"); setSelectedFile(null); setShowAppsDropdown(false); } },
    { id: "cht", name: "Credit Hold Tracker", permission: "view_cht", icon: (
      <div style={{ width: 28, height: 28, borderRadius: 7, background: "linear-gradient(135deg,#f59e0b,#d97706)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 10, fontWeight: 800 }}>CHT</div>
    ), onClick: () => { setPage("cht-dashboard"); setShowAppsDropdown(false); } },
    { id: "help", name: "Submit Help Ticket", permission: "view_help", icon: (
      <div style={{ width: 28, height: 28, borderRadius: 7, background: "linear-gradient(135deg,#10b981,#059669)", display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
        <TicketIcon size={14} />
      </div>
    ), onClick: () => { setShowAppsDropdown(false); onOpenHelpTicket?.(); } },
    ...customApps
      .filter((app) => loggedInUser?.customAppIds?.includes(app.id))
      .map((app) => ({
        id: app.id,
        name: app.name,
        icon: (
          <div style={{ width: 28, height: 28, borderRadius: 7, background: "linear-gradient(135deg, #88c0d0, #5b9bd5)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 10, fontWeight: 800 }}>
            {app.abbreviation || app.name.substring(0, 2).toUpperCase()}
          </div>
        ),
        onClick: () => { window.open(app.link, "_blank"); setShowAppsDropdown(false); },
      })),
    ...(isAdmin ? [{ id: "admin", name: "Admin Center", icon: <GearIcon size={20} />, onClick: () => { setPage("admin"); setAdminSection("users"); setShowAppsDropdown(false); } }] : []),
  ].filter(app => !app.permission || loggedInUser?.permissions?.includes(app.permission));

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowAppsDropdown(false);
    };
    if (showAppsDropdown) {
      setTimeout(() => document.addEventListener("click", handleClickOutside), 0);
    }
    return () => document.removeEventListener("click", handleClickOutside);
  }, [showAppsDropdown]);

  // Debounced API search
  useEffect(() => {
    if (!q) {
      setSearchResults({ folders: [], files: [], ocrFiles: [] });
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      api.globalSearch(q)
        .then((data) => setSearchResults(data))
        .catch(() => setSearchResults({ folders: [], files: [], ocrFiles: [] }))
        .finally(() => setSearchLoading(false));
    }, 250);
    return () => clearTimeout(searchTimer.current);
  }, [q]);

  const folderResults = searchResults.folders || [];
  const fileResults = searchResults.files || [];
  const ocrResults = searchResults.ocrFiles || [];
  const hasResults = folderResults.length > 0 || fileResults.length > 0 || ocrResults.length > 0;
  const showDropdown = globalSearchFocused && q.length > 0;

  return (
    <nav
      style={{
        borderBottom: `1px solid ${t.border}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        height: 54,
        backdropFilter: "blur(12px)",
        background: darkMode
          ? "rgba(15,17,20,0.92)"
          : "rgba(240,237,232,0.88)",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}
    >
      {/* Left: logo + tabs */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: isMobile ? 8 : 24,
          flexShrink: 0,
          position: "relative",
          zIndex: 2,
        }}
      >
        {/* Mobile menu button */}
        {isMobile && (
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: t.textMuted,
              borderRadius: 8,
            }}
          >
            <MenuIcon size={20} />
          </button>
        )}
        <div
          onClick={() => {
            setPage("dashboard");
            setSelectedFile(null);
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            cursor: "pointer",
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 7,
              background: `linear-gradient(135deg,${t.accent},${t.accentDark})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: 9,
              fontWeight: 800,
              letterSpacing: "-0.02em",
            }}
          >
            DDA
          </div>
          {!isMobile && (
            <span
              style={{
                fontSize: 15,
                fontWeight: 700,
                letterSpacing: "-0.03em",
              }}
            >
              Dealer Document Archive
            </span>
          )}
        </div>
        {!isMobile && (
          <div style={{ display: "flex", gap: 2, marginLeft: 8 }}>
          {/* Dashboard tab */}
          <button
            onClick={() => {
              setPage("dashboard");
              setSelectedFile(null);
            }}
            className="nav-tab"
            style={{
              background:
                page === "dashboard" ? t.navActive : "transparent",
              color: page === "dashboard" ? t.accent : t.textMuted,
              border: "none",
              borderRadius: 8,
              padding: "7px 14px",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 7,
              fontFamily: "inherit",
              borderBottom:
                page === "dashboard"
                  ? `2px solid ${t.accent}`
                  : "2px solid transparent",
            }}
          >
            <DashboardIcon size={15} /> Dashboard
          </button>
          {canViewLocations && (
            <div
              style={{ position: "relative" }}
              onMouseEnter={() => setShowDeptDropdown(true)}
              onMouseLeave={() => setShowDeptDropdown(false)}
            >
              <button
                onClick={() => {
                  setShowDeptDropdown(false);
                  setPage("folders-browse");
                  setSelectedFile(null);
                }}
                className="nav-tab"
                style={{
                  background:
                    page === "folders-browse" ||
                    page === "folders" ||
                    page === "folder-detail"
                      ? t.navActive
                      : "transparent",
                  color:
                    page === "folders-browse" ||
                    page === "folders" ||
                    page === "folder-detail"
                      ? t.accent
                      : t.textMuted,
                  border: "none",
                  borderRadius: 8,
                  padding: "7px 14px",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  fontFamily: "inherit",
                  borderBottom:
                    page === "folders-browse" ||
                    page === "folders" ||
                    page === "folder-detail"
                      ? `2px solid ${t.accent}`
                      : "2px solid transparent",
                }}
              >
                <FolderClosedIcon size={15} /> Folders <ChevronDown />
              </button>
              {showDeptDropdown && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    paddingTop: 6,
                    zIndex: 200,
                  }}
                >
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      background: t.surface,
                      border: `1px solid ${t.border}`,
                      borderRadius: 10,
                      boxShadow: darkMode
                        ? "0 8px 30px rgba(0,0,0,0.4)"
                        : "0 8px 30px rgba(0,0,0,0.12)",
                      padding: 4,
                      minWidth: 340,
                      maxWidth: 400,
                      maxHeight: 480,
                      overflowY: "auto",
                      animation: "fadeIn 0.15s ease",
                    }}
                  >
                    {locations.map((loc) => {
                      const le = expandedLocations[loc.id];
                      return (
                        <div key={loc.id}>
                          <div
                            onClick={() =>
                              setExpandedLocations((p) => ({
                                ...p,
                                [loc.id]: !p[loc.id],
                              }))
                            }
                            className="folder-select-item"
                            style={{
                              padding: "8px 10px",
                              borderRadius: 7,
                              cursor: "pointer",
                              fontSize: 13,
                              fontWeight: 600,
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              color:
                                activeLocation === loc.id
                                  ? t.accent
                                  : t.text,
                            }}
                          >
                            <ChevronIcon open={le} />
                            <MapPinIcon size={14} />
                            <span style={{ flex: 1 }}>{loc.name}</span>
                            <span style={{ fontSize: 9.5, color: t.textDim }}>
                              {dashboardData?.locationFolderCounts?.[loc.id] ?? 0} folders
                            </span>
                          </div>
                          {le && (
                            <div style={{ paddingLeft: 12, marginBottom: 4 }}>
                              {deptsInLocation(loc.id).map((dept) => {
                                const deptData = dashboardData?.deptCounts?.[dept.id] || { folderCount: 0, fileCount: 0 };
                                const isAct =
                                  activeLocation === loc.id &&
                                  activeDepartment === dept.id &&
                                  (page === "folders" || page === "folder-detail");
                                return (
                                  <div
                                    key={dept.id}
                                    onClick={() => {
                                      setActiveLocation(loc.id);
                                      setActiveDepartment(dept.id);
                                      setPage("folders");
                                      setActiveFolderId(null);
                                      setSelectedFile(null);
                                      setFolderSearch("");
                                      setShowDeptDropdown(false);
                                    }}
                                    className="folder-select-item"
                                    style={{
                                      padding: "7px 12px",
                                      borderRadius: 6,
                                      cursor: "pointer",
                                      fontSize: 12.5,
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 9,
                                      background: isAct ? t.accentSoft : "transparent",
                                      color: isAct ? t.accent : t.textMuted,
                                      fontWeight: 500,
                                    }}
                                  >
                                    <FolderClosedIcon size={14} />
                                    <span style={{ flex: 1 }}>{dept.name}</span>
                                    <span style={{ fontSize: 9.5, color: t.textDim }}>
                                      {deptData.folderCount} · {deptData.fileCount} files
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
          {/* Unsorted tab */}
          <button
            onClick={() => setPage("unsorted")}
            className="nav-tab"
            style={{
              background:
                page === "unsorted" ? t.navActive : "transparent",
              color: page === "unsorted" ? t.accent : t.textMuted,
              border: "none",
              borderRadius: 8,
              padding: "7px 14px",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 7,
              fontFamily: "inherit",
              borderBottom:
                page === "unsorted"
                  ? `2px solid ${t.accent}`
                  : "2px solid transparent",
              position: "relative",
            }}
          >
            <InboxIcon size={15} /> Unsorted
            {unsortedFiles.length > 0 && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  background: darkMode
                    ? "rgba(210,153,34,0.15)"
                    : "rgba(180,83,9,0.1)",
                  color: darkMode ? "#d29922" : "#b45309",
                  borderRadius: 10,
                  padding: "1px 6px",
                }}
              >
                {unsortedFiles.length}
              </span>
            )}
          </button>
          {/* Upload tab */}
          <button
            onClick={() => setPage("upload")}
            className="nav-tab"
            style={{
              background:
                page === "upload" ? t.navActive : "transparent",
              color: page === "upload" ? t.accent : t.textMuted,
              border: "none",
              borderRadius: 8,
              padding: "7px 14px",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 7,
              fontFamily: "inherit",
              borderBottom:
                page === "upload"
                  ? `2px solid ${t.accent}`
                  : "2px solid transparent",
            }}
          >
            <UploadCloudIcon size={15} /> Upload
            {stagedFiles.length > 0 && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  background: t.accent,
                  color: "#fff",
                  borderRadius: 10,
                  padding: "1px 6px",
                }}
              >
                {stagedFiles.length}
              </span>
            )}
          </button>
        </div>
        )}
{/* Mobile menu dropdown */}
        {isMobile && showMobileMenu && (
          <div
            style={{
              position: "absolute",
              top: 54,
              left: 0,
              right: 0,
              bottom: 0,
              background: darkMode ? "#0d1117" : "#fff",
              overflowY: "auto",
              zIndex: 150,
            }}
          >
            {/* Navigation items */}
            <div style={{ padding: "8px 0" }}>
              <button
                onClick={() => { setPage("dashboard"); setSelectedFile(null); setShowMobileMenu(false); }}
                style={{
                  width: "100%",
                  background: "transparent",
                  color: t.text,
                  border: "none",
                  padding: "12px 20px",
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 500,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontFamily: "inherit",
                  textAlign: "left",
                }}
              >
                <DashboardIcon size={16} /> Dashboard
              </button>
              <button
                onClick={() => { setPage("folders-browse"); setSelectedFile(null); setShowMobileMenu(false); }}
                style={{
                  width: "100%",
                  background: "transparent",
                  color: t.text,
                  border: "none",
                  padding: "12px 20px",
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 500,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontFamily: "inherit",
                  textAlign: "left",
                }}
              >
                <FolderClosedIcon size={16} /> Folders
              </button>
              <button
                onClick={() => { setPage("unsorted"); setShowMobileMenu(false); }}
                style={{
                  width: "100%",
                  background: "transparent",
                  color: t.text,
                  border: "none",
                  padding: "12px 20px",
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 500,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontFamily: "inherit",
                  textAlign: "left",
                }}
              >
                <InboxIcon size={16} /> Unsorted {unsortedFiles.length > 0 && <span style={{ fontSize: 10, background: darkMode ? "rgba(210,153,34,0.15)" : "rgba(180,83,9,0.1)", color: darkMode ? "#d29922" : "#b45309", borderRadius: 10, padding: "1px 6px" }}>{unsortedFiles.length}</span>}
              </button>
              <button
                onClick={() => { setPage("upload"); setShowMobileMenu(false); }}
                style={{
                  width: "100%",
                  background: "transparent",
                  color: t.text,
                  border: "none",
                  padding: "12px 20px",
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 500,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontFamily: "inherit",
                  textAlign: "left",
                }}
              >
                <UploadCloudIcon size={16} /> Upload {stagedFiles.length > 0 && <span style={{ fontSize: 10, background: t.accent, color: "#fff", borderRadius: 10, padding: "1px 6px" }}>{stagedFiles.length}</span>}
              </button>
            </div>

            {/* Divider */}
            <div style={{ borderTop: `1px solid ${t.border}`, margin: "4px 0" }} />

            {/* Apps section */}
            <div style={{ padding: "8px 0" }}>
              {apps.map((app) => (
                <button
                  key={app.id}
                  onClick={app.onClick}
                  style={{
                    width: "100%",
                    background: "transparent",
                    color: t.text,
                    border: "none",
                    padding: "12px 20px",
                    cursor: "pointer",
                    fontSize: 14,
                    fontWeight: 500,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    fontFamily: "inherit",
                    textAlign: "left",
                  }}
                >
                  <span style={{ color: t.accent, display: "flex", alignItems: "center" }}>{app.icon}</span>
                  {app.name}
                </button>
              ))}
            </div>

            {/* Divider */}
            <div style={{ borderTop: `1px solid ${t.border}`, margin: "4px 0" }} />

            {/* User section */}
            {loggedInUser && (
              <div style={{ padding: "8px 0" }}>
                <div style={{ padding: "8px 20px", color: t.textDim, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {loggedInUser.name}
                </div>
                <button
                  onClick={() => { setShowMobileMenu(false); setShowProfileMenu(true); }}
                  style={{
                    width: "100%",
                    background: "transparent",
                    color: t.text,
                    border: "none",
                    padding: "12px 20px",
                    cursor: "pointer",
                    fontSize: 14,
                    fontWeight: 500,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    fontFamily: "inherit",
                    textAlign: "left",
                  }}
                >
                  <UserIcon size={16} /> My Account
                </button>
                <button
                  onClick={() => { setShowMobileMenu(false); setShowChangePassword(true); setChangePasswordForm({ current: "", new: "", confirm: "" }); setChangePasswordError(""); setChangePasswordSuccess(""); }}
                  style={{
                    width: "100%",
                    background: "transparent",
                    color: t.text,
                    border: "none",
                    padding: "12px 20px",
                    cursor: "pointer",
                    fontSize: 14,
                    fontWeight: 500,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    fontFamily: "inherit",
                    textAlign: "left",
                  }}
                >
                  <ShieldIcon size={16} /> Change Password
                </button>
                <button
                  onClick={() => { setShowMobileMenu(false); setShowSubscriptionsModal(true); }}
                  style={{
                    width: "100%",
                    background: "transparent",
                    color: t.text,
                    border: "none",
                    padding: "12px 20px",
                    cursor: "pointer",
                    fontSize: 14,
                    fontWeight: 500,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    fontFamily: "inherit",
                    textAlign: "left",
                  }}
                >
                  <BellIcon size={16} /> My Subscriptions
                </button>
              </div>
            )}

            {/* Divider */}
            <div style={{ borderTop: `1px solid ${t.border}`, margin: "4px 0" }} />

            {/* Dark mode toggle */}
            <div style={{ padding: "8px 0" }}>
              <button
                onClick={() => { setDarkMode(!darkMode); setShowMobileMenu(false); }}
                style={{
                  width: "100%",
                  background: "transparent",
                  color: t.text,
                  border: "none",
                  padding: "12px 20px",
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 500,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontFamily: "inherit",
                  textAlign: "left",
                }}
              >
                {darkMode ? <SunIcon /> : <MoonIcon />} {darkMode ? "Light Mode" : "Dark Mode"}
              </button>
              <button
                onClick={() => { handleLogout(); setShowMobileMenu(false); }}
                style={{
                  width: "100%",
                  background: "transparent",
                  color: t.error,
                  border: "none",
                  padding: "12px 20px",
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 500,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontFamily: "inherit",
                  textAlign: "left",
                }}
              >
                <LogOutIcon size={16} /> Sign Out
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Center: Global search */}
      {isLoggedIn && (
        <div
          style={{
            flex: "1 1 auto",
            display: "flex",
            justifyContent: "center",
            padding: "0 16px",
            minWidth: 180,
            maxWidth: 480,
            zIndex: 1,
          }}
        >
          <div
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: darkMode
                ? "rgba(255,255,255,0.05)"
                : "rgba(0,0,0,0.04)",
              border: `1px solid ${showDropdown && hasResults ? t.accent : t.border}`,
              borderRadius: 9,
              padding: "6px 12px",
              transition: "border-color 0.2s",
            }}
          >
            <SearchIcon size={15} />
            <input
              ref={globalSearchRef}
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              onFocus={() => setGlobalSearchFocused(true)}
              onBlur={() =>
                setTimeout(() => setGlobalSearchFocused(false), 200)
              }
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setGlobalSearch("");
                  globalSearchRef.current?.blur();
                }
              }}
              placeholder="Search..."
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                  fontSize: 13,
                  color: t.text,
                  outline: "none",
                  fontFamily: "inherit",
                }}
              />
              {q && (
                <button
                  onClick={() => setGlobalSearch("")}
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: t.textDim,
                    display: "flex",
                    padding: 2,
                  }}
                >
                  <XIcon size={13} />
                </button>
              )}
            </div>
            {showDropdown && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 6px)",
                  left: 0,
                  right: 0,
                  zIndex: 300,
                  background: t.surface,
                  border: `1px solid ${t.border}`,
                  borderRadius: 12,
                  boxShadow: darkMode
                    ? "0 12px 40px rgba(0,0,0,0.5)"
                    : "0 12px 40px rgba(0,0,0,0.15)",
                  overflow: "hidden",
                  animation: "fadeIn 0.15s ease",
                  maxHeight: 420,
                  overflowY: "auto",
                }}
              >
                {!hasResults && (
                  <div
                    style={{
                      padding: "20px 16px",
                      textAlign: "center",
                      color: t.textDim,
                      fontSize: 12.5,
                    }}
                  >
                    {searchLoading ? "Searching..." : `No results for "${q}"`}
                  </div>
                )}
                {folderResults.length > 0 && (
                  <div>
                    <div
                      style={{
                        padding: "10px 14px 4px",
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: t.textDim,
                      }}
                    >
                      Folders
                    </div>
                    {folderResults.map((folder) => (
                        <div
                          key={folder.id}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            if (folder.locationId)
                              setActiveLocation(folder.locationId);
                            if (folder.departmentId)
                              setActiveDepartment(folder.departmentId);
                            setActiveFolderId(folder.id);
                            setPage("folder-detail");
                            setGlobalSearch("");
                            setGlobalSearchFocused(false);
                          }}
                          className="folder-select-item"
                          style={{
                            padding: "8px 14px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            fontSize: 13,
                          }}
                        >
                          <div
                            style={{
                              color: t.accent,
                              flexShrink: 0,
                            }}
                          >
                            <FolderClosedIcon size={16} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600 }}>
                              <HighlightedName
                                name={folder.name}
                                query={q}
                                accentColor={t.accent}
                              />
                            </div>
                            <div
                              style={{
                                fontSize: 10.5,
                                color: t.textDim,
                              }}
                            >
                              {folder.locationName || ""}
                              {folder.departmentName ? ` / ${folder.departmentName}` : ""}
                            </div>
                          </div>
                          <span
                            style={{
                              fontSize: 10,
                              color: t.textDim,
                              flexShrink: 0,
                            }}
                          >
                            {folder.fileCount} files
                          </span>
                        </div>
                    ))}
                  </div>
                )}
                {folderResults.length > 0 && fileResults.length > 0 && (
                  <div
                    style={{ borderTop: `1px solid ${t.border}` }}
                  />
                )}
                {fileResults.length > 0 && (
                  <div>
                    <div
                      style={{
                        padding: "10px 14px 4px",
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: t.textDim,
                      }}
                    >
                      Files
                    </div>
                    {fileResults.map((file) => (
                        <div
                          key={file.id}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            if (file.folderId) {
                              if (file.locationId)
                                setActiveLocation(file.locationId);
                              if (file.departmentId)
                                setActiveDepartment(file.departmentId);
                              setActiveFolderId(file.folderId);
                            }
                            setViewingFileId(file.id);
                            setPage("file-detail");
                            setGlobalSearch("");
                            setGlobalSearchFocused(false);
                          }}
                          className="folder-select-item"
                          style={{
                            padding: "8px 14px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            fontSize: 13,
                          }}
                        >
                          <div
                            style={{
                              color: t.success,
                              flexShrink: 0,
                            }}
                          >
                            <FileDocIcon size={16} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600 }}>
                              <HighlightedName
                                name={file.name}
                                query={q}
                                accentColor={t.accent}
                              />
                            </div>
                            <div
                              style={{
                                fontSize: 10.5,
                                color: t.textDim,
                              }}
                            >
                              {file.folderId
                                ? `${file.locationName || ""}${file.departmentName ? ` / ${file.departmentName}` : ""}${file.folderName ? ` / ${file.folderName}` : ""}`
                                : "Unsorted"}
                            </div>
                          </div>
                          <span
                            style={{
                              fontSize: 10,
                              color: t.textDim,
                              flexShrink: 0,
                            }}
                          >
                            {fmtSize(file.size)}
                          </span>
                        </div>
                    ))}
                  </div>
                )}
                {(folderResults.length > 0 || fileResults.length > 0) && ocrResults.length > 0 && (
                  <div
                    style={{ borderTop: `1px solid ${t.border}` }}
                  />
                )}
                {ocrResults.length > 0 && (
                  <div>
                    <div
                      style={{
                        padding: "10px 14px 4px",
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: t.textDim,
                      }}
                    >
                      OCR Advanced Search
                    </div>
                    {ocrResults.map((file) => (
                        <div
                          key={`ocr-${file.id}`}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            if (file.folderId) {
                              if (file.locationId)
                                setActiveLocation(file.locationId);
                              if (file.departmentId)
                                setActiveDepartment(file.departmentId);
                              setActiveFolderId(file.folderId);
                            }
                            setViewingFileId(file.id);
                            setPage("file-detail");
                            setGlobalSearch("");
                            setGlobalSearchFocused(false);
                          }}
                          className="folder-select-item"
                          style={{
                            padding: "8px 14px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            fontSize: 13,
                          }}
                        >
                          <div
                            style={{
                              color: "#8b5cf6",
                              flexShrink: 0,
                            }}
                          >
                            <FileDocIcon size={16} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600 }}>
                              <HighlightedName
                                name={file.name}
                                query={q}
                                accentColor={t.accent}
                              />
                            </div>
                            <div
                              style={{
                                fontSize: 10.5,
                                color: t.textDim,
                              }}
                            >
                              {file.folderId
                                ? `${file.locationName || ""}${file.departmentName ? ` / ${file.departmentName}` : ""}${file.folderName ? ` / ${file.folderName}` : ""}`
                                : "Unsorted"}
                            </div>
                          </div>
                          <span
                            style={{
                              fontSize: 10,
                              color: t.textDim,
                              flexShrink: 0,
                            }}
                          >
                            {fmtSize(file.size)}
                          </span>
                        </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Right: profile + dark mode */}
      {!isMobile && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexShrink: 0,
            position: "relative",
            zIndex: 2,
          }}
        >
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
                background: showProfileMenu
                  ? t.navActive
                  : "transparent",
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: loggedInUser.avatarUrl ? "transparent" : t.accentSoft,
                  color: t.accent,
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
                    alt={loggedInUser.name} 
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }}
                  />
                ) : null}
                <span style={{ display: loggedInUser.avatarUrl ? "none" : "flex" }}>
                  {loggedInUser.name.charAt(0)}
                </span>
              </div>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: t.textMuted,
                }}
              >
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
                  boxShadow: darkMode
                    ? "0 8px 30px rgba(0,0,0,0.4)"
                    : "0 8px 30px rgba(0,0,0,0.12)",
                  padding: 4,
                  minWidth: 200,
                  animation: "fadeIn 0.15s ease",
                }}
              >
                <div
                  style={{
                    padding: "10px 12px 8px",
                    borderBottom: `1px solid ${t.border}`,
                    marginBottom: 4,
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600 }}>
                    {loggedInUser.name}
                  </div>
                  <div
                    style={{
                      fontSize: 10.5,
                      color: t.textDim,
                      marginTop: 2,
                    }}
                  >
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
                        setChangePasswordForm({
                          current: "",
                          new: "",
                          confirm: "",
                        });
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
                    <span style={{ color: t.textMuted }}>{item.i}</span>{" "}
                    {item.l}
                  </div>
                ))}
                <div
                    style={{
                      borderTop: `1px solid ${t.border}`,
                      marginTop: 4,
                      paddingTop: 4,
                    }}
                  >
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
                        color: t.error,
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
              background: showAppsDropdown ? t.navActive : t.surface,
              border: `1px solid ${t.border}`,
              borderRadius: 7,
              padding: "6px 10px",
              cursor: "pointer",
              color: showAppsDropdown ? t.accent : t.textMuted,
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
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 4,
                }}
              >
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
                    <div style={{ color: t.accent, display: "flex", alignItems: "center" }}>
                      {app.icon}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <AlertsDropdown darkMode={darkMode} onNavigate={(alert) => {
            if (alert.file_id) {
              setActiveFolderId(alert.folder_id || null);
              if (alert.folder_id) {
                setPage("folders");
              } else {
                setPage("unsorted");
              }
              setTimeout(() => {
                setViewingFileIdFromAlert(alert.file_id);
              }, 100);
            }
          }} />
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
      )}
    </nav>
  );
}
