-- Migration 019: Azure Storage Settings
-- Stores Azure Blob Storage configuration in the database

CREATE TABLE IF NOT EXISTS azure_settings (
  id INT PRIMARY KEY DEFAULT 1,
  connection_string_encrypted TEXT,
  container_name VARCHAR(255) NOT NULL DEFAULT 'documents',
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Insert default row
INSERT INTO azure_settings (id, container_name, enabled) VALUES (1, 'documents', TRUE) ON DUPLICATE KEY UPDATE id = 1;