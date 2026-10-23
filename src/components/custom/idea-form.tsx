import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ColorSwatches } from "@/components/color-swatches";
import { QuantityStepper } from "@/components/quantity-stepper";
import { BambuSupportSettings, type BambuSupportState } from "@/components/bambu-support-settings";
import { PrinterSelector, FieldSelect } from "@/components/custom/printer-selector";
import { COLORS } from "@/lib/products";
import {
  computeQuote,
  INFILL_PATTERNS,
  BAMBU_SUPPORT_TYPES,
  SURFACE_FINISHES,
  type CustomPricingConfig,
} from "@/lib/quote";
import { submitCustomDesignRequest } from "@/lib/contact-fns";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import type { CartItem, CustomSpec } from "@/lib/cart-store";
import type { useCart } from "@/lib/cart-store";
import type { Printer } from "@/lib/printers-fns";
import type { FilamentRecord } from "@/lib/filaments-fns";
import { cn } from "@/lib/utils";
import {
  Camera,
  X,
  Sliders,
  ChevronDown,
  Check,
  CheckCircle2,
  Clock,
  Send,
  Save,
  Loader2,
} from "lucide-react";

export function IdeaForm({
  add,
  pricingConfig,
  printers,
  filaments,
  editItem,
  onUpdateItem,
  initialIdea,
  settings,
}: {
  add: ReturnType<typeof useCart.getState>["add"];
  pricingConfig: CustomPricingConfig;
  printers: Printer[];
  filaments: FilamentRecord[];
  editItem?: CartItem | null;
  onUpdateItem?: (id: string, updated: Partial<CartItem>) => void;
  initialIdea?: string;
  settings?: any;
}) {
  const navigate = useNavigate();
  const [selectedPrinterId, setSelectedPrinterId] = useState(() => {
    if (editItem?.custom?.printerId) return editItem.custom.printerId;
    const firstAvail = printers.find((p) => p.status === "available");
    return firstAvail?.id || printers[0]?.id || "p1s-01";
  });

  useEffect(() => {
    if (printers.length > 0 && !printers.some((p) => p.id === selectedPrinterId)) {
      const firstAvail = printers.find((p) => p.status === "available");
      setSelectedPrinterId(firstAvail?.id || printers[0].id);
    }
  }, [printers, selectedPrinterId]);

  const selectedPrinter = printers.find((p) => p.id === selectedPrinterId) ?? printers[0];

  const [idea, setIdea] = useState(() => {
    if (editItem?.custom?.idea) return editItem.custom.idea;
    if (editItem?.custom?.notes) return editItem.custom.notes.split(" · ")[0] || "";
    if (initialIdea) return initialIdea;
    return "";
  });

  useEffect(() => {
    if (initialIdea && !idea) {
      setIdea(initialIdea);
    }
  }, [initialIdea]);

  const [photos, setPhotos] = useState<string[]>(() => editItem?.custom?.referencePhotos || []);

  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = 5 - photos.length;
    if (remainingSlots <= 0) {
      toast.error("You can upload a maximum of 5 reference photos.");
      return;
    }

    const filesToProcess = Array.from(files).slice(0, remainingSlots);

    for (const file of filesToProcess) {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} is not an image file.`);
        continue;
      }
      if (file.size > 15 * 1024 * 1024) {
        toast.error(`${file.name} exceeds 15MB limit.`);
        continue;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          const img = new Image();
          img.onload = () => {
            const maxDim = 700;
            let width = img.width;
            let height = img.height;
            if (width > maxDim || height > maxDim) {
              if (width > height) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              } else {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
            }
            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(img, 0, 0, width, height);
              const compressed = canvas.toDataURL("image/jpeg", 0.82);
              setPhotos((prev) => (prev.length < 5 ? [...prev, compressed] : prev));
            } else {
              setPhotos((prev) => (prev.length < 5 ? [...prev, result] : prev));
            }
          };
          img.onerror = () => {
            setPhotos((prev) => (prev.length < 5 ? [...prev, result] : prev));
          };
          img.src = result;
        }
      };
      reader.readAsDataURL(file);
    }
    e.target.value = "";
    toast.success("Photo(s) attached!");
  }

  function removePhoto(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    toast.info("Photo removed.");
  }
  const [size, setSize] = useState(() => editItem?.custom?.sizeId || "desk");
  const [complexity, setComplexity] = useState(() => editItem?.custom?.complexityId || "basic");
  const [material, setMaterial] = useState(() => editItem?.custom?.materialId || "pla");
  const [quality, setQuality] = useState(() => editItem?.custom?.qualityId || "standard");
  const [infillPct, setInfillPct] = useState(() => editItem?.custom?.infillPercentage ?? 20);
  const [infillPattern, setInfillPattern] = useState(() => editItem?.custom?.infillPattern || "gyroid");
  const [wallLoops, setWallLoops] = useState(() => editItem?.custom?.wallLoops ?? 2);
  const [supportState, setSupportState] = useState<BambuSupportState>(() => {
    if (editItem?.custom?.supportEnabled !== undefined) {
      return {
        enabled: editItem.custom.supportEnabled,
        type: editItem.custom.supportType || "tree(auto)",
        thresholdAngle: editItem.custom.supportThresholdAngle ?? 30,
        onBuildPlateOnly: editItem.custom.supportOnBuildPlateOnly ?? false,
        baseFilament: editItem.custom.supportBaseFilament || "Default",
        interfaceFilament: editItem.custom.supportInterfaceFilament || "Default",
      };
    }
    const legacy = editItem?.custom?.supports;
    const isLegacyEnabled = Boolean(legacy && legacy !== "none" && legacy !== "None");
    const legacyIsTree = (legacy || "").toLowerCase().includes("tree");
    return {
      enabled: isLegacyEnabled,
      type: legacyIsTree ? "tree(auto)" : "normal(auto)",
      thresholdAngle: 30,
      onBuildPlateOnly: false,
      baseFilament: "Default",
      interfaceFilament: "Default",
    };
  });
  const [surfaceFinish, setSurfaceFinish] = useState(() => editItem?.custom?.surfaceFinish || "standard");
  const [showAdvanced, setShowAdvanced] = useState(() => {
    if (!editItem?.custom) return false;
    return (
      (editItem.custom.infillPattern && editItem.custom.infillPattern !== "gyroid") ||
      (editItem.custom.wallLoops && editItem.custom.wallLoops !== 2) ||
      (editItem.custom.supportEnabled || (editItem.custom.supports && editItem.custom.supports !== "none")) ||
      (editItem.custom.surfaceFinish && editItem.custom.surfaceFinish !== "standard")
    );
  });
  const [color, setColor] = useState(() => editItem?.custom?.colorId || editItem?.color || "charcoal");
  const [qty, setQty] = useState(() => editItem?.qty || 1);
  const user = useCurrentUser();
  const [name, setName] = useState(() => user?.displayName || "");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedTicketId, setSubmittedTicketId] = useState<number | null>(null);

  const [email, setEmail] = useState(() => {
    if (editItem?.custom?.email) return editItem.custom.email;
    if (user?.primaryEmail) return user.primaryEmail;
    const parts = editItem?.custom?.notes?.split(" · ");
    return parts && parts.length > 1 ? parts[1] : "";
  });

  useEffect(() => {
    if (user?.displayName && !name) {
      setName(user.displayName);
    }
    if (user?.primaryEmail && !email) {
      setEmail(user.primaryEmail);
    }
  }, [user]);

  // Filter filaments dynamically by selected material
  const materialFilaments = useMemo(() => {
    return filaments.filter(
      (f) => f.material_id.toLowerCase() === material.toLowerCase() && f.status !== "filament_over" && f.spool_count > 0,
    );
  }, [filaments, material]);

  // Compute available colors and dynamic colorMap
  const { availableColors, colorMap } = useMemo(() => {
    if (materialFilaments.length > 0) {
      const colors: string[] = [];
      const map: Record<string, { id: string; name: string; hex: string }> = {};
      for (const f of materialFilaments) {
        if (!colors.includes(f.color_id)) {
          colors.push(f.color_id);
          map[f.color_id] = { id: f.color_id, name: f.color_name, hex: f.color_hex };
        }
      }
      return { availableColors: colors, colorMap: map };
    }
    const defaultColors = ["charcoal", "teal", "bone", "stone"];
    const map: Record<string, { id: string; name: string; hex: string }> = {};
    for (const c of defaultColors) {
      if (COLORS[c]) {
        map[c] = { id: c, name: COLORS[c].name, hex: COLORS[c].hex };
      }
    }
    return { availableColors: defaultColors, colorMap: map };
  }, [materialFilaments]);

  useEffect(() => {
    if (availableColors.length > 0 && !availableColors.includes(color)) {
      setColor(availableColors[0]);
    }
  }, [availableColors, color]);

  const selectedColorName = colorMap[color]?.name ?? COLORS[color]?.name ?? color;

  const preset =
    pricingConfig.sizePresets.find((s) => s.id === size) ??
    pricingConfig.sizePresets[1] ??
    pricingConfig.sizePresets[0];
  const cx =
    pricingConfig.complexities.find((c) => c.id === complexity) ??
    pricingConfig.complexities.find((c) => c.id === "basic") ??
    pricingConfig.complexities.find((c) => c.id === "photo") ??
    pricingConfig.complexities[0];

  const quote = useMemo(
    () =>
      computeQuote(
        {
          volumeCm3: preset.cm3,
          materialId: material,
          qualityId: quality,
          infillPercentage: infillPct,
          infillPattern,
          wallLoops,
          supports: supportState.enabled ? supportState.type : "none",
          supportEnabled: supportState.enabled,
          supportType: supportState.type,
          supportThresholdAngle: supportState.thresholdAngle,
          supportOnBuildPlateOnly: supportState.onBuildPlateOnly,
          supportBaseFilament: supportState.baseFilament,
          supportInterfaceFilament: supportState.interfaceFilament,
          surfaceFinish,
          qty,
          modelingFee: cx.fee,
        },
        pricingConfig,
        "idea",
      ),
    [
      preset.cm3,
      material,
      quality,
      infillPct,
      infillPattern,
      wallLoops,
      supportState,
      surfaceFinish,
      qty,
      cx.fee,
      pricingConfig,
    ],
  );

  const materialMeta = pricingConfig.materials.find((m) => m.id === material);
  const qualityMeta = pricingConfig.qualities.find((q) => q.id === quality);
  const patternMeta = INFILL_PATTERNS.find((p) => p.id === infillPattern);
  const finishMeta = SURFACE_FINISHES.find((f) => f.id === surfaceFinish);
  const supportTypeMeta = BAMBU_SUPPORT_TYPES.find((t) => t.id === supportState.type);
  const supportDisplayLabel = supportState.enabled
    ? `${supportTypeMeta?.label ?? supportState.type} · ${supportState.thresholdAngle}°${
        supportState.onBuildPlateOnly ? " · Plate only" : ""
      }${supportState.interfaceFilament !== "Default" ? ` · ${supportState.interfaceFilament}` : ""}`
    : "None";

  async function handleSubmitRequest() {
    if (idea.trim().length < 6 && photos.length === 0) {
      toast.error("Tell us what you need or attach reference photos.");
      return;
    }

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Please enter a valid email address so we can reply with your quote.");
      return;
    }

    if (editItem && onUpdateItem) {
      const customData: CustomSpec = {
        path: "idea",
        printerId: selectedPrinter?.id,
        printerName: selectedPrinter?.name,
        printerModel: selectedPrinter?.model,
        material: materialMeta?.name ?? material,
        materialId: material,
        quality: qualityMeta?.name ?? quality,
        qualityId: quality,
        infill: `${infillPct}% (${patternMeta?.name ?? "Gyroid"})`,
        infillPercentage: infillPct,
        infillPattern,
        wallLoops,
        supports: supportDisplayLabel,
        supportEnabled: supportState.enabled,
        supportType: supportState.type,
        supportThresholdAngle: supportState.thresholdAngle,
        supportOnBuildPlateOnly: supportState.onBuildPlateOnly,
        supportBaseFilament: supportState.baseFilament,
        supportInterfaceFilament: supportState.interfaceFilament,
        surfaceFinish: finishMeta?.name ?? surfaceFinish,
        color: selectedColorName,
        colorId: color,
        notes: `${idea}${email ? ` · ${email}` : ""}`,
        idea,
        email,
        sizeId: size,
        complexityId: complexity,
        volumeCm3: preset.cm3,
        modeling: cx.name,
        referencePhotos: photos.length > 0 ? photos : undefined,
      };

      onUpdateItem(editItem.id, {
        name: `Custom design · ${preset.name}`,
        color: selectedColorName,
        unitPrice: editItem.unitPrice || 0,
        qty,
        custom: customData,
      });
      toast.success("Custom design settings updated in cart!");
      void navigate({ to: "/cart" });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await submitCustomDesignRequest({
        data: {
          name: name.trim() || user?.displayName || "Customer",
          email: email.trim(),
          phone: phone.trim() || undefined,
          idea: idea.trim(),
          photos,
          sizeName: `${preset.name} (${preset.hint})`,
          materialName: materialMeta?.name ?? material,
          colorName: selectedColorName,
          quantity: qty,
          printerName: selectedPrinter?.name ?? "Bambu Lab Fleet",
          specsSummary: `${infillPct}% ${patternMeta?.name ?? "Gyroid"}, ${wallLoops} loops, Supports: ${supportDisplayLabel}`,
        },
      });

      setSubmittedTicketId(res.ticketId);
      toast.success("Request submitted! We'll review and send your quote within 24 hours.");
    } catch (err: any) {
      toast.error(err?.message || "Failed to submit request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submittedTicketId) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-8 sm:p-12 shadow-xs text-center max-w-2xl mx-auto space-y-6 animate-in fade-in duration-300">
        <div className="size-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto border border-emerald-500/20">
          <CheckCircle2 className="size-8" />
        </div>
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-2">
            Request Reference: #REQ-{submittedTicketId}
          </span>
          <h2 className="font-display text-2xl sm:text-3xl font-semibold text-fg">
            Custom Request Submitted!
          </h2>
          <p className="mt-2 text-sm sm:text-base text-muted max-w-md mx-auto">
            Thank you! We&apos;ve received your description and reference photos. Our engineering team will review your specifications and send you a custom quote within 24 hours to <strong className="text-fg">{email}</strong>.
          </p>
        </div>

        {/* Summary of submitted request */}
        <div className="rounded-2xl border border-border/70 bg-surface-2/40 p-4 text-left text-xs sm:text-sm space-y-2.5">
          <div className="flex justify-between border-b border-border/40 pb-2">
            <span className="text-muted">Concept</span>
            <span className="font-medium text-fg line-clamp-1 max-w-[65%] text-right">{idea || "See attached photos"}</span>
          </div>
          <div className="flex justify-between border-b border-border/40 pb-2">
            <span className="text-muted">Estimated Size</span>
            <span className="font-medium text-fg">{preset.name}</span>
          </div>
          <div className="flex justify-between border-b border-border/40 pb-2">
            <span className="text-muted">Material &amp; Color</span>
            <span className="font-medium text-fg">{materialMeta?.name ?? material} · {selectedColorName}</span>
          </div>
          <div className="flex justify-between border-b border-border/40 pb-2">
            <span className="text-muted">Quantity</span>
            <span className="font-medium text-fg">{qty} unit{qty > 1 ? "s" : ""}</span>
          </div>
          {photos.length > 0 && (
            <div className="flex justify-between">
              <span className="text-muted">Reference Photos</span>
              <span className="font-medium text-accent">{photos.length} photo{photos.length > 1 ? "s" : ""} attached</span>
            </div>
          )}
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            variant="outline"
            onClick={() => {
              setSubmittedTicketId(null);
              setIdea("");
              setPhotos([]);
            }}
            className="w-full sm:w-auto"
          >
            Submit Another Idea
          </Button>
          <Link to="/shop" className="w-full sm:w-auto">
            <Button className="w-full">
              Explore Ready-Made Shop &rarr;
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-8 md:grid-cols-12">
      <form
        className="space-y-6 md:col-span-7"
        onSubmit={(e) => {
          e.preventDefault();
          void handleSubmitRequest();
        }}
      >
        <div>
          <Label htmlFor="idea">What do you need?</Label>
          <Textarea
            id="idea"
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder="A replacement knob for my washing machine, or a wall hook that holds a motorcycle helmet, about palm sized…"
            className="min-h-[110px]"
          />
        </div>

        {/* Reference Photos / Sketches Uploader */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <Label htmlFor="photo-input">Attach Reference Photos or Sketches (Optional)</Label>
            <span className="text-xs text-muted">
              {photos.length}/5 attached
            </span>
          </div>
          <p className="text-xs text-muted mb-2.5">
            Snap photos of the broken part, a napkin sketch, or reference photos from multiple angles. (Tip: place a coin or ruler next to it for scale!)
          </p>

          <div className="space-y-3">
            {photos.length < 5 && (
              <label
                htmlFor="photo-input"
                className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border/80 bg-surface/50 p-5 text-center transition-colors hover:border-accent/60 hover:bg-surface-2/40 cursor-pointer"
              >
                <div className="flex size-10 items-center justify-center rounded-xl bg-accent/15 text-accent">
                  <Camera className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-fg">
                    Click to add photos or drag &amp; drop
                  </p>
                  <p className="text-xs text-muted mt-0.5">
                    PNG, JPG, WEBP, or HEIC up to 15MB each
                  </p>
                </div>
                <input
                  id="photo-input"
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  onChange={handlePhotoUpload}
                />
              </label>
            )}

            {photos.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                {photos.map((src, idx) => (
                  <div key={idx} className="group relative aspect-square rounded-xl overflow-hidden border border-border bg-surface-2 shadow-2xs">
                    <img
                      src={src}
                      alt={`Reference ${idx + 1}`}
                      className="size-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(idx)}
                      className="absolute top-1 right-1 flex size-6 items-center justify-center rounded-full bg-black/70 text-white hover:bg-danger transition-colors shadow-xs cursor-pointer"
                      title="Remove photo"
                    >
                      <X className="size-3.5" />
                    </button>
                    <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white/90">
                      Photo {idx + 1}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Contact Information */}
        <div className="rounded-2xl border border-border/70 bg-surface p-4 sm:p-5 space-y-3.5 shadow-[var(--shadow-border)]">
          <div>
            <Label className="text-sm font-semibold text-fg">Your Contact Details</Label>
            <p className="text-xs text-muted mt-0.5">
              We&apos;ll review your request and send your quote and 3D modeling plan directly to this email within 24 hours.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="contact-name" className="text-xs text-muted">Your Name (Optional)</Label>
              <Input
                id="contact-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ramesh Sharma"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="contact-phone" className="text-xs text-muted">Phone / WhatsApp (Optional)</Label>
              <Input
                id="contact-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="contact-email" className="text-xs text-muted">Email Address (Required for Quote)</Label>
            <Input
              id="contact-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-1"
            />
          </div>
        </div>

        <div>
          <Label>Approximate Size</Label>
          <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full">
            {pricingConfig.sizePresets.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSize(s.id)}
                className={cn(
                  "flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all min-h-12 leading-none cursor-pointer",
                  size === s.id
                    ? "border-accent bg-accent text-ink shadow-sm font-semibold"
                    : "border-border/80 bg-surface text-muted shadow-[var(--shadow-border)] hover:border-accent/40 hover:text-fg font-medium",
                )}
              >
                <span className="text-xs sm:text-sm font-semibold">{s.name}</span>
                <span className={cn("mt-1 text-[11px] leading-tight", size === s.id ? "opacity-80 text-ink" : "text-muted")}>
                  {s.hint}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label>Design &amp; Modeling Starting Point</Label>
          <div className="mt-2 grid gap-2">
            {[
              {
                id: "photo",
                name: "I have reference photos or broken part measurements",
                note: "Best if you snapped photos of the broken piece from several angles or have physical dimensions.",
              },
              {
                id: "sketch",
                name: "Rough sketch or concept idea",
                note: "You have a paper drawing, diagram, or functional concept that needs CAD modeling from scratch.",
              },
              {
                id: "replica",
                name: "Replicate or modify an existing product",
                note: "A bracket, mount, adapter, or gadget inspired by an existing product with your custom tweaks.",
              },
            ].map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setComplexity(c.id)}
                className={cn(
                  "rounded-2xl p-4 text-left shadow-[var(--shadow-border)] transition-colors cursor-pointer",
                  complexity === c.id ? "bg-accent-soft ring-2 ring-accent" : "bg-surface hover:bg-surface-2/40",
                )}
              >
                <p className="font-medium text-sm text-fg flex items-center justify-between">
                  <span>{c.name}</span>
                  {complexity === c.id && <Check className="size-4 text-accent" />}
                </p>
                <p className="mt-1 text-xs text-muted">{c.note}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Printer Selection */}
        <PrinterSelector
          printers={printers}
          selectedPrinterId={selectedPrinterId}
          onSelect={setSelectedPrinterId}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Material */}
          <FieldSelect id="imat" label="Material" value={material} onChange={setMaterial}>
            {pricingConfig.materials.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </FieldSelect>

          {/* Layer Height (No Multipliers) */}
          <FieldSelect id="iqual" label="Layer Height & Detail" value={quality} onChange={setQuality}>
            {pricingConfig.qualities.map((q) => (
              <option key={q.id} value={q.id}>
                {q.name}
              </option>
            ))}
          </FieldSelect>
        </div>

        <div className="flex justify-end -mt-2 mb-2">
          <Link to="/materials" className="text-xs font-medium text-accent hover:underline">
            Not sure which material? Check Filament Guide &rarr;
          </Link>
        </div>

        {/* INFILL SLIDER + NUMERIC TEXTBOX FOR IDEA */}
        <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5 space-y-3 shadow-[var(--shadow-border)]">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="idea-infill-slider" className="text-sm font-medium">Infill Percentage</Label>
              <p className="text-xs text-muted">Internal strength vs. lightweight feel</p>
            </div>
            <div className="flex items-center gap-1.5">
              <input
                id="idea-infill-number"
                type="number"
                min="5"
                max="100"
                step="1"
                value={infillPct}
                onChange={(e) => {
                  const val = Math.max(5, Math.min(100, Number(e.target.value) || 5));
                  setInfillPct(val);
                }}
                className="w-16 h-9 rounded-xl border border-border bg-surface-2 px-2.5 text-right font-medium text-sm text-fg focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent tabular-nums"
              />
              <span className="text-sm font-bold text-muted">%</span>
            </div>
          </div>

          <div className="py-1">
            <input
              id="idea-infill-slider"
              type="range"
              min="5"
              max="100"
              step="1"
              value={infillPct}
              onChange={(e) => setInfillPct(Number(e.target.value))}
              className="w-full accent-accent h-2.5 bg-surface-2 rounded-lg cursor-pointer"
            />
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {[
              { pct: 15, label: "15% · Light" },
              { pct: 20, label: "20% · Standard" },
              { pct: 40, label: "40% · Sturdy" },
              { pct: 70, label: "70% · Heavy Duty" },
              { pct: 100, label: "100% · Solid" },
            ].map((p) => (
              <button
                key={p.pct}
                type="button"
                onClick={() => setInfillPct(p.pct)}
                className={cn(
                  "rounded-lg px-3 py-1 text-xs font-medium transition-colors cursor-pointer",
                  infillPct === p.pct
                    ? "bg-accent text-ink"
                    : "bg-surface-2 text-muted border border-border/70 hover:border-accent/60 hover:text-fg",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* ADVANCED BAMBU SETTINGS FOR IDEA */}
        <div className="rounded-2xl border border-border bg-surface shadow-[var(--shadow-border)] overflow-hidden">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex items-center justify-between p-4 sm:p-5 text-left hover:bg-surface-2/40 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <span className="flex size-7 items-center justify-center rounded-lg bg-accent/15 text-accent">
                <Sliders className="size-4" />
              </span>
              <div>
                <p className="font-semibold text-sm text-fg flex items-center gap-2">
                  <span>Advanced Bambu Slicer Settings</span>
                  <span className="rounded-full bg-accent/15 text-accent px-2 py-0.5 text-[10px] font-semibold">
                    Optional
                  </span>
                </p>
                <p className="text-xs text-muted mt-0.5">
                  Pattern ({patternMeta?.name}), {wallLoops} walls, supports ({supportState.enabled ? supportTypeMeta?.label ?? supportState.type : "None"})
                </p>
              </div>
            </div>
            <ChevronDown
              className={cn("size-4 text-muted transition-transform duration-200", showAdvanced ? "rotate-180" : "")}
            />
          </button>

          {showAdvanced && (
            <div className="p-4 sm:p-5 pt-0 space-y-4 border-t border-border/70 animate-in fade-in duration-200">
              <div className="grid gap-4 sm:grid-cols-2 pt-3">
                <div>
                  <Label htmlFor="idea-infill-pattern">Infill Pattern</Label>
                  <select
                    id="idea-infill-pattern"
                    value={infillPattern}
                    onChange={(e) => setInfillPattern(e.target.value)}
                    className="h-11 w-full rounded-xl border border-border bg-surface px-3.5 text-sm text-fg shadow-[var(--shadow-border)] focus:border-accent focus:outline-none"
                  >
                    {INFILL_PATTERNS.map((pat) => (
                      <option key={pat.id} value={pat.id}>
                        {pat.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted mt-1">{patternMeta?.hint}</p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label htmlFor="idea-wall-loops">Wall Loops (Shells)</Label>
                    <span className="text-xs font-semibold text-accent">{wallLoops} loops</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      id="idea-wall-loops"
                      type="range"
                      min="2"
                      max="6"
                      step="1"
                      value={wallLoops}
                      onChange={(e) => setWallLoops(Number(e.target.value))}
                      className="w-full accent-accent h-2.5 bg-surface-2 rounded-lg cursor-pointer"
                    />
                    <input
                      type="number"
                      min="2"
                      max="6"
                      value={wallLoops}
                      onChange={(e) => setWallLoops(Math.max(2, Math.min(6, Number(e.target.value) || 2)))}
                      className="w-12 h-9 rounded-xl border border-border bg-surface-2 text-center font-medium text-xs text-fg"
                    />
                  </div>
                  <p className="text-xs text-muted mt-1">Perimeter wall loops</p>
                </div>
              </div>

              {/* Bambu Support Settings */}
              <BambuSupportSettings value={supportState} onChange={setSupportState} />

              <div>
                <Label htmlFor="idea-finish">Surface Finish</Label>
                <select
                  id="idea-finish"
                  value={surfaceFinish}
                  onChange={(e) => setSurfaceFinish(e.target.value)}
                  className="h-11 w-full rounded-xl border border-border bg-surface px-3.5 text-sm text-fg shadow-[var(--shadow-border)] focus:border-accent focus:outline-none"
                >
                  {SURFACE_FINISHES.map((fin) => (
                    <option key={fin.id} value={fin.id}>
                      {fin.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted mt-1">{finishMeta?.hint}</p>
              </div>
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between">
            <Label>Colour</Label>
            <span className="text-xs text-muted">
              {availableColors.length} {material.toUpperCase()} {availableColors.length === 1 ? "shade" : "shades"} in stock
            </span>
          </div>
          <ColorSwatches
            colors={availableColors}
            colorMap={colorMap}
            value={color}
            onChange={setColor}
          />
        </div>

        <div>
          <Label>Quantity</Label>
          <QuantityStepper value={qty} onChange={setQty} />
        </div>

        <div className="space-y-2 pt-2">
          <Button
            type="submit"
            size="lg"
            disabled={isSubmitting}
            className="w-full sm:w-auto gap-2 text-base px-8 h-12 shadow-sm cursor-pointer"
          >
            {editItem ? (
              <>
                <Save className="size-4" />
                Update in cart
              </>
            ) : isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Submitting Request…
              </>
            ) : (
              <>
                <Send className="size-4" />
                Submit Request for Free Quote
              </>
            )}
          </Button>
          {!editItem && (
            <p className="text-xs text-muted">
              Zero upfront payment · We review your request and send you a custom quote within 24 hours.
            </p>
          )}
        </div>
      </form>

      {/* Right Column: Custom Quote Process Panel (Replaces Estimate Panel) */}
      <div className="md:col-span-5">
        <div className="h-fit rounded-2xl border border-border bg-surface p-6 shadow-xs md:sticky md:top-24 space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium tracking-[0.18em] text-subtle uppercase">
              Custom Quote Request
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-2.5 py-0.5 text-[11px] font-semibold text-fg">
              <Clock className="size-3 text-accent" />
              Quote within 24h
            </span>
          </div>

          <div>
            <h3 className="font-display text-xl sm:text-2xl font-semibold text-fg">
              Free Engineering Review
            </h3>
            <p className="mt-1 text-sm text-muted leading-relaxed">
              We review your idea, check 3D print feasibility, and calculate exact CAD modeling &amp; material requirements before you pay anything.
            </p>
          </div>

          <div className="space-y-4 border-t border-border pt-4 text-sm">
            <div className="flex gap-3 items-start">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-2 text-fg font-semibold text-xs mt-0.5">
                1
              </div>
              <div>
                <p className="font-medium text-fg">Describe &amp; Attach</p>
                <p className="text-xs text-muted mt-0.5">
                  Explain what you need and attach reference photos, measurements, or sketches. No 3D files needed.
                </p>
              </div>
            </div>

            <div className="flex gap-3 items-start">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-2 text-fg font-semibold text-xs mt-0.5">
                2
              </div>
              <div>
                <p className="font-medium text-fg">Expert Feasibility Review</p>
                <p className="text-xs text-muted mt-0.5">
                  Our engineers check CAD geometry, structural wall strength, and suggest optimal materials (PLA / PETG / ABS).
                </p>
              </div>
            </div>

            <div className="flex gap-3 items-start">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-2 text-fg font-semibold text-xs mt-0.5">
                3
              </div>
              <div>
                <p className="font-medium text-fg">Quote &amp; Production Plan</p>
                <p className="text-xs text-muted mt-0.5">
                  You receive an official quote by email and WhatsApp. Once approved, we begin CAD drafting &amp; Bambu Lab printing.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border/80 bg-surface-2/50 p-4 space-y-2 text-xs">
            <div className="flex justify-between text-muted">
              <span>Estimated Size:</span>
              <span className="font-medium text-fg">{preset.name} ({preset.hint})</span>
            </div>
            <div className="flex justify-between text-muted">
              <span>Material:</span>
              <span className="font-medium text-fg">{materialMeta?.name ?? material} ({selectedColorName})</span>
            </div>
            <div className="flex justify-between text-muted">
              <span>Quantity:</span>
              <span className="font-medium text-fg">{qty} unit{qty > 1 ? "s" : ""}</span>
            </div>
            <div className="flex justify-between text-muted">
              <span>Machine:</span>
              <span className="font-medium text-fg">{selectedPrinter?.name ?? "Bambu Lab Fleet"}</span>
            </div>
            {photos.length > 0 && (
              <div className="flex justify-between text-muted pt-1 border-t border-border/40">
                <span>Photos:</span>
                <span className="font-medium text-accent">{photos.length} photo{photos.length > 1 ? "s" : ""} attached</span>
              </div>
            )}
          </div>

          <div className="pt-1 text-xs text-muted leading-relaxed">
            Have questions before submitting?{" "}
            {settings?.whatsapp_enabled === "true" && (settings?.contact_whatsapp || settings?.contact_phone || "").replace(/[^\d]/g, "") ? (
              <>
                Reach out on{" "}
                <a
                  href={`https://wa.me/${(settings?.contact_whatsapp || settings?.contact_phone || "").replace(/[^\d]/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent hover:underline font-medium"
                >
                  WhatsApp
                </a>{" "}
                or email us at{" "}
              </>
            ) : (
              <>Email our studio at </>
            )}
            <a
              href={`mailto:${settings?.contact_email || settings?.email || "hello@prynth.in"}`}
              className="text-accent hover:underline font-medium"
            >
              {settings?.contact_email || settings?.email || "hello@prynth.in"}
            </a>
            .
          </div>
        </div>
      </div>
    </div>
  );
}
