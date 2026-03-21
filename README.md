# Dealer Document Archive (DDA)

A full-stack document management system built with React and Node.js for organizing, uploading, and previewing PDF files across multiple dealer locations and departments.

## Features

- **PDF Upload & Preview** — Drag-and-drop uploads with client-side text extraction (pdf.js) and embedded PDF preview via Azure Blob Storage URLs
- **Folder Hierarchy** — Locations → Departments → Folders → Subfolders (unlimited nesting via self-referencing `parent_id`)
- **Unsorted Files** — Files uploaded without a folder assignment land in an Unsorted inbox where they can later be moved to any folder
- **Auto-Suggest Folders** — Uploaded PDFs are scanned for Repair Order (RO) numbers; matching folders are suggested automatically
- **Fuzzy Search** — Typo-tolerant folder and file search with highlighted results across the global search bar
- **Full-Text Search** — Extracted PDF text stored in MySQL with a FULLTEXT index for fast content searching
- **Role-Based Permissions** — 13 granular permissions across 4 categories, assignable per security group
- **Group-Based Access Control** — Locations and departments can be locked to specific security groups; unrestricted by default
- **Administration Panel** — Manage users, groups, locations, departments, and view audit logs
- **Audit Trail** — Immutable activity log with filterable views (by action, user, date) and CSV export
- **Dark/Light Mode** — Professional dark theme with light mode toggle, persisted across sessions
- **JWT Authentication** — Secure token-based auth with session persistence via localStorage
- **Self-Service Password Change** — Users can change their own password; admins can reset any user's password
- **SSL/HTTPS Support** — Optional self-signed certificate generation with HTTP→HTTPS redirect

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 6, pdf.js 3.11 |
| Backend | Node.js 18+, Express 5 |
| Database | MySQL 8.0+ |
| Auth | JWT (jsonwebtoken), bcryptjs |
| File Storage | Azure Blob Storage (@azure/storage-blob) |
| File Uploads | Multer (memory storage, 50 MB limit, PDF-only filter) |
| IDs | UUIDs (uuid v11) |

## Project Structure

```
dealer-document-archive/
├── frontend/                   # React + Vite application
│   ├── src/
│   │   ├── App.jsx             # Main application component & state management
│   │   ├── api.js              # API client (all backend endpoints)
│   │   ├── main.jsx            # React entry point
│   │   ├── theme.js            # Dark and light theme definitions
│   │   ├── constants.jsx       # Admin menu, permission labels/categories
│   │   ├── utils/
│   │   │   └── helpers.js      # PDF extraction, fuzzy search, RO extraction, utilities
│   │   ├── components/
│   │   │   ├── ErrorBoundary.jsx
│   │   │   ├── GroupAccessEditor.jsx  # Inline group access dropdown (portal-based)
│   │   │   ├── HighlightedName.jsx    # Fuzzy match highlighting
│   │   │   ├── Icons.jsx              # SVG icon components
│   │   │   ├── LoginScreen.jsx
│   │   │   ├── Navbar.jsx             # Top nav with global search & dept dropdown
│   │   │   ├── PdfCanvasPreview.jsx   # Client-side PDF rendering to canvas
│   │   │   ├── modals/
│   │   │   │   ├── AdminSetPasswordModal.jsx
│   │   │   │   ├── ChangePasswordModal.jsx
│   │   │   │   ├── RenameModal.jsx
│   │   │   │   └── WarningModal.jsx
│   │   │   └── ui/
│   │   │       ├── Btn.jsx            # Styled button components
│   │   │       ├── FileCard.jsx       # File display card
│   │   │       └── PermToggle.jsx     # Permission toggle switch
│   │   └── pages/
│   │       ├── AdminPage.jsx          # Users, groups, locations, depts, audit
│   │       ├── DashboardPage.jsx      # Stats overview & recent uploads
│   │       ├── FileDetailPage.jsx     # File info + PDF preview split view
│   │       ├── FolderDetailPage.jsx   # Folder contents with drag-drop upload
│   │       ├── FoldersPage.jsx        # Folder listing with search
│   │       ├── UnsortedPage.jsx       # Unsorted file management
│   │       └── UploadPage.jsx         # Batch upload with folder assignment
│   ├── index.html
│   ├── vite.config.js          # Vite config with API proxy to :3001
│   └── package.json
├── backend/                    # Express API server
│   ├── server.js               # Entry point (HTTP/HTTPS, static frontend serving)
│   ├── stop.js                 # Graceful shutdown via PID file
│   ├── seed-admin.js           # Initial admin user creation
│   ├── config/
│   │   ├── db.js               # MySQL connection pool (mysql2/promise)
│   │   └── azure-storage.js    # Azure Blob Storage client (lazy init, SAS URL support)
│   ├── middleware/
│   │   ├── auth.js             # JWT signing, verification, permission middleware
│   │   └── audit.js            # Audit log helper
│   ├── routes/
│   │   ├── auth.js             # Login, register, profile, change password
│   │   ├── dashboard.js        # Dashboard statistics
│   │   ├── locations.js        # CRUD locations
│   │   ├── departments.js      # CRUD departments
│   │   ├── folders.js          # CRUD folders + subfolders + breadcrumbs
│   │   ├── files.js            # Upload, download, rename, delete, move, text update
│   │   ├── groups.js           # CRUD groups + permission management
│   │   ├── users.js            # User admin + status + password reset
│   │   ├── audit.js            # Audit log queries + filter options
│   │   └── access.js           # Location/department group access control
│   ├── ssl/                    # Generated SSL certificates (gitignored)
│   ├── .env.example            # Environment template
│   └── package.json
├── database/
│   ├── schema.sql              # Full MySQL schema, views, stored procedures, seed data
│   └── migration-group-access.sql  # Migration for location/department group access tables
├── generate-cert.sh            # Self-signed SSL certificate generator
├── start-production.js         # Builds frontend + starts backend
├── .gitignore
├── package.json                # Root scripts (dev, build, start, stop, seed)
└── README.md
```

## Quick Start

### Prerequisites

- **Node.js** 18+ (with npm)
- **MySQL** 8.0+
- **Azure Storage Account** (for file uploads — see Azure Setup below)

### 1. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/dealer-document-archive.git
cd dealer-document-archive
npm install
npm run install:all
```

### 2. Set up the database

```bash
# Create the database
mysql -u root -p -e "CREATE DATABASE dealer_document_archive"

# Import the schema (includes tables, views, seed data, stored procedures)
mysql -u root -p dealer_document_archive < database/schema.sql
```

> **Note:** If you encounter MySQL error 1419, run this first:
> ```sql
> SET GLOBAL log_bin_trust_function_creators = 1;
> ```

If you need location/department group-based access control (restricting locations or departments to specific security groups), also run:

```bash
mysql -u root -p dealer_document_archive < database/migration-group-access.sql
```

### 3. Configure the backend

```bash
cd backend
cp .env.example .env
```

Edit `.env` with your values:

```env
# Server
PORT=3001
HOST=0.0.0.0
NODE_ENV=development
SSL_ENABLED=false

# MySQL Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password_here
DB_NAME=dealer_document_archive

# JWT Authentication
JWT_SECRET=generate-a-long-random-string-here
JWT_EXPIRES_IN=24h

# File Uploads
MAX_FILE_SIZE_MB=50

# Azure Blob Storage
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=youraccount;AccountKey=yourkey;EndpointSuffix=core.windows.net
AZURE_STORAGE_CONTAINER_NAME=documents
```

### 4. Azure Blob Storage Setup

1. Create a **Storage Account** in the [Azure Portal](https://portal.azure.com)
2. Go to **Access Keys** and copy the connection string
3. Paste it into `AZURE_STORAGE_CONNECTION_STRING` in your `.env`
4. The container specified by `AZURE_STORAGE_CONTAINER_NAME` is created automatically on first startup
5. The container is set to blob-level public access so PDFs can be previewed directly in the browser

Alternatively, you can use account name + key instead of a connection string:

```env
AZURE_STORAGE_ACCOUNT_NAME=youraccount
AZURE_STORAGE_ACCOUNT_KEY=yourkey
```

### 5. Create the admin user

```bash
cd backend
node seed-admin.js
```

This creates:
- **Username:** `admin`
- **Password:** `admin`

> ⚠️ **Change this password after first login!**

### 6. Start the application

**Development** (from the project root):

```bash
# Run both frontend and backend concurrently
npm run dev
```

Or run them separately:

```bash
# Terminal 1 — Backend (port 3001)
npm run dev:backend

# Terminal 2 — Frontend (port 5173)
npm run dev:frontend
```

Open **http://localhost:5173** and log in with `admin` / `admin`.

**Production:**

```bash
npm start
```

This builds the frontend and starts the backend serving both the API and the static frontend build. The server will display the access URL and network addresses on startup.

**Stop the server:**

```bash
npm stop
```

### 7. SSL/HTTPS (Optional)

For HTTPS with a self-signed certificate:

```bash
# Generate certificates
bash generate-cert.sh

# Update backend/.env
SSL_ENABLED=true
SSL_KEY=./ssl/server.key
SSL_CERT=./ssl/server.crt
PORT=443
HTTP_REDIRECT=true    # Also start HTTP on port 80 redirecting to HTTPS
```

> Browsers will show a security warning for self-signed certificates. Click "Advanced" → "Proceed" to continue.

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login → JWT token |
| POST | `/api/auth/register` | Create account (assigned to "User" group by default) |
| GET | `/api/auth/me` | Current user profile with groups and permissions |
| PUT | `/api/auth/change-password` | Self-service password change (requires current password) |

### Dashboard

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/api/dashboard` | any auth | Stats: file/folder/location/department counts, per-location breakdown, recent uploads |

### Locations

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/api/locations` | any auth | List all locations |
| POST | `/api/locations` | manageLocations | Create location |
| PUT | `/api/locations/:id` | manageLocations | Rename location |
| DELETE | `/api/locations/:id` | manageLocations | Delete location (cascades to departments, folders, files) |

### Departments

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/api/departments` | any auth | List departments (optional `?locationId=` filter) |
| POST | `/api/departments` | manageDepartments | Create department under a location |
| PUT | `/api/departments/:id` | manageDepartments | Rename department |
| DELETE | `/api/departments/:id` | manageDepartments | Delete department (cascades) |

### Folders

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/api/folders` | any auth | List folders (`?departmentId=`, `?locationId=`, `?parentId=`) |
| GET | `/api/folders/:id` | any auth | Folder detail with breadcrumb trail |
| POST | `/api/folders` | createFolders | Create folder or subfolder |
| DELETE | `/api/folders/:id` | deleteFolders | Delete folder (cascades to subfolders and files) |

### Files

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/api/files` | any auth | List files (`?folderId=` or `?unsorted=true`) |
| GET | `/api/files/:id` | any auth | Single file metadata |
| GET | `/api/files/:id/download` | any auth | Stream file from Azure Blob Storage |
| POST | `/api/files/upload` | uploadFiles | Upload PDF (multipart; optional `folderId`, `extractedText`, `pageCount`) |
| PUT | `/api/files/:id/rename` | renameFiles | Rename file |
| PUT | `/api/files/:id/move` | uploadFiles | Move file to a different folder (or null for unsorted) |
| PUT | `/api/files/:id/text` | any auth | Update extracted text after client-side extraction |
| DELETE | `/api/files/:id` | deleteFiles | Delete file (also removes blob from Azure) |

### Security Groups & Permissions

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/api/groups` | any auth | List all groups with permissions and member counts |
| GET | `/api/groups/permissions` | any auth | List all available permission definitions |
| POST | `/api/groups` | manageGroups | Create security group with initial permissions |
| PUT | `/api/groups/:id` | manageGroups | Update group name/description |
| PUT | `/api/groups/:id/permissions` | manageGroups | Replace all permissions for a group |
| DELETE | `/api/groups/:id` | manageGroups | Delete security group |

### User Administration

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/api/users` | manageUsers | List all users with their groups |
| POST | `/api/users` | manageUsers | Create user with group assignments |
| PUT | `/api/users/:id/status` | manageUsers | Set user status (active / inactive / suspended) |
| PUT | `/api/users/:id/password` | manageUsers | Admin password reset (no current password required) |

### Audit Log

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/api/audit` | viewAuditLog | Query log (`?action=`, `?user=`, `?date=`, `?limit=`, `?offset=`) |
| GET | `/api/audit/filters` | viewAuditLog | Distinct actions and usernames for filter dropdowns |

### Access Control

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/api/access/locations` | any auth | Location → group access assignments |
| PUT | `/api/access/locations/:id` | manageLocations | Set group restrictions for a location |
| GET | `/api/access/departments` | any auth | Department → group access assignments |
| PUT | `/api/access/departments/:id` | manageDepartments | Set group restrictions for a department |

### Utility

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check (returns status, SSL state, timestamp) |

## Permission System

13 granular permissions organized into 4 categories:

| Category | Permissions |
|----------|------------|
| **Documents** | View Files, Upload Files, Delete Files, Rename Files |
| **Folders** | Create Folders, Delete Folders |
| **Administration** | Manage Locations, Manage Departments, Manage Users, Manage Groups, Manage Settings |
| **Audit** | View Audit Log, Export Audit Log |

Permissions are assigned to **security groups**, and users are assigned to groups. A user's effective permissions are the **union** of all permissions from all their groups.

### Default Security Groups

| Group | Permissions | Count |
|-------|-----------|-------|
| **Administrator** | All permissions | 13/13 |
| **User** | View Files, Upload Files, Rename Files, Create Folders | 4/13 |
| **Read Only** | View Files only | 1/13 |
| **Manager** | All Documents + Folders + Manage Departments + Audit | 9/13 |

### Access Control (Locations & Departments)

Locations and departments can optionally be restricted to specific security groups:

- If a location/department has **no** group assignments → visible to **all** authenticated users
- If a location/department has group assignments → only users belonging to at least one of those groups can see it
- Administrators always have access regardless of restrictions

This is managed via the Group Access dropdown in the Administration → Locations / Departments sections.

## Database Schema

The MySQL schema includes 11 tables, 6 views, and 6 stored procedures/functions:

**Core Tables:** `users`, `security_groups`, `permissions`, `group_permissions`, `user_group_memberships`, `sessions`, `locations`, `departments`, `folders`, `files`, `audit_log`

**Access Control Tables:** `location_group_access`, `department_group_access`

**Views:** `v_files_full`, `v_folder_paths` (recursive CTE), `v_users_with_groups`, `v_groups_with_permissions`, `v_user_permissions`, `v_location_stats`

**Stored Procedures:** `log_audit`, `has_permission`, `grant_permission_to_group`, `revoke_permission_from_group`, `set_group_permissions`, `get_user_permissions`, `get_group_permissions_json`

See `database/schema.sql` for the complete schema with detailed comments and integration notes.

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `3001` | Server port |
| `HOST` | No | `0.0.0.0` | Bind address |
| `NODE_ENV` | No | `production` | Environment |
| `SSL_ENABLED` | No | `false` | Enable HTTPS |
| `SSL_KEY` | If SSL | `./ssl/server.key` | Path to SSL private key |
| `SSL_CERT` | If SSL | `./ssl/server.crt` | Path to SSL certificate |
| `HTTP_REDIRECT` | No | `false` | Start HTTP→HTTPS redirect on port 80 |
| `DB_HOST` | No | `localhost` | MySQL host |
| `DB_PORT` | No | `3306` | MySQL port |
| `DB_USER` | Yes | `root` | MySQL user |
| `DB_PASSWORD` | Yes | — | MySQL password |
| `DB_NAME` | No | `dealer_document_archive` | Database name |
| `JWT_SECRET` | Yes | — | Secret for signing JWTs |
| `JWT_EXPIRES_IN` | No | `24h` | Token expiry duration |
| `MAX_FILE_SIZE_MB` | No | `50` | Maximum upload size in MB |
| `AZURE_STORAGE_CONNECTION_STRING` | Yes* | — | Azure connection string |
| `AZURE_STORAGE_ACCOUNT_NAME` | Alt* | — | Azure account name (alternative to connection string) |
| `AZURE_STORAGE_ACCOUNT_KEY` | Alt* | — | Azure account key (alternative to connection string) |
| `AZURE_STORAGE_CONTAINER_NAME` | No | `documents` | Blob container name |
| `FRONTEND_URL` | No | — | CORS origin (only if frontend hosted separately) |

\* Provide either `AZURE_STORAGE_CONNECTION_STRING` or both `AZURE_STORAGE_ACCOUNT_NAME` + `AZURE_STORAGE_ACCOUNT_KEY`.

## NPM Scripts

From the project root:

| Script | Description |
|--------|-------------|
| `npm run install:all` | Install dependencies for both backend and frontend |
| `npm run dev` | Run backend and frontend concurrently (development) |
| `npm run dev:backend` | Run backend only with nodemon |
| `npm run dev:frontend` | Run Vite dev server only |
| `npm run build` | Build frontend for production |
| `npm start` | Build frontend + start production server |
| `npm stop` | Gracefully stop the running server |
| `npm run seed` | Create the initial admin user |

## Client-Side PDF Processing

PDF text extraction happens in the browser using **pdf.js** (loaded from CDN). When a user uploads a PDF:

1. The file is read as an ArrayBuffer
2. pdf.js extracts text content page-by-page with progress reporting
3. The extracted text is sent to the backend alongside the file upload
4. The backend stores the text in the `extracted_text` column for full-text search
5. Page count is recorded in the `page_count` column

For preview, PDFs stored in Azure are displayed via their public blob URL in an iframe, or rendered client-side to canvas using pdf.js when a data URL is available.

## RO Number Auto-Matching

The upload page scans extracted PDF text and filenames for Repair Order numbers using these patterns:

- Exact match: `R` followed by 9 digits (e.g., `R123456789`)
- Labeled patterns: `R.O. #12345`, `Repair Order #12345`, `RO Number: 12345`

If a matching folder name is found, it's suggested to the user with an "Accept" button. Exact matches are auto-assigned.

## License

Private — internal use only.
