-- Migration 0030: Add refund_amount to orders for Launch Ledger and refund tracking
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00;
