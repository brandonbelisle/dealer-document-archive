-- DMS Schedules
-- Stores scheduled tasks for DMS integration

CREATE TABLE IF NOT EXISTS dms_schedules (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    task_type VARCHAR(50) NOT NULL,
    query_config JSON,
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    interval_minutes INT NOT NULL DEFAULT 0,
    last_run_at DATETIME,
    last_run_status VARCHAR(50),
    last_run_message TEXT,
    last_run_count INT DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Insert default DMS TO DDA task
INSERT INTO dms_schedules (id, name, description, task_type, query_config, enabled)
VALUES (
    UUID(),
    'DMS TO DDA',
    'Pulls data from DMS and creates folders in DDA based on SlsId',
    'DMS_TO_DDA',
    '{"table": "SVSLS", "dateColumn": "DateOpen", "lookbackHours": 48}',
    FALSE
);