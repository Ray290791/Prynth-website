-- Alter the orders table to add Razorpay details and shipping address
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS order_number text,
ADD COLUMN IF NOT EXISTS shipping_address jsonb,
ADD COLUMN IF NOT EXISTS shipping_method text,
ADD COLUMN IF NOT EXISTS payment_method text,
ADD COLUMN IF NOT EXISTS payment_meta text,
ADD COLUMN IF NOT EXISTS razorpay_order_id text,
ADD COLUMN IF NOT EXISTS razorpay_payment_id text,
ADD COLUMN IF NOT EXISTS payment_status text not null default 'pending',
ADD COLUMN IF NOT EXISTS subtotal numeric not null default 0.00,
ADD COLUMN IF NOT EXISTS shipping numeric not null default 0.00,
ADD COLUMN IF NOT EXISTS extra numeric not null default 0.00,
ADD COLUMN IF NOT EXISTS notes text;

-- Create an index on order_number for fast lookups
CREATE INDEX IF NOT EXISTS orders_order_number_idx ON orders (order_number);
