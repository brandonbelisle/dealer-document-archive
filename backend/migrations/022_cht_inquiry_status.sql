-- Add is_closed column to cht_inquiries table
ALTER TABLE cht_inquiries ADD COLUMN is_closed TINYINT(1) NOT NULL DEFAULT 0 AFTER status_id;

-- Create index for is_closed for filtering
CREATE INDEX idx_is_closed ON cht_inquiries(is_closed);