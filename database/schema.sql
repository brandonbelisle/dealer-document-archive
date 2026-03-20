-- ============================================================
-- DEALER DOCUMENT ARCHIVE — DATABASE SCHEMA
-- ============================================================
-- Compatible with: PostgreSQL 14+
-- Adapt types for MySQL/SQLite as needed (see notes inline)
-- ============================================================

-- Enable UUID generation (PostgreSQL)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. SECURITY GROUPS
-- ============================================================
-- Defines roles like "Administrator", "User", "Read Only", etc.
-- Users are assigned to groups via the junction table below.

CREATE TABLE security_groups (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(100) NOT NULL UNIQUE,
    description     TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 2. USERS
-- ============================================================
-- Stores login credentials and profile info.
-- password_hash should store bcrypt/argon2 hashed passwords.
-- NEVER store plain text passwords.

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username        VARCHAR(150) NOT NULL UNIQUE,
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,           -- bcrypt/argon2 hash
    display_name    VARCHAR(200) NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'inactive', 'suspended')),
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_username ON users (username);
CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_status ON users (status);

-- ============================================================
-- 3. USER ↔ GROUP MEMBERSHIP (many-to-many)
-- ============================================================

CREATE TABLE user_group_memberships (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    group_id        UUID NOT NULL REFERENCES security_groups(id) ON DELETE CASCADE,
    assigned_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    assigned_by     UUID REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE(user_id, group_id)
);

CREATE INDEX idx_ugm_user ON user_group_memberships (user_id);
CREATE INDEX idx_ugm_group ON user_group_memberships (group_id);

-- ============================================================
-- 4. SESSIONS (for token-based auth)
-- ============================================================
-- Optional: use if implementing session-based or JWT refresh tokens.

CREATE TABLE sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token           VARCHAR(512) NOT NULL UNIQUE,
    ip_address      INET,
    user_agent      TEXT,
    expires_at      TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sessions_user ON sessions (user_id);
CREATE INDEX idx_sessions_token ON sessions (token);
CREATE INDEX idx_sessions_expires ON sessions (expires_at);

-- ============================================================
-- 5. LOCATIONS
-- ============================================================
-- Dealer locations (e.g. Tampa, Lakeland, Fort Myers)

CREATE TABLE locations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(200) NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by      UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_locations_name ON locations (name);

-- ============================================================
-- 6. DEPARTMENTS
-- ============================================================
-- Each department belongs to a specific location.
-- e.g. Tampa → Service, Tampa → Parts (separate from Lakeland → Service)

CREATE TABLE departments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(200) NOT NULL,
    location_id     UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by      UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_departments_location ON departments (location_id);
CREATE INDEX idx_departments_name ON departments (name);

-- ============================================================
-- 7. FOLDERS
-- ============================================================
-- Folders belong to a department (and thus a location).
-- Supports nested subfolders via self-referencing parent_id.
-- parent_id = NULL means it's a root-level department folder.

CREATE TABLE folders (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(300) NOT NULL,
    location_id     UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    department_id   UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    parent_id       UUID REFERENCES folders(id) ON DELETE CASCADE,   -- NULL = root folder
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by      UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_folders_department ON folders (department_id);
CREATE INDEX idx_folders_location ON folders (location_id);
CREATE INDEX idx_folders_parent ON folders (parent_id);
CREATE INDEX idx_folders_name ON folders (name);

-- ============================================================
-- 8. FILES
-- ============================================================
-- Uploaded documents. Each file belongs to a folder.
-- file_storage_path: where the raw file is stored (S3 key, local path, etc.)
-- extracted_text: full text extracted by pdf.js or OCR pipeline.
-- mime_type: e.g. "application/pdf", "image/png"

CREATE TABLE files (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                VARCHAR(500) NOT NULL,             -- display name (can be renamed)
    original_name       VARCHAR(500) NOT NULL,             -- original upload filename
    folder_id           UUID NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
    mime_type           VARCHAR(100) DEFAULT 'application/pdf',
    file_size_bytes     BIGINT NOT NULL DEFAULT 0,
    page_count          INT DEFAULT 0,
    extracted_text      TEXT,                               -- full extracted text content
    file_storage_path   VARCHAR(1000),                     -- path/key to raw file in storage
    status              VARCHAR(20) NOT NULL DEFAULT 'processing'
                            CHECK (status IN ('processing', 'done', 'error')),
    error_message       VARCHAR(500),
    uploaded_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    uploaded_by         UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_files_folder ON files (folder_id);
CREATE INDEX idx_files_status ON files (status);
CREATE INDEX idx_files_uploaded_at ON files (uploaded_at);
CREATE INDEX idx_files_name ON files (name);
CREATE INDEX idx_files_uploaded_by ON files (uploaded_by);

-- Full-text search index on extracted text (PostgreSQL)
-- Enables fast text searching across all documents
CREATE INDEX idx_files_text_search ON files
    USING gin(to_tsvector('english', COALESCE(extracted_text, '')));

-- ============================================================
-- 9. AUDIT LOG
-- ============================================================
-- Immutable log of all user actions.
-- Do NOT delete rows from this table in production.

CREATE TABLE audit_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action          VARCHAR(100) NOT NULL,                -- e.g. "File Uploaded", "Folder Created"
    detail          TEXT NOT NULL,                         -- human-readable description
    user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
    user_name       VARCHAR(200) NOT NULL,                -- denormalized for historical accuracy
    ip_address      INET,
    timestamp       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_action ON audit_log (action);
CREATE INDEX idx_audit_user ON audit_log (user_id);
CREATE INDEX idx_audit_timestamp ON audit_log (timestamp);
CREATE INDEX idx_audit_user_name ON audit_log (user_name);

-- ============================================================
-- 10. USEFUL VIEWS
-- ============================================================

-- View: Files with folder, department, and location info
CREATE OR REPLACE VIEW v_files_full AS
SELECT
    f.id AS file_id,
    f.name AS file_name,
    f.original_name,
    f.mime_type,
    f.file_size_bytes,
    f.page_count,
    f.status,
    f.uploaded_at,
    f.uploaded_by,
    u.display_name AS uploaded_by_name,
    fld.id AS folder_id,
    fld.name AS folder_name,
    d.id AS department_id,
    d.name AS department_name,
    l.id AS location_id,
    l.name AS location_name
FROM files f
JOIN folders fld ON f.folder_id = fld.id
JOIN departments d ON fld.department_id = d.id
JOIN locations l ON fld.location_id = l.id
LEFT JOIN users u ON f.uploaded_by = u.id;

-- View: Folder hierarchy with recursive path
CREATE OR REPLACE RECURSIVE VIEW v_folder_paths AS
WITH RECURSIVE folder_tree AS (
    SELECT
        id, name, parent_id, department_id, location_id,
        name::TEXT AS full_path,
        1 AS depth
    FROM folders WHERE parent_id IS NULL
    UNION ALL
    SELECT
        f.id, f.name, f.parent_id, f.department_id, f.location_id,
        ft.full_path || ' / ' || f.name,
        ft.depth + 1
    FROM folders f
    JOIN folder_tree ft ON f.parent_id = ft.id
)
SELECT * FROM folder_tree;

-- View: User with their groups
CREATE OR REPLACE VIEW v_users_with_groups AS
SELECT
    u.id AS user_id,
    u.username,
    u.email,
    u.display_name,
    u.status,
    u.last_login_at,
    u.created_at,
    ARRAY_AGG(sg.name ORDER BY sg.name) FILTER (WHERE sg.name IS NOT NULL) AS groups
FROM users u
LEFT JOIN user_group_memberships ugm ON u.id = ugm.user_id
LEFT JOIN security_groups sg ON ugm.group_id = sg.id
GROUP BY u.id;

-- View: Dashboard stats per location
CREATE OR REPLACE VIEW v_location_stats AS
SELECT
    l.id AS location_id,
    l.name AS location_name,
    COUNT(DISTINCT fld.id) AS folder_count,
    COUNT(DISTINCT f.id) AS file_count,
    COALESCE(SUM(f.file_size_bytes), 0) AS total_size_bytes
FROM locations l
LEFT JOIN folders fld ON fld.location_id = l.id
LEFT JOIN files f ON f.folder_id = fld.id AND f.status = 'done'
GROUP BY l.id;

-- ============================================================
-- 11. SEED DATA
-- ============================================================

-- Default security groups
INSERT INTO security_groups (name, description) VALUES
    ('Administrator', 'Full system access including administration panel'),
    ('User', 'Standard document access, upload, and folder management'),
    ('Read Only', 'View-only access to documents and folders'),
    ('Manager', 'Department-level management and reporting access');

-- Default locations
INSERT INTO locations (name) VALUES
    ('Tampa'),
    ('Lakeland'),
    ('Fort Myers');

-- Default departments for each location
-- (Using subqueries to reference location IDs dynamically)
INSERT INTO departments (name, location_id)
SELECT dept_name, l.id
FROM locations l
CROSS JOIN (VALUES ('Service'), ('Parts'), ('Sales'), ('Admin')) AS d(dept_name);

-- ============================================================
-- 12. HELPER FUNCTIONS
-- ============================================================

-- Function: Update the updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply auto-update triggers
CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER trg_locations_updated BEFORE UPDATE ON locations
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER trg_departments_updated BEFORE UPDATE ON departments
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER trg_folders_updated BEFORE UPDATE ON folders
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER trg_files_updated BEFORE UPDATE ON files
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER trg_groups_updated BEFORE UPDATE ON security_groups
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Function: Log an audit entry (call from your API/backend)
CREATE OR REPLACE FUNCTION log_audit(
    p_action VARCHAR,
    p_detail TEXT,
    p_user_id UUID,
    p_user_name VARCHAR,
    p_ip INET DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO audit_log (action, detail, user_id, user_name, ip_address)
    VALUES (p_action, p_detail, p_user_id, p_user_name, p_ip)
    RETURNING id INTO v_id;
    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 13. ENTITY RELATIONSHIP SUMMARY
-- ============================================================
--
--  ┌──────────────────┐
--  │  security_groups  │
--  └────────┬─────────┘
--           │ many-to-many
--  ┌────────┴─────────────────┐
--  │ user_group_memberships   │
--  └────────┬─────────────────┘
--           │
--  ┌────────┴─────────┐       ┌──────────┐
--  │      users       │───────│ sessions │
--  └────────┬─────────┘       └──────────┘
--           │ created_by / uploaded_by
--           │
--  ┌────────┴─────────┐
--  │    locations      │
--  └────────┬─────────┘
--           │ 1:N
--  ┌────────┴─────────┐
--  │   departments    │  (per-location)
--  └────────┬─────────┘
--           │ 1:N
--  ┌────────┴─────────┐
--  │     folders      │──┐ self-ref (parent_id)
--  └────────┬─────────┘  │ for subfolders
--           │ 1:N        │
--  ┌────────┴─────────┐  │
--  │      files       │  │
--  └──────────────────┘  │
--                        │
--  ┌─────────────────────┘
--  │    audit_log     │  (immutable, references user)
--  └──────────────────┘
--
-- ============================================================
-- MAPPING: React State → Database Tables
-- ============================================================
--
--  React State              Table                  Notes
--  ─────────────────────    ─────────────────────  ──────────────────────────────
--  loggedInUser             users                  Auth via password_hash
--  loggedInUser.groups      user_group_memberships Junction to security_groups
--  locations                locations              id, name
--  departments              departments            id, name, location_id
--  folders                  folders                id, name, location_id,
--                                                  department_id, parent_id
--  files                    files                  id, name, folder_id, size,
--                                                  type, pages, text, status
--  files[].fileDataUrl      file_storage_path      Store raw file in S3/disk,
--                                                  reference path in DB
--  auditLog                 audit_log              action, detail, user, timestamp
--
-- ============================================================
-- NOTES FOR INTEGRATION
-- ============================================================
--
-- 1. PASSWORD HASHING:
--    Use bcrypt or argon2 in your API layer. Example (Node.js):
--      const hash = await bcrypt.hash(password, 12);
--      const valid = await bcrypt.compare(password, user.password_hash);
--
-- 2. FILE STORAGE:
--    Store raw PDF/file bytes in object storage (S3, GCS, Azure Blob)
--    or local filesystem. Save the path/key in files.file_storage_path.
--    The React app's fileDataUrl (base64) is for in-memory preview only —
--    do NOT store base64 in the database.
--
-- 3. EXTRACTED TEXT:
--    Run pdf.js extraction server-side (Node.js) or client-side,
--    then POST the extracted text to your API to save in files.extracted_text.
--
-- 4. AUDIT LOG:
--    Call log_audit() from your API on every create/update/delete.
--    The audit_log table should be append-only — never UPDATE or DELETE rows.
--
-- 5. FULL-TEXT SEARCH:
--    Query extracted text with:
--      SELECT * FROM files
--      WHERE to_tsvector('english', extracted_text) @@ to_tsquery('english', 'search terms');
--
-- 6. RECURSIVE FOLDER QUERIES:
--    Use the v_folder_paths view, or write CTEs:
--      WITH RECURSIVE tree AS ( ... ) SELECT * FROM tree WHERE id = $1;
--
-- 7. DASHBOARD STATS:
--    Files uploaded today:
--      SELECT COUNT(*) FROM files WHERE uploaded_at >= CURRENT_DATE;
--    Folders created today:
--      SELECT COUNT(*) FROM folders WHERE created_at >= CURRENT_DATE;
--    Use v_location_stats for the per-location breakdown.
--
