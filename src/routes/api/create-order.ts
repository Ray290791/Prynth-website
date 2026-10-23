import { createFileRoute } from "@tanstack/react-router";
// Endpoint deprecated and disabled for security:
// Client-specified amounts are prohibited. All legitimate orders are validated,
// recomputed from the database, and created server-side via `createRazorpayOrder` in `@/lib/orders-fns`.

export const Route = createFileRoute("/api/create-order")({
  server: {
    handlers: {
      POST: async () => {
        return new Response(
          JSON.stringify({
            error: "Endpoint deprecated. All orders must be initiated through the verified checkout flow.",
          }),
          {
            status: 410,
            headers: { "Content-Type": "application/json" },
          }
        );
      },
    },
  },
});
