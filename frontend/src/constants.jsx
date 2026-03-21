import {
  UsersIcon,
  ShieldIcon,
  MapPinIcon,
  LayersIcon,
  ClipboardIcon,
  GearIcon,
  LockIcon,
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
    id: "settings",
    label: "Settings",
    icon: <GearIcon size={17} />,
    desc: "Application configuration",
  },
];

export const PERMISSION_LABELS = {
  viewFiles: {
    label: "View Files",
    category: "Documents",
    desc: "Browse and preview uploaded documents",
  },
  uploadFiles: {
    label: "Upload Files",
    category: "Documents",
    desc: "Upload new PDF files to folders",
  },
  deleteFiles: {
    label: "Delete Files",
    category: "Documents",
    desc: "Remove uploaded files permanently",
  },
  renameFiles: {
    label: "Rename Files",
    category: "Documents",
    desc: "Rename uploaded file display names",
  },
  createFolders: {
    label: "Create Folders",
    category: "Folders",
    desc: "Create new folders and subfolders",
  },
  deleteFolders: {
    label: "Delete Folders",
    category: "Folders",
    desc: "Remove folders and their contents",
  },
  manageLocations: {
    label: "Manage Locations",
    category: "Administration",
    desc: "Add, edit, and remove dealer locations",
  },
  manageDepartments: {
    label: "Manage Departments",
    category: "Administration",
    desc: "Add, edit, and remove departments",
  },
  manageUsers: {
    label: "Manage Users",
    category: "Administration",
    desc: "Create, edit, and deactivate user accounts",
  },
  manageGroups: {
    label: "Manage Groups",
    category: "Administration",
    desc: "Edit security groups and permissions",
  },
  viewAuditLog: {
    label: "View Audit Log",
    category: "Audit",
    desc: "View system activity and change history",
  },
  exportAuditLog: {
    label: "Export Audit Log",
    category: "Audit",
    desc: "Download audit log data as CSV",
  },
  manageSettings: {
    label: "Manage Settings",
    category: "Administration",
    desc: "Modify application configuration",
  },
};

export const PERMISSION_CATEGORIES = [
  "Documents",
  "Folders",
  "Administration",
  "Audit",
];
