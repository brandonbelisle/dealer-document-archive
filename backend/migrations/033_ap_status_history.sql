-- ============================================================
-- MIGRATION 033: AP Status History Table
-- ============================================================
-- Tracks workflow status changes for audit trail

CREATE TABLE IF NOT EXISTS ap_status_history (
    id          CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    document_id CHAR(36) NOT NULL,
    old_status  VARCHAR(30) NOT NULL,
    new_status  VARCHAR(30) NOT NULL,
    changed_by  CHAR(36),
    changed_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ash_document FOREIGN KEY (document_id) REFERENCES ap_documents(id) ON DELETE CASCADE,
    CONSTRAINT fk_ash_changed_by FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_ash_document_id (document_id),
    INDEX idx_ash_changed_at (changed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
