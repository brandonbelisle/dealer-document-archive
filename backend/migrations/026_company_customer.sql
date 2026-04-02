-- Migration: Create company_customer table and CUSTOMER SYNC scheduled tasks

-- Create company_customer table to store synced customer data from DMS
CREATE TABLE IF NOT EXISTS company_customer (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    cus_id VARCHAR(100) NOT NULL,
    name VARCHAR(255),
    addr1 VARCHAR(255),
    addr2 VARCHAR(255),
    city VARCHAR(100),
    county VARCHAR(100),
    state VARCHAR(100),
    post VARCHAR(50),
    country VARCHAR(100),
    bill_cus_id VARCHAR(100),
    bill_addr1 VARCHAR(255),
    bill_addr2 VARCHAR(255),
    bill_city VARCHAR(100),
    bill_county VARCHAR(100),
    bill_state VARCHAR(100),
    bill_post VARCHAR(50),
    bill_country VARCHAR(100),
    phone_home VARCHAR(50),
    phone_work VARCHAR(50),
    phone_other VARCHAR(50),
    email_home VARCHAR(255),
    email_work VARCHAR(255),
    email_other VARCHAR(255),
    emp_id VARCHAR(100),
    date_create DATETIME,
    date_update DATETIME,
    dms_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    dms_deleted_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE INDEX idx_cus_id (cus_id),
    INDEX idx_dms_deleted (dms_deleted)
);

-- Add CUSTOMER SYNC scheduled task (manual run only - interval_minutes = 0)
INSERT INTO dms_schedules (id, name, description, task_type, query_config, enabled, interval_minutes)
VALUES (
    UUID(),
    'CUSTOMER SYNC',
    'Syncs ALL customer data from DMS (COCUS table) to Dealer Toolbox. This is a manual run only task - runs once when triggered. Records deleted from DMS are marked but preserved.',
    'CUSTOMER_SYNC',
    '{"table": "COCUS"}',
    FALSE,
    0
);

-- Add CUSTOMER SYNC 24HR scheduled task (runs every 24 hours, only syncs records created in last 24 hours)
INSERT INTO dms_schedules (id, name, description, task_type, query_config, enabled, interval_minutes)
VALUES (
    UUID(),
    'CUSTOMER SYNC 24HR',
    'Syncs customer data created in the past 24 hours from DMS (COCUS table) to Dealer Toolbox. Runs automatically every 24 hours. Records deleted from DMS are marked but preserved.',
    'CUSTOMER_SYNC_24HR',
    '{"table": "COCUS", "dateColumn": "DateCreate", "lookbackHours": 24}',
    FALSE,
    1440
);