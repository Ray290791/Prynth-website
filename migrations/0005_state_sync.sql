ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal numeric not null default 0.00;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping numeric not null default 0.00;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS extra numeric not null default 0.00;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_address jsonb;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_method text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS razorpay_order_id text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS razorpay_payment_id text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS notes text;

create table if not exists product_views (
  id serial primary key,
  user_id text not null,
  slug text not null,
  viewed_at timestamptz not null default now()
);
create index if not exists product_views_user_id_idx on product_views (user_id);
