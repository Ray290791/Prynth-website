import { useState, useEffect, useRef } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Upload,
  Image as ImageIcon,
  RotateCw,
  ShoppingBag,
  Sparkles,
  Heart,
  Layers,
  Check,
  ShieldCheck,
  Truck,
  Gift,
  Lightbulb,
  Sliders,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { formatINR } from "@/lib/format";
import { useCart, type CustomSpec } from "@/lib/cart-store";
import { cn } from "@/lib/utils";
import {
  LithophaneViewer,
  type LithophaneShape,
} from "@/components/lithophane-viewer";
import { SAMPLE_PHOTOS } from "@/lib/lithophane-samples";

export const Route = createFileRoute("/lithophane")({
  component: LithophaneStudioPage,
  head: () => ({
    meta: [
      { title: "Custom 3D Lithophane Photo Lamp & Keepsake | prynth!" },
      {
        name: "description",
        content:
          "Turn your favorite photos into glowing 3D printed lithophane lamps and romantic heart keepsakes. Custom carved in optical white PLA with warm solid wood LED bases.",
      },
    ],
  }),
});

type AspectRatio = "landscape" | "portrait" | "square";
type KitChoice = "lithophane_only" | "lithophane_with_light_base";
type SizeTier = "medium" | "standard" | "large";

interface ShapeOption {
  id: LithophaneShape;
  name: string;
  tag: string;
  description: string;
}

const SHAPES: ShapeOption[] = [
  {
    id: "flat",
    name: "Classic Flat Panel",
    tag: "Popular",
    description: "Architectural flat portrait relief with precision beveled border. Clean & versatile for all photos.",
  },
  {
    id: "heart",
    name: "Heart Keepsake",
    tag: "Romantic",
    description: "Heart contour tailored for couples, anniversaries, weddings, and Valentine's Day gifts.",
  },
];

const KITS: {
  id: KitChoice;
  name: string;
  price: number;
  tag: string;
  description: string;
  includes: string[];
}[] = [
  {
    id: "lithophane_only",
    name: "Printed Lithophane Only",
    price: 399,
    tag: "Minimalist",
    description: "The custom 3D printed lithophane plate with an angled tabletop kickstand easel. (No light source included)",
    includes: [
      "Custom 0.12mm High-Resolution Lithophane",
      "Tabletop Kickstand Display Easel",
      "Illuminates beautifully in window sunlight or with your own lamp",
    ],
  },
  {
    id: "lithophane_with_light_base",
    name: "Lithophane + LED Wooden Light Base & Stand",
    price: 749,
    tag: "Recommended",
    description: "The complete setup: Lithophane plate + Solid Beech Wood Oval Base that serves as both the sturdy stand and the warm light source.",
    includes: [
      "Custom 0.12mm High-Resolution Lithophane",
      "Solid Beech Wood Oval LED Base (Stand + Light)",
      "Warm Tungsten Light with USB Cable & Switch",
      "Plug into any phone charger, laptop, or powerbank",
    ],
  },
];

const SIZES: {
  id: SizeTier;
  label: string;
  extraPrice: number;
  dims: Record<AspectRatio, { width: number; height: number }>;
}[] = [
  {
    id: "medium",
    label: "Medium (Bedside)",
    extraPrice: 0,
    dims: {
      landscape: { width: 120, height: 90 },
      portrait: { width: 90, height: 120 },
      square: { width: 105, height: 105 },
    },
  },
  {
    id: "standard",
    label: "Standard (Living Room)",
    extraPrice: 150,
    dims: {
      landscape: { width: 150, height: 100 },
      portrait: { width: 100, height: 150 },
      square: { width: 125, height: 125 },
    },
  },
  {
    id: "large",
    label: "Deluxe (Mantlepiece)",
    extraPrice: 350,
    dims: {
      landscape: { width: 190, height: 130 },
      portrait: { width: 130, height: 190 },
      square: { width: 155, height: 155 },
    },
  },
];

const GIFT_PACKAGING_FEE = 149;

function LithophaneStudioPage() {
  const navigate = useNavigate();
  const add = useCart((s) => s.add);

  // Customizer state
  const [photoUrl, setPhotoUrl] = useState<string>("");
  const [activeSample, setActiveSample] = useState<string>("couple");
  const [aspect, setAspect] = useState<AspectRatio>("landscape");
  const [shape, setShape] = useState<LithophaneShape>("flat");
  const [kit, setKit] = useState<KitChoice>("lithophane_with_light_base");
  const [size, setSize] = useState<SizeTier>("standard");
  const [backlightOn, setBacklightOn] = useState<boolean>(true);
  const [contrast, setContrast] = useState<number>(1.15);
  const [invert, setInvert] = useState<boolean>(false);
  const [isGift, setIsGift] = useState<boolean>(false);
  const [giftMessage, setGiftMessage] = useState<string>("");
  const [recipientName, setRecipientName] = useState<string>("");
  const [qty, setQty] = useState<number>(1);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize with sample photo
  useEffect(() => {
    setPhotoUrl(SAMPLE_PHOTOS[0].url);
  }, []);

  // Sync backlight and base when kit changes
  useEffect(() => {
    if (kit === "lithophane_only") {
      setBacklightOn(false);
    } else {
      setBacklightOn(true);
    }
  }, [kit]);

  const selectedSizeConfig = SIZES.find((s) => s.id === size)!;
  const currentDims = selectedSizeConfig.dims[aspect];
  const selectedKitConfig = KITS.find((k) => k.id === kit)!;

  // Base unit price calculations
  const baseUnitPrice = selectedKitConfig.price + selectedSizeConfig.extraPrice;
  const giftFeePerItem = isGift ? GIFT_PACKAGING_FEE : 0;
  const finalUnitPrice = baseUnitPrice + giftFeePerItem;
  const rawSubtotal = finalUnitPrice * qty;

  // Bulk tier discount calculation
  let bulkDiscountRate = 0;
  if (qty >= 20) bulkDiscountRate = 0.15;
  else if (qty >= 10) bulkDiscountRate = 0.1;
  else if (qty >= 5) bulkDiscountRate = 0.05;

  const totalDiscount = Math.round(rawSubtotal * bulkDiscountRate);
  const finalTotal = rawSubtotal - totalDiscount;

  // Handle local user photo upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload a valid image file (JPEG, PNG, or WebP)");
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast.error("Image file is too large (max 20MB)");
      return;
    }

    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setPhotoUrl(result);
        setActiveSample("");
        toast.success("Photo loaded! Generating HD 3D Lithophane…");
      }
      setIsProcessing(false);
    };
    reader.onerror = () => {
      toast.error("Could not read image file");
      setIsProcessing(false);
    };
    reader.readAsDataURL(file);
  };

  const selectSample = (sampleId: string) => {
    setActiveSample(sampleId);
    const sample = SAMPLE_PHOTOS.find((s) => s.id === sampleId);
    if (sample) {
      setPhotoUrl(sample.url);
    }
  };

  const handleAddToCart = () => {
    if (!photoUrl) {
      toast.error("Please upload or select a photo first.");
      return;
    }

    const shapeLabel = shape === "heart" ? "Heart Keepsake" : "Classic Flat Panel";
    const kitLabel =
      kit === "lithophane_with_light_base"
        ? "Lithophane + Wooden LED Light Base"
        : "Lithophane Plate Only (with Stand)";

    const giftNotes = isGift
      ? ` [GIFT PACKAGING REQUESTED: Luxury Black Ribbon Box, Conceal Invoice Prices${
          recipientName.trim() ? ` · To: ${recipientName.trim()}` : ""
        }${giftMessage.trim() ? ` · Message Card: "${giftMessage.trim()}"` : ""}]`
      : "";

    const customSpec: CustomSpec = {
      path: "idea",
      quality: "Ultra-fine (0.12mm)",
      infill: "100% Solid",
      color: "Optical Jade White",
      material: "Lithophane White PLA (0.12mm)",
      dimensions: `${currentDims.width} × ${currentDims.height} mm (${shapeLabel})`,
      notes: `Shape: ${shapeLabel} · Package: ${kitLabel}${giftNotes}`,
      referencePhotos: [photoUrl],
    };

    const cartTitle = isGift
      ? `3D Lithophane · ${shapeLabel} 🎁 (Gift Packed)`
      : `3D Lithophane · ${shapeLabel}`;

    add({
      kind: "custom",
      name: cartTitle,
      image: photoUrl,
      color: "Optical Jade White",
      size: `${currentDims.width} × ${currentDims.height} mm (${selectedSizeConfig.label})`,
      material: "Lithophane White PLA (0.12mm)",
      unitPrice: finalUnitPrice,
      qty,
      custom: customSpec,
    });

    toast.success("Custom Lithophane added to cart!", {
      action: {
        label: "View Cart",
        onClick: () => void navigate({ to: "/cart" }),
      },
    });
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-12">
      {/* Header & Headings */}
      <div className="max-w-3xl space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
          <Sparkles className="size-3.5" />
          <span>Precision 3D Lithophane Studio · 0.12mm Micro-Carving</span>
        </div>
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl text-fg">
          Turn Your Memories into a Glowing 3D Lithophane Lamp
        </h1>
        <p className="text-sm sm:text-base text-muted leading-relaxed">
          Order just the carved 3D lithophane plate, or get the complete setup with a solid beech wood LED light base that doubles as a sturdy desktop stand.
        </p>
      </div>

      {/* Main Studio Grid */}
      <div className="mt-8 grid gap-8 lg:grid-cols-12">
        {/* Left Column: 3D Viewer & Photo Adjustment Tools (7 cols) */}
        <div className="space-y-6 lg:col-span-7">
          {/* 3D WebGL Lithophane Viewer */}
          <div className="space-y-2">
            <LithophaneViewer
              imageSrc={photoUrl}
              shape={shape}
              sizeMm={currentDims}
              backlightOn={backlightOn}
              onToggleBacklight={() => setBacklightOn(!backlightOn)}
              contrast={contrast}
              invert={invert}
              hasWoodenBase={kit === "lithophane_with_light_base"}
            />
            <div className="flex items-center justify-between px-1 text-xs text-muted">
              <span className="flex items-center gap-1.5">
                <RotateCw className="size-3 text-accent" />
                Drag to rotate 360° · Scroll to zoom
              </span>
              <span>
                {kit === "lithophane_with_light_base"
                  ? "Shown on Solid Beech Wood LED Base"
                  : "Shown on Minimalist Desktop Kickstand"}
              </span>
            </div>
          </div>

          {/* Photo Source & Uploader Card */}
          <div className="rounded-2xl border border-border bg-surface p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm text-fg flex items-center gap-2">
                  <ImageIcon className="size-4 text-accent" />
                  <span>Choose or Upload Your Photo</span>
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  High-contrast photos with clear faces look breathtaking when illuminated.
                </p>
              </div>

              {/* Upload Button */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="gap-2 cursor-pointer font-semibold"
              >
                <Upload className="size-3.5" />
                Upload Photo
              </Button>
            </div>

            {/* Quick Sample Presets */}
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-muted">Or preview with high-res sample photos:</span>
              <div className="grid grid-cols-3 gap-2">
                {SAMPLE_PHOTOS.map((sample) => (
                  <button
                    key={sample.id}
                    type="button"
                    onClick={() => selectSample(sample.id)}
                    className={cn(
                      "flex flex-col items-start p-2.5 rounded-xl border text-left transition-colors cursor-pointer",
                      activeSample === sample.id
                        ? "border-accent bg-accent/10 ring-1 ring-accent"
                        : "border-border bg-surface-2/40 hover:border-accent/40"
                    )}
                  >
                    <span className="text-xs font-semibold text-fg line-clamp-1">{sample.name}</span>
                    <span className="text-[10px] text-accent mt-0.5">{sample.tag}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Photo Crop & Aspect Ratio */}
            <div className="pt-2 border-t border-border/60 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-fg">Aspect Ratio &amp; Orientation:</span>
                <span className="text-muted">
                  {aspect === "landscape" ? "3:2 Horizontal" : aspect === "portrait" ? "2:3 Vertical" : "1:1 Square"}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: "landscape", label: "Landscape (3:2)" },
                    { id: "portrait", label: "Portrait (2:3)" },
                    { id: "square", label: "Square (1:1)" },
                  ] as const
                ).map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setAspect(a.id)}
                    className={cn(
                      "py-2 px-3 rounded-lg text-xs font-semibold transition-colors border cursor-pointer",
                      aspect === a.id
                        ? "border-accent bg-accent text-ink"
                        : "border-border bg-surface-2 text-muted hover:text-fg"
                    )}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Fine-Tuning Sliders: Contrast & Invert */}
            <div className="pt-2 border-t border-border/60 grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-fg flex items-center gap-1">
                    <Sliders className="size-3 text-muted" /> Contrast Relief:
                  </span>
                  <span className="font-mono text-muted">{contrast.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="0.8"
                  max="1.5"
                  step="0.05"
                  value={contrast}
                  onChange={(e) => setContrast(parseFloat(e.target.value))}
                  className="w-full accent-accent cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0">
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-fg">
                  <input
                    type="checkbox"
                    checked={invert}
                    onChange={(e) => setInvert(e.target.checked)}
                    className="size-4 rounded border-border accent-accent cursor-pointer"
                  />
                  <span>Invert Negative</span>
                </label>
              </div>
            </div>
          </div>

          {/* Value Badges */}
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-border bg-surface p-3.5 space-y-1">
              <div className="flex items-center gap-1.5 text-accent font-semibold text-xs">
                <Sparkles className="size-3.5 shrink-0" />
                <span>0.12mm Resolution</span>
              </div>
              <p className="text-[11px] text-muted leading-relaxed">
                Vertical 3D printed with 100% solid infill for smooth photographic continuous-tone shadows.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-surface p-3.5 space-y-1">
              <div className="flex items-center gap-1.5 text-accent font-semibold text-xs">
                <Truck className="size-3.5 shrink-0" />
                <span>48h Dispatch</span>
              </div>
              <p className="text-[11px] text-muted leading-relaxed">
                Custom manufactured in Bengaluru. High-density shock-proof bubble packaging ensures zero transit damage.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-surface p-3.5 space-y-1">
              <div className="flex items-center gap-1.5 text-accent font-semibold text-xs">
                <ShieldCheck className="size-3.5 shrink-0" />
                <span>Solid Beech Wood</span>
              </div>
              <p className="text-[11px] text-muted leading-relaxed">
                Optional LED base is carved from solid natural beech wood with warm 3000K LED and USB switch.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Configurator & Order Summary (5 cols, sticky) */}
        <div className="space-y-6 lg:col-span-5">
          <div className="rounded-2xl border border-border bg-surface p-5 space-y-6 shadow-xs lg:sticky lg:top-24">
            {/* Step 1: Shape Selection */}
            <div className="space-y-2.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted">
                1. Select Shape
              </Label>
              <div className="grid gap-2">
                {SHAPES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setShape(s.id)}
                    className={cn(
                      "flex items-start justify-between p-3 rounded-xl border text-left transition-all cursor-pointer",
                      shape === s.id
                        ? "border-accent bg-accent/5 ring-1 ring-accent"
                        : "border-border bg-surface-2/30 hover:border-accent/40"
                    )}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-fg">{s.name}</span>
                        {s.id === "heart" && <Heart className="size-3.5 text-rose-500 fill-rose-500" />}
                        <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold text-accent">
                          {s.tag}
                        </span>
                      </div>
                      <p className="text-xs text-muted mt-0.5 pr-2">{s.description}</p>
                    </div>
                    <div
                      className={cn(
                        "size-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5",
                        shape === s.id ? "border-accent bg-accent text-ink" : "border-border"
                      )}
                    >
                      {shape === s.id && <Check className="size-2.5 stroke-[3]" />}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Light Source & Stand Option */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted">
                  2. Choose Setup &amp; Light Source
                </Label>
              </div>
              <div className="grid gap-2.5">
                {KITS.map((k) => (
                  <div
                    key={k.id}
                    onClick={() => setKit(k.id)}
                    className={cn(
                      "rounded-xl border p-3.5 transition-all cursor-pointer",
                      kit === k.id
                        ? "border-accent bg-accent/5 ring-1 ring-accent"
                        : "border-border bg-surface-2/30 hover:border-accent/40"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-fg">{k.name}</span>
                          <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold text-accent">
                            {k.tag}
                          </span>
                        </div>
                        <p className="text-xs text-muted mt-1 leading-relaxed">{k.description}</p>
                        <ul className="mt-2 space-y-0.5 text-[11px] text-muted">
                          {k.includes.map((inc, i) => (
                            <li key={i} className="flex items-center gap-1.5">
                              <Check className="size-3 text-accent shrink-0" />
                              <span>{inc}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <span className="text-sm font-bold tabular-nums text-accent shrink-0">
                        {formatINR(k.price)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Step 3: Size Selection */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted">
                  3. Select Size
                </Label>
                <span className="text-xs text-muted tabular-nums">
                  {currentDims.width} × {currentDims.height} mm
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {SIZES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSize(s.id)}
                    className={cn(
                      "flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-colors cursor-pointer",
                      size === s.id
                        ? "border-accent bg-accent/10 ring-1 ring-accent text-fg"
                        : "border-border bg-surface-2/40 text-muted hover:text-fg"
                    )}
                  >
                    <span className="text-xs font-semibold">{s.label.split(" ")[0]}</span>
                    <span className="text-[10px] text-muted mt-0.5">
                      {s.dims[aspect].width}×{s.dims[aspect].height}mm
                    </span>
                    <span className="text-[10px] font-semibold text-accent mt-0.5">
                      {s.extraPrice === 0 ? "Included" : `+${formatINR(s.extraPrice)}`}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 4: "Make this a Gift" Option Card */}
            <div
              className={cn(
                "rounded-xl border p-4 transition-all space-y-3",
                isGift
                  ? "border-accent/40 bg-accent/5 ring-1 ring-accent/30"
                  : "border-border bg-surface-2/20"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isGift}
                    onChange={(e) => setIsGift(e.target.checked)}
                    className="mt-0.5 size-4 rounded border-border accent-accent cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-semibold text-fg flex items-center gap-1.5">
                      <Gift className="size-3.5 text-accent" />
                      <span>Make this a gift</span>
                      <span className="text-[10px] text-accent font-medium">+₹149</span>
                    </span>
                    <span className="text-[11px] text-muted block mt-0.5">
                      Packed in a luxury matte black presentation box with ribbon, prices concealed on packing slips, and a custom printed gift message card.
                    </span>
                  </div>
                </label>
              </div>

              {/* Gift Message Inputs when checked */}
              {isGift && (
                <div className="space-y-2.5 pt-2 border-t border-border/60 animate-in fade-in duration-150">
                  <div>
                    <Label htmlFor="recipient" className="text-xs text-muted block mb-1">
                      Recipient Name (optional):
                    </Label>
                    <input
                      id="recipient"
                      type="text"
                      maxLength={30}
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      placeholder="e.g. Priya &amp; Rahul"
                      className="w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-fg placeholder:text-muted focus:border-accent focus:outline-none"
                    />
                  </div>

                  <div>
                    <Label htmlFor="giftMsg" className="text-xs text-muted block mb-1">
                      Personal Message for Greeting Card:
                    </Label>
                    <textarea
                      id="giftMsg"
                      rows={2}
                      maxLength={180}
                      value={giftMessage}
                      onChange={(e) => setGiftMessage(e.target.value)}
                      placeholder="e.g. Happy 1st Anniversary! Forever and always ❤️"
                      className="w-full rounded-lg border border-border bg-surface p-2.5 text-xs text-fg placeholder:text-muted focus:border-accent focus:outline-none resize-none"
                    />
                    <div className="flex justify-between text-[10px] text-muted mt-0.5">
                      <span>We will print this onto a metallic foil card.</span>
                      <span>{giftMessage.length}/180</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Step 5: Quantity & Bulk Tier */}
            <div className="pt-2 border-t border-border/60 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-fg">Quantity</Label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setQty(Math.max(1, qty - 1))}
                    className="flex size-7 items-center justify-center rounded-lg border border-border bg-surface text-fg hover:bg-surface-2 cursor-pointer font-bold"
                  >
                    −
                  </button>
                  <span className="w-8 text-center font-mono text-sm font-semibold tabular-nums text-fg">
                    {qty}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQty(qty + 1)}
                    className="flex size-7 items-center justify-center rounded-lg border border-border bg-surface text-fg hover:bg-surface-2 cursor-pointer font-bold"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Bulk Tier Notification */}
              {bulkDiscountRate > 0 ? (
                <div className="rounded-lg bg-accent/10 border border-accent/25 px-2.5 py-1.5 text-xs text-accent font-semibold flex items-center justify-between">
                  <span>🎉 Bulk discount applied! ({bulkDiscountRate * 100}% OFF)</span>
                  <span className="tabular-nums">−{formatINR(totalDiscount)}</span>
                </div>
              ) : (
                <p className="text-[11px] text-muted">
                  Need multiple for event giveaways or family? 5+ get 5% off, 10+ get 10% off.
                </p>
              )}
            </div>

            {/* Price Summary & Submit Button */}
            <div className="pt-3 border-t border-border space-y-3">
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-xs text-muted block">Total Price:</span>
                  <span className="text-2xl font-bold font-display tabular-nums text-fg">
                    {formatINR(finalTotal)}
                  </span>
                </div>
                <span className="text-xs text-muted text-right">
                  {qty > 1 && `${formatINR(finalUnitPrice)} × ${qty} pcs`}
                  <br />
                  <span className="text-emerald-500 font-semibold">Free shipping included</span>
                </span>
              </div>

              <Button
                type="button"
                size="lg"
                onClick={handleAddToCart}
                disabled={!photoUrl || isProcessing}
                className="w-full gap-2 font-semibold shadow-md cursor-pointer"
              >
                <ShoppingBag className="size-4" />
                Add to Cart · {formatINR(finalTotal)}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
