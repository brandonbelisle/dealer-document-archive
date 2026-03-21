-- Add metadata URL support for SAML settings
-- This allows using Azure's App Federation Metadata URL instead of manual certificate entry

ALTER TABLE saml_settings 
ADD COLUMN idp_metadata_url VARCHAR(1000) NULL AFTER idp_slo_url;