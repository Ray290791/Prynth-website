-- Migration 0027: Grievance and consumer complaints tracking (Consumer Protection E-Commerce Rules, 2020)
CREATE TABLE IF NOT EXISTS grievance_complaints (
  id TEXT PRIMARY KEY,
  ticket_number TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  order_number TEXT,
  category TEXT NOT NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'submitted',
  acknowledge_due_at TIMESTAMP WITH TIME ZONE NOT NULL,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  resolve_due_at TIMESTAMP WITH TIME ZONE NOT NULL,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT,
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_grievance_status ON grievance_complaints(status);
CREATE INDEX IF NOT EXISTS idx_grievance_ticket ON grievance_complaints(ticket_number);
