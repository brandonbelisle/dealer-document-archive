-- Add decision_at column to track when a decision was made
ALTER TABLE cht_inquiries ADD COLUMN decision_at DATETIME NULL AFTER updated_at;

-- Create index for decision_at
CREATE INDEX idx_decision_at ON cht_inquiries(decision_at);

-- Add permission for viewing time to close
INSERT IGNORE INTO permissions (perm_key, label, category, description, sort_order) VALUES
    ('cht_view_metrics', 'View Metrics', 'Credit Hold Tracker', 'View time to close metrics on inquiries', 250);

-- Grant permission to Administrator group
INSERT IGNORE INTO group_permissions (group_id, permission_id)
SELECT sg.id, p.id
FROM security_groups sg
CROSS JOIN permissions p
WHERE sg.name = 'Administrator'
  AND p.perm_key = 'cht_view_metrics';