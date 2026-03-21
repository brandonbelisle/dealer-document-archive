-- Migration: Add subscriptions and notifications tables

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  subscription_type ENUM('location', 'department', 'folder') NOT NULL,
  subscription_id VARCHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_subscription (user_id, subscription_type, subscription_id),
  INDEX idx_user_id (user_id),
  INDEX idx_subscription (subscription_type, subscription_id)
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  notification_type ENUM('folder_upload', 'location_upload', 'department_upload') NOT NULL DEFAULT 'folder_upload',
  item_type ENUM('location', 'department', 'folder') NOT NULL,
  item_id VARCHAR(36),
  item_name VARCHAR(255),
  location_name VARCHAR(255),
  department_name VARCHAR(255),
  file_name VARCHAR(500),
  file_id VARCHAR(36),
  created_by_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  read_at TIMESTAMP NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE SET NULL,
  INDEX idx_user_read (user_id, read_at),
  INDEX idx_created_at (created_at)
);