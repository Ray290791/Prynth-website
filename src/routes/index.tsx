import { createFileRoute, Link, getRouteApi } from "@tanstack/react-router";
import {
  ArrowRight,
  Clock3,
  ShieldCheck,
  Star,
  Truck,
  Upload,
  WandSparkles,
  Zap,
} from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/logo";
import { getProductsPublic, getFeaturedProducts } from "@/lib/products-fns";
import { cn } from "@/lib/utils";


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

const POLYMERS = [
  {
    id: "pla",
    name: "PLA",
    tagline: "Desk & Detail",
    verdict: "Best for sharp detail and everyday desk objects.",
    uses: ["Phone stands", "Figurines", "Planters"],
    color: "#00b8a9",
  },
  {
    id: "petg",
    name: "PETG",
    tagline: "Water & Impact",
    verdict: "Tough, moisture-resistant. Great for functional parts.",
    uses: ["Enclosures", "Water-contact parts", "Brackets"],
    color: "#3b82f6",
  },
  {
    id: "abs",
    name: "ABS",
    tagline: "High Heat",
    verdict: "Handles heat well, ideal for engine bays or hot environments.",
    uses: ["Car clips", "High-temp enclosures", "Tool handles"],
    color: "#f59e0b",
  },
  {
    id: "asa",
    name: "ASA",
    tagline: "UV Outdoor",
    verdict: "UV-stable and weather-proof. Built for outdoor use.",
    uses: ["Garden mounts", "Outdoor brackets", "Signage"],
    color: "#ef4444",
  },
];

const rootRoute = getRouteApi("__root__");

function Home() {
  const { featured, products } = Route.useLoaderData();
  const { settings } = rootRoute.useLoaderData();
  // Parse configured hero slots (or fallback dynamically to products)
  let heroSlots: { slug: string; image?: string }[] = [];
  try {
    if (settings?.hero_featured_slots) {
      heroSlots = JSON.parse(settings.hero_featured_slots);
    }
  } catch (err) {
    console.error("Failed to parse hero_featured_slots:", err);
  }

  const mosaic = Array.from({ length: 4 }).map((_, i) => {
    const slot = heroSlots[i];
    if (slot && slot.slug) {
      const prod = products.find((p) => p.slug === slot.slug);
      if (prod) {
        return {
          ...prod,
          image: slot.image || prod.image,
        };
      }
    }
    // Fallback: pick product by index without skipping or out-of-bounds
    const fallbackProd = products.length > 0 ? products[i % products.length] : null;
    return fallbackProd ? { ...fallbackProd } : null;
  }).filter(Boolean) as typeof products;

  const [activePolymer, setActivePolymer] = useState("pla");
  const poly = POLYMERS.find((p) => p.id === activePolymer) ?? POLYMERS[0];

  const trustItems = [
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
      text: `Standard shipping ₹${settings.standard_shipping_fee || 49}, free over ₹${settings.free_shipping_threshold || 799}. Express if you need it sooner.`,
    },
  ];

  return (
    <div>
      {/* ── Hero ───────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Ambient gradient mesh */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-32 -right-32 size-[40rem] rounded-full bg-accent/20 blur-[120px] dark:bg-accent/10" />
          <div className="absolute top-1/2 -left-24 size-[30rem] rounded-full bg-accent/10 blur-[100px] dark:bg-accent/5" />
        </div>

        {/* Floating promo pill */}
        <div className="mx-auto max-w-6xl px-4 pt-6 md:px-6">
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-4 py-1.5 text-sm font-medium text-accent backdrop-blur-xl transition-all duration-200 hover:border-accent/40 hover:bg-accent/15"
          >
            <Zap className="size-3.5 shrink-0" strokeWidth={2} />
            {settings.promo_banner || `Free delivery across India on orders over ₹${settings.free_shipping_threshold || 799}`}
            <ArrowRight className="size-3.5 shrink-0" strokeWidth={2} />
          </Link>
        </div>

        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-10 md:grid-cols-12 md:px-6 md:py-16 lg:gap-16 lg:py-20">
          {/* Left: headline + CTA */}
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

          {/* Right: mosaic with floating badge */}
          <div className="relative md:col-span-6 lg:col-span-6">
            <div className="grid grid-cols-2 gap-3 sm:gap-4 items-start">
              {mosaic.map((p, i) => (
                <Link
                  key={`${p.slug}-${i}`}
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

            {/* Floating 4.9/5 trust badge */}
            <div className="absolute bottom-4 left-0 flex items-center gap-2 rounded-2xl border border-glass-border bg-glass px-3 py-2 backdrop-blur-2xl backdrop-saturate-150 shadow-xl shadow-black/10">
              <div className="flex items-center gap-1">
                <Star className="size-4 fill-amber-400 text-amber-400" strokeWidth={1.5} />
                <span className="text-sm font-semibold">4.9/5</span>
              </div>
              <span className="h-4 w-px bg-border" />
              <span className="text-xs text-muted">Quality Guaranteed</span>
            </div>

            {/* Decorative accent lines */}
            <div aria-hidden className="absolute -right-2 -bottom-2 hidden items-center gap-2 md:flex">
              <span className="h-px w-10 bg-accent/40" />
              <span className="h-px w-7 bg-accent/30" />
              <span className="h-px w-4 bg-accent/20" />
              <img src="/brand/mark.png" alt="" className="size-12 rounded-2xl" />
            </div>
          </div>
        </div>
      </section>

      {/* ── Polymer Ticker ─────────────────────────────────── */}
      <section className="border-y border-border/50">
        <div className="mx-auto max-w-6xl px-4 py-6 md:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            {/* Polymer pills */}
            <div className="flex gap-2 flex-wrap">
              {POLYMERS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setActivePolymer(p.id)}
                  className={cn(
                    "flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200",
                    activePolymer === p.id
                      ? "border-glass-border bg-glass text-fg backdrop-blur-2xl backdrop-saturate-150 shadow-lg shadow-black/5"
                      : "border-border text-muted hover:border-glass-border hover:text-fg hover:bg-glass hover:backdrop-blur-xl"
                  )}
                >
                  <span className="size-2 rounded-full shrink-0" style={{ background: p.color }} />
                  <span>{p.name}</span>
                  <span className="hidden sm:inline text-xs opacity-60">{p.tagline}</span>
                </button>
              ))}
            </div>

            {/* Verdict panel */}
            <div className="flex-1 rounded-2xl border border-glass-border bg-glass px-5 py-4 backdrop-blur-2xl backdrop-saturate-150 shadow-xl shadow-black/5 min-h-[72px]">
              <p className="text-sm font-medium text-fg">{poly.verdict}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {poly.uses.map((u) => (
                  <span key={u} className="rounded-full border border-border bg-surface px-2.5 py-0.5 text-xs text-muted">
                    {u}
                  </span>
                ))}
                <Link
                  to="/materials"
                  className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
                >
                  View filament specs
                  <ArrowRight className="size-3" strokeWidth={2} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust Bento Pods ───────────────────────────────── */}
      <section className="bg-surface/50">
        <div className="mx-auto grid max-w-6xl gap-4 px-4 py-12 md:grid-cols-3 md:px-6 md:py-14">
          {trustItems.map((item) => (
            <div
              key={item.title}
              className="flex gap-4 rounded-2xl border border-glass-border bg-glass p-5 backdrop-blur-2xl backdrop-saturate-150 shadow-xl shadow-black/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
            >
              <div className="size-11 shrink-0 rounded-xl border border-accent/20 bg-accent/10 flex items-center justify-center text-accent">
                <item.icon className="size-5" strokeWidth={1.75} />
              </div>
              <div>
                <h2 className="font-display text-base font-semibold tracking-tight">{item.title}</h2>
                <p className="mt-1 text-sm text-muted">{item.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Featured Products ──────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-20">
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-[11px] font-medium tracking-[0.18em] text-subtle uppercase">Shop</p>
            <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight md:text-4xl">Favourites</h2>
            <p className="mt-2 max-w-md text-sm text-muted">
              Small useful things for a desk, a shelf, a sink. Printed when you order.
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

      {/* ── Choose Your Path — Glass Bento Grid ────────────── */}
      <section className="bg-surface/50">
        <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-20">
          <p className="text-[11px] font-medium tracking-[0.18em] text-subtle uppercase">Get started</p>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight md:text-4xl">Choose your path</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">

            {/* Card 1 — Ready-made (spans 2 cols on lg) */}
            <Link
              to="/shop"
              className="group col-span-1 lg:col-span-2 rounded-3xl border border-glass-border bg-glass p-7 backdrop-blur-2xl backdrop-saturate-150 shadow-xl shadow-black/5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl md:p-8"
            >
              <p className="text-[11px] font-medium tracking-[0.18em] text-subtle uppercase">Ready-made</p>
              <h3 className="mt-3 font-display text-2xl font-semibold tracking-tight md:text-3xl">Browse the shop</h3>
              <p className="mt-3 max-w-sm text-sm text-muted">
                Stands, trays, planters, hooks. Pick a colour, we print it, it shows up. Prices on the card — that's the price.
              </p>
              <span className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-accent">
                Open shop
                <ArrowRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" />
              </span>
            </Link>

            {/* Card 2 — Upload */}
            <Link
              to="/custom"
              search={{ path: "upload" }}
              className="group col-span-1 rounded-3xl border border-glass-border bg-glass p-6 backdrop-blur-2xl backdrop-saturate-150 shadow-xl shadow-black/5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl"
            >
              <div className="size-10 rounded-xl border border-accent/20 bg-accent/10 flex items-center justify-center text-accent mb-3">
                <Upload className="size-5" strokeWidth={1.75} />
              </div>
              <h3 className="font-display text-xl font-semibold tracking-tight">Upload your model</h3>
              <p className="mt-2 text-sm text-muted">
                Have an STL or 3MF? Choose material and colour, see an estimate on the spot.
              </p>
            </Link>

            {/* Card 3 — Describe idea */}
            <Link
              to="/custom"
              search={{ path: "idea" }}
              className="group col-span-1 rounded-3xl border border-glass-border bg-glass p-6 backdrop-blur-2xl backdrop-saturate-150 shadow-xl shadow-black/5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl"
            >
              <div className="size-10 rounded-xl border border-accent/20 bg-accent/10 flex items-center justify-center text-accent mb-3">
                <WandSparkles className="size-5" strokeWidth={1.75} />
              </div>
              <h3 className="font-display text-xl font-semibold tracking-tight">Describe your idea</h3>
              <p className="mt-2 text-sm text-muted">
                No file? Tell us what you need. We'll model it, quote it, and print it.
              </p>
            </Link>

            {/* Card 4 — Filaments guide (full width on lg) */}
            <Link
              to="/materials"
              className="group col-span-1 md:col-span-2 lg:col-span-4 rounded-3xl border border-accent/20 bg-accent/5 p-6 backdrop-blur-2xl backdrop-saturate-150 shadow-xl shadow-black/5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl hover:border-accent/40"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[11px] font-medium tracking-[0.18em] text-accent uppercase">Materials Guide</p>
                  <h3 className="mt-1 font-display text-xl font-semibold tracking-tight">Filaments &amp; Materials</h3>
                  <p className="mt-1 text-sm text-muted">
                    Not sure which filament is right for your project? We break it all down.
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  {[
                    { name: "PLA", color: "#00b8a9" },
                    { name: "PETG", color: "#3b82f6" },
                    { name: "ABS", color: "#f59e0b" },
                    { name: "ASA", color: "#ef4444" },
                  ].map((m) => (
                    <span key={m.name} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-sm font-medium text-fg">
                      <span className="size-2 rounded-full shrink-0" style={{ background: m.color }} />
                      {m.name}
                    </span>
                  ))}
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-accent">
                    Explore specs
                    <ArrowRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" />
                  </span>
                </div>
              </div>
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
