import { useState, useEffect, useRef } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Upload,
  RotateCw,
  ShoppingBag,
  Sparkles,
  Heart,
  Layers,
  Check,
  ShieldCheck,
  Gift,
  Sun,
  Crop,
  Truck,
  Award,
  ChevronDown,
  Sparkle,
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
import {
  LithophaneFramingModal,
  type CropConfig,
} from "@/components/lithophane-framing-modal";
import { DEFAULT_SAMPLE_PHOTO } from "@/lib/lithophane-samples";
import { compressImageDataUrl } from "@/lib/image-utils";

export const Route = createFileRoute("/lithophane")({
  component: LithophaneStudioPage,
  head: () => ({
    meta: [
      { title: "Custom 3D Printed Lithophanes & Window Keepsakes | prynth!" },
      {
        name: "description",
        content:
          "Transform your favorite memories into glowing 3D sunlit lithophanes. Illuminated naturally by window sunlight or ambient room light. Includes a matching display stand and free delivery.",
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
  badgeColor?: string;
  description: string;
}

const SHAPES: ShapeOption[] = [
  {
    id: "flat",
    name: "Classic Flat Panel",
    tag: "Timeless",
    description: "Sleek architectural relief with included matching display stand. Clean, balanced, and versatile.",
  },
  {
    id: "curved",
    name: "Self-Standing Arc",
    tag: "Desk Favorite",
    description: "Gentle 37° curved panoramic arc that balances stably on any desk or shelf without needing a stand.",
  },
  {
    id: "heart",
    name: "Heart Keepsake",
    tag: "Romantic",
    description: "Sculpted heart silhouette with integrated pedestal base. Perfect for couples, weddings & anniversaries.",
  },
];

const SIZES: {
  id: SizeTier;
  label: string;
  basePrice: number;
  popular?: boolean;
  description: string;
  dims: Record<AspectRatio, { width: number; height: number }>;
}[] = [
  {
    id: "medium",
    label: "Medium",
    basePrice: 399,
    description: "Compact & intimate. Ideal for window sills and cozy nightstands.",
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
    popular: true,
    description: "Our most popular size with rich detail and balanced presence.",
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
    description: "Maximum size with stunning gallery clarity and depth.",
    dims: {
      landscape: { width: 190, height: 130 },
      portrait: { width: 130, height: 190 },
      square: { width: 155, height: 155 },
    },
  },
];

const GIFT_PACKAGING_FEE = 99;

const FAQS = [
  {
    q: "How does the lithophane light up without wires or batteries?",
    a: "Lithophanes work through optical translucency. When placed in front of a sunlit window or desk lamp, thicker sculpted areas block more light (creating shadows) while thinner areas allow light to pass through (creating highlights). It is 100% powered by natural daylight!",
  },
  {
    q: "What type of photo works best?",
    a: "Clear photos with good contrast and well-lit faces look phenomenal. High resolution family portraits, wedding pictures, vacation sunsets, and pet photos all translate into stunning 3D bas-reliefs.",
  },
  {
    q: "Does it come with a display stand?",
    a: "Yes! The Classic Flat Panel includes a precision-matched minimalist display stand. The Self-Standing Arc and Heart Keepsake are engineered to balance securely on any flat surface on their own.",
  },
];

function LithophaneStudioPage() {
  const navigate = useNavigate();
  const add = useCart((s) => s.add);

  // Customizer state
  const [rawPhotoUrl, setRawPhotoUrl] = useState<string>("");
  const [photoUrl, setPhotoUrl] = useState<string>("");
  const [cropConfig, setCropConfig] = useState<CropConfig>({ scale: 1.25, panX: 0, panY: -10 });
  const [isFramingOpen, setIsFramingOpen] = useState<boolean>(false);
  const [isSample, setIsSample] = useState<boolean>(true);
  const [aspect, setAspect] = useState<AspectRatio>("landscape");
  const [shape, setShape] = useState<LithophaneShape>("flat");
  const [size, setSize] = useState<SizeTier>("standard");
  const [backlightOn, setBacklightOn] = useState<boolean>(true);
  const [isGift, setIsGift] = useState<boolean>(false);
  const [giftMessage, setGiftMessage] = useState<string>("");
  const [recipientName, setRecipientName] = useState<string>("");
  const [qty, setQty] = useState<number>(1);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize with single curated sample photo
  useEffect(() => {
    setRawPhotoUrl(DEFAULT_SAMPLE_PHOTO.url);
    setPhotoUrl(DEFAULT_SAMPLE_PHOTO.url);
  }, []);

  const selectedSizeConfig = SIZES.find((s) => s.id === size)!;
  const currentDims = selectedSizeConfig.dims[aspect];

  // Pricing calculations
  const baseUnitPrice = selectedSizeConfig.basePrice;
  const giftFeePerItem = isGift ? GIFT_PACKAGING_FEE : 0;
  const finalUnitPrice = baseUnitPrice + giftFeePerItem;
  const rawSubtotal = finalUnitPrice * qty;

  // Bulk discount
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
      toast.error("Please upload an image file (JPEG, PNG, or WebP)");
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      toast.error("Image file is too large (max 25MB)");
      return;
    }

    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setRawPhotoUrl(result);
        setPhotoUrl(result);
        setIsSample(false);
        toast.success("Photo uploaded successfully!");
        // Open framing modal so user can center faces
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

  const handleAddToCart = async () => {
    if (!photoUrl) {
      toast.error("Please upload or select a photo first.");
      return;
    }

    // Preserve high resolution (1200px max, quality 0.92) to eliminate pixelation
    let finalPhoto = photoUrl;
    if (photoUrl.startsWith("data:")) {
      try {
        finalPhoto = await compressImageDataUrl(photoUrl, 1200, 0.92);
      } catch (err) {
        console.warn("Could not compress photo before adding to cart:", err);
      }
    }

    const shapeLabel =
      shape === "heart"
        ? "Heart Keepsake"
        : shape === "curved"
        ? "Self-Standing Arc"
        : "Classic Flat Panel";

    const giftNotes = isGift
      ? ` [GIFT PACKAGING: Luxury Presentation Box, Conceal Prices${
          recipientName.trim() ? ` · Recipient: ${recipientName.trim()}` : ""
        }${giftMessage.trim() ? ` · Greeting Card: "${giftMessage.trim()}"` : ""}]`
      : "";

    const customSpec: CustomSpec = {
      path: "idea",
      quality: "Ultra-fine (0.12mm)",
      infill: "100% Solid",
      color: "Optical Jade White",
      material: "Lithophane White PLA (0.12mm)",
      dimensions: `${currentDims.width} × ${currentDims.height} mm (${shapeLabel})`,
      notes: `Shape: ${shapeLabel} · Size: ${selectedSizeConfig.label} (${aspect})${giftNotes}`,
      referencePhotos: [finalPhoto],
    };

    const cartTitle = isGift
      ? `3D Lithophane · ${shapeLabel} 🎁 (Gift Wrapped)`
      : `3D Lithophane · ${shapeLabel}`;

    add({
      kind: "custom",
      name: cartTitle,
      image: finalPhoto,
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
    <div className="relative isolate min-h-screen overflow-hidden">
      {/* Ambient Top Glow: evokes warm natural sunlight and designer studio atmosphere */}
      <div
        className="pointer-events-none absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
        aria-hidden="true"
      >
        <div
          className="relative left-[calc(50%-12rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[25deg] bg-gradient-to-tr from-accent/20 via-amber-300/15 to-transparent opacity-50 sm:left-[calc(50%-28rem)] sm:w-[72.1875rem]"
          style={{
            clipPath:
              "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
          }}
        />
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-12">
        {/* Editorial Hero Header */}
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-surface/80 px-3.5 py-1 text-xs font-medium text-fg shadow-xs backdrop-blur-md">
            <span className="flex size-2 rounded-full bg-accent animate-pulse" />
            <span className="font-semibold text-accent">Sunlit Keepsake Studio</span>
            <span className="text-muted/60">·</span>
            <span className="text-muted">Sculpted 3D Daylight Art</span>
          </div>

          <h1 className="font-display text-3xl font-semibold tracking-tight text-fg sm:text-4xl lg:text-5xl leading-[1.12]">
            Transform Your Favorite Photo into a{" "}
            <span className="bg-gradient-to-r from-accent via-teal-400 to-amber-400 bg-clip-text text-transparent">
              Sunlit 3D Keepsake
            </span>
          </h1>

          <p className="text-sm sm:text-base text-muted leading-relaxed">
            Carved in heirloom-grade matte white polymer with 0.12mm optical precision. Sunlight streams through the physical relief from behind, illuminating your cherished memory in natural glowing contrast — zero wires, zero batteries, pure daylight.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-muted">
            <span className="flex items-center gap-1.5">
              <Sun className="size-3.5 text-amber-400" />
              Powered by window sunlight
            </span>
            <span className="text-border">·</span>
            <span className="flex items-center gap-1.5">
              <Award className="size-3.5 text-accent" />
              Matching stand included
            </span>
            <span className="text-border">·</span>
            <span className="flex items-center gap-1.5">
              <Truck className="size-3.5 text-emerald-400" />
              Free delivery across India
            </span>
          </div>
        </div>

        {/* Main Studio Grid */}
        <div className="mt-10 grid gap-8 lg:grid-cols-12 items-start">
          {/* Left Column: 3D Interactive Stage & Photo Studio (7 cols) */}
          <div className="space-y-6 lg:col-span-7">
            {/* 3D WebGL Lithophane Viewer Container */}
            <div className="space-y-2.5">
              <div className="relative group rounded-3xl border border-border/80 bg-surface/50 p-1.5 backdrop-blur-sm shadow-xl transition-all duration-300 hover:border-accent/30">
                <LithophaneViewer
                  imageSrc={photoUrl}
                  shape={shape}
                  sizeMm={currentDims}
                  backlightOn={backlightOn}
                  onToggleBacklight={() => setBacklightOn(!backlightOn)}
                  contrast={1.15}
                  invert={false}
                  fitMode="dynamic"
                />
              </div>

              {/* Viewer helper bar */}
              <div className="flex items-center justify-between px-2 text-xs text-muted">
                <span className="flex items-center gap-1.5 font-medium">
                  <RotateCw className="size-3 text-accent" />
                  Drag to rotate 360° · Scroll to zoom
                </span>
                <span className="hidden sm:inline-flex items-center gap-1.5 text-muted">
                  <Sparkle className="size-3 text-amber-400" />
                  Toggle mode to see light transmission
                </span>
              </div>
            </div>

            {/* Apple-grade Photo Studio Card */}
            <div className="rounded-3xl border border-border/80 bg-surface/90 p-5 backdrop-blur-md shadow-xs space-y-4 hover:border-accent/30 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5 min-w-0">
                  {/* Photo Thumbnail */}
                  <div className="relative size-16 shrink-0 rounded-2xl overflow-hidden border border-border/80 bg-surface-2 shadow-xs group">
                    {photoUrl ? (
                      <img
                        src={photoUrl}
                        alt="Selected memory"
                        className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="size-full flex items-center justify-center text-muted">
                        <Sparkles className="size-6 text-accent" />
                      </div>
                    )}
                    <div className="absolute inset-0 ring-1 ring-inset ring-black/5 rounded-2xl pointer-events-none" />
                  </div>

                  {/* Photo Status */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm text-fg tracking-tight">Your Photo</h3>
                      {isSample ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2.5 py-0.5 text-[10px] font-semibold text-accent">
                          Sample Preview
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-400">
                          <Check className="size-2.5 stroke-[3]" /> Ready
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted mt-0.5 leading-snug">
                      {isSample
                        ? "Sample photo shown · Upload your photo to personalize in 3D"
                        : "Photo mapped to 3D model · Click Crop & Frame to adjust position"}
                    </p>
                  </div>
                </div>

                {/* Upload & Framing Action Buttons */}
                <div className="flex items-center gap-2.5 shrink-0">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="gap-2 rounded-xl font-semibold shadow-xs cursor-pointer px-4"
                  >
                    <Upload className="size-3.5" />
                    <span>Upload Photo</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsFramingOpen(true)}
                    className="gap-1.5 rounded-xl font-medium text-xs border-accent/40 text-accent hover:bg-accent/10 cursor-pointer px-3"
                  >
                    <Crop className="size-3.5" />
                    <span>Crop &amp; Frame</span>
                  </Button>
                </div>
              </div>

              {/* Romantic framing tip if Heart Keepsake is selected */}
              {shape === "heart" && (
                <div className="rounded-2xl border border-rose-500/25 bg-rose-500/10 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-rose-300 animate-in fade-in duration-150">
                  <div className="flex items-center gap-2.5">
                    <div className="size-7 rounded-xl bg-rose-500/20 flex items-center justify-center shrink-0">
                      <Heart className="size-4 fill-rose-500 text-rose-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-rose-200">Framing for Heart Silhouette</p>
                      <p className="text-[11px] text-rose-300/80">
                        Position faces near the center to ensure they sit cleanly inside the sculpted heart border.
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="xs"
                    variant="secondary"
                    onClick={() => setIsFramingOpen(true)}
                    className="shrink-0 font-semibold gap-1.5 cursor-pointer bg-surface text-fg hover:bg-surface-2 self-start sm:self-auto rounded-lg px-3"
                  >
                    <Crop className="size-3 text-accent" />
                    <span>Center Faces</span>
                  </Button>
                </div>
              )}

              {/* Reassurance Footer */}
              <div className="pt-2 border-t border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-muted">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="size-3.5 text-accent shrink-0" />
                  100% Private &amp; Secure: Processed locally in your browser
                </span>
                <span className="text-[10px] text-muted/70">JPEG · PNG · WebP up to 25MB</span>
              </div>
            </div>

            {/* Value Pillars Grid */}
            <div className="grid sm:grid-cols-3 gap-3.5">
              <div className="rounded-2xl border border-border/80 bg-surface/70 p-4 space-y-2 shadow-xs backdrop-blur-xs">
                <div className="size-8 rounded-xl bg-amber-400/15 flex items-center justify-center text-amber-400">
                  <Sun className="size-4.5" />
                </div>
                <h4 className="font-semibold text-xs text-fg">Powered by Sunlight</h4>
                <p className="text-xs text-muted leading-relaxed">
                  Place on your window sill. Natural daylight streams through the relief, glowing warmly without batteries or cords.
                </p>
              </div>

              <div className="rounded-2xl border border-border/80 bg-surface/70 p-4 space-y-2 shadow-xs backdrop-blur-xs">
                <div className="size-8 rounded-xl bg-accent/15 flex items-center justify-center text-accent">
                  <Layers className="size-4.5" />
                </div>
                <h4 className="font-semibold text-xs text-fg">Sculpted 3D Relief</h4>
                <p className="text-xs text-muted leading-relaxed">
                  Carved with 0.12mm micro-layers into durable matte polymer. You can feel every physical contour with your fingertips.
                </p>
              </div>

              <div className="rounded-2xl border border-border/80 bg-surface/70 p-4 space-y-2 shadow-xs backdrop-blur-xs">
                <div className="size-8 rounded-xl bg-emerald-400/15 flex items-center justify-center text-emerald-400">
                  <Award className="size-4.5" />
                </div>
                <h4 className="font-semibold text-xs text-fg">Complete Display Setup</h4>
                <p className="text-xs text-muted leading-relaxed">
                  Arrives ready to display with our matching minimalist stand, packaged securely in eco-friendly protective casing.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Tactile Configurator & Sticky Checkout (5 cols) */}
          <div className="space-y-6 lg:col-span-5">
            <div className="rounded-3xl border border-border/80 bg-surface/90 p-6 backdrop-blur-xl shadow-xl lg:sticky lg:top-24 space-y-6">
              {/* Step 1: Shape Selection */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted">
                    1. Choose Silhouette
                  </Label>
                  <span className="text-[11px] text-accent font-medium">3 Heirloom Styles</span>
                </div>

                <div className="grid gap-2.5">
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
                        "group relative flex items-start justify-between p-3.5 rounded-2xl border text-left transition-all duration-150 cursor-pointer",
                        shape === s.id
                          ? "border-accent bg-accent/10 ring-1 ring-accent shadow-xs"
                          : "border-border/80 bg-surface-2/40 hover:border-accent/40 hover:bg-surface-2/70"
                      )}
                    >
                      <div className="pr-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-fg tracking-tight">
                            {s.name}
                          </span>
                          {s.id === "heart" && (
                            <Heart className="size-3.5 text-rose-500 fill-rose-500" />
                          )}
                          {s.id === "curved" && (
                            <Sparkles className="size-3.5 text-accent" />
                          )}
                          <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold text-accent">
                            {s.tag}
                          </span>
                        </div>
                        <p className="text-xs text-muted mt-1 leading-relaxed">
                          {s.description}
                        </p>
                      </div>

                      <div
                        className={cn(
                          "size-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition-colors",
                          shape === s.id
                            ? "border-accent bg-accent text-ink"
                            : "border-border bg-surface"
                        )}
                      >
                        {shape === s.id && <Check className="size-3 stroke-[3]" />}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 2: Orientation & Size Selection */}
              <div className="space-y-3 pt-4 border-t border-border/60">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted">
                    2. Orientation &amp; Dimensions
                  </Label>
                  <span className="text-xs font-mono text-muted tabular-nums">
                    {currentDims.width} × {currentDims.height} mm
                  </span>
                </div>

                {/* Modern Segmented Orientation Toggle */}
                <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-surface-2/70 border border-border/80">
                  {(
                    [
                      { id: "landscape", label: "Landscape" },
                      { id: "portrait", label: "Portrait" },
                      { id: "square", label: "Square" },
                    ] as const
                  ).map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setAspect(a.id)}
                      className={cn(
                        "py-2 px-2 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer text-center select-none",
                        aspect === a.id
                          ? "bg-accent text-ink shadow-xs"
                          : "text-muted hover:text-fg"
                      )}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>

                {/* Size Tiers Cards */}
                <div className="grid grid-cols-3 gap-2 pt-1">
                  {SIZES.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSize(s.id)}
                      className={cn(
                        "relative flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all duration-150 cursor-pointer",
                        size === s.id
                          ? "border-accent bg-accent/10 ring-1 ring-accent text-fg shadow-xs"
                          : "border-border/80 bg-surface-2/40 text-muted hover:text-fg hover:border-accent/40"
                      )}
                    >
                      {s.popular && (
                        <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-accent px-2 py-0.2 text-[9px] font-bold text-ink uppercase tracking-wider shadow-xs">
                          Popular
                        </span>
                      )}
                      <span className="text-xs font-semibold text-fg">{s.label}</span>
                      <span className="text-[10px] text-muted mt-0.5 tabular-nums">
                        {s.dims[aspect].width}×{s.dims[aspect].height}mm
                      </span>
                      <span className="text-xs font-bold text-accent mt-1.5">
                        {formatINR(s.basePrice)}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Inclusion reassurance */}
                <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-[11px] text-emerald-400 font-medium flex items-center gap-2">
                  <Check className="size-3.5 text-emerald-400 shrink-0 stroke-[2.5]" />
                  <span>Matching display stand included · Free express shipping</span>
                </div>
              </div>

              {/* Step 3: Luxury Gift Box Option */}
              <div
                className={cn(
                  "rounded-2xl border p-4 transition-all duration-200 space-y-3",
                  isGift
                    ? "border-accent/40 bg-accent/5 ring-1 ring-accent/30 shadow-xs"
                    : "border-border/80 bg-surface-2/30"
                )}
              >
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isGift}
                    onChange={(e) => setIsGift(e.target.checked)}
                    className="mt-0.5 size-4 rounded-md border-border accent-accent cursor-pointer"
                  />
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Gift className="size-3.5 text-accent" />
                      <span className="text-xs font-semibold text-fg">
                        Luxury Gift Box &amp; Card
                      </span>
                      <span className="rounded-full bg-accent/20 px-1.5 py-0.2 text-[10px] font-bold text-accent">
                        +{formatINR(GIFT_PACKAGING_FEE)}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted leading-relaxed">
                      Delivered in an elegant presentation box with satin ribbon, concealed price tags, and a personalized printed keepsake card.
                    </p>
                  </div>
                </label>

                {/* Expandable Gift Customization Inputs */}
                {isGift && (
                  <div className="space-y-3 pt-3 border-t border-border/60 animate-in fade-in duration-150">
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
                        className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-fg placeholder:text-muted focus:border-accent focus:outline-none"
                      />
                    </div>

                    <div>
                      <Label htmlFor="giftMsg" className="text-xs text-muted block mb-1">
                        Personal Greeting Message:
                      </Label>
                      <textarea
                        id="giftMsg"
                        rows={2}
                        maxLength={180}
                        value={giftMessage}
                        onChange={(e) => setGiftMessage(e.target.value)}
                        placeholder="e.g. Happy 1st Anniversary! Forever and always ❤️"
                        className="w-full rounded-xl border border-border bg-surface p-2.5 text-xs text-fg placeholder:text-muted focus:border-accent focus:outline-none resize-none leading-relaxed"
                      />
                      <div className="flex justify-between text-[10px] text-muted mt-1">
                        <span>Printed onto premium keepsake card.</span>
                        <span className="tabular-nums">{giftMessage.length}/180</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Quantity Stepper & Bulk Savings */}
              <div className="pt-3 border-t border-border/60 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-xs font-semibold text-fg">Quantity</Label>
                    <span className="text-[10px] text-muted block">Handcrafted to order</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setQty(Math.max(1, qty - 1))}
                      className="flex size-8 items-center justify-center rounded-xl border border-border bg-surface text-fg hover:bg-surface-2 cursor-pointer font-bold transition-colors select-none"
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                    <span className="w-8 text-center font-mono text-sm font-semibold tabular-nums text-fg">
                      {qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQty(qty + 1)}
                      className="flex size-8 items-center justify-center rounded-xl border border-border bg-surface text-fg hover:bg-surface-2 cursor-pointer font-bold transition-colors select-none"
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Bulk tier notification */}
                {bulkDiscountRate > 0 ? (
                  <div className="rounded-xl bg-accent/15 border border-accent/30 px-3 py-2 text-xs text-accent font-semibold flex items-center justify-between">
                    <span>🎉 Bulk discount applied! ({bulkDiscountRate * 100}% OFF)</span>
                    <span className="tabular-nums font-bold">−{formatINR(totalDiscount)}</span>
                  </div>
                ) : (
                  <p className="text-[11px] text-muted">
                    Ordering for wedding favors or family gifts? 5+ get 5% off, 10+ get 10% off, 20+ get 15% off.
                  </p>
                )}
              </div>

              {/* Price Summary & Primary Checkout Button */}
              <div className="pt-3 border-t border-border space-y-3.5">
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="text-xs text-muted block">Total Price:</span>
                    <span className="text-3xl font-bold font-display tabular-nums text-fg">
                      {formatINR(finalTotal)}
                    </span>
                  </div>
                  <span className="text-xs text-muted text-right">
                    {qty > 1 && `${formatINR(finalUnitPrice)} × ${qty} pcs`}
                    <br />
                    <span className="text-emerald-500 font-semibold flex items-center justify-end gap-1">
                      <Truck className="size-3" /> Free insured delivery
                    </span>
                  </span>
                </div>

                <Button
                  type="button"
                  size="lg"
                  onClick={handleAddToCart}
                  disabled={!photoUrl || isProcessing}
                  className="w-full h-12 rounded-2xl gap-2 font-bold text-base shadow-lg hover:shadow-accent/20 cursor-pointer transition-all active:scale-[0.98]"
                >
                  <ShoppingBag className="size-4" />
                  Add to Cart · {formatINR(finalTotal)}
                </Button>

                {/* Trust reassurance pills */}
                <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] text-muted">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="size-3.5 text-accent shrink-0" />
                    <span>Damage-Free Guarantee</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Truck className="size-3.5 text-accent shrink-0" />
                    <span>Dispatches in 2-3 Days</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Story / Experience Section */}
        <div className="mt-20 border-t border-border/80 pt-16">
          <div className="max-w-2xl mx-auto text-center space-y-3">
            <h2 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-fg">
              A New Way to Experience Photography
            </h2>
            <p className="text-sm text-muted leading-relaxed">
              Traditional photos fade in albums or get lost on phone screens. Our 3D lithophanes turn your favorite captures into permanent, light-reactive sculptures that come to life every morning as the sun rises.
            </p>
          </div>

          {/* Quick FAQ Accordion */}
          <div className="mt-10 max-w-2xl mx-auto divide-y divide-border/60 rounded-3xl border border-border/80 bg-surface/70 p-4 sm:p-6 backdrop-blur-md">
            {FAQS.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div key={idx} className="py-3.5 first:pt-0 last:pb-0">
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="flex w-full items-center justify-between text-left font-semibold text-xs sm:text-sm text-fg hover:text-accent transition-colors cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={cn(
                        "size-4 text-muted shrink-0 transition-transform duration-200",
                        isOpen && "rotate-180 text-accent"
                      )}
                    />
                  </button>
                  {isOpen && (
                    <p className="mt-2 text-xs sm:text-sm text-muted leading-relaxed animate-in fade-in duration-150">
                      {faq.a}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Interactive Photo Framing & Crop Modal */}
      <LithophaneFramingModal
        isOpen={isFramingOpen}
        onClose={() => setIsFramingOpen(false)}
        imageSrc={rawPhotoUrl || photoUrl}
        shape={shape}
        sizeMm={currentDims}
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
