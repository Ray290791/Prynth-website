ALTER TABLE products ADD COLUMN IF NOT EXISTS gallery jsonb DEFAULT '[]'::jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS categories jsonb DEFAULT '[]'::jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS materials jsonb DEFAULT '[]'::jsonb;

-- Data migration: move legacy category/material string to the new jsonb arrays
UPDATE products 
SET categories = jsonb_build_array(category)
WHERE category IS NOT NULL AND jsonb_array_length(categories) = 0;

UPDATE products 
SET materials = jsonb_build_array(material)
WHERE material IS NOT NULL AND jsonb_array_length(materials) = 0;
