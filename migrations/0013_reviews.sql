CREATE TABLE IF NOT EXISTS product_reviews (
    id serial PRIMARY KEY,
    product_slug text NOT NULL REFERENCES products(slug) ON DELETE CASCADE,
    user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment text,
    created_at timestamp NOT NULL DEFAULT now(),
    UNIQUE(product_slug, user_id)
);
