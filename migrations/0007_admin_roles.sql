CREATE TABLE IF NOT EXISTS admin_users (
  email TEXT PRIMARY KEY,
  role TEXT NOT NULL DEFAULT 'admin',
  pin_hash TEXT,
  reset_otp TEXT,
  reset_otp_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

INSERT INTO admin_users (email, role)
VALUES ('prynth07@gmail.com', 'super_admin')
ON CONFLICT (email) DO NOTHING;
