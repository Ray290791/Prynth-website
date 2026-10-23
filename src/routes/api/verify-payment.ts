import { createFileRoute } from "@tanstack/react-router";
import { verifyRazorpaySignature, verifyRazorpayWebhookSignature } from "@/lib/razorpay.server";
import { confirmOrderPaymentIdempotent } from "@/lib/order-confirmation.server";
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

          // Check if this is an incoming Razorpay webhook sent to /api/verify-payment
          const webhookSig =
            request.headers.get("x-razorpay-signature") ||
            request.headers.get("X-Razorpay-Signature");

          const rawBody = await request.text();
          let body: any = {};
          try {
            body = JSON.parse(rawBody);
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

          if (webhookSig && body?.event) {
            const isWebhookValid = await verifyRazorpayWebhookSignature(rawBody, webhookSig);
            if (!isWebhookValid) {
              return new Response(
                JSON.stringify({ error: "Invalid webhook signature" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
              );
            }

            if (body.event === "order.paid" || body.event === "payment.captured") {
              const payment = body.payload?.payment?.entity;
              const rzpOrder = body.payload?.order?.entity;
              const rzpOrderId = rzpOrder?.id || payment?.order_id || null;
              const rzpPaymentId = payment?.id || null;
              const internalOrderNumber =
                rzpOrder?.notes?.internal_order_number ||
                payment?.notes?.internal_order_number ||
                undefined;

              const res = await confirmOrderPaymentIdempotent({
                razorpayOrderId: rzpOrderId || undefined,
                razorpayPaymentId: rzpPaymentId || "webhook_captured",
                orderNumber: internalOrderNumber,
              });

              return new Response(
                JSON.stringify({ processed: true, ...res }),
                { status: 200, headers: { "Content-Type": "application/json" } }
              );
            }

            return new Response(
              JSON.stringify({ success: true, received: true }),
              { status: 200, headers: { "Content-Type": "application/json" } }
            );
          }

          const ip = getClientIp(request);
          const limitCheck = await verifyRateLimiter.checkLimit(`verify-payment:${ip}`);
          if (limitCheck.limited) {
            return new Response(
              JSON.stringify({ success: false, error: "Too many verification requests. Please wait a moment." }),
              {
                status: 429,
                headers: {
                  "Content-Type": "application/json",
                  "Retry-After": String(limitCheck.remainingSeconds || 60),
                },
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

          // Idempotently confirm order payment in database
          try {
            await confirmOrderPaymentIdempotent({
              razorpayOrderId: orderIdStr,
              razorpayPaymentId: paymentIdStr,
            });
          } catch (confirmErr) {
            console.warn("[POST /api/verify-payment] Order confirmation error:", confirmErr);
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
