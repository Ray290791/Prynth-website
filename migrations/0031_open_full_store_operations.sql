-- Migration 0031: Remove Interim Phase Limitations and Fully Open Store Operations
-- 1. Make all catalog products sellable
UPDATE products SET sellable = true;

-- 2. Open all store operations and service checkouts in site_settings
INSERT INTO site_settings (key, value)
VALUES
  ('checkout_enabled', 'true'),
  ('custom_orders_enabled', 'true'),
  ('lithophane_enabled', 'true'),
  ('pegboard_checkout_enabled', 'true'),
  ('cod_enabled', 'true'),
  ('payment_cod_enabled', 'true'),
  ('allowed_delivery_states', '["All India"]'),
  ('max_orders_per_day', '1000'),
  ('max_orders_per_week', '5000'),
  ('profit_target_inr', '10000000')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
