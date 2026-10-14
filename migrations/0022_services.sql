-- 0022_services.sql
-- Adds services catalog table with full admin management support

CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  tagline TEXT NOT NULL,
  short_desc TEXT NOT NULL,
  full_desc TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'PenTool',
  badge TEXT DEFAULT '',
  turnaround TEXT DEFAULT '2–4 days',
  starting_price NUMERIC DEFAULT 299,
  deliverables JSONB DEFAULT '[]'::jsonb,
  features JSONB DEFAULT '[]'::jsonb,
  process_steps JSONB DEFAULT '[]'::jsonb,
  faq JSONB DEFAULT '[]'::jsonb,
  examples JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_services_slug ON services (slug);
CREATE INDEX IF NOT EXISTS idx_services_active_sort ON services (is_active, sort_order);
