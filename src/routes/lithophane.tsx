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
  Sun,
  Sliders,
  ArrowRight,
  Info,
  Crop,
  Maximize2,
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
  type LithophaneFitMode,
} from "@/components/lithophane-viewer";
import {
  LithophaneFramingModal,
  type CropConfig,
} from "@/components/lithophane-framing-modal";
import { SAMPLE_PHOTOS } from "@/lib/lithophane-samples";

export const Route = createFileRoute("/lithophane")({
  component: LithophaneStudioPage,
  head: () => ({
    meta: [
      { title: "Custom 3D Printed Lithophanes & Window Keepsakes | prynth!" },
      {
        name: "description",
        content:
          "Transform your favorite memories into tactile 3D printed lithophanes illuminated naturally by window sunlight or ambient room light. Includes a free 3D-printed display stand.",
      },
    ],
  }),
});

type AspectRatio = "landscape" | "portrait" | "square";
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
    description: "Architectural flat portrait relief with precision beveled border. Clean & versatile for window sills and desks.",
  },
  {
    id: "heart",
    name: "Heart Keepsake",
    tag: "Romantic",
    description: "Heart contour tailored for couples, anniversaries, weddings, and memorable keepsake gifts.",
  },
];

const SIZES: {
  id: SizeTier;
  label: string;
  basePrice: number;
  description: string;
  dims: Record<AspectRatio, { width: number; height: number }>;
}[] = [
  {
    id: "medium",
    label: "Medium",
    basePrice: 399,
    description: "Compact & intimate. Ideal for window sills and cozy desks.",
    dims: {
      landscape: { width: 120, height: 90 },
      portrait: { width: 90, height: 120 },
      square: { width: 105, height: 105 },
    },
  },
  {
    id: "standard",
    label: "Standard",
    basePrice: 549,
    description: "Our most popular size. High definition micro-detail.",
    dims: {
      landscape: { width: 150, height: 100 },
      portrait: { width: 100, height: 150 },
      square: { width: 125, height: 125 },
    },
  },
  {
    id: "large",
    label: "Deluxe",
    basePrice: 749,
    description: "Maximum photographic resolution and gallery presence.",
    dims: {
      landscape: { width: 190, height: 130 },
      portrait: { width: 130, height: 190 },
      square: { width: 155, height: 155 },
    },
  },
];

const GIFT_PACKAGING_FEE = 99;

function LithophaneStudioPage() {
  const navigate = useNavigate();
  const add = useCart((s) => s.add);

  // Customizer state
  const [rawPhotoUrl, setRawPhotoUrl] = useState<string>("");
  const [photoUrl, setPhotoUrl] = useState<string>("");
  const [cropConfig, setCropConfig] = useState<CropConfig>({ scale: 1.25, panX: 0, panY: -10 });
  const [isFramingOpen, setIsFramingOpen] = useState<boolean>(false);
  const [activeSample, setActiveSample] = useState<string>("couple");
  const [aspect, setAspect] = useState<AspectRatio>("landscape");
  const [shape, setShape] = useState<LithophaneShape>("flat");
  const [size, setSize] = useState<SizeTier>("standard");
  const [backlightOn, setBacklightOn] = useState<boolean>(true);
  const [contrast, setContrast] = useState<number>(1.15);
  const [invert, setInvert] = useState<boolean>(false);
  const [fitMode, setFitMode] = useState<LithophaneFitMode>("dynamic");
  const [isGift, setIsGift] = useState<boolean>(false);
  const [giftMessage, setGiftMessage] = useState<string>("");
  const [recipientName, setRecipientName] = useState<string>("");
  const [qty, setQty] = useState<number>(1);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize with sample photo
  useEffect(() => {
    setRawPhotoUrl(SAMPLE_PHOTOS[0].url);
    setPhotoUrl(SAMPLE_PHOTOS[0].url);
  }, []);

  const selectedSizeConfig = SIZES.find((s) => s.id === size)!;
  const currentDims = selectedSizeConfig.dims[aspect];

  // Base unit price calculations (100% in-house 3D printed + free stand included)
  const baseUnitPrice = selectedSizeConfig.basePrice;
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
        setRawPhotoUrl(result);
        setPhotoUrl(result);
        setActiveSample("");
        toast.success("Photo loaded!");
        // Automatically open the framing modal so user can fit faces into the shape
        setIsFramingOpen(true);
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
      setRawPhotoUrl(sample.url);
      setPhotoUrl(sample.url);
    }
  };

  const handleAddToCart = () => {
    if (!photoUrl) {
      toast.error("Please upload or select a photo first.");
      return;
    }

    const shapeLabel = shape === "heart" ? "Heart Keepsake" : "Classic Flat Panel";

    const giftNotes = isGift
      ? ` [GIFT PACKAGING REQUESTED: Luxury Ribbon Gift Box, Conceal Invoice Prices${
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
      notes: `Shape: ${shapeLabel} · Fit: ${fitMode === "dynamic" ? "Dynamic Scale (Preserve Ratio)" : "Strict Frame (Stretch to Fit)"} · Includes Free 3D-Printed Desktop Stand${giftNotes}`,
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
          <span>100% In-House 3D Printed · 0.12mm Micro-Carving</span>
        </div>
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl text-fg">
          Turn Your Memories into a Sunlit 3D Lithophane
        </h1>
        <p className="text-sm sm:text-base text-muted leading-relaxed">
          Custom carved in optical Jade White PLA. Place it on your window sill where sunlight naturally streams through from behind, revealing your photo in rich continuous-tone detail. Every piece includes a free matching 3D-printed display stand.
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
              fitMode={fitMode}
            />
            <div className="flex items-center justify-between px-1 text-xs text-muted">
              <span className="flex items-center gap-1.5">
                <RotateCw className="size-3 text-accent" />
                Drag to rotate 360° · Scroll to inspect 3D carved relief texture
              </span>
              <span className="text-fg font-medium">
                Shown with Included 3D-Printed Desktop Display Stand
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
                  High-contrast photos with clear faces look breathtaking when backlit by sunlight.
                </p>
              </div>

              {/* Upload & Framing Action Buttons */}
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsFramingOpen(true)}
                  className="gap-1.5 cursor-pointer font-semibold text-xs border-accent/40 bg-accent/5 hover:bg-accent/10 text-accent"
                >
                  <Crop className="size-3.5" />
                  <span>Adjust Framing</span>
                </Button>
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
            </div>

            {/* Heart Silhouette helper prompt */}
            {shape === "heart" && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs animate-in fade-in duration-150">
                <div className="flex items-center gap-2 text-rose-300">
                  <Heart className="size-4 shrink-0 fill-rose-500 text-rose-500" />
                  <span>
                    <strong>Heart Cutout Active:</strong> Drag and scale faces into the upper lobes so they aren't cut off by the heart outline.
                  </span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => setIsFramingOpen(true)}
                  className="shrink-0 h-7 text-xs font-semibold gap-1.5 cursor-pointer bg-surface text-fg hover:bg-surface-2 self-start sm:self-auto"
                >
                  <Crop className="size-3 text-accent" />
                  <span>Fit into Heart</span>
                </Button>
              </div>
            )}

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

            {/* Image Scaling on Ratio Change (Dynamic vs Strict) */}
            <div className="pt-2 border-t border-border/60 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-fg flex items-center gap-1.5">
                  <Maximize2 className="size-3.5 text-accent" />
                  <span>Image Scaling on Ratio Change:</span>
                </span>
                <span className="text-muted text-[11px]">
                  {fitMode === "dynamic" ? "Locked 1:1 (No distortion)" : "Stretched edge-to-edge"}
                </span>
              </div>

              <div className="grid sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFitMode("dynamic")}
                  className={cn(
                    "flex flex-col items-start p-3 rounded-xl border text-left transition-all cursor-pointer relative",
                    fitMode === "dynamic"
                      ? "border-accent bg-accent/10 ring-1 ring-accent text-fg"
                      : "border-border bg-surface-2/40 text-muted hover:text-fg hover:border-accent/30"
                  )}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-semibold flex items-center gap-1.5">
                      <span>Dynamic Scale</span>
                      <span className="rounded-full bg-accent/20 px-1.5 py-0.2 text-[9px] font-bold text-accent uppercase">
                        Recommended
                      </span>
                    </span>
                    <div
                      className={cn(
                        "size-3.5 rounded-full border flex items-center justify-center shrink-0",
                        fitMode === "dynamic" ? "border-accent bg-accent text-ink" : "border-border"
                      )}
                    >
                      {fitMode === "dynamic" && <Check className="size-2.5 stroke-[3]" />}
                    </div>
                  </div>
                  <p className="text-[11px] text-muted mt-1 leading-snug">
                    Maintains natural proportions. Ratio changes adapt smoothly with zero stretching or squishing of faces.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setFitMode("stretch")}
                  className={cn(
                    "flex flex-col items-start p-3 rounded-xl border text-left transition-all cursor-pointer relative",
                    fitMode === "stretch"
                      ? "border-accent bg-accent/10 ring-1 ring-accent text-fg"
                      : "border-border bg-surface-2/40 text-muted hover:text-fg hover:border-accent/30"
                  )}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-semibold">Strict Frame</span>
                    <div
                      className={cn(
                        "size-3.5 rounded-full border flex items-center justify-center shrink-0",
                        fitMode === "stretch" ? "border-accent bg-accent text-ink" : "border-border"
                      )}
                    >
                      {fitMode === "stretch" && <Check className="size-2.5 stroke-[3]" />}
                    </div>
                  </div>
                  <p className="text-[11px] text-muted mt-1 leading-snug">
                    Stretches or squeezes the entire image to fill the exact plate borders without any cropping.
                  </p>
                </button>
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
                <span>3D Bas-Relief Depth</span>
              </div>
              <p className="text-[11px] text-muted leading-relaxed">
                Carved in 0.8mm – 3.4mm physical polymer depth. Every facial contour and background detail has real sculptural relief.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-surface p-3.5 space-y-1">
              <div className="flex items-center gap-1.5 text-accent font-semibold text-xs">
                <Sun className="size-3.5 shrink-0" />
                <span>Sunlight Backlit</span>
              </div>
              <p className="text-[11px] text-muted leading-relaxed">
                Zero wires or batteries needed. Place it on a window sill or desk lamp to reveal the illuminated image.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-surface p-3.5 space-y-1">
              <div className="flex items-center gap-1.5 text-accent font-semibold text-xs">
                <ShieldCheck className="size-3.5 shrink-0" />
                <span>Free Stand Included</span>
              </div>
              <p className="text-[11px] text-muted leading-relaxed">
                Every print includes a custom-angled 3D-printed pedestal stand in Matte Charcoal PLA at no extra cost.
              </p>
            </div>
          </div>

          {/* Educational Feature Section: Why Lithophanes Need Rear Light */}
          <div className="rounded-2xl border border-border bg-surface-2/30 p-5 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-fg">
              <Info className="size-4 text-accent" />
              <span>How Lithophanes Work: The Magic of Rear Sunlight</span>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              Unlike ordinary 2D photo prints or bottom-lit acrylics, a true 3D lithophane is an optical light filter sculpted in polymer relief:
            </p>
            <div className="grid sm:grid-cols-2 gap-3 pt-1 text-xs">
              <div className="rounded-xl border border-border/80 bg-surface p-3 space-y-1">
                <span className="font-semibold text-fg block">☀️ Light from the Back</span>
                <p className="text-muted text-[11px] leading-relaxed">
                  Thin plastic sections (0.8mm) let sunlight pass through as bright highlights, while thicker sections (3.4mm) block light to create rich, deep shadows.
                </p>
              </div>
              <div className="rounded-xl border border-border/80 bg-surface p-3 space-y-1">
                <span className="font-semibold text-fg block">🌱 Zero Electronic Hassle</span>
                <p className="text-muted text-[11px] leading-relaxed">
                  No cheap LED strips that burn out, no messy USB cables, and no batteries to replace. 100% durable in-house 3D printing that lasts a lifetime.
                </p>
              </div>
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
                    onClick={() => {
                      setShape(s.id);
                      if (s.id === "heart") {
                        setIsFramingOpen(true);
                      }
                    }}
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

            {/* Step 2: Size Selection (All include free 3D-printed stand) */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted">
                  2. Select Orientation &amp; Size
                </Label>
                <span className="text-xs text-muted tabular-nums">
                  {currentDims.width} × {currentDims.height} mm
                </span>
              </div>

              {/* Quick orientation pills */}
              <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-surface-2/60 border border-border">
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
                      "py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center",
                      aspect === a.id
                        ? "bg-accent text-ink shadow-xs"
                        : "text-muted hover:text-fg"
                    )}
                  >
                    {a.label}
                  </button>
                ))}
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
                    <span className="text-xs font-semibold">{s.label}</span>
                    <span className="text-[10px] text-muted mt-0.5">
                      {s.dims[aspect].width}×{s.dims[aspect].height}mm
                    </span>
                    <span className="text-xs font-bold text-accent mt-1">
                      {formatINR(s.basePrice)}
                    </span>
                  </button>
                ))}
              </div>
              <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-[11px] text-emerald-400 font-medium flex items-center gap-2">
                <Check className="size-3.5 text-emerald-400 shrink-0" />
                <span>Includes free 3D-printed desktop display stand with every size!</span>
              </div>
            </div>

            {/* Step 3: "Make this a Gift" Option Card */}
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
                      <span className="text-[10px] text-accent font-medium">+{formatINR(GIFT_PACKAGING_FEE)}</span>
                    </span>
                    <span className="text-[11px] text-muted block mt-0.5">
                      Packed in a luxury presentation gift box with ribbon, concealed invoice prices, and a custom printed metallic greeting card.
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

            {/* Step 4: Quantity & Bulk Tier */}
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
                  Ordering for wedding favors or family? 5+ get 5% off, 10+ get 10% off, 20+ get 15% off.
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
      {/* Interactive Photo Framing & Crop Modal */}
      <LithophaneFramingModal
        isOpen={isFramingOpen}
        onClose={() => setIsFramingOpen(false)}
        imageSrc={rawPhotoUrl || photoUrl}
        shape={shape}
        initialCrop={cropConfig}
        onApply={(croppedUrl, newConfig) => {
          setPhotoUrl(croppedUrl);
          setCropConfig(newConfig);
          toast.success(
            shape === "heart"
              ? "Framed for Heart Keepsake! 3D model updated."
              : "Photo framing updated!"
          );
        }}
      />
    </div>
  );
}
