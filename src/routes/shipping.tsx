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
        <p>
          Questions about an order in transit:{" "}
          <Link to="/contact" className="text-accent hover:underline">
            contact
          </Link>{" "}
          with your PRY- number.
        </p>
      </div>
    </div>
  );
}
