import { createFileRoute } from "@tanstack/react-router";
import { verifyRazorpaySignature } from "@/lib/razorpay.server";

export const Route = createFileRoute("/api/verify-payment")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
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

          // Verify HMAC-SHA256 signature
          const isValid = await verifyRazorpaySignature(
            String(razorpay_order_id),
            String(razorpay_payment_id),
            String(razorpay_signature)
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
              order_id: razorpay_order_id,
              payment_id: razorpay_payment_id,
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
