import { createFileRoute, Link, getRouteApi } from "@tanstack/react-router";

const rootRoute = getRouteApi("__root__");
import { Button } from "@/components/ui/button";
import { products } from "@/lib/products";

export const Route = createFileRoute("/about")({ 
  component: AboutPage,
  head: () => ({
    meta: [
      { title: "Our Story | prynth!" },
      { name: "description", content: "We started prynth! because finding reliable, affordable 3D printing shouldn't be a hassle. Learn about our mission and process." }
    ]
  })
});

function AboutPage() {
  const { settings } = rootRoute.useLoaderData();

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-16">
      <p className="text-[11px] font-medium tracking-[0.18em] text-subtle uppercase">
        About
      </p>
      <h1 className="mt-2 max-w-3xl font-display text-4xl font-semibold tracking-tight md:text-5xl">
        Honest prices. Good prints. For people who just need the thing.
      </h1>

      <div className="mt-10 grid gap-10 md:grid-cols-12 md:gap-12 lg:gap-16">
        <div className="max-w-2xl space-y-5 text-muted md:col-span-7">
          {settings.about_story.split("\n\n").map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>
        <aside className="md:col-span-5">
          <div className="grid grid-cols-2 gap-3">
            {products.slice(0, 4).map((p) => (
              <img
                key={p.slug}
                src={p.image}
                alt={p.name}
                className="product-photo aspect-square w-full rounded-2xl object-cover"
              />
            ))}
          </div>
          <p className="mt-4 text-sm text-subtle">
            Handmade with care — on printers, not a factory line.
          </p>
        </aside>
      </div>

      <div className="mt-16 grid gap-4 rounded-3xl bg-surface p-8 shadow-[var(--shadow-border)] md:grid-cols-3 md:p-10">
        {[
          {
            t: "The price is the price",
            d: "No setup surprises, no colour upcharge on the listed palette, no 'from' pricing.",
          },
          {
            t: "Everyday, not exclusive",
            d: "Built for people who want a stand or a hook, not a lecture on nozzles.",
          },
          {
            t: "If it's wrong, we redo it",
            d: "Prints are checked. Returns are simple. See the returns page for the details.",
          },
        ].map((x) => (
          <div key={x.t}>
            <h2 className="font-display text-lg font-semibold tracking-tight">{x.t}</h2>
            <p className="mt-2 text-sm text-muted">{x.d}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <Button asChild size="lg">
          <Link to="/shop">Shop ready-made</Link>
        </Button>
        <Button asChild size="lg" variant="secondary">
          <Link to="/custom">Start a custom order</Link>
        </Button>
      </div>
    </div>
  );
}
