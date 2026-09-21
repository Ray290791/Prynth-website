CREATE TABLE IF NOT EXISTS cart_sessions (
    id text PRIMARY KEY,
    user_id text REFERENCES "user"(id) ON DELETE CASCADE,
    email text,
    items jsonb NOT NULL DEFAULT '[]'::jsonb,
    updated_at timestamp NOT NULL DEFAULT now(),
    created_at timestamp NOT NULL DEFAULT now()
);

-- Index for cron jobs to quickly find abandoned carts (e.g. updated_at < now() - interval '24 hours')
CREATE INDEX IF NOT EXISTS idx_cart_sessions_updated_at ON cart_sessions(updated_at);
