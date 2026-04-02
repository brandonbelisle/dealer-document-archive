-- Add FOLDER_BACKFILL scheduled task (manual run only)

INSERT INTO dms_schedules (id, name, description, task_type, query_config, enabled, interval_minutes)
VALUES (
    UUID(),
    'FOLDER BACKFILL',
    'Backfill CusId and EmpId for existing folders by matching SlsId from DMS. This is a one-time run task.',
    'FOLDER_BACKFILL',
    '{"table": "SVSLS"}',
    FALSE,
    0
);