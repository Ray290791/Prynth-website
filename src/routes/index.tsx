import { createFileRoute, Link, getRouteApi } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  ArrowRight,
  Clock3,
  ShieldCheck,
  Truck,
  Upload,
  Zap,
  Layers,
  Sparkles,
  PenTool,
  CheckCircle2,
} from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/logo";
import { getProductsPublic } from "@/lib/products-fns";
import { type Product } from "@/lib/products";
import { getLastVisited } from "@/lib/product-history";
import { cn } from "@/lib/utils";
import { TestimonialsSection } from "@/components/testimonials-carousel";


export const Route = createFileRoute("/")({
  loader: async () => {
    const products = await getProductsPublic();
    const featured = products.filter((p) => p.featured);
    return { featured, products };
  },
  head: () => ({
    links: [
      { rel: "canonical", href: "https://prynth.in/" },
    ],
    meta: [
      { title: "Prynth — 3D Printing Services & Custom 3D Printed Products India" },
      {
        name: "description",
        content:
          "Prynth is an on-demand 3D printing studio based in Mumbai, India. Get instant 3D printing quotes for STL files, custom CAD design, and shop precision 3D printed desk accessories with delivery across India.",
      },
      {
        name: "keywords",
        content:
          "3d printing services, 3d printed products, custom 3d printing, 3d printing india, mumbai 3d printing, desk accessories, rapid prototyping, prynth, online 3d printing",
      },
      { property: "og:title", content: "Prynth — 3D Printing Services & Custom 3D Printed Products India" },
      {
        property: "og:description",
        content:
          "High quality 3D prints at honest prices. Desk accessories, functional organization, and on-demand custom 3D printing & design. Ships across India.",
      },
      { property: "og:url", content: "https://prynth.in/" },
    ],
  }),
  component: Home,
});

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
      text: `Standard shipping ₹${settings.standard_shipping_fee || 79}, free over ₹${settings.free_shipping_threshold || 349}. Express priority delivery is always charged separately.`,
    },
  ];

  return (
    <div className="relative space-y-16 sm:space-y-24 pb-16 overflow-hidden">
      {/* ── Hero ───────────────────────────────────────────── */}
      <section className="relative z-10 overflow-hidden pt-2 sm:pt-4">
        {/* Floating promo announcement pill */}
        {settings.announcement_enabled !== "false" && (
          <div className="mx-auto max-w-6xl px-4 md:px-6">
            <Link
              to="/shop"
              className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-surface/80 px-3.5 py-1 text-xs font-medium text-muted transition-colors hover:border-accent hover:text-fg shadow-2xs backdrop-blur-md"
            >
              <Zap className="size-3 text-accent shrink-0" strokeWidth={2} />
              <span>{settings.promo_banner || `Free standard delivery across India on orders over ₹${settings.free_shipping_threshold || 349}`}</span>
              <ArrowRight className="size-3 text-subtle shrink-0" strokeWidth={2} />
            </Link>
          </div>
        )}

        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-8 md:grid-cols-12 md:px-6 md:py-14 lg:gap-14 lg:py-16">
          {/* Left: headline + concise value prop + clean CTAs */}
          <div className="relative z-10 md:col-span-6 lg:col-span-6 space-y-5">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface/70 border border-border/70 text-xs font-mono text-muted backdrop-blur-md">
              <span className="size-2 rounded-full bg-accent animate-pulse" />
              <span>PRECISION 3D STUDIO · MUMBAI, INDIA</span>
            </div>

            <h1 className="font-instrument text-5xl sm:text-6xl lg:text-7xl font-normal tracking-tight text-fg leading-[1.06]">
              Engineered form in{" "}
              <span className="italic text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-200 via-50% to-[#00b8a9] drop-shadow-sm">
                monolithic balance.
              </span>
            </h1>

            <div className="flex items-center gap-3 pt-0.5">
              <Wordmark className="text-xl sm:text-2xl tracking-tight opacity-95" />
              <span className="text-xs font-mono text-muted uppercase tracking-widest border-l border-border/60 pl-3">
                Bambu CoreXY Fleet
              </span>
            </div>

            <p className="text-base sm:text-lg text-muted font-jakarta leading-relaxed max-w-lg font-light">
              {settings.hero_tagline ||
                "Functional desk accessories, modular organization, and on-demand CAD engineering. Printed with micron precision on Bambu CoreXY."}
            </p>

            {/* Focused action buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button asChild size="lg" className="h-11 px-6 shadow-sm cursor-pointer">
                <Link to="/shop">
                  <span>Explore Shop</span>
                  <ArrowRight className="size-4 ml-1.5" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary" className="h-11 px-6 cursor-pointer">
                <Link to="/custom">
                  <PenTool className="size-4 mr-1.5" />
                  <span>Custom Print / CAD</span>
                </Link>
              </Button>
              <div className="text-xs font-mono text-muted flex items-center gap-2 pl-1">
                <span className="size-1.5 rounded-full bg-accent" />
                <span>DYNAMIC FLUID WAVE ACTIVE</span>
              </div>
            </div>

            {/* Sleek inline trust points */}
            <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs text-muted border-t border-border/60 pt-4">
              <span className="inline-flex items-center gap-1.5 font-medium text-fg">
                <CheckCircle2 className="size-3.5 text-accent shrink-0" />
                <span>0.12mm Layer Precision</span>
              </span>
              <span className="inline-flex items-center gap-1.5 font-medium text-fg">
                <CheckCircle2 className="size-3.5 text-accent shrink-0" />
                <span>Zero Minimum Quantity</span>
              </span>
              <span className="inline-flex items-center gap-1.5 font-medium text-fg">
                <CheckCircle2 className="size-3.5 text-accent shrink-0" />
                <span>Express Pan-India Delivery</span>
              </span>
            </div>
          </div>

          {/* Right: Balanced 2x2 product mosaic with glassmorphic depth */}
          <div className="relative md:col-span-6 lg:col-span-6">
            <div className="grid grid-cols-2 gap-3 sm:gap-4 items-center">
              {mosaic.map((p, i) => (
                <Link
                  key={`${p.slug}-${i}`}
                  to="/shop/$slug"
                  params={{ slug: p.slug }}
                  className={cn(
                    "group relative overflow-hidden rounded-2xl border border-border/80 bg-surface/80 backdrop-blur-md transition-all duration-300 hover:border-accent/60 shadow-xs",
                    i % 2 === 1 ? "sm:translate-y-4" : ""
                  )}
                >
                  <img
                    src={p.image}
                    alt={p.name}
                    className="product-photo aspect-square w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                    <span className="text-xs font-medium text-white truncate">{p.name}</span>
                  </div>
                </Link>
              ))}
            </div>

            {/* Floating fleet badge */}
            <div className="absolute -bottom-3 left-3 flex items-center gap-2 rounded-xl border border-border/80 bg-surface/90 px-3 py-1.5 shadow-md backdrop-blur-md">
              <span className="size-2 rounded-full bg-accent animate-pulse" />
              <span className="text-xs font-medium text-fg">Bambu CoreXY Fleet</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust Pillars (Sleek glassmorphic divider) ───────── */}
      <section className="relative z-10 border-y border-border/60 bg-surface/50 backdrop-blur-md">
        <div className="mx-auto grid max-w-6xl divide-y divide-border/60 md:divide-y-0 md:divide-x md:grid-cols-3 px-4 py-4 md:px-6 md:py-6">
          {trustItems.map((item) => (
            <div key={item.title} className="flex items-start gap-3.5 p-4 transition-colors">
              <div className="size-9 shrink-0 rounded-lg border border-border bg-surface flex items-center justify-center text-accent">
                <item.icon className="size-4.5" strokeWidth={1.8} />
              </div>
              <div>
                <h2 className="font-instrument text-lg font-normal text-fg">{item.title}</h2>
                <p className="mt-0.5 text-xs text-muted leading-relaxed font-jakarta">{item.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Featured Products ──────────────────────────────── */}
      <section className="relative z-10 mx-auto max-w-6xl px-4 md:px-6">
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end mb-8">
          <div>
            <p className="text-[11px] font-mono tracking-[0.2em] text-accent uppercase">Shop Collection</p>
            <h2 className="mt-1 font-instrument text-3xl sm:text-4xl font-normal italic tracking-tight text-fg">
              Desk &amp; Everyday Favourites
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-muted font-jakarta">
              Functional pieces printed to order in Mumbai. Honest pricing with zero hidden fees.
            </p>
          </div>
          <Button asChild variant="outline" size="sm" className="h-9 backdrop-blur-md bg-surface/60">
            <Link to="/shop">
              <span>View all {products.length > 0 ? `(${products.length})` : ""}</span>
              <ArrowRight className="size-3.5 ml-1" />
            </Link>
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
          {featured.map((p) => (
            <ProductCard key={p.slug} product={p} />
          ))}
        </div>
      </section>

      {/* ── Star Product Spotlight: Modular Pegboards ──────── */}
      <section className="relative z-10 mx-auto max-w-6xl px-4 md:px-6">
        <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-surface/70 p-6 sm:p-10 lg:p-12 shadow-sm backdrop-blur-md hover:border-accent/40 transition-colors">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-accent/15 text-accent border border-accent/20">
                <Sparkles className="size-3.5" />
                <span>{settings.pegboard_badge || "Signature Star Product"}</span>
              </div>
              <h2 className="font-instrument text-3xl sm:text-4xl md:text-5xl font-normal tracking-tight text-fg">
                {settings.pegboard_hero_title || "The Modular Pegboard System"}
              </h2>
              <p className="text-sm sm:text-base text-muted max-w-xl leading-relaxed font-jakarta">
                {settings.pegboard_hero_subtitle ||
                  "Precision 3D printed modular wall and desk organization. Engineered for creators, tech setups, and intentional workspaces."}
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                <span className="font-medium px-2.5 py-1 rounded-lg bg-surface-2 border border-border text-fg">
                  Interlocking Grid
                </span>
                <span className="font-medium px-2.5 py-1 rounded-lg bg-surface-2 border border-border text-fg">
                  Damage-Free Adhesive
                </span>
                <span className="font-medium px-2.5 py-1 rounded-lg bg-surface-2 border border-border text-fg">
                  Tool-Free Snap Accessories
                </span>
              </div>
              <div className="pt-2 flex flex-wrap items-center gap-4">
                <Button asChild className="h-11 px-6 bg-accent text-ink font-semibold hover:opacity-90 shadow-sm cursor-pointer">
                  <Link to="/pegboard">
                    <span>Configure Setup</span>
                    <ArrowRight className="size-4 ml-1.5" />
                  </Link>
                </Button>
                <span className="text-xs text-muted">
                  Tiles from <strong className="text-fg font-semibold">₹{settings.pegboard_price_compact || 200}</strong> · Complete starter kit ₹699
                </span>
              </div>
            </div>

            <div className="lg:col-span-5">
              <Link to="/pegboard" className="block relative aspect-4/3 rounded-2xl overflow-hidden border border-border group cursor-pointer shadow-xs">
                <img
                  src="/products/modular-pegboard.jpg"
                  alt="Modular Pegboard System"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Custom 3D Printing & CAD Studio (Simplified & Aesthetic) ── */}
      <section className="relative z-10 mx-auto max-w-6xl px-4 md:px-6">
        <div className="rounded-3xl border border-border/80 bg-surface/70 p-6 sm:p-10 shadow-sm backdrop-blur-md">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-3 py-1 text-xs font-semibold text-accent">
              <Layers className="size-3.5" />
              <span>On-Demand Custom Fabrication</span>
            </div>
            <h2 className="mt-3 font-instrument text-3xl sm:text-4xl md:text-5xl font-normal tracking-tight text-fg">
              Got a 3D model, sketch, or broken part?
            </h2>
            <p className="mt-2 text-sm sm:text-base text-muted leading-relaxed font-jakarta">
              No 3D modeling expertise needed. Upload an existing file for instant slicing, or describe what you need with photos and our CAD team will design, test, and print it.
            </p>
          </div>

          {/* 3 Step Workflow */}
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-border/80 bg-surface-2/40 p-5 space-y-2 backdrop-blur-sm">
              <span className="font-mono text-[11px] font-bold text-accent uppercase tracking-wider">01. Submit</span>
              <h3 className="font-instrument text-xl font-normal text-fg">File or Photo Idea</h3>
              <p className="text-xs text-muted leading-relaxed font-jakarta">
                Upload your STL/3MF for an instant quote, or send phone photos of a broken part or paper sketch.
              </p>
            </div>
            <div className="rounded-2xl border border-border/80 bg-surface-2/40 p-5 space-y-2 backdrop-blur-sm">
              <span className="font-mono text-[11px] font-bold text-accent uppercase tracking-wider">02. Engineer</span>
              <h3 className="font-instrument text-xl font-normal text-fg">CAD &amp; Tolerance Check</h3>
              <p className="text-xs text-muted leading-relaxed font-jakarta">
                We verify slice geometries, optimize infill density, and ensure structural rigidity for functional use.
              </p>
            </div>
            <div className="rounded-2xl border border-border/80 bg-surface-2/40 p-5 space-y-2 backdrop-blur-sm">
              <span className="font-mono text-[11px] font-bold text-accent uppercase tracking-wider">03. Deliver</span>
              <h3 className="font-instrument text-xl font-normal text-fg">Printed &amp; Shipped</h3>
              <p className="text-xs text-muted leading-relaxed font-jakarta">
                Manufactured on our Bambu Lab fleet, quality checked, and delivered to your doorstep anywhere in India.
              </p>
            </div>
          </div>

          {/* Clean Action Options */}
          <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-6 border-t border-border/60">
            <div className="flex flex-col sm:flex-row gap-3">
              <Button asChild className="h-11 px-5 shadow-xs cursor-pointer">
                <Link to="/custom" search={{ path: "upload" }}>
                  <Upload className="size-4 mr-2" />
                  <span>Upload 3D Model (STL / 3MF)</span>
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-11 px-5 cursor-pointer backdrop-blur-sm">
                <Link to="/custom" search={{ path: "idea" }}>
                  <PenTool className="size-4 mr-2" />
                  <span>Describe Idea or Broken Part</span>
                </Link>
              </Button>
            </div>
            <span className="text-xs text-subtle">
              Transparent per-gram rates · No setup fees
            </span>
          </div>
        </div>
      </section>

      {/* ── Materials & Polymers Selector ──────────────────── */}
      <section className="relative z-10 mx-auto max-w-6xl px-4 md:px-6">
        <div className="rounded-3xl border border-border/80 bg-surface/70 p-6 sm:p-8 shadow-sm backdrop-blur-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <p className="text-[11px] font-mono tracking-[0.2em] text-accent uppercase">Filament Guide</p>
              <h2 className="font-instrument text-2xl sm:text-3xl lg:text-4xl font-normal tracking-tight text-fg mt-1">
                Choose the right polymer for your application
              </h2>
            </div>
            <Link
              to="/materials"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline shrink-0"
            >
              <span>Full materials comparison</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            {/* Polymer pills */}
            <div className="flex gap-2 flex-wrap">
              {POLYMERS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setActivePolymer(p.id)}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs sm:text-sm font-medium transition-colors cursor-pointer backdrop-blur-sm",
                    activePolymer === p.id
                      ? "border-accent bg-accent/15 text-fg font-semibold shadow-xs"
                      : "border-border bg-surface-2/40 text-muted hover:border-border hover:text-fg"
                  )}
                >
                  <span className="size-2.5 rounded-full shrink-0" style={{ background: p.color }} />
                  <span>{p.name}</span>
                  <span className="text-xs opacity-60 hidden sm:inline">{p.tagline}</span>
                </button>
              ))}
            </div>

            {/* Verdict panel */}
            <div className="flex-1 rounded-2xl border border-border/80 bg-surface-2/40 backdrop-blur-sm px-4 py-3 min-h-[60px] flex flex-col justify-center">
              <p className="text-xs sm:text-sm font-medium text-fg">{poly.verdict}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-muted font-mono">Ideal for:</span>
                {poly.uses.map((u) => (
                  <span key={u} className="rounded-md border border-border bg-surface/80 px-2 py-0.5 text-[11px] text-muted font-medium">
                    {u}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Customer Testimonials & Social Proof */}
      <div className="relative z-10">
        <TestimonialsSection className="py-12 md:py-16 border-t border-border/60 bg-surface/30 backdrop-blur-md" />
      </div>

      {/* Pick up where you left off */}
      <div className="relative z-10">
        <LastVisitedSection products={products} />
      </div>
    </div>
  );
}

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
      <div className="mt-4 w-full max-w-xs sm:max-w-sm">
        <ProductCard product={product} />
      </div>
    </section>
  );
}
