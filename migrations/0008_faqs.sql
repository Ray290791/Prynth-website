CREATE TABLE IF NOT EXISTS faqs (
  id SERIAL PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Initial Data
INSERT INTO faqs (question, answer, order_index) VALUES
('How long does an order take?', 'Ready-made pieces are printed when you order. Most leave us in 3–5 days, then the courier takes another 2–5 depending on your city. Express shipping shortens the courier part, not the print. Custom modeling adds time before we print — that''s listed on the estimate.', 0),
('Are the prices the final prices?', 'The number on the product is what you pay for the piece, including packaging. Shipping is added at checkout (free standard over ₹799). Custom work shows a print estimate plus a modeling fee if we have to design it. No colour upcharge on the listed palette.', 1),
('What files can I upload?', 'STL is best — we can often size the quote from the file itself. 3MF and OBJ work too; those quotes are confirmed by email. Keep files under 50 MB. If something looks off (non-manifold, tiny features), we''ll write before printing.', 2),
('Is 3D-printed plastic food-safe / dishwasher-safe?', 'Treat our pieces as indoor objects, not cookware. Layer lines hold water and soap. The soap dish is PETG so bathroom moisture is fine; still hand-rinse. Don''t put prints in a dishwasher or a hot car.', 3),
('Can I pick a colour that isn''t listed?', 'The four colours on the site are what we keep on the printers. If you need something else, use the custom form and say so in the notes — we''ll tell you if we can run it, and what it costs.', 4),
('What if my print arrives damaged or wrong?', 'Photograph it and email hello@prynth.in with your order number. We''ll reprint. See Returns for the window and the few cases we can''t take back (used bath pieces, custom files printed as specified).', 5);
