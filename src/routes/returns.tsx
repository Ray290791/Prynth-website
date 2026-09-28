import { createFileRoute, Link, getRouteApi } from "@tanstack/react-router";

const rootRoute = getRouteApi("__root__");

export const Route = createFileRoute("/returns")({ component: ReturnsPage });

function ReturnsPage() {
  const { settings } = rootRoute.useLoaderData();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 md:px-6 md:py-16">
      <p className="text-[11px] font-medium tracking-[0.18em] text-subtle uppercase">
        Help
      </p>
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">
        Returns
      </h1>
      <div className="mt-8 space-y-5 text-muted">
        {settings.returns_policy.split("\n\n").map((paragraph, i) => (
          <p key={i} className="whitespace-pre-wrap">{paragraph}</p>
        ))}
        
        <h2 className="font-display text-2xl font-medium text-fg pt-6">Refund Processing & Timelines</h2>
        <p className="whitespace-pre-wrap">
          Once your return or cancellation is inspected and approved, your refund will be processed immediately. The refund amount will be credited back to your original mode of payment (Bank Account, UPI, or Credit/Debit Card via Razorpay) within <strong>5 to 7 business days</strong>, depending on your bank's processing cycle.
        </p>
        <p className="whitespace-pre-wrap">
          For Cash on Delivery (COD) orders, refunds are processed via direct NEFT / IMPS bank transfer or UPI ID once bank account details are verified with our support team.
        </p>

        <h2 className="font-display text-2xl font-medium text-fg pt-6">Cancellations</h2>
        <p className="whitespace-pre-wrap">
          Orders can be cancelled before they enter the "printing" or "processing" phase. Since 3D printing is a manufacturing process tailored to each order, once printing has begun, the order cannot be cancelled. Custom modeling orders can be cancelled before design modeling begins. To request a cancellation, please email us at <a href={`mailto:${settings.contact_email || "hello@prynth.in"}`} className="text-accent hover:underline">{settings.contact_email || "hello@prynth.in"}</a> with your Order Number (PRY-…) immediately.
        </p>

        <p className="pt-4">
          <Link to="/contact" className="text-accent hover:underline">
            Contact us
          </Link>{" "}
          if you have any questions regarding a refund or cancellation.
        </p>
      </div>
    </div>
  );
}
