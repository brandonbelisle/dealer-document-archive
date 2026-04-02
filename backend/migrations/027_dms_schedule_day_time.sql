-- Add scheduled day and time columns for weekly scheduling
-- Allows tasks to run at a specific time on a specific day of the week

ALTER TABLE dms_schedules
ADD COLUMN schedule_day VARCHAR(10) DEFAULT NULL COMMENT 'Day of week: sun, mon, tue, wed, thu, fri, sat',
ADD COLUMN schedule_time VARCHAR(5) DEFAULT NULL COMMENT 'Time in HH:MM format (24-hour, server timezone)';

-- Update existing schedules to use interval-based scheduling (default behavior)
-- No need to set day/time for existing interval-based schedules