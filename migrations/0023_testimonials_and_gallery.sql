-- Migration: 0023_testimonials_and_gallery.sql
-- Supports dynamic testimonials and site showcase gallery with admin controls

CREATE TABLE IF NOT EXISTS testimonials (
    id serial PRIMARY KEY,
    author_name text NOT NULL,
    author_role text,
    rating integer NOT NULL DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
    quote text NOT NULL,
    avatar_url text,
    verified boolean NOT NULL DEFAULT true,
    is_featured boolean NOT NULL DEFAULT true,
    sort_order integer NOT NULL DEFAULT 0,
    created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS gallery_items (
    id serial PRIMARY KEY,
    title text NOT NULL,
    caption text,
    image_url text,
    material text,
    tag text,
    sort_order integer NOT NULL DEFAULT 0,
    is_featured boolean NOT NULL DEFAULT true,
    created_at timestamp NOT NULL DEFAULT now()
);

-- Initial seed data for testimonials (with blank avatar URLs as requested)
INSERT INTO testimonials (author_name, author_role, rating, quote, avatar_url, verified, is_featured, sort_order)
VALUES
    ('Rohan S.', 'Robotics Engineer, Mumbai', 5, 'Ordered custom PETG motor mounts with 4 wall loops. Tolerance was dead-on at ±0.15mm and they shipped out the next afternoon from Mumbai.', '', true, true, 1),
    ('Aditi M.', 'Industrial Designer, Pune', 5, 'The matte finish on the Modular Pegboard is noticeably cleaner than normal hobbyist prints. Seamless interlocking and zero stringing.', '', true, true, 2),
    ('Vikram K.', 'Hardware Startup Founder, Bengaluru', 5, 'Quick turnaround on functional electronics prototypes. Being able to download an official quote for our lab accounts made budget approval painless.', '', true, true, 3),
    ('Siddharth P.', 'Mechanical Student, Mumbai', 5, 'Prynth is our go-to for formula student assemblies. Honest flat pricing, fast dispatch, and no hidden surprises.', '', true, true, 4)
ON CONFLICT DO NOTHING;

-- Initial seed items for gallery with blank photo placeholders (owner uploads real photos from admin)
INSERT INTO gallery_items (title, caption, image_url, material, tag, sort_order, is_featured)
VALUES
    ('Modular Pegboard Desk Setup', 'High-impact matte PETG tiles with desk-edge clamp mounting and accessory bins.', '', 'Bambu Matte PLA / PETG', 'Desk Setup', 1, true),
    ('Custom IoT Enclosure Prototype', 'Snap-fit electronics casing with brass threaded heat-set inserts.', '', 'PETG-CF', 'Functional Prototype', 2, true),
    ('Catch Bowl & Cable Management Tray', 'Architectural catch bowl printed in Matte Bone with 0.16mm layer height.', '', 'Matte PLA', 'Desk Accessories', 3, true),
    ('Robotics Drone Arm Stiffener', 'Structural load-bearing truss printed in PETG with 30% gyroid infill.', '', 'PETG', 'Engineering', 4, true)
ON CONFLICT DO NOTHING;
