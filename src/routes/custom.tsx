import { createFileRoute, useNavigate, Link, getRouteApi } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileDropzone } from "@/components/file-dropzone";
import { ColorSwatches } from "@/components/color-swatches";
import { COLORS } from "@/lib/products";
import { QuantityStepper } from "@/components/quantity-stepper";
import { ModelViewer } from "@/components/model-viewer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCart } from "@/lib/cart-store";
import { formatINR } from "@/lib/format";
import {
  computeQuote,
  getPricingConfig,
  INFILL_PATTERNS,
  SUPPORT_TYPES,
  SURFACE_FINISHES,
  BRIM_TYPES,
  type CustomPricingConfig,
} from "@/lib/quote";
import { getPrinters, type Printer } from "@/lib/printers-fns";
import { uploadCustomFile } from "@/lib/custom-files-fns";
import { parseStl } from "@/lib/stl";
import { cn } from "@/lib/utils";
import { ChevronDown, Sliders, Sparkles, Printer as PrinterIcon, Loader2, Check } from "lucide-react";

const rootRoute = getRouteApi("__root__");

type Path = "upload" | "idea";

export const Route = createFileRoute("/custom")({
  validateSearch: (s: Record<string, unknown>): { path?: Path } => ({
    path: s.path === "idea" ? "idea" : s.path === "upload" ? "upload" : undefined,
  }),
  component: CustomPage,
});

function FieldSelect({
  id,
  label,
  value,
  onChange,
  children,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: ReactNode;
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-xl border border-border bg-surface px-3.5 text-sm text-fg shadow-[var(--shadow-border)] focus:border-accent focus:ring-2 focus:ring-ring/30 focus:outline-none"
      >
        {children}
      </select>
    </div>
  );
}

function PrinterSelector({
  printers,
  selectedPrinterId,
  onSelect,
}: {
  printers: Printer[];
  selectedPrinterId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Select 3D Printer</Label>
        <span className="text-xs text-muted">Bambu Lab Fleet</span>
      </div>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {printers.map((p) => {
          const isSelected = p.id === selectedPrinterId;
          const isUnavailable = p.status === "maintenance" || p.status === "offline";

          let statusBadge = (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Available
            </span>
          );
          if (p.status === "busy") {
            statusBadge = (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                <span className="size-1.5 rounded-full bg-amber-500" />
                In Queue
              </span>
            );
          } else if (p.status === "maintenance") {
            statusBadge = (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-2 py-0.5 text-[11px] font-medium text-rose-600 dark:text-rose-400">
                <span className="size-1.5 rounded-full bg-rose-500" />
                Maintenance
              </span>
            );
          } else if (p.status === "offline") {
            statusBadge = (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-3 px-2 py-0.5 text-[11px] font-medium text-muted">
                Offline
              </span>
            );
          }

          return (
            <button
              key={p.id}
              type="button"
              disabled={isUnavailable}
              onClick={() => onSelect(p.id)}
              className={cn(
                "relative flex flex-col justify-between rounded-xl border p-3.5 text-left transition-all",
                isSelected
                  ? "border-accent bg-accent-soft/40 shadow-sm ring-1 ring-accent"
                  : isUnavailable
                    ? "border-border/60 bg-surface-2/40 opacity-60 cursor-not-allowed"
                    : "border-border bg-surface hover:border-border-hover hover:bg-surface-2/50 cursor-pointer"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold text-fg">{p.name}</p>
                    {isSelected && <Check className="size-3.5 text-accent" strokeWidth={2.5} />}
                  </div>
                  <p className="text-xs text-muted">{p.model}</p>
                </div>
                {statusBadge}
              </div>
              <div className="mt-2.5 flex items-center justify-between text-[11px] text-muted border-t border-border/40 pt-2">
                <span>{p.build_volume}</span>
                <span>{p.nozzle_size}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CustomPage() {
  const { path } = Route.useSearch();
  const navigate = useNavigate({ from: "/custom" });
  const add = useCart((s) => s.add);

  const { settings } = rootRoute.useLoaderData();
  const pricingConfig = useMemo(() => getPricingConfig(settings), [settings]);

  const { data: printers = [] } = useQuery({
    queryKey: ["printers"],
    queryFn: () => getPrinters(),
  });

  const tab = path ?? "upload";

  function switchTab(next: Path) {
    void navigate({ search: { path: next } });
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-16">
      <p className="text-[11px] font-medium tracking-[0.18em] text-subtle uppercase">
        Custom Studio
      </p>
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight md:text-5xl">
        Print it your way
      </h1>
      <p className="mt-3 max-w-2xl text-muted">
        Precision 3D printing on our high-speed Bambu Lab fleet. Choose your machine, upload your 3D model, or describe
        your concept and we'll model it first.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => switchTab("upload")}
          className={cn(
            "rounded-2xl p-5 text-left shadow-[var(--shadow-border)] transition-shadow duration-150",
            tab === "upload" ? "bg-accent-soft ring-2 ring-accent" : "bg-surface hover:shadow-[var(--shadow-border-hover)]",
          )}
        >
          <p className="font-display text-lg font-semibold">Upload your model</p>
          <p className="mt-1 text-sm text-muted">
            STL, 3MF, or OBJ. Instant volume estimate, printer selection, and full Bambu slicer tuning.
          </p>
        </button>
        <button
          type="button"
          onClick={() => switchTab("idea")}
          className={cn(
            "rounded-2xl p-5 text-left shadow-[var(--shadow-border)] transition-shadow duration-150",
            tab === "idea" ? "bg-accent-soft ring-2 ring-accent" : "bg-surface hover:shadow-[var(--shadow-border-hover)]",
          )}
        >
          <p className="font-display text-lg font-semibold">Describe your idea</p>
          <p className="mt-1 text-sm text-muted">
            No file needed. Tell us the dimensions and purpose. Listed CAD design fee with zero surprise charges.
          </p>
        </button>
      </div>

      <div className="mt-10">
        {tab === "upload" ? (
          <UploadForm add={add} pricingConfig={pricingConfig} printers={printers} />
        ) : (
          <IdeaForm add={add} pricingConfig={pricingConfig} printers={printers} />
        )}
      </div>
    </div>
  );
}

function QuotePanel({
  total,
  print,
  modeling,
  days,
  volumeCm3,
  ready,
  specs,
}: {
  total: number;
  print: number;
  modeling: number;
  days: string;
  volumeCm3: number;
  ready: boolean;
  specs?: {
    printerName?: string;
    qualityName?: string;
    infillLabel?: string;
    wallLoops?: number;
    supports?: string;
    surfaceFinish?: string;
  };
}) {
  return (
    <aside className="h-fit rounded-3xl bg-surface p-6 shadow-[var(--shadow-border)] md:sticky md:top-24">
      <p className="text-[11px] font-medium tracking-[0.18em] text-subtle uppercase">
        Estimate
      </p>
      <p className="mt-3 font-display text-4xl font-semibold tabular-nums">
        {ready ? formatINR(total) : "—"}
      </p>
      <p className="mt-1 text-sm text-muted">
        {ready
          ? "Honest quote calculated for your specifications on our Bambu Lab fleet."
          : "Add a file or choose a size to preview your price."}
      </p>
      {ready ? (
        <dl className="mt-6 space-y-2 border-t border-border pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">Print</dt>
            <dd className="tabular-nums">{formatINR(print)}</dd>
          </div>
          {modeling > 0 ? (
            <div className="flex justify-between">
              <dt className="text-muted">Modeling</dt>
              <dd className="tabular-nums">{formatINR(modeling)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between">
            <dt className="text-muted">Typical print time</dt>
            <dd>{days}</dd>
          </div>
          {volumeCm3 > 0 ? (
            <div className="flex justify-between">
              <dt className="text-muted">Est. volume</dt>
              <dd className="tabular-nums">{volumeCm3.toFixed(1)} cm³</dd>
            </div>
          ) : null}
          {specs ? (
            <div className="border-t border-border/70 pt-2.5 mt-2.5 space-y-1.5 text-xs text-muted">
              {specs.printerName && (
                <div className="flex justify-between">
                  <span>Selected Machine</span>
                  <span className="font-medium text-fg">{specs.printerName}</span>
                </div>
              )}
              {specs.qualityName && (
                <div className="flex justify-between">
                  <span>Layer Profile</span>
                  <span className="font-medium text-fg">{specs.qualityName}</span>
                </div>
              )}
              {specs.infillLabel && (
                <div className="flex justify-between">
                  <span>Infill Setup</span>
                  <span className="font-medium text-fg">{specs.infillLabel}</span>
                </div>
              )}
              {specs.wallLoops && (
                <div className="flex justify-between">
                  <span>Perimeter Walls</span>
                  <span className="font-medium text-fg">{specs.wallLoops} loops</span>
                </div>
              )}
              {specs.supports && specs.supports !== "none" && (
                <div className="flex justify-between">
                  <span>Support Structure</span>
                  <span className="font-medium text-accent">{specs.supports}</span>
                </div>
              )}
              {specs.surfaceFinish && specs.surfaceFinish !== "standard" && (
                <div className="flex justify-between">
                  <span>Surface Finish</span>
                  <span className="font-medium text-accent">{specs.surfaceFinish}</span>
                </div>
              )}
            </div>
          ) : null}
        </dl>
      ) : null}
      <p className="mt-5 text-xs text-subtle">
        Setup is included. No extra fees for standard colour choices. Shipping added at checkout.
      </p>
    </aside>
  );
}

function UploadForm({
  add,
  pricingConfig,
  printers,
}: {
  add: ReturnType<typeof useCart.getState>["add"];
  pricingConfig: CustomPricingConfig;
  printers: Printer[];
}) {
  const [selectedPrinterId, setSelectedPrinterId] = useState(() => {
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

  const [file, setFile] = useState<File | null>(null);
  const [fileId, setFileId] = useState<string | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [volume, setVolume] = useState(0);
  const [sizeLabel, setSizeLabel] = useState("");
  const [parsing, setParsing] = useState(false);
  const [material, setMaterial] = useState("pla");
  const [quality, setQuality] = useState("standard");
  const [infillPct, setInfillPct] = useState(20);
  const [infillPattern, setInfillPattern] = useState("gyroid");
  const [wallLoops, setWallLoops] = useState(2);
  const [supports, setSupports] = useState("none");
  const [surfaceFinish, setSurfaceFinish] = useState("standard");
  const [brim, setBrim] = useState("auto");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [color, setColor] = useState("charcoal");
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState("");
  const [fallback, setFallback] = useState("desk");

  async function handleFile(next: File | null) {
    setFile(next);
    setFileId(null);
    setVolume(0);
    setSizeLabel("");
    if (!next) return;

    // Upload model in background so admin can open it directly in Bambu Studio
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      if (base64) {
        setUploadingFile(true);
        try {
          const res = await uploadCustomFile({
            data: {
              fileName: next.name,
              fileSize: next.size,
              mimeType: next.type || "application/octet-stream",
              fileData: base64,
            },
          });
          if (res?.fileId) {
            setFileId(res.fileId);
          }
        } catch (err) {
          console.error("Failed to upload model file:", err);
        } finally {
          setUploadingFile(false);
        }
      }
    };
    reader.readAsDataURL(next);

    const ext = next.name.split(".").pop()?.toLowerCase();
    if (ext !== "stl") {
      const preset =
        pricingConfig.sizePresets.find((s) => s.id === fallback) ??
        pricingConfig.sizePresets[1] ??
        pricingConfig.sizePresets[0];
      setVolume(preset.cm3);
      setSizeLabel("Using size preset — 3MF/OBJ quotes are confirmed by email.");
      return;
    }
    setParsing(true);
    try {
      const est = await parseStl(next);
      if (est && est.volumeCm3 > 0) {
        setVolume(est.volumeCm3);
        setSizeLabel(
          `${est.sizeMm.x.toFixed(0)} × ${est.sizeMm.y.toFixed(0)} × ${est.sizeMm.z.toFixed(0)} mm · ${est.triangles.toLocaleString("en-IN")} triangles`,
        );
      } else {
        const preset =
          pricingConfig.sizePresets.find((s) => s.id === fallback) ??
          pricingConfig.sizePresets[1] ??
          pricingConfig.sizePresets[0];
        setVolume(preset.cm3);
        setSizeLabel("Couldn't read that STL. Using the size preset below.");
      }
    } catch {
      const preset =
        pricingConfig.sizePresets.find((s) => s.id === fallback) ??
        pricingConfig.sizePresets[1] ??
        pricingConfig.sizePresets[0];
      setVolume(preset.cm3);
      setSizeLabel("Couldn't read that STL. Using the size preset below.");
    } finally {
      setParsing(false);
    }
  }

  const quote = useMemo(
    () =>
      computeQuote(
        {
          volumeCm3: volume,
          materialId: material,
          qualityId: quality,
          infillPercentage: infillPct,
          infillPattern,
          wallLoops,
          supports,
          surfaceFinish,
          brim,
          qty,
        },
        pricingConfig,
        "upload",
      ),
    [volume, material, quality, infillPct, infillPattern, wallLoops, supports, surfaceFinish, brim, qty, pricingConfig],
  );

  const materialMeta = pricingConfig.materials.find((m) => m.id === material);
  const qualityMeta = pricingConfig.qualities.find((q) => q.id === quality);
  const patternMeta = INFILL_PATTERNS.find((p) => p.id === infillPattern);
  const supportMeta = SUPPORT_TYPES.find((s) => s.id === supports);
  const finishMeta = SURFACE_FINISHES.find((f) => f.id === surfaceFinish);

  function addEstimate() {
    if (!file || quote.total <= 0) {
      toast.error("Upload a model first.");
      return;
    }
    add({
      kind: "custom",
      name: `Custom print · ${file.name}`,
      color,
      unitPrice: quote.total,
      qty: 1,
      custom: {
        path: "upload",
        fileName: file.name,
        fileSize: file.size,
        fileId: fileId ?? undefined,
        printerId: selectedPrinter?.id,
        printerName: selectedPrinter?.name,
        printerModel: selectedPrinter?.model,
        material: materialMeta?.name ?? material,
        quality: qualityMeta?.name ?? quality,
        infill: `${infillPct}% (${patternMeta?.name ?? "Gyroid"})`,
        infillPercentage: infillPct,
        infillPattern,
        wallLoops,
        supports: supportMeta?.name ?? supports,
        surfaceFinish: finishMeta?.name ?? surfaceFinish,
        brim,
        color,
        notes,
        volumeCm3: quote.volumeCm3,
      },
    });
    toast.success("Estimate added to cart");
  }

  return (
    <div className="grid gap-8 md:grid-cols-12">
      <form
        className="space-y-6 md:col-span-7"
        onSubmit={(e) => {
          e.preventDefault();
          addEstimate();
        }}
      >
        <FileDropzone file={file} onFile={handleFile} />
        {uploadingFile && (
          <p className="flex items-center gap-1.5 text-xs text-accent">
            <Loader2 className="size-3.5 animate-spin" />
            Uploading 3D model to production queue…
          </p>
        )}
        {parsing ? <p className="text-sm text-muted">Reading the model…</p> : null}
        {sizeLabel ? <p className="text-sm text-muted">{sizeLabel}</p> : null}

        {file && !parsing && (
          <div className="mt-5 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <span className="size-2 rounded-full bg-accent animate-pulse" />
                Slicer Build Plate 3D Preview
              </Label>
              <span className="text-xs text-muted">
                {selectedPrinter?.name ?? "Bambu Lab P1S"} ({selectedPrinter?.build_volume ?? "256 × 256 mm"})
              </span>
            </div>
            <ModelViewer
              file={file}
              printer={selectedPrinter}
              colorName={color}
              colorHex={COLORS[color]?.hex ?? "#2A2E32"}
              onColorChange={(colorId) => {
                if (COLORS[colorId]) {
                  setColor(colorId);
                }
              }}
            />
          </div>
        )}

        <div>
          <Label>If we can't read the file, treat it as</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {pricingConfig.sizePresets.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setFallback(s.id);
                  if (!file || sizeLabel.includes("preset") || sizeLabel.includes("Couldn't")) {
                    setVolume(s.cm3);
                  }
                }}
                className={cn(
                  "h-11 rounded-full px-4 text-sm font-medium transition-all",
                  fallback === s.id
                    ? "bg-accent text-ink shadow-sm"
                    : "bg-surface text-muted shadow-[var(--shadow-border)] hover:text-fg",
                )}
              >
                {s.name}
                <span className="ml-1 text-xs opacity-70">{s.hint}</span>
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
          <FieldSelect id="mat" label="Material" value={material} onChange={setMaterial}>
            {pricingConfig.materials.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </FieldSelect>

          {/* Layer Height (Bambu Lab P1S Profiles - No Multipliers) */}
          <FieldSelect id="qual" label="Layer Height & Detail" value={quality} onChange={setQuality}>
            {pricingConfig.qualities.map((q) => (
              <option key={q.id} value={q.id}>
                {q.name}
              </option>
            ))}
          </FieldSelect>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
          <p>{materialMeta?.note}</p>
          <Link to="/materials" className="text-xs font-medium text-accent hover:underline inline-flex items-center gap-1">
            Need help choosing? View Filament Guide &rarr;
          </Link>
        </div>
        <p className="text-sm text-muted">{qualityMeta?.note}</p>

        {/* INFILL SLIDER + NUMERIC TEXTBOX */}
        <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5 space-y-3 shadow-[var(--shadow-border)]">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="infill-slider" className="text-sm font-medium">Infill Percentage</Label>
              <p className="text-xs text-muted">Internal density for strength vs. weight</p>
            </div>
            <div className="flex items-center gap-1.5">
              <input
                id="infill-number"
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
              id="infill-slider"
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
              { pct: 100, label: "100% · Solid" },
            ].map((p) => (
              <button
                key={p.pct}
                type="button"
                onClick={() => setInfillPct(p.pct)}
                className={cn(
                  "rounded-lg px-3 py-1 text-xs font-medium transition-colors",
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

        {/* ADVANCED BAMBU STUDIO SLICER SETTINGS (COLLAPSIBLE) */}
        <div className="rounded-2xl border border-border bg-surface shadow-[var(--shadow-border)] overflow-hidden">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex items-center justify-between p-4 sm:p-5 text-left hover:bg-surface-2/40 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <span className="flex size-7 items-center justify-center rounded-lg bg-accent/15 text-accent">
                <Sliders className="size-4" />
              </span>
              <div>
                <p className="font-semibold text-sm text-fg flex items-center gap-2">
                  <span>Advanced Bambu Slicer Settings</span>
                  <span className="rounded-full bg-accent/15 text-accent px-2 py-0.5 text-[10px] font-semibold">
                    Studio Tuned
                  </span>
                </p>
                <p className="text-xs text-muted mt-0.5">
                  Pattern ({patternMeta?.name}), {wallLoops} wall loops, supports ({supportMeta?.name})
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
                {/* Infill Pattern */}
                <div>
                  <Label htmlFor="infill-pattern">Infill Pattern</Label>
                  <select
                    id="infill-pattern"
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

                {/* Wall Loops (Perimeters) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label htmlFor="wall-loops">Wall Loops (Shells)</Label>
                    <span className="text-xs font-semibold text-accent">{wallLoops} loops</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      id="wall-loops"
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
                  <p className="text-xs text-muted mt-1">Extra walls dramatically increase side-impact strength</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Supports */}
                <div>
                  <Label htmlFor="supports">Support Structure</Label>
                  <select
                    id="supports"
                    value={supports}
                    onChange={(e) => setSupports(e.target.value)}
                    className="h-11 w-full rounded-xl border border-border bg-surface px-3.5 text-sm text-fg shadow-[var(--shadow-border)] focus:border-accent focus:outline-none"
                  >
                    {SUPPORT_TYPES.map((sup) => (
                      <option key={sup.id} value={sup.id}>
                        {sup.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted mt-1">{supportMeta?.hint}</p>
                </div>

                {/* Surface Finish / Texture */}
                <div>
                  <Label htmlFor="finish">Surface Finish</Label>
                  <select
                    id="finish"
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

              {/* Brim */}
              <div>
                <Label htmlFor="brim">Build Plate Adhesion</Label>
                <select
                  id="brim"
                  value={brim}
                  onChange={(e) => setBrim(e.target.value)}
                  className="h-11 w-full rounded-xl border border-border bg-surface px-3.5 text-sm text-fg shadow-[var(--shadow-border)] focus:border-accent focus:outline-none"
                >
                  {BRIM_TYPES.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        <div>
          <Label>Colour</Label>
          <ColorSwatches
            colors={["charcoal", "teal", "bone", "stone"]}
            value={color}
            onChange={setColor}
          />
        </div>

        <div>
          <Label>Quantity</Label>
          <QuantityStepper value={qty} onChange={setQty} />
        </div>

        <div>
          <Label htmlFor="notes">Notes (optional)</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Orientation preference, which face should be pretty, critical hole tolerances…"
          />
        </div>

        <Button type="submit" size="lg" disabled={!file}>
          Add estimate to cart
        </Button>
      </form>

      <div className="md:col-span-5">
        <QuotePanel
          total={quote.total}
          print={quote.print}
          modeling={0}
          days={quote.days}
          volumeCm3={quote.volumeCm3}
          ready={Boolean(file) && quote.total > 0}
          specs={{
            printerName: selectedPrinter?.name,
            qualityName: qualityMeta?.name,
            infillLabel: `${infillPct}% ${patternMeta?.name ?? "Gyroid"}`,
            wallLoops,
            supports: supports !== "none" ? supportMeta?.name : undefined,
            surfaceFinish: surfaceFinish !== "standard" ? finishMeta?.name : undefined,
          }}
        />
      </div>
    </div>
  );
}

function IdeaForm({
  add,
  pricingConfig,
  printers,
}: {
  add: ReturnType<typeof useCart.getState>["add"];
  pricingConfig: CustomPricingConfig;
  printers: Printer[];
}) {
  const [selectedPrinterId, setSelectedPrinterId] = useState(() => {
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

  const [idea, setIdea] = useState("");
  const [size, setSize] = useState("desk");
  const [complexity, setComplexity] = useState("photo");
  const [material, setMaterial] = useState("pla");
  const [quality, setQuality] = useState("standard");
  const [infillPct, setInfillPct] = useState(20);
  const [infillPattern, setInfillPattern] = useState("gyroid");
  const [wallLoops, setWallLoops] = useState(2);
  const [supports, setSupports] = useState("none");
  const [surfaceFinish, setSurfaceFinish] = useState("standard");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [color, setColor] = useState("charcoal");
  const [qty, setQty] = useState(1);
  const [email, setEmail] = useState("");

  const preset =
    pricingConfig.sizePresets.find((s) => s.id === size) ??
    pricingConfig.sizePresets[1] ??
    pricingConfig.sizePresets[0];
  const cx =
    pricingConfig.complexities.find((c) => c.id === complexity) ??
    pricingConfig.complexities[1] ??
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
          supports,
          surfaceFinish,
          qty,
          modelingFee: cx.fee,
        },
        pricingConfig,
        "idea",
      ),
    [preset.cm3, material, quality, infillPct, infillPattern, wallLoops, supports, surfaceFinish, qty, cx.fee, pricingConfig],
  );

  const materialMeta = pricingConfig.materials.find((m) => m.id === material);
  const qualityMeta = pricingConfig.qualities.find((q) => q.id === quality);
  const patternMeta = INFILL_PATTERNS.find((p) => p.id === infillPattern);
  const supportMeta = SUPPORT_TYPES.find((s) => s.id === supports);
  const finishMeta = SURFACE_FINISHES.find((f) => f.id === surfaceFinish);

  function addEstimate() {
    if (idea.trim().length < 12) {
      toast.error("Tell us a little more about the piece.");
      return;
    }
    add({
      kind: "custom",
      name: `Custom design · ${preset.name}`,
      color,
      unitPrice: quote.total,
      qty: 1,
      custom: {
        path: "idea",
        printerId: selectedPrinter?.id,
        printerName: selectedPrinter?.name,
        printerModel: selectedPrinter?.model,
        material: materialMeta?.name ?? material,
        quality: qualityMeta?.name ?? quality,
        infill: `${infillPct}% (${patternMeta?.name ?? "Gyroid"})`,
        infillPercentage: infillPct,
        infillPattern,
        wallLoops,
        supports: supportMeta?.name ?? supports,
        surfaceFinish: finishMeta?.name ?? surfaceFinish,
        color,
        notes: `${idea}${email ? ` · ${email}` : ""}`,
        volumeCm3: quote.volumeCm3,
        modeling: cx.name,
      },
    });
    toast.success("Estimate added to cart");
  }

  return (
    <div className="grid gap-8 md:grid-cols-12">
      <form
        className="space-y-6 md:col-span-7"
        onSubmit={(e) => {
          e.preventDefault();
          addEstimate();
        }}
      >
        <div>
          <Label htmlFor="idea">What do you need?</Label>
          <Textarea
            id="idea"
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder="A wall hook that holds a cycle helmet, about the size of a palm, rounded so it doesn't snag the strap…"
          />
        </div>
        <div>
          <Label htmlFor="email">Email for the design back-and-forth</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>
        <div>
          <Label>How big is it?</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {pricingConfig.sizePresets.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSize(s.id)}
                className={cn(
                  "h-11 rounded-full px-4 text-sm font-medium transition-all",
                  size === s.id
                    ? "bg-accent text-ink shadow-sm"
                    : "bg-surface text-muted shadow-[var(--shadow-border)] hover:text-fg",
                )}
              >
                {s.name}
                <span className="ml-1 text-xs opacity-70">{s.hint}</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <Label>How should we model it?</Label>
          <div className="mt-2 grid gap-2">
            {pricingConfig.complexities.filter((c) => c.id !== "file").map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setComplexity(c.id)}
                className={cn(
                  "rounded-2xl p-4 text-left shadow-[var(--shadow-border)] transition-colors",
                  complexity === c.id ? "bg-accent-soft ring-2 ring-accent" : "bg-surface hover:bg-surface-2/40",
                )}
              >
                <p className="font-medium">
                  {c.name}
                  {c.fee ? (
                    <span className="ml-2 text-sm font-normal text-muted">
                      {formatINR(c.fee)}
                    </span>
                  ) : null}
                </p>
                <p className="mt-1 text-sm text-muted">{c.note}</p>
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
              { pct: 100, label: "100% · Solid" },
            ].map((p) => (
              <button
                key={p.pct}
                type="button"
                onClick={() => setInfillPct(p.pct)}
                className={cn(
                  "rounded-lg px-3 py-1 text-xs font-medium transition-colors",
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
            className="w-full flex items-center justify-between p-4 sm:p-5 text-left hover:bg-surface-2/40 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <span className="flex size-7 items-center justify-center rounded-lg bg-accent/15 text-accent">
                <Sliders className="size-4" />
              </span>
              <div>
                <p className="font-semibold text-sm text-fg flex items-center gap-2">
                  <span>Advanced Bambu Slicer Settings</span>
                  <span className="rounded-full bg-accent/15 text-accent px-2 py-0.5 text-[10px] font-semibold">
                    Studio Tuned
                  </span>
                </p>
                <p className="text-xs text-muted mt-0.5">
                  Pattern ({patternMeta?.name}), {wallLoops} walls, {supportMeta?.name}
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

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="idea-supports">Support Structure</Label>
                  <select
                    id="idea-supports"
                    value={supports}
                    onChange={(e) => setSupports(e.target.value)}
                    className="h-11 w-full rounded-xl border border-border bg-surface px-3.5 text-sm text-fg shadow-[var(--shadow-border)] focus:border-accent focus:outline-none"
                  >
                    {SUPPORT_TYPES.map((sup) => (
                      <option key={sup.id} value={sup.id}>
                        {sup.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted mt-1">{supportMeta?.hint}</p>
                </div>

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
            </div>
          )}
        </div>

        <div>
          <Label>Colour</Label>
          <ColorSwatches
            colors={["charcoal", "teal", "bone", "stone"]}
            value={color}
            onChange={setColor}
          />
        </div>

        <div>
          <Label>Quantity</Label>
          <QuantityStepper value={qty} onChange={setQty} />
        </div>

        <Button type="submit" size="lg">
          Add estimate to cart
        </Button>
      </form>

      <div className="md:col-span-5">
        <QuotePanel
          total={quote.total}
          print={quote.print}
          modeling={quote.modeling}
          days={quote.days}
          volumeCm3={quote.volumeCm3}
          ready={idea.trim().length > 0}
          specs={{
            printerName: selectedPrinter?.name,
            qualityName: qualityMeta?.name,
            infillLabel: `${infillPct}% ${patternMeta?.name ?? "Gyroid"}`,
            wallLoops,
            supports: supports !== "none" ? supportMeta?.name : undefined,
            surfaceFinish: surfaceFinish !== "standard" ? finishMeta?.name : undefined,
          }}
        />
      </div>
    </div>
  );
}
