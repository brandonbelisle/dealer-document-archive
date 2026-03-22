-- SSL Certificates table
-- Stores uploaded SSL certificates for HTTPS support

CREATE TABLE IF NOT EXISTS ssl_certificates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_ssl_certificates_name (name)
);