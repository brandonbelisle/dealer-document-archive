-- Add avatar_url column to users table for profile images
-- This stores profile image URLs from SSO providers (e.g., Microsoft Entra)

ALTER TABLE users ADD COLUMN avatar_url VARCHAR(500) NULL AFTER display_name;