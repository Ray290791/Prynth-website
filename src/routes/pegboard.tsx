import { createFileRoute, Link, getRouteApi, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  Sparkles,
  ShoppingBag,
  Check,
  Truck,
  ShieldCheck,
  Layers,
  Box,
  Zap,
  ArrowRight,
  Maximize2,
  ChevronDown,
  RotateCcw,
  Star,
  CheckCircle2,
  HelpCircle,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatINR } from "@/lib/format";
import { useCart } from "@/lib/cart-store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const rootRoute = getRouteApi("__root__");

export const Route = createFileRoute("/pegboard")({
  component: PegboardPage,
  head: () => ({
    meta: [
      { title: "The Modular Pegboard System | 3D Printed Desk & Wall Organizer | prynth!" },
      {
        name: "description",
        content:
          "Transform your desk into an intentional craft sanctum. Precision 3D-printed modular interlocking grid organizer with zero-damage mounting and snap-lock accessories.",
      },
    ],
  }),
});

interface AddonPack {
  id: string;
  name: string;
  desc: string;
  priceKey: "pegboard_addon_tech_price" | "pegboard_addon_desk_price" | "pegboard_addon_botanical_price";
  defaultPrice: number;
}

const ADDON_PACKS: AddonPack[] = [
  {
    id: "tech",
    name: "Tech Master Kit",
    desc: "Contoured headphone cradle, controller bracket, 3× magnetic cable guides",
    priceKey: "pegboard_addon_tech_price",
    defaultPrice: 299,
  },
  {
    id: "desk",
    name: "Desk Essentials Kit",
    desc: "Faceted pen vessel, sticky note / phone wedge, utility catch tray",
    priceKey: "pegboard_addon_desk_price",
    defaultPrice: 249,
  },
  {
    id: "botanical",
    name: "Botanical Shelf Pod",
    desc: "Geometric succulent planter pot + cantilevered floating wood-finish shelf",
    priceKey: "pegboard_addon_botanical_price",
    defaultPrice: 279,
  },
];

export function PegboardPage() {
  const { settings } = rootRoute.useLoaderData();
  const addToCart = useCart((s) => s.add);
  const navigate = useNavigate();

  // Images Gallery
  const images = useMemo(() => {
    try {
      if (settings?.pegboard_images) {
        const parsed = JSON.parse(settings.pegboard_images);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_e) {}
    return [
      {
        url: "/products/modular-pegboard.jpg",
        title: "Obsidian Matte Black",
        subtitle: "Contoured headphone rest, planter pod & cord management",
      },
      {
        url: "/products/pegboard-white.jpg",
        title: "Alabaster Crisp White",
        subtitle: "Dual-tile workspace setup with controller bracket & shelf",
      },
      {
        url: "/products/pegboard-detail.jpg",
        title: "Precision Snap-Lock Mechanism",
        subtitle: "High-tolerance beveled grid with whisper-firm accessory lock",
      },
    ];
  }, [settings?.pegboard_images]);

  const [activeImageIdx, setActiveImageIdx] = useState(0);

  // Sizing definitions mapped to settings pricing
  const SIZES = [
    {
      id: "compact",
      name: "Compact Desk",
      dims: "20 × 20 cm",
      desc: "Perfect for monitor risers & small headphone nooks",
      price: Number(settings.pegboard_price_compact || 699),
    },
    {
      id: "studio",
      name: "Studio Standard",
      dims: "30 × 30 cm",
      desc: "Our flagship size. Ideal for full desk setups",
      popular: true,
      price: Number(settings.pegboard_price_studio || 999),
    },
    {
      id: "executive",
      name: "Executive Pro",
      dims: "40 × 40 cm",
      desc: "High-capacity grid for audio gear & tech tools",
      price: Number(settings.pegboard_price_executive || 1499),
    },
    {
      id: "duo",
      name: "Dual Tile Duo",
      dims: "30 × 60 cm (2 Tiles)",
      desc: "Includes 2 interlocking panels + alignment clips",
      price: Number(settings.pegboard_price_duo || 1799),
    },
  ];

  // Colors
  const COLORS = [
    { id: "charcoal", name: "Obsidian Matte Black", hex: "#1F2328", bgClass: "bg-[#1F2328]" },
    { id: "bone", name: "Alabaster Crisp White", hex: "#F3F4F6", bgClass: "bg-[#F3F4F6]" },
    { id: "stone", name: "Slate Graphite", hex: "#4B5563", bgClass: "bg-[#4B5563]" },
    { id: "teal", name: "Cyber Teal Accent", hex: "#00B8A9", bgClass: "bg-[#00B8A9]" },
  ];

  // Mounting Options
  const MOUNTING_OPTIONS = [
    {
      id: "strips",
      name: "Zero-Damage Adhesive",
      detail: "Heavy-duty 3M command strips included. Perfect for rental apartments.",
    },
    {
      id: "screws",
      name: "Wall Anchor Kit",
      detail: "Includes drywall plugs & black countersunk screws for up to 5kg capacity.",
    },
    {
      id: "clamp",
      name: "Desk Edge Clamps",
      detail: "Heavy-duty brackets clamp directly to table edge without wall contact.",
    },
  ];

  // Active selections
  const [selectedSizeId, setSelectedSizeId] = useState("studio");
  const [selectedColorId, setSelectedColorId] = useState("charcoal");
  const [selectedMounting, setSelectedMounting] = useState("strips");
  const [selectedAddons, setSelectedAddons] = useState<string[]>(["tech"]);

  // Calculate pricing
  const currentSize = SIZES.find((s) => s.id === selectedSizeId) || SIZES[1];
  const currentColor = COLORS.find((c) => c.id === selectedColorId) || COLORS[0];

  const addonsTotal = selectedAddons.reduce((sum, addonId) => {
    const pack = ADDON_PACKS.find((p) => p.id === addonId);
    if (!pack) return sum;
    const price = Number(settings[pack.priceKey] || pack.defaultPrice);
    return sum + price;
  }, 0);

  const totalPrice = currentSize.price + addonsTotal;

  const toggleAddon = (id: string) => {
    setSelectedAddons((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleAddToCart = (redirectCheckout = false) => {
    const addonNames = selectedAddons
      .map((id) => ADDON_PACKS.find((p) => p.id === id)?.name)
      .filter(Boolean)
      .join(", ");

    const customSummary = [
      `Size: ${currentSize.name} (${currentSize.dims})`,
      `Color: ${currentColor.name}`,
      `Mounting: ${MOUNTING_OPTIONS.find((m) => m.id === selectedMounting)?.name}`,
      selectedAddons.length > 0 ? `Add-ons: ${addonNames}` : null,
    ]
      .filter(Boolean)
      .join(" · ");

    addToCart({
      kind: "product",
      productSlug: "modular-pegboard",
      name: `Modular Pegboard — ${currentSize.name}`,
      unitPrice: totalPrice,
      qty: 1,
      size: currentSize.name,
      material: "PETG / PLA Matte",
      color: currentColor.name,
      image:
        selectedColorId === "bone"
          ? "/products/pegboard-white.jpg"
          : "/products/modular-pegboard.jpg",
      custom: {
        path: "upload",
        material: "PETG / PLA Matte",
        quality: "Fine 0.16mm",
        infill: "20% Honeycomb Structural",
        color: currentColor.name,
        notes: customSummary,
      },
    });

    toast.success("Modular Pegboard added to your cart!", {
      description: `${currentSize.name} in ${currentColor.name}`,
    });

    if (redirectCheckout) {
      navigate({ to: "/checkout" });
    }
  };

  // FAQs
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const FAQS = [
    {
      q: "Will the adhesive strips damage my wall paint when removing?",
      a: "No. The system utilizes genuine high-shear Command release strips. Pulling the tab straight downward stretches the elastomeric adhesive, releasing cleanly without peeling drywall paint or leaving sticky residue.",
    },
    {
      q: "Can I interlock multiple pegboard panels together later?",
      a: "Yes! Every Modular Pegboard tile features integrated dove-tail alignment keys along all four perimeter edges. You can start with a single Studio tile today and snap additional tiles beside or above it seamlessly at any time.",
    },
    {
      q: "What weight can each pegboard tile safely hold?",
      a: "When mounted with the included adhesive strips, each tile is rated for 3.5 kg. When secured using the screw anchor kit, internal structural honeycomb ribs support up to 5.0 kg of gear per tile effortlessly.",
    },
    {
      q: "Can I 3D print my own custom accessories for this board?",
      a: "Absolutely. Our grid uses a universal 25mm pitch with 10×10mm beveled pill-slots. We provide free open-source STEP and STL mounting brackets so you can model and print your own custom holders.",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-14 space-y-16 sm:space-y-24">
      {/* HERO SECTION */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* LEFT: INTERACTIVE PRODUCT GALLERY */}
        <div className="lg:col-span-7 space-y-4">
          <div className="relative aspect-4/3 overflow-hidden rounded-2xl md:rounded-3xl border border-white/20 dark:border-white/10 bg-surface/50 backdrop-blur-2xl shadow-2xl shadow-black/10 group">
            <img
              src={images[activeImageIdx]?.url || "/products/modular-pegboard.jpg"}
              alt="Modular Pegboard System by Prynth!"
              className="w-full h-full object-cover transition-all duration-500 group-hover:scale-[1.02]"
            />

            {/* Floating Photo Caption Badge */}
            <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:max-w-md p-3.5 rounded-2xl border border-white/20 dark:border-white/10 bg-surface/80 backdrop-blur-xl shadow-lg">
              <span className="text-xs font-semibold text-fg block">
                {images[activeImageIdx]?.title || "Modular Pegboard"}
              </span>
              <span className="text-[11px] text-muted block mt-0.5">
                {images[activeImageIdx]?.subtitle || "Engineered 3D printed organization"}
              </span>
            </div>

            {/* Star badge */}
            <div className="absolute top-4 left-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-accent text-ink shadow-md shadow-accent/20">
              <Sparkles className="size-3.5" />
              <span>{settings.pegboard_badge || "Signature Star Product"}</span>
            </div>
          </div>

          {/* Thumbnail Selector */}
          <div className="grid grid-cols-3 gap-3">
            {images.map((img: any, idx: number) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveImageIdx(idx)}
                className={cn(
                  "relative aspect-4/3 rounded-xl overflow-hidden border transition-all text-left p-1 cursor-pointer",
                  activeImageIdx === idx
                    ? "border-accent ring-2 ring-accent/30 shadow-md scale-[1.02]"
                    : "border-border hover:border-fg/30 opacity-70 hover:opacity-100"
                )}
              >
                <img src={img.url} alt={img.title} className="w-full h-full object-cover rounded-lg" />
              </button>
            ))}
          </div>

          {/* Core Trust Badges */}
          <div className="grid grid-cols-3 gap-3 pt-3">
            <div className="p-3 rounded-xl border border-border/70 bg-surface/40 text-center space-y-1">
              <Truck className="size-4 text-accent mx-auto" />
              <span className="text-xs font-semibold text-fg block">Free Express</span>
              <span className="text-[10px] text-muted block">On orders over ₹799</span>
            </div>
            <div className="p-3 rounded-xl border border-border/70 bg-surface/40 text-center space-y-1">
              <ShieldCheck className="size-4 text-accent mx-auto" />
              <span className="text-xs font-semibold text-fg block">5kg Tested Load</span>
              <span className="text-[10px] text-muted block">Honeycomb ribs</span>
            </div>
            <div className="p-3 rounded-xl border border-border/70 bg-surface/40 text-center space-y-1">
              <RotateCcw className="size-4 text-accent mx-auto" />
              <span className="text-xs font-semibold text-fg block">7-Day Reprint</span>
              <span className="text-[10px] text-muted block">Risk-free quality</span>
            </div>
          </div>
        </div>

        {/* RIGHT: INTERACTIVE CONFIGURATOR */}
        <div className="lg:col-span-5 space-y-6">
          <div className="space-y-2">
            <span className="text-xs font-semibold tracking-wider text-accent uppercase block">
              Flagship Studio Hardware
            </span>
            <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-fg">
              {settings.pegboard_hero_title || "The Modular Pegboard System"}
            </h1>
            <p className="text-sm text-muted leading-relaxed">
              {settings.pegboard_hero_subtitle ||
                "Precision 3D printed modular wall and desk organization. Engineered for creators, tech setups, and intentional workspaces."}
            </p>
          </div>

          {/* Live Price Header */}
          <div className="flex items-baseline gap-3 p-4 rounded-2xl border border-white/20 dark:border-white/10 bg-surface/60 backdrop-blur-xl">
            <span className="text-3xl sm:text-4xl font-bold text-fg tracking-tight">
              {formatINR(totalPrice)}
            </span>
            <span className="text-xs text-muted">
              Includes mounting hardware & starter utility clips.
            </span>
          </div>

          {/* 1. SIZE SELECTION */}
          <div className="space-y-2.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-fg">1. Choose Panel Size</span>
              <span className="text-accent font-medium">{currentSize.dims}</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {SIZES.map((size) => (
                <button
                  key={size.id}
                  type="button"
                  onClick={() => setSelectedSizeId(size.id)}
                  className={cn(
                    "p-3 rounded-xl border text-left transition-all cursor-pointer relative",
                    selectedSizeId === size.id
                      ? "border-accent bg-accent/10 shadow-xs ring-1 ring-accent"
                      : "border-border bg-surface hover:bg-surface-2 hover:border-fg/20"
                  )}
                >
                  {size.popular && (
                    <span className="absolute -top-2 right-2 px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-accent text-ink">
                      Popular
                    </span>
                  )}
                  <span className="text-xs font-bold text-fg block">{size.name}</span>
                  <span className="text-[11px] text-muted block mt-0.5">{size.dims}</span>
                  <span className="text-xs font-semibold text-accent mt-1.5 block">
                    {formatINR(size.price)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* 2. COLOR SELECTION */}
          <div className="space-y-2.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-fg">2. Select Filament Color</span>
              <span className="text-muted">{currentColor.name}</span>
            </div>

            <div className="flex items-center gap-3">
              {COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setSelectedColorId(c.id);
                    if (c.id === "bone") setActiveImageIdx(1);
                    else if (c.id === "charcoal") setActiveImageIdx(0);
                  }}
                  className={cn(
                    "relative size-9 rounded-full border-2 transition-all cursor-pointer flex items-center justify-center",
                    c.bgClass,
                    selectedColorId === c.id
                      ? "border-accent ring-2 ring-accent/40 scale-110 shadow-md"
                      : "border-white/30 hover:scale-105"
                  )}
                  title={c.name}
                  aria-label={c.name}
                >
                  {selectedColorId === c.id && (
                    <Check
                      className={cn(
                        "size-4",
                        c.id === "bone" ? "text-ink" : "text-white"
                      )}
                      strokeWidth={3}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* 3. MOUNTING TYPE */}
          <div className="space-y-2.5">
            <span className="text-xs font-semibold text-fg block">3. Mounting Method</span>
            <div className="space-y-2">
              {MOUNTING_OPTIONS.map((m) => (
                <label
                  key={m.id}
                  onClick={() => setSelectedMounting(m.id)}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-xl border text-xs cursor-pointer transition-all",
                    selectedMounting === m.id
                      ? "border-accent/80 bg-accent/5 ring-1 ring-accent/30"
                      : "border-border bg-surface hover:bg-surface-2"
                  )}
                >
                  <input
                    type="radio"
                    name="mounting"
                    checked={selectedMounting === m.id}
                    onChange={() => setSelectedMounting(m.id)}
                    className="mt-0.5 text-accent focus:ring-accent"
                  />
                  <div>
                    <span className="font-semibold text-fg block">{m.name}</span>
                    <span className="text-[11px] text-muted block mt-0.5">{m.detail}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* 4. MODULAR ADD-ON PACKS */}
          <div className="space-y-2.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-fg">4. Add-on Accessory Packs</span>
              <span className="text-muted">Optional</span>
            </div>

            <div className="space-y-2">
              {ADDON_PACKS.map((pack) => {
                const isChecked = selectedAddons.includes(pack.id);
                const packPrice = Number(settings[pack.priceKey] || pack.defaultPrice);

                return (
                  <label
                    key={pack.id}
                    onClick={() => toggleAddon(pack.id)}
                    className={cn(
                      "flex items-start justify-between gap-3 p-3 rounded-xl border text-xs cursor-pointer transition-all",
                      isChecked
                        ? "border-accent bg-accent/5 ring-1 ring-accent/40"
                        : "border-border bg-surface hover:bg-surface-2"
                    )}
                  >
                    <div className="flex items-start gap-2.5">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="mt-0.5 rounded text-accent focus:ring-accent"
                      />
                      <div>
                        <span className="font-semibold text-fg block">{pack.name}</span>
                        <span className="text-[11px] text-muted block mt-0.5">{pack.desc}</span>
                      </div>
                    </div>
                    <span className="font-semibold text-accent shrink-0">
                      +{formatINR(packPrice)}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* CALL TO ACTION BUTTONS */}
          <div className="space-y-2.5 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                onClick={() => handleAddToCart(false)}
                variant="outline"
                className="h-12 font-medium cursor-pointer border-border hover:bg-surface-2 text-fg"
              >
                <ShoppingBag className="size-4 mr-2" />
                <span>Add to Cart</span>
              </Button>

              <Button
                type="button"
                onClick={() => handleAddToCart(true)}
                className="h-12 bg-accent text-ink hover:opacity-90 font-semibold cursor-pointer shadow-lg shadow-accent/20"
              >
                <span>Buy Now</span>
                <ArrowRight className="size-4 ml-1.5" />
              </Button>
            </div>

            <p className="text-[11px] text-muted text-center">
              Printed to order with premium matte filament · Ships across India
            </p>
          </div>
        </div>
      </section>

      {/* ARCHITECTURAL CRAFT STORY */}
      <section className="rounded-3xl border border-white/20 dark:border-white/10 bg-surface/40 backdrop-blur-2xl p-6 sm:p-10 md:p-14 space-y-8">
        <div className="max-w-2xl space-y-3">
          <span className="text-xs font-semibold text-accent tracking-wider uppercase">
            Design Philosophy
          </span>
          <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
            Engineered for Calm, Focused Workspaces
          </h2>
          <p className="text-sm sm:text-base text-muted leading-relaxed">
            {settings.pegboard_story ||
              "Every square millimetre of the Modular Pegboard was engineered with intention. 3D-printed from high-impact matte filament, it pairs an architectural silhouette with an ultra-versatile 25mm beveled grid. Whether you choose damage-free adhesive strips, desk edge clamps, or wall anchors, it transforms chaotic tool piles into a calm, focused craft sanctum."}
          </p>
        </div>

        {/* 4 Feature Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl border border-border/80 bg-surface/70 space-y-2.5">
            <div className="size-9 rounded-xl bg-accent/15 text-accent flex items-center justify-center font-bold">
              <Layers className="size-4.5" />
            </div>
            <h3 className="text-sm font-semibold text-fg">Modular Interlocking</h3>
            <p className="text-xs text-muted leading-relaxed">
              Snap multiple tiles together in landscape or portrait. Expansion clips preserve grid pitch without seams.
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-border/80 bg-surface/70 space-y-2.5">
            <div className="size-9 rounded-xl bg-accent/15 text-accent flex items-center justify-center font-bold">
              <Zap className="size-4.5" />
            </div>
            <h3 className="text-sm font-semibold text-fg">Whisper-Firm Lock</h3>
            <p className="text-xs text-muted leading-relaxed">
              Patented wedge-profile accessory lugs insert smoothly and click firm. Never wobbles or drops gear when unhooking.
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-border/80 bg-surface/70 space-y-2.5">
            <div className="size-9 rounded-xl bg-accent/15 text-accent flex items-center justify-center font-bold">
              <Box className="size-4.5" />
            </div>
            <h3 className="text-sm font-semibold text-fg">Architectural Matte</h3>
            <p className="text-xs text-muted leading-relaxed">
              Printed in anti-glare, fingerprint-resistant matte polymer that looks integrated into premium interior spaces.
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-border/80 bg-surface/70 space-y-2.5">
            <div className="size-9 rounded-xl bg-accent/15 text-accent flex items-center justify-center font-bold">
              <ShieldCheck className="size-4.5" />
            </div>
            <h3 className="text-sm font-semibold text-fg">5kg Tested Load</h3>
            <p className="text-xs text-muted leading-relaxed">
              Internal honeycomb triangulation distributes weight across the entire panel, handling studio headphones and heavy tech.
            </p>
          </div>
        </div>
      </section>

      {/* TECH SPECS & WHAT'S IN THE BOX */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        <div className="rounded-3xl border border-border bg-surface p-6 sm:p-8 space-y-4">
          <h3 className="text-lg font-bold text-fg flex items-center gap-2">
            <Maximize2 className="size-5 text-accent" />
            <span>Technical Specifications</span>
          </h3>

          <div className="divide-y divide-border text-xs">
            <div className="py-2.5 flex justify-between">
              <span className="text-muted">Grid Pitch</span>
              <span className="font-medium text-fg">25 mm Center-to-Center</span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-muted">Hole Geometry</span>
              <span className="font-medium text-fg">10 × 10 mm Beveled Pill-Slots</span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-muted">Panel Thickness</span>
              <span className="font-medium text-fg">8.5 mm Reinforced Tri-Wall</span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-muted">Wall Offset Clearance</span>
              <span className="font-medium text-fg">12 mm Air Gap (Cable Pass-thru)</span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-muted">Material Composition</span>
              <span className="font-medium text-fg">Matte Impact-Modified PETG / PLA Pro</span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-muted">Thermal Deflection</span>
              <span className="font-medium text-fg">Resistant up to 60°C (140°F)</span>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-surface p-6 sm:p-8 space-y-4">
          <h3 className="text-lg font-bold text-fg flex items-center gap-2">
            <CheckCircle2 className="size-5 text-accent" />
            <span>What's In The Box</span>
          </h3>

          <ul className="space-y-3 text-xs text-muted">
            <li className="flex items-start gap-2.5">
              <Check className="size-4 text-accent shrink-0 mt-0.5" />
              <span>
                <strong className="text-fg">Modular Pegboard Tile(s)</strong> — In your selected size and filament finish
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <Check className="size-4 text-accent shrink-0 mt-0.5" />
              <span>
                <strong className="text-fg">Mounting Hardware Kit</strong> — High-shear 3M adhesive strips & optional drywall screws
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <Check className="size-4 text-accent shrink-0 mt-0.5" />
              <span>
                <strong className="text-fg">Alignment & Expansion Keys</strong> — Interlocking connectors for multi-tile setups
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <Check className="size-4 text-accent shrink-0 mt-0.5" />
              <span>
                <strong className="text-fg">Starter Accessory Set</strong> — 2× utility pegs and 1× cable router clip
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <Check className="size-4 text-accent shrink-0 mt-0.5" />
              <span>
                <strong className="text-fg">Selected Add-on Kits</strong> — Pre-packed in padded eco-friendly mailer box
              </span>
            </li>
          </ul>
        </div>
      </section>

      {/* FREQUENTLY ASKED QUESTIONS */}
      <section className="space-y-6 max-w-3xl mx-auto">
        <div className="text-center space-y-2">
          <h2 className="font-display text-2xl font-bold tracking-tight">Frequently Asked Questions</h2>
          <p className="text-xs sm:text-sm text-muted">
            Everything you need to know about mounting, weight limits, and accessory compatibility.
          </p>
        </div>

        <div className="space-y-3">
          {FAQS.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl border border-border bg-surface transition-all overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full flex items-center justify-between p-4 sm:p-5 text-left text-sm font-semibold text-fg cursor-pointer hover:bg-surface-2/50"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={cn(
                      "size-4 text-muted transition-transform duration-200 shrink-0 ml-3",
                      isOpen && "rotate-180 text-accent"
                    )}
                  />
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 sm:px-5 sm:pb-5 text-xs sm:text-sm text-muted leading-relaxed border-t border-border/50 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* BOTTOM FLOATING BAR FOR FAST PURCHASE */}
      <div className="sticky bottom-4 z-30 mx-auto max-w-2xl rounded-2xl border border-white/20 dark:border-white/10 bg-surface/85 backdrop-blur-2xl p-3 sm:p-4 shadow-2xl shadow-black/20 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <span className="text-xs font-bold text-fg block truncate">
            {currentSize.name} · {currentColor.name}
          </span>
          <span className="text-xs font-semibold text-accent block">
            {formatINR(totalPrice)}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            onClick={() => handleAddToCart(false)}
            variant="outline"
            size="sm"
            className="h-9 px-3 text-xs font-medium cursor-pointer"
          >
            Add
          </Button>

          <Button
            type="button"
            onClick={() => handleAddToCart(true)}
            size="sm"
            className="h-9 px-4 text-xs font-semibold bg-accent text-ink hover:opacity-90 cursor-pointer shadow-md shadow-accent/20"
          >
            Buy Now
          </Button>
        </div>
      </div>
    </div>
  );
}
