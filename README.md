# Dealer Document Archive (DDA)

A full-stack document management system built with React and Node.js for organizing, uploading, and previewing PDF files across multiple dealer locations and departments.

## Features

- **PDF Upload & Preview** — Drag-and-drop uploads with client-side text extraction and embedded PDF preview
- **Folder Hierarchy** — Locations → Departments → Folders → Subfolders (unlimited nesting)
- **Fuzzy Search** — Typo-tolerant folder search with highlighted results
- **Role-Based Permissions** — 13 granular permissions across 4 categories, assignable per security group
- **Administration Panel** — Manage users, groups, locations, departments, and view audit logs
- **Audit Trail** — Immutable activity log with filterable views and CSV export
- **Dark/Light Mode** — Professional dark theme with light mode toggle
- **JWT Authentication** — Secure token-based auth with session persistence

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, pdf.js |
| Backend | Node.js, Express |
| Database | MySQL 8.0+ |
| Auth | JWT (jsonwebtoken), bcryptjs |
| File Storage | Azure Blob Storage (@azure/storage-blob) |

## Project Structure

```
dealer-document-archive/
├── frontend/                 # React + Vite application
│   ├── src/
│   │   ├── App.jsx           # Main application component
│   │   ├── api.js            # API client (all backend endpoints)
│   │   └── main.jsx          # React entry point
│   ├── index.html
│   ├── vite.config.js        # Vite config with API proxy
│   └── package.json
├── backend/                  # Express API server
│   ├── server.js             # Entry point
│   ├── seed-admin.js         # Initial admin user creation
│   ├── config/
│   │   ├── db.js             # MySQL connection pool
│   │   └── azure-storage.js  # Azure Blob Storage client
│   ├── middleware/
│   │   ├── auth.js           # JWT + permission middleware
│   │   └── audit.js          # Audit log helper
│   ├── routes/
│   │   ├── auth.js           # Login, register, profile
│   │   ├── dashboard.js      # Dashboard stats
│   │   ├── locations.js      # CRUD locations
│   │   ├── departments.js    # CRUD departments
│   │   ├── folders.js        # CRUD folders + subfolders
│   │   ├── files.js          # Upload, download, rename, delete
│   │   ├── groups.js         # Groups + permission management
│   │   ├── users.js          # User admin
│   │   └── audit.js          # Audit log queries
│   ├── .env.example          # Environment template
│   └── package.json
├── database/
│   └── schema.sql            # MySQL schema + seed data
├── .gitignore
├── package.json              # Root scripts
└── README.md
```

## Quick Start

### Prerequisites

- Node.js 18+
- MySQL 8.0+

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

### 3. Configure the backend

```bash
cd backend
cp .env.example .env
```

Edit `.env` with your MySQL credentials, JWT secret, and Azure Storage credentials:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password_here
DB_NAME=dealer_document_archive
JWT_SECRET=generate-a-random-string-here

# Azure Blob Storage — find in Azure Portal → Storage Account → Access Keys
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=youraccount;AccountKey=yourkey;EndpointSuffix=core.windows.net
AZURE_STORAGE_CONTAINER_NAME=documents
```

> **Azure Setup:** Create a Storage Account in the Azure Portal, then copy the connection string from **Access Keys**. The container is created automatically on first startup. The container is set to blob-level public access so PDFs can be previewed directly in the browser.

### 4. Create the admin user

```bash
cd backend
node seed-admin.js
```

This creates:
- **Username:** `admin`
- **Password:** `admin`

> ⚠️ **Change this password after first login!**

### 5. Start the application

From the project root:

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

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login → JWT token |
| POST | `/api/auth/register` | Create account |
| GET | `/api/auth/me` | Current user profile |

### Documents & Folders
| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/api/locations` | any auth | List locations |
| POST | `/api/locations` | manageLocations | Create location |
| GET | `/api/departments` | any auth | List departments |
| POST | `/api/departments` | manageDepartments | Create department |
| GET | `/api/folders` | any auth | List folders |
| POST | `/api/folders` | createFolders | Create folder/subfolder |
| POST | `/api/files/upload` | uploadFiles | Upload PDF (multipart) |
| PUT | `/api/files/:id/rename` | renameFiles | Rename file |
| DELETE | `/api/files/:id` | deleteFiles | Delete file |
| GET | `/api/files/:id/download` | any auth | Download PDF |

### Administration
| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/api/groups` | any auth | List groups + permissions |
| PUT | `/api/groups/:id/permissions` | manageGroups | Update group permissions |
| GET | `/api/users` | manageUsers | List users |
| GET | `/api/audit` | viewAuditLog | Query audit log |
| GET | `/api/dashboard` | any auth | Dashboard statistics |

## Permission System

13 granular permissions organized into 4 categories:

| Category | Permissions |
|----------|------------|
| **Documents** | View Files, Upload Files, Delete Files, Rename Files |
| **Folders** | Create Folders, Delete Folders |
| **Administration** | Manage Locations, Manage Departments, Manage Users, Manage Groups, Manage Settings |
| **Audit** | View Audit Log, Export Audit Log |

Permissions are assigned to security groups, and users are assigned to groups. A user's effective permissions are the union of all permissions from all their groups.

## Default Security Groups

| Group | Permissions |
|-------|-----------|
| **Administrator** | All 13 permissions |
| **User** | View Files, Upload Files, Rename Files, Create Folders |
| **Read Only** | View Files only |
| **Manager** | All Documents + Folders + Manage Departments + Audit |

## License

Private — internal use only.
