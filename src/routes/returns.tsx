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
        
        <h2 className="font-display text-2xl font-medium text-fg pt-6">Cancellations</h2>
        <p className="whitespace-pre-wrap">
          Orders can be cancelled before they enter the "printing" phase. Since 3D printing is a manufacturing process, once printing has begun, the order cannot be cancelled. Custom modeling orders can be cancelled before modeling begins. To request a cancellation, please email us with your Order Number immediately.
        </p>

        <p className="pt-4">
          <Link to="/contact" className="text-accent hover:underline">
            Contact us
          </Link>{" "}
          if you're unsure which case you're in or need to request a cancellation.
        </p>
      </div>
    </div>
  );
}
