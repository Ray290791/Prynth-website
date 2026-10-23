-- Migration 0025: Cloudflare R2 object storage key for custom 3D model files
-- Stores 3D files in R2 bucket and keeps only the object key in Postgres,
-- avoiding base64 encoding bloat and reducing Worker memory pressure.

ALTER TABLE custom_files ADD COLUMN IF NOT EXISTS r2_key TEXT;
ALTER TABLE custom_files ALTER COLUMN file_data DROP NOT NULL;
CREATE INDEX IF NOT EXISTS idx_custom_files_r2_key ON custom_files (r2_key) WHERE r2_key IS NOT NULL;
