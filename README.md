# Dealer Document Archive (DDA)

A full-featured document management web application built with React for organizing, uploading, and previewing PDF files across multiple dealer locations and departments.

## Features

### Document Management
- **PDF Upload** — Drag-and-drop single or bulk PDF uploads with text extraction
- **Folder Hierarchy** — Locations → Departments → Folders → Subfolders (unlimited nesting)
- **File Preview** — Embedded PDF rendering using pdf.js canvas, with extracted text panel
- **File Renaming** — Rename any uploaded file inline
- **Fuzzy Search** — Search folders with typo-tolerant fuzzy matching and highlighted results

### Navigation
- **Dashboard** — Stats overview with file counts, folder counts, per-location breakdowns, and recent uploads
- **Folders** — Browse by Location → Department, create folders, navigate subfolders with breadcrumb trail
- **Upload** — Two-step upload flow with searchable folder destination picker
- **Direct Upload** — Drag files directly onto any open folder page

### Administration (Administrator group only)
- **Users** — User account management with group assignments
- **Groups** — Security group management (Administrator, User, Read Only, Manager)
- **Locations** — CRUD for dealer locations (Tampa, Lakeland, Fort Myers, etc.)
- **Departments** — Per-location department management (Service, Parts, Sales, Admin)
- **Audit Log** — Filterable activity log with CSV export (tracks uploads, renames, folder/location/dept changes)
- **Settings** — Application configuration (placeholder)

### Security
- **Login Page** — Username/password authentication
- **Security Groups** — Role-based access (Administrator group sees Administration menu)
- **Profile Menu** — My Account, Security, Settings, Administration, Sign Out

### UI/UX
- **Dark/Light Mode** — Professional dark theme with light mode toggle
- **Responsive Design** — Clean, modern interface with Geist font
- **Warning Modals** — Confirmation dialogs for destructive actions ("Are you sure you want to unlink these files?")

## Tech Stack

- **Frontend**: React (JSX artifact)
- **PDF Processing**: pdf.js (CDN-loaded)
- **Fonts**: Geist Sans, IBM Plex Mono
- **State**: React hooks (useState, useEffect, useCallback, useRef)

## Database

The `database/schema.sql` file contains a complete PostgreSQL schema covering all entities:

| Table | Purpose |
|-------|---------|
| `users` | Login credentials with bcrypt password hashing |
| `security_groups` | Role definitions |
| `user_group_memberships` | Many-to-many user↔group |
| `sessions` | Token-based authentication |
| `locations` | Dealer locations |
| `departments` | Per-location departments |
| `folders` | Nested folder hierarchy (self-referencing) |
| `files` | Uploaded documents with extracted text |
| `audit_log` | Immutable activity log |

Includes: auto-update triggers, full-text search index, recursive folder path view, dashboard stats view, seed data, and a `log_audit()` helper function.

## Getting Started

1. Clone this repo
2. The main app is in `src/App.jsx` — it's a single-file React component
3. Import the database schema: `psql -f database/schema.sql`
4. Connect your backend API to the schema
5. Replace the demo auth in the frontend with real API calls

## Project Structure

```
dealer-document-archive/
├── README.md
├── src/
│   └── App.jsx              # Main React application
├── database/
│   └── schema.sql           # PostgreSQL database schema
└── .github/
    └── (workflows go here)
```

## Demo Login

In the current frontend demo:
- Any username + password works
- Include "admin" in the username (e.g. `admin`) to get the Administrator security group
- Other usernames get the standard User group only

## License

Private — internal use only.
