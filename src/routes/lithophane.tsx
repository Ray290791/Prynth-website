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
  description: string;
}

const SHAPES: ShapeOption[] = [
  {
    id: "flat",
    name: "Classic Flat Panel",
    tag: "Popular",
    description: "Sleek architectural relief with matching display stand. Clean, timeless, and versatile.",
  },
  {
    id: "curved",
    name: "Self-Standing Arc",
    tag: "Best for Desks",
    description: "Gentle 37° curved panoramic arc that balances stably on any desk or shelf without a stand.",
  },
  {
    id: "heart",
    name: "Heart Keepsake",
    tag: "Romantic",
    description: "Romantic sculpted heart silhouette with built-in pedestal base. Perfect for couples & anniversaries.",
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
    description: "Our most popular size with rich detail and presence.",
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
    description: "Maximum size with stunning gallery clarity.",
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
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-12">
      {/* Header */}
      <div className="max-w-3xl space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
          <Sparkles className="size-3.5" />
          <span>Handcrafted Photo Keepsake · Illuminated by Sunlight</span>
        </div>
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl text-fg">
          Turn Your Favorite Photo into a Sunlit 3D Keepsake
        </h1>
        <p className="text-sm sm:text-base text-muted leading-relaxed">
          Carved in heirloom-grade matte white polymer. Place it on your window sill where natural sunlight shines through from behind, revealing your photo in breathtaking 3D sculptural relief — zero wires, zero batteries, just pure light.
        </p>
      </div>

      {/* Main Studio Grid */}
      <div className="mt-8 grid gap-8 lg:grid-cols-12">
        {/* Left Column: 3D Interactive Viewer & Photo (7 cols) */}
        <div className="space-y-6 lg:col-span-7">
          {/* 3D WebGL Lithophane Viewer */}
          <div className="space-y-2">
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
            <div className="flex items-center justify-between px-1 text-xs text-muted">
              <span className="flex items-center gap-1.5">
                <RotateCw className="size-3 text-accent" />
                Drag to rotate 360° · Scroll to zoom
              </span>
              <span className="text-muted">
                ☀️ Click "Sunlit Window Glow" to see it illuminate
              </span>
            </div>
          </div>

          {/* Photo Selection Card */}
          <div className="rounded-2xl border border-border bg-surface p-5 space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="relative size-14 shrink-0 rounded-xl overflow-hidden border border-border/80 bg-surface-2 shadow-xs">
                  {photoUrl ? (
                    <img
                      src={photoUrl}
                      alt="Selected memory"
                      className="size-full object-cover"
                    />
                  ) : (
                    <div className="size-full flex items-center justify-center text-muted">
                      <Sparkles className="size-5" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm text-fg">Your Photo</h3>
                    {isSample && (
                      <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">
                        Sample Preview
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted mt-0.5 leading-snug">
                    {isSample
                      ? "Sample photo shown · Upload your own memory to personalize"
                      : "Photo uploaded · Click Crop & Frame to adjust composition"}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
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
                  className="gap-2 cursor-pointer font-semibold shadow-xs"
                >
                  <Upload className="size-3.5" />
                  <span>Upload Photo</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsFramingOpen(true)}
                  className="gap-1.5 cursor-pointer font-medium text-xs border-accent/30 text-accent hover:bg-accent/10"
                >
                  <Crop className="size-3.5" />
                  <span>Crop &amp; Frame</span>
                </Button>
              </div>
            </div>

            {/* Romantic tip if Heart Keepsake is selected */}
            {shape === "heart" && (
              <div className="rounded-xl border border-rose-500/25 bg-rose-500/10 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-rose-300 animate-in fade-in duration-150">
                <div className="flex items-center gap-2">
                  <Heart className="size-4 shrink-0 fill-rose-500 text-rose-500" />
                  <span>
                    <strong>Heart Keepsake:</strong> Position faces near the center &amp; upper lobes for a romantic fit.
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
                  <span>Adjust Framing</span>
                </Button>
              </div>
            )}
          </div>

          {/* Value Badges */}
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-border bg-surface p-4 space-y-1.5 shadow-xs">
              <div className="flex items-center gap-2 text-accent font-semibold text-xs">
                <Sun className="size-4 shrink-0" />
                <span>Sunlight Backlit</span>
              </div>
              <p className="text-xs text-muted leading-relaxed">
                Place it on a window sill or near a desk lamp. Warm natural sunlight illuminates the photo from behind.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-surface p-4 space-y-1.5 shadow-xs">
              <div className="flex items-center gap-2 text-accent font-semibold text-xs">
                <Layers className="size-4 shrink-0" />
                <span>3D Bas-Relief Depth</span>
              </div>
              <p className="text-xs text-muted leading-relaxed">
                Sculpted in physical polymer relief that you can feel with your fingers. Never fades or degrades with time.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-surface p-4 space-y-1.5 shadow-xs">
              <div className="flex items-center gap-2 text-accent font-semibold text-xs">
                <ShieldCheck className="size-4 shrink-0" />
                <span>Lifetime Heirloom</span>
              </div>
              <p className="text-xs text-muted leading-relaxed">
                100% durable in-house 3D printing. No batteries, cables, or electronics — pure light and polymer.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Clean Configurator & Checkout (5 cols, sticky) */}
        <div className="space-y-6 lg:col-span-5">
          <div className="rounded-2xl border border-border bg-surface p-5 space-y-6 shadow-xs lg:sticky lg:top-24">
            {/* Step 1: Shape Selection */}
            <div className="space-y-2.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted">
                1. Choose Shape
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
                        {s.id === "curved" && <Sparkles className="size-3.5 text-accent" />}
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

            {/* Step 2: Orientation & Size Selection */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted">
                  2. Choose Orientation &amp; Size
                </Label>
                <span className="text-xs text-muted tabular-nums">
                  {currentDims.width} × {currentDims.height} mm
                </span>
              </div>

              {/* Orientation toggle */}
              <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-surface-2/60 border border-border">
                {(
                  [
                    { id: "landscape", label: "Landscape (Wide)" },
                    { id: "portrait", label: "Portrait (Tall)" },
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

              {/* Size tiers */}
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
                <span>Matching display stand included · Free shipping across India</span>
              </div>
            </div>

            {/* Step 3: Gift Packaging (Optional) */}
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
                      Delivered in a luxury presentation box with ribbon, concealed invoice prices, and a personalized printed card.
                    </span>
                  </div>
                </label>
              </div>

              {/* Gift Message Card */}
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
                      <span>Printed onto a keepsake card.</span>
                      <span>{giftMessage.length}/180</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Quantity & Bulk Savings */}
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
                  Ordering for wedding favors or family gifts? 5+ get 5% off, 10+ get 10% off, 20+ get 15% off.
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
