-- Add PIN brute-force lockout columns to admin_users.
-- pin_fail_count: tracks consecutive failed PIN attempts.
-- pin_locked_until: timestamp until which PIN entry is blocked after 5 failures.

ALTER TABLE admin_users
  ADD COLUMN IF NOT EXISTS pin_fail_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pin_locked_until TIMESTAMPTZ;
