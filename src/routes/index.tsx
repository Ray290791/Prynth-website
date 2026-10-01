import { createFileRoute, Link, getRouteApi, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  ArrowRight,
  Clock3,
  ShieldCheck,
  Truck,
  Upload,
  Zap,
  Camera,
  Layers,
  Printer,
  Wrench,
  Bike,
  Headphones,
  Gift,
  PenTool,
  DraftingCompass,
  Send,
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
        {/* Floating promo pill */}
        <div className="mx-auto max-w-6xl px-4 pt-6 md:px-6">
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-1.5 text-xs sm:text-sm font-medium text-fg transition-colors hover:border-accent hover:text-accent shadow-xs"
          >
            <Zap className="size-3.5 shrink-0 text-accent" strokeWidth={2} />
            <span>{settings.promo_banner || `Free delivery across India on orders over ₹${settings.free_shipping_threshold || 799}`}</span>
            <ArrowRight className="size-3.5 shrink-0 text-muted" strokeWidth={2} />
          </Link>
        </div>

        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-10 md:grid-cols-12 md:px-6 md:py-16 lg:gap-16 lg:py-20">
          {/* Left: headline + CTA */}
          <div className="relative z-10 md:col-span-6 lg:col-span-6">
            <p className="text-[11px] font-medium tracking-[0.18em] text-subtle uppercase">
              Custom 3D printing · Ready-made prints · Design from Scratch
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
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button asChild size="lg" className="shadow-xs cursor-pointer">
                <Link to="/custom" search={{ path: "idea" }}>
                  <PenTool className="size-4 shrink-0" />
                  Describe what you want
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary" className="cursor-pointer">
                <Link to="/shop">
                  Shop ready-made
                  <ArrowRight className="size-4" strokeWidth={1.75} />
                </Link>
              </Button>
            </div>

            {/* Informative service highlight banner right in Hero */}
            <div className="mt-6 flex items-start gap-3.5 rounded-xl border border-border bg-surface p-4 shadow-xs max-w-lg">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-2 text-accent mt-0.5">
                <Camera className="size-4.5" />
              </div>
              <div className="text-xs">
                <p className="font-semibold text-fg flex items-center gap-2">
                  <span>Have an idea or broken part?</span>
                  <span className="rounded-md border border-border bg-surface-2 px-2 py-0.5 text-[10px] font-medium text-muted">
                    No 3D file needed
                  </span>
                </p>
                <p className="text-muted mt-1 leading-relaxed">
                  Just describe what you need &amp; attach a few photos. Our CAD team models it, 3D prints it, and ships it right to your door.
                </p>
                <div className="mt-2.5 flex items-center gap-3">
                  <Link
                    to="/custom"
                    search={{ path: "idea" }}
                    className="inline-flex items-center gap-1 font-semibold text-accent hover:underline"
                  >
                    Start with an idea or photos
                    <ArrowRight className="size-3" />
                  </Link>
                  <span className="text-border">·</span>
                  <Link
                    to="/custom"
                    search={{ path: "upload" }}
                    className="text-subtle hover:text-fg hover:underline"
                  >
                    Have an STL? Upload here
                  </Link>
                </div>
              </div>
            </div>

            <p className="mt-4 text-xs text-subtle">
              Transparent pricing · Zero surprise fees · Made &amp; shipped across India
            </p>
          </div>

          {/* Right: mosaic with verified precision badge */}
          <div className="relative md:col-span-6 lg:col-span-6">
            <div className="grid grid-cols-2 gap-3 sm:gap-4 items-start">
              {mosaic.map((p, i) => (
                <Link
                  key={`${p.slug}-${i}`}
                  to="/shop/$slug"
                  params={{ slug: p.slug }}
                  className={
                    i % 2 === 1 ? "mt-6 overflow-hidden rounded-xl border border-border/60" : "overflow-hidden rounded-xl border border-border/60"
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

            {/* Verified precision manufacturing badge */}
            <div className="absolute bottom-4 left-0 flex items-center gap-2.5 rounded-xl border border-border bg-surface/95 px-3.5 py-2 shadow-md backdrop-blur-md">
              <div className="flex items-center gap-1.5 text-accent font-semibold text-xs">
                <ShieldCheck className="size-4" strokeWidth={2} />
                <span>0.08mm Precision</span>
              </div>
              <span className="h-3.5 w-px bg-border" />
              <span className="text-xs text-muted">Bambu Fleet Verified</span>
            </div>

            {/* Brand mark badge */}
            <div aria-hidden className="absolute -right-2 -bottom-2 hidden items-center md:flex">
              <img src="/brand/mark.png" alt="Prynth mark" className="size-11 rounded-xl shadow-xs border border-border" />
            </div>
          </div>
        </div>
      </section>

      {/* ── Polymer Ticker ─────────────────────────────────── */}
      <section className="border-y border-border/60 bg-surface/40">
        <div className="mx-auto max-w-6xl px-4 py-5 md:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            {/* Polymer pills */}
            <div className="flex gap-2 flex-wrap">
              {POLYMERS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setActivePolymer(p.id)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-3.5 py-1.5 text-xs sm:text-sm font-medium transition-colors cursor-pointer",
                    activePolymer === p.id
                      ? "border-accent bg-accent/10 text-fg font-semibold"
                      : "border-border bg-surface text-muted hover:border-border-hover hover:text-fg"
                  )}
                >
                  <span className="size-2 rounded-full shrink-0" style={{ background: p.color }} />
                  <span>{p.name}</span>
                  <span className="hidden sm:inline text-xs opacity-60">{p.tagline}</span>
                </button>
              ))}
            </div>

            {/* Verdict panel */}
            <div className="flex-1 rounded-xl border border-border bg-surface px-4 py-3 shadow-2xs min-h-[64px]">
              <p className="text-xs sm:text-sm font-medium text-fg">{poly.verdict}</p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {poly.uses.map((u) => (
                  <span key={u} className="rounded-md border border-border bg-surface-2/60 px-2 py-0.5 text-[11px] text-muted">
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

      {/* ── Trust Bar (Clean connected industrial divider) ──── */}
      <section className="border-b border-border/60 bg-surface/30">
        <div className="mx-auto grid max-w-6xl divide-y divide-border/60 md:divide-y-0 md:divide-x md:grid-cols-3 px-4 py-6 md:px-6 md:py-8">
          {trustItems.map((item) => (
            <div
              key={item.title}
              className="flex gap-4 p-4 sm:p-5 transition-colors"
            >
              <div className="size-10 shrink-0 rounded-lg border border-border bg-surface-2/70 flex items-center justify-center text-fg">
                <item.icon className="size-5" strokeWidth={1.75} />
              </div>
              <div>
                <h2 className="font-display text-sm font-semibold tracking-tight text-fg">{item.title}</h2>
                <p className="mt-1 text-xs text-muted leading-relaxed">{item.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Idea-to-Print Showcase Section ────────────────── */}
      <IdeaToPrintSection />

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

      {/* ── Choose Your Path ──────────────────────────────── */}
      <section className="border-t border-border/60 bg-surface/30">
        <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-20">
          <p className="text-[11px] font-medium tracking-[0.18em] text-subtle uppercase">Get started</p>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight md:text-4xl">Choose your path</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">

            {/* Card 1 — Ready-made (spans 2 cols on lg) */}
            <Link
              to="/shop"
              className="group col-span-1 lg:col-span-2 rounded-xl border border-border bg-surface p-6 md:p-8 shadow-xs transition-colors hover:border-accent/50"
            >
              <p className="text-[11px] font-medium tracking-[0.18em] text-subtle uppercase">Ready-made</p>
              <h3 className="mt-2 font-display text-2xl font-semibold tracking-tight text-fg">Browse the shop</h3>
              <p className="mt-2 max-w-sm text-sm text-muted leading-relaxed">
                Stands, trays, planters, hooks. Pick a colour, we print it, it shows up. Prices on the card — that's the price.
              </p>
              <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-accent">
                <span>Open shop</span>
                <ArrowRight className="size-4" />
              </span>
            </Link>

            {/* Card 2 — Upload */}
            <Link
              to="/custom"
              search={{ path: "upload" }}
              className="group col-span-1 rounded-xl border border-border bg-surface p-6 shadow-xs transition-colors hover:border-accent/50"
            >
              <div className="size-10 rounded-lg border border-border bg-surface-2 flex items-center justify-center text-fg mb-4">
                <Upload className="size-5" strokeWidth={1.75} />
              </div>
              <h3 className="font-display text-lg font-semibold tracking-tight text-fg">Upload your model</h3>
              <p className="mt-2 text-xs sm:text-sm text-muted leading-relaxed">
                Have an STL or 3MF? Choose material and colour, see an estimate on the spot.
              </p>
            </Link>

            {/* Card 3 — Describe idea */}
            <Link
              to="/custom"
              search={{ path: "idea" }}
              className="group col-span-1 rounded-xl border border-border bg-surface p-6 shadow-xs transition-colors hover:border-accent/50"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="size-10 rounded-lg border border-border bg-surface-2 flex items-center justify-center text-fg">
                  <DraftingCompass className="size-5" strokeWidth={1.75} />
                </div>
                <span className="rounded-md border border-border bg-surface-2 px-2 py-0.5 text-[10px] font-medium text-muted">
                  Photos welcome
                </span>
              </div>
              <h3 className="font-display text-lg font-semibold tracking-tight text-fg">Describe your idea</h3>
              <p className="mt-2 text-xs sm:text-sm text-muted leading-relaxed">
                No 3D file needed. Describe what you need, attach photos of a broken part or sketch, and we&apos;ll model, print &amp; ship it.
              </p>
              <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline">
                Start with idea or photo &rarr;
              </span>
            </Link>

            {/* Card 4 — Filaments guide (full width on lg) */}
            <Link
              to="/materials"
              className="group col-span-1 md:col-span-2 lg:col-span-4 rounded-xl border border-border bg-surface p-6 shadow-xs transition-colors hover:border-accent/50"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[11px] font-medium tracking-[0.18em] text-accent uppercase">Materials Guide</p>
                  <h3 className="mt-1 font-display text-xl font-semibold tracking-tight text-fg">Filaments &amp; Materials</h3>
                  <p className="mt-1 text-sm text-muted">
                    Not sure which filament is right for your project? We break it all down.
                  </p>
                </div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  {[
                    { name: "PLA", color: "#00b8a9" },
                    { name: "PETG", color: "#3b82f6" },
                    { name: "ABS", color: "#f59e0b" },
                    { name: "ASA", color: "#ef4444" },
                  ].map((m) => (
                    <span key={m.name} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-2/60 px-3 py-1 text-xs font-medium text-fg">
                      <span className="size-2 rounded-full shrink-0" style={{ background: m.color }} />
                      {m.name}
                    </span>
                  ))}
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-accent ml-2">
                    Explore specs
                    <ArrowRight className="size-3.5" />
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

function IdeaToPrintSection() {
  const [ideaText, setIdeaText] = useState("");
  const navigate = useNavigate();

  const presets = [
    {
      label: "Washing machine knob",
      category: "Broken Appliance",
      idea: "Replacement rotary dial knob for washing machine with D-shaft slot and grip ridges",
    },
    {
      label: "Helmet wall hook + key rack",
      category: "Home & Bike",
      idea: "Wall mount hook for motorcycle helmet with an extra slot for keys and jacket loop",
    },
    {
      label: "Under-desk dual headphone hanger",
      category: "Desk Setup",
      idea: "Dual headphone mount that clamps under a 20mm desk with integrated cable channel",
    },
    {
      label: "Car AC vent phone mount",
      category: "Vehicle Mount",
      idea: "Car dashboard phone holder clip that snaps into AC vent slats firmly",
    },
    {
      label: "Backlit lithophane photo lamp",
      category: "Custom Gift",
      idea: "Curved 3D lithophane photo frame that reveals photo details when illuminated",
    },
  ];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = ideaText.trim();
    if (!text) {
      void navigate({ to: "/custom", search: { path: "idea" } });
    } else {
      void navigate({ to: "/custom", search: { path: "idea", idea: text } });
    }
  }

  return (
    <section className="relative overflow-hidden border-t border-border/60 bg-surface/20 py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-1 text-xs font-medium text-muted shadow-2xs">
            <Layers className="size-3.5 text-accent" />
            <span>On-Demand 3D Design &amp; Print Service</span>
          </div>
          <h2 className="mt-4 font-display text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-fg">
            Got an idea or a broken part? <br className="hidden sm:inline" />
            <span className="text-accent">We model, print &amp; ship it.</span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-muted leading-relaxed">
            You don&apos;t need CAD software or 3D files. Tell us what you want in plain words, attach a few phone photos or a napkin sketch, and our engineering team will 3D model it from scratch, precision-print it on our Bambu Lab fleet, and express-courier it to your doorstep anywhere in India.
          </p>
        </div>

        {/* 3 Step Workflow Cards */}
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {/* Step 1 */}
          <div className="rounded-xl border border-border bg-surface p-6 shadow-xs hover:border-accent/40 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className="flex size-10 items-center justify-center rounded-lg border border-border bg-surface-2 text-fg">
                <Camera className="size-5" strokeWidth={1.75} />
              </div>
              <span className="font-mono text-xs font-semibold text-subtle tracking-wider uppercase">
                Phase 01
              </span>
            </div>
            <h3 className="font-display text-lg font-semibold text-fg">
              1. Describe &amp; Attach Photos
            </h3>
            <p className="mt-2 text-xs sm:text-sm text-muted leading-relaxed">
              Describe what you need in simple everyday words. Snap phone photos of your broken piece from a few angles (with a ruler or coin for scale) or upload a quick paper sketch.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 pt-3 border-t border-border/50 text-[11px] font-medium text-muted">
              <span className="rounded-md border border-border/70 bg-surface-2/40 px-2 py-0.5">Phone photos accepted</span>
              <span className="rounded-md border border-border/70 bg-surface-2/40 px-2 py-0.5">No CAD files required</span>
            </div>
          </div>

          {/* Step 2 */}
          <div className="rounded-xl border border-border bg-surface p-6 shadow-xs hover:border-accent/40 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className="flex size-10 items-center justify-center rounded-lg border border-border bg-surface-2 text-fg">
                <Layers className="size-5" strokeWidth={1.75} />
              </div>
              <span className="font-mono text-xs font-semibold text-subtle tracking-wider uppercase">
                Phase 02
              </span>
            </div>
            <h3 className="font-display text-lg font-semibold text-fg">
              2. We 3D Model &amp; Preview
            </h3>
            <p className="mt-2 text-xs sm:text-sm text-muted leading-relaxed">
              Our CAD designers engineer a robust, print-ready 3D model. We share previews and confirm critical measurements with you before manufacturing. Clear, upfront design fee with zero surprise bills.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 pt-3 border-t border-border/50 text-[11px] font-medium text-muted">
              <span className="rounded-md border border-border/70 bg-surface-2/40 px-2 py-0.5">Design preview sign-off</span>
              <span className="rounded-md border border-border/70 bg-surface-2/40 px-2 py-0.5">Upfront transparent quote</span>
            </div>
          </div>

          {/* Step 3 */}
          <div className="rounded-xl border border-border bg-surface p-6 shadow-xs hover:border-accent/40 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className="flex size-10 items-center justify-center rounded-lg border border-border bg-surface-2 text-fg">
                <Printer className="size-5" strokeWidth={1.75} />
              </div>
              <span className="font-mono text-xs font-semibold text-subtle tracking-wider uppercase">
                Phase 03
              </span>
            </div>
            <h3 className="font-display text-lg font-semibold text-fg">
              3. 3D Printed &amp; Shipped Pan-India
            </h3>
            <p className="mt-2 text-xs sm:text-sm text-muted leading-relaxed">
              Manufactured on our high-speed Bambu Lab fleet using durable polymers (PLA, PETG, ABS, ASA). Quality inspected, securely packaged, and couriered straight to your door across India.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 pt-3 border-t border-border/50 text-[11px] font-medium text-muted">
              <span className="rounded-md border border-border/70 bg-surface-2/40 px-2 py-0.5">Bambu Lab precision</span>
              <span className="rounded-md border border-border/70 bg-surface-2/40 px-2 py-0.5">Pan-India express delivery</span>
            </div>
          </div>
        </div>

        {/* Real-Life Everyday Inspiration Cards */}
        <div className="mt-14 rounded-2xl border border-border bg-surface p-6 md:p-8 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <p className="text-[11px] font-medium tracking-[0.18em] text-accent uppercase">Real-World Examples</p>
              <h3 className="font-display text-2xl font-semibold tracking-tight text-fg mt-1">
                What can you get designed &amp; made?
              </h3>
            </div>
            <p className="text-xs text-muted max-w-sm">
              From broken kitchen appliances to custom car and bike gadgets — if it exists as plastic or an idea, we can make it.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-border/70 bg-surface-2/30 p-4 space-y-2 hover:border-accent/40 transition-colors">
              <div className="flex items-center gap-2 text-accent font-semibold text-sm">
                <Wrench className="size-4 shrink-0" />
                <span>Broken Appliance Parts</span>
              </div>
              <p className="text-xs text-muted leading-relaxed">
                Washing machine control dials, refrigerator drawer clips, AC vent slats, mixer-grinder safety locks. Don&apos;t discard a ₹20,000 appliance over a ₹200 plastic tab.
              </p>
            </div>

            <div className="rounded-xl border border-border/70 bg-surface-2/30 p-4 space-y-2 hover:border-accent/40 transition-colors">
              <div className="flex items-center gap-2 text-accent font-semibold text-sm">
                <Bike className="size-4 shrink-0" />
                <span>Bike, Helmet &amp; Car Mounts</span>
              </div>
              <p className="text-xs text-muted leading-relaxed">
                Handlebar GPS clips, action cam chin mounts, sun-visor clips, bottle cages. Printed in UV-resistant ASA &amp; high-impact PETG built for Indian roads and heat.
              </p>
            </div>

            <div className="rounded-xl border border-border/70 bg-surface-2/30 p-4 space-y-2 hover:border-accent/40 transition-colors">
              <div className="flex items-center gap-2 text-accent font-semibold text-sm">
                <Headphones className="size-4 shrink-0" />
                <span>Desk &amp; Setup Accessories</span>
              </div>
              <p className="text-xs text-muted leading-relaxed">
                Dual headphone under-desk hangers, stream deck docks, mechanical keyboard rests, cable raceways shaped exactly to your table thickness.
              </p>
            </div>

            <Link
              to="/lithophane"
              className="group rounded-xl border border-border/70 bg-surface-2/30 p-4 space-y-2 hover:border-accent/60 hover:bg-surface-2/60 transition-all flex flex-col justify-between cursor-pointer"
            >
              <div>
                <div className="flex items-center justify-between text-accent font-semibold text-sm">
                  <div className="flex items-center gap-2">
                    <Gift className="size-4 shrink-0" />
                    <span>Custom Gifts &amp; Lithophanes</span>
                  </div>
                  <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold text-accent group-hover:bg-accent group-hover:text-ink transition-colors">
                    3D Studio
                  </span>
                </div>
                <p className="text-xs text-muted leading-relaxed mt-2">
                  Turn your family or pet photo into a glowing 3D backlit night-lamp in optical white PLA with warm solid wood LED base.
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-accent pt-1 group-hover:translate-x-0.5 transition-transform">
                <span>Launch Photo-to-3D Studio</span>
                <ArrowRight className="size-3.5" />
              </div>
            </Link>
          </div>

          {/* Interactive Idea Input Box */}
          <div className="mt-8 rounded-xl border border-border bg-surface-2/50 p-5 sm:p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center gap-2">
                <PenTool className="size-4 text-accent" />
                <label htmlFor="home-idea-input" className="text-sm font-semibold text-fg">
                  Try it now — what do you need made?
                </label>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  id="home-idea-input"
                  type="text"
                  value={ideaText}
                  onChange={(e) => setIdeaText(e.target.value)}
                  placeholder="e.g. A wall hook that holds a cycle helmet and keys, palm sized..."
                  className="flex-1 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm text-fg placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent shadow-2xs"
                />
                <Button type="submit" size="lg" className="shrink-0 gap-2 shadow-xs font-semibold cursor-pointer">
                  <Send className="size-4" />
                  Describe &amp; Attach Photos
                  <ArrowRight className="size-4" />
                </Button>
              </div>

              {/* Clickable Quick Presets */}
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                <span className="text-muted font-medium">Quick ideas:</span>
                {presets.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => setIdeaText(p.idea)}
                    className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2.5 py-1 text-xs text-fg hover:border-accent hover:text-accent transition-colors cursor-pointer"
                  >
                    <span>{p.label}</span>
                  </button>
                ))}
              </div>
            </form>
          </div>
        </div>

        {/* Bottom Quick-Switch Link */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-sm text-muted">
          <span>Already have a 3D model file ready?</span>
          <Link
            to="/custom"
            search={{ path: "upload" }}
            className="inline-flex items-center gap-1.5 font-semibold text-accent hover:underline"
          >
            <Upload className="size-3.5" />
            Upload STL / 3MF for instant quote &rarr;
          </Link>
        </div>
      </div>
    </section>
  );
}

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
      <div className="mt-4 w-full max-w-xs sm:max-w-sm">
        <ProductCard product={product} />
      </div>
    </section>
  );
}
