-- Add allowed_iframe_domains setting for CSP frame-src directive
INSERT INTO app_settings (`key`, `value`) VALUES ('allowed_iframe_domains', '*.blob.core.windows.net')
ON DUPLICATE KEY UPDATE `value` = COALESCE(NULLIF(`value`, ''), '*.blob.core.windows.net');
