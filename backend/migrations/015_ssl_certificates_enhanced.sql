-- Enhanced SSL Certificates table
-- Adds is_active flag and certificate metadata columns

ALTER TABLE ssl_certificates
ADD COLUMN is_active TINYINT DEFAULT 0 AFTER filename,
ADD COLUMN issuer VARCHAR(255) DEFAULT NULL AFTER is_active,
ADD COLUMN subject VARCHAR(255) DEFAULT NULL AFTER issuer,
ADD COLUMN valid_from DATETIME DEFAULT NULL AFTER subject,
ADD COLUMN valid_to DATETIME DEFAULT NULL AFTER valid_from,
ADD COLUMN serial_number VARCHAR(255) DEFAULT NULL AFTER valid_to,
ADD COLUMN fingerprint VARCHAR(255) DEFAULT NULL AFTER serial_number;