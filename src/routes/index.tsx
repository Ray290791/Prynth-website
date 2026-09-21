import { createFileRoute, Link, getRouteApi } from "@tanstack/react-router";
import {
  ArrowRight,
  Clock3,
  ShieldCheck,
  Truck,
  Upload,
  WandSparkles,
} from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/logo";
import { getProductsPublic, getFeaturedProducts } from "@/lib/products-fns";


export const Route = createFileRoute("/")({
  loader: async () => {
    const featured = await getFeaturedProducts();
    const products = await getProductsPublic();
    return { featured, products };
  },
  component: Home,
});

const TRUST = [
  {
    icon: ShieldCheck,
    title: "Quality checked",
    text: "Every piece is looked at before it leaves. If it isn't right, we print it again.",
  },
  {
    icon: Clock3,
    title: "3–5 day typical turnaround",
    text: "Made to order, not sitting in a warehouse. Most ready-made pieces ship in a few days.",
  },
  {
    icon: Truck,
    title: "Ships across India",
    text: "Standard shipping ₹49, free over ₹799. Express if you need it sooner.",
  },
];

const rootRoute = getRouteApi("__root__");

function Home() {
  const { featured, products } = Route.useLoaderData();
  const { settings } = rootRoute.useLoaderData();
  const mosaic = [
    products[0],
    products[1],
    products[2],
    products[5],
  ].filter(Boolean); // handle fewer products gracefully

  return (
    <div>
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-20 size-[22rem] rounded-full bg-accent/15 md:size-[28rem] dark:bg-[#163836]"
        />
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-14 md:grid-cols-12 md:px-6 md:py-20 lg:gap-16 lg:py-24">
          <div className="relative z-10 md:col-span-6 lg:col-span-6">
            <p className="text-[11px] font-medium tracking-[0.18em] text-subtle uppercase">
              Custom 3D printing · Ready-made prints · Design
            </p>
            <h1 className="mt-4">
              <Wordmark className="block text-4xl sm:text-6xl lg:text-[4.5rem]" />
            </h1>
            <p className="mt-6 max-w-md text-base sm:text-lg text-muted">
              {settings.hero_tagline}
            </p>
            <p className="mt-3 max-w-md text-sm text-muted">
              {settings.hero_description}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link to="/shop">
                  Shop ready-made
                  <ArrowRight className="size-4" strokeWidth={1.75} />
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link to="/custom">Get a custom print</Link>
              </Button>
            </div>
            <p className="mt-6 text-sm text-subtle">
              Transparent pricing · No hidden fees · Printed in India
            </p>
          </div>

          <div className="relative md:col-span-6 lg:col-span-6">
            <div className="grid grid-cols-2 gap-3 sm:gap-4 items-start">
              {mosaic.map((p, i) => (
                <Link
                  key={p.slug}
                  to="/shop/$slug"
                  params={{ slug: p.slug }}
                  target="_blank"
                  className={
                    i % 2 === 1 ? "mt-6 overflow-hidden rounded-2xl" : "overflow-hidden rounded-2xl"
                  }
                >
                  <img
                    src={p.image}
                    alt={p.name}
                    className="product-photo aspect-square w-full object-cover"
                  />
                </Link>
              ))}
            </div>
            <div
              aria-hidden
              className="absolute -right-2 -bottom-2 hidden items-center gap-2 md:flex"
            >
              <span className="h-px w-10 bg-accent/40" />
              <span className="h-px w-7 bg-accent/30" />
              <span className="h-px w-4 bg-accent/20" />
              <img
                src="/brand/mark.png"
                alt=""
                className="size-12 rounded-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-surface">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-3 md:px-6 md:py-14">
          {TRUST.map((item) => (
            <div key={item.title} className="flex gap-4">
              <item.icon
                className="mt-0.5 size-5 shrink-0 text-accent"
                strokeWidth={1.75}
              />
              <div>
                <h2 className="font-display text-base font-semibold tracking-tight">
                  {item.title}
                </h2>
                <p className="mt-1 text-sm text-muted">{item.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-20">
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-[11px] font-medium tracking-[0.18em] text-subtle uppercase">
              Shop
            </p>
            <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight md:text-4xl">
              Favourites
            </h2>
            <p className="mt-2 max-w-md text-sm text-muted">
              Small useful things for a desk, a shelf, a sink. Printed when you
              order.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/shop">
              View all
              <ArrowRight className="size-4" strokeWidth={1.75} />
            </Link>
          </Button>
        </div>
        <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 sm:gap-y-12 lg:grid-cols-4">
          {featured.map((p) => (
            <ProductCard key={p.slug} product={p} />
          ))}
        </div>
      </section>

      <section className="bg-surface">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-16 md:grid-cols-2 md:px-6 md:py-20">
          <Link
            to="/shop"
            className="group rounded-3xl bg-bg p-7 shadow-[var(--shadow-border)] transition-shadow duration-200 hover:shadow-[var(--shadow-border-hover)] md:p-10"
          >
            <p className="text-[11px] font-medium tracking-[0.18em] text-subtle uppercase">
              Ready-made
            </p>
            <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight md:text-3xl">
              Browse the shop
            </h2>
            <p className="mt-3 max-w-sm text-sm text-muted">
              Stands, trays, planters, hooks. Pick a colour, we print it, it
              shows up. Prices on the card — that's the price.
            </p>
            <span className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-accent">
              Open shop
              <ArrowRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" />
            </span>
          </Link>
          <div className="grid gap-6">
            <Link
              to="/custom"
              search={{ path: "upload" }}
              className="group rounded-3xl bg-bg p-7 shadow-[var(--shadow-border)] transition-shadow duration-200 hover:shadow-[var(--shadow-border-hover)] md:p-8"
            >
              <Upload className="size-5 text-accent" strokeWidth={1.75} />
              <h3 className="mt-3 font-display text-xl font-semibold tracking-tight">
                Upload your model
              </h3>
              <p className="mt-2 text-sm text-muted">
                Have an STL or 3MF? Choose material and colour, see an estimate
                on the spot.
              </p>
            </Link>
            <Link
              to="/custom"
              search={{ path: "idea" }}
              className="group rounded-3xl bg-bg p-7 shadow-[var(--shadow-border)] transition-shadow duration-200 hover:shadow-[var(--shadow-border-hover)] md:p-8"
            >
              <WandSparkles className="size-5 text-accent" strokeWidth={1.75} />
              <h3 className="mt-3 font-display text-xl font-semibold tracking-tight">
                Describe your idea
              </h3>
              <p className="mt-2 text-sm text-muted">
                No file? Tell us what you need. We'll model it, quote it, and
                print it.
              </p>
            </Link>
          </div>
        </div>
      </section>

      {/* Pick up where you left off */}
      <LastVisitedSection products={products} />
    </div>
  );
}

import { useState, useEffect } from "react";
import { type Product } from "@/lib/products";
import { getLastVisited } from "@/lib/product-history";

function LastVisitedSection({ products }: { products: Product[] }) {
  const [lastVisitedSlug, setLastVisitedSlug] = useState<string | null>(null);
  
  useEffect(() => {
    setLastVisitedSlug(getLastVisited());
  }, []);

  if (!lastVisitedSlug) return null;
  const product = products.find((p) => p.slug === lastVisitedSlug);
  if (!product) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 md:px-6">
      <h2 className="font-display text-lg font-semibold tracking-tight text-muted">
        Pick up where you left off
      </h2>
      <div className="mt-4 w-1/2 sm:max-w-sm">
        <ProductCard product={product} />
      </div>
    </section>
  );
}

