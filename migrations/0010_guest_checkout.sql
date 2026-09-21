-- Allow orders without a user account (Guest Checkout)
ALTER TABLE orders ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS guest_email text;
CREATE INDEX IF NOT EXISTS orders_guest_email_idx ON orders (guest_email);
