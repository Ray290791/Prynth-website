import { createFileRoute } from "@tanstack/react-router";
import { verifyRazorpaySignature } from "@/lib/razorpay.server";
import { RateLimiter, getClientIp, isBotUserAgent } from "@/lib/rate-limiter";

// Rate limit: max 20 verification requests per minute per IP
const verifyRateLimiter = new RateLimiter({ maxAttempts: 20, windowMs: 60 * 1000 });

export const Route = createFileRoute("/api/verify-payment")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const ua = request.headers.get("user-agent") || "";
          if (isBotUserAgent(ua)) {
            return new Response(JSON.stringify({ success: false, error: "Access denied" }), {
              status: 403,
              headers: { "Content-Type": "application/json" },
            });
          }

          const ip = getClientIp(request);
          if (verifyRateLimiter.isLimited(ip)) {
            const retryAfter = verifyRateLimiter.getRemainingSeconds(ip);
            return new Response(
              JSON.stringify({ success: false, error: "Too many verification requests. Please wait a moment." }),
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
              JSON.stringify({
                success: false,
                error: "Invalid JSON request body",
              }),
              {
                status: 400,
                headers: { "Content-Type": "application/json" },
              }
            );
          }

          const razorpay_order_id =
            body.razorpay_order_id || body.order_id || body.orderId;
          const razorpay_payment_id =
            body.razorpay_payment_id || body.payment_id || body.paymentId;
          const razorpay_signature =
            body.razorpay_signature || body.signature;

          // Missing required fields validation
          if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return new Response(
              JSON.stringify({
                success: false,
                error:
                  "Missing required verification fields. razorpay_order_id, razorpay_payment_id, and razorpay_signature are required.",
              }),
              {
                status: 400,
                headers: { "Content-Type": "application/json" },
              }
            );
          }

          const orderIdStr = String(razorpay_order_id).trim().slice(0, 100);
          const paymentIdStr = String(razorpay_payment_id).trim().slice(0, 100);
          const sigStr = String(razorpay_signature).trim().slice(0, 200);

          // Verify HMAC-SHA256 signature
          const isValid = await verifyRazorpaySignature(
            orderIdStr,
            paymentIdStr,
            sigStr
          );

          if (!isValid) {
            return new Response(
              JSON.stringify({
                success: false,
                error: "Payment verification failed: Signature mismatch.",
              }),
              {
                status: 400,
                headers: { "Content-Type": "application/json" },
              }
            );
          }

          // Signature verified successfully
          return new Response(
            JSON.stringify({
              success: true,
              message: "Payment signature verified successfully",
              order_id: orderIdStr,
              payment_id: paymentIdStr,
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }
          );
        } catch (serverErr: any) {
          console.error("[POST /api/verify-payment] Server Error:", serverErr);
          return new Response(
            JSON.stringify({
              success: false,
              error: serverErr?.message || "Internal server error during verification",
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
