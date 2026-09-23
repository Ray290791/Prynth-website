CREATE TABLE IF NOT EXISTS printers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  model TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'available', -- 'available' | 'busy' | 'maintenance' | 'offline'
  build_volume TEXT NOT NULL DEFAULT '256 × 256 × 256 mm',
  nozzle_size TEXT NOT NULL DEFAULT '0.4 mm',
  description TEXT,
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO printers (id, name, model, status, build_volume, nozzle_size, description, order_index, is_active)
VALUES
  ('p1s-01', 'Bambu Lab P1S #1', 'Bambu Lab P1S', 'available', '256 × 256 × 256 mm', '0.4 mm Hardened Steel', 'Primary high-speed enclosed CoreXY workhorse. Handles PLA, PETG, TPU, ABS.', 1, true),
  ('p1s-02', 'Bambu Lab P1S #2 (AMS)', 'Bambu Lab P1S', 'available', '256 × 256 × 256 mm', '0.4 mm Hardened Steel', 'Secondary workhorse equipped with 4-spool AMS automatic material system.', 2, true),
  ('a1-mini-01', 'Bambu Lab A1 Mini', 'Bambu Lab A1 Mini', 'available', '180 × 180 × 180 mm', '0.4 mm Stainless Steel', 'Ultra-fast compact bed-slinger for rapid detailed miniatures & prototypes.', 3, true),
  ('x1c-01', 'Bambu Lab X1-Carbon', 'Bambu Lab X1-Carbon', 'available', '256 × 256 × 256 mm', '0.4 mm Hardened Steel', 'Flagship engineering printer with micro-lidar first layer inspection.', 4, true)
ON CONFLICT (id) DO NOTHING;
