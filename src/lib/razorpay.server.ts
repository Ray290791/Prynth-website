import { getSql } from "./db";

/**
 * Razorpay backend integration helpers.
 * Compatible with Node.js and Edge/Workers runtimes.
 */

export async function getRazorpayCredentials(): Promise<{
  keyId: string;
  keySecret: string;
  isLive: boolean;
  checkoutConfigId: string;
}> {
  let keyId =
    (typeof process !== "undefined" ? process.env.RAZORPAY_KEY_ID : undefined)?.trim() ||
    (typeof process !== "undefined" ? process.env.VITE_RAZORPAY_KEY_ID : undefined)?.trim() ||
    (globalThis as any).__env__?.RAZORPAY_KEY_ID?.trim() ||
    "";
  let keySecret =
    (typeof process !== "undefined" ? process.env.RAZORPAY_KEY_SECRET : undefined)?.trim() ||
    (globalThis as any).__env__?.RAZORPAY_KEY_SECRET?.trim() ||
    "";
  let checkoutConfigId =
    (typeof process !== "undefined" ? process.env.RAZORPAY_CHECKOUT_CONFIG_ID : undefined)?.trim() ||
    (typeof process !== "undefined" ? process.env.VITE_RAZORPAY_CHECKOUT_CONFIG_ID : undefined)?.trim() ||
    (globalThis as any).__env__?.RAZORPAY_CHECKOUT_CONFIG_ID?.trim() ||
    "";

  try {
    const sql = await getSql();
    const rows = await sql<{ key: string; value: string }>`
      SELECT key, value FROM site_settings 
      WHERE key IN ('razorpay_key_id', 'razorpay_key_secret', 'razorpay_checkout_config_id')
    `;
    for (const r of rows) {
      const val = r.value?.trim();
      if (!val) continue;
      if (r.key === "razorpay_key_id" && !keyId) {
        keyId = val;
      }
      if (r.key === "razorpay_key_secret" && !keySecret) {
        keySecret = val;
      }
      if (r.key === "razorpay_checkout_config_id" && !checkoutConfigId) {
        checkoutConfigId = val;
      }
    }
  } catch {
    // If DB query fails, continue with environment variables
  }

  const isLive = keyId.startsWith("rzp_live_");

  return { keyId, keySecret, isLive, checkoutConfigId };
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
  checkout_config_id?: string;
  notes?: Record<string, string>;
}

/** 
 * Create a Razorpay order via the REST API.
 * Validates minimum amount of 100 paise (₹1.00).
 */
export async function createRazorpayOrder(opts: {
  amount: number;
  currency?: string;
  receipt?: string;
  checkoutConfigId?: string;
  notes?: Record<string, string>;
}): Promise<RazorpayOrder> {
  if (typeof opts.amount !== "number" || isNaN(opts.amount) || opts.amount < 100) {
    const err: any = new Error("Amount must be at least 100 paise (₹1.00)");
    err.status = 400;
    throw err;
  }

  const { keyId, keySecret, checkoutConfigId } = await getRazorpayCredentials();
  if (!keyId || !keySecret) {
    const err: any = new Error("Razorpay credentials are not configured");
    err.status = 401;
    throw err;
  }

  const configToUse = opts.checkoutConfigId || checkoutConfigId;
  const auth = await getAuth();
  const payload: any = {
    amount: Math.round(opts.amount),
    currency: opts.currency ?? "INR",
    receipt: opts.receipt ?? `rcpt_${Date.now()}`,
  };
  if (configToUse) {
    payload.checkout_config_id = configToUse;
  }
  if (opts.notes) {
    payload.notes = opts.notes;
  }

  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: auth,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
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
      const sigBuf = Buffer.from(signature, "utf-8");
      const genBuf = Buffer.from(generated, "utf-8");
      if (sigBuf.length === genBuf.length) {
        return nodeCrypto.timingSafeEqual(sigBuf, genBuf);
      }
      nodeCrypto.timingSafeEqual(genBuf, genBuf);
      return false;
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
    return timingSafeEqualString(generated, signature);
  } catch (subtleErr) {
    console.error("[verifyRazorpaySignature] WebCrypto error:", subtleErr);
    return false;
  }
}

/**
 * Constant-time string comparison to prevent timing attacks.
 * Uses crypto.timingSafeEqual when available and byte lengths match,
 * falling back to constant-time XOR comparison across Web Crypto and edge runtimes.
 */
export function timingSafeEqualString(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") {
    return false;
  }

  try {
    const nodeCrypto = typeof require !== "undefined" ? require("crypto") : undefined;
    if (nodeCrypto && typeof nodeCrypto.timingSafeEqual === "function") {
      const bufA = Buffer.from(a, "utf-8");
      const bufB = Buffer.from(b, "utf-8");
      if (bufA.length === bufB.length) {
        return nodeCrypto.timingSafeEqual(bufA, bufB);
      }
      nodeCrypto.timingSafeEqual(bufA, bufA);
      return false;
    }
  } catch {
    // Continue to constant-time XOR loop
  }

  let mismatch = a.length === b.length ? 0 : 1;
  const maxLen = Math.max(a.length, b.length);
  for (let i = 0; i < maxLen; i++) {
    const charA = a.charCodeAt(i % (a.length || 1));
    const charB = b.charCodeAt(i % (b.length || 1));
    mismatch |= charA ^ charB;
  }
  return mismatch === 0;
}

/**
 * Resolves the Razorpay webhook secret.
 * Checks environment variables first, then database site_settings,
 * falling back to the Razorpay API key secret.
 */
export async function getRazorpayWebhookSecret(): Promise<string> {
  let webhookSecret =
    (typeof process !== "undefined" ? process.env.RAZORPAY_WEBHOOK_SECRET : undefined)?.trim() ||
    (globalThis as any).__env__?.RAZORPAY_WEBHOOK_SECRET?.trim() ||
    "";

  if (!webhookSecret) {
    try {
      const sql = await getSql();
      const rows = await sql<{ key: string; value: string }>`
        SELECT value FROM site_settings 
        WHERE key = 'razorpay_webhook_secret'
        LIMIT 1
      `;
      if (rows.length > 0 && rows[0].value?.trim()) {
        webhookSecret = rows[0].value.trim();
      }
    } catch {
      // Ignore DB lookup error
    }
  }

  if (!webhookSecret) {
    const { keySecret } = await getRazorpayCredentials();
    webhookSecret = keySecret;
  }

  return webhookSecret;
}

/**
 * Verifies the X-Razorpay-Signature sent on incoming webhook notifications.
 * Signature is computed as HMAC-SHA256(rawBody, webhookSecret).
 */
export async function verifyRazorpayWebhookSignature(
  rawBody: string,
  signature: string,
): Promise<boolean> {
  if (!rawBody || !signature) {
    return false;
  }

  const secret = await getRazorpayWebhookSecret();
  if (!secret) {
    console.error("[verifyRazorpayWebhookSignature] No webhook secret or key secret configured");
    return false;
  }

  try {
    const nodeCrypto = await import("crypto");
    if (nodeCrypto && typeof nodeCrypto.createHmac === "function") {
      const expected = nodeCrypto
        .createHmac("sha256", secret)
        .update(rawBody)
        .digest("hex");

      const sigBuf = Buffer.from(signature, "utf-8");
      const expBuf = Buffer.from(expected, "utf-8");
      if (sigBuf.length === expBuf.length) {
        return nodeCrypto.timingSafeEqual(sigBuf, expBuf);
      }
      nodeCrypto.timingSafeEqual(expBuf, expBuf);
      return false;
    }
  } catch {
    // Fallback to Web Crypto subtle API
  }

  try {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const msgBuffer = enc.encode(rawBody);
    const sigBuffer = await crypto.subtle.sign("HMAC", key, msgBuffer);
    const expected = Array.from(new Uint8Array(sigBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return timingSafeEqualString(expected.toLowerCase(), signature.trim().toLowerCase());
  } catch (err) {
    console.error("[verifyRazorpayWebhookSignature] Error:", err);
    return false;
  }
}

