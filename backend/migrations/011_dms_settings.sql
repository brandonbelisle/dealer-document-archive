-- DMSConnection Settings
-- Stores Microsoft SQL Server connection details for querying external DMS

CREATE TABLE IF NOT EXISTS dms_settings (
    id INT PRIMARY KEY DEFAULT 1,
    server VARCHAR(255) NOT NULL DEFAULT '',
    port INT NOT NULL DEFAULT 1433,
    database_name VARCHAR(255) NOT NULL DEFAULT '',
    username VARCHAR(255) NOT NULL DEFAULT '',
    password_encrypted TEXT,
    trust_certificate BOOLEAN NOT NULL DEFAULT FALSE,
    encrypt_connection BOOLEAN NOT NULL DEFAULT TRUE,
    query_interval_minutes INT NOT NULL DEFAULT 5,
    last_query_at DATETIME,
    last_query_status VARCHAR(50),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Insert default empty settings
INSERT INTO dms_settings (id, server, port, database_name, username)
VALUES (1, '', 1433, '', '')
ON DUPLICATE KEY UPDATE id = id;