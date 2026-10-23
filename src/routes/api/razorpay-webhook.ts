import { createFileRoute } from "@tanstack/react-router";
import { verifyRazorpayWebhookSignature } from "@/lib/razorpay.server";
import { confirmOrderPaymentIdempotent } from "@/lib/order-confirmation.server";
import { getSql } from "@/lib/db";

export const Route = createFileRoute("/api/razorpay-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const signature =
            request.headers.get("x-razorpay-signature") ||
            request.headers.get("X-Razorpay-Signature") ||
            "";

          if (!signature) {
            return new Response(
              JSON.stringify({ error: "Missing X-Razorpay-Signature header" }),
              {
                status: 400,
                headers: { "Content-Type": "application/json" },
              }
            );
          }

          const rawBody = await request.text();

          // Verify HMAC-SHA256 signature against webhook secret
          const isValid = await verifyRazorpayWebhookSignature(rawBody, signature);
          if (!isValid) {
            console.error("[Razorpay Webhook] Invalid signature rejected");
            return new Response(
              JSON.stringify({ error: "Invalid webhook signature" }),
              {
                status: 400,
                headers: { "Content-Type": "application/json" },
              }
            );
          }

          let event: any;
          try {
            event = JSON.parse(rawBody);
          } catch {
            return new Response(
              JSON.stringify({ error: "Invalid JSON body" }),
              {
                status: 400,
                headers: { "Content-Type": "application/json" },
              }
            );
          }

          const eventType = event?.event;
          console.log(`[Razorpay Webhook] Received authenticated event: ${eventType}`);

          // Handle order.paid and payment.captured
          if (eventType === "order.paid" || eventType === "payment.captured") {
            const payment = event?.payload?.payment?.entity;
            const rzpOrder = event?.payload?.order?.entity;

            const razorpayOrderId = rzpOrder?.id || payment?.order_id || null;
            const razorpayPaymentId = payment?.id || null;
            const internalOrderNumber =
              rzpOrder?.notes?.internal_order_number ||
              payment?.notes?.internal_order_number ||
              undefined;

            if (!razorpayOrderId && !razorpayPaymentId && !internalOrderNumber) {
              console.warn("[Razorpay Webhook] No order/payment identifiers found in payload");
              return new Response(
                JSON.stringify({ success: true, message: "Ignored: Missing identifiers" }),
                {
                  status: 200,
                  headers: { "Content-Type": "application/json" },
                }
              );
            }

            const sql = await getSql();

            // Idempotently confirm order payment
            const result = await confirmOrderPaymentIdempotent({
              razorpayOrderId: razorpayOrderId || undefined,
              razorpayPaymentId: razorpayPaymentId || "webhook_captured",
              orderNumber: internalOrderNumber,
              sqlInstance: sql,
            });

            console.log("[Razorpay Webhook] Idempotent confirmation result:", result);

            return new Response(
              JSON.stringify({
                success: true,
                orderNumber: result.orderNumber,
                alreadyPaid: result.alreadyPaid,
              }),
              {
                status: 200,
                headers: { "Content-Type": "application/json" },
              }
            );
          }

          // Acknowledge receipt of other Razorpay webhook events
          return new Response(
            JSON.stringify({ success: true, message: "Event received" }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }
          );
        } catch (err: any) {
          console.error("[Razorpay Webhook] Processing error:", err);
          return new Response(
            JSON.stringify({ error: err?.message || "Internal server error" }),
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
