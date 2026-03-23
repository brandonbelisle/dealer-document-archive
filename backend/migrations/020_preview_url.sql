-- Add columns for storing preview URL and generation timestamp
ALTER TABLE files ADD COLUMN preview_url VARCHAR(2000) AFTER file_storage_path;
ALTER TABLE files ADD COLUMN preview_url_generated_at DATETIME AFTER preview_url;

-- Index for faster lookups
CREATE INDEX idx_files_preview_url_generated ON files (preview_url_generated_at);
