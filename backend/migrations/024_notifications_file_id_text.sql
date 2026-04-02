-- Migration: Change file_id column to TEXT to support multiple file IDs in batch uploads

ALTER TABLE notifications 
MODIFY COLUMN file_id TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;