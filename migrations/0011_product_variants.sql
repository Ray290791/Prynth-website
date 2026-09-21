CREATE TABLE IF NOT EXISTS product_variants (
  id serial PRIMARY KEY,
  product_slug text NOT NULL REFERENCES products(slug) ON DELETE CASCADE,
  size text,
  color text,
  price numeric NOT NULL,
  stock_count integer DEFAULT -1,
  UNIQUE(product_slug, size, color)
);
CREATE INDEX IF NOT EXISTS product_variants_slug_idx ON product_variants (product_slug);
