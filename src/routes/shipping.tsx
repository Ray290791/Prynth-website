import { createFileRoute, Link, getRouteApi } from "@tanstack/react-router";

const rootRoute = getRouteApi("__root__");

export const Route = createFileRoute("/shipping")({ component: ShippingPage });

function ShippingPage() {
  const { settings } = rootRoute.useLoaderData();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 md:px-6 md:py-16">
      <p className="text-[11px] font-medium tracking-[0.18em] text-subtle uppercase">
        Help
      </p>
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">
        Shipping
      </h1>
      <div className="mt-8 space-y-6 text-muted">
        {settings.shipping_policy.split("\n\n").map((paragraph, i) => (
          <p key={i} className="whitespace-pre-wrap">{paragraph}</p>
        ))}

        <h2 className="font-display text-2xl font-medium text-fg pt-6">Courier Partners & Tracking</h2>
        <p className="whitespace-pre-wrap">
          We partner with reliable courier services including Delhivery, Blue Dart, DTDC, and India Post (Speed Post for remote PIN codes). As soon as your order is packed and dispatched from our print studio, a tracking link with the AWB / Consignment Number will be sent to your registered email address so you can follow the package journey in real time.
        </p>

        <p className="pt-2">
          Questions about an order in transit:{" "}
          <Link to="/contact" className="text-accent hover:underline">
            contact us
          </Link>{" "}
          with your PRY- order number.
        </p>
      </div>
    </div>
  );
}
