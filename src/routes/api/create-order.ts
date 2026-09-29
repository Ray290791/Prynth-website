import { createFileRoute } from "@tanstack/react-router";
import { createRazorpayOrder, getRazorpayCredentials } from "@/lib/razorpay.server";
import { RateLimiter, getClientIp, isBotUserAgent } from "@/lib/rate-limiter";

// Rate limit: max 15 order creation requests per minute per IP
const orderRateLimiter = new RateLimiter({ maxAttempts: 15, windowMs: 60 * 1000 });

const MIN_AMOUNT_PAISE = 100; // ₹1.00
const MAX_AMOUNT_PAISE = 50_000_000; // ₹5,00,000.00

export const Route = createFileRoute("/api/create-order")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const ua = request.headers.get("user-agent") || "";
          if (isBotUserAgent(ua)) {
            return new Response(JSON.stringify({ error: "Access denied" }), {
              status: 403,
              headers: { "Content-Type": "application/json" },
            });
          }

          const ip = getClientIp(request);
          if (orderRateLimiter.isLimited(ip)) {
            const retryAfter = orderRateLimiter.getRemainingSeconds(ip);
            return new Response(
              JSON.stringify({ error: "Too many order requests. Please wait a moment before trying again." }),
              {
                status: 429,
                headers: {
                  "Content-Type": "application/json",
                  "Retry-After": String(retryAfter || 60),
                },
              }
            );
          }

          let body: any = {};
          try {
            body = await request.json();
          } catch {
            return new Response(
              JSON.stringify({ error: "Invalid JSON request body" }),
              {
                status: 400,
                headers: { "Content-Type": "application/json" },
              }
            );
          }

          const rawAmount = body.amount;
          const amount = Math.floor(Number(rawAmount));

          // Validate amount bounds
          if (!rawAmount || isNaN(amount) || amount < MIN_AMOUNT_PAISE || amount > MAX_AMOUNT_PAISE) {
            return new Response(
              JSON.stringify({
                error: `Invalid amount. Order amount must be between ₹1.00 and ₹5,00,000.00.`,
              }),
              {
                status: 400,
                headers: { "Content-Type": "application/json" },
              }
            );
          }

          // Currency validation: only INR supported
          const currency = (body.currency || "INR").toString().trim().toUpperCase();
          if (currency !== "INR") {
            return new Response(
              JSON.stringify({ error: "Only INR currency is supported." }),
              {
                status: 400,
                headers: { "Content-Type": "application/json" },
              }
            );
          }

          // Sanitize receipt identifier
          const rawReceipt = body.receipt ? String(body.receipt).slice(0, 40) : "";
          const receipt = rawReceipt && /^[a-zA-Z0-9_\-]+$/.test(rawReceipt)
            ? rawReceipt
            : `rcpt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

          // Check credentials
          const creds = await getRazorpayCredentials();
          if (!creds.keyId || !creds.keySecret) {
            return new Response(
              JSON.stringify({ error: "Razorpay credentials are not configured" }),
              {
                status: 401,
                headers: { "Content-Type": "application/json" },
              }
            );
          }

          // Call Razorpay API to create order
          try {
            const order = await createRazorpayOrder({
              amount,
              currency,
              receipt,
            });

            return new Response(
              JSON.stringify({
                order_id: order.id,
                amount: order.amount,
                currency: order.currency,
                key_id: creds.keyId,
                checkout_config_id: creds.checkoutConfigId,
              }),
              {
                status: 200,
                headers: { "Content-Type": "application/json" },
              }
            );
          } catch (err: any) {
            console.error("[POST /api/create-order] Razorpay API Error:", err);
            const status = err.status === 401 ? 401 : 500;
            return new Response(
              JSON.stringify({
                error: err.message || "Failed to create order with Razorpay",
                details: err.details,
              }),
              {
                status,
                headers: { "Content-Type": "application/json" },
              }
            );
          }
        } catch (serverErr: any) {
          console.error("[POST /api/create-order] Server Error:", serverErr);
          return new Response(
            JSON.stringify({
              error: serverErr?.message || "Internal server error",
            }),
            {
              status: 500,
              headers: { "Content-Type": "application/json" },
            }
          );
        }
      },
    },
  },
});
