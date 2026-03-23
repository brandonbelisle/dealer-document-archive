-- Credit Hold Tracker permissions
INSERT IGNORE INTO permissions (perm_key, label, category, description, sort_order) VALUES
    ('view_cht', 'View Credit Hold Tracker', 'Credit Hold Tracker', 'Access Credit Hold Tracker app', 200),
    ('cht_inquiry_submit', 'Submit Inquiries', 'Credit Hold Tracker', 'Submit credit hold inquiries', 210),
    ('cht_inquiry_view', 'View Inquiries', 'Credit Hold Tracker', 'View own credit hold inquiries', 220),
    ('cht_inquiry_view_all', 'View All Inquiries', 'Credit Hold Tracker', 'View all credit hold inquiries', 225),
    ('cht_inquiry_accept', 'Accept Inquiries', 'Credit Hold Tracker', 'Accept and assign credit hold inquiries', 230),
    ('cht_manage_statuses', 'Manage Statuses', 'Credit Hold Tracker', 'Add, edit, and remove inquiry statuses', 240);

-- Grant view_cht to Administrator group (already has all other permissions)
INSERT IGNORE INTO group_permissions (group_id, permission_id)
SELECT sg.id, p.id
FROM security_groups sg
CROSS JOIN permissions p
WHERE sg.name = 'Administrator'
  AND p.perm_key IN ('view_cht', 'cht_inquiry_submit', 'cht_inquiry_view', 'cht_inquiry_view_all', 'cht_inquiry_accept', 'cht_manage_statuses');

-- Grant view_cht to User group
INSERT IGNORE INTO group_permissions (group_id, permission_id)
SELECT sg.id, p.id
FROM security_groups sg
CROSS JOIN permissions p
WHERE sg.name = 'User'
  AND p.perm_key = 'view_cht';

-- Credit Hold Inquiries table (drop and recreate for clean migration)
DROP TABLE IF EXISTS cht_inquiries;

CREATE TABLE cht_inquiries (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    invoice_number VARCHAR(255) NOT NULL,
    notes TEXT,
    status_id INT,
    assigned_to CHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    assigned_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_status_id (status_id),
    INDEX idx_assigned_to (assigned_to),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Credit Hold Inquiry Statuses table
CREATE TABLE IF NOT EXISTS cht_statuses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(20) NOT NULL DEFAULT '#6b7280',
    sort_order INT NOT NULL DEFAULT 0,
    is_default TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default statuses
INSERT IGNORE INTO cht_statuses (name, color, sort_order, is_default) VALUES
    ('Pending', '#f59e0b', 1, 1),
    ('In Review', '#3b82f6', 2, 0),
    ('Resolved', '#22c55e', 3, 0),
    ('Closed', '#6b7280', 4, 0);

-- Update existing inquiries to use default status
UPDATE cht_inquiries SET status_id = (SELECT id FROM cht_statuses WHERE is_default = 1 LIMIT 1) WHERE status_id IS NULL;