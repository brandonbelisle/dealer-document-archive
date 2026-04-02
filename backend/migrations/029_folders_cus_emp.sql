-- Add CusId and EmpId columns to folders table for DMS sync

ALTER TABLE folders
ADD COLUMN cus_id VARCHAR(100) DEFAULT NULL COMMENT 'Customer ID from DMS',
ADD COLUMN emp_id VARCHAR(100) DEFAULT NULL COMMENT 'Employee ID from DMS';

CREATE INDEX idx_folders_cus_id ON folders (cus_id);
CREATE INDEX idx_folders_emp_id ON folders (emp_id);