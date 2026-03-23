-- Add columns for storing preview URL and generation timestamp (if they don't exist)
ALTER TABLE files ADD COLUMN IF NOT EXISTS preview_url VARCHAR(2000) AFTER file_storage_path;
ALTER TABLE files ADD COLUMN IF NOT EXISTS preview_url_generated_at DATETIME AFTER preview_url;
