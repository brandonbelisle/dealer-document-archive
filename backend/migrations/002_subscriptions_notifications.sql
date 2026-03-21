-- Migration: Add subscriptions and notifications tables
-- Note: Run this after ensuring users and files tables exist

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  subscription_type ENUM('location', 'department', 'folder') NOT NULL,
  subscription_id CHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_subscription (subscription_type, subscription_id),
  UNIQUE KEY unique_subscription (user_id, subscription_type, subscription_id)
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  notification_type ENUM('folder_upload', 'location_upload', 'department_upload') NOT NULL DEFAULT 'folder_upload',
  item_type ENUM('location', 'department', 'folder') NOT NULL,
  item_id CHAR(36),
  item_name VARCHAR(255),
  location_name VARCHAR(255),
  department_name VARCHAR(255),
  file_name VARCHAR(500),
  file_id CHAR(36),
  created_by_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  read_at TIMESTAMP NULL,
  INDEX idx_user_read (user_id, read_at),
  INDEX idx_created_at (created_at)
);

-- Add foreign keys (run these separately if tables already exist)
-- ALTER TABLE subscriptions ADD CONSTRAINT fk_subscriptions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
-- ALTER TABLE notifications ADD CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
-- ALTER TABLE notifications ADD CONSTRAINT fk_notifications_file FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE SET NULL;