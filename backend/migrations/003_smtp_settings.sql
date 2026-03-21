-- Migration 003: SMTP Settings
-- Stores email/SMTP configuration for sending emails

CREATE TABLE IF NOT EXISTS smtp_settings (
  id INT PRIMARY KEY DEFAULT 1,
  host VARCHAR(255) NOT NULL DEFAULT '',
  port INT NOT NULL DEFAULT 587,
  secure BOOLEAN NOT NULL DEFAULT FALSE,
  username VARCHAR(255) NOT NULL DEFAULT '',
  password_encrypted TEXT NOT NULL DEFAULT '',
  from_email VARCHAR(255) NOT NULL DEFAULT '',
  from_name VARCHAR(255) NOT NULL DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Insert default empty row
INSERT INTO smtp_settings (id) VALUES (1) ON DUPLICATE KEY UPDATE id = 1;