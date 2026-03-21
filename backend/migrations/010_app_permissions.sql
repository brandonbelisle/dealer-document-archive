-- Add app-based permission categories
-- This migration restructures permissions to be organized by app

-- First, let's add app visibility permissions to the permissions table
-- We'll use a naming convention: view_app_<appid>

-- For DDA (default app)
INSERT IGNORE INTO permissions (name, description) VALUES 
('view_dda', 'Access Dealer Document Archive');

-- For CHT
INSERT IGNORE INTO permissions (name, description) VALUES 
('view_cht', 'Access Credit Hold Tracker');

-- For Help Desk (built-in)
INSERT IGNORE INTO permissions (name, description) VALUES 
('view_help', 'Access Help Desk');

-- For Global Admin permissions (these stay as-is since they're cross-app)
-- manageUsers, manageGroups, manageLocations, manageDepartments, 
-- viewAuditLog, exportAuditLog, manageSettings

-- Add a table to track custom app visibility permissions
-- When a custom app is created, a permission entry will be added
CREATE TABLE IF NOT EXISTS custom_app_permissions (
    app_id CHAR(36) NOT NULL,
    group_id CHAR(36) NOT NULL,
    can_view BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (app_id, group_id),
    FOREIGN KEY (app_id) REFERENCES custom_apps(id) ON DELETE CASCADE,
    FOREIGN KEY (group_id) REFERENCES security_groups(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;