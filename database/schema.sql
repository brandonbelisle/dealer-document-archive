-- ============================================================
-- DEALER DOCUMENT ARCHIVE — DATABASE SCHEMA
-- ============================================================
-- Compatible with: MySQL 8.0+
-- Requires: MySQL 8.0.16+ for CHECK constraints
--           MySQL 8.0+ for UUID(), CTEs, window functions
-- ============================================================

-- ============================================================
-- 1. SECURITY GROUPS
-- ============================================================
-- Defines roles like "Administrator", "User", "Read Only", etc.
-- Users are assigned to groups via the junction table below.
-- Permissions are assigned to groups via the group_permissions table.

CREATE TABLE security_groups (
    id              CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name            VARCHAR(100) NOT NULL UNIQUE,
    description     TEXT,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 2. PERMISSIONS
-- ============================================================
-- Defines the available permission types in the system.
-- Each permission belongs to a category for UI grouping.
-- `perm_key`: machine-readable identifier (matches React PERMISSION_LABELS keys)
-- label: human-readable display name
-- category: UI grouping (Documents, Folders, Administration, Audit)
-- description: tooltip/help text explaining the permission

CREATE TABLE permissions (
    id              CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    perm_key        VARCHAR(100) NOT NULL UNIQUE,          -- e.g. "viewFiles", "uploadFiles"
    label           VARCHAR(200) NOT NULL,                 -- e.g. "View Files"
    category        VARCHAR(100) NOT NULL,                 -- e.g. "Documents", "Folders", "Administration", "Audit"
    description     TEXT,                                   -- e.g. "Browse and preview uploaded documents"
    sort_order      INT NOT NULL DEFAULT 0,                -- controls display order within category
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_permissions_key ON permissions (perm_key);
CREATE INDEX idx_permissions_category ON permissions (category);

-- ============================================================
-- 3. USERS
-- ============================================================
-- Stores login credentials and profile info.
-- password_hash should store bcrypt/argon2 hashed passwords.
-- NEVER store plain text passwords.
-- NOTE: Created before group_permissions so FKs can reference users.

CREATE TABLE users (
    id              CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    username        VARCHAR(150) NOT NULL UNIQUE,
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,           -- bcrypt/argon2 hash
    display_name    VARCHAR(200) NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'inactive', 'suspended')),
    last_login_at   DATETIME,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_users_username ON users (username);
CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_status ON users (status);

-- ============================================================
-- 4. GROUP ↔ PERMISSION MEMBERSHIP (many-to-many)
-- ============================================================
-- Links security groups to their granted permissions.
-- If a row exists, the group HAS that permission.
-- Absence of a row means the permission is denied for that group.

CREATE TABLE group_permissions (
    id              CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    group_id        CHAR(36) NOT NULL,
    permission_id   CHAR(36) NOT NULL,
    granted_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    granted_by      CHAR(36),
    UNIQUE KEY uq_group_permission (group_id, permission_id),
    CONSTRAINT fk_gp_group FOREIGN KEY (group_id) REFERENCES security_groups(id) ON DELETE CASCADE,
    CONSTRAINT fk_gp_permission FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
    CONSTRAINT fk_gp_granted_by FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_gp_group ON group_permissions (group_id);
CREATE INDEX idx_gp_permission ON group_permissions (permission_id);

-- ============================================================
-- 5. USER ↔ GROUP MEMBERSHIP (many-to-many)
-- ============================================================

CREATE TABLE user_group_memberships (
    id              CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id         CHAR(36) NOT NULL,
    group_id        CHAR(36) NOT NULL,
    assigned_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    assigned_by     CHAR(36),
    UNIQUE KEY uq_user_group (user_id, group_id),
    CONSTRAINT fk_ugm_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_ugm_group FOREIGN KEY (group_id) REFERENCES security_groups(id) ON DELETE CASCADE,
    CONSTRAINT fk_ugm_assigned_by FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_ugm_user ON user_group_memberships (user_id);
CREATE INDEX idx_ugm_group ON user_group_memberships (group_id);

-- ============================================================
-- 6. SESSIONS (for token-based auth)
-- ============================================================
-- Optional: use if implementing session-based or JWT refresh tokens.

CREATE TABLE sessions (
    id              CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id         CHAR(36) NOT NULL,
    token           VARCHAR(512) NOT NULL UNIQUE,
    ip_address      VARCHAR(45),                           -- accommodates IPv4 and IPv6
    user_agent      TEXT,
    expires_at      DATETIME NOT NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_sessions_user ON sessions (user_id);
CREATE INDEX idx_sessions_token ON sessions (token);
CREATE INDEX idx_sessions_expires ON sessions (expires_at);

-- ============================================================
-- 7. LOCATIONS
-- ============================================================
-- Dealer locations (e.g. Tampa, Lakeland, Fort Myers)

CREATE TABLE locations (
    id              CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name            VARCHAR(200) NOT NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by      CHAR(36),
    CONSTRAINT fk_locations_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_locations_name ON locations (name);

-- ============================================================
-- 8. DEPARTMENTS
-- ============================================================
-- Each department belongs to a specific location.
-- e.g. Tampa → Service, Tampa → Parts (separate from Lakeland → Service)

CREATE TABLE departments (
    id              CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name            VARCHAR(200) NOT NULL,
    location_id     CHAR(36) NOT NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by      CHAR(36),
    CONSTRAINT fk_departments_location FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
    CONSTRAINT fk_departments_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_departments_location ON departments (location_id);
CREATE INDEX idx_departments_name ON departments (name);

-- ============================================================
-- 9. FOLDERS
-- ============================================================
-- Folders belong to a department (and thus a location).
-- Supports nested subfolders via self-referencing parent_id.
-- parent_id = NULL means it's a root-level department folder.

CREATE TABLE folders (
    id              CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name            VARCHAR(300) NOT NULL,
    location_id     CHAR(36) NOT NULL,
    department_id   CHAR(36) NOT NULL,
    parent_id       CHAR(36),                              -- NULL = root folder
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by      CHAR(36),
    CONSTRAINT fk_folders_location FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
    CONSTRAINT fk_folders_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
    CONSTRAINT fk_folders_parent FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE CASCADE,
    CONSTRAINT fk_folders_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_folders_department ON folders (department_id);
CREATE INDEX idx_folders_location ON folders (location_id);
CREATE INDEX idx_folders_parent ON folders (parent_id);
CREATE INDEX idx_folders_name ON folders (name);

-- ============================================================
-- 10. FILES
-- ============================================================
-- Uploaded documents. Each file belongs to a folder.
-- file_storage_path: where the raw file is stored (S3 key, local path, etc.)
-- extracted_text: full text extracted by pdf.js or OCR pipeline.
-- mime_type: e.g. "application/pdf", "image/png"

CREATE TABLE files (
    id                  CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name                VARCHAR(500) NOT NULL,             -- display name (can be renamed)
    original_name       VARCHAR(500) NOT NULL,             -- original upload filename
    folder_id           CHAR(36) NOT NULL,
    mime_type           VARCHAR(100) DEFAULT 'application/pdf',
    file_size_bytes     BIGINT NOT NULL DEFAULT 0,
    page_count          INT DEFAULT 0,
    extracted_text      LONGTEXT,                          -- full extracted text content
    file_storage_path   VARCHAR(1000),                     -- path/key to raw file in storage
    status              VARCHAR(20) NOT NULL DEFAULT 'processing'
                            CHECK (status IN ('processing', 'done', 'error')),
    error_message       VARCHAR(500),
    uploaded_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    uploaded_by         CHAR(36),
    CONSTRAINT fk_files_folder FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE,
    CONSTRAINT fk_files_uploaded_by FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_files_folder ON files (folder_id);
CREATE INDEX idx_files_status ON files (status);
CREATE INDEX idx_files_uploaded_at ON files (uploaded_at);
CREATE INDEX idx_files_name ON files (name);
CREATE INDEX idx_files_uploaded_by ON files (uploaded_by);

-- Full-text search index on extracted text (MySQL InnoDB FULLTEXT)
-- Enables fast text searching across all documents
ALTER TABLE files ADD FULLTEXT INDEX idx_files_text_search (extracted_text);

-- ============================================================
-- 11. AUDIT LOG
-- ============================================================
-- Immutable log of all user actions.
-- Do NOT delete rows from this table in production.

CREATE TABLE audit_log (
    id              CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    action          VARCHAR(100) NOT NULL,                -- e.g. "File Uploaded", "Folder Created", "Group Updated"
    detail          TEXT NOT NULL,                         -- human-readable description
    user_id         CHAR(36),
    user_name       VARCHAR(200) NOT NULL,                -- denormalized for historical accuracy
    ip_address      VARCHAR(45),                           -- accommodates IPv4 and IPv6
    `timestamp`     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_audit_action ON audit_log (action);
CREATE INDEX idx_audit_user ON audit_log (user_id);
CREATE INDEX idx_audit_timestamp ON audit_log (`timestamp`);
CREATE INDEX idx_audit_user_name ON audit_log (user_name);

-- ============================================================
-- 12. USEFUL VIEWS
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
-- MySQL 8.0+ supports recursive CTEs in views
CREATE OR REPLACE VIEW v_folder_paths AS
WITH RECURSIVE folder_tree AS (
    SELECT
        id, name, parent_id, department_id, location_id,
        CAST(name AS CHAR(4000)) AS full_path,
        1 AS depth
    FROM folders WHERE parent_id IS NULL
    UNION ALL
    SELECT
        f.id, f.name, f.parent_id, f.department_id, f.location_id,
        CONCAT(ft.full_path, ' / ', f.name),
        ft.depth + 1
    FROM folders f
    JOIN folder_tree ft ON f.parent_id = ft.id
)
SELECT * FROM folder_tree;

-- View: User with their groups
-- MySQL uses GROUP_CONCAT instead of ARRAY_AGG
CREATE OR REPLACE VIEW v_users_with_groups AS
SELECT
    u.id AS user_id,
    u.username,
    u.email,
    u.display_name,
    u.status,
    u.last_login_at,
    u.created_at,
    GROUP_CONCAT(sg.name ORDER BY sg.name SEPARATOR ', ') AS `groups`
FROM users u
LEFT JOIN user_group_memberships ugm ON u.id = ugm.user_id
LEFT JOIN security_groups sg ON ugm.group_id = sg.id
GROUP BY u.id;

-- View: Security groups with their granted permissions
-- Returns one row per group with a comma-separated list of permission keys and a count.
CREATE OR REPLACE VIEW v_groups_with_permissions AS
SELECT
    sg.id AS group_id,
    sg.name AS group_name,
    sg.description AS group_description,
    sg.created_at,
    sg.updated_at,
    GROUP_CONCAT(p.perm_key ORDER BY p.category, p.sort_order SEPARATOR ',') AS permission_keys,
    GROUP_CONCAT(p.label ORDER BY p.category, p.sort_order SEPARATOR ', ') AS permission_labels,
    COUNT(gp.id) AS permission_count
FROM security_groups sg
LEFT JOIN group_permissions gp ON sg.id = gp.group_id
LEFT JOIN permissions p ON gp.permission_id = p.id
GROUP BY sg.id;

-- View: Flattened user permissions (all permissions a user has across all groups)
-- Useful for authorization checks:
--   SELECT 1 FROM v_user_permissions WHERE user_id = ? AND permission_key = 'uploadFiles'
CREATE OR REPLACE VIEW v_user_permissions AS
SELECT DISTINCT
    u.id AS user_id,
    u.username,
    p.perm_key AS permission_key,
    p.label AS permission_label,
    p.category AS permission_category,
    sg.name AS granted_via_group
FROM users u
JOIN user_group_memberships ugm ON u.id = ugm.user_id
JOIN security_groups sg ON ugm.group_id = sg.id
JOIN group_permissions gp ON sg.id = gp.group_id
JOIN permissions p ON gp.permission_id = p.id
WHERE u.status = 'active';

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
-- 13. SEED DATA
-- ============================================================

-- Default security groups
INSERT INTO security_groups (name, description) VALUES
    ('Administrator', 'Full system access including administration panel'),
    ('User', 'Standard document access, upload, and folder management'),
    ('Read Only', 'View-only access to documents and folders'),
    ('Manager', 'Department-level management and reporting access');

-- Default permissions (13 granular permissions across 4 categories)
-- These match the PERMISSION_LABELS in the React frontend exactly.
INSERT INTO permissions (perm_key, label, category, description, sort_order) VALUES
    -- Documents (category sort: 1)
    ('viewFiles',         'View Files',          'Documents',      'Browse and preview uploaded documents',          10),
    ('uploadFiles',       'Upload Files',        'Documents',      'Upload new PDF files to folders',                20),
    ('deleteFiles',       'Delete Files',        'Documents',      'Remove uploaded files permanently',              30),
    ('renameFiles',       'Rename Files',        'Documents',      'Rename uploaded file display names',             40),
    -- Folders (category sort: 2)
    ('createFolders',     'Create Folders',      'Folders',        'Create new folders and subfolders',              50),
    ('deleteFolders',     'Delete Folders',      'Folders',        'Remove folders and their contents',              60),
    -- Administration (category sort: 3)
    ('manageLocations',   'Manage Locations',    'Administration', 'Add, edit, and remove dealer locations',         70),
    ('manageDepartments', 'Manage Departments',  'Administration', 'Add, edit, and remove departments',             80),
    ('manageUsers',       'Manage Users',        'Administration', 'Create, edit, and deactivate user accounts',    90),
    ('manageGroups',      'Manage Groups',       'Administration', 'Edit security groups and permissions',          100),
    ('manageSettings',    'Manage Settings',     'Administration', 'Modify application configuration',             110),
    -- Audit (category sort: 4)
    ('viewAuditLog',      'View Audit Log',      'Audit',          'View system activity and change history',       120),
    ('exportAuditLog',    'Export Audit Log',     'Audit',          'Download audit log data as CSV',                130);

-- Grant permissions to groups
-- Administrator: ALL permissions (13/13)
INSERT INTO group_permissions (group_id, permission_id)
SELECT sg.id, p.id
FROM security_groups sg
CROSS JOIN permissions p
WHERE sg.name = 'Administrator';

-- User: viewFiles, uploadFiles, renameFiles, createFolders (4/13)
INSERT INTO group_permissions (group_id, permission_id)
SELECT sg.id, p.id
FROM security_groups sg
CROSS JOIN permissions p
WHERE sg.name = 'User'
  AND p.perm_key IN ('viewFiles', 'uploadFiles', 'renameFiles', 'createFolders');

-- Read Only: viewFiles only (1/13)
INSERT INTO group_permissions (group_id, permission_id)
SELECT sg.id, p.id
FROM security_groups sg
CROSS JOIN permissions p
WHERE sg.name = 'Read Only'
  AND p.perm_key IN ('viewFiles');

-- Manager: Documents + Folders + manageDepartments + Audit (10/13)
INSERT INTO group_permissions (group_id, permission_id)
SELECT sg.id, p.id
FROM security_groups sg
CROSS JOIN permissions p
WHERE sg.name = 'Manager'
  AND p.perm_key IN (
    'viewFiles', 'uploadFiles', 'deleteFiles', 'renameFiles',
    'createFolders', 'deleteFolders',
    'manageDepartments',
    'viewAuditLog', 'exportAuditLog'
  );

-- Default locations
INSERT INTO locations (name) VALUES
    ('Tampa'),
    ('Lakeland'),
    ('Fort Myers');

-- Default departments for each location
INSERT INTO departments (name, location_id)
SELECT d.dept_name, l.id
FROM locations l
CROSS JOIN (
    SELECT 'Service' AS dept_name UNION ALL
    SELECT 'Parts' UNION ALL
    SELECT 'Sales' UNION ALL
    SELECT 'Admin'
) d;

-- ============================================================
-- 14. STORED PROCEDURES & FUNCTIONS
-- ============================================================

DELIMITER //

-- Procedure: Log an audit entry (call from your API/backend)
-- Usage: CALL log_audit('File Uploaded', 'details here', @user_id, 'Admin User', NULL, @out_id);
CREATE PROCEDURE log_audit(
    IN p_action VARCHAR(100),
    IN p_detail TEXT,
    IN p_user_id CHAR(36),
    IN p_user_name VARCHAR(200),
    IN p_ip VARCHAR(45),
    OUT p_out_id CHAR(36)
)
BEGIN
    SET p_out_id = UUID();
    INSERT INTO audit_log (id, action, detail, user_id, user_name, ip_address)
    VALUES (p_out_id, p_action, p_detail, p_user_id, p_user_name, p_ip);
END //

-- Function: Check if a user has a specific permission
-- Usage: SELECT has_permission(@user_id, 'uploadFiles');
CREATE FUNCTION has_permission(
    p_user_id CHAR(36),
    p_permission_key VARCHAR(100)
) RETURNS TINYINT(1)
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_exists INT DEFAULT 0;
    SELECT COUNT(*) INTO v_exists
    FROM user_group_memberships ugm
    JOIN group_permissions gp ON ugm.group_id = gp.group_id
    JOIN permissions p ON gp.permission_id = p.id
    WHERE ugm.user_id = p_user_id
      AND p.perm_key = p_permission_key
    LIMIT 1;
    RETURN v_exists > 0;
END //

-- Procedure: Grant a permission to a group
-- Usage: CALL grant_permission_to_group(@group_id, 'uploadFiles', @admin_user_id);
CREATE PROCEDURE grant_permission_to_group(
    IN p_group_id CHAR(36),
    IN p_permission_key VARCHAR(100),
    IN p_granted_by CHAR(36)
)
BEGIN
    INSERT IGNORE INTO group_permissions (group_id, permission_id, granted_by)
    SELECT p_group_id, p.id, p_granted_by
    FROM permissions p
    WHERE p.perm_key = p_permission_key;
END //

-- Procedure: Revoke a permission from a group
-- Usage: CALL revoke_permission_from_group(@group_id, 'uploadFiles');
CREATE PROCEDURE revoke_permission_from_group(
    IN p_group_id CHAR(36),
    IN p_permission_key VARCHAR(100)
)
BEGIN
    DELETE gp FROM group_permissions gp
    JOIN permissions p ON gp.permission_id = p.id
    WHERE gp.group_id = p_group_id
      AND p.perm_key = p_permission_key;
END //

-- Procedure: Set all permissions for a group at once (replaces existing)
-- Accepts a comma-separated string of permission keys.
-- Usage: CALL set_group_permissions(@group_id, 'viewFiles,uploadFiles,renameFiles,createFolders', @admin_user_id);
CREATE PROCEDURE set_group_permissions(
    IN p_group_id CHAR(36),
    IN p_permission_keys_csv TEXT,
    IN p_granted_by CHAR(36)
)
BEGIN
    -- Remove all existing permissions for this group
    DELETE FROM group_permissions WHERE group_id = p_group_id;

    -- Insert the new set using FIND_IN_SET on the CSV string
    INSERT INTO group_permissions (group_id, permission_id, granted_by)
    SELECT p_group_id, p.id, p_granted_by
    FROM permissions p
    WHERE FIND_IN_SET(p.perm_key, p_permission_keys_csv) > 0;
END //

-- Procedure: Get all permission keys for a user (returns result set)
-- Usage: CALL get_user_permissions(@user_id);
CREATE PROCEDURE get_user_permissions(
    IN p_user_id CHAR(36)
)
BEGIN
    SELECT DISTINCT p.perm_key
    FROM user_group_memberships ugm
    JOIN group_permissions gp ON ugm.group_id = gp.group_id
    JOIN permissions p ON gp.permission_id = p.id
    WHERE ugm.user_id = p_user_id
    ORDER BY p.perm_key;
END //

-- Procedure: Get a group's permissions as a JSON object { key: true/false }
-- Returns one row with a JSON column matching the React frontend format.
-- Usage: CALL get_group_permissions_json(@group_id);
CREATE PROCEDURE get_group_permissions_json(
    IN p_group_id CHAR(36)
)
BEGIN
    SELECT JSON_OBJECTAGG(
        p.perm_key,
        IF(gp.id IS NOT NULL, CAST(TRUE AS JSON), CAST(FALSE AS JSON))
    ) AS permissions
    FROM permissions p
    LEFT JOIN group_permissions gp ON p.id = gp.permission_id AND gp.group_id = p_group_id;
END //

DELIMITER ;

-- ============================================================
-- 15. ENTITY RELATIONSHIP SUMMARY
-- ============================================================
--
--  ┌──────────────────┐
--  │  security_groups  │
--  └────────┬─────────┘
--           │ many-to-many
--  ┌────────┴─────────────────┐     ┌──────────────────┐
--  │ user_group_memberships   │     │   permissions     │
--  └────────┬─────────────────┘     └────────┬─────────┘
--           │                                │
--           │                       ┌────────┴─────────────────┐
--           │                       │   group_permissions      │
--           │                       │   (group ↔ permission)   │
--           │                       └──────────────────────────┘
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
--  React State                     Table(s)                        Notes
--  ──────────────────────────────  ──────────────────────────────  ──────────────────────────────
--  loggedInUser                    users                           Auth via password_hash
--  loggedInUser.groups             user_group_memberships          Junction to security_groups
--  securityGroups                  security_groups                 id, name, description
--  securityGroups[].permissions    group_permissions + permissions  Junction; React uses key→bool map,
--                                                                  DB uses presence/absence of row
--  PERMISSION_LABELS               permissions                     perm_key, label, category, description
--  PERMISSION_CATEGORIES           permissions.category            Derived from DISTINCT categories
--  locations                       locations                       id, name
--  departments                     departments                     id, name, location_id
--  folders                         folders                         id, name, location_id,
--                                                                  department_id, parent_id
--  files                           files                           id, name, folder_id, size,
--                                                                  type, pages, text, status
--  files[].fileDataUrl             file_storage_path               Store raw file in S3/disk,
--                                                                  reference path in DB
--  auditLog                        audit_log                       action, detail, user, timestamp
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
--    Call log_audit() from your API on every create/update/delete:
--      CALL log_audit('File Uploaded', 'details...', @user_id, 'Admin User', NULL, @out_id);
--    The audit_log table should be append-only — never UPDATE or DELETE rows.
--
-- 5. FULL-TEXT SEARCH:
--    Query extracted text with MySQL FULLTEXT:
--      SELECT * FROM files
--      WHERE MATCH(extracted_text) AGAINST('search terms' IN BOOLEAN MODE);
--
-- 6. RECURSIVE FOLDER QUERIES:
--    Use the v_folder_paths view, or write CTEs:
--      WITH RECURSIVE tree AS ( ... ) SELECT * FROM tree WHERE id = ?;
--
-- 7. DASHBOARD STATS:
--    Files uploaded today:
--      SELECT COUNT(*) FROM files WHERE uploaded_at >= CURDATE();
--    Folders created today:
--      SELECT COUNT(*) FROM folders WHERE created_at >= CURDATE();
--    Use v_location_stats for the per-location breakdown.
--
-- 8. PERMISSION CHECKS:
--    Quick boolean check in API middleware:
--      SELECT has_permission(@user_id, 'uploadFiles');
--
--    Get all permissions for a user (cache in JWT or session):
--      CALL get_user_permissions(@user_id);
--
--    Check via view (for joins/queries):
--      SELECT 1 FROM v_user_permissions
--      WHERE user_id = ? AND permission_key = 'manageUsers';
--
-- 9. MANAGING GROUP PERMISSIONS (from the admin UI):
--    Toggle a single permission on:
--      CALL grant_permission_to_group(@group_id, 'deleteFiles', @admin_user_id);
--
--    Toggle a single permission off:
--      CALL revoke_permission_from_group(@group_id, 'deleteFiles');
--
--    Replace all permissions at once (comma-separated keys):
--      CALL set_group_permissions(
--          @group_id,
--          'viewFiles,uploadFiles,renameFiles,createFolders',
--          @admin_user_id
--      );
--
--    Get a group's current permissions:
--      SELECT * FROM v_groups_with_permissions WHERE group_id = ?;
--
--    Get as React-compatible JSON object:
--      CALL get_group_permissions_json(@group_id);
--      -- Returns: {"viewFiles": true, "uploadFiles": false, ...}
--
-- 10. REACT ↔ API PERMISSION MAPPING:
--     The React frontend stores permissions as { viewFiles: true, uploadFiles: false, ... }
--     The database stores granted permissions as rows in group_permissions.
--
--     To convert DB → React JSON format:
--       CALL get_group_permissions_json(@group_id);
--
--     To convert React format → DB (on save):
--       Extract the keys where value is true into a CSV string, then call:
--       CALL set_group_permissions(@group_id, 'viewFiles,uploadFiles,...', @admin_user_id);
--
