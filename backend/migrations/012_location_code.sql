-- Add location_code column to locations table
ALTER TABLE locations ADD COLUMN location_code VARCHAR(10) DEFAULT NULL AFTER name;

-- Add unique index on location_code
CREATE UNIQUE INDEX idx_location_code ON locations(location_code);