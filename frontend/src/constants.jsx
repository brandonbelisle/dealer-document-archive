import {
  UsersIcon,
  ShieldIcon,
  MapPinIcon,
  LayersIcon,
  ClipboardIcon,
  GearIcon,
  LockIcon,
  AppsIcon,
  TicketIcon,
  WrenchIcon,
  UploadCloudIcon,
} from "./components/Icons";

export const DEFAULT_LOCATIONS = [];
export const DEFAULT_DEPARTMENTS = [];

export const ADMIN_MENU = [
  {
    id: "users",
    label: "Users",
    icon: <UsersIcon size={17} />,
    desc: "Manage user accounts and access",
  },
  {
    id: "groups",
    label: "Groups",
    icon: <ShieldIcon size={17} />,
    desc: "Manage security groups and permissions",
  },
  {
    id: "app-center",
    label: "App Center",
    icon: <AppsIcon size={17} />,
    desc: "Manage custom apps on the landing page",
  },
  {
    id: "dda",
    label: "DDA - Dealer Document Archive",
    icon: null,
    desc: "Dealer Document Archive settings",
    isCategory: true,
  },
  {
    id: "locations",
    label: "Locations",
    icon: <MapPinIcon size={17} />,
    desc: "Manage dealer locations",
    category: "dda",
  },
  {
    id: "departments",
    label: "Departments",
    icon: <LayersIcon size={17} />,
    desc: "Manage departments per location",
    category: "dda",
  },
  {
    id: "audit",
    label: "Audit Log",
    icon: <ClipboardIcon size={17} />,
    desc: "View system activity",
  },
  {
    id: "authentication",
    label: "Authentication",
    icon: <LockIcon size={17} />,
    desc: "Configure SSO and SAML settings",
  },
  {
    id: "security",
    label: "Security",
    icon: <ShieldIcon size={17} />,
    desc: "Configure security settings like allowed iframe domains",
  },
  {
    id: "dms",
    label: "DMS Connection",
    icon: <WrenchIcon size={17} />,
    desc: "Connect to Microsoft SQL Server",
  },
  {
    id: "azure",
    label: "Azure Storage",
    icon: <UploadCloudIcon size={17} />,
    desc: "Configure Azure Blob Storage for file uploads",
  },
  {
    id: "cht",
    label: "CHT - Credit Hold Tracker",
    icon: null,
    desc: "Credit Hold Tracker settings",
    isCategory: true,
  },
  {
    id: "cht-statuses",
    label: "Statuses",
    icon: <LayersIcon size={17} />,
    desc: "Manage inquiry statuses",
    category: "cht",
  },
  {
    id: "settings",
    label: "Settings",
    icon: <GearIcon size={17} />,
    desc: "Application configuration",
  },
];

// App definitions for permission tabs
export const APP_PERMISSIONS = {
  dda: {
    id: "dda",
    name: "Dealer Document Archive",
    icon: "DDA",
    color: "#0891b2",
    permissions: [
      { key: "view_dda", label: "View App", desc: "Access Dealer Document Archive" },
      { key: "viewLocations", label: "View Locations", desc: "View locations and departments in navigation" },
      { key: "viewFiles", label: "View Files", desc: "Browse and preview uploaded documents" },
      { key: "uploadFiles", label: "Upload Files", desc: "Upload new PDF files to folders" },
      { key: "deleteFiles", label: "Delete Files", desc: "Remove uploaded files permanently" },
      { key: "renameFiles", label: "Rename Files", desc: "Rename uploaded file display names" },
      { key: "createFolders", label: "Create Folders", desc: "Create new folders and subfolders" },
      { key: "deleteFolders", label: "Delete Folders", desc: "Remove folders and their contents" },
    ],
  },
  cht: {
    id: "cht",
    name: "Credit Hold Tracker",
    icon: "CHT",
    color: "#f59e0b",
    permissions: [
      { key: "view_cht", label: "View App", desc: "Access Credit Hold Tracker" },
      { key: "cht_inquiry_submit", label: "Submit Inquiries", desc: "Submit credit hold inquiries" },
      { key: "cht_inquiry_view", label: "View Inquiries", desc: "View own credit hold inquiries" },
      { key: "cht_inquiry_view_all", label: "View All Inquiries", desc: "View all credit hold inquiries" },
      { key: "cht_inquiry_accept", label: "Accept Inquiries", desc: "Accept and assign credit hold inquiries to yourself" },
      { key: "cht_manage_statuses", label: "Manage Statuses", desc: "Add, edit, and remove inquiry statuses" },
    ],
  },
  help: {
    id: "help",
    name: "Help Desk",
    icon: "HELP",
    color: "#10b981",
    permissions: [
      { key: "view_help", label: "View App", desc: "Access Help Desk and submit tickets" },
    ],
  },
  admin: {
    id: "admin",
    name: "Administration",
    icon: "ADMIN",
    color: "#6b7280",
    permissions: [
      { key: "manageUsers", label: "Manage Users", desc: "Create, edit, and deactivate user accounts" },
      { key: "manageGroups", label: "Manage Groups", desc: "Edit security groups and permissions" },
      { key: "manageLocations", label: "Manage Locations", desc: "Add, edit, and remove dealer locations" },
      { key: "manageDepartments", label: "Manage Departments", desc: "Add, edit, and remove departments" },
      { key: "manageSettings", label: "Manage Settings", desc: "Modify application configuration" },
      { key: "viewAuditLog", label: "View Audit Log", desc: "View system activity and change history" },
      { key: "exportAuditLog", label: "Export Audit Log", desc: "Download audit log data as CSV" },
    ],
  },
};

export const APP_PERMISSION_TABS = ["dda", "cht", "admin"];

// Legacy permission labels (for backward compatibility)
export const PERMISSION_LABELS = {
  // DDA Locations
  viewLocations: {
    label: "View Locations",
    category: "Locations",
    app: "dda",
    desc: "View locations and departments in navigation",
  },
  // DDA Documents
  viewFiles: {
    label: "View Files",
    category: "Documents",
    app: "dda",
    desc: "Browse and preview uploaded documents",
  },
  uploadFiles: {
    label: "Upload Files",
    category: "Documents",
    app: "dda",
    desc: "Upload new PDF files to folders",
  },
  deleteFiles: {
    label: "Delete Files",
    category: "Documents",
    app: "dda",
    desc: "Remove uploaded files permanently",
  },
  renameFiles: {
    label: "Rename Files",
    category: "Documents",
    app: "dda",
    desc: "Rename uploaded file display names",
  },
  // DDA Folders
  createFolders: {
    label: "Create Folders",
    category: "Folders",
    app: "dda",
    desc: "Create new folders and subfolders",
  },
  deleteFolders: {
    label: "Delete Folders",
    category: "Folders",
    app: "dda",
    desc: "Remove folders and their contents",
  },
  // Admin
  manageLocations: {
    label: "Manage Locations",
    category: "Administration",
    app: "admin",
    desc: "Add, edit, and remove dealer locations",
  },
  manageDepartments: {
    label: "Manage Departments",
    category: "Administration",
    app: "admin",
    desc: "Add, edit, and remove departments",
  },
  manageUsers: {
    label: "Manage Users",
    category: "Administration",
    app: "admin",
    desc: "Create, edit, and deactivate user accounts",
  },
  manageGroups: {
    label: "Manage Groups",
    category: "Administration",
    app: "admin",
    desc: "Edit security groups and permissions",
  },
  viewAuditLog: {
    label: "View Audit Log",
    category: "Audit",
    app: "admin",
    desc: "View system activity and change history",
  },
  exportAuditLog: {
    label: "Export Audit Log",
    category: "Audit",
    app: "admin",
    desc: "Download audit log data as CSV",
  },
  manageSettings: {
    label: "Manage Settings",
    category: "Administration",
    app: "admin",
    desc: "Modify application configuration",
  },
};

export const PERMISSION_CATEGORIES = [
  "Locations",
  "Documents",
  "Folders",
  "Administration",
  "Audit",
];
