import { useState, useRef, useEffect } from "react";
import * as api from "../api";
import { Btn, SmallBtn } from "../components/ui/Btn";
import PermToggle from "../components/ui/PermToggle";
import GroupAccessEditor from "../components/GroupAccessEditor";
import SubscribeButton from "../components/SubscribeButton";
import AddUserModal from "../components/modals/AddUserModal";
import EditUserModal from "../components/modals/EditUserModal";
import { ADMIN_MENU, PERMISSION_LABELS, PERMISSION_CATEGORIES } from "../constants";
import {
  PlusIcon,
  XIcon,
  EditIcon,
  TrashIcon,
  ShieldIcon,
  MapPinIcon,
  LayersIcon,
  SearchIcon,
  ClipboardIcon,
  FolderClosedIcon,
  UploadCloudIcon,
} from "../components/Icons";

function SettingsSection({ t, darkMode }) {
  const [darkLogo, setDarkLogo] = useState(null);
  const [lightLogo, setLightLogo] = useState(null);
  const [uploading, setUploading] = useState({ dark: false, light: false });
  const darkInputRef = useRef(null);
  const lightInputRef = useRef(null);

  useEffect(() => {
    loadLogos();
  }, []);

  const loadLogos = async () => {
    try {
      const logos = await api.getLogos();
      setDarkLogo(logos.darkLogo);
      setLightLogo(logos.lightLogo);
    } catch (err) {
      console.error("Failed to load logos:", err);
    }
  };

  const handleUpload = async (type, file) => {
    if (!file) return;
    setUploading((prev) => ({ ...prev, [type]: true }));
    try {
      await api.uploadLogo(type, file);
      await loadLogos();
    } catch (err) {
      console.error("Failed to upload logo:", err);
      alert("Failed to upload logo: " + (err.message || "Unknown error"));
    } finally {
      setUploading((prev) => ({ ...prev, [type]: false }));
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, marginBottom: 8 }}>Branding</h2>
        <p style={{ fontSize: 13, color: t.textMuted, margin: 0 }}>
          Upload logos to customize the appearance of the landing page.
        </p>
      </div>

      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        {/* Dark Mode Logo */}
        <div style={{ flex: 1, minWidth: 280, maxWidth: 400 }}>
          <div style={{
            background: t.surface,
            border: `1px solid ${t.border}`,
            borderRadius: 12,
            padding: 20,
          }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: t.text, display: "block", marginBottom: 8 }}>
              Dark Mode Logo
            </label>
            <p style={{ fontSize: 11, color: t.textDim, margin: "0 0 16px" }}>
              Displayed when dark mode is active. Recommended: PNG or SVG with transparent background.
            </p>
            <div style={{
              background: darkMode ? "#1a1a1a" : "#f5f5f5",
              borderRadius: 8,
              padding: 24,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 80,
              marginBottom: 16,
            }}>
              {darkLogo ? (
                <img
                  src={`${darkLogo}?t=${Date.now()}`}
                  alt="Dark Mode Logo"
                  style={{ maxHeight: 60, maxWidth: "100%", objectFit: "contain" }}
                  onError={() => setDarkLogo(null)}
                />
              ) : (
                <span style={{ fontSize: 12, color: t.textMuted }}>No logo uploaded</span>
              )}
            </div>
            <input
              ref={darkInputRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              style={{ display: "none" }}
              onChange={(e) => handleUpload("dark", e.target.files[0])}
            />
            <Btn
              darkMode={darkMode}
              t={t}
              onClick={() => darkInputRef.current?.click()}
              loading={uploading.dark}
              style={{ width: "100%", fontSize: 12 }}
            >
              <UploadCloudIcon size={14} /> Upload Dark Logo
            </Btn>
          </div>
        </div>

        {/* Light Mode Logo */}
        <div style={{ flex: 1, minWidth: 280, maxWidth: 400 }}>
          <div style={{
            background: t.surface,
            border: `1px solid ${t.border}`,
            borderRadius: 12,
            padding: 20,
          }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: t.text, display: "block", marginBottom: 8 }}>
              Light Mode Logo
            </label>
            <p style={{ fontSize: 11, color: t.textDim, margin: "0 0 16px" }}>
              Displayed when light mode is active. Recommended: PNG or SVG with transparent background.
            </p>
            <div style={{
              background: darkMode ? "#f5f5f5" : "#ffffff",
              borderRadius: 8,
              padding: 24,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 80,
              marginBottom: 16,
              border: `1px solid ${t.border}`,
            }}>
              {lightLogo ? (
                <img
                  src={`${lightLogo}?t=${Date.now()}`}
                  alt="Light Mode Logo"
                  style={{ maxHeight: 60, maxWidth: "100%", objectFit: "contain" }}
                  onError={() => setLightLogo(null)}
                />
              ) : (
                <span style={{ fontSize: 12, color: "#666" }}>No logo uploaded</span>
              )}
            </div>
            <input
              ref={lightInputRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              style={{ display: "none" }}
              onChange={(e) => handleUpload("light", e.target.files[0])}
            />
            <Btn
              darkMode={darkMode}
              t={t}
              onClick={() => lightInputRef.current?.click()}
              loading={uploading.light}
              style={{ width: "100%", fontSize: 12 }}
            >
              <UploadCloudIcon size={14} /> Upload Light Logo
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminPage({
  adminSection,
  setAdminSection,
  setPage,
  // Users
  adminUsers,
  setAdminUsers,
  setAdminSetPasswordUserId,
  setAdminSetPasswordForm,
  setAdminSetPasswordError,
  setAdminSetPasswordSuccess,
  // Groups
  securityGroups,
  setSecurityGroups,
  editingGroupId,
  setEditingGroupId,
  addingGroup,
  setAddingGroup,
  newGroupName,
  setNewGroupName,
  newGroupDesc,
  setNewGroupDesc,
  setWarningModal,
  // Current user
  loggedInUser,
  // Locations
  locations,
  setLocations,
  addingLocation,
  setAddingLocation,
  newLocationName,
  setNewLocationName,
  editingLocationId,
  setEditingLocationId,
  editingLocationName,
  setEditingLocationName,
  foldersInLocation,
  filesInFolder,
  handleDeleteLocation,
  // Departments
  departments,
  setDepartments,
  deptsInLocation,
  foldersInDepartment,
  addingDept,
  setAddingDept,
  addingDeptLocId,
  setAddingDeptLocId,
  newDeptName,
  setNewDeptName,
  editingDeptId,
  setEditingDeptId,
  editingDeptName,
  setEditingDeptName,
  handleDeleteDept,
  // Audit
  auditLog,
  auditFilterUser,
  setAuditFilterUser,
  auditFilterAction,
  setAuditFilterAction,
  auditFilterDate,
  setAuditFilterDate,
  // Access control
  locationAccess,
  setLocationAccess,
  departmentAccess,
  setDepartmentAccess,
// Subscriptions
  subscriptions,
  setSubscriptions,
  t,
  darkMode,
  addToast,
}) {
  const [auditPage, setAuditPage] = useState(1);
  const [auditPageSize, setAuditPageSize] = useState(25);
  const [showAddUser, setShowAddUser] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showEditUser, setShowEditUser] = useState(false);

  const editLocRef = useRef(null);
  const addLocRef = useRef(null);
  const editDeptRef = useRef(null);
  const addDeptRef = useRef(null);

  const handleDeleteUser = (user) => {
    if (user.id === loggedInUser?.id) return;
    setWarningModal({
      title: "Delete User",
      message: `Are you sure you want to delete "${user.name}"? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          await api.deleteUser(user.id);
          setAdminUsers((prev) => prev.filter((u) => u.id !== user.id));
          addToast("User deleted", `"${user.name}" has been deleted`, 4000, "delete");
        } catch (err) {
          console.error("Failed to delete user:", err);
        }
        setWarningModal(null);
      },
    });
  };

  const handleSubscribe = (newSub) => {
    setSubscriptions((prev) => [...prev, newSub]);
  };

  const handleUnsubscribe = (subId) => {
    setSubscriptions((prev) => prev.filter((s) => s.id !== subId));
  };

  useEffect(() => { if (editingLocationId && editLocRef.current) editLocRef.current.focus(); }, [editingLocationId]);
  useEffect(() => { if (addingLocation && addLocRef.current) addLocRef.current.focus(); }, [addingLocation]);
  useEffect(() => { if (editingDeptId && editDeptRef.current) editDeptRef.current.focus(); }, [editingDeptId]);
  useEffect(() => { if (addingDept && addDeptRef.current) addDeptRef.current.focus(); }, [addingDept]);

  const adminActiveMenu = ADMIN_MENU.find((m) => m.id === adminSection);
  const demoUsers = adminUsers;
  const demoGroups = securityGroups.map((g) => ({
    ...g,
    members: g.memberCount || 0,
    permCount: g.permissions ? Object.values(g.permissions).filter(Boolean).length : 0,
  }));

  // All groups for the access editor (simple id/name list)
  const allGroupsSimple = securityGroups.map((g) => ({ id: g.id, name: g.name }));

  // Group permission helpers
  const togglePerm = (groupId, perm) => {
    setSecurityGroups((p) => {
      const updated = p.map((g) => g.id === groupId ? { ...g, permissions: { ...g.permissions, [perm]: !g.permissions[perm] } } : g);
      const group = updated.find((g) => g.id === groupId);
      if (group) api.updateGroupPermissions(groupId, group.permissions).catch(console.error);
      return updated;
    });
  };
  const toggleAllInCategory = (groupId, category, value) => {
    const permsInCat = Object.entries(PERMISSION_LABELS).filter(([, v]) => v.category === category).map(([k]) => k);
    setSecurityGroups((p) => {
      const updated = p.map((g) => g.id === groupId ? { ...g, permissions: { ...g.permissions, ...Object.fromEntries(permsInCat.map((pk) => [pk, value])) } } : g);
      const group = updated.find((g) => g.id === groupId);
      if (group) api.updateGroupPermissions(groupId, group.permissions).catch(console.error);
      return updated;
    });
  };
  const deleteGroup = (group) => {
    setWarningModal({
      title: `Delete "${group.name}"?`,
      message: `This will permanently remove the "${group.name}" security group. Users assigned to this group will lose these permissions.`,
      onConfirm: async () => {
        try { 
          await api.deleteGroup(group.id);
          addToast("Group deleted", `"${group.name}" has been deleted`, 4000, "delete");
        } catch (err) { console.error(err); }
        setSecurityGroups((p) => p.filter((g) => g.id !== group.id));
        if (editingGroupId === group.id) setEditingGroupId(null);
      },
    });
  };
  const addNewGroup = async () => {
    const n = newGroupName.trim();
    if (!n) return;
    try {
      const defaultPerms = { viewFiles: true, uploadFiles: false, deleteFiles: false, renameFiles: false, createFolders: false, deleteFolders: false, manageLocations: false, manageDepartments: false, manageUsers: false, manageGroups: false, viewAuditLog: false, exportAuditLog: false, manageSettings: false };
      const created = await api.createGroup(n, newGroupDesc.trim() || "Custom security group", defaultPerms);
      const newG = { id: created.id, name: created.name, desc: created.description, permissions: created.permissions || defaultPerms, memberCount: 0 };
      setSecurityGroups((p) => [...p, newG]);
      setEditingGroupId(newG.id);
      addToast("Group created", `"${n}" has been created`, 4000, "create");
    } catch (err) { console.error(err); }
    setAddingGroup(false);
    setNewGroupName("");
    setNewGroupDesc("");
  };

  const editingGroup = editingGroupId ? securityGroups.find((g) => g.id === editingGroupId) : null;

  // Access control handlers
  const handleSaveLocationAccess = async (locationId, groupIds) => {
    await api.updateLocationAccess(locationId, groupIds);
    // Refresh access data
    const data = await api.getLocationAccess();
    setLocationAccess(data);
  };

  const handleSaveDepartmentAccess = async (departmentId, groupIds) => {
    await api.updateDepartmentAccess(departmentId, groupIds);
    const data = await api.getDepartmentAccess();
    setDepartmentAccess(data);
  };

  // Audit
  const allActions = [...new Set(auditLog.map((e) => e.action))];
  const allUsers = [...new Set(auditLog.map((e) => e.user))];
  const filtered = auditLog.filter((e) => {
    if (auditFilterAction && e.action !== auditFilterAction) return false;
    if (auditFilterUser && e.user !== auditFilterUser) return false;
    if (auditFilterDate) {
      const entryDate = new Date(e.timestamp).toISOString().split("T")[0];
      if (entryDate !== auditFilterDate) return false;
    }
    return true;
  });
  const auditTotalPages = Math.max(1, Math.ceil(filtered.length / auditPageSize));
  const auditPageSafe = Math.min(auditPage, auditTotalPages);
  const auditPageStart = (auditPageSafe - 1) * auditPageSize;
  const auditPageEnd = auditPageStart + auditPageSize;
  const auditPageEntries = filtered.slice(auditPageStart, auditPageEnd);
  const handleAuditFilterChange = (setter) => (e) => { setter(e.target.value); setAuditPage(1); };
  const exportCSV = () => {
    const header = "Action,Detail,User,Date,Time";
    const rows = filtered.map((e) => {
      const d = new Date(e.timestamp);
      const date = d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
      const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const detail = e.detail.replace(/"/g, '""');
      return `"${e.action}","${detail}","${e.user}","${date}","${time}"`;
    });
    const csv = header + "\n" + rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const selectStyle = { background: darkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)", border: `1px solid ${t.border}`, borderRadius: 7, padding: "7px 10px", fontSize: 12, color: t.text, outline: "none", fontFamily: "inherit", cursor: "pointer", minWidth: 130 };
  const actionColors = {
    "File Uploaded": { bg: t.successSoft, color: t.success },
    "File Renamed": { bg: t.accentSoft, color: t.accent },
    "Folder Created": { bg: t.accentSoft, color: t.accent },
    "Subfolder Created": { bg: t.accentSoft, color: t.accent },
    "Location Created": { bg: t.successSoft, color: t.success },
    "Location Renamed": { bg: t.accentSoft, color: t.accent },
    "Location Deleted": { bg: t.errorSoft, color: t.error },
    "Department Created": { bg: t.successSoft, color: t.success },
    "Department Renamed": { bg: t.accentSoft, color: t.accent },
    "Department Deleted": { bg: t.errorSoft, color: t.error },
    "Location Access Updated": { bg: t.accentSoft, color: t.accent },
    "Department Access Updated": { bg: t.accentSoft, color: t.accent },
  };

  return (
    <div style={{ display: "flex", flex: 1, minHeight: "calc(100vh - 55px)", paddingTop: 55, animation: "fadeIn 0.3s ease" }}>
      {/* Sidebar */}
      <div style={{ width: 260, minWidth: 260, borderRight: `1px solid ${t.border}`, background: darkMode ? "rgba(15,17,20,0.5)" : "rgba(246,244,240,0.6)", padding: "20px 10px", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "0 10px 12px", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: t.textDim }}>Administration</div>
        {ADMIN_MENU.map((item) => {
          if (item.isCategory) {
            return (
              <div key={item.id} style={{ padding: "12px 12px 6px", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: t.textDim, marginTop: 8 }}>
                {item.label}
              </div>
            );
          }
          return (
            <div key={item.id} onClick={() => setAdminSection(item.id)} className="admin-menu-item" style={{ padding: "9px 12px", borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", gap: 10, background: adminSection === item.id ? t.accentSoft : "transparent", color: adminSection === item.id ? t.accent : t.text, fontWeight: adminSection === item.id ? 600 : 500, fontSize: 13, borderLeft: adminSection === item.id ? `2px solid ${t.accent}` : "2px solid transparent", marginBottom: 2, marginLeft: item.category ? 12 : 0 }}>
              <span style={{ color: adminSection === item.id ? t.accent : t.textDim, display: "flex" }}>{item.icon}</span> {item.label}
            </div>
          );
        })}
      </div>
      {/* Content */}
      <div style={{ flex: 1, padding: "32px 36px", overflowY: "auto" }}>
        <div style={{ maxWidth: 860 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 10 }}><span style={{ color: t.accent }}>{adminActiveMenu?.icon}</span> {adminActiveMenu?.label}</h1>
              <p style={{ fontSize: 13, color: t.textMuted, margin: "4px 0 0" }}>{adminActiveMenu?.desc}</p>
            </div>
            {adminSection === "users" && <Btn primary darkMode={darkMode} t={t} onClick={() => setShowAddUser(true)} style={{ fontSize: 12 }}><PlusIcon size={13} /> Add User</Btn>}
            {adminSection === "groups" && !addingGroup && <Btn primary darkMode={darkMode} t={t} onClick={() => { setAddingGroup(true); setNewGroupName(""); setNewGroupDesc(""); }} style={{ fontSize: 12 }}><PlusIcon size={13} /> Add Group</Btn>}
            {adminSection === "locations" && !addingLocation && <Btn primary darkMode={darkMode} t={t} onClick={() => { setAddingLocation(true); setNewLocationName(""); }} style={{ fontSize: 12 }}><PlusIcon size={13} /> Add Location</Btn>}
          </div>

          {/* USERS */}
          {adminSection === "users" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {demoUsers.map((u, i) => (
                <div key={i} className="folder-row" style={{ display: "flex", alignItems: "center", background: t.surface, border: `1px solid ${t.border}`, borderRadius: 10, padding: "12px 16px", animation: `fadeIn 0.25s ease ${i * 0.04}s both` }}>
                  <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: t.accentSoft, color: t.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>{u.name.charAt(0)}</div>
                    <div><div style={{ fontSize: 13, fontWeight: 600 }}>{u.name}</div><div style={{ fontSize: 11, color: t.textDim }}>{u.email}</div></div>
                  </div>
                  <div style={{ width: 180, display: "flex", gap: 4, flexWrap: "wrap" }}>{u.groups.map((g) => <span key={g} style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 10, background: g === "Administrator" ? t.accentSoft : darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)", color: g === "Administrator" ? t.accent : t.textMuted }}>{g}</span>)}</div>
                  <div style={{ width: 80, textAlign: "center" }}><span style={{ fontSize: 10.5, fontWeight: 600, padding: "2px 8px", borderRadius: 10, background: u.status === "Active" ? t.successSoft : t.errorSoft, color: u.status === "Active" ? t.success : t.error }}>{u.status}</span></div>
                  <div style={{ width: 90, display: "flex", justifyContent: "flex-end", gap: 2 }}>
                    <SmallBtn t={t} title="Set Password" onClick={() => { setAdminSetPasswordUserId(u.id); setAdminSetPasswordForm({ new: "", confirm: "" }); setAdminSetPasswordError(""); setAdminSetPasswordSuccess(""); }}><ShieldIcon size={12} /></SmallBtn>
                    <SmallBtn t={t} title="Edit" onClick={() => { setEditingUser(u); setShowEditUser(true); }}><EditIcon /></SmallBtn>
                    {u.id !== loggedInUser?.id && (
                      <SmallBtn t={t} title="Remove" onClick={() => handleDeleteUser(u)}><TrashIcon size={12} /></SmallBtn>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* GROUPS */}
          {adminSection === "groups" && (
            <div style={{ animation: "fadeIn 0.25s ease" }}>
              {addingGroup && (
                <div style={{ background: t.surface, border: `1px solid ${t.accent}`, borderRadius: 12, padding: "18px 20px", marginBottom: 16, boxShadow: `0 0 0 3px ${t.accentSoft}`, animation: "fadeIn 0.2s ease" }}>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}><ShieldIcon size={16} /> New Security Group</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: t.textMuted, display: "block", marginBottom: 4 }}>Group Name</label>
                      <input value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addNewGroup(); if (e.key === "Escape") { setAddingGroup(false); setNewGroupName(""); setNewGroupDesc(""); } }} placeholder="e.g. Supervisor, Auditor..." autoFocus style={{ width: "100%", padding: "9px 12px", fontSize: 13.5, fontFamily: "inherit", background: darkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)", border: `1px solid ${t.border}`, borderRadius: 8, color: t.text, outline: "none", boxSizing: "border-box", fontWeight: 500 }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: t.textMuted, display: "block", marginBottom: 4 }}>Description</label>
                      <input value={newGroupDesc} onChange={(e) => setNewGroupDesc(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addNewGroup(); if (e.key === "Escape") { setAddingGroup(false); setNewGroupName(""); setNewGroupDesc(""); } }} placeholder="Brief description of this role..." style={{ width: "100%", padding: "9px 12px", fontSize: 13, fontFamily: "inherit", background: darkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)", border: `1px solid ${t.border}`, borderRadius: 8, color: t.text, outline: "none", boxSizing: "border-box" }} />
                    </div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                    <button onClick={() => { setAddingGroup(false); setNewGroupName(""); setNewGroupDesc(""); }} style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 8, padding: "7px 14px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", color: t.text, fontFamily: "inherit" }}>Cancel</button>
                    <Btn primary darkMode={darkMode} t={t} onClick={addNewGroup} style={{ padding: "7px 16px", fontSize: 12.5, opacity: newGroupName.trim() ? 1 : 0.4 }}>Create Group</Btn>
                  </div>
                </div>
              )}
              <div style={{ display: "flex", gap: 16 }}>
                <div style={{ width: editingGroupId ? 280 : "100%", minWidth: editingGroupId ? 280 : undefined, transition: "width 0.3s", display: "flex", flexDirection: "column", gap: 4 }}>
                  {demoGroups.map((g, i) => {
                    const isActive = editingGroupId === g.id;
                    return (
                      <div key={g.id} onClick={() => setEditingGroupId(isActive ? null : g.id)} className="folder-row" style={{ display: "flex", alignItems: "center", background: isActive ? t.accentSoft : t.surface, border: `1px solid ${isActive ? t.accent + "60" : t.border}`, borderRadius: 10, padding: editingGroupId ? "10px 12px" : "14px 16px", cursor: "pointer", transition: "all 0.2s", animation: `fadeIn 0.25s ease ${i * 0.04}s both` }}>
                        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: editingGroupId ? 28 : 34, height: editingGroupId ? 28 : 34, borderRadius: 8, background: isActive ? t.accent + "20" : g.name === "Administrator" ? t.accentSoft : darkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)", color: isActive ? t.accent : g.name === "Administrator" ? t.accent : t.textMuted, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}><ShieldIcon size={editingGroupId ? 13 : 16} /></div>
                          <div>
                            <div style={{ fontSize: editingGroupId ? 12 : 13, fontWeight: 600, color: isActive ? t.accent : t.text }}>{g.name}</div>
                            {!editingGroupId && <div style={{ fontSize: 11, color: t.textDim }}>{g.desc}</div>}
                          </div>
                        </div>
                        {!editingGroupId && <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span title="Permissions enabled" style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 8, background: t.successSoft, color: t.success }}>{g.permCount}/{Object.keys(PERMISSION_LABELS).length}</span>
                          <span style={{ fontSize: 11, fontWeight: 600, color: g.members > 0 ? t.accent : t.textDim, background: g.members > 0 ? t.accentSoft : "transparent", padding: "2px 9px", borderRadius: 12 }}>{g.members} member{g.members !== 1 ? "s" : ""}</span>
                        </div>}
                        {editingGroupId && <span style={{ fontSize: 9.5, fontWeight: 600, padding: "2px 7px", borderRadius: 8, background: t.successSoft, color: t.success }}>{g.permCount}</span>}
                        {!editingGroupId && <div style={{ width: 60, display: "flex", justifyContent: "flex-end", gap: 2 }}>
                          <SmallBtn t={t} title="Edit Permissions" onClick={(e) => { e.stopPropagation(); setEditingGroupId(g.id); }}><EditIcon /></SmallBtn>
                          <SmallBtn t={t} title="Remove" onClick={(e) => { e.stopPropagation(); deleteGroup(g); }}><TrashIcon size={12} /></SmallBtn>
                        </div>}
                      </div>
                    );
                  })}
                </div>
                {editingGroup && (
                  <div style={{ flex: 1, background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, overflow: "hidden", animation: "fadeIn 0.25s ease" }}>
                    <div style={{ padding: "18px 20px", borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                          <div style={{ width: 36, height: 36, borderRadius: 10, background: t.accentSoft, color: t.accent, display: "flex", alignItems: "center", justifyContent: "center" }}><ShieldIcon size={18} /></div>
                          <div>
                            <div style={{ fontSize: 17, fontWeight: 700 }}>{editingGroup.name}</div>
                            <div style={{ fontSize: 11.5, color: t.textMuted }}>{editingGroup.desc}</div>
                          </div>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 6, flexShrink: 0, marginTop: 2 }}>
                        <button onClick={() => deleteGroup(editingGroup)} style={{ background: t.errorSoft, color: t.error, border: "none", borderRadius: 8, padding: "6px 12px", fontSize: 11.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4 }}><TrashIcon size={11} /> Delete</button>
                        <button onClick={() => setEditingGroupId(null)} style={{ background: "transparent", border: `1px solid ${t.border}`, borderRadius: 8, padding: "6px 10px", cursor: "pointer", color: t.textDim, display: "flex", fontFamily: "inherit" }}><XIcon size={14} /></button>
                      </div>
                    </div>
                    <div style={{ padding: "12px 20px", borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: t.text }}>Permissions</span>
                        <span style={{ fontSize: 10.5, fontWeight: 600, padding: "2px 8px", borderRadius: 8, background: t.successSoft, color: t.success }}>{Object.values(editingGroup.permissions).filter(Boolean).length} of {Object.keys(PERMISSION_LABELS).length} enabled</span>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => { const allTrue = Object.fromEntries(Object.keys(editingGroup.permissions).map((k) => [k, true])); setSecurityGroups((p) => p.map((g) => g.id === editingGroupId ? { ...g, permissions: allTrue } : g)); api.updateGroupPermissions(editingGroupId, allTrue).catch(console.error); }} style={{ background: "transparent", border: "none", cursor: "pointer", color: t.accent, fontSize: 11, fontWeight: 600, fontFamily: "inherit", padding: "4px 6px" }}>Enable All</button>
                        <span style={{ color: t.textDim }}>·</span>
                        <button onClick={() => { const allFalse = Object.fromEntries(Object.keys(editingGroup.permissions).map((k) => [k, false])); setSecurityGroups((p) => p.map((g) => g.id === editingGroupId ? { ...g, permissions: allFalse } : g)); api.updateGroupPermissions(editingGroupId, allFalse).catch(console.error); }} style={{ background: "transparent", border: "none", cursor: "pointer", color: t.error, fontSize: 11, fontWeight: 600, fontFamily: "inherit", padding: "4px 6px" }}>Disable All</button>
                      </div>
                    </div>
                    <div style={{ padding: "16px 20px", maxHeight: 480, overflowY: "auto" }}>
                      {PERMISSION_CATEGORIES.map((cat, ci) => {
                        const permsInCat = Object.entries(PERMISSION_LABELS).filter(([, v]) => v.category === cat);
                        const enabledInCat = permsInCat.filter(([k]) => editingGroup.permissions[k]).length;
                        const allEnabled = enabledInCat === permsInCat.length;
                        return (
                          <div key={cat} style={{ marginBottom: ci < PERMISSION_CATEGORIES.length - 1 ? 20 : 0, animation: `fadeIn 0.2s ease ${ci * 0.05}s both` }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, padding: "0 2px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: t.textDim }}>{cat}</span>
                                <span style={{ fontSize: 9.5, fontWeight: 600, padding: "1px 6px", borderRadius: 6, background: enabledInCat > 0 ? t.successSoft : "transparent", color: enabledInCat > 0 ? t.success : t.textDim }}>{enabledInCat}/{permsInCat.length}</span>
                              </div>
                              <button onClick={() => toggleAllInCategory(editingGroupId, cat, !allEnabled)} style={{ background: "transparent", border: "none", cursor: "pointer", color: t.accent, fontSize: 10, fontWeight: 600, fontFamily: "inherit", padding: "2px 4px" }}>{allEnabled ? "Disable All" : "Enable All"}</button>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                              {permsInCat.map(([key, meta]) => (
                                <PermToggle key={key} checked={editingGroup.permissions[key]} onChange={() => togglePerm(editingGroupId, key)} label={meta.label} desc={meta.desc} t={t} darkMode={darkMode} />
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* LOCATIONS */}
          {adminSection === "locations" && (
            <div>
              {/* Info banner */}
              <div style={{
                padding: "12px 16px",
                borderRadius: 10,
                marginBottom: 16,
                background: darkMode ? "rgba(88,166,255,0.05)" : "rgba(79,70,229,0.04)",
                border: `1px solid ${darkMode ? "rgba(88,166,255,0.12)" : "rgba(79,70,229,0.1)"}`,
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontSize: 12,
                color: t.textMuted,
              }}>
                <ShieldIcon size={16} />
                <span>
                  Use the <strong style={{ color: t.text }}>Group Access</strong> column to restrict locations to specific security groups. Locations set to "All Groups" are visible to everyone.
                </span>
              </div>

              {addingLocation && (
                <div style={{ background: t.surface, border: `1px solid ${t.accent}`, borderRadius: 10, padding: "14px 16px", marginBottom: 12, display: "flex", alignItems: "center", gap: 12, boxShadow: `0 0 0 3px ${t.accentSoft}` }}>
                  <span style={{ color: t.accent }}><MapPinIcon size={18} /></span>
                  <input ref={addLocRef} value={newLocationName} onChange={(e) => setNewLocationName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { const n = newLocationName.trim(); if (n) { api.createLocation(n).then((created) => { setLocations((p) => [...p, { id: created.id, name: created.name }]); setNewLocationName(""); setAddingLocation(false); addToast("Location created", `"${n}" has been created`, 4000, "create"); }).catch(console.error); } } if (e.key === "Escape") { setAddingLocation(false); setNewLocationName(""); } }} placeholder="Location name..." style={{ flex: 1, background: "transparent", border: "none", fontSize: 14, color: t.text, outline: "none", fontFamily: "inherit", fontWeight: 500 }} />
                  <Btn primary darkMode={darkMode} t={t} onClick={() => { const n = newLocationName.trim(); if (n) { api.createLocation(n).then((created) => { setLocations((p) => [...p, { id: created.id, name: created.name }]); setNewLocationName(""); setAddingLocation(false); addToast("Location created", `"${n}" has been created`, 4000, "create"); }).catch(console.error); } }} style={{ padding: "6px 14px", fontSize: 12 }}>Add</Btn>
                  <button onClick={() => { setAddingLocation(false); setNewLocationName(""); }} style={{ background: "transparent", border: "none", cursor: "pointer", color: t.textDim, display: "flex", padding: 4 }}><XIcon size={16} /></button>
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {locations.map((loc, idx) => {
                  const lf = foldersInLocation(loc.id), lFiles = lf.reduce((s, f) => s + filesInFolder(f.id).length, 0), isEd = editingLocationId === loc.id;
                  const locGroups = locationAccess[loc.id] || [];
                  return (
                    <div key={loc.id} className="folder-row" style={{ display: "flex", alignItems: "center", background: t.surface, border: `1px solid ${isEd ? t.accent : t.border}`, borderRadius: 10, padding: "12px 16px", boxShadow: isEd ? `0 0 0 3px ${t.accentSoft}` : "none", animation: `fadeIn 0.25s ease ${idx * 0.04}s both` }}>
                      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: 8, background: t.accentSoft, color: t.accent, display: "flex", alignItems: "center", justifyContent: "center" }}><MapPinIcon size={16} /></div>
                        {isEd ? <input ref={editLocRef} value={editingLocationName} onChange={(e) => setEditingLocationName(e.target.value)} onBlur={() => { const n = editingLocationName.trim(); if (n && n !== loc.name) { api.updateLocation(loc.id, n).then(() => setLocations((p) => p.map((l) => l.id === loc.id ? { ...l, name: n } : l))).catch(console.error); } setEditingLocationId(null); }} onKeyDown={(e) => { if (e.key === "Enter") { const n = editingLocationName.trim(); if (n && n !== loc.name) { api.updateLocation(loc.id, n).then(() => setLocations((p) => p.map((l) => l.id === loc.id ? { ...l, name: n } : l))).catch(console.error); } setEditingLocationId(null); } if (e.key === "Escape") setEditingLocationId(null); }} style={{ flex: 1, background: darkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)", border: `1px solid ${t.accent}`, borderRadius: 6, padding: "5px 10px", fontSize: 13.5, fontWeight: 600, color: t.text, outline: "none", fontFamily: "inherit" }} /> : <div style={{ fontSize: 13.5, fontWeight: 600 }}>{loc.name}</div>}
                      </div>
                      <div style={{ width: 80, textAlign: "center" }}><span style={{ fontSize: 11, fontWeight: 600, color: lf.length > 0 ? t.accent : t.textDim, background: lf.length > 0 ? t.accentSoft : "transparent", padding: "2px 9px", borderRadius: 12 }}>{lf.length}</span></div>
                      <div style={{ width: 70, textAlign: "center", fontSize: 11, color: t.textDim }}>{lFiles} files</div>
                      {/* Group Access Editor */}
                      <div style={{ width: 180, display: "flex", justifyContent: "center" }}>
                        <GroupAccessEditor
                          entityId={loc.id}
                          assignedGroups={locGroups}
                          allGroups={allGroupsSimple}
                          onSave={handleSaveLocationAccess}
                          t={t}
                          darkMode={darkMode}
                        />
                      </div>
                      <div style={{ width: 120, display: "flex", justifyContent: "center" }}>
                        <SubscribeButton
                          type="location"
                          itemId={loc.id}
                          subscriptions={subscriptions || []}
                          onSubscribe={handleSubscribe}
                          onUnsubscribe={handleUnsubscribe}
                          t={t}
                        />
                      </div>
                      {!isEd && <div style={{ width: 70, display: "flex", justifyContent: "flex-end", gap: 2 }}><SmallBtn t={t} title="Edit" onClick={() => { setEditingLocationId(loc.id); setEditingLocationName(loc.name); }}><EditIcon /></SmallBtn><SmallBtn t={t} title="Remove" onClick={() => handleDeleteLocation(loc)}><TrashIcon size={12} /></SmallBtn></div>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* DEPARTMENTS */}
          {adminSection === "departments" && (
            <div>
              {/* Info banner */}
              <div style={{
                padding: "12px 16px",
                borderRadius: 10,
                marginBottom: 16,
                background: darkMode ? "rgba(88,166,255,0.05)" : "rgba(79,70,229,0.04)",
                border: `1px solid ${darkMode ? "rgba(88,166,255,0.12)" : "rgba(79,70,229,0.1)"}`,
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontSize: 12,
                color: t.textMuted,
              }}>
                <ShieldIcon size={16} />
                <span>
                  Restrict individual departments to specific security groups. Departments set to "All Groups" are visible to all users who can access the parent location.
                </span>
              </div>

              {locations.map((loc, li) => {
                const ld = deptsInLocation(loc.id), isAddHere = addingDept && addingDeptLocId === loc.id;
                return (
                  <div key={loc.id} style={{ marginBottom: 28, animation: `fadeIn 0.25s ease ${li * 0.05}s both` }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, padding: "0 4px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}><MapPinIcon size={16} /><span style={{ fontSize: 14, fontWeight: 700 }}>{loc.name}</span><span style={{ fontSize: 10.5, color: t.textDim }}>{ld.length} dept{ld.length !== 1 ? "s" : ""}</span></div>
                      {!isAddHere && <button onClick={() => { setAddingDept(true); setAddingDeptLocId(loc.id); setNewDeptName(""); }} style={{ background: "transparent", border: `1px dashed ${t.border}`, borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 11, fontWeight: 500, color: t.textMuted, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5 }}><PlusIcon size={11} /> Add</button>}
                    </div>
                    {isAddHere && (
                      <div style={{ background: t.surface, border: `1px solid ${t.accent}`, borderRadius: 10, padding: "12px 14px", marginBottom: 8, display: "flex", alignItems: "center", gap: 10, boxShadow: `0 0 0 3px ${t.accentSoft}` }}>
                        <span style={{ color: t.accent }}><LayersIcon size={16} /></span>
                        <input ref={addDeptRef} value={newDeptName} onChange={(e) => setNewDeptName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { const n = newDeptName.trim(); if (n) { api.createDepartment(n, loc.id).then((created) => { setDepartments((p) => [...p, { id: created.id, name: created.name, locationId: created.location_id || loc.id }]); setNewDeptName(""); setAddingDept(false); setAddingDeptLocId(null); addToast("Department created", `"${n}" has been created`, 4000, "create"); }).catch(console.error); } } if (e.key === "Escape") { setAddingDept(false); setAddingDeptLocId(null); } }} placeholder="Department name..." style={{ flex: 1, background: "transparent", border: "none", fontSize: 13, color: t.text, outline: "none", fontFamily: "inherit", fontWeight: 500 }} />
                        <Btn primary darkMode={darkMode} t={t} onClick={() => { const n = newDeptName.trim(); if (n) { api.createDepartment(n, loc.id).then((created) => { setDepartments((p) => [...p, { id: created.id, name: created.name, locationId: created.location_id || loc.id }]); setNewDeptName(""); setAddingDept(false); setAddingDeptLocId(null); addToast("Department created", `"${n}" has been created`, 4000, "create"); }).catch(console.error); } }} style={{ padding: "5px 12px", fontSize: 11.5 }}>Add</Btn>
                        <button onClick={() => { setAddingDept(false); setAddingDeptLocId(null); }} style={{ background: "transparent", border: "none", cursor: "pointer", color: t.textDim, display: "flex", padding: 3 }}><XIcon size={14} /></button>
                      </div>
                    )}
                    {ld.length > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                        {ld.map((dept, di) => {
                          const df = foldersInDepartment(dept.id), dFiles = df.reduce((s, f) => s + filesInFolder(f.id).length, 0), isEd = editingDeptId === dept.id;
                          const deptGroups = departmentAccess[dept.id] || [];
                          return (
                            <div key={dept.id} className="folder-row" style={{ display: "flex", alignItems: "center", background: t.surface, border: `1px solid ${isEd ? t.accent : t.border}`, borderRadius: 9, padding: "10px 14px", boxShadow: isEd ? `0 0 0 3px ${t.accentSoft}` : "none", animation: `fadeIn 0.2s ease ${di * 0.03}s both` }}>
                              <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 9 }}>
                                <div style={{ width: 30, height: 30, borderRadius: 7, background: t.accentSoft, color: t.accent, display: "flex", alignItems: "center", justifyContent: "center" }}><LayersIcon size={14} /></div>
                                {isEd ? <input ref={editDeptRef} value={editingDeptName} onChange={(e) => setEditingDeptName(e.target.value)} onBlur={() => { const n = editingDeptName.trim(); if (n && n !== dept.name) { api.updateDepartment(dept.id, n).then(() => setDepartments((p) => p.map((d) => d.id === dept.id ? { ...d, name: n } : d))).catch(console.error); } setEditingDeptId(null); }} onKeyDown={(e) => { if (e.key === "Enter") { const n = editingDeptName.trim(); if (n && n !== dept.name) { api.updateDepartment(dept.id, n).then(() => setDepartments((p) => p.map((d) => d.id === dept.id ? { ...d, name: n } : d))).catch(console.error); } setEditingDeptId(null); } if (e.key === "Escape") setEditingDeptId(null); }} style={{ flex: 1, background: darkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)", border: `1px solid ${t.accent}`, borderRadius: 6, padding: "4px 9px", fontSize: 13, fontWeight: 600, color: t.text, outline: "none", fontFamily: "inherit" }} /> : <div style={{ fontSize: 13, fontWeight: 600 }}>{dept.name}</div>}
                              </div>
                              <span style={{ fontSize: 10.5, color: t.textDim, width: 60, textAlign: "center" }}>{df.length} folders</span>
                              <span style={{ fontSize: 10.5, color: t.textDim, width: 50, textAlign: "center" }}>{dFiles} files</span>
                              {/* Group Access Editor */}
                              <div style={{ width: 180, display: "flex", justifyContent: "center" }}>
                                <GroupAccessEditor
                                  entityId={dept.id}
                                  assignedGroups={deptGroups}
                                  allGroups={allGroupsSimple}
                                  onSave={handleSaveDepartmentAccess}
                                  t={t}
                                  darkMode={darkMode}
                                />
                              </div>
                              <div style={{ width: 120, display: "flex", justifyContent: "center" }}>
                                <SubscribeButton
                                  type="department"
                                  itemId={dept.id}
                                  subscriptions={subscriptions || []}
                                  onSubscribe={handleSubscribe}
                                  onUnsubscribe={handleUnsubscribe}
                                  t={t}
                                />
                              </div>
                              {!isEd && <div style={{ width: 60, display: "flex", justifyContent: "flex-end", gap: 2 }}><SmallBtn t={t} title="Edit" onClick={() => { setEditingDeptId(dept.id); setEditingDeptName(dept.name); }}><EditIcon /></SmallBtn><SmallBtn t={t} title="Remove" onClick={() => handleDeleteDept(dept, loc.name)}><TrashIcon size={12} /></SmallBtn></div>}
                            </div>
                          );
                        })}
                      </div>
                    ) : !isAddHere && (
                      <div style={{ padding: 20, textAlign: "center", color: t.textDim, fontSize: 12.5, background: t.surface, border: `1px dashed ${t.border}`, borderRadius: 9 }}>No departments for {loc.name}</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* AUDIT */}
          {adminSection === "audit" && (
            <div style={{ animation: "fadeIn 0.25s ease" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                <select value={auditFilterAction} onChange={handleAuditFilterChange(setAuditFilterAction)} style={selectStyle}><option value="">All Actions</option>{allActions.map((a) => <option key={a} value={a}>{a}</option>)}</select>
                <select value={auditFilterUser} onChange={handleAuditFilterChange(setAuditFilterUser)} style={selectStyle}><option value="">All Users</option>{allUsers.map((u) => <option key={u} value={u}>{u}</option>)}</select>
                <input type="date" value={auditFilterDate} onChange={handleAuditFilterChange(setAuditFilterDate)} style={{ ...selectStyle, minWidth: 150 }} />
                {(auditFilterUser || auditFilterAction || auditFilterDate) && (
                  <button onClick={() => { setAuditFilterUser(""); setAuditFilterAction(""); setAuditFilterDate(""); setAuditPage(1); }} style={{ background: "transparent", border: "none", cursor: "pointer", color: t.accent, fontSize: 12, fontWeight: 500, fontFamily: "inherit", padding: "7px 4px" }}>Clear Filters</button>
                )}
                <div style={{ flex: 1 }} />
                <span style={{ fontSize: 11, color: t.textDim }}>{filtered.length} of {auditLog.length} entries</span>
                {filtered.length > 0 && <Btn darkMode={darkMode} t={t} onClick={exportCSV} style={{ fontSize: 11.5, padding: "6px 12px" }}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg> Export CSV</Btn>}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 14px 8px", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: t.textDim }}>
                <div style={{ width: 130 }}>Action</div><div style={{ flex: 1 }}>Detail</div><div style={{ width: 100, textAlign: "right" }}>User</div><div style={{ width: 150, textAlign: "right" }}>Date & Time</div>
              </div>
              {filtered.length > 0 ? (
                <>
                  <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    {auditPageEntries.map((entry, idx) => {
                      const date = new Date(entry.timestamp);
                      const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
                      const dateStr = date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
                      const isDeleted = entry.action.includes("Deleted") || entry.action.includes("Deleting");
                      const ac = actionColors[entry.action] || (isDeleted ? { bg: t.errorSoft, color: t.error } : { bg: t.accentSoft, color: t.accent });
                      return (
                        <div key={entry.id} style={{ display: "flex", alignItems: "center", gap: 12, background: t.surface, border: `1px solid ${t.border}`, borderRadius: 9, padding: "10px 14px", animation: `fadeIn 0.15s ease ${Math.min(idx, 20) * 0.02}s both` }}>
                          <div style={{ width: 130, flexShrink: 0 }}><span style={{ fontSize: 10.5, fontWeight: 600, padding: "2px 8px", borderRadius: 8, background: ac.bg, color: ac.color, whiteSpace: "nowrap" }}>{entry.action}</span></div>
                          <div style={{ flex: 1, fontSize: 12.5, color: t.text, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={entry.detail}>{entry.detail}</div>
                          <div style={{ width: 100, fontSize: 11, color: t.textMuted, textAlign: "right", flexShrink: 0 }}>{entry.user}</div>
                          <div style={{ width: 150, fontSize: 10.5, color: t.textDim, textAlign: "right", flexShrink: 0 }}>{dateStr} {timeStr}</div>
                        </div>
                      );
                    })}
                  </div>
                  {/* Pagination Bar */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16, flexWrap: "wrap", gap: 10 }}>
                    {/* Per-page selector */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 11.5, color: t.textDim }}>Rows per page:</span>
                      {[25, 50, 100].map((size) => (
                        <button
                          key={size}
                          onClick={() => { setAuditPageSize(size); setAuditPage(1); }}
                          style={{
                            background: auditPageSize === size ? t.accent : "transparent",
                            color: auditPageSize === size ? "#fff" : t.textMuted,
                            border: `1px solid ${auditPageSize === size ? t.accent : t.border}`,
                            borderRadius: 6,
                            padding: "4px 10px",
                            fontSize: 11.5,
                            fontWeight: 600,
                            cursor: "pointer",
                            fontFamily: "inherit",
                            transition: "all 0.15s ease",
                          }}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                    {/* Page info + prev/next */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 11.5, color: t.textDim }}>
                        {auditPageStart + 1}–{Math.min(auditPageEnd, filtered.length)} of {filtered.length}
                      </span>
                      <button
                        onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                        disabled={auditPageSafe <= 1}
                        style={{
                          background: "transparent",
                          border: `1px solid ${t.border}`,
                          borderRadius: 6,
                          padding: "4px 12px",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: auditPageSafe <= 1 ? "not-allowed" : "pointer",
                          color: auditPageSafe <= 1 ? t.textDim : t.text,
                          fontFamily: "inherit",
                          opacity: auditPageSafe <= 1 ? 0.45 : 1,
                          transition: "all 0.15s ease",
                        }}
                      >
                        ← Prev
                      </button>
                      {/* Page number pills */}
                      {Array.from({ length: auditTotalPages }, (_, i) => i + 1)
                        .filter((p) => p === 1 || p === auditTotalPages || Math.abs(p - auditPageSafe) <= 1)
                        .reduce((acc, p, i, arr) => {
                          if (i > 0 && p - arr[i - 1] > 1) acc.push("...");
                          acc.push(p);
                          return acc;
                        }, [])
                        .map((p, i) =>
                          p === "..." ? (
                            <span key={`ellipsis-${i}`} style={{ fontSize: 12, color: t.textDim, padding: "0 2px" }}>…</span>
                          ) : (
                            <button
                              key={p}
                              onClick={() => setAuditPage(p)}
                              style={{
                                background: auditPageSafe === p ? t.accent : "transparent",
                                color: auditPageSafe === p ? "#fff" : t.textMuted,
                                border: `1px solid ${auditPageSafe === p ? t.accent : t.border}`,
                                borderRadius: 6,
                                minWidth: 30,
                                padding: "4px 8px",
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: "pointer",
                                fontFamily: "inherit",
                                transition: "all 0.15s ease",
                              }}
                            >
                              {p}
                            </button>
                          )
                        )}
                      <button
                        onClick={() => setAuditPage((p) => Math.min(auditTotalPages, p + 1))}
                        disabled={auditPageSafe >= auditTotalPages}
                        style={{
                          background: "transparent",
                          border: `1px solid ${t.border}`,
                          borderRadius: 6,
                          padding: "4px 12px",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: auditPageSafe >= auditTotalPages ? "not-allowed" : "pointer",
                          color: auditPageSafe >= auditTotalPages ? t.textDim : t.text,
                          fontFamily: "inherit",
                          opacity: auditPageSafe >= auditTotalPages ? 0.45 : 1,
                          transition: "all 0.15s ease",
                        }}
                      >
                        Next →
                      </button>
                    </div>
                  </div>
                </>
              ) : auditLog.length > 0 ? (
                <div style={{ textAlign: "center", padding: "48px 0", color: t.textDim }}>
                  <SearchIcon size={32} />
                  <div style={{ fontSize: 13, fontWeight: 500, marginTop: 12 }}>No entries match your filters</div>
                  <button onClick={() => { setAuditFilterUser(""); setAuditFilterAction(""); setAuditFilterDate(""); }} style={{ background: "transparent", border: "none", cursor: "pointer", color: t.accent, fontSize: 12, fontWeight: 500, fontFamily: "inherit", marginTop: 8 }}>Clear Filters</button>
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "60px 0", color: t.textDim }}>
                  <ClipboardIcon size={36} />
                  <div style={{ fontSize: 14, fontWeight: 500, marginTop: 14 }}>No activity yet</div>
                  <div style={{ fontSize: 12.5, marginTop: 4 }}>File uploads, renames, and folder changes will appear here</div>
                </div>
              )}
            </div>
          )}

          {/* Fallback */}
          {!["users", "groups", "locations", "departments", "audit", "settings"].includes(adminSection) && (
            <div style={{ textAlign: "center", padding: "60px 0", color: t.textDim }}>
              <span>{adminActiveMenu?.icon}</span>
              <div style={{ fontSize: 15, fontWeight: 500, marginTop: 14 }}>{adminActiveMenu?.label}</div>
              <div style={{ fontSize: 13 }}>Under development</div>
            </div>
          )}

          {/* SETTINGS */}
          {adminSection === "settings" && (
            <div style={{ animation: "fadeIn 0.25s ease" }}>
              <SettingsSection t={t} darkMode={darkMode} />
            </div>
          )}
        </div>
      </div>

      <AddUserModal
        show={showAddUser}
        onClose={() => setShowAddUser(false)}
        groups={securityGroups}
        onUserCreated={async () => {
          const users = await api.getUsers();
          setAdminUsers(users.map((u) => ({
            name: u.display_name,
            email: u.email,
            groups: u.groups || [],
            status: u.status === "active" ? "Active" : "Inactive",
            id: u.id,
            groupIds: u.groups || [],
          })));
          addToast("User created", "New user has been created successfully", 4000, "create");
        }}
        t={t}
        darkMode={darkMode}
      />
      <EditUserModal
        show={showEditUser}
        onClose={() => { setShowEditUser(false); setEditingUser(null); }}
        user={editingUser}
        groups={securityGroups}
        onUserUpdated={async () => {
          const users = await api.getUsers();
          setAdminUsers(users.map((u) => ({
            name: u.display_name,
            email: u.email,
            groups: u.groups || [],
            status: u.status === "active" ? "Active" : "Inactive",
            id: u.id,
            groupIds: u.groups || [],
          })));
        }}
        t={t}
        darkMode={darkMode}
      />
    </div>
  );
}
