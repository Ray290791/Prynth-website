-- Migration 0024: Add content_hash column and unique index for 3D model deduplication
ALTER TABLE IF EXISTS custom_files ADD COLUMN IF NOT EXISTS content_hash TEXT;

-- Unique index to prevent duplicate file uploads with identical byte content
CREATE UNIQUE INDEX IF NOT EXISTS idx_custom_files_content_hash 
ON custom_files (content_hash) 
WHERE content_hash IS NOT NULL;
