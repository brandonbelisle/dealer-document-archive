-- ============================================================
-- MIGRATION: Location & Department Group Access Control
-- ============================================================
-- Adds the ability to restrict locations and departments
-- to specific security groups. If no groups are assigned,
-- the location/department is accessible to all authenticated users.
-- ============================================================

-- ── Location → Group access (many-to-many) ────────────────
CREATE TABLE IF NOT EXISTS location_group_access (
    id              CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    location_id     CHAR(36) NOT NULL,
    group_id        CHAR(36) NOT NULL,
    assigned_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    assigned_by     CHAR(36),
    UNIQUE KEY uq_location_group (location_id, group_id),
    CONSTRAINT fk_lga_location FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
    CONSTRAINT fk_lga_group FOREIGN KEY (group_id) REFERENCES security_groups(id) ON DELETE CASCADE,
    CONSTRAINT fk_lga_assigned_by FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_lga_location ON location_group_access (location_id);
CREATE INDEX idx_lga_group ON location_group_access (group_id);

-- ── Department → Group access (many-to-many) ──────────────
CREATE TABLE IF NOT EXISTS department_group_access (
    id              CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    department_id   CHAR(36) NOT NULL,
    group_id        CHAR(36) NOT NULL,
    assigned_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    assigned_by     CHAR(36),
    UNIQUE KEY uq_department_group (department_id, group_id),
    CONSTRAINT fk_dga_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
    CONSTRAINT fk_dga_group FOREIGN KEY (group_id) REFERENCES security_groups(id) ON DELETE CASCADE,
    CONSTRAINT fk_dga_assigned_by FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_dga_department ON department_group_access (department_id);
CREATE INDEX idx_dga_group ON department_group_access (group_id);

-- ============================================================
-- NOTES:
-- ============================================================
-- Access logic (implemented in the API):
--   - If a location has NO rows in location_group_access,
--     it is visible to ALL authenticated users (open access).
--   - If a location HAS rows in location_group_access,
--     only users belonging to at least one of those groups can see it.
--   - Same logic applies for departments via department_group_access.
--   - Administrators always have access regardless of restrictions.
-- ============================================================
