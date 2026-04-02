import { useState, useRef, useCallback, useEffect } from "react";
import * as api from "./api";
import { getTheme } from "./theme";
import { extractTextFromPDF, uid, extractRO, copyText, ACCEPTED_TYPE, ACCEPTED_IMAGE_TYPES, ACCEPTED_EXTENSIONS, isImageFile, isPdfFile, isValidFileType, MAX_FILE_SIZE } from "./utils/helpers";
import { DEFAULT_LOCATIONS, DEFAULT_DEPARTMENTS } from "./constants";
import { useSocket } from "./hooks/useSocket";
import ErrorBoundary from "./components/ErrorBoundary";
import LoginScreen from "./components/LoginScreen";
import Navbar from "./components/Navbar";
import WarningModal from "./components/modals/WarningModal";
import ConfirmDeleteModal from "./components/modals/ConfirmDeleteModal";
import RenameModal from "./components/modals/RenameModal";
import ChangePasswordModal from "./components/modals/ChangePasswordModal";
import AdminSetPasswordModal from "./components/modals/AdminSetPasswordModal";
import SubscriptionsModal from "./components/modals/SubscriptionsModal";
import HelpTicketModal from "./components/modals/HelpTicketModal";
import DashboardPage from "./pages/DashboardPage";
import FoldersPage from "./pages/FoldersPage";
import FoldersBrowsePage from "./pages/FoldersBrowsePage";
import FolderDetailPage from "./pages/FolderDetailPage";
import FileDetailPage from "./pages/FileDetailPage";
import UnsortedPage from "./pages/UnsortedPage";
import UploadPage from "./pages/UploadPage";
import AdminPage from "./pages/AdminPage";
import CHTDashboardPage from "./pages/CHTDashboardPage";
import SettingsPage from "./pages/SettingsPage";
import LandingPage from "./components/LandingPage";
import LandingNavbar from "./components/LandingNavbar";
import AdminNavbar from "./components/AdminNavbar";
import CHTNavbar from "./components/CHTNavbar";
import Toast from "./components/ui/Toast";

function getThemeCookie() {
    const match = document.cookie.match(/(?:^|;)\s*theme\s*=\s*([^;]+)/);
    if (match) return match[1] === 'dark';
    return true;
  }

function setThemeCookie(isDark) {
    document.cookie = `theme=${isDark ? 'dark' : 'light'}; path=/; max-age=31536000`;
}

function AppInner() {
  // ── Core UI state ───────────────────────────────────────
  const [darkMode, setDarkMode] = useState(getThemeCookie());
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [page, setPage] = useState("landing");
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

  // ── Upload / staged state ───────────────────────────────
  const [stagedFiles, setStagedFiles] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [folderDetailDragOver, setFolderDetailDragOver] = useState(false);
  const [deptDragOver, setDeptDragOver] = useState(false);
  const [stagedFolderAssignments, setStagedFolderAssignments] = useState({});
  const [stagedSuggestions, setStagedSuggestions] = useState({});
  
  // ── Upload batch tracking for notifications ───────────────
  const [pendingUploads, setPendingUploads] = useState({}); // { folderId: { fileIds: [], timer: null } }
  const uploadNotificationTimeoutRef = useRef(null);

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
  const [totalPermissionCount, setTotalPermissionCount] = useState(0);
  const [adminUsers, setAdminUsers] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [addingGroup, setAddingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const [addingLocation, setAddingLocation] = useState(false);
  const [newLocationName, setNewLocationName] = useState("");
  const [newLocationCode, setNewLocationCode] = useState("");
  const [editingLocationId, setEditingLocationId] = useState(null);
  const [editingLocationName, setEditingLocationName] = useState("");
  const [editingLocationCode, setEditingLocationCode] = useState("");
  const [addingDept, setAddingDept] = useState(false);
  const [addingDeptLocId, setAddingDeptLocId] = useState(null);
  const [newDeptName, setNewDeptName] = useState("");
  const [editingDeptId, setEditingDeptId] = useState(null);
  const [editingDeptName, setEditingDeptName] = useState("");
  const [warningModal, setWarningModal] = useState(null);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState(null);
  const [auditLog, setAuditLog] = useState([]);
  const [auditFilterUser, setAuditFilterUser] = useState("");
  const [auditFilterAction, setAuditFilterAction] = useState("");
  const [auditFilterDate, setAuditFilterDate] = useState("");

  // ── Access control state ────────────────────────────────
  const [locationAccess, setLocationAccess] = useState({});
  const [departmentAccess, setDepartmentAccess] = useState({});

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

// ── Subscriptions modal state ──────────────────────────
  const [showSubscriptionsModal, setShowSubscriptionsModal] = useState(false);

  // ── Help ticket modal state ──────────────────────────────
  const [showHelpTicketModal, setShowHelpTicketModal] = useState(false);

  // ── Toast notifications state ────────────────────────────
const [toasts, setToasts] = useState([]);
const toastIdCounter = useRef(0);

const addToast = useCallback((title, message, duration, type, onClick) => {
    const id = ++toastIdCounter.current;
    setToasts((prev) => [...prev, { id, title, message, duration: duration || 5000, type, onClick }]);
  }, []);

const removeToast = useCallback((id) => {
  setToasts((prev) => prev.filter((t) => t.id !== id));
}, []);

// ── Browser history navigation ───────────────────────────
const isPopStateRef = useRef(false);
const isInitialMount = useRef(true);

const pageToPath = useCallback((page, activeFolderId, activeLocation, activeDepartment, viewingFileId, adminSection) => {
  switch (page) {
    case "landing": return "/";
    case "dashboard": return "/dashboard";
    case "folders-browse": return "/folders";
    case "folders": return `/folders/${activeLocation || "all"}/${activeDepartment || "all"}`;
    case "folder-detail": return `/folder/${activeFolderId || ""}`;
    case "file-detail": return `/file/${viewingFileId || ""}`;
    case "unsorted": return "/unsorted";
    case "upload": return "/upload";
    case "admin": return `/admin/${adminSection || "users"}`;
    case "cht": return "/credit-hold";
    default: return "/";
  }
}, []);

const pathToPage = useCallback((path) => {
  const parts = path.split("/").filter(Boolean);
  if (parts.length === 0) return { page: "landing" };
  
  const [first, ...rest] = parts;
  switch (first) {
    case "dashboard": return { page: "dashboard" };
    case "folders": 
      if (rest[0] && rest[1] && rest[0] !== "all" && rest[1] !== "all") {
        return { page: "folders", activeLocation: rest[0], activeDepartment: rest[1] };
      }
      if (rest[0] === "browse" || !rest[0]) return { page: "folders-browse" };
      return { page: "folders-browse" };
    case "folder":
      if (rest[0]) return { page: "folder-detail", activeFolderId: rest[0] };
      return { page: "folders-browse" };
    case "file":
      if (rest[0]) return { page: "file-detail", viewingFileId: rest[0] };
      return { page: "folders-browse" };
    case "unsorted": return { page: "unsorted" };
    case "upload": return { page: "upload" };
    case "admin":
      if (rest[0]) return { page: "admin", adminSection: rest[0] };
      return { page: "admin", adminSection: "users" };
    case "credit-hold":
      return { page: "cht" };
    default: return { page: "landing" };
  }
}, []);

useEffect(() => {
  const handlePopState = (e) => {
    isPopStateRef.current = true;
    if (e.state) {
      if (e.state.page) setPage(e.state.page);
      if (e.state.activeFolderId !== undefined) setActiveFolderId(e.state.activeFolderId);
      if (e.state.activeLocation !== undefined) setActiveLocation(e.state.activeLocation);
      if (e.state.activeDepartment !== undefined) setActiveDepartment(e.state.activeDepartment);
      if (e.state.viewingFileId !== undefined) setViewingFileId(e.state.viewingFileId);
      if (e.state.adminSection) setAdminSection(e.state.adminSection);
    } else {
      const pathState = pathToPage(window.location.pathname);
      if (pathState.page) setPage(pathState.page);
      if (pathState.activeLocation) setActiveLocation(pathState.activeLocation);
      if (pathState.activeDepartment) setActiveDepartment(pathState.activeDepartment);
      if (pathState.activeFolderId) setActiveFolderId(pathState.activeFolderId);
      if (pathState.viewingFileId) setViewingFileId(pathState.viewingFileId);
      if (pathState.adminSection) setAdminSection(pathState.adminSection);
    }
    setTimeout(() => { isPopStateRef.current = false; }, 0);
  };
  window.addEventListener("popstate", handlePopState);
  
  // Restore state from URL on initial load
  const pathState = pathToPage(window.location.pathname);
  if (pathState.page && pathState.page !== "landing") {
    if (pathState.activeLocation) setActiveLocation(pathState.activeLocation);
    if (pathState.activeDepartment) setActiveDepartment(pathState.activeDepartment);
    if (pathState.activeFolderId) setActiveFolderId(pathState.activeFolderId);
    if (pathState.viewingFileId) setViewingFileId(pathState.viewingFileId);
    if (pathState.adminSection) setAdminSection(pathState.adminSection);
    if (api.isAuthenticated()) {
      setPage(pathState.page);
    } else {
      sessionStorage.setItem("redirectAfterLogin", JSON.stringify(pathState));
    }
  }
  
  return () => window.removeEventListener("popstate", handlePopState);
}, [pathToPage]);

// Track page changes and update browser history
const pageRef = useRef(page);
const activeFolderIdRef = useRef(activeFolderId);
const activeLocationRef = useRef(activeLocation);
const activeDepartmentRef = useRef(activeDepartment);
const viewingFileIdRef = useRef(viewingFileId);
const adminSectionRef = useRef(adminSection);

useEffect(() => {
  // Skip initial mount
  if (isInitialMount.current) {
    isInitialMount.current = false;
    return;
  }
  
  if (!isPopStateRef.current) {
    const path = pageToPath(page, activeFolderId, activeLocation, activeDepartment, viewingFileId, adminSection);
    window.history.pushState({
      page,
      activeFolderId,
      activeLocation,
      activeDepartment,
      viewingFileId,
      adminSection,
    }, "", path);
  }
}, [page, activeFolderId, activeLocation, activeDepartment, viewingFileId, adminSection, pageToPath]);

// ── Subscriptions state ────────────────────────────────
const [subscriptions, setSubscriptions] = useState([]);

// ── Alert navigation state ────────────────────────────────────
const [viewingFileIdFromAlert, setViewingFileIdFromAlert] = useState(null);

useEffect(() => {
  if (viewingFileIdFromAlert) {
    setViewingFileId(viewingFileIdFromAlert);
    setPage("file-detail");
    setViewingFileIdFromAlert(null);
  }
}, [viewingFileIdFromAlert]);

const [chtInquiryIdFromAlert, setChtInquiryIdFromAlert] = useState(null);

useEffect(() => {
  if (chtInquiryIdFromAlert) {
    setPage("cht");
  }
}, [chtInquiryIdFromAlert]);

const t = getTheme(darkMode);

  // ── Effects ─────────────────────────────────────────────
  useEffect(() => { setThemeCookie(darkMode); }, [darkMode]);
  useEffect(() => { if (!showDeptDropdown) return; const h = () => setShowDeptDropdown(false); window.addEventListener("click", h); return () => window.removeEventListener("click", h); }, [showDeptDropdown]);
  useEffect(() => { if (!showProfileMenu) return; const h = () => setShowProfileMenu(false); window.addEventListener("click", h); return () => window.removeEventListener("click", h); }, [showProfileMenu]);

  // Session restore
  useEffect(() => {
    if (api.isAuthenticated()) {
      api.getMe().then((user) => {
        setLoggedInUser({ id: user.id, name: user.displayName, groups: user.groups, permissions: user.permissions, avatarUrl: user.avatarUrl, customAppIds: user.customAppIds || [] });
        setIsLoggedIn(true);
        
        // Restore redirect after login
        const redirect = sessionStorage.getItem("redirectAfterLogin");
        if (redirect) {
          const pathState = JSON.parse(redirect);
          sessionStorage.removeItem("redirectAfterLogin");
          if (pathState.page) setPage(pathState.page);
          if (pathState.activeLocation) setActiveLocation(pathState.activeLocation);
          if (pathState.activeDepartment) setActiveDepartment(pathState.activeDepartment);
          if (pathState.activeFolderId) setActiveFolderId(pathState.activeFolderId);
          if (pathState.viewingFileId) setViewingFileId(pathState.viewingFileId);
          if (pathState.adminSection) setAdminSection(pathState.adminSection);
        }
      }).catch(() => { api.logout(); });
    }
  }, []);

  // Load core data
  const loadCoreData = useCallback(async () => {
    try {
      const [locs, depts, unsorted, allFolders] = await Promise.all([api.getLocations(), api.getDepartments(), api.getUnsortedFiles(), api.getFolders({})]);
      const normLocs = locs.map((l) => ({ id: l.id, name: l.name, locationCode: l.location_code || l.locationCode }));
      const normDepts = depts.map((d) => ({ id: d.id, name: d.name, locationId: d.location_id || d.locationId }));
      const normFolders = allFolders.map((f) => ({ id: f.id, name: f.name, locationId: f.location_id || f.locationId, departmentId: f.department_id || f.departmentId, parentId: f.parent_id || f.parentId || null, createdAt: f.created_at, fileCount: Number(f.fileCount || 0), subfolderCount: Number(f.subfolderCount || 0) }));
      setLocations(normLocs);
      setDepartments(normDepts);
      setFolders(normFolders);
      setUnsortedFiles(unsorted.map((f) => ({ id: f.id, name: f.name, size: Number(f.file_size_bytes || 0), type: f.mime_type || "application/pdf", pages: Number(f.page_count || 0), status: f.status, text: f.extracted_text, folderId: null, fileStoragePath: f.file_storage_path, uploadedAt: f.uploaded_at || null, uploadedBy: f.uploaded_by_name || f.uploaded_by || null, error: f.error_message, progress: f.status === "done" ? 100 : 0 })));
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
  // Load ALL folders for the Upload page dropdown
  useEffect(() => { if (!isLoggedIn || page !== "upload") return; api.getFolders({}).then((rows) => { const norm = rows.map((f) => ({ id: f.id, name: f.name, locationId: f.location_id || f.locationId, departmentId: f.department_id || f.departmentId, parentId: f.parent_id || f.parentId || null, createdAt: f.created_at, fileCount: Number(f.fileCount || 0), subfolderCount: Number(f.subfolderCount || 0) })); setFolders(norm); }).catch(console.error); }, [isLoggedIn, page]);
  useEffect(() => { if (!isLoggedIn || !activeFolderId) return; api.getFiles(activeFolderId).then((rows) => { const norm = rows.map((f) => ({ id: f.id, name: f.name, size: Number(f.file_size_bytes || 0), type: f.mime_type || "application/pdf", pages: Number(f.page_count || 0), status: f.status, text: f.extracted_text, folderId: f.folder_id, fileStoragePath: f.file_storage_path, uploadedAt: f.uploaded_at || null, uploadedBy: f.uploaded_by_name || f.uploaded_by || null, error: f.error_message, progress: f.status === "done" ? 100 : 0 })); setFiles((prev) => [...prev.filter((f) => f.folderId !== activeFolderId), ...norm]); }).catch(console.error); }, [isLoggedIn, activeFolderId]);
  useEffect(() => { if (!isLoggedIn || page !== "unsorted") return; api.getUnsortedFiles().then((rows) => { setUnsortedFiles(rows.map((f) => ({ id: f.id, name: f.name, size: Number(f.file_size_bytes || 0), type: f.mime_type || "application/pdf", pages: Number(f.page_count || 0), status: f.status, text: f.extracted_text, folderId: null, fileStoragePath: f.file_storage_path, uploadedAt: f.uploaded_at || null, uploadedBy: f.uploaded_by_name || f.uploaded_by || null, error: f.error_message, progress: f.status === "done" ? 100 : 0 }))); }).catch(console.error); }, [isLoggedIn, page]);
  useEffect(() => { if (!isLoggedIn || page !== "admin") return; api.getGroups().then((data) => { setSecurityGroups(data.groups.map((g) => ({ id: g.id, name: g.name, desc: g.description, permissions: g.permissions, memberCount: g.memberCount }))); setTotalPermissionCount(data.totalPermissionCount || 0); }).catch(console.error); }, [isLoggedIn, page]);
  useEffect(() => { if (!isLoggedIn || page !== "admin" || adminSection !== "users") return; api.getUsers().then((users) => { setAdminUsers(users.map((u) => ({ name: u.display_name, email: u.email, groups: u.groups || [], status: u.status === "active" ? "Active" : "Inactive", id: u.id, groupIds: u.groupIds || [], authProvider: u.auth_provider || 'local' }))); }).catch(console.error); }, [isLoggedIn, page, adminSection]);
  useEffect(() => { if (!isLoggedIn || page !== "admin" || adminSection !== "audit") return; api.getAuditLog({ action: auditFilterAction || undefined, user: auditFilterUser || undefined, date: auditFilterDate || undefined }).then((data) => { setAuditLog((data.entries || []).map((e) => ({ id: e.id, action: e.action, detail: e.detail, user: e.user_name, timestamp: new Date(e.timestamp).getTime() }))); }).catch(console.error); }, [isLoggedIn, page, adminSection, auditFilterAction, auditFilterUser, auditFilterDate]);
  useEffect(() => { if (!isLoggedIn || page !== "dashboard") return; api.getDashboard().then(setDashboardData).catch(console.error); }, [isLoggedIn, page]);

  // Polling for live updates
  useEffect(() => {
    if (!isLoggedIn) return;
    const interval = setInterval(() => {
      loadCoreData();
      api.getGroups().then((data) => { setSecurityGroups(data.groups.map((g) => ({ id: g.id, name: g.name, desc: g.description, permissions: g.permissions, memberCount: g.memberCount }))); setTotalPermissionCount(data.totalPermissionCount || 0); }).catch(() => {});
      api.getSubscriptionsWithDetails().then(setSubscriptions).catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, [isLoggedIn, loadCoreData]);

  useEffect(() => {
    if (!isLoggedIn || page !== "dashboard") return;
    const interval = setInterval(() => {
      api.getDashboard().then(setDashboardData).catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, [isLoggedIn, page]);

  useEffect(() => {
    if (!isLoggedIn || !activeFolderId) return;
    const interval = setInterval(() => {
      api.getFiles(activeFolderId).then((rows) => { const norm = rows.map((f) => ({ id: f.id, name: f.name, size: Number(f.file_size_bytes || 0), type: f.mime_type || "application/pdf", pages: Number(f.page_count || 0), status: f.status, text: f.extracted_text, folderId: f.folder_id, fileStoragePath: f.file_storage_path, uploadedAt: f.uploaded_at || null, uploadedBy: f.uploaded_by_name || f.uploaded_by || null, error: f.error_message, progress: f.status === "done" ? 100 : 0 })); setFiles((prev) => [...prev.filter((f) => f.folderId !== activeFolderId), ...norm]); }).catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, [isLoggedIn, activeFolderId]);

  useEffect(() => {
    if (!isLoggedIn || !activeDepartment) return;
    const interval = setInterval(() => {
      api.getFolders({ departmentId: activeDepartment }).then((rows) => { const norm = rows.map((f) => ({ id: f.id, name: f.name, locationId: f.location_id || f.locationId, departmentId: f.department_id || f.departmentId, parentId: f.parent_id || f.parentId || null, createdAt: f.created_at, fileCount: Number(f.fileCount || 0), subfolderCount: Number(f.subfolderCount || 0) })); setFolders((prev) => [...prev.filter((f) => f.departmentId !== activeDepartment), ...norm]); }).catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, [isLoggedIn, activeDepartment]);

  useEffect(() => {
    if (!isLoggedIn || page !== "unsorted") return;
    const interval = setInterval(() => {
      api.getUnsortedFiles().then((rows) => { setUnsortedFiles(rows.map((f) => ({ id: f.id, name: f.name, size: Number(f.file_size_bytes || 0), type: f.mime_type || "application/pdf", pages: Number(f.page_count || 0), status: f.status, text: f.extracted_text, folderId: null, fileStoragePath: f.file_storage_path, uploadedAt: f.uploaded_at || null, uploadedBy: f.uploaded_by_name || f.uploaded_by || null, error: f.error_message, progress: f.status === "done" ? 100 : 0 }))); }).catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, [isLoggedIn, page]);

  // Load access control data when viewing locations or departments in admin
  useEffect(() => {
    if (!isLoggedIn || page !== "admin") return;
    if (adminSection === "locations" || adminSection === "departments") {
      // Load groups if not already loaded (needed for the access editor)
      if (securityGroups.length === 0) {
        api.getGroups().then((data) => {
          setSecurityGroups(data.groups.map((g) => ({ id: g.id, name: g.name, desc: g.description, permissions: g.permissions, memberCount: g.memberCount })));
          setTotalPermissionCount(data.totalPermissionCount || 0);
        }).catch(console.error);
      }
      // Load access data
      api.getLocationAccess().then(setLocationAccess).catch(console.error);
      api.getDepartmentAccess().then(setDepartmentAccess).catch(console.error);
    }
  }, [isLoggedIn, page, adminSection]);

  // Load user subscriptions
  useEffect(() => {
    if (!isLoggedIn) return;
    api.getSubscriptionsWithDetails().then(setSubscriptions).catch(console.error);
  }, [isLoggedIn]);

  // Socket.io real-time updates
  const handleLocationsChanged = useCallback(() => {
    if (!isLoggedIn) return;
    api.getLocations().then((locs) => {
      const normLocs = locs.map((l) => ({ id: l.id, name: l.name, locationCode: l.location_code || l.locationCode }));
      setLocations(normLocs);
    }).catch(console.error);
  }, [isLoggedIn]);

  const handleDepartmentsChanged = useCallback(() => {
    if (!isLoggedIn) return;
    api.getDepartments().then((depts) => {
      const normDepts = depts.map((d) => ({ id: d.id, name: d.name, locationId: d.location_id || d.locationId }));
      setDepartments(normDepts);
    }).catch(console.error);
  }, [isLoggedIn]);

  const handleFoldersChanged = useCallback(() => {
    if (!isLoggedIn || !activeDepartment) return;
    api.getFolders({ departmentId: activeDepartment }).then((rows) => {
      const norm = rows.map((f) => ({ id: f.id, name: f.name, locationId: f.location_id || f.locationId, departmentId: f.department_id || f.departmentId, parentId: f.parent_id || f.parentId || null, createdAt: f.created_at, fileCount: Number(f.fileCount || 0), subfolderCount: Number(f.subfolderCount || 0) }));
      setFolders((prev) => [...prev.filter((f) => f.departmentId !== activeDepartment), ...norm]);
    }).catch(console.error);
  }, [isLoggedIn, activeDepartment]);

  const handleFilesChanged = useCallback(() => {
    if (!isLoggedIn || !activeFolderId) return;
    api.getFiles(activeFolderId).then((rows) => {
      const norm = rows.map((f) => ({ id: f.id, name: f.name, size: Number(f.file_size_bytes || 0), type: f.mime_type || "application/pdf", pages: Number(f.page_count || 0), status: f.status, text: f.extracted_text, folderId: f.folder_id, fileStoragePath: f.file_storage_path, uploadedAt: f.uploaded_at || null, uploadedBy: f.uploaded_by_name || f.uploaded_by || null, error: f.error_message, progress: f.status === "done" ? 100 : 0 }));
      setFiles((prev) => [...prev.filter((f) => f.folderId !== activeFolderId), ...norm]);
    }).catch(console.error);
  }, [isLoggedIn, activeFolderId]);

  const handleUsersChanged = useCallback(() => {
    if (!isLoggedIn || page !== "admin" || adminSection !== "users") return;
    api.getUsers().then((users) => {
      setAdminUsers(users.map((u) => ({ name: u.display_name, email: u.email, groups: u.groups || [], status: u.status === "active" ? "Active" : "Inactive", id: u.id, groupIds: u.groupIds || [] })));
    }).catch(console.error);
  }, [isLoggedIn, page, adminSection]);

  const handleGroupsChanged = useCallback(() => {
    if (!isLoggedIn) return;
    api.getGroups().then((data) => {
      setSecurityGroups(data.groups.map((g) => ({ id: g.id, name: g.name, desc: g.description, permissions: g.permissions, memberCount: g.memberCount })));
      setTotalPermissionCount(data.totalPermissionCount || 0);
    }).catch(console.error);
  }, [isLoggedIn]);

  const handleNotificationCreated = useCallback((data) => {
    if (!isLoggedIn) return;
    const notification = data.notification || data;
    if (notification.type === 'cht_inquiry_assigned' || notification.type === 'cht_inquiry_updated') {
      return;
    }
    addToast(
      `New file uploaded`,
      `${notification.file_name} was uploaded by ${notification.created_by_name} to ${notification.item_name || 'a subscribed location'}`,
      undefined,
      "upload"
    );
    api.markNotificationRead(notification.id).catch(console.error);
  }, [isLoggedIn, addToast]);

  useSocket({
    onLocationsChanged: handleLocationsChanged,
    onDepartmentsChanged: handleDepartmentsChanged,
    onFoldersChanged: handleFoldersChanged,
    onFilesChanged: handleFilesChanged,
    onUsersChanged: handleUsersChanged,
    onGroupsChanged: handleGroupsChanged,
    onNotificationCreated: handleNotificationCreated,
  });

  // Auto-suggest folders for staged files
  useEffect(() => {
    const newSuggestions = {}, newAssignments = {};
    for (const sf of stagedFiles) {
      if (sf.status === "done" && sf.text && !stagedSuggestions[sf.id]) {
        const suggestion = suggestFolderForFile(sf);
        if (suggestion) { newSuggestions[sf.id] = suggestion; if (suggestion.folder && suggestion.confidence === "exact") newAssignments[sf.id] = suggestion.folder.id; }
      }
    }
    if (Object.keys(newSuggestions).length > 0) { setStagedSuggestions((p) => ({ ...p, ...newSuggestions })); setStagedFolderAssignments((p) => ({ ...p, ...newAssignments })); }
  }, [stagedFiles, stagedSuggestions, folders]);

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
    // Handle R followed by 9 digits (R + 9 digits = 10 chars) - try without the R
    if (/^R\d{9}$/.test(ro)) { const numPart = ro.slice(1); const numMatch = folders.find((f) => f.name === numPart || f.name.includes(numPart)); if (numMatch) return { folder: numMatch, ro, confidence: "partial" }; }
    // Handle R10 followed by 7 digits (R10 + 7 digits = 10 chars) - try with and without R10
    if (/^R10\d{7}$/.test(ro)) { 
      const numMatch = folders.find((f) => f.name === ro || f.name.includes(ro)); 
      if (numMatch) return { folder: numMatch, ro, confidence: "partial" };
      // Try just the numeric part after R10
      const numPart = ro.slice(3); // Get the 7 digits after R10
      const numOnlyMatch = folders.find((f) => f.name === numPart || f.name.includes(numPart)); 
      if (numOnlyMatch) return { folder: numOnlyMatch, ro, confidence: "partial" };
    }
    return { folder: null, ro, confidence: "none" };
  };

  // ── Batch upload notification tracking ────────────────────
  const trackSuccessfulUpload = (fileId, folderId) => {
    if (!folderId) return;
    
    setPendingUploads((prev) => {
      const existing = prev[folderId];
      if (existing?.timer) {
        clearTimeout(existing.timer);
      }
      
      const allFileIds = existing ? [...existing.fileIds, fileId] : [fileId];
      
      // Set a timer to create batch notification after 2 seconds
      const timer = setTimeout(() => {
        setPendingUploads((current) => {
          const batchData = current[folderId];
          if (batchData && batchData.fileIds.length > 0) {
            api.createBatchUploadNotification(batchData.fileIds, folderId).catch(console.error);
          }
          const updated = { ...current };
          delete updated[folderId];
          return updated;
        });
      }, 2000);
      
      return {
        ...prev,
        [folderId]: { fileIds: allFileIds, timer },
      };
    });
  };

  // ── Handlers ────────────────────────────────────────────
  const handleLogin = async () => {
    setLoginError("");
    if (!loginForm.username.trim() || !loginForm.password.trim()) {
      setLoginError("Please enter both fields.");
      return;
    }
    setLoginLoading(true);
    try {
      const user = await api.login(loginForm.username.trim(), loginForm.password.trim());
      setLoggedInUser({ id: user.id, name: user.displayName, groups: user.groups, permissions: user.permissions, avatarUrl: user.avatarUrl, customAppIds: user.customAppIds || [] });
      setIsLoggedIn(true);
      setLoginForm({ username: "", password: "" });
      
      // Restore redirect after login
      const redirect = sessionStorage.getItem("redirectAfterLogin");
      if (redirect) {
        const pathState = JSON.parse(redirect);
        sessionStorage.removeItem("redirectAfterLogin");
        if (pathState.page) setPage(pathState.page);
        if (pathState.activeLocation) setActiveLocation(pathState.activeLocation);
        if (pathState.activeDepartment) setActiveDepartment(pathState.activeDepartment);
        if (pathState.activeFolderId) setActiveFolderId(pathState.activeFolderId);
        if (pathState.viewingFileId) setViewingFileId(pathState.viewingFileId);
        if (pathState.adminSection) setAdminSection(pathState.adminSection);
      } else {
        setPage("landing");
      }
    } catch (err) {
      setLoginError(err.message || "Login failed");
    } finally {
      setLoginLoading(false);
    }
  };
  const handleLogout = () => { api.logout(); setIsLoggedIn(false); setLoggedInUser(null); setPage("dashboard"); setSelectedFile(null); setLocations([]); setDepartments([]); setFolders([]); setFiles([]); setActiveLocation(null); setActiveDepartment(null); };

  const validateFile = (file) => { 
    if (!isValidFileType(file)) return { valid: false, error: "Only PDFs and images allowed" }; 
    if (file.size > MAX_FILE_SIZE) return { valid: false, error: "Too large" }; 
    return { valid: true }; 
  };

  const processFile = useCallback(async (rawFile, folderId) => {
    const id = uid(), v = validateFile(rawFile);
    let fileDataUrl = null;
    try { fileDataUrl = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(rawFile); }); } catch {}
    const isImage = isImageFile(rawFile);
    const isPdf = isPdfFile(rawFile);
    const initialStatus = (!folderId && isImage) ? "done" : (v.valid ? "processing" : "error");
    const entry = { id, name: rawFile.name, size: rawFile.size, type: rawFile.type || "", fileDataUrl, status: initialStatus, progress: (!folderId && isImage) ? 100 : 0, error: v.error || null, text: null, pages: 0, folderId: folderId || null, _rawFile: rawFile };
    if (folderId) setFiles((p) => [...p, entry]); else setStagedFiles((p) => [...p, entry]);
    if (!v.valid) return;
    if (!folderId && isImage) return;
    try {
      if (isPdf) {
        const r = await extractTextFromPDF(rawFile, (prog) => { const up = (p) => p.map((f) => f.id === id ? { ...f, progress: prog } : f); if (folderId) setFiles(up); else setStagedFiles(up); });
        if (folderId) { 
          try { 
            const uploaded = await api.uploadFile(rawFile, folderId, r.text, r.pages, true); // skipNotification=true 
            const norm = { id: uploaded.id, name: uploaded.name, size: Number(uploaded.file_size_bytes || 0), type: uploaded.mime_type || "application/pdf", pages: Number(uploaded.page_count || 0), status: "done", text: uploaded.extracted_text, folderId: uploaded.folder_id, fileStoragePath: uploaded.file_storage_path, uploadedAt: uploaded.uploaded_at || new Date().toISOString(), uploadedBy: uploaded.uploaded_by_name || loggedInUser?.name || null, progress: 100 }; 
            setFiles((p) => p.map((f) => f.id === id ? norm : f));
            // Track successful upload for batch notification
            trackSuccessfulUpload(uploaded.id, uploaded.folder_id);
          } catch (err) { setFiles((p) => p.map((f) => f.id === id ? { ...f, status: "error", error: err.message } : f)); } 
        }
        else { setStagedFiles((p) => p.map((f) => f.id === id ? { ...f, status: "done", text: r.text, pages: r.pages, progress: 100 } : f)); }
      } else {
        const updateProgress = (prog) => {
          const up = (p) => p.map((f) => f.id === id ? { ...f, progress: prog } : f);
          if (folderId) setFiles(up);
        };
        updateProgress(50);
        try {
          const uploaded = await api.uploadFile(rawFile, folderId, null, 0, true); // skipNotification=true
          const norm = { id: uploaded.id, name: uploaded.name, size: Number(uploaded.file_size_bytes || 0), type: uploaded.mime_type || rawFile.type, pages: 0, status: "done", text: null, folderId: uploaded.folder_id, fileStoragePath: uploaded.file_storage_path, uploadedAt: uploaded.uploaded_at || new Date().toISOString(), uploadedBy: uploaded.uploaded_by_name || loggedInUser?.name || null, progress: 100 };
          setFiles((p) => p.map((f) => f.id === id ? norm : f));
          // Track successful upload for batch notification
          trackSuccessfulUpload(uploaded.id, uploaded.folder_id);
        } catch (err) { setFiles((p) => p.map((f) => f.id === id ? { ...f, status: "error", error: err.message } : f)); }
      }
    } catch { const up = (p) => p.map((f) => f.id === id ? { ...f, status: "error", error: "Failed" } : f); if (folderId) setFiles(up); else setStagedFiles(up); }
  }, [trackSuccessfulUpload]);

  const handleUploadFiles = useCallback((fl) => { 
    const files = Array.from(fl);
    files.forEach((f) => processFile(f, null));
  }, [processFile]);
  const handleDrop = useCallback((e) => { e.preventDefault(); setDragOver(false); handleUploadFiles(e.dataTransfer.files); }, [handleUploadFiles]);

  const readDirectoryContents = async (directoryEntry, path = "", skipCount = { value: 0 }) => {
    const files = [];
    const entries = await new Promise((resolve, reject) => {
      const reader = directoryEntry.createReader();
      const allEntries = [];
      const readEntries = () => {
        reader.readEntries((entries) => {
          if (entries.length === 0) {
            resolve(allEntries);
          } else {
            allEntries.push(...entries);
            readEntries();
          }
        }, reject);
      };
      readEntries();
    });
    
    const validExtensions = [".pdf", ".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".svg"];
    const skipExtensions = [".ds_store", ".db", ".tmp", ".bak", ".log", ".txt", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".zip", ".rar", ".7z", ".exe", ".dmg", ".app"];
    
    for (const entry of entries) {
      const entryPath = path ? `${path}/${entry.name}` : entry.name;
      if (entry.isFile) {
        const lowerName = entry.name.toLowerCase();
        const dotIdx = lowerName.lastIndexOf('.');
        const ext = dotIdx >= 0 ? lowerName.slice(dotIdx) : '';
        if (lowerName.startsWith('.') || !validExtensions.includes(ext)) {
          skipCount.value++;
          continue;
        }
        const file = await new Promise((resolve, reject) => {
          entry.file(resolve, reject);
        });
        files.push({ file, path: entryPath, name: entry.name });
      } else if (entry.isDirectory) {
        const subFiles = await readDirectoryContents(entry, entryPath, skipCount);
        files.push(...subFiles);
      }
    }
    return files;
  };

  const handleFolderDetailDrop = useCallback(async (e) => {
    e.preventDefault();
    setFolderDetailDragOver(false);
    if (!activeFolderId) return;

    const activeFolderObj = folders.find((f) => f.id === activeFolderId);
    if (!activeFolderObj) return;

    const items = e.dataTransfer.items;
    if (!items) {
      Array.from(e.dataTransfer.files).forEach((f) => processFile(f, activeFolderId));
      return;
    }

    for (const item of items) {
      const entry = item.webkitGetAsEntry?.() || item.getAsEntry?.();
      if (!entry) continue;

      if (entry.isFile) {
        const file = await new Promise((resolve, reject) => {
          entry.file(resolve, reject);
        });
        processFile(file, activeFolderId);
      } else if (entry.isDirectory) {
        const skipCount = { value: 0 };
        const allFiles = await readDirectoryContents(entry, "", skipCount);
        const folderName = entry.name;
        
        try {
          const created = await api.createFolder(folderName, activeFolderObj.locationId, activeFolderObj.departmentId, activeFolderId);
          setFolders((p) => [...p, { id: created.id, name: created.name, locationId: created.location_id || created.locationId, departmentId: created.department_id || created.departmentId, parentId: created.parent_id || created.parentId || null, createdAt: created.created_at }]);
          const msg = skipCount.value > 0 
            ? `"${folderName}" created with ${allFiles.length} file${allFiles.length !== 1 ? "s" : ""} (${skipCount.value} skipped)`
            : `"${folderName}" has been created with ${allFiles.length} file${allFiles.length !== 1 ? "s" : ""}`;
          addToast("Folder created", msg, 4000, "create");
          
          for (const { file } of allFiles) {
            processFile(file, created.id);
          }
        } catch (err) {
          console.error("Failed to create folder:", err);
          addToast("Error", `Failed to create folder "${folderName}"`, 4000, "error");
        }
      }
    }
  }, [processFile, activeFolderId, folders]);
  const handleFolderDetailFiles = useCallback((fl) => { if (!activeFolderId) return; Array.from(fl).forEach((f) => processFile(f, activeFolderId)); }, [processFile, activeFolderId]);

  const handleDeptDrop = useCallback(async (e) => {
    e.preventDefault();
    setDeptDragOver(false);
    if (!activeDepartment ||!activeLocation) return;

    const items = e.dataTransfer.items;
    if (!items) {
      handleUploadFiles(e.dataTransfer.files);
      return;
    }

    for (const item of items) {
      const entry = item.webkitGetAsEntry?.() || item.getAsEntry?.();
      if (!entry) continue;

      if (entry.isFile) {
        const file = await new Promise((resolve, reject) => {
          entry.file(resolve, reject);
        });
        processFile(file, null);
      } else if (entry.isDirectory) {
        const skipCount = { value: 0 };
        const allFiles = await readDirectoryContents(entry, "", skipCount);
        const folderName = entry.name;
        
        try {
          let folder;
          try {
            folder = await api.findFolder(folderName, activeLocation, activeDepartment, null);
          } catch {
            folder = await api.createFolder(folderName, activeLocation, activeDepartment, null);
            setFolders((p) => [...p, { id: folder.id, name: folder.name, locationId: folder.location_id || folder.locationId, departmentId: folder.department_id || folder.departmentId, parentId: null, createdAt: folder.created_at }]);
          }
          
          const folderId = folder.id;
          const msg = skipCount.value > 0 
            ? `${allFiles.length} file${allFiles.length !== 1 ? "s" : ""} uploaded to "${folderName}" (${skipCount.value} skipped)`
            : `${allFiles.length} file${allFiles.length !== 1 ? "s" : ""} uploaded to "${folderName}"`;
          addToast("Upload complete", msg, 4000, "create");
          
          for (const { file } of allFiles) {
            processFile(file, folderId);
          }
        } catch (err) {
          console.error("Failed to process folder:", err);
          addToast("Error", `Failed to process folder "${folderName}"`, 4000, "error");
        }
      }
    }
  }, [processFile, handleUploadFiles, activeDepartment, activeLocation, addToast, setFolders]);

  const handleDeptFiles = useCallback((fl) => {
    handleUploadFiles(fl);
  }, [handleUploadFiles]);

  const handleBulkFolderUpload = useCallback(async (fileList) => {
    if (!activeDepartment || !activeLocation) return;

    const validExtensions = [".pdf", ".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".svg"];
    const folderCache = new Map();

    const processFilesFromList = async () => {
      const fileData = Array.from(fileList).filter(f => {
        const lowerName = f.name.toLowerCase();
        const dotIdx = lowerName.lastIndexOf('.');
        const ext = dotIdx >= 0 ? lowerName.slice(dotIdx) : '';
        return !lowerName.startsWith('.') && validExtensions.includes(ext);
      });

      const pathMap = new Map();
      for (const file of fileData) {
        const relPath = file.webkitRelativePath || file.name;
        pathMap.set(relPath, file);
      }

      const uniquePaths = [...pathMap.keys()].sort();

      const getFolderPathParts = (relPath) => {
        const parts = relPath.split('/');
        return parts.slice(0, -1);
      };

      const allFolderPaths = new Set();
      for (const relPath of uniquePaths) {
        const folderParts = getFolderPathParts(relPath);
        let currentPath = "";
        for (const part of folderParts) {
          currentPath = currentPath ? `${currentPath}/${part}` : part;
          allFolderPaths.add(currentPath);
        }
      }

      const sortedFolderPaths = [...allFolderPaths].sort((a, b) => a.split('/').length - b.split('/').length);

      const createOrFindFolder = async (folderPath) => {
        if (folderCache.has(folderPath)) return folderCache.get(folderPath);

        const parts = folderPath.split('/');
        let parentId = null;
        let currentPath = "";

        for (const part of parts) {
          currentPath = currentPath ? `${currentPath}/${part}` : part;

          if (folderCache.has(currentPath)) {
            parentId = folderCache.get(currentPath);
            continue;
          }

          try {
            const existing = await api.findFolder(part, activeLocation, activeDepartment, parentId);
            folderCache.set(currentPath, existing.id);
            parentId = existing.id;
          } catch {
            try {
              const created = await api.createFolder(part, activeLocation, activeDepartment, parentId);
              setFolders((p) => [...p, {
                id: created.id,
                name: created.name,
                locationId: created.location_id || created.locationId,
                departmentId: created.department_id || created.departmentId,
                parentId: created.parent_id || created.parentId || null,
                createdAt: created.created_at
              }]);
              folderCache.set(currentPath, created.id);
              parentId = created.id;
            } catch (err) {
              console.error("Failed to create folder:", err);
              return null;
            }
          }
        }

        return folderCache.get(folderPath);
      };

      for (const folderPath of sortedFolderPaths) {
        await createOrFindFolder(folderPath);
      }

      let filesUploaded = 0;
      for (const file of fileData) {
        const relPath = file.webkitRelativePath || file.name;
        const folderParts = getFolderPathParts(relPath);
        const folderPath = folderParts.join('/');

        let targetFolderId = null;
        if (folderPath) {
          const fid = await createOrFindFolder(folderPath);
          targetFolderId = fid;
        }

        processFile(file, targetFolderId);
        filesUploaded++;
      }

      if (filesUploaded > 0) {
        addToast("Upload complete", `${filesUploaded} file${filesUploaded !== 1 ? "s" : ""} uploaded`, 4000, "create");
      }
    };

    processFilesFromList();
  }, [activeDepartment, activeLocation, processFile, setFolders, addToast]);

  const removeFile = async (id) => { 
    const file = files.find((f) => f.id === id);
    try { await api.deleteFile(id); } catch (err) { console.error(err); } 
    setFiles((p) => p.filter((f) => f.id !== id)); 
    if (selectedFile?.id === id) setSelectedFile(null); 
    if (viewingFileId === id) { setViewingFileId(null); setPage("folder-detail"); }
    if (file) addToast("File deleted", `"${file.name}" has been deleted`, 4000, "delete");
  };
  const renameFile = async (id, newName) => { const n = newName.trim(); if (n) { try { await api.renameFile(id, n); setFiles((p) => p.map((f) => f.id === id ? { ...f, name: n } : f)); } catch (err) { console.error(err); } } setRenamingFileId(null); };
  const handleMoveFile = async (fileId, folderId) => { try { await api.moveFile(fileId, folderId); setUnsortedFiles((p) => p.filter((f) => f.id !== fileId)); } catch (err) { console.error("Move failed:", err); } };

  const createSubfolder = async () => { 
    const name = newSubfolderName.trim(); 
    if (!name || !activeFolderId) { setCreatingSubfolder(false); return; } 
    const parent = folders.find((f) => f.id === activeFolderId); 
    if (!parent) return; 
    try { 
      const created = await api.createFolder(name, parent.locationId, parent.departmentId, activeFolderId); 
      setFolders((p) => [...p, { id: created.id, name: created.name, locationId: created.location_id || created.locationId, departmentId: created.department_id || created.departmentId, parentId: created.parent_id || created.parentId || null, createdAt: created.created_at }]);
      addToast("Folder created", `"${name}" has been created`, 4000, "create");
    } catch (err) { console.error(err); } 
    setNewSubfolderName(""); setCreatingSubfolder(false); 
  };
  const createDeptFolder = async () => { 
    const name = newDeptFolderName.trim(); 
    if (!name) { setCreatingDeptFolder(false); return; } 
    try { 
      const created = await api.createFolder(name, activeLocation, activeDepartment, null); 
      setFolders((p) => [...p, { id: created.id, name: created.name, locationId: created.location_id || created.locationId, departmentId: created.department_id || created.departmentId, parentId: null, createdAt: created.created_at }]);
      addToast("Folder created", `"${name}" has been created`, 4000, "create");
    } catch (err) { console.error(err); } 
    setNewDeptFolderName(""); setCreatingDeptFolder(false); 
  };

  const handleDeleteFolder = (folder) => {
    const childFolders = subfoldersOf(folder.id);
    const fileCount = allFilesInFolderRecursive(folder.id);
    const hasFiles = fileCount > 0;
    const message = hasFiles
      ? `"${folder.name}" contains ${fileCount} file${fileCount !== 1 ? "s" : ""}. What would you like to do with the files?`
      : `Delete the folder "${folder.name}"? This cannot be undone.`;
    
    // Helper to get all descendant folder IDs
    const getAllDescendants = (pid) => { 
      const ch = subfoldersOf(pid); 
      let all = []; 
      for (const c of ch) { all = [...all, ...getAllDescendants(c.id), c]; } 
      return all; 
    };
    const descendants = getAllDescendants(folder.id); 
    const allFolderIds = new Set([folder.id, ...descendants.map((d) => d.id)]);
    
    // Unlink files (move them to unsorted) and delete folder
    const doUnlink = async () => { 
      try { 
        // Backend will set folder_id = NULL for all files in this folder
        for (const desc of descendants) { await api.deleteFolder(desc.id).catch(console.error); } 
        await api.deleteFolder(folder.id); 
        
        // Update local state - set folderId to null for files in deleted folders
        setFiles((p) => p.map((f) => 
          allFolderIds.has(f.folderId) ? { ...f, folderId: null } : f
        ));
        setFolders((p) => p.filter((f) => !allFolderIds.has(f.id))); 
        
        if (activeFolderId === folder.id || allFolderIds.has(activeFolderId)) { 
          if (folder.parentId) setActiveFolderId(folder.parentId); 
          else { setActiveFolderId(null); setPage("folders"); } 
        }
        addToast("Folder deleted", `"${folder.name}" has been deleted`, 4000, "delete");
      } catch (err) { console.error(err); } 
    };
    
    // Delete folder and all files inside it
    const doDeleteAll = async () => { 
      try { 
        // Get all files in this folder and subfolders
        const filesToDelete = files.filter((f) => allFolderIds.has(f.folderId));
        
        // Delete all files first
        for (const file of filesToDelete) {
          await api.deleteFile(file.id).catch(console.error);
        }
        
        // Delete subfolders then main folder
        for (const desc of descendants) { await api.deleteFolder(desc.id).catch(console.error); } 
        await api.deleteFolder(folder.id); 
        
        // Remove files and folders from local state
        setFiles((p) => p.filter((f) => !allFolderIds.has(f.folderId))); 
        setFolders((p) => p.filter((f) => !allFolderIds.has(f.id))); 
        
        if (activeFolderId === folder.id || allFolderIds.has(activeFolderId)) { 
          if (folder.parentId) setActiveFolderId(folder.parentId); 
          else { setActiveFolderId(null); setPage("folders"); } 
        }
        addToast("Folder and files deleted", `"${folder.name}" and ${filesToDelete.length} file${filesToDelete.length !== 1 ? "s" : ""} have been deleted`, 4000, "delete");
      } catch (err) { console.error(err); } 
    };
    
    // Show confirmation modal for delete all
    const handleDeleteAllClick = () => {
      const filesToDelete = files.filter((f) => allFolderIds.has(f.folderId));
      
      setDeleteConfirmModal({
        title: "Confirm Delete",
        message: `Are you sure you want to permanently delete "${folder.name}" and all its contents?`,
        itemCount: filesToDelete.length,
        itemType: "file",
        onConfirm: doDeleteAll,
      });
    };
    
    setWarningModal({ 
      title: "Delete Folder", 
      message, 
      onConfirmUnlink: hasFiles ? doUnlink : undefined,
      onConfirmDeleteAll: doDeleteAll,
      onDeleteAllClick: handleDeleteAllClick
    });
  };

  const handleDeleteLocation = (loc) => { 
    const lf = foldersInLocation(loc.id), lFiles = lf.reduce((s, f) => s + filesInFolder(f.id).length, 0); 
    const doDelete = async () => { 
      try { 
        await api.deleteLocation(loc.id); 
        setFiles((p) => p.filter((f) => !new Set(lf.map((ff) => ff.id)).has(f.folderId))); 
        setFolders((p) => p.filter((f) => f.locationId !== loc.id)); 
        setDepartments((p) => p.filter((d) => d.locationId !== loc.id)); 
        setLocations((p) => p.filter((l) => l.id !== loc.id)); 
        if (activeLocation === loc.id) { const rem = locations.filter((l) => l.id !== loc.id); if (rem.length) setActiveLocation(rem[0].id); }
        addToast("Location deleted", `"${loc.name}" has been deleted`, 4000, "delete");
      } catch (err) { console.error(err); } 
    }; 
    if (lf.length > 0 || lFiles > 0) setWarningModal({ title: `Remove "${loc.name}"?`, message: `This location has ${lf.length} folder(s) and ${lFiles} file(s). Are you sure?`, onConfirm: doDelete }); else doDelete(); 
  };
  const handleDeleteDept = (dept, locName) => { 
    const df = foldersInDepartment(dept.id), dFiles = df.reduce((s, f) => s + filesInFolder(f.id).length, 0); 
    const doDelete = async () => { 
      try { 
        await api.deleteDepartment(dept.id); 
        setFiles((p) => p.filter((f) => !new Set(df.map((ff) => ff.id)).has(f.folderId))); 
        setFolders((p) => p.filter((f) => f.departmentId !== dept.id)); 
        setDepartments((p) => p.filter((d) => d.id !== dept.id)); 
        if (activeDepartment === dept.id) { const rem = deptsInLocation(dept.locationId).filter((d) => d.id !== dept.id); if (rem.length) setActiveDepartment(rem[0].id); }
        addToast("Department deleted", `"${dept.name}" has been deleted`, 4000, "delete");
      } catch (err) { console.error(err); } 
    }; 
    if (df.length > 0 || dFiles > 0) setWarningModal({ title: `Remove "${dept.name}" from ${locName}?`, message: `This department has ${df.length} folder(s) and ${dFiles} file(s). Are you sure?`, onConfirm: doDelete }); else doDelete(); 
  };

  const uploadAllStaged = async () => { 
    const ready = stagedFiles.filter((f) => f.status === "done"); 
    if (ready.length === 0) return; 
    let successCount = 0;
    for (const sf of ready) { 
      try { 
        await api.uploadFile(sf._rawFile || new Blob(), stagedFolderAssignments[sf.id] || null, sf.text, sf.pages);
        successCount++;
      } catch (err) { console.error(err); } 
    }
    if (successCount > 0) {
      addToast("Files uploaded", `${successCount} file${successCount !== 1 ? "s" : ""} uploaded successfully`, 5000, "upload");
    }
    setStagedFiles((p) => p.filter((f) => f.status === "processing")); 
    setStagedFolderAssignments({}); 
    setStagedSuggestions({}); 
    api.getUnsortedFiles().then((rows) => { setUnsortedFiles(rows.map((f) => ({ id: f.id, name: f.name, size: Number(f.file_size_bytes || 0), type: f.mime_type || "application/pdf", pages: Number(f.page_count || 0), status: f.status, text: f.extracted_text, folderId: null, fileStoragePath: f.file_storage_path, uploadedAt: f.uploaded_at || null, uploadedBy: f.uploaded_by_name || f.uploaded_by || null, error: f.error_message, progress: f.status === "done" ? 100 : 0 }))); }).catch(console.error); 
  };
  const removeStagedFile = (id) => { setStagedFiles((p) => p.filter((f) => f.id !== id)); setStagedFolderAssignments((p) => { const n = { ...p }; delete n[id]; return n; }); setStagedSuggestions((p) => { const n = { ...p }; delete n[id]; return n; }); };

  const handleChangePassword = async () => { setChangePasswordError(""); setChangePasswordSuccess(""); if (!changePasswordForm.current || !changePasswordForm.new || !changePasswordForm.confirm) { setChangePasswordError("All fields are required."); return; } if (changePasswordForm.new.length < 6) { setChangePasswordError("New password must be at least 6 characters."); return; } if (changePasswordForm.new !== changePasswordForm.confirm) { setChangePasswordError("New passwords do not match."); return; } setChangePasswordLoading(true); try { await api.changePassword(changePasswordForm.current, changePasswordForm.new); setChangePasswordSuccess("Password changed successfully."); setChangePasswordForm({ current: "", new: "", confirm: "" }); setTimeout(() => { setShowChangePassword(false); setChangePasswordSuccess(""); }, 1500); } catch (err) { setChangePasswordError(err.message || "Failed."); } finally { setChangePasswordLoading(false); } };
  const handleAdminSetPassword = async () => { setAdminSetPasswordError(""); setAdminSetPasswordSuccess(""); if (!adminSetPasswordForm.new || !adminSetPasswordForm.confirm) { setAdminSetPasswordError("All fields are required."); return; } if (adminSetPasswordForm.new.length < 6) { setAdminSetPasswordError("Password must be at least 6 characters."); return; } if (adminSetPasswordForm.new !== adminSetPasswordForm.confirm) { setAdminSetPasswordError("Passwords do not match."); return; } setAdminSetPasswordLoading(true); try { const result = await api.adminSetPassword(adminSetPasswordUserId, adminSetPasswordForm.new); setAdminSetPasswordSuccess(result.message || "Password set successfully."); setAdminSetPasswordForm({ new: "", confirm: "" }); setTimeout(() => { setAdminSetPasswordUserId(null); setAdminSetPasswordSuccess(""); }, 1500); } catch (err) { setAdminSetPasswordError(err.message || "Failed."); } finally { setAdminSetPasswordLoading(false); } };

  // ── Render ──────────────────────────────────────────────
  if (!isLoggedIn) return <LoginScreen loginForm={loginForm} setLoginForm={setLoginForm} loginError={loginError} setLoginError={setLoginError} loginLoading={loginLoading} handleLogin={handleLogin} darkMode={darkMode} setDarkMode={setDarkMode} t={t} />;

  return (
    <div style={{ minHeight: "100vh", background: t.pageBg, color: t.text, fontFamily: "'Geist','DM Sans',system-ui,sans-serif", transition: "background 0.35s" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />
      <link href="https://cdn.jsdelivr.net/npm/geist@1.2.2/dist/fonts/geist-sans/style.min.css" rel="stylesheet" />
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}} @keyframes modalIn{from{opacity:0;transform:scale(.96) translateY(8px)}to{opacity:1;transform:scale(1) translateY(0)}} @keyframes toastIn{from{opacity:0;transform:translateX(100px)}to{opacity:1;transform:translateX(0)}} @keyframes toastOut{from{opacity:1;transform:translateX(0)}to{opacity:0;transform:translateX(100px)}} .file-card:hover{transform:translateY(-1px);box-shadow:${t.cardShadow}} .folder-row:hover{transform:translateY(-1px);box-shadow:${t.cardShadow};border-color:${darkMode ? "#3a3f47" : t.accent}!important} .icon-btn:hover{color:${t.text}!important;background:${t.accentSoft}} .folder-select-item:hover{background:${t.accentSoft}!important} .nav-tab:hover{background:${t.navActive}} .admin-menu-item:hover{background:${t.accentSoft}} ::-webkit-scrollbar{width:5px} ::-webkit-scrollbar-track{background:transparent} ::-webkit-scrollbar-thumb{background:${t.scrollThumb};border-radius:3px} input::placeholder{color:${t.textDim}}`}</style>

      {page === "landing" && <LandingNavbar darkMode={darkMode} setDarkMode={setDarkMode} loggedInUser={loggedInUser} setPage={setPage} setShowChangePassword={setShowChangePassword} setChangePasswordForm={setChangePasswordForm} setChangePasswordError={setChangePasswordError} setChangePasswordSuccess={setChangePasswordSuccess} handleLogout={handleLogout} setShowSubscriptionsModal={setShowSubscriptionsModal} />}
      {page === "admin" && <AdminNavbar darkMode={darkMode} setDarkMode={setDarkMode} loggedInUser={loggedInUser} page={page} setPage={setPage} setShowChangePassword={setShowChangePassword} setChangePasswordForm={setChangePasswordForm} setChangePasswordError={setChangePasswordError} setChangePasswordSuccess={setChangePasswordSuccess} handleLogout={handleLogout} setShowSubscriptionsModal={setShowSubscriptionsModal} setAdminSection={setAdminSection} onOpenHelpTicket={() => setShowHelpTicketModal(true)} />}
{page === "cht" && <CHTNavbar darkMode={darkMode} setDarkMode={setDarkMode} loggedInUser={loggedInUser} page={page} setPage={setPage} setShowChangePassword={setShowChangePassword} setChangePasswordForm={setChangePasswordForm} setChangePasswordError={setChangePasswordError} setChangePasswordSuccess={setChangePasswordSuccess} handleLogout={handleLogout} setShowSubscriptionsModal={setShowSubscriptionsModal} setAdminSection={setAdminSection} onOpenHelpTicket={() => setShowHelpTicketModal(true)} onOpenInquiry={(inquiryId) => setChtInquiryIdFromAlert(inquiryId)} onShowToast={(toast) => addToast(toast.title, toast.message, toast.duration || 5000, toast.type || 'cht', toast.onClick)} />}
{page !== "landing" && page !== "admin" && page !== "cht" && <Navbar page={page} setPage={setPage} darkMode={darkMode} setDarkMode={setDarkMode} isLoggedIn={isLoggedIn} loggedInUser={loggedInUser} locations={locations} departments={departments} folders={folders} files={files} unsortedFiles={unsortedFiles} stagedFiles={stagedFiles} activeLocation={activeLocation} setActiveLocation={setActiveLocation} activeDepartment={activeDepartment} setActiveDepartment={setActiveDepartment} setActiveFolderId={setActiveFolderId} setSelectedFile={setSelectedFile} setViewingFileId={setViewingFileId} setFolderSearch={setFolderSearch} expandedLocations={expandedLocations} setExpandedLocations={setExpandedLocations} showDeptDropdown={showDeptDropdown} setShowDeptDropdown={setShowDeptDropdown} showProfileMenu={showProfileMenu} setShowProfileMenu={setShowProfileMenu} setShowChangePassword={setShowChangePassword} setChangePasswordForm={setChangePasswordForm} setChangePasswordError={setChangePasswordError} setChangePasswordSuccess={setChangePasswordSuccess} setAdminSection={setAdminSection} handleLogout={handleLogout} foldersInLocation={foldersInLocation} foldersInDepartment={foldersInDepartment} deptsInLocation={deptsInLocation} filesInFolder={filesInFolder} setShowSubscriptionsModal={setShowSubscriptionsModal} setViewingFileIdFromAlert={setViewingFileIdFromAlert} onOpenHelpTicket={() => setShowHelpTicketModal(true)} dashboardData={dashboardData} t={t} />}

{page === "landing" && <LandingPage setPage={setPage} t={t} darkMode={darkMode} loggedInUser={loggedInUser} onOpenHelpTicket={() => setShowHelpTicketModal(true)} />}
{page === "cht" && <CHTDashboardPage loggedInUser={loggedInUser} t={t} darkMode={darkMode} openInquiryId={chtInquiryIdFromAlert} onInquiryOpened={() => setChtInquiryIdFromAlert(null)} />}
      {page === "settings" && <SettingsPage darkMode={darkMode} setDarkMode={setDarkMode} t={t} />}
      {page === "dashboard" && <DashboardPage dashboardData={dashboardData} loggedInUser={loggedInUser} locations={locations} departments={departments} setPage={setPage} setActiveFolderId={setActiveFolderId} setActiveLocation={setActiveLocation} setActiveDepartment={setActiveDepartment} setViewingFileId={setViewingFileId} t={t} darkMode={darkMode} />}
      {page === "folders-browse" && <FoldersBrowsePage locations={locations} departments={departments} deptsInLocation={deptsInLocation} setActiveLocation={setActiveLocation} setActiveDepartment={setActiveDepartment} setActiveFolderId={setActiveFolderId} setFolderSearch={setFolderSearch} setSelectedFile={setSelectedFile} setPage={setPage} subscriptions={subscriptions} setSubscriptions={setSubscriptions} t={t} darkMode={darkMode} />}
      {page === "folders" && <FoldersPage currentLocation={currentLocation} currentDept={currentDept} currentDeptFolders={currentDeptFolders} folderSearch={folderSearch} setFolderSearch={setFolderSearch} creatingDeptFolder={creatingDeptFolder} setCreatingDeptFolder={setCreatingDeptFolder} newDeptFolderName={newDeptFolderName} setNewDeptFolderName={setNewDeptFolderName} createDeptFolder={createDeptFolder} setActiveFolderId={setActiveFolderId} setPage={setPage} setCreatingSubfolder={setCreatingSubfolder} handleDeleteFolder={handleDeleteFolder} subscriptions={subscriptions} setSubscriptions={setSubscriptions} loggedInUser={loggedInUser} t={t} darkMode={darkMode} handleDeptDrop={handleDeptDrop} deptDragOver={deptDragOver} setDeptDragOver={setDeptDragOver} handleDeptFiles={handleDeptFiles} handleBulkFolderUpload={handleBulkFolderUpload} />}
      {page === "folder-detail" && <FolderDetailPage activeFolder={activeFolder} activeFolderId={activeFolderId} filesInFolder={filesInFolder} subfoldersOf={subfoldersOf} allFilesInFolderRecursive={allFilesInFolderRecursive} getBreadcrumb={getBreadcrumb} locations={locations} departments={departments} folders={folders} setActiveFolderId={setActiveFolderId} setPage={setPage} setSelectedFile={setSelectedFile} setViewingFileId={setViewingFileId} setRenamingFileId={setRenamingFileId} setRenamingFileName={setRenamingFileName} copyText={copyText} removeFile={removeFile} handleDeleteFolder={handleDeleteFolder} creatingSubfolder={creatingSubfolder} setCreatingSubfolder={setCreatingSubfolder} newSubfolderName={newSubfolderName} setNewSubfolderName={setNewSubfolderName} createSubfolder={createSubfolder} folderDetailDragOver={folderDetailDragOver} setFolderDetailDragOver={setFolderDetailDragOver} handleFolderDetailDrop={handleFolderDetailDrop} handleFolderDetailFiles={handleFolderDetailFiles} subscriptions={subscriptions} setSubscriptions={setSubscriptions} loggedInUser={loggedInUser} t={t} darkMode={darkMode} />}
      {page === "file-detail" && <FileDetailPage viewingFileId={viewingFileId} files={files} folders={folders} locations={locations} departments={departments} getBreadcrumb={getBreadcrumb} setViewingFileId={setViewingFileId} setActiveFolderId={setActiveFolderId} setPage={setPage} setRenamingFileId={setRenamingFileId} setRenamingFileName={setRenamingFileName} removeFile={removeFile} loggedInUser={loggedInUser} t={t} darkMode={darkMode} />}
      {page === "unsorted" && <UnsortedPage unsortedFiles={unsortedFiles} folders={folders} locations={locations} departments={departments} deptsInLocation={deptsInLocation} handleMoveFile={handleMoveFile} removeFile={removeFile} setUnsortedFiles={setUnsortedFiles} setWarningModal={setWarningModal} loggedInUser={loggedInUser} t={t} darkMode={darkMode} />}
      {page === "upload" && <UploadPage stagedFiles={stagedFiles} setStagedFiles={setStagedFiles} stagedFolderAssignments={stagedFolderAssignments} setStagedFolderAssignments={setStagedFolderAssignments} stagedSuggestions={stagedSuggestions} setStagedSuggestions={setStagedSuggestions} folders={folders} locations={locations} departments={departments} deptsInLocation={deptsInLocation} handleDrop={handleDrop} handleUploadFiles={handleUploadFiles} dragOver={dragOver} setDragOver={setDragOver} uploadAllStaged={uploadAllStaged} removeStagedFile={removeStagedFile} t={t} darkMode={darkMode} />}
      {page === "admin" && <AdminPage adminSection={adminSection} setAdminSection={setAdminSection} setPage={setPage} adminUsers={adminUsers} setAdminUsers={setAdminUsers} setAdminSetPasswordUserId={setAdminSetPasswordUserId} setAdminSetPasswordForm={setAdminSetPasswordForm} setAdminSetPasswordError={setAdminSetPasswordError} setAdminSetPasswordSuccess={setAdminSetPasswordSuccess} securityGroups={securityGroups} setSecurityGroups={setSecurityGroups} editingGroupId={editingGroupId} setEditingGroupId={setEditingGroupId} addingGroup={addingGroup} setAddingGroup={setAddingGroup} newGroupName={newGroupName} setNewGroupName={setNewGroupName} newGroupDesc={newGroupDesc} setNewGroupDesc={setNewGroupDesc} setWarningModal={setWarningModal} loggedInUser={loggedInUser} locations={locations} setLocations={setLocations} addingLocation={addingLocation} setAddingLocation={setAddingLocation} newLocationName={newLocationName} setNewLocationName={setNewLocationName} newLocationCode={newLocationCode} setNewLocationCode={setNewLocationCode} editingLocationId={editingLocationId} setEditingLocationId={setEditingLocationId} editingLocationName={editingLocationName} setEditingLocationName={setEditingLocationName} editingLocationCode={editingLocationCode} setEditingLocationCode={setEditingLocationCode} foldersInLocation={foldersInLocation} filesInFolder={filesInFolder} handleDeleteLocation={handleDeleteLocation} departments={departments} setDepartments={setDepartments} deptsInLocation={deptsInLocation} foldersInDepartment={foldersInDepartment} addingDept={addingDept} setAddingDept={setAddingDept} addingDeptLocId={addingDeptLocId} setAddingDeptLocId={setAddingDeptLocId} newDeptName={newDeptName} setNewDeptName={setNewDeptName} editingDeptId={editingDeptId} setEditingDeptId={setEditingDeptId} editingDeptName={editingDeptName} setEditingDeptName={setEditingDeptName} handleDeleteDept={handleDeleteDept} auditLog={auditLog} auditFilterUser={auditFilterUser} setAuditFilterUser={setAuditFilterUser} auditFilterAction={auditFilterAction} setAuditFilterAction={setAuditFilterAction} auditFilterDate={auditFilterDate} setAuditFilterDate={setAuditFilterDate} locationAccess={locationAccess} setLocationAccess={setLocationAccess} departmentAccess={departmentAccess} setDepartmentAccess={setDepartmentAccess} subscriptions={subscriptions} setSubscriptions={setSubscriptions} totalPermissionCount={totalPermissionCount} setTotalPermissionCount={setTotalPermissionCount} t={t} darkMode={darkMode} addToast={addToast} />}

      <RenameModal renamingFileId={renamingFileId} renamingFileName={renamingFileName} setRenamingFileId={setRenamingFileId} setRenamingFileName={setRenamingFileName} renameFile={renameFile} t={t} darkMode={darkMode} />
      <WarningModal warningModal={warningModal} setWarningModal={setWarningModal} t={t} darkMode={darkMode} />
      <ConfirmDeleteModal
        isOpen={!!deleteConfirmModal}
        onClose={() => setDeleteConfirmModal(null)}
        title={deleteConfirmModal?.title || "Confirm Delete"}
        message={deleteConfirmModal?.message || ""}
        itemCount={deleteConfirmModal?.itemCount}
        itemType={deleteConfirmModal?.itemType}
        onConfirm={deleteConfirmModal?.onConfirm}
        confirmText="Delete All"
        t={t}
        darkMode={darkMode}
      />
      <ChangePasswordModal show={showChangePassword} form={changePasswordForm} setForm={setChangePasswordForm} error={changePasswordError} setError={setChangePasswordError} success={changePasswordSuccess} setSuccess={setChangePasswordSuccess} loading={changePasswordLoading} onSubmit={handleChangePassword} onClose={() => setShowChangePassword(false)} t={t} darkMode={darkMode} />
      <AdminSetPasswordModal userId={adminSetPasswordUserId} userName={adminUsers.find((u) => u.id === adminSetPasswordUserId)?.name} form={adminSetPasswordForm} setForm={setAdminSetPasswordForm} error={adminSetPasswordError} setError={setAdminSetPasswordError} success={adminSetPasswordSuccess} setSuccess={setAdminSetPasswordSuccess} loading={adminSetPasswordLoading} onSubmit={handleAdminSetPassword} onClose={() => setAdminSetPasswordUserId(null)} t={t} darkMode={darkMode} />
      <SubscriptionsModal show={showSubscriptionsModal} onClose={() => setShowSubscriptionsModal(false)} subscriptions={subscriptions} setSubscriptions={setSubscriptions} t={t} darkMode={darkMode} />
      <HelpTicketModal show={showHelpTicketModal} onClose={() => setShowHelpTicketModal(false)} darkMode={darkMode} loggedInUser={loggedInUser} />
      <Toast toasts={toasts} removeToast={removeToast} darkMode={darkMode} />
    </div>
  );
}

export default function App() {
  return <ErrorBoundary><AppInner /></ErrorBoundary>;
}
