-- Migration: Add unique constraint to prevent duplicate folder names

-- Disable safe update mode for this session
SET SQL_SAFE_UPDATES = 0;

-- First, remove any existing duplicates for root folders (parent_id IS NULL)
DELETE f1 FROM folders f1
INNER JOIN folders f2 ON f1.name = f2.name 
    AND f1.location_id = f2.location_id 
    AND f1.department_id = f2.department_id 
    AND f1.parent_id IS NULL AND f2.parent_id IS NULL
    AND f1.created_at > f2.created_at;

-- Remove duplicates for subfolders (parent_id IS NOT NULL)
DELETE f1 FROM folders f1
INNER JOIN folders f2 ON f1.name = f2.name 
    AND f1.location_id = f2.location_id 
    AND f1.department_id = f2.department_id 
    AND f1.parent_id = f2.parent_id
    AND f1.created_at > f2.created_at;

-- Re-enable safe update mode
SET SQL_SAFE_UPDATES = 1;

-- For subfolders (non-NULL parent_id), add a unique constraint
-- Note: MySQL allows multiple NULL values in a unique index, so root folders (parent_id = NULL)
-- won't be constrained by this. Application logic handles root folder uniqueness.
ALTER TABLE folders 
ADD UNIQUE INDEX unique_folder_subfolder (name, location_id, department_id, parent_id);