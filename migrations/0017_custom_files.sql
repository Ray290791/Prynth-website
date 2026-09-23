CREATE TABLE IF NOT EXISTS custom_files (
  id TEXT PRIMARY KEY,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  file_data TEXT NOT NULL, -- Base64 data string
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
