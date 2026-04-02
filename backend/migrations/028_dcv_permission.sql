-- Add view_dcv permission for Dealer Customer Vision

INSERT INTO permissions (id, perm_key, label, category, description, sort_order)
VALUES (UUID(), 'view_dcv', 'Access DCV', 'Apps', 'Access Dealer Customer Vision', 205);

-- Grant view_dcv to Administrator group
INSERT INTO group_permissions (id, group_id, permission_id, granted_by)
SELECT UUID(), g.id, p.id, NULL
FROM security_groups g, permissions p
WHERE g.name = 'Administrator'
AND p.perm_key = 'view_dcv'
AND NOT EXISTS (
    SELECT 1 FROM group_permissions gp WHERE gp.group_id = g.id AND gp.permission_id = p.id
);