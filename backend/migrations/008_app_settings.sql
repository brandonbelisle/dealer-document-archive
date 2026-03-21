CREATE TABLE IF NOT EXISTS app_settings (
    id              INT PRIMARY KEY AUTO_INCREMENT,
    `key`           VARCHAR(100) NOT NULL UNIQUE,
    `value`         TEXT,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT IGNORE INTO app_settings (`key`, `value`) VALUES ('support_email', '');