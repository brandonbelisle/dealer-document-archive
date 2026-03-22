-- Add passphrase column for encrypted private keys
ALTER TABLE ssl_certificates
ADD COLUMN passphrase VARCHAR(255) DEFAULT NULL AFTER key_filename;