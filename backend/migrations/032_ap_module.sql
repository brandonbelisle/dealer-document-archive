-- ============================================================
-- MIGRATION 032: Accounts Payable (AP) Module - Phase 1
-- ============================================================
-- 1. AP Permissions
-- 2. AP Folder under Tampa -> Admin
-- 3. ap_documents table (metadata layer on top of DDA files)
-- 4. ap_extracted_fields table (OCR field extraction results)
-- ============================================================

-- ── 1. PERMISSIONS ──────────────────────────────────────────
INSERT IGNORE INTO permissions (id, perm_key, label, category, description, sort_order)
VALUES
  (UUID(), 'view_ap',        'Access Accounts Payable', 'Accounts Payable', 'Access the Accounts Payable app',       240),
  (UUID(), 'ap_upload',      'Upload AP Documents',     'Accounts Payable', 'Upload documents to Accounts Payable',  241),
  (UUID(), 'ap_review',      'Manage Review Queue',     'Accounts Payable', 'Manage non-invoice review queue',       242),
  (UUID(), 'ap_workflow',    'Manage Workflow',         'Accounts Payable', 'Change document workflow status',       243);

-- Grant AP permissions to Administrator group
INSERT IGNORE INTO group_permissions (id, group_id, permission_id, granted_by)
SELECT UUID(), g.id, p.id, NULL
FROM security_groups g
CROSS JOIN permissions p
WHERE g.name = 'Administrator'
  AND p.perm_key IN ('view_ap', 'ap_upload', 'ap_review', 'ap_workflow');

-- ── 2. AP FOLDER SETUP ──────────────────────────────────────
-- Find Tampa location
SET @tampa_id = (SELECT id FROM locations WHERE name = 'Tampa' LIMIT 1);

-- Find or create Admin department under Tampa
SET @admin_dept_id = (SELECT id FROM departments WHERE name = 'Admin' AND location_id = @tampa_id LIMIT 1);

-- Create AP folder under Tampa -> Admin if it doesn't exist
SET @ap_folder_id = (SELECT id FROM folders WHERE name = 'AP' AND department_id = @admin_dept_id AND parent_id IS NULL LIMIT 1);

-- If AP folder doesn't exist, create it
INSERT INTO folders (id, name, location_id, department_id, parent_id, created_by)
SELECT UUID(), 'AP', @tampa_id, @admin_dept_id, NULL, NULL
WHERE @ap_folder_id IS NULL;

-- Store AP folder ID in app_settings
SET @new_ap_folder_id = (SELECT id FROM folders WHERE name = 'AP' AND department_id = @admin_dept_id AND parent_id IS NULL LIMIT 1);

INSERT INTO app_settings (`key`, `value`, `updated_at`)
VALUES ('ap_folder_id', @new_ap_folder_id, NOW())
ON DUPLICATE KEY UPDATE `value` = @new_ap_folder_id, updated_at = NOW();

-- ── 3. AP DOCUMENTS TABLE ───────────────────────────────────
CREATE TABLE IF NOT EXISTS ap_documents (
    id                  CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    file_id             CHAR(36) NOT NULL,
    status              VARCHAR(30) NOT NULL DEFAULT 'uploaded'
                            CHECK (status IN ('uploaded', 'processing', 'classified', 'extracted', 'reviewing', 'approved', 'posted', 'rejected', 'archived')),
    document_type       VARCHAR(20) DEFAULT 'unknown'
                            CHECK (document_type IN ('invoice', 'non_invoice', 'unknown')),
    vendor_name         VARCHAR(500),
    invoice_number      VARCHAR(100),
    invoice_date        DATE,
    invoice_amount      DECIMAL(15, 2),
    po_number           VARCHAR(100),
    extracted_text      LONGTEXT,
    is_duplicate_flag   TINYINT(1) NOT NULL DEFAULT 0,
    duplicate_of_id     CHAR(36),
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by          CHAR(36),
    CONSTRAINT fk_apdoc_file      FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
    CONSTRAINT fk_apdoc_duplicate FOREIGN KEY (duplicate_of_id) REFERENCES ap_documents(id) ON DELETE SET NULL,
    CONSTRAINT fk_apdoc_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_apdoc_status        (status),
    INDEX idx_apdoc_type          (document_type),
    INDEX idx_apdoc_vendor        (vendor_name),
    INDEX idx_apdoc_invoice_num   (invoice_number),
    INDEX idx_apdoc_created_at    (created_at),
    INDEX idx_apdoc_file_id       (file_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 4. AP EXTRACTED FIELDS TABLE ────────────────────────────
CREATE TABLE IF NOT EXISTS ap_extracted_fields (
    id                  CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    document_id         CHAR(36) NOT NULL,
    field_name          VARCHAR(50) NOT NULL,
    value               TEXT,
    confidence_score    DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_apef_document FOREIGN KEY (document_id) REFERENCES ap_documents(id) ON DELETE CASCADE,
    INDEX idx_apef_document_id  (document_id),
    INDEX idx_apef_field_name   (field_name),
    UNIQUE KEY uq_apef_doc_field (document_id, field_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── 5. FULLTEXT INDEX FOR EXTRACTED TEXT SEARCH ─────────────
ALTER TABLE ap_documents ADD FULLTEXT INDEX idx_apdoc_text_search (extracted_text);
