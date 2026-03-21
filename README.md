# Dealer Document Archive (DDA)

A full-stack document management system built with React and Node.js for organizing, uploading, and previewing PDF files across multiple dealer locations and departments.

## Features

### Core Features

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

### Multi-Application Platform

The application now supports multiple integrated apps accessible from a centralized landing page:

#### Dealer Document Archive (DDA)
The core document management application with all features listed above.

#### Credit Hold Tracker (CHT)
A dedicated application for managing and tracking credit holds across your organization.

#### Custom Applications
Administrators can create custom app shortcuts in the **App Center** section of the Admin panel. Custom apps:
- Display on the landing page and in the apps dropdown
- Require a name, 4-character abbreviation (for the icon), and a URL
- Redirect users to the configured URL when clicked

#### Help Desk / Submit Help Ticket
Users can submit support tickets from the landing page or apps dropdown:
- Subject and message fields with multi-line text input
- File attachments support (up to 5 files, 25MB each)
- Tickets are emailed to a configurable support email address
- Reply-to is set to the submitting user's email for easy responses
- Customizable email branding (subject prefix, brand color, signature)

### Email Integration

- **SMTP Configuration** — Configure SMTP settings for sending emails
- **Email Branding** — Customize brand color and email signature for all outgoing emails
- **Email Subject Prefix** — Configure a custom prefix for help ticket email subjects
- **Test Email** — Send test emails to verify SMTP configuration

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 6, pdf.js 3.11 |
| Backend | Node.js 18+, Express 5 |
| Database | MySQL 8.0+ |
| Auth | JWT (jsonwebtoken), bcryptjs |
| File Storage | Azure Blob Storage (@azure/storage-blob) |
| File Uploads | Multer (memory storage, 50 MB limit, PDF-only filter) |
| Email | Nodemailer (SMTP) |
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
│   │   │   ├── LandingPage.jsx        # App launcher with DDA, CHT, custom apps
│   │   │   ├── LandingNavbar.jsx     # Landing page navigation
│   │   │   ├── Navbar.jsx             # Top nav with global search & dept dropdown
│   │   │   ├── AdminNavbar.jsx        # Admin center navigation
│   │   │   ├── CHTNavbar.jsx          # Credit Hold Tracker navigation
│   │   │   ├── PdfCanvasPreview.jsx   # Client-side PDF rendering to canvas
│   │   │   ├── modals/
│   │   │   │   ├── AdminSetPasswordModal.jsx
│   │   │   │   ├── ChangePasswordModal.jsx
│   │   │   │   ├── HelpTicketModal.jsx  # Help ticket submission modal
│   │   │   │   ├── RenameModal.jsx
│   │   │   │   └── WarningModal.jsx
│   │   │   └── ui/
│   │   │       ├── Btn.jsx            # Styled button components
│   │   │       ├── FileCard.jsx       # File display card
│   │   │       └── PermToggle.jsx     # Permission toggle switch
│   │   └── pages/
│   │       ├── AdminPage.jsx          # Users, groups, locations, depts, audit, app center, settings
│   │       ├── CHTDashboardPage.jsx   # Credit Hold Tracker dashboard
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
│   ├── migrations/             # Database migrations
│   │   ├── 007_custom_apps.sql
│   │   ├── 008_app_settings.sql
│   │   └── 009_email_signature.sql
│   ├── routes/
│   │   ├── auth.js             # Login, register, profile, change password
│   │   ├── custom-apps.js      # CRUD for custom applications
│   │   ├── dashboard.js        # Dashboard statistics
│   │   ├── files.js            # Upload, download, rename, delete, move, text update
│   │   ├── folders.js          # CRUD folders + subfolders + breadcrumbs
│   │   ├── groups.js           # CRUD groups + permission management
│   │   ├── help-ticket.js      # Help ticket submission + email settings
│   │   ├── locations.js        # CRUD locations
│   │   ├── departments.js      # CRUD departments
│   │   ├── settings.js         # Logo uploads
│   │   ├── smtp.js             # SMTP configuration + email sending
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

### 3. Run database migrations

```bash
# Custom apps table
mysql -u root -p dealer_document_archive < backend/migrations/007_custom_apps.sql

# App settings (support email, email branding)
mysql -u root -p dealer_document_archive < backend/migrations/008_app_settings.sql

# Email signature settings
mysql -u root -p dealer_document_archive < backend/migrations/009_email_signature.sql
```

### 4. Configure the backend

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

# Encryption (for SMTP passwords)
ENCRYPTION_KEY=your-32-character-encryption-key
```

### 5. Azure Blob Storage Setup

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

### 6. Create the admin user

```bash
cd backend
node seed-admin.js
```

This creates:
- **Username:** `admin`
- **Password:** `admin`

> ⚠️ **Change this password after first login!**

### 7. Start the application

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

### 8. SSL/HTTPS (Optional)

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

## Admin Center

Access Admin Center from the landing page (administrators only). Features include:

### Users
- Create, edit, deactivate users
- Reset user passwords
- Assign users to security groups

### Groups
- Create custom security groups
- Assign granular permissions (13 total across 4 categories)
- View member counts

### App Center
- Create custom application shortcuts
- Set name, 4-character abbreviation (icon), and URL
- Apps appear on the landing page and in the apps dropdown

### Locations & Departments
- Create and manage locations
- Create departments under locations
- Restrict access to specific security groups

### Audit Log
- View all system activity
- Filter by action, user, date
- Export to CSV

### Authentication
- Configure SSO/SAML authentication
- Set up identity provider integration

### Settings
- **Branding** — Upload dark/light mode logos
- **Email (SMTP)** — Configure SMTP server for outgoing emails
- **Support Email** — Set the email address for help ticket submissions
- **Email Signature & Branding** — Customize brand color, email signature, and subject prefix for help ticket emails

## Help Desk / Support Tickets

Users can submit help tickets from the landing page. Configure in Admin Center:

1. **Support Email** — Set where help tickets are sent (Admin Center → Settings)
2. **SMTP Settings** — Configure email server (Admin Center → Settings)
3. **Email Branding** — Customize:
   - Brand color (for headings)
   - Email signature (appended to all emails)
   - Subject prefix (e.g., `[Support]` or `[Help Desk]`)

Help ticket emails include:
- User's name and email
- Subject (with customizable prefix)
- Message body
- Attachments (up to 5 files)
- Reply-to set to user's email for easy responses

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

### Custom Apps (App Center)

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/api/custom-apps` | any auth | List all custom apps |
| POST | `/api/custom-apps` | manageSettings | Create custom app |
| PUT | `/api/custom-apps/:id` | manageSettings | Update custom app |
| DELETE | `/api/custom-apps/:id` | manageSettings | Delete custom app |

### Help Desk

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/api/help-ticket/support-email` | any auth | Get support email address |
| POST | `/api/help-ticket/support-email` | manageSettings | Set support email address |
| GET | `/api/help-ticket/email-settings` | manageSettings | Get email branding settings |
| POST | `/api/help-ticket/email-settings` | manageSettings | Update email branding settings |
| POST | `/api/help-ticket/submit` | any auth | Submit a help ticket (sends email) |

### SMTP Settings

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/api/smtp/settings` | manageSettings | Get SMTP configuration |
| POST | `/api/smtp/settings` | manageSettings | Save SMTP configuration |
| POST | `/api/smtp/test` | manageSettings | Send test email |

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

### Settings

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/api/settings/logos` | manageSettings | Get logo URLs |
| GET | `/api/settings/logo/:type` | any auth | Get logo file (`dark` or `light`) |
| POST | `/api/settings/logo/:type` | manageSettings | Upload logo |

### Utility

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check (returns status, SSL state, timestamp) |

## Database Schema

The MySQL schema includes 11 tables, 6 views, and 6 stored procedures/functions:

**Core Tables:** `users`, `security_groups`, `permissions`, `group_permissions`, `user_group_memberships`, `sessions`, `locations`, `departments`, `folders`, `files`, `audit_log`

**Access Control Tables:** `location_group_access`, `department_group_access`

**Application Tables:** `custom_apps`, `app_settings`, `smtp_settings`

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
| `ENCRYPTION_KEY` | Yes | — | 32-character key for encrypting SMTP password |
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