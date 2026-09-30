/**
 * Shiprocket server-side integration helper.
 *
 * Env vars required — set as Cloudflare Worker secrets via:
 *   npx wrangler secret put SHIPROCKET_EMAIL
 *   npx wrangler secret put SHIPROCKET_PASSWORD
 *
 * Also add them to your local .env for dev:
 *   SHIPROCKET_EMAIL=you@example.com
 *   SHIPROCKET_PASSWORD=yourpassword
 *
 * Token caching: Cloudflare Workers are stateless per-request so module-level
 * variables don't persist. We cache the Shiprocket auth token in the
 * `site_settings` table (key: 'shiprocket_token', 'shiprocket_token_expiry')
 * so it survives across requests without re-authenticating every call.
 */

import { getSql } from "./db";

const SHIPROCKET_BASE = "https://apiv2.shiprocket.in/v1/external";

/** Read env — supports process.env (Node dev) and CF Workers globals. */
function readEnv(key: string): string | undefined {
  const v =
    (typeof process !== "undefined" ? process.env[key] : undefined)?.trim() ||
    (globalThis as any).__env__?.[key]?.trim() ||
    (globalThis as any)[key]?.trim();
  return v || undefined;
}

// ─── Token management (DB-persisted for CF Worker statelessness) ─────────────
async function getAuthToken(): Promise<string> {
  const sql = await getSql();

  // Check cached token in DB
  const rows = await sql<{ key: string; value: string }>`
    SELECT key, value FROM site_settings
    WHERE key IN ('shiprocket_token', 'shiprocket_token_expiry')
  `;
  const tokenRow = rows.find((r) => r.key === "shiprocket_token");
  const expiryRow = rows.find((r) => r.key === "shiprocket_token_expiry");

  const now = Date.now();
  const expiry = expiryRow ? Number(expiryRow.value) : 0;

  if (tokenRow?.value && expiry > now + 60_000) {
    // Token still valid (with 1-minute safety margin)
    return tokenRow.value;
  }

  // Fetch fresh token
  const email = readEnv("SHIPROCKET_EMAIL");
  const password = readEnv("SHIPROCKET_PASSWORD");

  if (!email || !password) {
    throw new Error(
      "Shiprocket credentials are not configured. " +
        "Run: npx wrangler secret put SHIPROCKET_EMAIL && npx wrangler secret put SHIPROCKET_PASSWORD"
    );
  }

  const res = await fetch(`${SHIPROCKET_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Shiprocket auth failed (${res.status}): ${text}`);
  }

  const json = (await res.json()) as { token: string };
  const token = json.token;
  // Tokens last ~24 h; we refresh proactively after 23 h
  const newExpiry = now + 23 * 60 * 60 * 1000;

  // Upsert into site_settings
  await sql`
    INSERT INTO site_settings (key, value)
    VALUES ('shiprocket_token', ${token})
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
  `;
  await sql`
    INSERT INTO site_settings (key, value)
    VALUES ('shiprocket_token_expiry', ${String(newExpiry)})
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
  `;

  return token;
}

// ─── Types ────────────────────────────────────────────────────────────────────
export interface ShiprocketOrderPayload {
  /** Your internal order number (e.g. PRY-...) */
  order_id: string;
  order_date: string; // "YYYY-MM-DD HH:MM:SS"
  pickup_location: string; // must match a Pickup Location name in your Shiprocket account
  channel_id?: string; // optional – your Shiprocket sales channel ID

  billing_customer_name: string;
  billing_last_name?: string;
  billing_address: string;
  billing_address_2?: string;
  billing_city: string;
  billing_pincode: string;
  billing_state: string;
  billing_country: string; // "India"
  billing_email: string;
  billing_phone: string;

  shipping_is_billing: boolean;
  shipping_customer_name?: string;
  shipping_last_name?: string;
  shipping_address?: string;
  shipping_address_2?: string;
  shipping_city?: string;
  shipping_pincode?: string;
  shipping_country?: string;
  shipping_state?: string;
  shipping_email?: string;
  shipping_phone?: string;

  order_items: {
    name: string;
    sku: string;
    units: number;
    selling_price: number;
    discount?: number;
    tax?: number;
    hsn?: string;
  }[];

  payment_method: "Prepaid" | "COD";
  sub_total: number;

  length: number; // cm
  breadth: number; // cm
  height: number; // cm
  weight: number; // kg
}

export interface ShiprocketCreateOrderResponse {
  order_id: number;
  shipment_id: number;
  status: string;
  status_code: number;
  onboarding_completed_now?: number;
  awb_code?: string;
  courier_company_id?: number;
  courier_name?: string;
}

export interface ShiprocketAWBResponse {
  awb_assign_status: number;
  response: {
    data?: {
      awb_code: string;
      courier_company_id: number;
      courier_name: string;
      assigned_date_time: string;
    };
    awb_code?: string;
    courier_name?: string;
  };
}

// ─── Create a forward order in Shiprocket ────────────────────────────────────
export async function createShiprocketOrder(
  payload: ShiprocketOrderPayload
): Promise<ShiprocketCreateOrderResponse> {
  const token = await getAuthToken();

  const res = await fetch(`${SHIPROCKET_BASE}/orders/create/adhoc`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Shiprocket create order failed (${res.status}): ${text}`);
  }

  return res.json() as Promise<ShiprocketCreateOrderResponse>;
}

// ─── Assign AWB (courier) to a shipment ──────────────────────────────────────
export async function assignShiprocketAWB(
  shipment_id: number,
  courier_id?: number
): Promise<ShiprocketAWBResponse> {
  const token = await getAuthToken();

  const body: Record<string, unknown> = { shipment_id };
  if (courier_id) body.courier_id = courier_id;

  const res = await fetch(`${SHIPROCKET_BASE}/courier/assign/awb`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Shiprocket AWB assign failed (${res.status}): ${text}`);
  }

  return res.json() as Promise<ShiprocketAWBResponse>;
}

// ─── Get tracking URL for an AWB ─────────────────────────────────────────────
export function shiprocketTrackingUrl(awbCode: string): string {
  return `https://shiprocket.co/tracking/${awbCode}`;
}
