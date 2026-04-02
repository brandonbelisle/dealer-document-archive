-- Create service_repairorders table for DMS sync

CREATE TABLE IF NOT EXISTS service_repairorders (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    sls_id VARCHAR(100) NOT NULL,
    vin VARCHAR(100),
    odom_in INT,
    odom_out INT,
    tag VARCHAR(50),
    cus_id VARCHAR(100),
    emp_id VARCHAR(100),
    emp_id_writer VARCHAR(100),
    date_create DATETIME,
    folder_id CHAR(36),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_sls_id (sls_id),
    INDEX idx_cus_id (cus_id),
    INDEX idx_folder_id (folder_id),
    CONSTRAINT fk_service_repairorders_folder FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;