-- Addresses Table
CREATE TABLE IF NOT EXISTS addresses (
  id serial PRIMARY KEY,
  user_id text NOT NULL,
  name text NOT NULL,
  phone text NOT NULL,
  line1 text NOT NULL,
  line2 text,
  city text NOT NULL,
  state text NOT NULL,
  pin text NOT NULL,
  is_default boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS addresses_user_id_idx ON addresses (user_id);

-- Wishlists Table
CREATE TABLE IF NOT EXISTS wishlists (
  id serial PRIMARY KEY,
  user_id text NOT NULL,
  product_slug text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_slug)
);
CREATE INDEX IF NOT EXISTS wishlists_user_id_idx ON wishlists (user_id);

-- Coupons Table
CREATE TABLE IF NOT EXISTS coupons (
  code text PRIMARY KEY,
  discount_percent integer NOT NULL,
  max_uses integer,
  current_uses integer DEFAULT 0,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- User Profiles Table (extends auth users)
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id text PRIMARY KEY,
  phone text,
  credits integer DEFAULT 0,
  referral_code text UNIQUE,
  referred_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Recently Viewed Table
CREATE TABLE IF NOT EXISTS recently_viewed (
  id serial PRIMARY KEY,
  user_id text NOT NULL,
  product_slug text NOT NULL,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_slug)
);
CREATE INDEX IF NOT EXISTS recently_viewed_user_id_idx ON recently_viewed (user_id);

-- Add Columns to Products
ALTER TABLE products ADD COLUMN IF NOT EXISTS in_stock boolean DEFAULT true;
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_count integer DEFAULT -1; -- -1 means infinite/made to order
ALTER TABLE products ADD COLUMN IF NOT EXISTS sizes jsonb DEFAULT '[]'::jsonb;

-- Add Columns to Orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_address jsonb;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_number text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_url text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS admin_notes text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount numeric DEFAULT 0.00;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal numeric DEFAULT 0.00;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS gst_number text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS invoice_url text;
