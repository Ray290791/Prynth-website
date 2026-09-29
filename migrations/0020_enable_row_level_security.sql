-- Migration 0020: Enable Row-Level Security (RLS) on user data and catalog tables

-- 1. Sensitive user-owned tables
ALTER TABLE IF EXISTS orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS recently_viewed ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cart_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS custom_files ENABLE ROW LEVEL SECURITY;

-- 2. Public Catalog Tables - Open for SELECT, protected for INSERT/UPDATE/DELETE
ALTER TABLE IF EXISTS products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read access for products" ON products;
CREATE POLICY "Public read access for products" ON products FOR SELECT USING (true);

ALTER TABLE IF EXISTS product_variants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read access for product_variants" ON product_variants;
CREATE POLICY "Public read access for product_variants" ON product_variants FOR SELECT USING (true);

ALTER TABLE IF EXISTS materials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read access for materials" ON materials;
CREATE POLICY "Public read access for materials" ON materials FOR SELECT USING (true);

ALTER TABLE IF EXISTS filaments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read access for filaments" ON filaments;
CREATE POLICY "Public read access for filaments" ON filaments FOR SELECT USING (true);

ALTER TABLE IF EXISTS printers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read access for printers" ON printers;
CREATE POLICY "Public read access for printers" ON printers FOR SELECT USING (true);

ALTER TABLE IF EXISTS faqs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read access for faqs" ON faqs;
CREATE POLICY "Public read access for faqs" ON faqs FOR SELECT USING (true);

ALTER TABLE IF EXISTS reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read access for reviews" ON reviews;
CREATE POLICY "Public read access for reviews" ON reviews FOR SELECT USING (true);

-- 3. Row-level policies for per-user data tables
DROP POLICY IF EXISTS "Users can access own addresses" ON addresses;
CREATE POLICY "Users can access own addresses" ON addresses FOR ALL USING (
  user_id = coalesce(current_setting('app.current_user_id', true), '') OR current_user = 'postgres' OR current_user = 'neon_superuser'
);

DROP POLICY IF EXISTS "Users can access own profile" ON user_profiles;
CREATE POLICY "Users can access own profile" ON user_profiles FOR ALL USING (
  user_id = coalesce(current_setting('app.current_user_id', true), '') OR current_user = 'postgres' OR current_user = 'neon_superuser'
);

DROP POLICY IF EXISTS "Users can access own orders" ON orders;
CREATE POLICY "Users can access own orders" ON orders FOR ALL USING (
  user_id = coalesce(current_setting('app.current_user_id', true), '') OR current_user = 'postgres' OR current_user = 'neon_superuser'
);

DROP POLICY IF EXISTS "Users can access own wishlists" ON wishlists;
CREATE POLICY "Users can access own wishlists" ON wishlists FOR ALL USING (
  user_id = coalesce(current_setting('app.current_user_id', true), '') OR current_user = 'postgres' OR current_user = 'neon_superuser'
);
