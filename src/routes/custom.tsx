import { createFileRoute, useNavigate, Link, getRouteApi } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { FileDropzone } from "@/components/file-dropzone";
import { ColorSwatches } from "@/components/color-swatches";
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
  type CustomPricingConfig,
} from "@/lib/quote";
import { parseStl } from "@/lib/stl";
import { cn } from "@/lib/utils";

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

function CustomPage() {
  const { path } = Route.useSearch();
  const navigate = useNavigate({ from: "/custom" });
  const add = useCart((s) => s.add);

  const { settings } = rootRoute.useLoaderData();
  const pricingConfig = useMemo(() => getPricingConfig(settings), [settings]);

  const tab = path ?? "upload";

  function switchTab(next: Path) {
    void navigate({ search: { path: next } });
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-16">
      <p className="text-[11px] font-medium tracking-[0.18em] text-subtle uppercase">
        Custom
      </p>
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight md:text-5xl">
        Print it your way
      </h1>
      <p className="mt-3 max-w-2xl text-muted">
        Two paths, same honest quote. Upload a model if you have one. If you
        don't, describe the thing — we'll model it first.
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
            STL, 3MF, or OBJ. Pick material, colour, and quality. Instant estimate
            from the file when we can read it.
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
            No file needed. Tell us the size and what it's for. Modeling is a
            separate, listed fee — no surprise design charges.
          </p>
        </button>
      </div>

      <div className="mt-10">
        {tab === "upload" ? (
          <UploadForm add={add} pricingConfig={pricingConfig} />
        ) : (
          <IdeaForm add={add} pricingConfig={pricingConfig} />
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
}: {
  total: number;
  print: number;
  modeling: number;
  days: string;
  volumeCm3: number;
  ready: boolean;
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
          ? "This is the price we'll honour if the file matches what you described. We'll email if anything is off."
          : "Add a file or a size so we can price this."}
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
        </dl>
      ) : null}
      <p className="mt-5 text-xs text-subtle">
        Setup is included. No extra fees for colour changes in the listed
        palette. Shipping added at checkout.
      </p>
    </aside>
  );
}

function UploadForm({
  add,
  pricingConfig,
}: {
  add: ReturnType<typeof useCart.getState>["add"];
  pricingConfig: CustomPricingConfig;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [volume, setVolume] = useState(0);
  const [sizeLabel, setSizeLabel] = useState("");
  const [parsing, setParsing] = useState(false);
  const [material, setMaterial] = useState("pla");
  const [quality, setQuality] = useState("standard");
  const [infill, setInfill] = useState("standard");
  const [color, setColor] = useState("charcoal");
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState("");
  const [fallback, setFallback] = useState("desk");

  async function handleFile(next: File | null) {
    setFile(next);
    setVolume(0);
    setSizeLabel("");
    if (!next) return;
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
          infillId: infill,
          qty,
        },
        pricingConfig,
        "upload",
      ),
    [volume, material, quality, infill, qty, pricingConfig],
  );

  const materialMeta = pricingConfig.materials.find((m) => m.id === material);
  const qualityMeta = pricingConfig.qualities.find((q) => q.id === quality);
  const infillMeta = pricingConfig.infills.find((i) => i.id === infill);

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
        material: materialMeta?.name ?? material,
        quality: qualityMeta?.name ?? quality,
        infill: infillMeta?.name ?? infill,
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
        {parsing ? <p className="text-sm text-muted">Reading the model…</p> : null}
        {sizeLabel ? <p className="text-sm text-muted">{sizeLabel}</p> : null}
        
        {file && sizeLabel && !parsing && (
          <div className="mt-4">
            <Label>3D Preview</Label>
            <div className="mt-2">
              <ModelViewer file={file} />
            </div>
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
                  "h-11 rounded-full px-4 text-sm font-medium",
                  fallback === s.id
                    ? "bg-accent text-ink"
                    : "bg-surface text-muted shadow-[var(--shadow-border)]",
                )}
              >
                {s.name}
                <span className="ml-1 text-xs opacity-70">{s.hint}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FieldSelect id="mat" label="Material" value={material} onChange={setMaterial}>
            {pricingConfig.materials.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} (₹{m.rate}/cm³)
              </option>
            ))}
          </FieldSelect>
          <FieldSelect id="qual" label="Print quality" value={quality} onChange={setQuality}>
            {pricingConfig.qualities.map((q) => (
              <option key={q.id} value={q.id}>
                {q.name} ({q.mult}×)
              </option>
            ))}
          </FieldSelect>
          <FieldSelect id="inf" label="Infill" value={infill} onChange={setInfill}>
            {pricingConfig.infills.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name} ({i.mult}×)
              </option>
            ))}
          </FieldSelect>
          <div>
            <Label>Quantity</Label>
            <QuantityStepper value={qty} onChange={setQty} />
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
          <p>{materialMeta?.note}</p>
          <Link to="/materials" className="text-xs font-medium text-accent hover:underline inline-flex items-center gap-1">
            Need help choosing? View Filament Guide &rarr;
          </Link>
        </div>
        <p className="text-sm text-muted">{qualityMeta?.note}</p>
        <p className="text-sm text-muted">{infillMeta?.note}</p>

        <div>
          <Label>Colour</Label>
          <ColorSwatches
            colors={["charcoal", "teal", "bone", "stone"]}
            value={color}
            onChange={setColor}
          />
        </div>

        <div>
          <Label htmlFor="notes">Notes (optional)</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Orientation, which face should be pretty, holes that must be exact…"
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
        />
      </div>
    </div>
  );
}

function IdeaForm({
  add,
  pricingConfig,
}: {
  add: ReturnType<typeof useCart.getState>["add"];
  pricingConfig: CustomPricingConfig;
}) {
  const [idea, setIdea] = useState("");
  const [size, setSize] = useState("desk");
  const [complexity, setComplexity] = useState("photo");
  const [material, setMaterial] = useState("pla");
  const [quality, setQuality] = useState("standard");
  const [infill] = useState("standard");
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
          infillId: infill,
          qty,
          modelingFee: cx.fee,
        },
        pricingConfig,
        "idea",
      ),
    [preset.cm3, material, quality, infill, qty, cx.fee, pricingConfig],
  );

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
        material: pricingConfig.materials.find((m) => m.id === material)?.name ?? material,
        quality: pricingConfig.qualities.find((q) => q.id === quality)?.name ?? quality,
        infill: pricingConfig.infills.find((i) => i.id === infill)?.name ?? infill,
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
                  "h-11 rounded-full px-4 text-sm font-medium",
                  size === s.id
                    ? "bg-accent text-ink"
                    : "bg-surface text-muted shadow-[var(--shadow-border)]",
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
                  "rounded-2xl p-4 text-left shadow-[var(--shadow-border)]",
                  complexity === c.id ? "bg-accent-soft ring-2 ring-accent" : "bg-surface",
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
        <div className="grid gap-4 sm:grid-cols-2">
          <FieldSelect id="imat" label="Material" value={material} onChange={setMaterial}>
            {pricingConfig.materials.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} (₹{m.rate}/cm³)
              </option>
            ))}
          </FieldSelect>
          <FieldSelect id="iqual" label="Print quality" value={quality} onChange={setQuality}>
            {pricingConfig.qualities.map((q) => (
              <option key={q.id} value={q.id}>
                {q.name} ({q.mult}×)
              </option>
            ))}
          </FieldSelect>
        </div>
        <div className="flex justify-end -mt-2 mb-2">
          <Link to="/materials" className="text-xs font-medium text-accent hover:underline">
            Not sure which material? Check Filament Guide &rarr;
          </Link>
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
        />
      </div>
    </div>
  );
}
