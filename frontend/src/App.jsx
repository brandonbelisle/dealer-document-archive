import { useState, useRef, useCallback, useEffect, Component } from "react";
import * as api from "./api";

/* Error Boundary — catches React render crashes and shows a recovery UI */
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error("React Error Boundary:", error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0f1114", color: "#e1e4e8", fontFamily: "system-ui, sans-serif" }}>
          <div style={{ textAlign: "center", maxWidth: 400, padding: 24 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚠</div>
            <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Something went wrong</h1>
            <p style={{ fontSize: 13, color: "#8b929a", marginBottom: 20 }}>{this.state.error?.message || "An unexpected error occurred"}</p>
            <button onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }} style={{ background: "#58a6ff", color: "#fff", border: "none", borderRadius: 8, padding: "10px 24px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Reload</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const ACCEPTED_TYPE = "application/pdf";
const extractTextFromPDF = async (file, onProgress) => { const pdfjsLib = window.pdfjsLib; const ab = await file.arrayBuffer(); const pdf = await pdfjsLib.getDocument({ data: ab }).promise; const n = pdf.numPages; let txt = ""; for (let i = 1; i <= n; i++) { const pg = await pdf.getPage(i); const c = await pg.getTextContent(); txt += `\n--- Page ${i} ---\n${c.items.map(x => x.str).join(" ")}`; onProgress(Math.round((i / n) * 100)); } return { text: txt.trim(), pages: n }; };
const loadPDFJS = () => new Promise((resolve, reject) => { if (window.pdfjsLib) return resolve(); const s = document.createElement("script"); s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"; s.onload = () => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js"; resolve(); }; s.onerror = reject; document.head.appendChild(s); });
const fmtSize = b => b < 1024 ? b + " B" : b < 1048576 ? (b / 1024).toFixed(1) + " KB" : (b / 1048576).toFixed(1) + " MB";
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const fuzzyMatch = (query, target) => { const q = query.toLowerCase(), tgt = target.toLowerCase(); if (tgt.includes(q)) return { match: true, score: 100 + q.length, indices: [] }; let qi = 0; const indices = []; let score = 0, lastIdx = -1; for (let ti = 0; ti < tgt.length && qi < q.length; ti++) { if (tgt[ti] === q[qi]) { indices.push(ti); score += (lastIdx === ti - 1) ? 8 : 3; if (ti === 0 || " -_".includes(tgt[ti - 1])) score += 5; lastIdx = ti; qi++; } } return qi === q.length ? { match: true, score, indices } : { match: false, score: 0, indices: [] }; };
const HighlightedName = ({ name, query, accentColor }) => { if (!query) return <span>{name}</span>; const q = query.toLowerCase(), lower = name.toLowerCase(), subIdx = lower.indexOf(q); if (subIdx !== -1) return <span>{name.slice(0, subIdx)}<span style={{ color: accentColor, fontWeight: 700 }}>{name.slice(subIdx, subIdx + q.length)}</span>{name.slice(subIdx + q.length)}</span>; const { indices } = fuzzyMatch(query, name); const s = new Set(indices); return <span>{name.split("").map((ch, i) => s.has(i) ? <span key={i} style={{ color: accentColor, fontWeight: 700 }}>{ch}</span> : <span key={i}>{ch}</span>)}</span>; };

const I = (d, size = 16, sw = 2) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">{d}</svg>;
const FolderClosedIcon = ({ size = 24 }) => I(<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />, size, 1.6);
const FolderOpenIcon = ({ size = 24 }) => I(<><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /><path d="M2 10h20" /></>, size, 1.6);
const FileDocIcon = ({ size = 20 }) => I(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></>, size, 1.7);
const UploadCloudIcon = ({ size = 44 }) => I(<><polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" /><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" /></>, size, 1.2);
const PlusIcon = ({ size = 16 }) => I(<><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>, size, 2.2);
const ArrowLeftIcon = () => I(<><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></>, 18);
const XIcon = ({ size = 16 }) => I(<><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>, size);
const CheckIcon = () => I(<polyline points="20 6 9 17 4 12" />, 14, 2.5);
const CopyIcon = () => I(<><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></>, 13);
const TrashIcon = ({ size = 13 }) => I(<><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></>, size);
const EditIcon = () => I(<><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></>, 12);
const SunIcon = () => I(<><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></>, 15);
const MoonIcon = () => I(<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />, 15);
const ChevronDown = () => I(<polyline points="6 9 12 15 18 9" />, 14, 2.5);
const ChevronIcon = ({ open }) => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? "rotate(90deg)" : "rotate(0)", transition: "transform 0.2s" }}><polyline points="9 18 15 12 9 6" /></svg>;
const ChevronRightIcon = () => I(<polyline points="9 18 15 12 9 6" />);
const MapPinIcon = ({ size = 15 }) => I(<><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></>, size);
const SearchIcon = ({ size = 16 }) => I(<><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></>, size);
const WrenchIcon = ({ size = 15 }) => I(<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />, size);
const GearIcon = ({ size = 15 }) => I(<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></>, size);
const UserIcon = ({ size = 15 }) => I(<><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>, size);
const ShieldIcon = ({ size = 15 }) => I(<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />, size);
const LogOutIcon = ({ size = 15 }) => I(<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></>, size);
const InboxIcon = ({ size = 15 }) => I(<><polyline points="22 12 16 12 14 15 10 15 8 12 2 12" /><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" /></>, size);
const UsersIcon = ({ size = 16 }) => I(<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>, size);
const LayersIcon = ({ size = 16 }) => I(<><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></>, size);
const ClipboardIcon = ({ size = 16 }) => I(<><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" ry="1" /></>, size);
const DashboardIcon = ({ size = 16 }) => I(<><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="4" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="11" width="7" height="10" rx="1" /></>, size, 1.8);
const TrendUpIcon = ({ size = 18 }) => I(<><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></>, size);
const AlertTriangleIcon = ({ size = 22 }) => I(<><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></>, size);

const DEFAULT_LOCATIONS = [];
const DEFAULT_DEPARTMENTS = [];
const ADMIN_MENU = [
  { id: "users", label: "Users", icon: <UsersIcon size={17} />, desc: "Manage user accounts and access" },
  { id: "groups", label: "Groups", icon: <ShieldIcon size={17} />, desc: "Manage security groups and permissions" },
  { id: "locations", label: "Locations", icon: <MapPinIcon size={17} />, desc: "Manage dealer locations" },
  { id: "departments", label: "Departments", icon: <LayersIcon size={17} />, desc: "Manage departments per location" },
  { id: "audit", label: "Audit Log", icon: <ClipboardIcon size={17} />, desc: "View system activity" },
  { id: "settings", label: "Settings", icon: <GearIcon size={17} />, desc: "Application configuration" },
];

/* PDF Canvas Preview - renders all pages using pdf.js onto canvas elements */
function PdfCanvasPreview({ dataUrl, darkMode }) {
  const containerRef = useRef(null);
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!dataUrl || !window.pdfjsLib) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    setPages([]);
    setError(null);

    (async () => {
      try {
        const base64 = dataUrl.split(",")[1];
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);

        const pdf = await window.pdfjsLib.getDocument({ data: bytes }).promise;
        const rendered = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          if (cancelled) return;
          const page = await pdf.getPage(i);
          const scale = 1.5;
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext("2d");
          await page.render({ canvasContext: ctx, viewport }).promise;
          rendered.push(canvas.toDataURL("image/png"));
        }
        if (!cancelled) { setPages(rendered); setLoading(false); }
      } catch (e) { if (!cancelled) { setError(e.message || "Render failed"); setLoading(false); } }
    })();

    return () => { cancelled = true; };
  }, [dataUrl]);

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%", overflowY: "auto", padding: "20px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
      {loading && (
        <div style={{ padding: 40, textAlign: "center", color: darkMode ? "#525960" : "#9e9888" }}>
          <div style={{ fontSize: 13, fontWeight: 500 }}>Rendering preview...</div>
        </div>
      )}
      {pages.map((src, i) => (
        <div key={i} style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.2)", borderRadius: 4, overflow: "hidden", maxWidth: "90%" }}>
          <img src={src} alt={`Page ${i + 1}`} style={{ display: "block", width: "100%", height: "auto" }} />
        </div>
      ))}
      {!loading && pages.length === 0 && (
        <div style={{ padding: 40, textAlign: "center", color: darkMode ? "#525960" : "#9e9888" }}>
          <div style={{ fontSize: 13, fontWeight: 500 }}>Could not render preview</div>
          {error && <div style={{ fontSize: 11, marginTop: 6, opacity: 0.7 }}>{error}</div>}
        </div>
      )}
    </div>
  );
}

function AppInner() {
  const [darkMode, setDarkMode] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [page, setPage] = useState("dashboard");
  const [adminSection, setAdminSection] = useState("users");
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
  const [stagedFiles, setStagedFiles] = useState([]);
  const [targetFolderId, setTargetFolderId] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [folderDetailDragOver, setFolderDetailDragOver] = useState(false);
  const [showFolderSelect, setShowFolderSelect] = useState(false);
  const [folderSelectSearch, setFolderSelectSearch] = useState("");
  const [folderSearch, setFolderSearch] = useState("");
  const [globalSearch, setGlobalSearch] = useState("");
  const [globalSearchFocused, setGlobalSearchFocused] = useState(false);
  const [movingFileId, setMovingFileId] = useState(null);
  const [moveTargetFolderId, setMoveTargetFolderId] = useState("");
  const [showMoveSelect, setShowMoveSelect] = useState(false);
  const [moveSelectSearch, setMoveSelectSearch] = useState("");
  const [stagedFolderAssignments, setStagedFolderAssignments] = useState({});
  const [stagedSuggestions, setStagedSuggestions] = useState({});
  const [openStagedDropdown, setOpenStagedDropdown] = useState(null);
  const [stagedDropdownSearch, setStagedDropdownSearch] = useState("");
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
  const [creatingSubfolder, setCreatingSubfolder] = useState(false);
  const [newSubfolderName, setNewSubfolderName] = useState("");
  const [creatingDeptFolder, setCreatingDeptFolder] = useState(false);
  const [newDeptFolderName, setNewDeptFolderName] = useState("");
  const [renamingFileId, setRenamingFileId] = useState(null);
  const [renamingFileName, setRenamingFileName] = useState("");
  const [viewingFileId, setViewingFileId] = useState(null);
  const [securityGroups, setSecurityGroups] = useState([]);
  const [adminUsers, setAdminUsers] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [addingGroup, setAddingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const PERMISSION_LABELS = {
    viewFiles: { label: "View Files", category: "Documents", desc: "Browse and preview uploaded documents" },
    uploadFiles: { label: "Upload Files", category: "Documents", desc: "Upload new PDF files to folders" },
    deleteFiles: { label: "Delete Files", category: "Documents", desc: "Remove uploaded files permanently" },
    renameFiles: { label: "Rename Files", category: "Documents", desc: "Rename uploaded file display names" },
    createFolders: { label: "Create Folders", category: "Folders", desc: "Create new folders and subfolders" },
    deleteFolders: { label: "Delete Folders", category: "Folders", desc: "Remove folders and their contents" },
    manageLocations: { label: "Manage Locations", category: "Administration", desc: "Add, edit, and remove dealer locations" },
    manageDepartments: { label: "Manage Departments", category: "Administration", desc: "Add, edit, and remove departments" },
    manageUsers: { label: "Manage Users", category: "Administration", desc: "Create, edit, and deactivate user accounts" },
    manageGroups: { label: "Manage Groups", category: "Administration", desc: "Edit security groups and permissions" },
    viewAuditLog: { label: "View Audit Log", category: "Audit", desc: "View system activity and change history" },
    exportAuditLog: { label: "Export Audit Log", category: "Audit", desc: "Download audit log data as CSV" },
    manageSettings: { label: "Manage Settings", category: "Administration", desc: "Modify application configuration" },
  };
  const PERMISSION_CATEGORIES = ["Documents", "Folders", "Administration", "Audit"];
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
  const newSubfolderRef = useRef(null);
  const newDeptFolderRef = useRef(null);
  const renameFileRef = useRef(null);

  const fileInputRef = useRef(null);
  const globalSearchRef = useRef(null);
  const moveSelectRef = useRef(null);
  const folderDetailInputRef = useRef(null);
  const folderSelectInputRef = useRef(null);
  const editLocRef = useRef(null);
  const addLocRef = useRef(null);
  const editDeptRef = useRef(null);
  const addDeptRef = useRef(null);

  useEffect(() => { loadPDFJS().then(() => setPdfjsLoaded(true)).catch(console.error); }, []);
  useEffect(() => { if (showFolderSelect && folderSelectInputRef.current) folderSelectInputRef.current.focus(); }, [showFolderSelect]);
  useEffect(() => { if (editingLocationId && editLocRef.current) editLocRef.current.focus(); }, [editingLocationId]);
  useEffect(() => { if (addingLocation && addLocRef.current) addLocRef.current.focus(); }, [addingLocation]);
  useEffect(() => { if (editingDeptId && editDeptRef.current) editDeptRef.current.focus(); }, [editingDeptId]);
  useEffect(() => { if (addingDept && addDeptRef.current) addDeptRef.current.focus(); }, [addingDept]);
  useEffect(() => { if (creatingSubfolder && newSubfolderRef.current) newSubfolderRef.current.focus(); }, [creatingSubfolder]);
  useEffect(() => { if (creatingDeptFolder && newDeptFolderRef.current) newDeptFolderRef.current.focus(); }, [creatingDeptFolder]);
  useEffect(() => { if (renamingFileId && renameFileRef.current) renameFileRef.current.focus(); }, [renamingFileId]);
  useEffect(() => { if (!showDeptDropdown) return; const h = () => setShowDeptDropdown(false); window.addEventListener("click", h); return () => window.removeEventListener("click", h); }, [showDeptDropdown]);
  useEffect(() => { if (!showProfileMenu) return; const h = () => setShowProfileMenu(false); window.addEventListener("click", h); return () => window.removeEventListener("click", h); }, [showProfileMenu]);

  // ── Session restore on mount ──────────────────────────────
  useEffect(() => {
    if (api.isAuthenticated()) {
      api.getMe().then(user => {
        setLoggedInUser({ name: user.displayName, groups: user.groups, permissions: user.permissions });
        setIsLoggedIn(true);
      }).catch(() => { api.logout(); });
    }
  }, []);

  // ── Load data from API when logged in ─────────────────────
  const loadCoreData = useCallback(async () => {
    try {
      const [locs, depts, unsorted] = await Promise.all([api.getLocations(), api.getDepartments(), api.getUnsortedFiles()]);
      // Normalize field names from DB (snake_case) to React (camelCase)
      const normLocs = locs.map(l => ({ id: l.id, name: l.name }));
      const normDepts = depts.map(d => ({ id: d.id, name: d.name, locationId: d.location_id || d.locationId }));
      setLocations(normLocs);
      setDepartments(normDepts);
      setUnsortedFiles(unsorted.map(f => ({
        id: f.id, name: f.name, size: Number(f.file_size_bytes || 0), type: f.mime_type || "application/pdf",
        pages: Number(f.page_count || 0), status: f.status, text: f.extracted_text,
        folderId: null, fileStoragePath: f.file_storage_path,
        error: f.error_message, progress: f.status === "done" ? 100 : 0,
      })));
      if (normLocs.length > 0 && !activeLocation) {
        setActiveLocation(normLocs[0].id);
        setExpandedLocations({ [normLocs[0].id]: true });
        const firstDept = normDepts.find(d => d.locationId === normLocs[0].id);
        if (firstDept) setActiveDepartment(firstDept.id);
      }
    } catch (err) { console.error("Failed to load core data:", err); }
  }, [activeLocation]);

  useEffect(() => { if (isLoggedIn) loadCoreData(); }, [isLoggedIn]);

  // ── Load folders when department changes ───────────────────
  useEffect(() => {
    if (!isLoggedIn || !activeDepartment) return;
    api.getFolders({ departmentId: activeDepartment }).then(rows => {
      const norm = rows.map(f => ({ id: f.id, name: f.name, locationId: f.location_id || f.locationId, departmentId: f.department_id || f.departmentId, parentId: f.parent_id || f.parentId || null, createdAt: f.created_at, fileCount: Number(f.fileCount || 0), subfolderCount: Number(f.subfolderCount || 0) }));
      setFolders(prev => {
        // Merge: keep folders from other departments, replace this department's
        const otherDept = prev.filter(f => f.departmentId !== activeDepartment);
        return [...otherDept, ...norm];
      });
    }).catch(console.error);
  }, [isLoggedIn, activeDepartment]);

  // ── Load files when active folder changes ──────────────────
  useEffect(() => {
    if (!isLoggedIn || !activeFolderId) return;
    api.getFiles(activeFolderId).then(rows => {
      const norm = rows.map(f => ({
        id: f.id, name: f.name, size: Number(f.file_size_bytes || 0), type: f.mime_type || "application/pdf",
        pages: Number(f.page_count || 0), status: f.status, text: f.extracted_text,
        folderId: f.folder_id, fileStoragePath: f.file_storage_path,
        uploadedAt: f.uploaded_at || null, uploadedBy: f.uploaded_by_name || f.uploaded_by || null,
        error: f.error_message, progress: f.status === "done" ? 100 : 0,
      }));
      setFiles(prev => {
        const otherFolder = prev.filter(f => f.folderId !== activeFolderId);
        return [...otherFolder, ...norm];
      });
    }).catch(console.error);
  }, [isLoggedIn, activeFolderId]);

  // ── Load unsorted files when Unsorted page opens ──────────
  useEffect(() => {
    if (!isLoggedIn || page !== "unsorted") return;
    api.getUnsortedFiles().then(rows => {
      setUnsortedFiles(rows.map(f => ({
        id: f.id, name: f.name, size: Number(f.file_size_bytes || 0), type: f.mime_type || "application/pdf",
        pages: Number(f.page_count || 0), status: f.status, text: f.extracted_text,
        folderId: null, fileStoragePath: f.file_storage_path,
        error: f.error_message, progress: f.status === "done" ? 100 : 0,
      })));
    }).catch(console.error);
  }, [isLoggedIn, page]);

  // ── Load security groups when admin section opens ──────────
  useEffect(() => {
    if (!isLoggedIn || page !== "admin" || adminSection !== "groups") return;
    api.getGroups().then(groups => {
      const norm = groups.map(g => ({ id: g.id, name: g.name, desc: g.description, permissions: g.permissions, memberCount: g.memberCount }));
      setSecurityGroups(norm);
    }).catch(console.error);
  }, [isLoggedIn, page, adminSection]);

  // ── Load users when admin users section opens ──────────────
  useEffect(() => {
    if (!isLoggedIn || page !== "admin" || adminSection !== "users") return;
    api.getUsers().then(users => {
      setAdminUsers(users.map(u => ({ name: u.display_name, email: u.email, groups: u.groups || [], status: u.status === "active" ? "Active" : "Inactive", id: u.id })));
    }).catch(console.error);
  }, [isLoggedIn, page, adminSection]);

  // ── Load audit log when admin audit section opens ──────────
  useEffect(() => {
    if (!isLoggedIn || page !== "admin" || adminSection !== "audit") return;
    api.getAuditLog({ action: auditFilterAction || undefined, user: auditFilterUser || undefined, date: auditFilterDate || undefined })
      .then(data => {
        setAuditLog((data.entries || []).map(e => ({
          id: e.id, action: e.action, detail: e.detail,
          user: e.user_name, timestamp: new Date(e.timestamp).getTime(),
        })));
      }).catch(console.error);
  }, [isLoggedIn, page, adminSection, auditFilterAction, auditFilterUser, auditFilterDate]);

  // ── Load dashboard data from API ───────────────────────────
  useEffect(() => {
    if (!isLoggedIn || page !== "dashboard") return;
    api.getDashboard().then(setDashboardData).catch(console.error);
  }, [isLoggedIn, page]);

  // ── Auto-suggest folders for staged files based on RO numbers ──
  useEffect(() => {
    const newSuggestions = {};
    const newAssignments = {};
    for (const sf of stagedFiles) {
      if (sf.status === "done" && !stagedSuggestions[sf.id]) {
        const suggestion = suggestFolderForFile(sf);
        if (suggestion) {
          newSuggestions[sf.id] = suggestion;
          if (suggestion.folder && suggestion.confidence === "exact") {
            newAssignments[sf.id] = suggestion.folder.id;
          }
        }
      }
    }
    if (Object.keys(newSuggestions).length > 0) {
      setStagedSuggestions(p => ({ ...p, ...newSuggestions }));
      setStagedFolderAssignments(p => ({ ...p, ...newAssignments }));
    }
  }, [stagedFiles.map(f => f.status).join(",")]);

  const handleLogin = async () => {
    setLoginError("");
    if (!loginForm.username.trim() || !loginForm.password.trim()) { setLoginError("Please enter both fields."); return; }
    setLoginLoading(true);
    try {
      const user = await api.login(loginForm.username.trim(), loginForm.password.trim());
      setLoggedInUser({ name: user.displayName, groups: user.groups, permissions: user.permissions });
      setIsLoggedIn(true);
      setLoginForm({ username: "", password: "" });
    } catch (err) {
      setLoginError(err.message || "Login failed");
    } finally {
      setLoginLoading(false);
    }
  };
  const handleLogout = () => { api.logout(); setIsLoggedIn(false); setLoggedInUser(null); setPage("dashboard"); setSelectedFile(null); setLocations([]); setDepartments([]); setFolders([]); setFiles([]); setActiveLocation(null); setActiveDepartment(null); };

  const validateFile = file => { if (file.type !== ACCEPTED_TYPE && !file.name.toLowerCase().endsWith(".pdf")) return { valid: false, error: "Only PDFs" }; if (file.size > MAX_FILE_SIZE) return { valid: false, error: "Too large" }; return { valid: true }; };
  const processFile = useCallback(async (rawFile, folderId) => {
    const id = uid(), v = validateFile(rawFile);
    let fileDataUrl = null;
    try { fileDataUrl = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(rawFile); }); } catch {}
    const entry = { id, name: rawFile.name, size: rawFile.size, type: rawFile.type || "", fileDataUrl, status: v.valid ? "processing" : "error", progress: 0, error: v.error || null, text: null, pages: 0, folderId: folderId || null, _rawFile: rawFile };
    if (folderId) setFiles(p => [...p, entry]); else setStagedFiles(p => [...p, entry]);
    if (!v.valid) return;
    try {
      // Extract text client-side
      const r = await extractTextFromPDF(rawFile, prog => { const up = p => p.map(f => f.id === id ? { ...f, progress: prog } : f); if (folderId) setFiles(up); else setStagedFiles(up); });
      if (folderId) {
        // Upload directly to server
        try {
          const uploaded = await api.uploadFile(rawFile, folderId, r.text, r.pages);
          const norm = { id: uploaded.id, name: uploaded.name, size: Number(uploaded.file_size_bytes || 0), type: uploaded.mime_type || "application/pdf", pages: Number(uploaded.page_count || 0), status: "done", text: uploaded.extracted_text, folderId: uploaded.folder_id, fileStoragePath: uploaded.file_storage_path, uploadedAt: uploaded.uploaded_at || new Date().toISOString(), uploadedBy: uploaded.uploaded_by_name || loggedInUser?.name || null, progress: 100 };
          setFiles(p => p.map(f => f.id === id ? norm : f));
        } catch (err) {
          setFiles(p => p.map(f => f.id === id ? { ...f, status: "error", error: err.message } : f));
        }
      } else {
        // Staged: just mark as done locally, will upload on folder assignment
        const up = p => p.map(f => f.id === id ? { ...f, status: "done", text: r.text, pages: r.pages, progress: 100 } : f);
        setStagedFiles(up);
      }
    } catch { const up = p => p.map(f => f.id === id ? { ...f, status: "error", error: "Failed" } : f); if (folderId) setFiles(up); else setStagedFiles(up); }
  }, []);
  const handleUploadFiles = useCallback(fl => { if (!pdfjsLoaded) return; Array.from(fl).forEach(f => processFile(f, null)); }, [processFile, pdfjsLoaded]);
  const handleDrop = useCallback(e => { e.preventDefault(); setDragOver(false); handleUploadFiles(e.dataTransfer.files); }, [handleUploadFiles]);
  const handleFolderDetailDrop = useCallback(e => {
    e.preventDefault(); setFolderDetailDragOver(false);
    if (!pdfjsLoaded || !activeFolderId) return;
    Array.from(e.dataTransfer.files).forEach(f => processFile(f, activeFolderId));
  }, [processFile, pdfjsLoaded, activeFolderId]);
  const handleFolderDetailFiles = useCallback(fl => {
    if (!pdfjsLoaded || !activeFolderId) return;
    Array.from(fl).forEach(f => processFile(f, activeFolderId));
  }, [processFile, pdfjsLoaded, activeFolderId]);
  const assignStagedToFolder = async () => {
    if (!targetFolderId) return;
    const ready = stagedFiles.filter(f => f.status !== "processing" && f.status !== "error");
    for (const sf of ready) {
      try {
        await api.uploadFile(sf._rawFile || new Blob(), targetFolderId, sf.text, sf.pages);
      } catch (err) { console.error("Upload failed:", sf.name, err); }
    }
    setStagedFiles(p => p.filter(f => f.status === "processing"));
    const tf = folders.find(f => f.id === targetFolderId);
    if (tf) { setActiveLocation(tf.locationId); setActiveDepartment(tf.departmentId); setActiveFolderId(targetFolderId); setPage("folder-detail"); }
    setTargetFolderId("");
    // Reload files for the target folder
    api.getFiles(targetFolderId).then(rows => {
      const norm = rows.map(f => ({ id: f.id, name: f.name, size: Number(f.file_size_bytes || 0), type: f.mime_type || "application/pdf", pages: Number(f.page_count || 0), status: f.status, text: f.extracted_text, folderId: f.folder_id, fileStoragePath: f.file_storage_path, uploadedAt: f.uploaded_at || null, uploadedBy: f.uploaded_by_name || f.uploaded_by || null, progress: 100 }));
      setFiles(prev => [...prev.filter(f => f.folderId !== targetFolderId), ...norm]);
    }).catch(console.error);
  };
  const removeFile = async (id) => {
    try { await api.deleteFile(id); } catch (err) { console.error(err); }
    setFiles(p => p.filter(f => f.id !== id));
    if (selectedFile?.id === id) setSelectedFile(null);
    if (viewingFileId === id) { setViewingFileId(null); setPage("folder-detail"); }
  };
  const renameFile = async (id, newName) => {
    const n = newName.trim();
    if (n) {
      try {
        await api.renameFile(id, n);
        setFiles(p => p.map(f => f.id === id ? { ...f, name: n } : f));
      } catch (err) { console.error(err); }
    }
    setRenamingFileId(null);
  };
  const createFolder = () => {};

  const filesInFolder = id => files.filter(f => f.folderId === id);
  const subfoldersOf = parentId => folders.filter(f => f.parentId === parentId);
  const allFilesInFolderRecursive = id => {
    let count = filesInFolder(id).length;
    subfoldersOf(id).forEach(sf => { count += allFilesInFolderRecursive(sf.id); });
    return count;
  };
  const foldersInDepartment = deptId => folders.filter(f => f.departmentId === deptId && !f.parentId);
  const foldersInLocation = locId => folders.filter(f => f.locationId === locId);
  const deptsInLocation = locId => departments.filter(d => d.locationId === locId);
  const currentDeptFolders = foldersInDepartment(activeDepartment);
  const currentDept = departments.find(d => d.id === activeDepartment);
  const currentLocation = locations.find(l => l.id === activeLocation);
  const activeFolder = folders.find(f => f.id === activeFolderId);
  const copyText = txt => navigator.clipboard.writeText(txt);
  const addAudit = () => {}; // Server handles audit logging now

  const createSubfolder = async () => {
    const name = newSubfolderName.trim();
    if (!name || !activeFolderId) { setCreatingSubfolder(false); return; }
    const parent = folders.find(f => f.id === activeFolderId);
    if (!parent) return;
    try {
      const created = await api.createFolder(name, parent.locationId, parent.departmentId, activeFolderId);
      const norm = { id: created.id, name: created.name, locationId: created.location_id || created.locationId, departmentId: created.department_id || created.departmentId, parentId: created.parent_id || created.parentId || null, createdAt: created.created_at };
      setFolders(p => [...p, norm]);
    } catch (err) { console.error(err); }
    setNewSubfolderName(""); setCreatingSubfolder(false);
  };

  const createDeptFolder = async () => {
    const name = newDeptFolderName.trim();
    if (!name) { setCreatingDeptFolder(false); return; }
    try {
      const created = await api.createFolder(name, activeLocation, activeDepartment, null);
      const norm = { id: created.id, name: created.name, locationId: created.location_id || created.locationId, departmentId: created.department_id || created.departmentId, parentId: null, createdAt: created.created_at };
      setFolders(p => [...p, norm]);
    } catch (err) { console.error(err); }
    setNewDeptFolderName(""); setCreatingDeptFolder(false);
  };

  const getBreadcrumb = (folderId) => {
    const trail = [];
    let current = folders.find(f => f.id === folderId);
    while (current) {
      trail.unshift(current);
      current = current.parentId ? folders.find(f => f.id === current.parentId) : null;
    }
    return trail;
  };

  const handleDeleteFolder = (folder) => {
    const childFolders = subfoldersOf(folder.id);
    const fileCount = allFilesInFolderRecursive(folder.id);
    const hasChildren = childFolders.length > 0 || fileCount > 0;
    const message = hasChildren
      ? `Delete "${folder.name}" and everything inside it? This includes ${childFolders.length} subfolder${childFolders.length !== 1 ? "s" : ""} and ${fileCount} file${fileCount !== 1 ? "s" : ""}. This cannot be undone.`
      : `Delete the folder "${folder.name}"? This cannot be undone.`;

    const doDelete = async () => {
      try {
        // Delete child folders first (deepest first), then the parent
        const getAllDescendants = (parentId) => {
          const children = subfoldersOf(parentId);
          let all = [];
          for (const child of children) {
            all = [...all, ...getAllDescendants(child.id), child];
          }
          return all;
        };
        const descendants = getAllDescendants(folder.id);

        // Delete all descendant files from state
        const allFolderIds = new Set([folder.id, ...descendants.map(d => d.id)]);
        setFiles(p => p.filter(f => !allFolderIds.has(f.folderId)));

        // Delete descendants (deepest first), then the folder itself
        for (const desc of descendants) {
          await api.deleteFolder(desc.id).catch(console.error);
        }
        await api.deleteFolder(folder.id);

        // Remove all deleted folders from state
        setFolders(p => p.filter(f => !allFolderIds.has(f.id)));

        // If we were viewing this folder, go back
        if (activeFolderId === folder.id || allFolderIds.has(activeFolderId)) {
          if (folder.parentId) {
            setActiveFolderId(folder.parentId);
          } else {
            setActiveFolderId(null);
            setPage("folders");
          }
        }
      } catch (err) { console.error("Delete folder failed:", err); }
      setWarningModal(null);
    };

    setWarningModal({ title: "Delete Folder", message, onConfirm: doDelete });
  };

  const handleDeleteLocation = loc => {
    const lf = foldersInLocation(loc.id), lFiles = lf.reduce((s, f) => s + filesInFolder(f.id).length, 0);
    const doDelete = async () => {
      try {
        await api.deleteLocation(loc.id);
        setFiles(p => p.filter(f => !new Set(lf.map(ff => ff.id)).has(f.folderId)));
        setFolders(p => p.filter(f => f.locationId !== loc.id));
        setDepartments(p => p.filter(d => d.locationId !== loc.id));
        setLocations(p => p.filter(l => l.id !== loc.id));
        if (activeLocation === loc.id) { const rem = locations.filter(l => l.id !== loc.id); if (rem.length) setActiveLocation(rem[0].id); }
      } catch (err) { console.error(err); }
    };
    if (lf.length > 0 || lFiles > 0) setWarningModal({ title: `Remove "${loc.name}"?`, message: `This location has ${lf.length} folder(s) and ${lFiles} file(s). Are you sure you want to unlink these files? This action cannot be undone.`, onConfirm: doDelete });
    else doDelete();
  };
  const handleDeleteDept = (dept, locName) => {
    const df = foldersInDepartment(dept.id), dFiles = df.reduce((s, f) => s + filesInFolder(f.id).length, 0);
    const doDelete = async () => {
      try {
        await api.deleteDepartment(dept.id);
        setFiles(p => p.filter(f => !new Set(df.map(ff => ff.id)).has(f.folderId)));
        setFolders(p => p.filter(f => f.departmentId !== dept.id));
        setDepartments(p => p.filter(d => d.id !== dept.id));
        if (activeDepartment === dept.id) { const rem = deptsInLocation(dept.locationId).filter(d => d.id !== dept.id); if (rem.length) setActiveDepartment(rem[0].id); }
      } catch (err) { console.error(err); }
    };
    if (df.length > 0 || dFiles > 0) setWarningModal({ title: `Remove "${dept.name}" from ${locName}?`, message: `This department has ${df.length} folder(s) and ${dFiles} file(s). Are you sure you want to unlink these files? This action cannot be undone.`, onConfirm: doDelete });
    else doDelete();
  };

  const t = darkMode ? { bg: "#0f1114", pageBg: "#131619", surface: "#1a1d22", border: "#2a2e35", text: "#e1e4e8", textMuted: "#8b929a", textDim: "#525960", accent: "#58a6ff", accentDark: "#388bfd", accentSoft: "rgba(88,166,255,0.08)", accentGlow: "rgba(88,166,255,0.14)", success: "#3fb950", successSoft: "rgba(63,185,80,0.1)", error: "#f85149", errorSoft: "rgba(248,81,73,0.1)", dropzone: "rgba(88,166,255,0.03)", dropzoneActive: "rgba(88,166,255,0.08)", progressBg: "#21262d", scrollThumb: "#30363d", cardShadow: "0 1px 4px rgba(0,0,0,0.2),0 4px 12px rgba(0,0,0,0.15)", navActive: "rgba(88,166,255,0.1)", warn: "#d29922", warnSoft: "rgba(210,153,34,0.12)" } : { bg: "#f0ede8", pageBg: "#f6f4f0", surface: "#ffffff", border: "#ddd8ce", text: "#18160f", textMuted: "#6e685e", textDim: "#9e9888", accent: "#4f46e5", accentDark: "#4338ca", accentSoft: "rgba(79,70,229,0.07)", accentGlow: "rgba(79,70,229,0.12)", success: "#059669", successSoft: "rgba(5,150,105,0.07)", error: "#e11d48", errorSoft: "rgba(225,29,72,0.07)", dropzone: "rgba(79,70,229,0.02)", dropzoneActive: "rgba(79,70,229,0.07)", progressBg: "#e6e2da", scrollThumb: "#ccc7bd", cardShadow: "0 2px 12px rgba(0,0,0,0.06)", navActive: "rgba(79,70,229,0.12)", warn: "#b45309", warnSoft: "rgba(180,83,9,0.08)" };

  const Btn = ({ children, onClick, primary, style: s = {} }) => <button onClick={onClick} style={{ background: primary ? (darkMode ? `linear-gradient(135deg,${t.accent},${t.accentDark})` : t.accent) : t.surface, color: primary ? "#fff" : t.text, border: primary ? "none" : `1px solid ${t.border}`, borderRadius: 8, padding: "8px 16px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6, ...s }}>{children}</button>;
  const SmallBtn = ({ children, onClick, title }) => <button onClick={onClick} title={title} className="icon-btn" style={{ background: "transparent", border: "none", borderRadius: 6, padding: 5, cursor: "pointer", color: t.textDim, display: "flex", alignItems: "center" }}>{children}</button>;
  const FileCard = ({ file, idx, staged }) => <div onClick={() => !staged && file.status === "done" && (() => { setViewingFileId(file.id); setPage("file-detail"); })()} className="file-card" style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 10, padding: "12px 14px", cursor: !staged && file.status === "done" ? "pointer" : "default", transition: "all 0.2s", animation: `fadeIn 0.3s ease ${idx * 0.04}s both`, position: "relative", overflow: "hidden" }}>{file.status === "processing" && <div style={{ position: "absolute", left: 0, bottom: 0, height: 2, width: "100%", background: t.progressBg }}><div style={{ height: "100%", width: `${file.progress}%`, background: `linear-gradient(90deg,${t.accent},${t.accentDark})`, transition: "width 0.3s" }} /></div>}<div style={{ display: "flex", alignItems: "center", gap: 10 }}><div style={{ width: 36, height: 36, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: file.status === "error" ? t.errorSoft : file.status === "done" ? t.successSoft : t.accentSoft, color: file.status === "error" ? t.error : file.status === "done" ? t.success : t.accent }}>{file.status === "done" ? <CheckIcon /> : <FileDocIcon size={18} />}</div><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 12.5, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{file.name}</div><div style={{ fontSize: 10.5, color: t.textMuted, marginTop: 1, display: "flex", gap: 6, flexWrap: "wrap" }}><span>{fmtSize(file.size)}</span>{file.pages > 0 && <span>· {file.pages} pg</span>}{file.status === "processing" && <span style={{ color: t.accent }}>Extracting {file.progress}%</span>}{file.status === "error" && <span style={{ color: t.error }}>{file.error}</span>}{file.status === "done" && <span style={{ color: t.success }}>Ready</span>}</div></div><div style={{ display: "flex", gap: 2 }}>{!staged && file.status === "done" && <SmallBtn title="Rename" onClick={e => { e.stopPropagation(); setRenamingFileId(file.id); setRenamingFileName(file.name); }}><EditIcon /></SmallBtn>}{!staged && file.status === "done" && <SmallBtn title="Copy text" onClick={e => { e.stopPropagation(); copyText(file.text); }}><CopyIcon /></SmallBtn>}<SmallBtn title="Remove" onClick={e => { e.stopPropagation(); staged ? removeStagedFile(file.id) : removeFile(file.id); }}><TrashIcon /></SmallBtn></div></div></div>;

  const warnModalEl = warningModal && (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }} onClick={() => setWarningModal(null)} />
      <div style={{ position: "relative", width: "100%", maxWidth: 420, background: t.surface, border: `1px solid ${t.border}`, borderRadius: 14, padding: "28px 24px", boxShadow: "0 20px 50px rgba(0,0,0,0.3)", animation: "modalIn 0.2s ease" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 20 }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, flexShrink: 0, background: t.warnSoft, color: t.warn, display: "flex", alignItems: "center", justifyContent: "center" }}><AlertTriangleIcon size={22} /></div>
          <div><div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6, color: t.text }}>{warningModal.title}</div><div style={{ fontSize: 13, color: t.textMuted, lineHeight: 1.5 }}>{warningModal.message}</div></div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button onClick={() => setWarningModal(null)} style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", color: t.text, fontFamily: "inherit" }}>Cancel</button>
          <button onClick={() => { warningModal.onConfirm(); setWarningModal(null); }} style={{ background: t.error, border: "none", borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", color: "#fff", fontFamily: "inherit" }}>Yes, Unlink Files</button>
        </div>
      </div>
    </div>
  );

  const renameModalEl = renamingFileId && (
    <div style={{ position: "fixed", inset: 0, zIndex: 250, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }} onClick={() => setRenamingFileId(null)} />
      <div style={{ position: "relative", width: "100%", maxWidth: 400, background: t.surface, border: `1px solid ${t.border}`, borderRadius: 14, padding: "24px 22px", boxShadow: "0 20px 50px rgba(0,0,0,0.3)", animation: "modalIn 0.2s ease" }}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Rename File</div>
        <input
          ref={renameFileRef}
          value={renamingFileName}
          onChange={e => setRenamingFileName(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") renameFile(renamingFileId, renamingFileName); if (e.key === "Escape") setRenamingFileId(null); }}
          style={{ width: "100%", padding: "10px 14px", fontSize: 14, fontFamily: "inherit", background: darkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)", border: `1px solid ${t.accent}`, borderRadius: 8, color: t.text, outline: "none", boxSizing: "border-box", boxShadow: `0 0 0 3px ${t.accentSoft}` }}
        />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
          <button onClick={() => setRenamingFileId(null)} style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", color: t.text, fontFamily: "inherit" }}>Cancel</button>
          <Btn primary onClick={() => renameFile(renamingFileId, renamingFileName)} style={{ padding: "8px 16px", fontSize: 13 }}>Save</Btn>
        </div>
      </div>
    </div>
  );

  /* Change Password handler (self-service) */
  const handleChangePassword = async () => {
    setChangePasswordError(""); setChangePasswordSuccess("");
    if (!changePasswordForm.current || !changePasswordForm.new || !changePasswordForm.confirm) {
      setChangePasswordError("All fields are required."); return;
    }
    if (changePasswordForm.new.length < 6) {
      setChangePasswordError("New password must be at least 6 characters."); return;
    }
    if (changePasswordForm.new !== changePasswordForm.confirm) {
      setChangePasswordError("New passwords do not match."); return;
    }
    setChangePasswordLoading(true);
    try {
      await api.changePassword(changePasswordForm.current, changePasswordForm.new);
      setChangePasswordSuccess("Password changed successfully.");
      setChangePasswordForm({ current: "", new: "", confirm: "" });
      setTimeout(() => { setShowChangePassword(false); setChangePasswordSuccess(""); }, 1500);
    } catch (err) {
      setChangePasswordError(err.message || "Failed to change password.");
    } finally {
      setChangePasswordLoading(false);
    }
  };

  /* Admin Set Password handler */
  const handleAdminSetPassword = async () => {
    setAdminSetPasswordError(""); setAdminSetPasswordSuccess("");
    if (!adminSetPasswordForm.new || !adminSetPasswordForm.confirm) {
      setAdminSetPasswordError("All fields are required."); return;
    }
    if (adminSetPasswordForm.new.length < 6) {
      setAdminSetPasswordError("Password must be at least 6 characters."); return;
    }
    if (adminSetPasswordForm.new !== adminSetPasswordForm.confirm) {
      setAdminSetPasswordError("Passwords do not match."); return;
    }
    setAdminSetPasswordLoading(true);
    try {
      const result = await api.adminSetPassword(adminSetPasswordUserId, adminSetPasswordForm.new);
      setAdminSetPasswordSuccess(result.message || "Password set successfully.");
      setAdminSetPasswordForm({ new: "", confirm: "" });
      setTimeout(() => { setAdminSetPasswordUserId(null); setAdminSetPasswordSuccess(""); }, 1500);
    } catch (err) {
      setAdminSetPasswordError(err.message || "Failed to set password.");
    } finally {
      setAdminSetPasswordLoading(false);
    }
  };

  /* Change Password Modal (self-service from profile menu) */
  const changePasswordModalEl = showChangePassword && (
    <div style={{ position: "fixed", inset: 0, zIndex: 260, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }} onClick={() => { setShowChangePassword(false); setChangePasswordError(""); setChangePasswordSuccess(""); setChangePasswordForm({ current: "", new: "", confirm: "" }); }} />
      <div style={{ position: "relative", width: "100%", maxWidth: 420, background: t.surface, border: `1px solid ${t.border}`, borderRadius: 14, padding: "28px 24px", boxShadow: "0 20px 50px rgba(0,0,0,0.3)", animation: "modalIn 0.2s ease" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: t.accentSoft, color: t.accent, display: "flex", alignItems: "center", justifyContent: "center" }}><ShieldIcon size={18} /></div>
          <div><div style={{ fontSize: 17, fontWeight: 700 }}>Change Password</div><div style={{ fontSize: 12, color: t.textMuted }}>Enter your current password and choose a new one</div></div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
          <div><label style={{ fontSize: 11, fontWeight: 600, color: t.textMuted, display: "block", marginBottom: 4 }}>Current Password</label><input type="password" value={changePasswordForm.current} onChange={e => { setChangePasswordForm(p => ({ ...p, current: e.target.value })); setChangePasswordError(""); }} onKeyDown={e => e.key === "Enter" && handleChangePassword()} placeholder="Enter current password" style={{ width: "100%", padding: "10px 14px", fontSize: 13.5, fontFamily: "inherit", background: darkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)", border: `1px solid ${t.border}`, borderRadius: 8, color: t.text, outline: "none", boxSizing: "border-box" }} /></div>
          <div><label style={{ fontSize: 11, fontWeight: 600, color: t.textMuted, display: "block", marginBottom: 4 }}>New Password</label><input type="password" value={changePasswordForm.new} onChange={e => { setChangePasswordForm(p => ({ ...p, new: e.target.value })); setChangePasswordError(""); }} onKeyDown={e => e.key === "Enter" && handleChangePassword()} placeholder="At least 6 characters" style={{ width: "100%", padding: "10px 14px", fontSize: 13.5, fontFamily: "inherit", background: darkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)", border: `1px solid ${t.border}`, borderRadius: 8, color: t.text, outline: "none", boxSizing: "border-box" }} /></div>
          <div><label style={{ fontSize: 11, fontWeight: 600, color: t.textMuted, display: "block", marginBottom: 4 }}>Confirm New Password</label><input type="password" value={changePasswordForm.confirm} onChange={e => { setChangePasswordForm(p => ({ ...p, confirm: e.target.value })); setChangePasswordError(""); }} onKeyDown={e => e.key === "Enter" && handleChangePassword()} placeholder="Re-enter new password" style={{ width: "100%", padding: "10px 14px", fontSize: 13.5, fontFamily: "inherit", background: darkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)", border: `1px solid ${t.border}`, borderRadius: 8, color: t.text, outline: "none", boxSizing: "border-box" }} /></div>
        </div>
        {changePasswordError && <div style={{ padding: "8px 12px", borderRadius: 7, marginBottom: 12, background: t.errorSoft, color: t.error, fontSize: 12.5, fontWeight: 500 }}>{changePasswordError}</div>}
        {changePasswordSuccess && <div style={{ padding: "8px 12px", borderRadius: 7, marginBottom: 12, background: t.successSoft, color: t.success, fontSize: 12.5, fontWeight: 500 }}>{changePasswordSuccess}</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button onClick={() => { setShowChangePassword(false); setChangePasswordError(""); setChangePasswordSuccess(""); setChangePasswordForm({ current: "", new: "", confirm: "" }); }} style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", color: t.text, fontFamily: "inherit" }}>Cancel</button>
          <Btn primary onClick={handleChangePassword} style={{ padding: "8px 18px", fontSize: 13, opacity: changePasswordLoading ? 0.6 : 1 }}>{changePasswordLoading ? "Saving..." : "Change Password"}</Btn>
        </div>
      </div>
    </div>
  );

  /* Admin Set Password Modal */
  const adminSetPasswordModalEl = adminSetPasswordUserId && (
    <div style={{ position: "fixed", inset: 0, zIndex: 260, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }} onClick={() => { setAdminSetPasswordUserId(null); setAdminSetPasswordError(""); setAdminSetPasswordSuccess(""); setAdminSetPasswordForm({ new: "", confirm: "" }); }} />
      <div style={{ position: "relative", width: "100%", maxWidth: 420, background: t.surface, border: `1px solid ${t.border}`, borderRadius: 14, padding: "28px 24px", boxShadow: "0 20px 50px rgba(0,0,0,0.3)", animation: "modalIn 0.2s ease" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: darkMode ? "rgba(210,153,34,0.12)" : "rgba(180,83,9,0.08)", color: t.warn, display: "flex", alignItems: "center", justifyContent: "center" }}><ShieldIcon size={18} /></div>
          <div><div style={{ fontSize: 17, fontWeight: 700 }}>Set Password</div><div style={{ fontSize: 12, color: t.textMuted }}>Set a new password for {(adminUsers.find(u => u.id === adminSetPasswordUserId))?.name || "this user"}</div></div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
          <div><label style={{ fontSize: 11, fontWeight: 600, color: t.textMuted, display: "block", marginBottom: 4 }}>New Password</label><input type="password" value={adminSetPasswordForm.new} onChange={e => { setAdminSetPasswordForm(p => ({ ...p, new: e.target.value })); setAdminSetPasswordError(""); }} onKeyDown={e => e.key === "Enter" && handleAdminSetPassword()} autoFocus placeholder="At least 6 characters" style={{ width: "100%", padding: "10px 14px", fontSize: 13.5, fontFamily: "inherit", background: darkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)", border: `1px solid ${t.border}`, borderRadius: 8, color: t.text, outline: "none", boxSizing: "border-box" }} /></div>
          <div><label style={{ fontSize: 11, fontWeight: 600, color: t.textMuted, display: "block", marginBottom: 4 }}>Confirm Password</label><input type="password" value={adminSetPasswordForm.confirm} onChange={e => { setAdminSetPasswordForm(p => ({ ...p, confirm: e.target.value })); setAdminSetPasswordError(""); }} onKeyDown={e => e.key === "Enter" && handleAdminSetPassword()} placeholder="Re-enter password" style={{ width: "100%", padding: "10px 14px", fontSize: 13.5, fontFamily: "inherit", background: darkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)", border: `1px solid ${t.border}`, borderRadius: 8, color: t.text, outline: "none", boxSizing: "border-box" }} /></div>
        </div>
        {adminSetPasswordError && <div style={{ padding: "8px 12px", borderRadius: 7, marginBottom: 12, background: t.errorSoft, color: t.error, fontSize: 12.5, fontWeight: 500 }}>{adminSetPasswordError}</div>}
        {adminSetPasswordSuccess && <div style={{ padding: "8px 12px", borderRadius: 7, marginBottom: 12, background: t.successSoft, color: t.success, fontSize: 12.5, fontWeight: 500 }}>{adminSetPasswordSuccess}</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button onClick={() => { setAdminSetPasswordUserId(null); setAdminSetPasswordError(""); setAdminSetPasswordSuccess(""); setAdminSetPasswordForm({ new: "", confirm: "" }); }} style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", color: t.text, fontFamily: "inherit" }}>Cancel</button>
          <Btn primary onClick={handleAdminSetPassword} style={{ padding: "8px 18px", fontSize: 13, opacity: adminSetPasswordLoading ? 0.6 : 1 }}>{adminSetPasswordLoading ? "Saving..." : "Set Password"}</Btn>
        </div>
      </div>
    </div>
  );

  const fileDetailPage = (() => {
    const vf = files.find(f => f.id === viewingFileId);
    if (!vf) return null;
    const folder = folders.find(f => f.id === vf.folderId);
    const loc = folder ? locations.find(l => l.id === folder.locationId) : null;
    const dept = folder ? departments.find(d => d.id === folder.departmentId) : null;
    const breadcrumb = folder ? getBreadcrumb(folder.id) : [];
    const isPdf = vf.type === "application/pdf" || vf.name.toLowerCase().endsWith(".pdf");
    const isImage = vf.type?.startsWith("image/");

    return (
      <div style={{ display: "flex", flex: 1, minHeight: "calc(100vh - 55px)", animation: "fadeIn 0.3s ease" }}>
        <div style={{ width: 400, minWidth: 400, borderRight: `1px solid ${t.border}`, background: darkMode ? "rgba(15,17,20,0.5)" : "rgba(246,244,240,0.6)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "20px 20px 0", flexShrink: 0 }}>
            <button onClick={() => { setViewingFileId(null); if (folder) { setActiveFolderId(folder.id); setPage("folder-detail"); } else setPage("folders"); }} style={{ background: "transparent", border: "none", cursor: "pointer", color: t.accent, fontSize: 12.5, fontWeight: 500, display: "flex", alignItems: "center", gap: 6, padding: 0, fontFamily: "inherit", marginBottom: 16 }}>
              <ArrowLeftIcon /> Back to {folder?.name || "Folder"}
            </button>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: t.successSoft, color: t.success, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <FileDocIcon size={22} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 2px", wordBreak: "break-word", lineHeight: 1.3 }}>{vf.name}</h2>
                <button onClick={() => { setRenamingFileId(vf.id); setRenamingFileName(vf.name); }} style={{ background: "transparent", border: "none", cursor: "pointer", color: t.accent, fontSize: 11, fontWeight: 500, padding: 0, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4 }}>
                  <EditIcon /> Rename
                </button>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 16px", fontSize: 12.5, marginBottom: 14 }}>
              <div><div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: t.textDim, marginBottom: 2 }}>Size</div><div style={{ fontWeight: 500 }}>{fmtSize(vf.size)}</div></div>
              <div><div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: t.textDim, marginBottom: 2 }}>Pages</div><div style={{ fontWeight: 500 }}>{vf.pages}</div></div>
              <div><div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: t.textDim, marginBottom: 2 }}>Type</div><div style={{ fontWeight: 500 }}>{isPdf ? "PDF" : vf.type || "Unknown"}</div></div>
              <div><div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: t.textDim, marginBottom: 2 }}>Status</div><span style={{ fontSize: 10.5, fontWeight: 600, padding: "1px 8px", borderRadius: 8, background: t.successSoft, color: t.success }}>{vf.status === "done" ? "Extracted" : vf.status}</span></div>
              {loc && <div><div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: t.textDim, marginBottom: 2 }}>Location</div><div style={{ fontWeight: 500, display: "flex", alignItems: "center", gap: 4 }}><MapPinIcon size={11} /> {loc.name}</div></div>}
              {dept && <div><div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: t.textDim, marginBottom: 2 }}>Department</div><div style={{ fontWeight: 500, display: "flex", alignItems: "center", gap: 4 }}><LayersIcon size={11} /> {dept.name}</div></div>}
            </div>
            {breadcrumb.length > 0 && (
              <div style={{ fontSize: 11, color: t.textDim, marginBottom: 12 }}>
                <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 2 }}>Path</span>
                {breadcrumb.map(b => b.name).join(" / ")}
              </div>
            )}
            <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
              <Btn primary onClick={() => copyText(vf.text)} style={{ fontSize: 11.5, padding: "6px 12px" }}><CopyIcon /> Copy Text</Btn>
              <button onClick={() => removeFile(vf.id)} style={{ background: t.errorSoft, color: t.error, border: "none", borderRadius: 8, padding: "6px 12px", fontSize: 11.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4 }}><TrashIcon size={12} /> Delete</button>
            </div>
            <div style={{ borderBottom: `1px solid ${t.border}`, marginBottom: 0 }} />
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "10px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: t.textDim }}>Extracted Text</span>
              <span style={{ fontSize: 10, color: t.textDim }}>{(vf.text || "").length.toLocaleString()} chars</span>
            </div>
            <pre style={{ flex: 1, padding: "0 20px 20px", margin: 0, fontSize: 11, lineHeight: 1.75, color: t.textMuted, fontFamily: "'IBM Plex Mono', monospace", whiteSpace: "pre-wrap", wordBreak: "break-word", overflowY: "auto" }}>
              {vf.text || "(No extractable text found)"}
            </pre>
          </div>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "12px 20px", borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
              <FileDocIcon size={16} /> Document Preview
            </div>
            <span style={{ fontSize: 11, color: t.textDim }}>{vf.name}</span>
          </div>
          <div style={{ flex: 1, background: darkMode ? "#0a0c0f" : "#e8e5e0", overflow: "hidden" }}>
            {(() => {
              const previewUrl = vf.fileStoragePath ? api.getFilePreviewUrl(vf.fileStoragePath) : vf.fileDataUrl;
              if (previewUrl) {
                if (isPdf) {
                  if (vf.fileDataUrl) return <PdfCanvasPreview dataUrl={vf.fileDataUrl} darkMode={darkMode} />;
                  // For server files, embed via iframe
                  return <iframe src={previewUrl} style={{ width: "100%", height: "100%", border: "none" }} title="PDF Preview" />;
                }
                if (isImage) return (
                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, overflow: "auto" }}>
                    <img src={previewUrl} alt={vf.name} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: 4 }} />
                  </div>
                );
                return (
                  <div style={{ textAlign: "center", color: t.textDim, padding: 40, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%" }}>
                    <FileDocIcon size={48} />
                    <div style={{ fontSize: 14, fontWeight: 500, marginTop: 14 }}>No preview available for this file type</div>
                    <div style={{ fontSize: 12, marginTop: 4, color: t.textDim }}>{vf.type || "Unknown type"}</div>
                  </div>
                );
              }
              return (
                <div style={{ textAlign: "center", color: t.textDim, padding: 40, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%" }}>
                  <FileDocIcon size={48} />
                  <div style={{ fontSize: 14, fontWeight: 500, marginTop: 14 }}>Preview not available</div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>File data is no longer in memory</div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    );
  })();

  if (!isLoggedIn) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: darkMode ? "#0d0f12" : "#eeeae5", fontFamily: "'Geist','DM Sans',system-ui,sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" /><link href="https://cdn.jsdelivr.net/npm/geist@1.2.2/dist/fonts/geist-sans/style.min.css" rel="stylesheet" />
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}} @keyframes pulse{0%,100%{opacity:.6}50%{opacity:1}} .login-input:focus{border-color:${t.accent}!important;box-shadow:0 0 0 3px ${t.accentSoft}!important} input::placeholder{color:${t.textDim}}`}</style>
      <button onClick={() => setDarkMode(!darkMode)} style={{ position: "fixed", top: 20, right: 20, background: t.surface, border: `1px solid ${t.border}`, borderRadius: 8, padding: 8, cursor: "pointer", color: t.textMuted, display: "flex", zIndex: 10 }}>{darkMode ? <SunIcon /> : <MoonIcon />}</button>
      <div style={{ width: "100%", maxWidth: 400, padding: "0 24px", animation: "fadeIn 0.5s ease" }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}><div style={{ width: 52, height: 52, borderRadius: 14, margin: "0 auto 16px", background: `linear-gradient(135deg,${t.accent},${t.accentDark})`, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 16, fontWeight: 800, letterSpacing: "-0.03em" }}>DDA</div><h1 style={{ fontSize: 24, fontWeight: 700, color: t.text, margin: "0 0 4px" }}>Dealer Document Archive</h1><p style={{ fontSize: 13.5, color: t.textMuted, margin: 0 }}>Sign in to access your documents</p></div>
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 14, padding: "28px 24px", boxShadow: darkMode ? "0 4px 24px rgba(0,0,0,0.3)" : "0 4px 24px rgba(0,0,0,0.06)" }}>
          <div style={{ marginBottom: 16 }}><label style={{ fontSize: 12, fontWeight: 600, color: t.textMuted, display: "block", marginBottom: 6 }}>Username</label><input className="login-input" type="text" value={loginForm.username} onChange={e => { setLoginForm(p => ({ ...p, username: e.target.value })); setLoginError(""); }} onKeyDown={e => e.key === "Enter" && handleLogin()} placeholder="Enter your username" autoFocus style={{ width: "100%", padding: "11px 14px", fontSize: 14, fontFamily: "inherit", background: darkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)", border: `1px solid ${t.border}`, borderRadius: 8, color: t.text, outline: "none", boxSizing: "border-box" }} /></div>
          <div style={{ marginBottom: 20 }}><label style={{ fontSize: 12, fontWeight: 600, color: t.textMuted, display: "block", marginBottom: 6 }}>Password</label><input className="login-input" type="password" value={loginForm.password} onChange={e => { setLoginForm(p => ({ ...p, password: e.target.value })); setLoginError(""); }} onKeyDown={e => e.key === "Enter" && handleLogin()} placeholder="Enter your password" style={{ width: "100%", padding: "11px 14px", fontSize: 14, fontFamily: "inherit", background: darkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)", border: `1px solid ${t.border}`, borderRadius: 8, color: t.text, outline: "none", boxSizing: "border-box" }} /></div>
          {loginError && <div style={{ padding: "8px 12px", borderRadius: 7, marginBottom: 16, background: t.errorSoft, color: t.error, fontSize: 12.5, fontWeight: 500 }}>{loginError}</div>}
          <button onClick={handleLogin} disabled={loginLoading} style={{ width: "100%", padding: 12, fontSize: 14, fontWeight: 600, fontFamily: "inherit", cursor: loginLoading ? "wait" : "pointer", background: darkMode ? `linear-gradient(135deg,${t.accent},${t.accentDark})` : t.accent, color: "#fff", border: "none", borderRadius: 8, opacity: loginLoading ? 0.7 : 1 }}>{loginLoading ? <span style={{ animation: "pulse 1s infinite" }}>Signing in...</span> : "Sign In"}</button>
        </div>
        <p style={{ textAlign: "center", fontSize: 11.5, color: t.textDim, marginTop: 20 }}>Contact your administrator if you need access</p>
      </div>
    </div>
  );

  const adminActiveMenu = ADMIN_MENU.find(m => m.id === adminSection);
  const demoUsers = adminUsers;
  const demoGroups = securityGroups.map(g => ({ ...g, members: g.memberCount || 0, permCount: g.permissions ? Object.values(g.permissions).filter(Boolean).length : 0 }));

  const dd = dashboardData || {};
  const totalByLocation = (dd.locationStats || []).map(l => ({ name: l.name, folders: l.folder_count, files: l.file_count }));
  const recentFiles = (dd.recentFiles || []).map(f => ({ id: f.id, name: f.name, size: Number(f.file_size_bytes || 0), pages: Number(f.page_count || 0), folderId: f.folder_id, folderName: f.folder_name, locationName: f.location_name, departmentName: f.department_name }));

  const StatCard = ({ icon, label, value, color, sub }) => (
    <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, padding: "20px 18px", flex: 1, minWidth: 0, animation: "fadeIn 0.3s ease" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: color || t.accentSoft, display: "flex", alignItems: "center", justifyContent: "center", color: t.accent }}>{icon}</div>
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 2 }}>{value}</div>
      <div style={{ fontSize: 12.5, color: t.textMuted, fontWeight: 500 }}>{label}</div>
      {sub && <div style={{ fontSize: 10.5, color: t.textDim, marginTop: 4 }}>{sub}</div>}
    </div>
  );

  const dashboardPage = (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "36px 28px", animation: "fadeIn 0.35s ease" }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, letterSpacing: "-0.03em" }}>Dashboard</h1>
        <p style={{ fontSize: 13, color: t.textMuted, margin: "4px 0 0" }}>Welcome back, {loggedInUser?.name}</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 28 }}>
        <StatCard icon={<FileDocIcon size={20} />} label="Total Files" value={dd.totalFiles ?? 0} color={t.accentSoft} sub={`${dd.filesToday ?? 0} uploaded today`} />
        <StatCard icon={<FolderClosedIcon size={20} />} label="Total Folders" value={dd.totalFolders ?? 0} color={t.successSoft} sub={`${dd.foldersToday ?? 0} created today`} />
        <StatCard icon={<MapPinIcon size={20} />} label="Locations" value={dd.totalLocations ?? 0} color={darkMode ? "rgba(210,153,34,0.12)" : "rgba(180,83,9,0.08)"} />
        <StatCard icon={<LayersIcon size={20} />} label="Departments" value={dd.totalDepartments ?? 0} color={darkMode ? "rgba(248,81,73,0.1)" : "rgba(225,29,72,0.07)"} />
      </div>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 12px", letterSpacing: "-0.01em" }}>Files by Location</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {totalByLocation.map((loc, i) => {
            const maxFiles = Math.max(...totalByLocation.map(l => l.files), 1);
            return (
              <div key={i} style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 10, padding: "14px 16px", animation: `fadeIn 0.25s ease ${i * 0.05}s both` }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <MapPinIcon size={14} />
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{loc.name}</span>
                  </div>
                  <span style={{ fontSize: 12, color: t.textMuted }}>{loc.files} file{loc.files !== 1 ? "s" : ""} · {loc.folders} folder{loc.folders !== 1 ? "s" : ""}</span>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: t.progressBg, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${(loc.files / maxFiles) * 100}%`, background: `linear-gradient(90deg, ${t.accent}, ${t.accentDark})`, borderRadius: 3, transition: "width 0.5s ease" }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div>
        <h2 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 12px", letterSpacing: "-0.01em" }}>Recent Uploads</h2>
        {recentFiles.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {recentFiles.map((file, idx) => {
              return (
                <div key={file.id} className="folder-row" onClick={() => { if (file.folderId) { setActiveFolderId(file.folderId); setPage("folder-detail"); } }} style={{ display: "flex", alignItems: "center", background: t.surface, border: `1px solid ${t.border}`, borderRadius: 10, padding: "10px 16px", cursor: "pointer", transition: "all 0.2s", animation: `fadeIn 0.25s ease ${idx * 0.03}s both` }}>
                  <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: t.successSoft, color: t.success, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><FileDocIcon size={16} /></div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{file.name}</div>
                      <div style={{ fontSize: 10.5, color: t.textDim }}>{file.locationName} / {file.departmentName} / {file.folderName}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: t.textMuted, flexShrink: 0, marginLeft: 12 }}>{fmtSize(file.size)}</div>
                  <div style={{ fontSize: 10.5, color: t.textDim, flexShrink: 0, marginLeft: 12 }}>{file.pages} pg</div>
                  <div style={{ width: 24, display: "flex", justifyContent: "flex-end", color: t.textDim, marginLeft: 8 }}><ChevronRightIcon /></div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 10, padding: "40px 20px", textAlign: "center", color: t.textDim }}>
            <UploadCloudIcon size={36} />
            <div style={{ fontSize: 13, fontWeight: 500, marginTop: 12, marginBottom: 6 }}>No files uploaded yet</div>
            <div style={{ fontSize: 12, marginBottom: 16 }}>Upload your first PDF to get started</div>
            <Btn primary onClick={() => setPage("upload")}><UploadCloudIcon size={15} /> Upload Files</Btn>
          </div>
        )}
      </div>
    </div>
  );

  const foldersPage = (() => {
    const q = folderSearch.trim(), df = currentDeptFolders;
    const filtered = q ? df.map(f => ({ folder: f, ...fuzzyMatch(q, f.name) })).filter(r => r.match).sort((a, b) => b.score - a.score).map(r => r.folder) : df;
    const fc = df.reduce((s, f) => s + allFilesInFolderRecursive(f.id), 0);
    return (
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "36px 28px", animation: "fadeIn 0.35s ease" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0 }}>{currentLocation?.name} — {currentDept?.name}</h1>
            <p style={{ fontSize: 13, color: t.textMuted, margin: "4px 0 0" }}>{df.length} folder{df.length !== 1 ? "s" : ""} · {fc} file{fc !== 1 ? "s" : ""}</p>
          </div>
          {!creatingDeptFolder && (
            <Btn primary onClick={() => { setCreatingDeptFolder(true); setNewDeptFolderName(""); }} style={{ fontSize: 12 }}>
              <PlusIcon size={13} /> New Folder
            </Btn>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: t.surface, border: `1px solid ${t.border}`, borderRadius: 10, padding: "10px 14px", marginBottom: 16 }}>
          <SearchIcon size={16} />
          <input value={folderSearch} onChange={e => setFolderSearch(e.target.value)} placeholder="Search folders..." style={{ flex: 1, background: "transparent", border: "none", fontSize: 13.5, color: t.text, outline: "none", fontFamily: "inherit" }} />
          {folderSearch && <button onClick={() => setFolderSearch("")} style={{ background: "transparent", border: "none", cursor: "pointer", color: t.textDim, display: "flex", padding: 2 }}><XIcon size={14} /></button>}
        </div>
        {creatingDeptFolder && (
          <div style={{ background: t.surface, border: `1px solid ${t.accent}`, borderRadius: 10, padding: "12px 14px", marginBottom: 12, display: "flex", alignItems: "center", gap: 10, boxShadow: `0 0 0 3px ${t.accentSoft}`, animation: "fadeIn 0.2s ease" }}>
            <div style={{ color: t.accent }}><FolderClosedIcon size={18} /></div>
            <input
              ref={newDeptFolderRef}
              value={newDeptFolderName}
              onChange={e => setNewDeptFolderName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") createDeptFolder(); if (e.key === "Escape") { setCreatingDeptFolder(false); setNewDeptFolderName(""); } }}
              placeholder="Folder name..."
              style={{ flex: 1, background: "transparent", border: "none", fontSize: 13.5, color: t.text, outline: "none", fontFamily: "inherit", fontWeight: 500 }}
            />
            <Btn primary onClick={createDeptFolder} style={{ padding: "5px 12px", fontSize: 11.5 }}>Create</Btn>
            <button onClick={() => { setCreatingDeptFolder(false); setNewDeptFolderName(""); }} style={{ background: "transparent", border: "none", cursor: "pointer", color: t.textDim, display: "flex", padding: 3 }}><XIcon size={14} /></button>
          </div>
        )}
        {filtered.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {filtered.map((folder, idx) => {
              const c = allFilesInFolderRecursive(folder.id), sc = subfoldersOf(folder.id).length;
              return (
                <div key={folder.id} className="folder-row" onClick={() => { setActiveFolderId(folder.id); setPage("folder-detail"); setCreatingSubfolder(false); }} style={{ display: "flex", alignItems: "center", background: t.surface, border: `1px solid ${t.border}`, borderRadius: 10, padding: "12px 18px", cursor: "pointer", transition: "all 0.2s", animation: `fadeIn 0.25s ease ${idx * 0.03}s both` }}>
                  <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ color: t.accent, opacity: 0.75 }}><FolderClosedIcon size={22} /></div>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 600 }}><HighlightedName name={folder.name} query={folderSearch.trim()} accentColor={t.accent} /></div>
                      {sc > 0 && <div style={{ fontSize: 10.5, color: t.textDim }}>{sc} subfolder{sc !== 1 ? "s" : ""}</div>}
                    </div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: c > 0 ? t.accent : t.textDim, background: c > 0 ? t.accentSoft : "transparent", padding: "2px 9px", borderRadius: 12 }}>{c}</span>
                  <div style={{ width: 30, display: "flex", justifyContent: "flex-end", marginLeft: 6 }}><SmallBtn title="Delete folder" onClick={e => { e.stopPropagation(); handleDeleteFolder(folder); }}><TrashIcon size={12} /></SmallBtn></div>
                  <div style={{ width: 24, display: "flex", justifyContent: "flex-end", color: t.textDim }}><ChevronRightIcon /></div>
                </div>
              );
            })}
          </div>
        ) : !creatingDeptFolder && (
          <div style={{ textAlign: "center", padding: "60px 0", color: t.textDim }}>
            <FolderClosedIcon size={48} />
            <div style={{ fontSize: 15, fontWeight: 500, marginTop: 16, marginBottom: 6 }}>{q ? `No match for "${q}"` : "No folders yet"}</div>
            {!q && <div style={{ fontSize: 13, marginBottom: 16 }}>Create a folder to start organizing files</div>}
            {!q && <Btn primary onClick={() => { setCreatingDeptFolder(true); setNewDeptFolderName(""); }}><PlusIcon size={13} /> New Folder</Btn>}
          </div>
        )}
      </div>
    );
  })();

  const folderDetail = (() => {
    if (!activeFolder) return null;
    const ff = filesInFolder(activeFolderId), fd = departments.find(d => d.id === activeFolder.departmentId), fl = locations.find(l => l.id === activeFolder.locationId);
    const subs = subfoldersOf(activeFolderId);
    const breadcrumb = getBreadcrumb(activeFolderId);
    const ddOver = folderDetailDragOver;
    return (
      <div
        onDrop={handleFolderDetailDrop}
        onDragOver={e => { e.preventDefault(); setFolderDetailDragOver(true); }}
        onDragLeave={e => { e.preventDefault(); if (!e.currentTarget.contains(e.relatedTarget)) setFolderDetailDragOver(false); }}
        style={{ maxWidth: 900, margin: "0 auto", padding: "36px 28px", animation: "fadeIn 0.3s ease", position: "relative", minHeight: "calc(100vh - 55px)" }}
      >
        {ddOver && (
          <div style={{ position: "absolute", inset: 0, zIndex: 20, borderRadius: 14, border: `2px dashed ${t.accent}`, background: t.dropzoneActive, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(2px)", pointerEvents: "none" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ color: t.accent, marginBottom: 10 }}><UploadCloudIcon size={48} /></div>
              <div style={{ fontSize: 16, fontWeight: 600, color: t.text }}>Drop files into "{activeFolder.name}"</div>
              <div style={{ fontSize: 12, color: t.textMuted, marginTop: 4 }}>Files will be added to this folder automatically</div>
            </div>
          </div>
        )}
        <input ref={folderDetailInputRef} type="file" accept=".pdf" multiple onChange={e => { handleFolderDetailFiles(e.target.files); e.target.value = ""; }} style={{ display: "none" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
          <button onClick={() => { setPage("folders"); setSelectedFile(null); setCreatingSubfolder(false); }} style={{ background: "transparent", border: "none", cursor: "pointer", color: t.accent, fontSize: 12.5, fontWeight: 500, display: "flex", alignItems: "center", gap: 4, padding: 0, fontFamily: "inherit" }}>
            {fl?.name} — {fd?.name}
          </button>
          {breadcrumb.map((crumb, i) => (
            <span key={crumb.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ color: t.textDim, fontSize: 11 }}>/</span>
              {i === breadcrumb.length - 1 ? (
                <span style={{ fontSize: 12.5, fontWeight: 600, color: t.text }}>{crumb.name}</span>
              ) : (
                <button onClick={() => { setActiveFolderId(crumb.id); setCreatingSubfolder(false); }} style={{ background: "transparent", border: "none", cursor: "pointer", color: t.accent, fontSize: 12.5, fontWeight: 500, padding: 0, fontFamily: "inherit" }}>
                  {crumb.name}
                </button>
              )}
            </span>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ color: t.accent }}><FolderOpenIcon size={28} /></div>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>{activeFolder.name}</h1>
              <p style={{ fontSize: 12.5, color: t.textMuted, margin: "2px 0 0" }}>
                {subs.length > 0 && `${subs.length} subfolder${subs.length !== 1 ? "s" : ""} · `}{ff.length} file{ff.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {!creatingSubfolder && (
              <Btn onClick={() => { setCreatingSubfolder(true); setNewSubfolderName(""); }} style={{ fontSize: 12 }}>
                <FolderClosedIcon size={14} /> New Subfolder
              </Btn>
            )}
            <Btn primary onClick={() => folderDetailInputRef.current?.click()} style={{ fontSize: 12 }}>
              <UploadCloudIcon size={15} /> Add Files
            </Btn>
          </div>
        </div>
        {creatingSubfolder && (
          <div style={{ background: t.surface, border: `1px solid ${t.accent}`, borderRadius: 10, padding: "12px 14px", marginBottom: 12, display: "flex", alignItems: "center", gap: 10, boxShadow: `0 0 0 3px ${t.accentSoft}`, animation: "fadeIn 0.2s ease" }}>
            <div style={{ color: t.accent }}><FolderClosedIcon size={18} /></div>
            <input
              ref={newSubfolderRef}
              value={newSubfolderName}
              onChange={e => setNewSubfolderName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") createSubfolder(); if (e.key === "Escape") { setCreatingSubfolder(false); setNewSubfolderName(""); } }}
              placeholder="Subfolder name..."
              style={{ flex: 1, background: "transparent", border: "none", fontSize: 13.5, color: t.text, outline: "none", fontFamily: "inherit", fontWeight: 500 }}
            />
            <Btn primary onClick={createSubfolder} style={{ padding: "5px 12px", fontSize: 11.5 }}>Create</Btn>
            <button onClick={() => { setCreatingSubfolder(false); setNewSubfolderName(""); }} style={{ background: "transparent", border: "none", cursor: "pointer", color: t.textDim, display: "flex", padding: 3 }}><XIcon size={14} /></button>
          </div>
        )}
        {subs.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: t.textDim, marginBottom: 8, paddingLeft: 4 }}>Subfolders</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {subs.map((sub, idx) => {
                const sc = allFilesInFolderRecursive(sub.id);
                const subSubs = subfoldersOf(sub.id).length;
                return (
                  <div key={sub.id} className="folder-row" onClick={() => { setActiveFolderId(sub.id); setCreatingSubfolder(false); }} style={{ display: "flex", alignItems: "center", background: t.surface, border: `1px solid ${t.border}`, borderRadius: 10, padding: "11px 16px", cursor: "pointer", transition: "all 0.2s", animation: `fadeIn 0.25s ease ${idx * 0.03}s both` }}>
                    <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ color: t.accent, opacity: 0.7 }}><FolderClosedIcon size={20} /></div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{sub.name}</div>
                        {subSubs > 0 && <div style={{ fontSize: 10, color: t.textDim }}>{subSubs} subfolder{subSubs !== 1 ? "s" : ""}</div>}
                      </div>
                    </div>
                    <span style={{ fontSize: 10.5, fontWeight: 600, color: sc > 0 ? t.accent : t.textDim, background: sc > 0 ? t.accentSoft : "transparent", padding: "2px 8px", borderRadius: 10 }}>{sc} file{sc !== 1 ? "s" : ""}</span>
                    <div style={{ display: "flex", justifyContent: "flex-end", marginLeft: 6 }}><SmallBtn title="Delete subfolder" onClick={e => { e.stopPropagation(); handleDeleteFolder(sub); }}><TrashIcon size={12} /></SmallBtn></div>
                    <div style={{ width: 24, display: "flex", justifyContent: "flex-end", color: t.textDim, marginLeft: 4 }}><ChevronRightIcon /></div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <div onClick={() => folderDetailInputRef.current?.click()} style={{ border: `1px dashed ${t.border}`, borderRadius: 10, padding: "16px 20px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12, cursor: "pointer", background: t.dropzone }}>
          <div style={{ color: t.textDim }}><UploadCloudIcon size={24} /></div>
          <div><div style={{ fontSize: 13, fontWeight: 500, color: t.text }}>Drag & drop files here or click to browse</div><div style={{ fontSize: 11, color: t.textDim }}>PDFs added directly to this folder</div></div>
        </div>
        {ff.length > 0 ? (
          <div>
            <div style={{ border: `1px solid ${t.border}`, borderRadius: 10, overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", padding: "8px 16px", background: darkMode ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)", borderBottom: `1px solid ${t.border}`, fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: t.textDim }}>
                <div style={{ flex: 1, minWidth: 0 }}>Name</div>
                <div style={{ width: 70, textAlign: "right", flexShrink: 0 }}>Size</div>
                <div style={{ width: 50, textAlign: "right", flexShrink: 0 }}>Pages</div>
                <div style={{ width: 140, textAlign: "right", flexShrink: 0 }}>Uploaded</div>
                <div style={{ width: 100, textAlign: "right", flexShrink: 0 }}>By</div>
                <div style={{ width: 80, flexShrink: 0 }}></div>
              </div>
              {ff.map((file, idx) => {
                const uploadDate = file.uploadedAt ? new Date(file.uploadedAt) : null;
                const dateStr = uploadDate ? uploadDate.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }) : "";
                const timeStr = uploadDate ? uploadDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
                return (
                  <div key={file.id} onClick={() => { if (file.status === "done") { setViewingFileId(file.id); setPage("file-detail"); } }} className="folder-row" style={{ display: "flex", alignItems: "center", padding: "10px 16px", cursor: file.status === "done" ? "pointer" : "default", borderBottom: idx < ff.length - 1 ? `1px solid ${t.border}` : "none", animation: `fadeIn 0.2s ease ${idx * 0.03}s both`, position: "relative", overflow: "hidden" }}>
                    {file.status === "processing" && <div style={{ position: "absolute", left: 0, bottom: 0, height: 2, width: "100%", background: t.progressBg }}><div style={{ height: "100%", width: `${file.progress}%`, background: `linear-gradient(90deg,${t.accent},${t.accentDark})`, transition: "width 0.3s" }} /></div>}
                    <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                      <div style={{ width: 30, height: 30, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: file.status === "error" ? t.errorSoft : file.status === "done" ? t.successSoft : t.accentSoft, color: file.status === "error" ? t.error : file.status === "done" ? t.success : t.accent }}><FileDocIcon size={15} /></div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{file.name}</div>
                        {file.status === "processing" && <div style={{ fontSize: 10, color: t.accent }}>Processing {file.progress}%</div>}
                        {file.status === "error" && <div style={{ fontSize: 10, color: t.error }}>{file.error}</div>}
                      </div>
                    </div>
                    <div style={{ width: 70, textAlign: "right", fontSize: 11.5, color: t.textMuted, flexShrink: 0 }}>{fmtSize(file.size)}</div>
                    <div style={{ width: 50, textAlign: "right", fontSize: 11.5, color: t.textMuted, flexShrink: 0 }}>{file.pages || "—"}</div>
                    <div style={{ width: 140, textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: 11, color: t.textMuted }}>{dateStr}</div>
                      <div style={{ fontSize: 10, color: t.textDim }}>{timeStr}</div>
                    </div>
                    <div style={{ width: 100, textAlign: "right", fontSize: 11, color: t.textMuted, flexShrink: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={file.uploadedBy || ""}>{file.uploadedBy || "—"}</div>
                    <div style={{ width: 80, display: "flex", justifyContent: "flex-end", gap: 2, flexShrink: 0 }}>
                      {file.status === "done" && <SmallBtn title="Rename" onClick={e => { e.stopPropagation(); setRenamingFileId(file.id); setRenamingFileName(file.name); }}><EditIcon /></SmallBtn>}
                      {file.status === "done" && <SmallBtn title="Copy text" onClick={e => { e.stopPropagation(); copyText(file.text); }}><CopyIcon /></SmallBtn>}
                      <SmallBtn title="Remove" onClick={e => { e.stopPropagation(); removeFile(file.id); }}><TrashIcon size={12} /></SmallBtn>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : subs.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 0", color: t.textDim }}>
            <FileDocIcon size={40} />
            <div style={{ fontSize: 14, fontWeight: 500, marginTop: 14 }}>No files yet</div>
            <div style={{ fontSize: 12.5, marginTop: 4 }}>Drag files onto this page or click "Add Files"</div>
          </div>
        )}
      </div>
    );
  })();

  /* Move unsorted file to a folder */
  const handleMoveFile = async (fileId, folderId) => {
    try {
      await api.moveFile(fileId, folderId);
      setUnsortedFiles(p => p.filter(f => f.id !== fileId));
      setMovingFileId(null);
      setMoveTargetFolderId("");
    } catch (err) { console.error("Move failed:", err); }
  };

  const unsortedPage = (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "36px 28px", animation: "fadeIn 0.35s ease" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0 }}>Unsorted Files</h1>
          <p style={{ fontSize: 13, color: t.textMuted, margin: "4px 0 0" }}>{unsortedFiles.length} file{unsortedFiles.length !== 1 ? "s" : ""} not assigned to any folder</p>
        </div>
      </div>
      {unsortedFiles.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {unsortedFiles.map((file, idx) => (
            <div key={file.id} style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 10, padding: "12px 16px", animation: `fadeIn 0.25s ease ${idx * 0.03}s both` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: t.accentSoft, color: t.accent }}><FileDocIcon size={18} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{file.name}</div>
                  <div style={{ fontSize: 10.5, color: t.textMuted, display: "flex", gap: 8 }}>
                    <span>{fmtSize(file.size)}</span>
                    {file.pages > 0 && <span>{file.pages} pg</span>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  {movingFileId === file.id ? (
                    <div style={{ position: "relative", minWidth: 220 }}>
                      <div onClick={() => { setShowMoveSelect(!showMoveSelect); setMoveSelectSearch(""); }} style={{ border: `1px solid ${showMoveSelect ? t.accent : t.border}`, borderRadius: 8, padding: "6px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontSize: 12, background: darkMode ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)" }}>
                        <FolderClosedIcon size={14} />
                        <span style={{ flex: 1, color: moveTargetFolderId ? t.text : t.textDim }}>{moveTargetFolderId ? folders.find(f => f.id === moveTargetFolderId)?.name || "Select..." : "Choose folder..."}</span>
                        <ChevronDown />
                      </div>
                      {showMoveSelect && (() => {
                        const sq = moveSelectSearch.trim();
                        const dff = sq ? folders.map(f => ({ folder: f, ...fuzzyMatch(sq, f.name) })).filter(r => r.match).sort((a, b) => b.score - a.score).map(r => r.folder) : folders;
                        return (
                          <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 100, background: t.surface, border: `1px solid ${t.border}`, borderRadius: 10, boxShadow: "0 12px 36px rgba(0,0,0,0.2)", overflow: "hidden" }}>
                            <div style={{ padding: "6px 8px", borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", gap: 6 }}>
                              <SearchIcon size={13} />
                              <input ref={moveSelectRef} value={moveSelectSearch} onChange={e => setMoveSelectSearch(e.target.value)} onClick={e => e.stopPropagation()} placeholder="Search folders..." style={{ flex: 1, background: "transparent", border: "none", fontSize: 12, color: t.text, outline: "none", fontFamily: "inherit" }} />
                            </div>
                            <div style={{ maxHeight: 250, overflowY: "auto", padding: 4 }}>
                              {locations.map(loc => {
                                const li = dff.filter(f => f.locationId === loc.id);
                                if (!li.length) return null;
                                return (
                                  <div key={loc.id}>
                                    <div style={{ padding: "5px 8px 2px", fontSize: 9.5, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: t.textMuted }}>{loc.name}</div>
                                    {deptsInLocation(loc.id).map(dept => {
                                      const di = li.filter(f => f.departmentId === dept.id);
                                      if (!di.length) return null;
                                      return (
                                        <div key={dept.id}>
                                          <div style={{ padding: "3px 8px 2px 16px", fontSize: 9, fontWeight: 600, color: t.textDim }}>{dept.name}</div>
                                          {di.map(folder => (
                                            <div key={folder.id} onClick={() => { setMoveTargetFolderId(folder.id); setShowMoveSelect(false); setMoveSelectSearch(""); }} className="folder-select-item" style={{ padding: "6px 10px 6px 24px", borderRadius: 6, cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", gap: 8, background: moveTargetFolderId === folder.id ? t.accentSoft : "transparent", color: moveTargetFolderId === folder.id ? t.accent : t.text, fontWeight: 500 }}>
                                              <FolderClosedIcon size={13} />
                                              <span style={{ flex: 1 }}>{folder.name}</span>
                                            </div>
                                          ))}
                                        </div>
                                      );
                                    })}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}
                      {moveTargetFolderId && (
                        <Btn primary onClick={() => handleMoveFile(file.id, moveTargetFolderId)} style={{ marginTop: 6, fontSize: 11, padding: "5px 12px", width: "100%" }}>
                          <CheckIcon /> Move to Folder
                        </Btn>
                      )}
                      <button onClick={() => { setMovingFileId(null); setMoveTargetFolderId(""); setShowMoveSelect(false); }} style={{ marginTop: 4, background: "transparent", border: "none", cursor: "pointer", color: t.textDim, fontSize: 10.5, fontFamily: "inherit", width: "100%", textAlign: "center" }}>Cancel</button>
                    </div>
                  ) : (
                    <>
                      <Btn onClick={() => { setMovingFileId(file.id); setMoveTargetFolderId(""); setShowMoveSelect(false); }} style={{ fontSize: 11, padding: "5px 12px" }}>
                        <FolderClosedIcon size={13} /> Move to Folder
                      </Btn>
                      <SmallBtn title="Delete" onClick={() => {
                        setWarningModal({
                          title: "Delete File",
                          message: `Delete "${file.name}"? This cannot be undone.`,
                          onConfirm: async () => { await removeFile(file.id); setUnsortedFiles(p => p.filter(f => f.id !== file.id)); setWarningModal(null); }
                        });
                      }}><TrashIcon size={12} /></SmallBtn>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 10, padding: "48px 20px", textAlign: "center", color: t.textDim }}>
          <CheckIcon />
          <div style={{ fontSize: 13, fontWeight: 500, marginTop: 12 }}>All files are sorted</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>No unsorted files at the moment</div>
        </div>
      )}
    </div>
  );

  /* ── RO Number extraction from PDF text ─────────────────── */
  /* Looks for patterns like RO#12345, RO 12345, RO-12345, R.O. 12345, etc. */
  /* ── Extract RO/Reference number from text or filename ──── */
  /* Priority: R followed by exactly 9 digits (e.g. R101234567, R102345678) */
  /* Also checks for traditional RO# patterns as fallback */
  const extractRO = (text, filename) => {
    // Check both text content and filename
    const sources = [filename || "", text || ""];
    for (const src of sources) {
      // Primary pattern: R followed by exactly 9 digits (R101..., R102..., R103..., R104...)
      const rMatch = src.match(/\b(R\d{9})\b/);
      if (rMatch) return rMatch[1];
    }
    // Fallback: traditional RO patterns in text only
    if (text) {
      const patterns = [
        /R\.?O\.?\s*#?\s*(\d[\d\-]{2,})/i,
        /Repair\s*Order\s*#?\s*(\d[\d\-]{2,})/i,
        /RO\s*Number\s*:?\s*(\d[\d\-]{2,})/i,
      ];
      for (const pat of patterns) {
        const m = text.match(pat);
        if (m) return m[1].replace(/-+$/, "");
      }
    }
    return null;
  };

  /* Try to match an RO/reference number to an existing folder name */
  const suggestFolderForFile = (file) => {
    const ro = extractRO(file.text, file.name);
    if (!ro) return null;
    // Exact match: folder name IS the RO number
    const exact = folders.find(f => f.name === ro || f.name.toUpperCase() === ro.toUpperCase());
    if (exact) return { folder: exact, ro, confidence: "exact" };
    // Close match: folder name starts with or contains the RO number
    const contains = folders.find(f => f.name.toUpperCase().includes(ro.toUpperCase()));
    if (contains) return { folder: contains, ro, confidence: "partial" };
    // Try without the R prefix for legacy RO folders (e.g. folder "101234567" matches R101234567)
    if (/^R\d{9}$/.test(ro)) {
      const numPart = ro.slice(1);
      const numMatch = folders.find(f => f.name === numPart || f.name.includes(numPart));
      if (numMatch) return { folder: numMatch, ro, confidence: "partial" };
    }
    return { folder: null, ro, confidence: "none" };
  };

  /* Upload all staged files (each to its assigned folder or unsorted) */
  const uploadAllStaged = async () => {
    const ready = stagedFiles.filter(f => f.status === "done");
    if (ready.length === 0) return;
    for (const sf of ready) {
      const folderId = stagedFolderAssignments[sf.id] || null;
      try {
        await api.uploadFile(sf._rawFile || new Blob(), folderId, sf.text, sf.pages);
      } catch (err) { console.error("Upload failed:", sf.name, err); }
    }
    setStagedFiles(p => p.filter(f => f.status === "processing"));
    setStagedFolderAssignments({});
    setStagedSuggestions({});
    // Refresh unsorted count
    api.getUnsortedFiles().then(rows => {
      setUnsortedFiles(rows.map(f => ({
        id: f.id, name: f.name, size: Number(f.file_size_bytes || 0), type: f.mime_type || "application/pdf",
        pages: Number(f.page_count || 0), status: f.status, text: f.extracted_text,
        folderId: null, fileStoragePath: f.file_storage_path,
        error: f.error_message, progress: f.status === "done" ? 100 : 0,
      })));
    }).catch(console.error);
  };

  const removeStagedFile = (id) => {
    setStagedFiles(p => p.filter(f => f.id !== id));
    setStagedFolderAssignments(p => { const n = { ...p }; delete n[id]; return n; });
    setStagedSuggestions(p => { const n = { ...p }; delete n[id]; return n; });
  };

  const uploadPage = (() => {
    const allDone = stagedFiles.length > 0 && stagedFiles.every(f => f.status !== "processing");
    const readyCount = stagedFiles.filter(f => f.status === "done").length;
    const assignedCount = stagedFiles.filter(f => f.status === "done" && stagedFolderAssignments[f.id]).length;
    const unsortedCount = readyCount - assignedCount;

    return (
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "36px 28px", animation: "fadeIn 0.35s ease" }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0 }}>Upload</h1>
          <p style={{ fontSize: 13, color: t.textMuted, margin: "4px 0 0" }}>Upload PDF files. Optionally assign each to a folder, or leave unassigned to go to Unsorted.</p>
        </div>

        {/* Drop zone */}
        <div onDrop={handleDrop} onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={e => { e.preventDefault(); setDragOver(false); }} onClick={() => fileInputRef.current?.click()} style={{ border: `2px dashed ${dragOver ? t.accent : t.border}`, borderRadius: 14, padding: "44px 24px", textAlign: "center", cursor: "pointer", background: dragOver ? t.dropzoneActive : t.dropzone, marginBottom: 24, position: "relative" }}>
          <div style={{ color: dragOver ? t.accent : t.textDim, marginBottom: 10 }}><UploadCloudIcon /></div>
          <p style={{ fontSize: 16, fontWeight: 500, marginBottom: 4, color: t.text }}>{dragOver ? "Drop PDFs" : "Drag & drop PDF files"}</p>
          <p style={{ fontSize: 12, color: t.textMuted, margin: 0 }}>or click to browse · max 50 MB per file</p>
          <input ref={fileInputRef} type="file" accept=".pdf" multiple onChange={e => { handleUploadFiles(e.target.files); e.target.value = ""; }} style={{ display: "none" }} />
        </div>

        {/* Staged files table */}
        {stagedFiles.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: t.text }}>{stagedFiles.length} file{stagedFiles.length !== 1 ? "s" : ""} selected</span>
              <button onClick={() => { setStagedFiles([]); setStagedFolderAssignments({}); setStagedSuggestions({}); }} style={{ background: "transparent", border: "none", cursor: "pointer", color: t.error, fontSize: 11, fontWeight: 600, fontFamily: "inherit" }}>Clear All</button>
            </div>
            <div style={{ border: `1px solid ${t.border}`, borderRadius: 10 }}>
              <div style={{ display: "flex", alignItems: "center", padding: "8px 14px", background: darkMode ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)", borderBottom: `1px solid ${t.border}`, fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: t.textDim }}>
                <div style={{ flex: 1, minWidth: 0 }}>File</div>
                <div style={{ width: 60, textAlign: "right", flexShrink: 0 }}>Size</div>
                <div style={{ width: 45, textAlign: "right", flexShrink: 0 }}>Pages</div>
                <div style={{ width: 260, textAlign: "left", flexShrink: 0, paddingLeft: 12 }}>Assign to Folder</div>
                <div style={{ width: 30, flexShrink: 0 }}></div>
              </div>

              {stagedFiles.map((sf, idx) => {
                const suggestion = stagedSuggestions[sf.id];
                const assignedFolderId = stagedFolderAssignments[sf.id] || null;
                const assignedFolder = assignedFolderId ? folders.find(f => f.id === assignedFolderId) : null;
                const isOpen = openStagedDropdown === sf.id;
                const hasSuggestion = suggestion?.folder && !assignedFolderId && suggestion.confidence !== "none";

                return (
                  <div key={sf.id} style={{ display: "flex", alignItems: "center", padding: "10px 14px", borderBottom: idx < stagedFiles.length - 1 ? `1px solid ${t.border}` : "none", animation: `fadeIn 0.2s ease ${idx * 0.03}s both`, position: "relative" }}>
                    {sf.status === "processing" && <div style={{ position: "absolute", left: 0, bottom: 0, height: 2, width: "100%", background: t.progressBg }}><div style={{ height: "100%", width: `${sf.progress}%`, background: `linear-gradient(90deg,${t.accent},${t.accentDark})`, transition: "width 0.3s" }} /></div>}

                    {/* File info */}
                    <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: sf.status === "error" ? t.errorSoft : sf.status === "done" ? t.successSoft : t.accentSoft, color: sf.status === "error" ? t.error : sf.status === "done" ? t.success : t.accent }}>{sf.status === "done" ? <CheckIcon /> : <FileDocIcon size={14} />}</div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sf.name}</div>
                        {sf.status === "processing" && <div style={{ fontSize: 10, color: t.accent }}>Processing {sf.progress}%</div>}
                        {sf.status === "error" && <div style={{ fontSize: 10, color: t.error }}>{sf.error}</div>}
                        {suggestion?.ro && sf.status === "done" && <div style={{ fontSize: 10, color: t.textDim }}>RO# {suggestion.ro}</div>}
                      </div>
                    </div>

                    <div style={{ width: 60, textAlign: "right", fontSize: 11, color: t.textMuted, flexShrink: 0 }}>{fmtSize(sf.size)}</div>
                    <div style={{ width: 45, textAlign: "right", fontSize: 11, color: t.textMuted, flexShrink: 0 }}>{sf.pages || "—"}</div>

                    {/* Per-file folder dropdown */}
                    <div style={{ width: 260, flexShrink: 0, paddingLeft: 12, position: "relative" }}>
                      {sf.status === "done" ? (
                        <>
                          {/* Suggestion banner */}
                          {hasSuggestion && (
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, padding: "3px 8px", borderRadius: 6, background: darkMode ? "rgba(210,153,34,0.1)" : "rgba(180,83,9,0.06)", fontSize: 10, color: darkMode ? "#d29922" : "#b45309" }}>
                              <span>Suggested: <b>{suggestion.folder.name}</b></span>
                              <button onClick={() => setStagedFolderAssignments(p => ({ ...p, [sf.id]: suggestion.folder.id }))} style={{ background: t.successSoft, color: t.success, border: "none", borderRadius: 4, padding: "1px 6px", fontSize: 9.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Accept</button>
                              <button onClick={() => setStagedSuggestions(p => { const n = { ...p }; n[sf.id] = { ...n[sf.id], confidence: "none" }; return n; })} style={{ background: "transparent", color: t.textDim, border: "none", padding: "1px 4px", fontSize: 9.5, cursor: "pointer", fontFamily: "inherit" }}>Dismiss</button>
                            </div>
                          )}
                          <div onClick={() => { setOpenStagedDropdown(isOpen ? null : sf.id); setStagedDropdownSearch(""); }} style={{ border: `1px solid ${isOpen ? t.accent : t.border}`, borderRadius: 7, padding: "5px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 12, background: darkMode ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)" }}>
                            <FolderClosedIcon size={13} />
                            <span style={{ flex: 1, color: assignedFolder ? t.text : t.textDim, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{assignedFolder ? assignedFolder.name : "Unsorted (optional)"}</span>
                            {assignedFolder && <button onClick={e => { e.stopPropagation(); setStagedFolderAssignments(p => { const n = { ...p }; delete n[sf.id]; return n; }); }} style={{ background: "transparent", border: "none", cursor: "pointer", color: t.textDim, padding: 0, display: "flex" }}><XIcon size={12} /></button>}
                            <ChevronDown />
                          </div>
                          {isOpen && (() => {
                            const sq = stagedDropdownSearch.trim();
                            const dff = sq ? folders.map(f => ({ ...f, ...fuzzyMatch(sq, f.name) })).filter(r => r.match).sort((a, b) => b.score - a.score) : folders;
                            return (
                              <>
                              <div onClick={e => { e.stopPropagation(); setOpenStagedDropdown(null); setStagedDropdownSearch(""); }} style={{ position: "fixed", inset: 0, zIndex: 499 }} />
                              <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 500, background: darkMode ? "#1a1d23" : "#ffffff", border: `1px solid ${t.border}`, borderRadius: 10, boxShadow: darkMode ? "0 12px 40px rgba(0,0,0,0.6)" : "0 12px 40px rgba(0,0,0,0.2)", marginTop: 4 }}>
                                <div style={{ padding: "6px 8px", borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", gap: 6 }}>
                                  <SearchIcon size={13} />
                                  <input autoFocus value={stagedDropdownSearch} onChange={e => setStagedDropdownSearch(e.target.value)} onClick={e => e.stopPropagation()} onKeyDown={e => { if (e.key === "Escape") setOpenStagedDropdown(null); }} placeholder="Search folders..." style={{ flex: 1, background: "transparent", border: "none", fontSize: 12, color: t.text, outline: "none", fontFamily: "inherit" }} />
                                </div>
                                <div style={{ maxHeight: 220, overflowY: "auto", padding: 3 }}>
                                  {locations.map(loc => {
                                    const li = dff.filter(f => f.locationId === loc.id);
                                    if (!li.length) return null;
                                    return (
                                      <div key={loc.id}>
                                        <div style={{ padding: "4px 8px 2px", fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: t.textMuted }}>{loc.name}</div>
                                        {deptsInLocation(loc.id).map(dept => {
                                          const di = li.filter(f => f.departmentId === dept.id);
                                          if (!di.length) return null;
                                          return (
                                            <div key={dept.id}>
                                              <div style={{ padding: "2px 8px 2px 14px", fontSize: 8.5, fontWeight: 600, color: t.textDim }}>{dept.name}</div>
                                              {di.map(folder => (
                                                <div key={folder.id} onClick={() => { setStagedFolderAssignments(p => ({ ...p, [sf.id]: folder.id })); setOpenStagedDropdown(null); setStagedDropdownSearch(""); }} className="folder-select-item" style={{ padding: "5px 8px 5px 22px", borderRadius: 5, cursor: "pointer", fontSize: 11.5, display: "flex", alignItems: "center", gap: 7, background: assignedFolderId === folder.id ? t.accentSoft : "transparent", color: assignedFolderId === folder.id ? t.accent : t.text, fontWeight: 500 }}>
                                                  <FolderClosedIcon size={12} />
                                                  <span style={{ flex: 1 }}>{folder.name}</span>
                                                </div>
                                              ))}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    );
                                  })}
                                  {dff.length === 0 && <div style={{ padding: "10px", fontSize: 11, color: t.textDim, textAlign: "center" }}>No folders found</div>}
                                </div>
                              </div>
                              </>
                            );
                          })()}
                        </>
                      ) : (
                        <span style={{ fontSize: 11, color: t.textDim }}>—</span>
                      )}
                    </div>

                    {/* Remove button */}
                    <div style={{ width: 30, display: "flex", justifyContent: "flex-end", flexShrink: 0 }}>
                      <SmallBtn title="Remove" onClick={() => removeStagedFile(sf.id)}><TrashIcon size={12} /></SmallBtn>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Upload button */}
            {allDone && readyCount > 0 && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16 }}>
                <div style={{ fontSize: 12, color: t.textMuted }}>
                  {assignedCount > 0 && <span>{assignedCount} to folder{assignedCount !== 1 ? "s" : ""}</span>}
                  {assignedCount > 0 && unsortedCount > 0 && <span> · </span>}
                  {unsortedCount > 0 && <span style={{ color: darkMode ? "#d29922" : "#b45309" }}>{unsortedCount} to Unsorted</span>}
                </div>
                <Btn primary onClick={uploadAllStaged} style={{ padding: "10px 28px", fontSize: 13.5 }}>
                  <UploadCloudIcon size={16} /> Upload {readyCount} File{readyCount !== 1 ? "s" : ""}
                </Btn>
              </div>
            )}
          </div>
        )}
      </div>
    );
  })();

  const adminPage = <div style={{ display: "flex", flex: 1, minHeight: "calc(100vh - 55px)", animation: "fadeIn 0.3s ease" }}>
    <div style={{ width: 260, minWidth: 260, borderRight: `1px solid ${t.border}`, background: darkMode ? "rgba(15,17,20,0.5)" : "rgba(246,244,240,0.6)", padding: "20px 10px", display: "flex", flexDirection: "column" }}>
      <button onClick={() => setPage("folders")} style={{ background: "transparent", border: "none", cursor: "pointer", color: t.accent, fontSize: 12, fontWeight: 500, display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", fontFamily: "inherit", marginBottom: 16, borderRadius: 6 }}><ArrowLeftIcon /> Back to Documents</button>
      <div style={{ padding: "0 10px 12px", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: t.textDim }}>Administration</div>
      {ADMIN_MENU.map(item => <div key={item.id} onClick={() => setAdminSection(item.id)} className="admin-menu-item" style={{ padding: "9px 12px", borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", gap: 10, background: adminSection === item.id ? t.accentSoft : "transparent", color: adminSection === item.id ? t.accent : t.text, fontWeight: adminSection === item.id ? 600 : 500, fontSize: 13, borderLeft: adminSection === item.id ? `2px solid ${t.accent}` : "2px solid transparent", marginBottom: 2 }}><span style={{ color: adminSection === item.id ? t.accent : t.textDim, display: "flex" }}>{item.icon}</span> {item.label}</div>)}
    </div>
    <div style={{ flex: 1, padding: "32px 36px", overflowY: "auto" }}><div style={{ maxWidth: 860 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}><div><h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 10 }}><span style={{ color: t.accent }}>{adminActiveMenu?.icon}</span> {adminActiveMenu?.label}</h1><p style={{ fontSize: 13, color: t.textMuted, margin: "4px 0 0" }}>{adminActiveMenu?.desc}</p></div>{(adminSection === "users") && <Btn primary style={{ fontSize: 12 }}><PlusIcon size={13} /> Add User</Btn>}{(adminSection === "groups") && !addingGroup && <Btn primary onClick={() => { setAddingGroup(true); setNewGroupName(""); setNewGroupDesc(""); }} style={{ fontSize: 12 }}><PlusIcon size={13} /> Add Group</Btn>}{adminSection === "locations" && !addingLocation && <Btn primary onClick={() => { setAddingLocation(true); setNewLocationName(""); }} style={{ fontSize: 12 }}><PlusIcon size={13} /> Add Location</Btn>}</div>

      {adminSection === "users" && <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>{demoUsers.map((u, i) => <div key={i} className="folder-row" style={{ display: "flex", alignItems: "center", background: t.surface, border: `1px solid ${t.border}`, borderRadius: 10, padding: "12px 16px", animation: `fadeIn 0.25s ease ${i * 0.04}s both` }}><div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10 }}><div style={{ width: 32, height: 32, borderRadius: "50%", background: t.accentSoft, color: t.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>{u.name.charAt(0)}</div><div><div style={{ fontSize: 13, fontWeight: 600 }}>{u.name}</div><div style={{ fontSize: 11, color: t.textDim }}>{u.email}</div></div></div><div style={{ width: 180, display: "flex", gap: 4, flexWrap: "wrap" }}>{u.groups.map(g => <span key={g} style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 10, background: g === "Administrator" ? t.accentSoft : darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)", color: g === "Administrator" ? t.accent : t.textMuted }}>{g}</span>)}</div><div style={{ width: 80, textAlign: "center" }}><span style={{ fontSize: 10.5, fontWeight: 600, padding: "2px 8px", borderRadius: 10, background: u.status === "Active" ? t.successSoft : t.errorSoft, color: u.status === "Active" ? t.success : t.error }}>{u.status}</span></div><div style={{ width: 90, display: "flex", justifyContent: "flex-end", gap: 2 }}><SmallBtn title="Set Password" onClick={() => { setAdminSetPasswordUserId(u.id); setAdminSetPasswordForm({ new: "", confirm: "" }); setAdminSetPasswordError(""); setAdminSetPasswordSuccess(""); }}><ShieldIcon size={12} /></SmallBtn><SmallBtn title="Edit"><EditIcon /></SmallBtn><SmallBtn title="Remove"><TrashIcon size={12} /></SmallBtn></div></div>)}</div>}

      {adminSection === "groups" && (() => {
        const editingGroup = editingGroupId ? securityGroups.find(g => g.id === editingGroupId) : null;
        const togglePerm = (groupId, perm) => {
          setSecurityGroups(p => {
            const updated = p.map(g => g.id === groupId ? { ...g, permissions: { ...g.permissions, [perm]: !g.permissions[perm] } } : g);
            const group = updated.find(g => g.id === groupId);
            if (group) api.updateGroupPermissions(groupId, group.permissions).catch(console.error);
            return updated;
          });
        };
        const toggleAllInCategory = (groupId, category, value) => {
          const permsInCat = Object.entries(PERMISSION_LABELS).filter(([, v]) => v.category === category).map(([k]) => k);
          setSecurityGroups(p => {
            const updated = p.map(g => g.id === groupId ? { ...g, permissions: { ...g.permissions, ...Object.fromEntries(permsInCat.map(pk => [pk, value])) } } : g);
            const group = updated.find(g => g.id === groupId);
            if (group) api.updateGroupPermissions(groupId, group.permissions).catch(console.error);
            return updated;
          });
        };
        const saveGroupName = async (groupId, name, desc) => {
          const n = name.trim(), d = desc.trim();
          if (n) {
            try {
              await api.updateGroup(groupId, n, d || undefined);
              setSecurityGroups(p => p.map(g => g.id === groupId ? { ...g, name: n, desc: d || g.desc } : g));
            } catch (err) { console.error(err); }
          }
        };
        const deleteGroup = (group) => {
          setWarningModal({ title: `Delete "${group.name}"?`, message: `This will permanently remove the "${group.name}" security group. Users assigned to this group will lose these permissions.`, onConfirm: async () => {
            try { await api.deleteGroup(group.id); } catch (err) { console.error(err); }
            setSecurityGroups(p => p.filter(g => g.id !== group.id));
            if (editingGroupId === group.id) setEditingGroupId(null);
          }});
        };
        const addNewGroup = async () => {
          const n = newGroupName.trim();
          if (!n) return;
          try {
            const defaultPerms = { viewFiles: true, uploadFiles: false, deleteFiles: false, renameFiles: false, createFolders: false, deleteFolders: false, manageLocations: false, manageDepartments: false, manageUsers: false, manageGroups: false, viewAuditLog: false, exportAuditLog: false, manageSettings: false };
            const created = await api.createGroup(n, newGroupDesc.trim() || "Custom security group", defaultPerms);
            const newG = { id: created.id, name: created.name, desc: created.description, permissions: created.permissions || defaultPerms, memberCount: 0 };
            setSecurityGroups(p => [...p, newG]);
            setEditingGroupId(newG.id);
          } catch (err) { console.error(err); }
          setAddingGroup(false);
          setNewGroupName("");
          setNewGroupDesc("");
        };

        const PermToggle = ({ checked, onChange, label, desc }) => (
          <div onClick={onChange} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 8, cursor: "pointer", background: checked ? t.accentSoft : "transparent", border: `1px solid ${checked ? t.accent + "40" : t.border}`, transition: "all 0.2s" }}>
            <div style={{ width: 36, height: 20, borderRadius: 10, background: checked ? t.accent : (darkMode ? "#2a2e35" : "#d4d0c8"), position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
              <div style={{ width: 16, height: 16, borderRadius: "50%", background: "#fff", position: "absolute", top: 2, left: checked ? 18 : 2, transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: checked ? t.text : t.textMuted }}>{label}</div>
              {desc && <div style={{ fontSize: 10.5, color: t.textDim, marginTop: 1 }}>{desc}</div>}
            </div>
          </div>
        );

        return (
          <div style={{ animation: "fadeIn 0.25s ease" }}>
            {/* Add new group inline */}
            {addingGroup && (
              <div style={{ background: t.surface, border: `1px solid ${t.accent}`, borderRadius: 12, padding: "18px 20px", marginBottom: 16, boxShadow: `0 0 0 3px ${t.accentSoft}`, animation: "fadeIn 0.2s ease" }}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}><ShieldIcon size={16} /> New Security Group</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: t.textMuted, display: "block", marginBottom: 4 }}>Group Name</label>
                    <input value={newGroupName} onChange={e => setNewGroupName(e.target.value)} onKeyDown={e => { if (e.key === "Enter") addNewGroup(); if (e.key === "Escape") { setAddingGroup(false); setNewGroupName(""); setNewGroupDesc(""); } }} placeholder="e.g. Supervisor, Auditor..." autoFocus style={{ width: "100%", padding: "9px 12px", fontSize: 13.5, fontFamily: "inherit", background: darkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)", border: `1px solid ${t.border}`, borderRadius: 8, color: t.text, outline: "none", boxSizing: "border-box", fontWeight: 500 }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: t.textMuted, display: "block", marginBottom: 4 }}>Description</label>
                    <input value={newGroupDesc} onChange={e => setNewGroupDesc(e.target.value)} onKeyDown={e => { if (e.key === "Enter") addNewGroup(); if (e.key === "Escape") { setAddingGroup(false); setNewGroupName(""); setNewGroupDesc(""); } }} placeholder="Brief description of this role..." style={{ width: "100%", padding: "9px 12px", fontSize: 13, fontFamily: "inherit", background: darkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)", border: `1px solid ${t.border}`, borderRadius: 8, color: t.text, outline: "none", boxSizing: "border-box" }} />
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                  <button onClick={() => { setAddingGroup(false); setNewGroupName(""); setNewGroupDesc(""); }} style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 8, padding: "7px 14px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", color: t.text, fontFamily: "inherit" }}>Cancel</button>
                  <Btn primary onClick={addNewGroup} style={{ padding: "7px 16px", fontSize: 12.5, opacity: newGroupName.trim() ? 1 : 0.4 }}>Create Group</Btn>
                </div>
              </div>
            )}

            {/* Group list + detail split */}
            <div style={{ display: "flex", gap: 16 }}>
              {/* Group list */}
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
                        <SmallBtn title="Edit Permissions" onClick={e => { e.stopPropagation(); setEditingGroupId(g.id); }}><EditIcon /></SmallBtn>
                        <SmallBtn title="Remove" onClick={e => { e.stopPropagation(); deleteGroup(g); }}><TrashIcon size={12} /></SmallBtn>
                      </div>}
                    </div>
                  );
                })}
              </div>

              {/* Permission detail panel */}
              {editingGroup && (
                <div style={{ flex: 1, background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, overflow: "hidden", animation: "fadeIn 0.25s ease" }}>
                  {/* Header */}
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

                  {/* Permission summary bar */}
                  <div style={{ padding: "12px 20px", borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: t.text }}>Permissions</span>
                      <span style={{ fontSize: 10.5, fontWeight: 600, padding: "2px 8px", borderRadius: 8, background: t.successSoft, color: t.success }}>{Object.values(editingGroup.permissions).filter(Boolean).length} of {Object.keys(PERMISSION_LABELS).length} enabled</span>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => { const allTrue = Object.fromEntries(Object.keys(editingGroup.permissions).map(k => [k, true])); setSecurityGroups(p => p.map(g => g.id === editingGroupId ? { ...g, permissions: allTrue } : g)); api.updateGroupPermissions(editingGroupId, allTrue).catch(console.error); }} style={{ background: "transparent", border: "none", cursor: "pointer", color: t.accent, fontSize: 11, fontWeight: 600, fontFamily: "inherit", padding: "4px 6px" }}>Enable All</button>
                      <span style={{ color: t.textDim }}>·</span>
                      <button onClick={() => { const allFalse = Object.fromEntries(Object.keys(editingGroup.permissions).map(k => [k, false])); setSecurityGroups(p => p.map(g => g.id === editingGroupId ? { ...g, permissions: allFalse } : g)); api.updateGroupPermissions(editingGroupId, allFalse).catch(console.error); }} style={{ background: "transparent", border: "none", cursor: "pointer", color: t.error, fontSize: 11, fontWeight: 600, fontFamily: "inherit", padding: "4px 6px" }}>Disable All</button>
                    </div>
                  </div>

                  {/* Permission categories */}
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
                            <button onClick={() => toggleAllInCategory(editingGroupId, cat, !allEnabled)} style={{ background: "transparent", border: "none", cursor: "pointer", color: t.accent, fontSize: 10, fontWeight: 600, fontFamily: "inherit", padding: "2px 4px" }}>
                              {allEnabled ? "Disable All" : "Enable All"}
                            </button>
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            {permsInCat.map(([key, meta]) => (
                              <PermToggle key={key} checked={editingGroup.permissions[key]} onChange={() => togglePerm(editingGroupId, key)} label={meta.label} desc={meta.desc} />
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
        );
      })()}

      {adminSection === "locations" && <div>{addingLocation && <div style={{ background: t.surface, border: `1px solid ${t.accent}`, borderRadius: 10, padding: "14px 16px", marginBottom: 12, display: "flex", alignItems: "center", gap: 12, boxShadow: `0 0 0 3px ${t.accentSoft}` }}><span style={{ color: t.accent }}><MapPinIcon size={18} /></span><input ref={addLocRef} value={newLocationName} onChange={e => setNewLocationName(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { const n = newLocationName.trim(); if (n) { api.createLocation(n).then(created => { setLocations(p => [...p, { id: created.id, name: created.name }]); setNewLocationName(""); setAddingLocation(false); }).catch(console.error); } } if (e.key === "Escape") { setAddingLocation(false); setNewLocationName(""); } }} placeholder="Location name..." style={{ flex: 1, background: "transparent", border: "none", fontSize: 14, color: t.text, outline: "none", fontFamily: "inherit", fontWeight: 500 }} /><Btn primary onClick={() => { const n = newLocationName.trim(); if (n) { api.createLocation(n).then(created => { setLocations(p => [...p, { id: created.id, name: created.name }]); setNewLocationName(""); setAddingLocation(false); }).catch(console.error); } }} style={{ padding: "6px 14px", fontSize: 12 }}>Add</Btn><button onClick={() => { setAddingLocation(false); setNewLocationName(""); }} style={{ background: "transparent", border: "none", cursor: "pointer", color: t.textDim, display: "flex", padding: 4 }}><XIcon size={16} /></button></div>}<div style={{ display: "flex", flexDirection: "column", gap: 4 }}>{locations.map((loc, idx) => { const lf = foldersInLocation(loc.id), lFiles = lf.reduce((s, f) => s + filesInFolder(f.id).length, 0), isEd = editingLocationId === loc.id; return <div key={loc.id} className="folder-row" style={{ display: "flex", alignItems: "center", background: t.surface, border: `1px solid ${isEd ? t.accent : t.border}`, borderRadius: 10, padding: "12px 16px", boxShadow: isEd ? `0 0 0 3px ${t.accentSoft}` : "none", animation: `fadeIn 0.25s ease ${idx * 0.04}s both` }}><div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10 }}><div style={{ width: 34, height: 34, borderRadius: 8, background: t.accentSoft, color: t.accent, display: "flex", alignItems: "center", justifyContent: "center" }}><MapPinIcon size={16} /></div>{isEd ? <input ref={editLocRef} value={editingLocationName} onChange={e => setEditingLocationName(e.target.value)} onBlur={() => { const n = editingLocationName.trim(); if (n && n !== loc.name) { api.updateLocation(loc.id, n).then(() => setLocations(p => p.map(l => l.id === loc.id ? { ...l, name: n } : l))).catch(console.error); } setEditingLocationId(null); }} onKeyDown={e => { if (e.key === "Enter") { const n = editingLocationName.trim(); if (n && n !== loc.name) { api.updateLocation(loc.id, n).then(() => setLocations(p => p.map(l => l.id === loc.id ? { ...l, name: n } : l))).catch(console.error); } setEditingLocationId(null); } if (e.key === "Escape") setEditingLocationId(null); }} style={{ flex: 1, background: darkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)", border: `1px solid ${t.accent}`, borderRadius: 6, padding: "5px 10px", fontSize: 13.5, fontWeight: 600, color: t.text, outline: "none", fontFamily: "inherit" }} /> : <div style={{ fontSize: 13.5, fontWeight: 600 }}>{loc.name}</div>}</div><div style={{ width: 100, textAlign: "center" }}><span style={{ fontSize: 11, fontWeight: 600, color: lf.length > 0 ? t.accent : t.textDim, background: lf.length > 0 ? t.accentSoft : "transparent", padding: "2px 9px", borderRadius: 12 }}>{lf.length}</span></div><div style={{ width: 80, textAlign: "center", fontSize: 11, color: t.textDim }}>{lFiles} files</div>{!isEd && <div style={{ width: 70, display: "flex", justifyContent: "flex-end", gap: 2 }}><SmallBtn title="Edit" onClick={() => { setEditingLocationId(loc.id); setEditingLocationName(loc.name); }}><EditIcon /></SmallBtn><SmallBtn title="Remove" onClick={() => handleDeleteLocation(loc)}><TrashIcon size={12} /></SmallBtn></div>}</div>; })}</div></div>}

      {adminSection === "departments" && <div>{locations.map((loc, li) => { const ld = deptsInLocation(loc.id), isAddHere = addingDept && addingDeptLocId === loc.id; return <div key={loc.id} style={{ marginBottom: 28, animation: `fadeIn 0.25s ease ${li * 0.05}s both` }}><div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, padding: "0 4px" }}><div style={{ display: "flex", alignItems: "center", gap: 8 }}><MapPinIcon size={16} /><span style={{ fontSize: 14, fontWeight: 700 }}>{loc.name}</span><span style={{ fontSize: 10.5, color: t.textDim }}>{ld.length} dept{ld.length !== 1 ? "s" : ""}</span></div>{!isAddHere && <button onClick={() => { setAddingDept(true); setAddingDeptLocId(loc.id); setNewDeptName(""); }} style={{ background: "transparent", border: `1px dashed ${t.border}`, borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 11, fontWeight: 500, color: t.textMuted, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5 }}><PlusIcon size={11} /> Add</button>}</div>{isAddHere && <div style={{ background: t.surface, border: `1px solid ${t.accent}`, borderRadius: 10, padding: "12px 14px", marginBottom: 8, display: "flex", alignItems: "center", gap: 10, boxShadow: `0 0 0 3px ${t.accentSoft}` }}><span style={{ color: t.accent }}><LayersIcon size={16} /></span><input ref={addDeptRef} value={newDeptName} onChange={e => setNewDeptName(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { const n = newDeptName.trim(); if (n) { api.createDepartment(n, loc.id).then(created => { setDepartments(p => [...p, { id: created.id, name: created.name, locationId: created.location_id || loc.id }]); setNewDeptName(""); setAddingDept(false); setAddingDeptLocId(null); }).catch(console.error); } } if (e.key === "Escape") { setAddingDept(false); setAddingDeptLocId(null); } }} placeholder="Department name..." style={{ flex: 1, background: "transparent", border: "none", fontSize: 13, color: t.text, outline: "none", fontFamily: "inherit", fontWeight: 500 }} /><Btn primary onClick={() => { const n = newDeptName.trim(); if (n) { api.createDepartment(n, loc.id).then(created => { setDepartments(p => [...p, { id: created.id, name: created.name, locationId: created.location_id || loc.id }]); setNewDeptName(""); setAddingDept(false); setAddingDeptLocId(null); }).catch(console.error); } }} style={{ padding: "5px 12px", fontSize: 11.5 }}>Add</Btn><button onClick={() => { setAddingDept(false); setAddingDeptLocId(null); }} style={{ background: "transparent", border: "none", cursor: "pointer", color: t.textDim, display: "flex", padding: 3 }}><XIcon size={14} /></button></div>}{ld.length > 0 ? <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>{ld.map((dept, di) => { const df = foldersInDepartment(dept.id), dFiles = df.reduce((s, f) => s + filesInFolder(f.id).length, 0), isEd = editingDeptId === dept.id; return <div key={dept.id} className="folder-row" style={{ display: "flex", alignItems: "center", background: t.surface, border: `1px solid ${isEd ? t.accent : t.border}`, borderRadius: 9, padding: "10px 14px", boxShadow: isEd ? `0 0 0 3px ${t.accentSoft}` : "none", animation: `fadeIn 0.2s ease ${di * 0.03}s both` }}><div style={{ flex: 1, display: "flex", alignItems: "center", gap: 9 }}><div style={{ width: 30, height: 30, borderRadius: 7, background: t.accentSoft, color: t.accent, display: "flex", alignItems: "center", justifyContent: "center" }}><LayersIcon size={14} /></div>{isEd ? <input ref={editDeptRef} value={editingDeptName} onChange={e => setEditingDeptName(e.target.value)} onBlur={() => { const n = editingDeptName.trim(); if (n && n !== dept.name) { api.updateDepartment(dept.id, n).then(() => setDepartments(p => p.map(d => d.id === dept.id ? { ...d, name: n } : d))).catch(console.error); } setEditingDeptId(null); }} onKeyDown={e => { if (e.key === "Enter") { const n = editingDeptName.trim(); if (n && n !== dept.name) { api.updateDepartment(dept.id, n).then(() => setDepartments(p => p.map(d => d.id === dept.id ? { ...d, name: n } : d))).catch(console.error); } setEditingDeptId(null); } if (e.key === "Escape") setEditingDeptId(null); }} style={{ flex: 1, background: darkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)", border: `1px solid ${t.accent}`, borderRadius: 6, padding: "4px 9px", fontSize: 13, fontWeight: 600, color: t.text, outline: "none", fontFamily: "inherit" }} /> : <div style={{ fontSize: 13, fontWeight: 600 }}>{dept.name}</div>}</div><span style={{ fontSize: 10.5, color: t.textDim, width: 70, textAlign: "center" }}>{df.length} folders</span><span style={{ fontSize: 10.5, color: t.textDim, width: 60, textAlign: "center" }}>{dFiles} files</span>{!isEd && <div style={{ width: 60, display: "flex", justifyContent: "flex-end", gap: 2 }}><SmallBtn title="Edit" onClick={() => { setEditingDeptId(dept.id); setEditingDeptName(dept.name); }}><EditIcon /></SmallBtn><SmallBtn title="Remove" onClick={() => handleDeleteDept(dept, loc.name)}><TrashIcon size={12} /></SmallBtn></div>}</div>; })}</div> : !isAddHere && <div style={{ padding: 20, textAlign: "center", color: t.textDim, fontSize: 12.5, background: t.surface, border: `1px dashed ${t.border}`, borderRadius: 9 }}>No departments for {loc.name}</div>}</div>; })}</div>}

      {adminSection === "audit" && (() => {
        const allActions = [...new Set(auditLog.map(e => e.action))];
        const allUsers = [...new Set(auditLog.map(e => e.user))];
        const filtered = auditLog; // Already filtered by API via useEffect
        const exportCSV = () => {
          const header = "Action,Detail,User,Date,Time";
          const rows = filtered.map(e => {
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
          a.href = url; a.download = `audit-log-${new Date().toISOString().split("T")[0]}.csv`; a.click();
          URL.revokeObjectURL(url);
        };
        const hasFilters = auditFilterUser || auditFilterAction || auditFilterDate;
        const selectStyle = { background: darkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)", border: `1px solid ${t.border}`, borderRadius: 7, padding: "7px 10px", fontSize: 12, color: t.text, outline: "none", fontFamily: "inherit", cursor: "pointer", minWidth: 130 };

        return (
          <div style={{ animation: "fadeIn 0.25s ease" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
              <select value={auditFilterAction} onChange={e => setAuditFilterAction(e.target.value)} style={selectStyle}>
                <option value="">All Actions</option>
                {allActions.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
              <select value={auditFilterUser} onChange={e => setAuditFilterUser(e.target.value)} style={selectStyle}>
                <option value="">All Users</option>
                {allUsers.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
              <input type="date" value={auditFilterDate} onChange={e => setAuditFilterDate(e.target.value)} style={{ ...selectStyle, minWidth: 150 }} />
              {hasFilters && (
                <button onClick={() => { setAuditFilterUser(""); setAuditFilterAction(""); setAuditFilterDate(""); }} style={{ background: "transparent", border: "none", cursor: "pointer", color: t.accent, fontSize: 12, fontWeight: 500, fontFamily: "inherit", padding: "7px 4px" }}>
                  Clear Filters
                </button>
              )}
              <div style={{ flex: 1 }} />
              <span style={{ fontSize: 11, color: t.textDim }}>{filtered.length} of {auditLog.length} entries</span>
              {filtered.length > 0 && (
                <Btn onClick={exportCSV} style={{ fontSize: 11.5, padding: "6px 12px" }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                  Export CSV
                </Btn>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 14px 8px", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: t.textDim }}>
              <div style={{ width: 130 }}>Action</div>
              <div style={{ flex: 1 }}>Detail</div>
              <div style={{ width: 100, textAlign: "right" }}>User</div>
              <div style={{ width: 150, textAlign: "right" }}>Date & Time</div>
            </div>
            {filtered.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {filtered.map((entry, idx) => {
                  const date = new Date(entry.timestamp);
                  const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
                  const dateStr = date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
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
                  };
                  const ac = actionColors[entry.action] || { bg: t.accentSoft, color: t.accent };
                  return (
                    <div key={entry.id} style={{ display: "flex", alignItems: "center", gap: 12, background: t.surface, border: `1px solid ${t.border}`, borderRadius: 9, padding: "10px 14px", animation: `fadeIn 0.15s ease ${Math.min(idx, 20) * 0.02}s both` }}>
                      <div style={{ width: 130, flexShrink: 0 }}>
                        <span style={{ fontSize: 10.5, fontWeight: 600, padding: "2px 8px", borderRadius: 8, background: ac.bg, color: ac.color, whiteSpace: "nowrap" }}>{entry.action}</span>
                      </div>
                      <div style={{ flex: 1, fontSize: 12.5, color: t.text, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={entry.detail}>{entry.detail}</div>
                      <div style={{ width: 100, fontSize: 11, color: t.textMuted, textAlign: "right", flexShrink: 0 }}>{entry.user}</div>
                      <div style={{ width: 150, fontSize: 10.5, color: t.textDim, textAlign: "right", flexShrink: 0 }}>{dateStr} {timeStr}</div>
                    </div>
                  );
                })}
              </div>
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
        );
      })()}

      {!["users", "groups", "locations", "departments", "audit"].includes(adminSection) && <div style={{ textAlign: "center", padding: "60px 0", color: t.textDim }}><span>{adminActiveMenu?.icon}</span><div style={{ fontSize: 15, fontWeight: 500, marginTop: 14 }}>{adminActiveMenu?.label}</div><div style={{ fontSize: 13 }}>Under development</div></div>}
    </div></div>
  </div>;

  return (
    <div style={{ minHeight: "100vh", background: t.pageBg, color: t.text, fontFamily: "'Geist','DM Sans',system-ui,sans-serif", transition: "background 0.35s" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" /><link href="https://cdn.jsdelivr.net/npm/geist@1.2.2/dist/fonts/geist-sans/style.min.css" rel="stylesheet" />
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}} @keyframes modalIn{from{opacity:0;transform:scale(.96) translateY(8px)}to{opacity:1;transform:scale(1) translateY(0)}} .file-card:hover{transform:translateY(-1px);box-shadow:${t.cardShadow}} .folder-row:hover{transform:translateY(-1px);box-shadow:${t.cardShadow};border-color:${darkMode?'#3a3f47':t.accent}!important} .icon-btn:hover{color:${t.text}!important;background:${t.accentSoft}} .folder-select-item:hover{background:${t.accentSoft}!important} .nav-tab:hover{background:${t.navActive}} .admin-menu-item:hover{background:${t.accentSoft}} ::-webkit-scrollbar{width:5px} ::-webkit-scrollbar-track{background:transparent} ::-webkit-scrollbar-thumb{background:${t.scrollThumb};border-radius:3px} input::placeholder{color:${t.textDim}}`}</style>

      <nav style={{ borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", height: 54, backdropFilter: "blur(12px)", background: darkMode ? "rgba(15,17,20,0.92)" : "rgba(240,237,232,0.88)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24, flexShrink: 0, position: "relative", zIndex: 2 }}>
          <div onClick={() => { setPage("dashboard"); setSelectedFile(null); }} style={{ display: "flex", alignItems: "center", gap: 9, cursor: "pointer" }}><div style={{ width: 28, height: 28, borderRadius: 7, background: `linear-gradient(135deg,${t.accent},${t.accentDark})`, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 9, fontWeight: 800, letterSpacing: "-0.02em" }}>DDA</div><span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.03em" }}>Dealer Document Archive</span></div>
          <div style={{ display: "flex", gap: 2, marginLeft: 8 }}>
            <button onClick={() => { setPage("dashboard"); setSelectedFile(null); }} className="nav-tab" style={{ background: page === "dashboard" ? t.navActive : "transparent", color: page === "dashboard" ? t.accent : t.textMuted, border: "none", borderRadius: 8, padding: "7px 14px", cursor: "pointer", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 7, fontFamily: "inherit", borderBottom: page === "dashboard" ? `2px solid ${t.accent}` : "2px solid transparent" }}><DashboardIcon size={15} /> Dashboard</button>
            <div style={{ position: "relative" }}>
              <button onClick={e => { e.stopPropagation(); setShowDeptDropdown(!showDeptDropdown); }} className="nav-tab" style={{ background: (page === "folders" || page === "folder-detail") ? t.navActive : "transparent", color: (page === "folders" || page === "folder-detail") ? t.accent : t.textMuted, border: "none", borderRadius: 8, padding: "7px 14px", cursor: "pointer", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 7, fontFamily: "inherit", borderBottom: (page === "folders" || page === "folder-detail") ? `2px solid ${t.accent}` : "2px solid transparent" }}><FolderClosedIcon size={15} /> Folders <ChevronDown /></button>
              {showDeptDropdown && <div onClick={e => e.stopPropagation()} style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 200, background: t.surface, border: `1px solid ${t.border}`, borderRadius: 10, boxShadow: darkMode ? "0 8px 30px rgba(0,0,0,0.4)" : "0 8px 30px rgba(0,0,0,0.12)", padding: 4, minWidth: 260, maxHeight: 420, overflowY: "auto", animation: "fadeIn 0.15s ease" }}>{locations.map(loc => { const le = expandedLocations[loc.id]; return <div key={loc.id}><div onClick={() => setExpandedLocations(p => ({ ...p, [loc.id]: !p[loc.id] }))} className="folder-select-item" style={{ padding: "8px 10px", borderRadius: 7, cursor: "pointer", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 8, color: activeLocation === loc.id ? t.accent : t.text }}><ChevronIcon open={le} /><MapPinIcon size={14} /><span style={{ flex: 1 }}>{loc.name}</span><span style={{ fontSize: 9.5, color: t.textDim }}>{foldersInLocation(loc.id).length} folders</span></div>{le && <div style={{ paddingLeft: 12, marginBottom: 4 }}>{deptsInLocation(loc.id).map(dept => { const df = foldersInDepartment(dept.id), isAct = activeLocation === loc.id && activeDepartment === dept.id && (page === "folders" || page === "folder-detail"); return <div key={dept.id} onClick={() => { setActiveLocation(loc.id); setActiveDepartment(dept.id); setPage("folders"); setActiveFolderId(null); setSelectedFile(null); setFolderSearch(""); setShowDeptDropdown(false); }} className="folder-select-item" style={{ padding: "7px 12px", borderRadius: 6, cursor: "pointer", fontSize: 12.5, display: "flex", alignItems: "center", gap: 9, background: isAct ? t.accentSoft : "transparent", color: isAct ? t.accent : t.textMuted, fontWeight: 500 }}><FolderClosedIcon size={14} /><span style={{ flex: 1 }}>{dept.name}</span><span style={{ fontSize: 9.5, color: t.textDim }}>{df.length} · {df.reduce((s, f) => s + filesInFolder(f.id).length, 0)} files</span></div>; })}</div>}</div>; })}</div>}
            </div>
            <button onClick={() => setPage("unsorted")} className="nav-tab" style={{ background: page === "unsorted" ? t.navActive : "transparent", color: page === "unsorted" ? t.accent : t.textMuted, border: "none", borderRadius: 8, padding: "7px 14px", cursor: "pointer", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 7, fontFamily: "inherit", borderBottom: page === "unsorted" ? `2px solid ${t.accent}` : "2px solid transparent", position: "relative" }}><InboxIcon size={15} /> Unsorted{unsortedFiles.length > 0 && <span style={{ fontSize: 10, fontWeight: 700, background: darkMode ? "rgba(210,153,34,0.15)" : "rgba(180,83,9,0.1)", color: darkMode ? "#d29922" : "#b45309", borderRadius: 10, padding: "1px 6px" }}>{unsortedFiles.length}</span>}</button>
            <button onClick={() => setPage("upload")} className="nav-tab" style={{ background: page === "upload" ? t.navActive : "transparent", color: page === "upload" ? t.accent : t.textMuted, border: "none", borderRadius: 8, padding: "7px 14px", cursor: "pointer", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 7, fontFamily: "inherit", borderBottom: page === "upload" ? `2px solid ${t.accent}` : "2px solid transparent" }}><UploadCloudIcon size={15} /> Upload{stagedFiles.length > 0 && <span style={{ fontSize: 10, fontWeight: 700, background: t.accent, color: "#fff", borderRadius: 10, padding: "1px 6px" }}>{stagedFiles.length}</span>}</button>
          </div>
        </div>

        {/* ── Global Search Bar (centered) ──────────────────── */}
        {isLoggedIn && (() => {
          const q = globalSearch.trim();
          const folderResults = q ? folders.map(f => ({ ...f, ...fuzzyMatch(q, f.name), _type: "folder" })).filter(r => r.match).sort((a, b) => b.score - a.score).slice(0, 8) : [];
          const fileResults = q ? files.concat(unsortedFiles).map(f => ({ ...f, ...fuzzyMatch(q, f.name), _type: "file" })).filter(r => r.match).sort((a, b) => b.score - a.score).slice(0, 10) : [];
          const hasResults = folderResults.length > 0 || fileResults.length > 0;
          const showDropdown = globalSearchFocused && q.length > 0;
          return (
            <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 520, zIndex: 1, pointerEvents: "none" }}>
              <div style={{ pointerEvents: "auto", position: "relative" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, background: darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)", border: `1px solid ${showDropdown && hasResults ? t.accent : t.border}`, borderRadius: 9, padding: "6px 12px", transition: "border-color 0.2s" }}>
                <SearchIcon size={15} />
                <input
                  ref={globalSearchRef}
                  value={globalSearch}
                  onChange={e => setGlobalSearch(e.target.value)}
                  onFocus={() => setGlobalSearchFocused(true)}
                  onBlur={() => setTimeout(() => setGlobalSearchFocused(false), 200)}
                  onKeyDown={e => { if (e.key === "Escape") { setGlobalSearch(""); globalSearchRef.current?.blur(); } }}
                  placeholder="Search folders & files..."
                  style={{ flex: 1, background: "transparent", border: "none", fontSize: 13, color: t.text, outline: "none", fontFamily: "inherit" }}
                />
                {q && <button onClick={() => setGlobalSearch("")} style={{ background: "transparent", border: "none", cursor: "pointer", color: t.textDim, display: "flex", padding: 2 }}><XIcon size={13} /></button>}
              </div>
              {showDropdown && (
                <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 300, background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, boxShadow: darkMode ? "0 12px 40px rgba(0,0,0,0.5)" : "0 12px 40px rgba(0,0,0,0.15)", overflow: "hidden", animation: "fadeIn 0.15s ease", maxHeight: 420, overflowY: "auto" }}>
                  {!hasResults && (
                    <div style={{ padding: "20px 16px", textAlign: "center", color: t.textDim, fontSize: 12.5 }}>No results for "{q}"</div>
                  )}
                  {folderResults.length > 0 && (
                    <div>
                      <div style={{ padding: "10px 14px 4px", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: t.textDim }}>Folders</div>
                      {folderResults.map(folder => {
                        const loc = locations.find(l => l.id === folder.locationId);
                        const dept = departments.find(d => d.id === folder.departmentId);
                        return (
                          <div key={folder.id} onMouseDown={e => e.preventDefault()} onClick={() => {
                            if (folder.locationId) setActiveLocation(folder.locationId);
                            if (folder.departmentId) setActiveDepartment(folder.departmentId);
                            setActiveFolderId(folder.id);
                            setPage("folder-detail");
                            setGlobalSearch("");
                            setGlobalSearchFocused(false);
                          }} className="folder-select-item" style={{ padding: "8px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
                            <div style={{ color: t.accent, flexShrink: 0 }}><FolderClosedIcon size={16} /></div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 600 }}><HighlightedName name={folder.name} query={q} accentColor={t.accent} /></div>
                              <div style={{ fontSize: 10.5, color: t.textDim }}>{loc?.name || ""}{dept ? ` / ${dept.name}` : ""}</div>
                            </div>
                            <span style={{ fontSize: 10, color: t.textDim, flexShrink: 0 }}>{Number(folder.fileCount || 0)} files</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {folderResults.length > 0 && fileResults.length > 0 && (
                    <div style={{ borderTop: `1px solid ${t.border}` }} />
                  )}
                  {fileResults.length > 0 && (
                    <div>
                      <div style={{ padding: "10px 14px 4px", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: t.textDim }}>Files</div>
                      {fileResults.map(file => {
                        const folder = file.folderId ? folders.find(f => f.id === file.folderId) : null;
                        const loc = folder ? locations.find(l => l.id === folder.locationId) : null;
                        const dept = folder ? departments.find(d => d.id === folder.departmentId) : null;
                        return (
                          <div key={file.id} onMouseDown={e => e.preventDefault()} onClick={() => {
                            if (file.folderId) {
                              if (folder?.locationId) setActiveLocation(folder.locationId);
                              if (folder?.departmentId) setActiveDepartment(folder.departmentId);
                              setActiveFolderId(file.folderId);
                            }
                            setViewingFileId(file.id);
                            setPage("file-detail");
                            setGlobalSearch("");
                            setGlobalSearchFocused(false);
                          }} className="folder-select-item" style={{ padding: "8px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
                            <div style={{ color: t.success, flexShrink: 0 }}><FileDocIcon size={16} /></div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 600 }}><HighlightedName name={file.name} query={q} accentColor={t.accent} /></div>
                              <div style={{ fontSize: 10.5, color: t.textDim }}>{file.folderId ? `${loc?.name || ""}${dept ? ` / ${dept.name}` : ""}${folder ? ` / ${folder.name}` : ""}` : "Unsorted"}</div>
                            </div>
                            <span style={{ fontSize: 10, color: t.textDim, flexShrink: 0 }}>{fmtSize(file.size)}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
            </div>
          );
        })()}

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0, position: "relative", zIndex: 2 }}>
          {loggedInUser && <div style={{ position: "relative" }}><div onClick={e => { e.stopPropagation(); setShowProfileMenu(!showProfileMenu); }} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "4px 8px", borderRadius: 8, background: showProfileMenu ? t.navActive : "transparent" }}><div style={{ width: 28, height: 28, borderRadius: "50%", background: t.accentSoft, color: t.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>{loggedInUser.name.charAt(0)}</div><span style={{ fontSize: 12, fontWeight: 500, color: t.textMuted }}>{loggedInUser.name}</span><ChevronDown /></div>{showProfileMenu && <div onClick={e => e.stopPropagation()} style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 200, background: t.surface, border: `1px solid ${t.border}`, borderRadius: 10, boxShadow: darkMode ? "0 8px 30px rgba(0,0,0,0.4)" : "0 8px 30px rgba(0,0,0,0.12)", padding: 4, minWidth: 200, animation: "fadeIn 0.15s ease" }}><div style={{ padding: "10px 12px 8px", borderBottom: `1px solid ${t.border}`, marginBottom: 4 }}><div style={{ fontSize: 13, fontWeight: 600 }}>{loggedInUser.name}</div><div style={{ fontSize: 10.5, color: t.textDim, marginTop: 2 }}>{loggedInUser.groups?.join(", ")}</div></div>{[{ l: "My Account", i: <UserIcon /> }, { l: "Change Password", i: <ShieldIcon /> }, { l: "Settings", i: <GearIcon /> }].map(item => <div key={item.l} onClick={() => { setShowProfileMenu(false); if (item.l === "Change Password") { setShowChangePassword(true); setChangePasswordForm({ current: "", new: "", confirm: "" }); setChangePasswordError(""); setChangePasswordSuccess(""); } }} className="folder-select-item" style={{ padding: "8px 12px", borderRadius: 7, cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", gap: 10, color: t.text, fontWeight: 500 }}><span style={{ color: t.textMuted }}>{item.i}</span> {item.l}</div>)}{loggedInUser.groups?.includes("Administrator") && <div onClick={() => { setShowProfileMenu(false); setPage("admin"); setAdminSection("users"); }} className="folder-select-item" style={{ padding: "8px 12px", borderRadius: 7, cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", gap: 10, color: t.text, fontWeight: 500 }}><span style={{ color: t.textMuted }}><WrenchIcon /></span> Administration</div>}<div style={{ borderTop: `1px solid ${t.border}`, marginTop: 4, paddingTop: 4 }}><div onClick={() => { setShowProfileMenu(false); handleLogout(); }} className="folder-select-item" style={{ padding: "8px 12px", borderRadius: 7, cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", gap: 10, color: t.error, fontWeight: 500 }}><LogOutIcon /> Sign Out</div></div></div>}</div>}
          <button onClick={() => setDarkMode(!darkMode)} style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 7, padding: 6, cursor: "pointer", color: t.textMuted, display: "flex", alignItems: "center" }}>{darkMode ? <SunIcon /> : <MoonIcon />}</button>
        </div>
      </nav>

      {page === "dashboard" && dashboardPage}
      {page === "folders" && foldersPage}
      {page === "folder-detail" && folderDetail}
      {page === "file-detail" && fileDetailPage}
      {page === "unsorted" && unsortedPage}
      {page === "upload" && uploadPage}
      {page === "admin" && adminPage}
      {renameModalEl}
      {warnModalEl}
      {changePasswordModalEl}
      {adminSetPasswordModalEl}
    </div>
  );
}

export default function App() {
  return <ErrorBoundary><AppInner /></ErrorBoundary>;
}
