-- SAML/SSO Settings Table
-- Stores configuration for Azure Entra ID SAML authentication

CREATE TABLE IF NOT EXISTS saml_settings (
    id INT PRIMARY KEY DEFAULT 1,
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Identity Provider (Azure Entra) Settings
    idp_entity_id VARCHAR(500),
    idp_sso_url VARCHAR(500),
    idp_slo_url VARCHAR(500),
    idp_x509_cert_encrypted TEXT,-- Service Provider (This Application) Settings
    sp_entity_id VARCHAR(500),
    sp_acs_url VARCHAR(500),
    sp_slo_url VARCHAR(500),
    
    -- Attribute Mapping (which SAML attributes map to user fields)
    attribute_email VARCHAR(100) DEFAULT 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
    attribute_name VARCHAR(100) DEFAULT 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name',
    attribute_username VARCHAR(100) DEFAULT 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/upn',
    
    -- User Provisioning Settings
    auto_provision BOOLEAN NOT NULL DEFAULT TRUE,
    default_group_id CHAR(36),
    
    -- Local Login Settings
    allow_local_login BOOLEAN NOT NULL DEFAULT TRUE,
    
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Add auth_provider column to users table if it doesn't exist
-- Using a simple approach that ignores errors if column exists
SET @s = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.columns 
     WHERE table_schema = DATABASE() 
     AND table_name = 'users' 
     AND column_name = 'auth_provider') > 0,
    'SELECT 1',
    'ALTER TABLE users ADD COLUMN auth_provider VARCHAR(50) DEFAULT ''local'''
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add external_id column to users table if it doesn't exist
SET @s = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.columns 
     WHERE table_schema = DATABASE() 
     AND table_name = 'users' 
     AND column_name = 'external_id') > 0,
    'SELECT 1',
    'ALTER TABLE users ADD COLUMN external_id VARCHAR(255) DEFAULT NULL'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add indexes for external_id lookups (ignore if exists)
SET @s = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.statistics 
     WHERE table_schema = DATABASE() 
     AND table_name = 'users' 
     AND index_name = 'idx_users_external_id') > 0,
    'SELECT 1',
    'CREATE INDEX idx_users_external_id ON users (external_id)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.statistics 
     WHERE table_schema = DATABASE() 
     AND table_name = 'users' 
     AND index_name = 'idx_users_auth_provider') > 0,
    'SELECT 1',
    'CREATE INDEX idx_users_auth_provider ON users (auth_provider)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Insert default settings row
INSERT INTO saml_settings (id, enabled, allow_local_login) 
VALUES (1, FALSE, TRUE)
ON DUPLICATE KEY UPDATE id = id;