-- Add key_filename column for private key storage
ALTER TABLE ssl_certificates
ADD COLUMN key_filename VARCHAR(255) DEFAULT NULL AFTER filename;