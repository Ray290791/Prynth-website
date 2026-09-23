-- Create filaments inventory table
CREATE TABLE IF NOT EXISTS filaments (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    material_id TEXT NOT NULL,
    color_id TEXT NOT NULL,
    color_name TEXT NOT NULL,
    color_hex TEXT NOT NULL,
    spool_count INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'in_stock' CHECK (status IN ('in_stock', 'low_stock', 'filament_over')),
    brand TEXT DEFAULT 'Bambu Lab',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed initial fleet of in-stock materials and colors
INSERT INTO filaments (id, name, material_id, color_id, color_name, color_hex, spool_count, status, brand, notes)
VALUES
    -- PLA Filaments
    ('fil-pla-charcoal', 'Bambu Matte Charcoal PLA', 'pla', 'charcoal', 'Charcoal', '#2A2E32', 5, 'in_stock', 'Bambu Lab', 'Default everyday matte dark tone'),
    ('fil-pla-teal', 'Bambu Basic Teal PLA', 'pla', 'teal', 'Teal', '#00B8A9', 4, 'in_stock', 'Bambu Lab', 'Signature Prynth teal accent'),
    ('fil-pla-bone', 'Bambu Matte Bone White PLA', 'pla', 'bone', 'Bone White', '#EFEBE3', 6, 'in_stock', 'Bambu Lab', 'Warm architectural off-white'),
    ('fil-pla-stone', 'Bambu Basic Stone Grey PLA', 'pla', 'stone', 'Stone Grey', '#9AA0A6', 3, 'in_stock', 'Bambu Lab', 'Neutral concrete grey'),
    ('fil-pla-green', 'Bambu Slicer Green PLA', 'pla', 'bambu_green', 'Bambu Green', '#00ae42', 2, 'in_stock', 'Bambu Lab', 'Signature Bambu Lab green'),
    ('fil-pla-orange', 'Bambu Basic Signal Orange PLA', 'pla', 'orange', 'Signal Orange', '#ff6a00', 3, 'in_stock', 'Bambu Lab', 'High-visibility safety accent'),

    -- PETG Filaments (Tougher, outdoor and functional parts)
    ('fil-petg-black', 'Bambu Basic Jet Black PETG', 'petg', 'black', 'Jet Black', '#16181b', 4, 'in_stock', 'Bambu Lab', 'High gloss durable chemical-resistant'),
    ('fil-petg-clear', 'Bambu Translucent Clear PETG', 'petg', 'clear', 'Translucent Clear', '#e2e8f0', 2, 'in_stock', 'Bambu Lab', 'Semi-transparent light diffusing'),
    ('fil-petg-grey', 'Bambu Slate Grey PETG', 'petg', 'slate', 'Slate Grey', '#64748b', 3, 'in_stock', 'Bambu Lab', 'Functional industrial brackets'),

    -- TPU Filaments (Flexible, elastomeric)
    ('fil-tpu-black', 'Bambu TPU 95A Black', 'tpu', 'charcoal', 'Charcoal Black', '#1f2428', 2, 'in_stock', 'Bambu Lab', 'Flexible gaskets and phone bumpers'),
    ('fil-tpu-teal', 'Bambu TPU 95A Neon Teal', 'tpu', 'teal', 'Vibrant Teal', '#06b6d4', 2, 'in_stock', 'Bambu Lab', 'Flexible wristbands and accents')
ON CONFLICT (id) DO NOTHING;
