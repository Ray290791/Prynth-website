CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT INTO site_settings (key, value)
VALUES
  ('tagline', 'Quality prints at honest prices. No catches — just good work, done right.'),
  ('email', 'hello@prynth.in'),
  ('instagram', '@prynth'),
  ('copyright', 'Ships across India'),
  ('bottom_text', 'Prices include packaging. Made to order.')
ON CONFLICT (key) DO NOTHING;
