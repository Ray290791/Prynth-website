import { getSql } from "./db";

/**
 * Cloudflare Workers & Node-compatible Razorpay helpers.
 * Uses the Razorpay REST API directly via fetch (no Node.js SDK needed).
 */

export async function getRazorpayCredentials(): Promise<{
  keyId: string;
  keySecret: string;
  isLive: boolean;
}> {
  let keyId = process.env.RAZORPAY_KEY_ID?.trim() || process.env.VITE_RAZORPAY_KEY_ID?.trim() || "";
  let keySecret = process.env.RAZORPAY_KEY_SECRET?.trim() || "";

  try {
    const sql = await getSql();
    const rows = await sql<{ key: string; value: string }>`
      SELECT key, value FROM site_settings 
      WHERE key IN ('razorpay_key_id', 'razorpay_key_secret')
    `;
    for (const r of rows) {
      if (r.key === "razorpay_key_id" && r.value && r.value.trim()) {
        keyId = r.value.trim();
      }
      if (r.key === "razorpay_key_secret" && r.value && r.value.trim()) {
        keySecret = r.value.trim();
      }
    }
  } catch (err) {
    // If DB fails, rely on process.env
  }

  // Safe fallback to test key if nothing configured
  if (!keyId) {
    keyId = "rzp_test_TdWyTzFRBBGque";
  }
  if (!keySecret) {
    keySecret = "REDACTED_RAZORPAY_WEBHOOK_SECRET";
  }

  const isLive = keyId.startsWith("rzp_live_");

  return { keyId, keySecret, isLive };
}

async function getAuth(): Promise<string> {
  const { keyId, keySecret } = await getRazorpayCredentials();
  return "Basic " + btoa(`${keyId}:${keySecret}`);
}

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
}

/** Create a Razorpay order via the REST API (fetch-based, edge-compatible). */
export async function createRazorpayOrder(opts: {
  amount: number;
  currency?: string;
  receipt: string;
}): Promise<RazorpayOrder> {
  const auth = await getAuth();
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: auth,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: opts.amount,
      currency: opts.currency ?? "INR",
      receipt: opts.receipt,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Razorpay order creation failed: ${res.status} ${text}`);
  }

  return res.json() as Promise<RazorpayOrder>;
}

/**
 * Verify Razorpay payment signature using the Web Crypto API
 * (works in Cloudflare Workers, Node.js, browsers).
 */
export async function verifyRazorpaySignature(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  signature: string,
): Promise<boolean> {
  const { keySecret } = await getRazorpayCredentials();
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(keySecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const msgBuffer = enc.encode(`${razorpayOrderId}|${razorpayPaymentId}`);
  const sigBuffer = await crypto.subtle.sign("HMAC", key, msgBuffer);
  const generated = Array.from(new Uint8Array(sigBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return generated === signature;
}
