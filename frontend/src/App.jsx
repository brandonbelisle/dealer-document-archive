import { useState, useRef, useCallback, useEffect } from "react";
import * as api from "./api";
import { getTheme } from "./theme";
import { loadPDFJS, extractTextFromPDF, uid, extractRO, copyText, ACCEPTED_TYPE, MAX_FILE_SIZE } from "./utils/helpers";
import { DEFAULT_LOCATIONS, DEFAULT_DEPARTMENTS } from "./constants";
import ErrorBoundary from "./components/ErrorBoundary";
import LoginScreen from "./components/LoginScreen";
import Navbar from "./components/Navbar";
import WarningModal from "./components/modals/WarningModal";
import RenameModal from "./components/modals/RenameModal";
import ChangePasswordModal from "./components/modals/ChangePasswordModal";
import AdminSetPasswordModal from "./components/modals/AdminSetPasswordModal";
import DashboardPage from "./pages/DashboardPage";
import FoldersPage from "./pages/FoldersPage";
import FolderDetailPage from "./pages/FolderDetailPage";
import FileDetailPage from "./pages/FileDetailPage";
import UnsortedPage from "./pages/UnsortedPage";
import UploadPage from "./pages/UploadPage";
import AdminPage from "./pages/AdminPage";

function AppInner() {
  // ── Core UI state ───────────────────────────────────────
  const [darkMode, setDarkMode] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [page, setPage] = useState("dashboard");
  const [adminSection, setAdminSection] = useState("users");

  // ── Data state ──────────────────────────────────────────
  const [locations, setLocations] = useState(DEFAULT_LOCATIONS);
  const [departments, setDepartments] = useState(DEFAULT_DEPARTMENTS);
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [unsortedFiles, setUnsortedFiles] = useState([]);
  const [activeLocation, setActiveLocation] = useState(null);
  const [activeDepartment, setActiveDepartment] = useState(null);
  const [activeFolderId, setActiveFolderId] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [showDeptDropdown, setShowDeptDropdown] = useState(false);
  const [expandedLocations, setExpandedLocations] = useState({});
  const [pdfjsLoaded, setPdfjsLoaded] = useState(false);

  // ── Upload / staged state ───────────────────────────────
  const [stagedFiles, setStagedFiles] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [folderDetailDragOver, setFolderDetailDragOver] = useState(false);
  const [stagedFolderAssignments, setStagedFolderAssignments] = useState({});
  const [stagedSuggestions, setStagedSuggestions] = useState({});

  // ── Folder state ────────────────────────────────────────
  const [folderSearch, setFolderSearch] = useState("");
  const [creatingSubfolder, setCreatingSubfolder] = useState(false);
  const [newSubfolderName, setNewSubfolderName] = useState("");
  const [creatingDeptFolder, setCreatingDeptFolder] = useState(false);
  const [newDeptFolderName, setNewDeptFolderName] = useState("");

  // ── File operations state ───────────────────────────────
  const [renamingFileId, setRenamingFileId] = useState(null);
  const [renamingFileName, setRenamingFileName] = useState("");
  const [viewingFileId, setViewingFileId] = useState(null);

  // ── Admin state ─────────────────────────────────────────
  const [securityGroups, setSecurityGroups] = useState([]);
  const [adminUsers, setAdminUsers] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [addingGroup, setAddingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const [addingLocation, setAddingLocation] = useState(false);
  const [newLocationName, setNewLocationName] = useState("");
  const [editingLocationId, setEditingLocationId] = useState(null);
  const [editingLocationName, setEditingLocationName] = useState("");
  const [addingDept, setAddingDept] = useState(false);
  const [addingDeptLocId, setAddingDeptLocId] = useState(null);
  const [newDeptName, setNewDeptName] = useState("");
  const [editingDeptId, setEditingDeptId] = useState(null);
  const [editingDeptName, setEditingDeptName] = useState("");
  const [warningModal, setWarningModal] = useState(null);
  const [auditLog, setAuditLog] = useState([]);
  const [auditFilterUser, setAuditFilterUser] = useState("");
  const [auditFilterAction, setAuditFilterAction] = useState("");
  const [auditFilterDate, setAuditFilterDate] = useState("");

  // ── Password modals state ───────────────────────────────
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [changePasswordForm, setChangePasswordForm] = useState({ current: "", new: "", confirm: "" });
  const [changePasswordError, setChangePasswordError] = useState("");
  const [changePasswordSuccess, setChangePasswordSuccess] = useState("");
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);
  const [adminSetPasswordUserId, setAdminSetPasswordUserId] = useState(null);
  const [adminSetPasswordForm, setAdminSetPasswordForm] = useState({ new: "", confirm: "" });
  const [adminSetPasswordError, setAdminSetPasswordError] = useState("");
  const [adminSetPasswordSuccess, setAdminSetPasswordSuccess] = useState("");
  const [adminSetPasswordLoading, setAdminSetPasswordLoading] = useState(false);

  const t = getTheme(darkMode);

  // ── Effects ─────────────────────────────────────────────
  useEffect(() => { loadPDFJS().then(() => setPdfjsLoaded(true)).catch(console.error); }, []);
  useEffect(() => { if (!showDeptDropdown) return; const h = () => setShowDeptDropdown(false); window.addEventListener("click", h); return () => window.removeEventListener("click", h); }, [showDeptDropdown]);
  useEffect(() => { if (!showProfileMenu) return; const h = () => setShowProfileMenu(false); window.addEventListener("click", h); return () => window.removeEventListener("click", h); }, [showProfileMenu]);

  // Session restore
  useEffect(() => {
    if (api.isAuthenticated()) {
      api.getMe().then((user) => {
        setLoggedInUser({ name: user.displayName, groups: user.groups, permissions: user.permissions });
        setIsLoggedIn(true);
      }).catch(() => { api.logout(); });
    }
  }, []);

  // Load core data
  const loadCoreData = useCallback(async () => {
    try {
      const [locs, depts, unsorted] = await Promise.all([api.getLocations(), api.getDepartments(), api.getUnsortedFiles()]);
      const normLocs = locs.map((l) => ({ id: l.id, name: l.name }));
      const normDepts = depts.map((d) => ({ id: d.id, name: d.name, locationId: d.location_id || d.locationId }));
      setLocations(normLocs);
      setDepartments(normDepts);
      setUnsortedFiles(unsorted.map((f) => ({ id: f.id, name: f.name, size: Number(f.file_size_bytes || 0), type: f.mime_type || "application/pdf", pages: Number(f.page_count || 0), status: f.status, text: f.extracted_text, folderId: null, fileStoragePath: f.file_storage_path, error: f.error_message, progress: f.status === "done" ? 100 : 0 })));
      if (normLocs.length > 0 && !activeLocation) {
        setActiveLocation(normLocs[0].id);
        setExpandedLocations({ [normLocs[0].id]: true });
        const firstDept = normDepts.find((d) => d.locationId === normLocs[0].id);
        if (firstDept) setActiveDepartment(firstDept.id);
      }
    } catch (err) { console.error("Failed to load core data:", err); }
  }, [activeLocation]);

  useEffect(() => { if (isLoggedIn) loadCoreData(); }, [isLoggedIn]);
  useEffect(() => { if (!isLoggedIn || !activeDepartment) return; api.getFolders({ departmentId: activeDepartment }).then((rows) => { const norm = rows.map((f) => ({ id: f.id, name: f.name, locationId: f.location_id || f.locationId, departmentId: f.department_id || f.departmentId, parentId: f.parent_id || f.parentId || null, createdAt: f.created_at, fileCount: Number(f.fileCount || 0), subfolderCount: Number(f.subfolderCount || 0) })); setFolders((prev) => [...prev.filter((f) => f.departmentId !== activeDepartment), ...norm]); }).catch(console.error); }, [isLoggedIn, activeDepartment]);
  useEffect(() => { if (!isLoggedIn || !activeFolderId) return; api.getFiles(activeFolderId).then((rows) => { const norm = rows.map((f) => ({ id: f.id, name: f.name, size: Number(f.file_size_bytes || 0), type: f.mime_type || "application/pdf", pages: Number(f.page_count || 0), status: f.status, text: f.extracted_text, folderId: f.folder_id, fileStoragePath: f.file_storage_path, uploadedAt: f.uploaded_at || null, uploadedBy: f.uploaded_by_name || f.uploaded_by || null, error: f.error_message, progress: f.status === "done" ? 100 : 0 })); setFiles((prev) => [...prev.filter((f) => f.folderId !== activeFolderId), ...norm]); }).catch(console.error); }, [isLoggedIn, activeFolderId]);
  useEffect(() => { if (!isLoggedIn || page !== "unsorted") return; api.getUnsortedFiles().then((rows) => { setUnsortedFiles(rows.map((f) => ({ id: f.id, name: f.name, size: Number(f.file_size_bytes || 0), type: f.mime_type || "application/pdf", pages: Number(f.page_count || 0), status: f.status, text: f.extracted_text, folderId: null, fileStoragePath: f.file_storage_path, error: f.error_message, progress: f.status === "done" ? 100 : 0 }))); }).catch(console.error); }, [isLoggedIn, page]);
  useEffect(() => { if (!isLoggedIn || page !== "admin" || adminSection !== "groups") return; api.getGroups().then((groups) => { setSecurityGroups(groups.map((g) => ({ id: g.id, name: g.name, desc: g.description, permissions: g.permissions, memberCount: g.memberCount }))); }).catch(console.error); }, [isLoggedIn, page, adminSection]);
  useEffect(() => { if (!isLoggedIn || page !== "admin" || adminSection !== "users") return; api.getUsers().then((users) => { setAdminUsers(users.map((u) => ({ name: u.display_name, email: u.email, groups: u.groups || [], status: u.status === "active" ? "Active" : "Inactive", id: u.id }))); }).catch(console.error); }, [isLoggedIn, page, adminSection]);
  useEffect(() => { if (!isLoggedIn || page !== "admin" || adminSection !== "audit") return; api.getAuditLog({ action: auditFilterAction || undefined, user: auditFilterUser || undefined, date: auditFilterDate || undefined }).then((data) => { setAuditLog((data.entries || []).map((e) => ({ id: e.id, action: e.action, detail: e.detail, user: e.user_name, timestamp: new Date(e.timestamp).getTime() }))); }).catch(console.error); }, [isLoggedIn, page, adminSection, auditFilterAction, auditFilterUser, auditFilterDate]);
  useEffect(() => { if (!isLoggedIn || page !== "dashboard") return; api.getDashboard().then(setDashboardData).catch(console.error); }, [isLoggedIn, page]);

  // Auto-suggest folders for staged files
  useEffect(() => {
    const newSuggestions = {}, newAssignments = {};
    for (const sf of stagedFiles) {
      if (sf.status === "done" && !stagedSuggestions[sf.id]) {
        const suggestion = suggestFolderForFile(sf);
        if (suggestion) { newSuggestions[sf.id] = suggestion; if (suggestion.folder && suggestion.confidence === "exact") newAssignments[sf.id] = suggestion.folder.id; }
      }
    }
    if (Object.keys(newSuggestions).length > 0) { setStagedSuggestions((p) => ({ ...p, ...newSuggestions })); setStagedFolderAssignments((p) => ({ ...p, ...newAssignments })); }
  }, [stagedFiles.map((f) => f.status).join(",")]);

  // ── Derived helpers ─────────────────────────────────────
  const filesInFolder = (id) => files.filter((f) => f.folderId === id);
  const subfoldersOf = (parentId) => folders.filter((f) => f.parentId === parentId);
  const allFilesInFolderRecursive = (id) => { let count = filesInFolder(id).length; subfoldersOf(id).forEach((sf) => { count += allFilesInFolderRecursive(sf.id); }); return count; };
  const foldersInDepartment = (deptId) => folders.filter((f) => f.departmentId === deptId && !f.parentId);
  const foldersInLocation = (locId) => folders.filter((f) => f.locationId === locId);
  const deptsInLocation = (locId) => departments.filter((d) => d.locationId === locId);
  const currentDeptFolders = foldersInDepartment(activeDepartment);
  const currentDept = departments.find((d) => d.id === activeDepartment);
  const currentLocation = locations.find((l) => l.id === activeLocation);
  const activeFolder = folders.find((f) => f.id === activeFolderId);
  const getBreadcrumb = (folderId) => { const trail = []; let current = folders.find((f) => f.id === folderId); while (current) { trail.unshift(current); current = current.parentId ? folders.find((f) => f.id === current.parentId) : null; } return trail; };

  const suggestFolderForFile = (file) => {
    const ro = extractRO(file.text, file.name); if (!ro) return null;
    const exact = folders.find((f) => f.name === ro || f.name.toUpperCase() === ro.toUpperCase()); if (exact) return { folder: exact, ro, confidence: "exact" };
    const contains = folders.find((f) => f.name.toUpperCase().includes(ro.toUpperCase())); if (contains) return { folder: contains, ro, confidence: "partial" };
    if (/^R\d{9}$/.test(ro)) { const numPart = ro.slice(1); const numMatch = folders.find((f) => f.name === numPart || f.name.includes(numPart)); if (numMatch) return { folder: numMatch, ro, confidence: "partial" }; }
    return { folder: null, ro, confidence: "none" };
  };

  // ── Handlers ────────────────────────────────────────────
  const handleLogin = async () => { setLoginError(""); if (!loginForm.username.trim() || !loginForm.password.trim()) { setLoginError("Please enter both fields."); return; } setLoginLoading(true); try { const user = await api.login(loginForm.username.trim(), loginForm.password.trim()); setLoggedInUser({ name: user.displayName, groups: user.groups, permissions: user.permissions }); setIsLoggedIn(true); setLoginForm({ username: "", password: "" }); } catch (err) { setLoginError(err.message || "Login failed"); } finally { setLoginLoading(false); } };
  const handleLogout = () => { api.logout(); setIsLoggedIn(false); setLoggedInUser(null); setPage("dashboard"); setSelectedFile(null); setLocations([]); setDepartments([]); setFolders([]); setFiles([]); setActiveLocation(null); setActiveDepartment(null); };

  const validateFile = (file) => { if (file.type !== ACCEPTED_TYPE && !file.name.toLowerCase().endsWith(".pdf")) return { valid: false, error: "Only PDFs" }; if (file.size > MAX_FILE_SIZE) return { valid: false, error: "Too large" }; return { valid: true }; };

  const processFile = useCallback(async (rawFile, folderId) => {
    const id = uid(), v = validateFile(rawFile);
    let fileDataUrl = null;
    try { fileDataUrl = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(rawFile); }); } catch {}
    const entry = { id, name: rawFile.name, size: rawFile.size, type: rawFile.type || "", fileDataUrl, status: v.valid ? "processing" : "error", progress: 0, error: v.error || null, text: null, pages: 0, folderId: folderId || null, _rawFile: rawFile };
    if (folderId) setFiles((p) => [...p, entry]); else setStagedFiles((p) => [...p, entry]);
    if (!v.valid) return;
    try {
      const r = await extractTextFromPDF(rawFile, (prog) => { const up = (p) => p.map((f) => f.id === id ? { ...f, progress: prog } : f); if (folderId) setFiles(up); else setStagedFiles(up); });
      if (folderId) { try { const uploaded = await api.uploadFile(rawFile, folderId, r.text, r.pages); const norm = { id: uploaded.id, name: uploaded.name, size: Number(uploaded.file_size_bytes || 0), type: uploaded.mime_type || "application/pdf", pages: Number(uploaded.page_count || 0), status: "done", text: uploaded.extracted_text, folderId: uploaded.folder_id, fileStoragePath: uploaded.file_storage_path, uploadedAt: uploaded.uploaded_at || new Date().toISOString(), uploadedBy: uploaded.uploaded_by_name || loggedInUser?.name || null, progress: 100 }; setFiles((p) => p.map((f) => f.id === id ? norm : f)); } catch (err) { setFiles((p) => p.map((f) => f.id === id ? { ...f, status: "error", error: err.message } : f)); } }
      else { setStagedFiles((p) => p.map((f) => f.id === id ? { ...f, status: "done", text: r.text, pages: r.pages, progress: 100 } : f)); }
    } catch { const up = (p) => p.map((f) => f.id === id ? { ...f, status: "error", error: "Failed" } : f); if (folderId) setFiles(up); else setStagedFiles(up); }
  }, []);

  const handleUploadFiles = useCallback((fl) => { if (!pdfjsLoaded) return; Array.from(fl).forEach((f) => processFile(f, null)); }, [processFile, pdfjsLoaded]);
  const handleDrop = useCallback((e) => { e.preventDefault(); setDragOver(false); handleUploadFiles(e.dataTransfer.files); }, [handleUploadFiles]);
  const handleFolderDetailDrop = useCallback((e) => { e.preventDefault(); setFolderDetailDragOver(false); if (!pdfjsLoaded || !activeFolderId) return; Array.from(e.dataTransfer.files).forEach((f) => processFile(f, activeFolderId)); }, [processFile, pdfjsLoaded, activeFolderId]);
  const handleFolderDetailFiles = useCallback((fl) => { if (!pdfjsLoaded || !activeFolderId) return; Array.from(fl).forEach((f) => processFile(f, activeFolderId)); }, [processFile, pdfjsLoaded, activeFolderId]);

  const removeFile = async (id) => { try { await api.deleteFile(id); } catch (err) { console.error(err); } setFiles((p) => p.filter((f) => f.id !== id)); if (selectedFile?.id === id) setSelectedFile(null); if (viewingFileId === id) { setViewingFileId(null); setPage("folder-detail"); } };
  const renameFile = async (id, newName) => { const n = newName.trim(); if (n) { try { await api.renameFile(id, n); setFiles((p) => p.map((f) => f.id === id ? { ...f, name: n } : f)); } catch (err) { console.error(err); } } setRenamingFileId(null); };
  const handleMoveFile = async (fileId, folderId) => { try { await api.moveFile(fileId, folderId); setUnsortedFiles((p) => p.filter((f) => f.id !== fileId)); } catch (err) { console.error("Move failed:", err); } };

  const createSubfolder = async () => { const name = newSubfolderName.trim(); if (!name || !activeFolderId) { setCreatingSubfolder(false); return; } const parent = folders.find((f) => f.id === activeFolderId); if (!parent) return; try { const created = await api.createFolder(name, parent.locationId, parent.departmentId, activeFolderId); setFolders((p) => [...p, { id: created.id, name: created.name, locationId: created.location_id || created.locationId, departmentId: created.department_id || created.departmentId, parentId: created.parent_id || created.parentId || null, createdAt: created.created_at }]); } catch (err) { console.error(err); } setNewSubfolderName(""); setCreatingSubfolder(false); };
  const createDeptFolder = async () => { const name = newDeptFolderName.trim(); if (!name) { setCreatingDeptFolder(false); return; } try { const created = await api.createFolder(name, activeLocation, activeDepartment, null); setFolders((p) => [...p, { id: created.id, name: created.name, locationId: created.location_id || created.locationId, departmentId: created.department_id || created.departmentId, parentId: null, createdAt: created.created_at }]); } catch (err) { console.error(err); } setNewDeptFolderName(""); setCreatingDeptFolder(false); };

  const handleDeleteFolder = (folder) => {
    const childFolders = subfoldersOf(folder.id); const fileCount = allFilesInFolderRecursive(folder.id);
    const message = (childFolders.length > 0 || fileCount > 0) ? `Delete "${folder.name}" and everything inside it? This includes ${childFolders.length} subfolder${childFolders.length !== 1 ? "s" : ""} and ${fileCount} file${fileCount !== 1 ? "s" : ""}. This cannot be undone.` : `Delete the folder "${folder.name}"? This cannot be undone.`;
    const doDelete = async () => { try { const getAllDescendants = (pid) => { const ch = subfoldersOf(pid); let all = []; for (const c of ch) { all = [...all, ...getAllDescendants(c.id), c]; } return all; }; const descendants = getAllDescendants(folder.id); const allIds = new Set([folder.id, ...descendants.map((d) => d.id)]); setFiles((p) => p.filter((f) => !allIds.has(f.folderId))); for (const desc of descendants) { await api.deleteFolder(desc.id).catch(console.error); } await api.deleteFolder(folder.id); setFolders((p) => p.filter((f) => !allIds.has(f.id))); if (activeFolderId === folder.id || allIds.has(activeFolderId)) { if (folder.parentId) setActiveFolderId(folder.parentId); else { setActiveFolderId(null); setPage("folders"); } } } catch (err) { console.error(err); } setWarningModal(null); };
    setWarningModal({ title: "Delete Folder", message, onConfirm: doDelete });
  };

  const handleDeleteLocation = (loc) => { const lf = foldersInLocation(loc.id), lFiles = lf.reduce((s, f) => s + filesInFolder(f.id).length, 0); const doDelete = async () => { try { await api.deleteLocation(loc.id); setFiles((p) => p.filter((f) => !new Set(lf.map((ff) => ff.id)).has(f.folderId))); setFolders((p) => p.filter((f) => f.locationId !== loc.id)); setDepartments((p) => p.filter((d) => d.locationId !== loc.id)); setLocations((p) => p.filter((l) => l.id !== loc.id)); if (activeLocation === loc.id) { const rem = locations.filter((l) => l.id !== loc.id); if (rem.length) setActiveLocation(rem[0].id); } } catch (err) { console.error(err); } }; if (lf.length > 0 || lFiles > 0) setWarningModal({ title: `Remove "${loc.name}"?`, message: `This location has ${lf.length} folder(s) and ${lFiles} file(s). Are you sure?`, onConfirm: doDelete }); else doDelete(); };
  const handleDeleteDept = (dept, locName) => { const df = foldersInDepartment(dept.id), dFiles = df.reduce((s, f) => s + filesInFolder(f.id).length, 0); const doDelete = async () => { try { await api.deleteDepartment(dept.id); setFiles((p) => p.filter((f) => !new Set(df.map((ff) => ff.id)).has(f.folderId))); setFolders((p) => p.filter((f) => f.departmentId !== dept.id)); setDepartments((p) => p.filter((d) => d.id !== dept.id)); if (activeDepartment === dept.id) { const rem = deptsInLocation(dept.locationId).filter((d) => d.id !== dept.id); if (rem.length) setActiveDepartment(rem[0].id); } } catch (err) { console.error(err); } }; if (df.length > 0 || dFiles > 0) setWarningModal({ title: `Remove "${dept.name}" from ${locName}?`, message: `This department has ${df.length} folder(s) and ${dFiles} file(s). Are you sure?`, onConfirm: doDelete }); else doDelete(); };

  const uploadAllStaged = async () => { const ready = stagedFiles.filter((f) => f.status === "done"); if (ready.length === 0) return; for (const sf of ready) { try { await api.uploadFile(sf._rawFile || new Blob(), stagedFolderAssignments[sf.id] || null, sf.text, sf.pages); } catch (err) { console.error(err); } } setStagedFiles((p) => p.filter((f) => f.status === "processing")); setStagedFolderAssignments({}); setStagedSuggestions({}); api.getUnsortedFiles().then((rows) => { setUnsortedFiles(rows.map((f) => ({ id: f.id, name: f.name, size: Number(f.file_size_bytes || 0), type: f.mime_type || "application/pdf", pages: Number(f.page_count || 0), status: f.status, text: f.extracted_text, folderId: null, fileStoragePath: f.file_storage_path, error: f.error_message, progress: f.status === "done" ? 100 : 0 }))); }).catch(console.error); };
  const removeStagedFile = (id) => { setStagedFiles((p) => p.filter((f) => f.id !== id)); setStagedFolderAssignments((p) => { const n = { ...p }; delete n[id]; return n; }); setStagedSuggestions((p) => { const n = { ...p }; delete n[id]; return n; }); };

  const handleChangePassword = async () => { setChangePasswordError(""); setChangePasswordSuccess(""); if (!changePasswordForm.current || !changePasswordForm.new || !changePasswordForm.confirm) { setChangePasswordError("All fields are required."); return; } if (changePasswordForm.new.length < 6) { setChangePasswordError("New password must be at least 6 characters."); return; } if (changePasswordForm.new !== changePasswordForm.confirm) { setChangePasswordError("New passwords do not match."); return; } setChangePasswordLoading(true); try { await api.changePassword(changePasswordForm.current, changePasswordForm.new); setChangePasswordSuccess("Password changed successfully."); setChangePasswordForm({ current: "", new: "", confirm: "" }); setTimeout(() => { setShowChangePassword(false); setChangePasswordSuccess(""); }, 1500); } catch (err) { setChangePasswordError(err.message || "Failed."); } finally { setChangePasswordLoading(false); } };
  const handleAdminSetPassword = async () => { setAdminSetPasswordError(""); setAdminSetPasswordSuccess(""); if (!adminSetPasswordForm.new || !adminSetPasswordForm.confirm) { setAdminSetPasswordError("All fields are required."); return; } if (adminSetPasswordForm.new.length < 6) { setAdminSetPasswordError("Password must be at least 6 characters."); return; } if (adminSetPasswordForm.new !== adminSetPasswordForm.confirm) { setAdminSetPasswordError("Passwords do not match."); return; } setAdminSetPasswordLoading(true); try { const result = await api.adminSetPassword(adminSetPasswordUserId, adminSetPasswordForm.new); setAdminSetPasswordSuccess(result.message || "Password set successfully."); setAdminSetPasswordForm({ new: "", confirm: "" }); setTimeout(() => { setAdminSetPasswordUserId(null); setAdminSetPasswordSuccess(""); }, 1500); } catch (err) { setAdminSetPasswordError(err.message || "Failed."); } finally { setAdminSetPasswordLoading(false); } };

  // ── Render ──────────────────────────────────────────────
  if (!isLoggedIn) return <LoginScreen loginForm={loginForm} setLoginForm={setLoginForm} loginError={loginError} setLoginError={setLoginError} loginLoading={loginLoading} handleLogin={handleLogin} darkMode={darkMode} setDarkMode={setDarkMode} t={t} />;

  return (
    <div style={{ minHeight: "100vh", background: t.pageBg, color: t.text, fontFamily: "'Geist','DM Sans',system-ui,sans-serif", transition: "background 0.35s" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />
      <link href="https://cdn.jsdelivr.net/npm/geist@1.2.2/dist/fonts/geist-sans/style.min.css" rel="stylesheet" />
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}} @keyframes modalIn{from{opacity:0;transform:scale(.96) translateY(8px)}to{opacity:1;transform:scale(1) translateY(0)}} .file-card:hover{transform:translateY(-1px);box-shadow:${t.cardShadow}} .folder-row:hover{transform:translateY(-1px);box-shadow:${t.cardShadow};border-color:${darkMode ? "#3a3f47" : t.accent}!important} .icon-btn:hover{color:${t.text}!important;background:${t.accentSoft}} .folder-select-item:hover{background:${t.accentSoft}!important} .nav-tab:hover{background:${t.navActive}} .admin-menu-item:hover{background:${t.accentSoft}} ::-webkit-scrollbar{width:5px} ::-webkit-scrollbar-track{background:transparent} ::-webkit-scrollbar-thumb{background:${t.scrollThumb};border-radius:3px} input::placeholder{color:${t.textDim}}`}</style>

      <Navbar page={page} setPage={setPage} darkMode={darkMode} setDarkMode={setDarkMode} isLoggedIn={isLoggedIn} loggedInUser={loggedInUser} locations={locations} departments={departments} folders={folders} files={files} unsortedFiles={unsortedFiles} stagedFiles={stagedFiles} activeLocation={activeLocation} setActiveLocation={setActiveLocation} activeDepartment={activeDepartment} setActiveDepartment={setActiveDepartment} setActiveFolderId={setActiveFolderId} setSelectedFile={setSelectedFile} setViewingFileId={setViewingFileId} setFolderSearch={setFolderSearch} expandedLocations={expandedLocations} setExpandedLocations={setExpandedLocations} showDeptDropdown={showDeptDropdown} setShowDeptDropdown={setShowDeptDropdown} showProfileMenu={showProfileMenu} setShowProfileMenu={setShowProfileMenu} setShowChangePassword={setShowChangePassword} setChangePasswordForm={setChangePasswordForm} setChangePasswordError={setChangePasswordError} setChangePasswordSuccess={setChangePasswordSuccess} setAdminSection={setAdminSection} handleLogout={handleLogout} foldersInLocation={foldersInLocation} foldersInDepartment={foldersInDepartment} deptsInLocation={deptsInLocation} filesInFolder={filesInFolder} t={t} />

      {page === "dashboard" && <DashboardPage dashboardData={dashboardData} loggedInUser={loggedInUser} setPage={setPage} setActiveFolderId={setActiveFolderId} t={t} darkMode={darkMode} />}
      {page === "folders" && <FoldersPage currentLocation={currentLocation} currentDept={currentDept} currentDeptFolders={currentDeptFolders} folderSearch={folderSearch} setFolderSearch={setFolderSearch} creatingDeptFolder={creatingDeptFolder} setCreatingDeptFolder={setCreatingDeptFolder} newDeptFolderName={newDeptFolderName} setNewDeptFolderName={setNewDeptFolderName} createDeptFolder={createDeptFolder} setActiveFolderId={setActiveFolderId} setPage={setPage} setCreatingSubfolder={setCreatingSubfolder} allFilesInFolderRecursive={allFilesInFolderRecursive} subfoldersOf={subfoldersOf} handleDeleteFolder={handleDeleteFolder} t={t} darkMode={darkMode} />}
      {page === "folder-detail" && <FolderDetailPage activeFolder={activeFolder} activeFolderId={activeFolderId} filesInFolder={filesInFolder} subfoldersOf={subfoldersOf} allFilesInFolderRecursive={allFilesInFolderRecursive} getBreadcrumb={getBreadcrumb} locations={locations} departments={departments} folders={folders} setActiveFolderId={setActiveFolderId} setPage={setPage} setSelectedFile={setSelectedFile} setViewingFileId={setViewingFileId} setRenamingFileId={setRenamingFileId} setRenamingFileName={setRenamingFileName} copyText={copyText} removeFile={removeFile} handleDeleteFolder={handleDeleteFolder} creatingSubfolder={creatingSubfolder} setCreatingSubfolder={setCreatingSubfolder} newSubfolderName={newSubfolderName} setNewSubfolderName={setNewSubfolderName} createSubfolder={createSubfolder} folderDetailDragOver={folderDetailDragOver} setFolderDetailDragOver={setFolderDetailDragOver} handleFolderDetailDrop={handleFolderDetailDrop} handleFolderDetailFiles={handleFolderDetailFiles} t={t} darkMode={darkMode} />}
      {page === "file-detail" && <FileDetailPage viewingFileId={viewingFileId} files={files} folders={folders} locations={locations} departments={departments} getBreadcrumb={getBreadcrumb} setViewingFileId={setViewingFileId} setActiveFolderId={setActiveFolderId} setPage={setPage} setRenamingFileId={setRenamingFileId} setRenamingFileName={setRenamingFileName} removeFile={removeFile} t={t} darkMode={darkMode} />}
      {page === "unsorted" && <UnsortedPage unsortedFiles={unsortedFiles} folders={folders} locations={locations} departments={departments} deptsInLocation={deptsInLocation} handleMoveFile={handleMoveFile} removeFile={removeFile} setUnsortedFiles={setUnsortedFiles} setWarningModal={setWarningModal} t={t} darkMode={darkMode} />}
      {page === "upload" && <UploadPage stagedFiles={stagedFiles} setStagedFiles={setStagedFiles} stagedFolderAssignments={stagedFolderAssignments} setStagedFolderAssignments={setStagedFolderAssignments} stagedSuggestions={stagedSuggestions} setStagedSuggestions={setStagedSuggestions} folders={folders} locations={locations} departments={departments} deptsInLocation={deptsInLocation} handleDrop={handleDrop} handleUploadFiles={handleUploadFiles} dragOver={dragOver} setDragOver={setDragOver} uploadAllStaged={uploadAllStaged} removeStagedFile={removeStagedFile} t={t} darkMode={darkMode} />}
      {page === "admin" && <AdminPage adminSection={adminSection} setAdminSection={setAdminSection} setPage={setPage} adminUsers={adminUsers} setAdminSetPasswordUserId={setAdminSetPasswordUserId} setAdminSetPasswordForm={setAdminSetPasswordForm} setAdminSetPasswordError={setAdminSetPasswordError} setAdminSetPasswordSuccess={setAdminSetPasswordSuccess} securityGroups={securityGroups} setSecurityGroups={setSecurityGroups} editingGroupId={editingGroupId} setEditingGroupId={setEditingGroupId} addingGroup={addingGroup} setAddingGroup={setAddingGroup} newGroupName={newGroupName} setNewGroupName={setNewGroupName} newGroupDesc={newGroupDesc} setNewGroupDesc={setNewGroupDesc} setWarningModal={setWarningModal} locations={locations} setLocations={setLocations} addingLocation={addingLocation} setAddingLocation={setAddingLocation} newLocationName={newLocationName} setNewLocationName={setNewLocationName} editingLocationId={editingLocationId} setEditingLocationId={setEditingLocationId} editingLocationName={editingLocationName} setEditingLocationName={setEditingLocationName} foldersInLocation={foldersInLocation} filesInFolder={filesInFolder} handleDeleteLocation={handleDeleteLocation} departments={departments} setDepartments={setDepartments} deptsInLocation={deptsInLocation} foldersInDepartment={foldersInDepartment} addingDept={addingDept} setAddingDept={setAddingDept} addingDeptLocId={addingDeptLocId} setAddingDeptLocId={setAddingDeptLocId} newDeptName={newDeptName} setNewDeptName={setNewDeptName} editingDeptId={editingDeptId} setEditingDeptId={setEditingDeptId} editingDeptName={editingDeptName} setEditingDeptName={setEditingDeptName} handleDeleteDept={handleDeleteDept} auditLog={auditLog} auditFilterUser={auditFilterUser} setAuditFilterUser={setAuditFilterUser} auditFilterAction={auditFilterAction} setAuditFilterAction={setAuditFilterAction} auditFilterDate={auditFilterDate} setAuditFilterDate={setAuditFilterDate} t={t} darkMode={darkMode} />}

      <RenameModal renamingFileId={renamingFileId} renamingFileName={renamingFileName} setRenamingFileId={setRenamingFileId} setRenamingFileName={setRenamingFileName} renameFile={renameFile} t={t} darkMode={darkMode} />
      <WarningModal warningModal={warningModal} setWarningModal={setWarningModal} t={t} darkMode={darkMode} />
      <ChangePasswordModal show={showChangePassword} form={changePasswordForm} setForm={setChangePasswordForm} error={changePasswordError} setError={setChangePasswordError} success={changePasswordSuccess} setSuccess={setChangePasswordSuccess} loading={changePasswordLoading} onSubmit={handleChangePassword} onClose={() => setShowChangePassword(false)} t={t} darkMode={darkMode} />
      <AdminSetPasswordModal userId={adminSetPasswordUserId} userName={adminUsers.find((u) => u.id === adminSetPasswordUserId)?.name} form={adminSetPasswordForm} setForm={setAdminSetPasswordForm} error={adminSetPasswordError} setError={setAdminSetPasswordError} success={adminSetPasswordSuccess} setSuccess={setAdminSetPasswordSuccess} loading={adminSetPasswordLoading} onSubmit={handleAdminSetPassword} onClose={() => setAdminSetPasswordUserId(null)} t={t} darkMode={darkMode} />
    </div>
  );
}

export default function App() {
  return <ErrorBoundary><AppInner /></ErrorBoundary>;
}
