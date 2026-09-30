-- Add Shiprocket tracking columns to orders
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS shiprocket_order_id text,
  ADD COLUMN IF NOT EXISTS shiprocket_shipment_id text,
  ADD COLUMN IF NOT EXISTS tracking_number text,
  ADD COLUMN IF NOT EXISTS tracking_url text,
  ADD COLUMN IF NOT EXISTS courier_name text;

CREATE INDEX IF NOT EXISTS orders_shiprocket_order_id_idx ON orders (shiprocket_order_id);
