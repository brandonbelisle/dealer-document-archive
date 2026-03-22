-- Migration 018: Security Enhancements
-- Adds token blacklist for logout and failed login tracking for account lockout

-- Token blacklist for invalidating JWTs on logout
CREATE TABLE IF NOT EXISTS token_blacklist (
    id              CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    token           VARCHAR(512) NOT NULL UNIQUE,
    user_id         CHAR(36),
    expires_at      DATETIME NOT NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_blacklist_token (token),
    INDEX idx_blacklist_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Failed login attempts for account lockout
CREATE TABLE IF NOT EXISTS failed_login_attempts (
    id              CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    email           VARCHAR(255) NOT NULL,
    ip_address      VARCHAR(45),
    attempted_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_failed_email (email),
    INDEX idx_failed_time (attempted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add locked_until and failed_attempts columns to users table
-- Note: If you get "Duplicate column name" errors, the columns already exist - that's fine
ALTER TABLE users ADD COLUMN locked_until DATETIME NULL;
ALTER TABLE users ADD COLUMN failed_attempts INT NOT NULL DEFAULT 0;

-- Create index for locked_until (ignore error if exists)
CREATE INDEX idx_users_locked ON users (locked_until);