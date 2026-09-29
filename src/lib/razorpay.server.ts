import { getSql } from "./db";

/**
 * Razorpay backend integration helpers.
 * Compatible with Node.js and Edge/Workers runtimes.
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
      const val = r.value?.trim();
      if (!val || val === "rzp_test_TdWyTzFRBBGque" || val === "REDACTED_RAZORPAY_WEBHOOK_SECRET") {
        continue;
      }
      if (r.key === "razorpay_key_id") {
        // Prioritize live keys from DB if configured, or use if no env var
        if (!keyId || val.startsWith("rzp_live_")) {
          keyId = val;
        }
      }
      if (r.key === "razorpay_key_secret") {
        if (!keySecret || keyId.startsWith("rzp_live_")) {
          keySecret = val;
        }
      }
    }
  } catch {
    // If DB query fails, continue with process.env
  }

  // Safe fallback to configured test keys
  if (!keyId) {
    keyId = "rzp_test_ThipwD9wdDVzo7";
  }
  if (!keySecret) {
    keySecret = "REDACTED_RAZORPAY_TEST_SECRET";
  }

  const isLive = keyId.startsWith("rzp_live_");

  return { keyId, keySecret, isLive };
}

async function getAuth(): Promise<string> {
  const { keyId, keySecret } = await getRazorpayCredentials();
  return "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64");
}

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
}

/** 
 * Create a Razorpay order via the REST API.
 * Validates minimum amount of 100 paise (₹1.00).
 */
export async function createRazorpayOrder(opts: {
  amount: number;
  currency?: string;
  receipt?: string;
}): Promise<RazorpayOrder> {
  if (typeof opts.amount !== "number" || isNaN(opts.amount) || opts.amount < 100) {
    const err: any = new Error("Amount must be at least 100 paise (₹1.00)");
    err.status = 400;
    throw err;
  }

  const { keyId, keySecret } = await getRazorpayCredentials();
  if (!keyId || !keySecret) {
    const err: any = new Error("Razorpay credentials are not configured");
    err.status = 401;
    throw err;
  }

  const auth = await getAuth();
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: auth,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: Math.round(opts.amount),
      currency: opts.currency ?? "INR",
      receipt: opts.receipt ?? `rcpt_${Date.now()}`,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const message = errorData?.error?.description || res.statusText || "Razorpay API error";
    const err: any = new Error(`Razorpay order creation failed: ${message}`);
    err.status = res.status === 401 ? 401 : 500;
    err.details = errorData;
    throw err;
  }

  return res.json() as Promise<RazorpayOrder>;
}

/**
 * Verify Razorpay payment signature using HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET).
 * Returns true if and only if generated signature matches razorpay_signature.
 */
export async function verifyRazorpaySignature(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  signature: string,
): Promise<boolean> {
  if (!razorpayOrderId || !razorpayPaymentId || !signature) {
    return false;
  }

  const { keySecret } = await getRazorpayCredentials();
  if (!keySecret) {
    return false;
  }

  try {
    // Fast path: Node.js crypto module
    const nodeCrypto = await import("crypto");
    if (nodeCrypto && typeof nodeCrypto.createHmac === "function") {
      const generated = nodeCrypto
        .createHmac("sha256", keySecret)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest("hex");
      return generated === signature;
    }
  } catch {
    // Fallback to Web Crypto subtle API
  }

  try {
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
  } catch (subtleErr) {
    console.error("[verifyRazorpaySignature] WebCrypto error:", subtleErr);
    return false;
  }
}
