-- Migration 0029: Interim Selling Phase Safety Controls & Schema
-- Tables: waitlist, admin_audit_logs, order_adjustments, order_item_production_logs
-- Columns: products.sellable, products.unit_cost_inr, products.packaging_cost_inr, orders.settled, etc.

-- 1. Waitlist capture (A5)
CREATE TABLE IF NOT EXISTS waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  interest TEXT NOT NULL DEFAULT 'launch', -- 'launch', 'custom', 'lithophane', 'pegboard', or product slug
  consent_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  consent_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  unsubscribed_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS waitlist_email_interest_idx ON waitlist(LOWER(email), interest) WHERE unsubscribed_at IS NULL;

-- 2. Admin Audit Logs (A1)
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_email TEXT NOT NULL,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Sellable Products Allowlist & Unit Costs (C1, D1)
ALTER TABLE products ADD COLUMN IF NOT EXISTS sellable BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS unit_cost_inr NUMERIC(10, 2) NOT NULL DEFAULT 0.00;
ALTER TABLE products ADD COLUMN IF NOT EXISTS packaging_cost_inr NUMERIC(10, 2) NOT NULL DEFAULT 0.00;

-- Enable approved initial catalog items, disable weight-bearing or unconfirmed items
UPDATE products SET sellable = true WHERE slug IN (
  'hex-coasters', 'catch-bowl', 'pen-well', 'cable-nest', 'desk-tray', 'geo-planter'
);
UPDATE products SET sellable = false WHERE slug NOT IN (
  'hex-coasters', 'catch-bowl', 'pen-well', 'cable-nest', 'desk-tray', 'geo-planter'
);

-- 4. Order Ledger Tracking & UTM Attribution (D1, D5)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS courier_actual_cost NUMERIC(10, 2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_fee_actual NUMERIC(10, 2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS settled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS settled_date TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS notes_timeline JSONB DEFAULT '[]'::jsonb;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS utm_source TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS utm_medium TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS utm_campaign TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS utm_content TEXT;

-- 5. Order Adjustments for Reprints / Defects (D1)
CREATE TABLE IF NOT EXISTS order_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL,
  reason TEXT NOT NULL,
  amount_inr NUMERIC(10, 2) NOT NULL,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 6. Machine-Time & Production Logging (D2)
CREATE TABLE IF NOT EXISTS order_item_production_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id TEXT NOT NULL,
  order_number TEXT NOT NULL,
  printer_label TEXT,
  print_minutes INTEGER DEFAULT 0,
  filament_grams NUMERIC(10, 2) DEFAULT 0,
  printed_by TEXT,
  printed_on TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  qc_passed BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 7. Initialize Safety Flags & Defaults in site_settings (A1, A3, A4, C2, C3, C4, B3, B4, D1)
INSERT INTO site_settings (key, value)
VALUES
  ('checkout_enabled', 'false'),
  ('max_orders_per_day', '3'),
  ('max_orders_per_week', '10'),
  ('profit_target_inr', '10000'),
  ('custom_orders_enabled', 'false'),
  ('lithophane_enabled', 'false'),
  ('pegboard_checkout_enabled', 'false'),
  ('cod_enabled', 'false'),
  ('payment_cod_enabled', 'false'),
  ('allowed_delivery_states', '["Maharashtra"]'),
  ('turnaround_min_days', '4'),
  ('turnaround_max_days', '7'),
  ('invoice_mode', 'receipt'),
  ('payment_fee_percent', '2.0'),
  ('gst_on_fee_percent', '18.0')
ON CONFLICT (key) DO NOTHING;

