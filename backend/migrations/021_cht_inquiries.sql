-- Credit Hold Tracker permissions
INSERT IGNORE INTO permissions (perm_key, label, category, description, sort_order) VALUES
    ('view_cht', 'View Credit Hold Tracker', 'Credit Hold Tracker', 'Access Credit Hold Tracker app', 200),
    ('cht_inquiry_submit', 'Submit Inquiries', 'Credit Hold Tracker', 'Submit credit hold inquiries', 210),
    ('cht_inquiry_view', 'View Inquiries', 'Credit Hold Tracker', 'View credit hold inquiries', 220);

-- Grant view_cht to Administrator group (already has all other permissions)
INSERT IGNORE INTO group_permissions (group_id, permission_id)
SELECT sg.id, p.id
FROM security_groups sg
CROSS JOIN permissions p
WHERE sg.name = 'Administrator'
  AND p.perm_key IN ('view_cht', 'cht_inquiry_submit', 'cht_inquiry_view');

-- Grant view_cht to User group
INSERT IGNORE INTO group_permissions (group_id, permission_id)
SELECT sg.id, p.id
FROM security_groups sg
CROSS JOIN permissions p
WHERE sg.name = 'User'
  AND p.perm_key = 'view_cht';

-- Credit Hold Inquiries table
CREATE TABLE IF NOT EXISTS cht_inquiries (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    invoice_number VARCHAR(255) NOT NULL,
    notes TEXT,
    status ENUM('pending', 'in_review', 'resolved', 'closed') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),
    CONSTRAINT cht_inquiries_ibfk_1 FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;