/**
 * Cloudflare Workers-compatible Razorpay helpers.
 * Uses the Razorpay REST API directly via fetch (no Node.js SDK needed).
 */

function getAuth(): string {
  const keyId = process.env.RAZORPAY_KEY_ID ?? "";
  const keySecret = process.env.RAZORPAY_KEY_SECRET ?? "";
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
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: getAuth(),
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
  const secret = process.env.RAZORPAY_KEY_SECRET ?? "";
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
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
