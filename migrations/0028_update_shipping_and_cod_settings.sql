-- Update shipping rates and COD fee to approved owner defaults
INSERT INTO site_settings (key, value)
VALUES
  ('cod_fee', '39'),
  ('free_shipping_threshold', '399'),
  ('standard_shipping_fee', '79'),
  ('express_shipping_fee', '189'),
  ('promo_banner', 'Free standard delivery across India on orders over ₹399'),
  ('shipping_policy', 'We ship across India. Pieces are packed in a small box with a bit of paper fill — enough to survive a courier, not a crate of foam.

Standard Delivery: 3–5 days (₹79 flat rate across India, free over ₹399)
Priority Air Express: 1–2 days (₹189, always charged separately)

Print time is separate. Ready-made orders typically spend 3–5 days on the printer and cooling bench before they go out. Fine-quality custom work can take a week. We email a tracking link when the courier has the packet.

Remote PIN codes can add a day or two. If a route isn''t serviceable we''ll write before charging shipping. Cash on delivery is available for catalog items with a ₹39 collection fee.')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
