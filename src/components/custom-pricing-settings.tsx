import { useState, useMemo, useRef } from "react";
import { formatINR } from "@/lib/format";
import {
  DEFAULT_UPLOAD_FORMULA,
  DEFAULT_IDEA_FORMULA,
  DEFAULT_SETUP_FEE,
  DEFAULT_MIN_PRINT,
  MATERIALS,
  QUALITIES,
  INFILLS,
  SIZE_PRESETS,
  COMPLEXITY,
  type MaterialPricing,
  type QualityPricing,
  type InfillPricing,
  type SizePresetPricing,
  type ComplexityPricing,
} from "@/lib/quote";
import { evaluateFormula, validateFormula, type PricingVariables } from "@/lib/formula-evaluator";
import { cn } from "@/lib/utils";
import {
  Calculator,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Sparkles,
  Layers,
  FileCode2,
  Sliders,
  DollarSign,
  HelpCircle,
  Copy,
  Check,
} from "lucide-react";

interface CustomPricingSettingsProps {
  settings: Record<string, any>;
  onQuickSave?: (pricingData: Record<string, string>) => Promise<void>;
  isSaving?: boolean;
}

function safeParse<T>(val: any, fallback: T): T {
  if (!val) return fallback;
  if (typeof val !== "string") return val as T;
  try {
    const res = JSON.parse(val);
    return res ?? fallback;
  } catch {
    return fallback;
  }
}

export function CustomPricingSettings({
  settings,
  onQuickSave,
  isSaving = false,
}: CustomPricingSettingsProps) {
  const [activeSubTab, setActiveSubTab] = useState<"upload" | "idea" | "values">("upload");
  const [copiedFormula, setCopiedFormula] = useState(false);

  // Formula state
  const [uploadFormula, setUploadFormula] = useState<string>(
    () => settings.custom_pricing_upload_formula || DEFAULT_UPLOAD_FORMULA,
  );
  const [ideaFormula, setIdeaFormula] = useState<string>(
    () => settings.custom_pricing_idea_formula || DEFAULT_IDEA_FORMULA,
  );

  // Global pricing parameters
  const [setupFee, setSetupFee] = useState<number>(() =>
    Number(settings.custom_pricing_setup_fee ?? DEFAULT_SETUP_FEE),
  );
  const [minPrint, setMinPrint] = useState<number>(() =>
    Number(settings.custom_pricing_min_print ?? DEFAULT_MIN_PRINT),
  );

  // Config collections
  const [materials, setMaterials] = useState<MaterialPricing[]>(() =>
    safeParse<MaterialPricing[]>(settings.custom_pricing_materials, MATERIALS as unknown as MaterialPricing[]),
  );
  const [qualities, setQualities] = useState<QualityPricing[]>(() =>
    safeParse<QualityPricing[]>(settings.custom_pricing_qualities, QUALITIES as unknown as QualityPricing[]),
  );
  const [infills, setInfills] = useState<InfillPricing[]>(() =>
    safeParse<InfillPricing[]>(settings.custom_pricing_infills, INFILLS as unknown as InfillPricing[]),
  );
  const [sizePresets, setSizePresets] = useState<SizePresetPricing[]>(() =>
    safeParse<SizePresetPricing[]>(settings.custom_pricing_size_presets, SIZE_PRESETS as unknown as SizePresetPricing[]),
  );
  const [complexities, setComplexities] = useState<ComplexityPricing[]>(() =>
    safeParse<ComplexityPricing[]>(settings.custom_pricing_complexities, COMPLEXITY as unknown as ComplexityPricing[]),
  );

  // Textarea refs for variable insertion at cursor
  const uploadTextareaRef = useRef<HTMLTextAreaElement>(null);
  const ideaTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Live simulator state for File Upload
  const [simUploadVolume, setSimUploadVolume] = useState<number>(28);
  const [simUploadMaterial, setSimUploadMaterial] = useState<string>("pla");
  const [simUploadQuality, setSimUploadQuality] = useState<string>("standard");
  const [simUploadInfill, setSimUploadInfill] = useState<string>("standard");
  const [simUploadQty, setSimUploadQty] = useState<number>(1);

  // Live simulator state for Idea / Description
  const [simIdeaSize, setSimIdeaSize] = useState<string>("desk");
  const [simIdeaComplexity, setSimIdeaComplexity] = useState<string>("photo");
  const [simIdeaMaterial, setSimIdeaMaterial] = useState<string>("pla");
  const [simIdeaQuality, setSimIdeaQuality] = useState<string>("standard");
  const [simIdeaInfill, setSimIdeaInfill] = useState<string>("standard");
  const [simIdeaQty, setSimIdeaQty] = useState<number>(1);

  // Formula validation statuses
  const uploadValidation = useMemo(() => validateFormula(uploadFormula), [uploadFormula]);
  const ideaValidation = useMemo(
    () =>
      validateFormula(ideaFormula, [
        "volume",
        "material_rate",
        "quality_mult",
        "infill_mult",
        "setup_fee",
        "min_print",
        "qty",
        "modeling_fee",
      ]),
    [ideaFormula],
  );

  // Live evaluation for Upload Simulator
  const simUploadEval = useMemo(() => {
    const mat = materials.find((m) => m.id === simUploadMaterial) ?? materials[0] ?? { rate: 8 };
    const qual = qualities.find((q) => q.id === simUploadQuality) ?? qualities[0] ?? { mult: 1 };
    const inf = infills.find((i) => i.id === simUploadInfill) ?? infills[0] ?? { mult: 1 };

    const vars: PricingVariables = {
      volume: simUploadVolume,
      material_rate: mat.rate,
      quality_mult: qual.mult,
      infill_mult: inf.mult,
      setup_fee: setupFee,
      min_print: minPrint,
      qty: simUploadQty,
      modeling_fee: 0,
    };

    const res = evaluateFormula(uploadFormula, vars);
    return { ...res, vars, mat, qual, inf };
  }, [
    simUploadVolume,
    simUploadMaterial,
    simUploadQuality,
    simUploadInfill,
    simUploadQty,
    uploadFormula,
    materials,
    qualities,
    infills,
    setupFee,
    minPrint,
  ]);

  // Live evaluation for Idea Simulator
  const simIdeaEval = useMemo(() => {
    const preset = sizePresets.find((s) => s.id === simIdeaSize) ?? sizePresets[0] ?? { cm3: 28, name: "Desk" };
    const cx = complexities.find((c) => c.id === simIdeaComplexity) ?? complexities[0] ?? { fee: 799, name: "Photo" };
    const mat = materials.find((m) => m.id === simIdeaMaterial) ?? materials[0] ?? { rate: 8 };
    const qual = qualities.find((q) => q.id === simIdeaQuality) ?? qualities[0] ?? { mult: 1 };
    const inf = infills.find((i) => i.id === simIdeaInfill) ?? infills[0] ?? { mult: 1 };

    const vars: PricingVariables = {
      volume: preset.cm3,
      material_rate: mat.rate,
      quality_mult: qual.mult,
      infill_mult: inf.mult,
      setup_fee: setupFee,
      min_print: minPrint,
      qty: simIdeaQty,
      modeling_fee: cx.fee,
    };

    const res = evaluateFormula(ideaFormula, vars);
    return { ...res, vars, preset, cx, mat, qual, inf };
  }, [
    simIdeaSize,
    simIdeaComplexity,
    simIdeaMaterial,
    simIdeaQuality,
    simIdeaInfill,
    simIdeaQty,
    ideaFormula,
    sizePresets,
    complexities,
    materials,
    qualities,
    infills,
    setupFee,
    minPrint,
  ]);

  function insertVariable(ref: React.RefObject<HTMLTextAreaElement | null>, token: string, isIdea: boolean) {
    const el = ref.current;
    if (!el) {
      if (isIdea) setIdeaFormula((prev) => `${prev} ${token}`);
      else setUploadFormula((prev) => `${prev} ${token}`);
      return;
    }

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const currentText = isIdea ? ideaFormula : uploadFormula;
    const newText = currentText.substring(0, start) + token + currentText.substring(end);

    if (isIdea) {
      setIdeaFormula(newText);
    } else {
      setUploadFormula(newText);
    }

    // Restore focus and cursor position after insertion
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    }, 10);
  }

  function handleCopy(text: string) {
    void navigator.clipboard.writeText(text);
    setCopiedFormula(true);
    setTimeout(() => setCopiedFormula(false), 2000);
  }

  function getSerializedPricingData() {
    return {
      custom_pricing_upload_formula: uploadFormula.trim(),
      custom_pricing_idea_formula: ideaFormula.trim(),
      custom_pricing_setup_fee: String(setupFee),
      custom_pricing_min_print: String(minPrint),
      custom_pricing_materials: JSON.stringify(materials),
      custom_pricing_qualities: JSON.stringify(qualities),
      custom_pricing_infills: JSON.stringify(infills),
      custom_pricing_size_presets: JSON.stringify(sizePresets),
      custom_pricing_complexities: JSON.stringify(complexities),
    };
  }

  return (
    <section className="space-y-6 rounded-2xl border border-border bg-surface-2/40 p-5 md:p-7 shadow-sm">
      {/* Hidden inputs to automatically be serialized into the parent form submit */}
      <input type="hidden" name="custom_pricing_upload_formula" value={uploadFormula} />
      <input type="hidden" name="custom_pricing_idea_formula" value={ideaFormula} />
      <input type="hidden" name="custom_pricing_setup_fee" value={String(setupFee)} />
      <input type="hidden" name="custom_pricing_min_print" value={String(minPrint)} />
      <input type="hidden" name="custom_pricing_materials" value={JSON.stringify(materials)} />
      <input type="hidden" name="custom_pricing_qualities" value={JSON.stringify(qualities)} />
      <input type="hidden" name="custom_pricing_infills" value={JSON.stringify(infills)} />
      <input type="hidden" name="custom_pricing_size_presets" value={JSON.stringify(sizePresets)} />
      <input type="hidden" name="custom_pricing_complexities" value={JSON.stringify(complexities)} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-accent/20 text-accent font-semibold text-xs">
              <Calculator className="size-4" />
            </span>
            <h3 className="text-xl font-semibold text-fg">Custom Print Pricing & Formulas</h3>
          </div>
          <p className="mt-1 text-xs text-muted">
            View, customize, and simulate the exact formulas and parameters used to price custom 3D prints on{" "}
            <code className="rounded bg-surface px-1 py-0.5 text-accent font-mono text-[11px]">/custom</code>.
          </p>
        </div>

        {onQuickSave && (
          <button
            type="button"
            disabled={isSaving || !uploadValidation.valid || !ideaValidation.valid}
            onClick={() => onQuickSave(getSerializedPricingData())}
            className="self-start sm:self-auto rounded-lg bg-accent px-4 py-2 text-xs font-medium text-ink hover:opacity-90 transition-opacity disabled:opacity-50 shrink-0"
          >
            {isSaving ? "Saving Pricing..." : "Save Pricing Changes"}
          </button>
        )}
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-border/60 pb-3">
        <button
          type="button"
          onClick={() => setActiveSubTab("upload")}
          className={cn(
            "flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-medium transition-all",
            activeSubTab === "upload"
              ? "bg-accent text-ink shadow-sm"
              : "bg-surface text-muted hover:bg-surface-2 hover:text-fg",
          )}
        >
          <FileCode2 className="size-3.5" />
          <span>1. File Upload Formula</span>
          {!uploadValidation.valid && <AlertCircle className="size-3 text-danger" />}
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab("idea")}
          className={cn(
            "flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-medium transition-all",
            activeSubTab === "idea"
              ? "bg-accent text-ink shadow-sm"
              : "bg-surface text-muted hover:bg-surface-2 hover:text-fg",
          )}
        >
          <Sparkles className="size-3.5" />
          <span>2. Description Prints Formula</span>
          {!ideaValidation.valid && <AlertCircle className="size-3 text-danger" />}
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab("values")}
          className={cn(
            "flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-medium transition-all",
            activeSubTab === "values"
              ? "bg-accent text-ink shadow-sm"
              : "bg-surface text-muted hover:bg-surface-2 hover:text-fg",
          )}
        >
          <Sliders className="size-3.5" />
          <span>3. Rates & Multipliers</span>
        </button>
      </div>

      {/* TAB 1: FILE UPLOAD FORMULA */}
      {activeSubTab === "upload" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="rounded-xl border border-border bg-surface p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-semibold text-fg">File Upload Print Formula</h4>
                <p className="text-xs text-muted">
                  Used when customer uploads an STL/3MF model or uses the volume fallback selector.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {uploadValidation.valid ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-500">
                    <CheckCircle2 className="size-3" />
                    Valid Formula
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-2.5 py-1 text-[11px] font-medium text-rose-500">
                    <AlertCircle className="size-3" />
                    Syntax Error
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => setUploadFormula(DEFAULT_UPLOAD_FORMULA)}
                  className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface-2 px-2.5 py-1 text-xs text-muted hover:text-fg hover:bg-surface-2/80 transition-colors"
                  title="Reset to default formula"
                >
                  <RotateCcw className="size-3" />
                  Reset
                </button>
              </div>
            </div>

            {/* Formula Code Input */}
            <div className="relative">
              <textarea
                ref={uploadTextareaRef}
                value={uploadFormula}
                onChange={(e) => setUploadFormula(e.target.value)}
                rows={3}
                className={cn(
                  "w-full rounded-xl border bg-black/5 dark:bg-black/40 p-3.5 font-mono text-xs leading-relaxed focus:outline-none focus:ring-2",
                  uploadValidation.valid
                    ? "border-border focus:border-accent focus:ring-accent/20"
                    : "border-danger focus:border-danger focus:ring-danger/20",
                )}
                placeholder="Enter mathematical formula..."
              />
              <button
                type="button"
                onClick={() => handleCopy(uploadFormula)}
                className="absolute top-2.5 right-2.5 rounded-md border border-border/60 bg-surface/80 p-1.5 text-muted hover:text-fg transition-colors"
                title="Copy formula"
              >
                {copiedFormula ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
              </button>
            </div>

            {!uploadValidation.valid && (
              <p className="text-xs text-rose-500 flex items-center gap-1.5">
                <AlertCircle className="size-3.5 shrink-0" />
                <span>{uploadValidation.error}</span>
              </p>
            )}

            {/* Variable Tokens Helper Chips */}
            <div>
              <p className="text-xs font-medium text-muted mb-2">Click to insert variables into formula:</p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { name: "volume", label: "volume (cm³)" },
                  { name: "material_rate", label: "material_rate (₹/cm³)" },
                  { name: "quality_mult", label: "quality_mult" },
                  { name: "infill_mult", label: "infill_mult" },
                  { name: "setup_fee", label: "setup_fee (₹)" },
                  { name: "min_print", label: "min_print (₹)" },
                  { name: "qty", label: "qty" },
                ].map((v) => (
                  <button
                    key={v.name}
                    type="button"
                    onClick={() => insertVariable(uploadTextareaRef, v.name, false)}
                    className="inline-flex items-center rounded-lg border border-border bg-surface-2 px-2.5 py-1 font-mono text-[11px] text-accent hover:border-accent hover:bg-accent/10 transition-colors"
                  >
                    + {v.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-lg bg-surface-2/60 p-3 text-xs text-muted space-y-1">
              <p className="font-semibold text-fg">Default File Upload Formula:</p>
              <code className="block font-mono text-[11px] text-accent break-all">
                Math.max(min_print, Math.round(volume * material_rate * quality_mult * infill_mult + setup_fee)) * qty
              </code>
              <p className="pt-1 text-[11px]">
                Supports Math functions: <code className="font-mono">max()</code>,{" "}
                <code className="font-mono">min()</code>, <code className="font-mono">round()</code>,{" "}
                <code className="font-mono">floor()</code>, <code className="font-mono">ceil()</code>,{" "}
                <code className="font-mono">sqrt()</code>, <code className="font-mono">pow(a, b)</code>.
              </p>
            </div>
          </div>

          {/* INTERACTIVE LIVE SIMULATOR FOR FILE UPLOAD */}
          <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calculator className="size-4 text-accent" />
                <h4 className="text-sm font-semibold text-fg">Interactive Formula Simulator</h4>
              </div>
              <span className="text-[11px] font-mono text-accent">Live calculation preview</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Volume (cm³)</label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={simUploadVolume}
                  onChange={(e) => setSimUploadVolume(Math.max(0, Number(e.target.value)))}
                  className="w-full rounded-lg border border-border bg-surface p-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted mb-1">Material</label>
                <select
                  value={simUploadMaterial}
                  onChange={(e) => setSimUploadMaterial(e.target.value)}
                  className="w-full rounded-lg border border-border bg-surface p-2 text-xs"
                >
                  {materials.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} (₹{m.rate}/cm³)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted mb-1">Quality</label>
                <select
                  value={simUploadQuality}
                  onChange={(e) => setSimUploadQuality(e.target.value)}
                  className="w-full rounded-lg border border-border bg-surface p-2 text-xs"
                >
                  {qualities.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.name} ({q.mult}×)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted mb-1">Infill</label>
                <select
                  value={simUploadInfill}
                  onChange={(e) => setSimUploadInfill(e.target.value)}
                  className="w-full rounded-lg border border-border bg-surface p-2 text-xs"
                >
                  {infills.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} ({i.mult}×)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted mb-1">Quantity</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={simUploadQty}
                  onChange={(e) => setSimUploadQty(Math.max(1, Number(e.target.value)))}
                  className="w-full rounded-lg border border-border bg-surface p-2 text-xs"
                />
              </div>
            </div>

            {/* Live Result Box */}
            <div className="rounded-xl border border-border bg-surface p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs uppercase tracking-wider text-muted font-semibold">Simulated Total Price</span>
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl font-bold text-fg tabular-nums">
                    {simUploadEval.success ? formatINR(Math.round(simUploadEval.value)) : "Error"}
                  </span>
                  {simUploadEval.success && (
                    <span className="text-xs text-muted">
                      ({formatINR(Math.round(simUploadEval.value / simUploadQty))} per unit)
                    </span>
                  )}
                </div>
              </div>

              <div className="text-xs text-muted border-t md:border-t-0 md:border-l border-border pt-3 md:pt-0 md:pl-5 space-y-1 font-mono">
                <div>
                  <span className="text-fg font-semibold">Substituted Values:</span> volume: {simUploadVolume} cm³, rate: ₹
                  {simUploadEval.mat.rate}, quality: {simUploadEval.qual.mult}×, infill: {simUploadEval.inf.mult}×
                </div>
                <div>
                  setup_fee: ₹{setupFee}, min_print: ₹{minPrint}, qty: {simUploadQty}
                </div>
                {!simUploadEval.success && (
                  <div className="text-rose-500 font-sans font-semibold">Evaluation Error: {simUploadEval.error}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: IDEA / DESCRIPTION FORMULA */}
      {activeSubTab === "idea" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="rounded-xl border border-border bg-surface p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-semibold text-fg">Description-Based Custom Print Formula</h4>
                <p className="text-xs text-muted">
                  Used when customer describes their idea without a 3D model, choosing a size preset and modeling tier.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {ideaValidation.valid ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-500">
                    <CheckCircle2 className="size-3" />
                    Valid Formula
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-2.5 py-1 text-[11px] font-medium text-rose-500">
                    <AlertCircle className="size-3" />
                    Syntax Error
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => setIdeaFormula(DEFAULT_IDEA_FORMULA)}
                  className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface-2 px-2.5 py-1 text-xs text-muted hover:text-fg hover:bg-surface-2/80 transition-colors"
                  title="Reset to default formula"
                >
                  <RotateCcw className="size-3" />
                  Reset
                </button>
              </div>
            </div>

            {/* Formula Code Input */}
            <div className="relative">
              <textarea
                ref={ideaTextareaRef}
                value={ideaFormula}
                onChange={(e) => setIdeaFormula(e.target.value)}
                rows={3}
                className={cn(
                  "w-full rounded-xl border bg-black/5 dark:bg-black/40 p-3.5 font-mono text-xs leading-relaxed focus:outline-none focus:ring-2",
                  ideaValidation.valid
                    ? "border-border focus:border-accent focus:ring-accent/20"
                    : "border-danger focus:border-danger focus:ring-danger/20",
                )}
                placeholder="Enter mathematical formula..."
              />
              <button
                type="button"
                onClick={() => handleCopy(ideaFormula)}
                className="absolute top-2.5 right-2.5 rounded-md border border-border/60 bg-surface/80 p-1.5 text-muted hover:text-fg transition-colors"
                title="Copy formula"
              >
                {copiedFormula ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
              </button>
            </div>

            {!ideaValidation.valid && (
              <p className="text-xs text-rose-500 flex items-center gap-1.5">
                <AlertCircle className="size-3.5 shrink-0" />
                <span>{ideaValidation.error}</span>
              </p>
            )}

            {/* Variable Tokens Helper Chips */}
            <div>
              <p className="text-xs font-medium text-muted mb-2">Click to insert variables into formula:</p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { name: "volume", label: "volume (preset cm³)" },
                  { name: "material_rate", label: "material_rate (₹/cm³)" },
                  { name: "quality_mult", label: "quality_mult" },
                  { name: "infill_mult", label: "infill_mult" },
                  { name: "setup_fee", label: "setup_fee (₹)" },
                  { name: "min_print", label: "min_print (₹)" },
                  { name: "qty", label: "qty" },
                  { name: "modeling_fee", label: "modeling_fee (₹)" },
                ].map((v) => (
                  <button
                    key={v.name}
                    type="button"
                    onClick={() => insertVariable(ideaTextareaRef, v.name, true)}
                    className="inline-flex items-center rounded-lg border border-border bg-surface-2 px-2.5 py-1 font-mono text-[11px] text-accent hover:border-accent hover:bg-accent/10 transition-colors"
                  >
                    + {v.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-lg bg-surface-2/60 p-3 text-xs text-muted space-y-1">
              <p className="font-semibold text-fg">Default Description / Idea Formula:</p>
              <code className="block font-mono text-[11px] text-accent break-all">
                Math.max(min_print, Math.round(volume * material_rate * quality_mult * infill_mult + setup_fee)) * qty +
                modeling_fee
              </code>
              <p className="pt-1 text-[11px]">
                In this formula, <code className="font-mono text-accent">modeling_fee</code> is added once per custom
                piece design for the 3D modeler's labor.
              </p>
            </div>
          </div>

          {/* INTERACTIVE LIVE SIMULATOR FOR IDEA */}
          <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calculator className="size-4 text-accent" />
                <h4 className="text-sm font-semibold text-fg">Interactive Idea Simulator</h4>
              </div>
              <span className="text-[11px] font-mono text-accent">Live calculation preview</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Size Preset</label>
                <select
                  value={simIdeaSize}
                  onChange={(e) => setSimIdeaSize(e.target.value)}
                  className="w-full rounded-lg border border-border bg-surface p-2 text-xs"
                >
                  {sizePresets.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.cm3} cm³)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted mb-1">Modeling Tier</label>
                <select
                  value={simIdeaComplexity}
                  onChange={(e) => setSimIdeaComplexity(e.target.value)}
                  className="w-full rounded-lg border border-border bg-surface p-2 text-xs"
                >
                  {complexities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (+₹{c.fee})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted mb-1">Material</label>
                <select
                  value={simIdeaMaterial}
                  onChange={(e) => setSimIdeaMaterial(e.target.value)}
                  className="w-full rounded-lg border border-border bg-surface p-2 text-xs"
                >
                  {materials.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} (₹{m.rate}/cm³)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted mb-1">Quality</label>
                <select
                  value={simIdeaQuality}
                  onChange={(e) => setSimIdeaQuality(e.target.value)}
                  className="w-full rounded-lg border border-border bg-surface p-2 text-xs"
                >
                  {qualities.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.name} ({q.mult}×)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted mb-1">Infill</label>
                <select
                  value={simIdeaInfill}
                  onChange={(e) => setSimIdeaInfill(e.target.value)}
                  className="w-full rounded-lg border border-border bg-surface p-2 text-xs"
                >
                  {infills.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} ({i.mult}×)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted mb-1">Quantity</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={simIdeaQty}
                  onChange={(e) => setSimIdeaQty(Math.max(1, Number(e.target.value)))}
                  className="w-full rounded-lg border border-border bg-surface p-2 text-xs"
                />
              </div>
            </div>

            {/* Live Result Box */}
            <div className="rounded-xl border border-border bg-surface p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs uppercase tracking-wider text-muted font-semibold">Simulated Total Price</span>
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl font-bold text-fg tabular-nums">
                    {simIdeaEval.success ? formatINR(Math.round(simIdeaEval.value)) : "Error"}
                  </span>
                  {simIdeaEval.success && (
                    <span className="text-xs text-muted">
                      (Print: {formatINR(Math.max(0, Math.round(simIdeaEval.value - simIdeaEval.cx.fee)))} + Modeling:{" "}
                      {formatINR(simIdeaEval.cx.fee)})
                    </span>
                  )}
                </div>
              </div>

              <div className="text-xs text-muted border-t md:border-t-0 md:border-l border-border pt-3 md:pt-0 md:pl-5 space-y-1 font-mono">
                <div>
                  <span className="text-fg font-semibold">Substituted Values:</span> volume: {simIdeaEval.preset.cm3}{" "}
                  cm³ ({simIdeaEval.preset.name}), rate: ₹{simIdeaEval.mat.rate}
                </div>
                <div>
                  modeling_fee: ₹{simIdeaEval.cx.fee} ({simIdeaEval.cx.name}), setup: ₹{setupFee}, min: ₹{minPrint}
                </div>
                {!simIdeaEval.success && (
                  <div className="text-rose-500 font-sans font-semibold">Evaluation Error: {simIdeaEval.error}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: RATES & VALUES */}
      {activeSubTab === "values" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Base Setup & Min Print */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl border border-border bg-surface p-4 sm:p-5">
            <div>
              <label className="block text-sm font-medium mb-1 flex items-center gap-1.5">
                <span>Setup Fee (`setup_fee`)</span>
                <span className="text-xs text-muted font-normal">(₹)</span>
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={setupFee}
                onChange={(e) => setSetupFee(Math.max(0, Number(e.target.value)))}
                className="w-full rounded-lg border border-border bg-surface-2 p-2.5 text-sm font-semibold"
                placeholder="49"
              />
              <p className="text-xs text-muted mt-1">Base preparation and printer bed leveling cost added per print unit.</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 flex items-center gap-1.5">
                <span>Minimum Print Threshold (`min_print`)</span>
                <span className="text-xs text-muted font-normal">(₹)</span>
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={minPrint}
                onChange={(e) => setMinPrint(Math.max(0, Number(e.target.value)))}
                className="w-full rounded-lg border border-border bg-surface-2 p-2.5 text-sm font-semibold"
                placeholder="99"
              />
              <p className="text-xs text-muted mt-1">Minimum price floor for any 3D print quote.</p>
            </div>
          </div>

          {/* Materials Rates Table */}
          <div className="rounded-xl border border-border bg-surface p-4 sm:p-5 space-y-3">
            <div>
              <h4 className="text-sm font-semibold text-fg">Filament Material Rates (`material_rate`)</h4>
              <p className="text-xs text-muted">Price charged per cubic centimeter (cm³) of plastic volume.</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-muted">
                    <th className="pb-2 font-medium">Identifier</th>
                    <th className="pb-2 font-medium">Material Name</th>
                    <th className="pb-2 font-medium">Rate (₹ / cm³)</th>
                    <th className="pb-2 font-medium">Description / Customer Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {materials.map((m, idx) => (
                    <tr key={m.id}>
                      <td className="py-2.5 font-mono text-[11px] text-muted">{m.id}</td>
                      <td className="py-2.5 pr-2">
                        <input
                          type="text"
                          value={m.name}
                          onChange={(e) => {
                            const next = [...materials];
                            next[idx] = { ...m, name: e.target.value };
                            setMaterials(next);
                          }}
                          className="w-full rounded border border-border bg-surface-2 p-1.5 text-xs text-fg"
                        />
                      </td>
                      <td className="py-2.5 pr-2 w-28">
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          value={m.rate}
                          onChange={(e) => {
                            const next = [...materials];
                            next[idx] = { ...m, rate: Math.max(0, Number(e.target.value)) };
                            setMaterials(next);
                          }}
                          className="w-full rounded border border-border bg-surface-2 p-1.5 text-xs font-semibold tabular-nums text-fg"
                        />
                      </td>
                      <td className="py-2.5">
                        <input
                          type="text"
                          value={m.note || ""}
                          onChange={(e) => {
                            const next = [...materials];
                            next[idx] = { ...m, note: e.target.value };
                            setMaterials(next);
                          }}
                          className="w-full rounded border border-border bg-surface-2 p-1.5 text-xs text-muted"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Qualities Multipliers Table */}
          <div className="rounded-xl border border-border bg-surface p-4 sm:p-5 space-y-3">
            <div>
              <h4 className="text-sm font-semibold text-fg">Layer Height & Quality Multipliers (`quality_mult`)</h4>
              <p className="text-xs text-muted">Factor applied based on layer resolution and print duration.</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-muted">
                    <th className="pb-2 font-medium">Identifier</th>
                    <th className="pb-2 font-medium">Resolution Label</th>
                    <th className="pb-2 font-medium">Multiplier (×)</th>
                    <th className="pb-2 font-medium">Typical Days</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {qualities.map((q, idx) => (
                    <tr key={q.id}>
                      <td className="py-2.5 font-mono text-[11px] text-muted">{q.id}</td>
                      <td className="py-2.5 pr-2">
                        <input
                          type="text"
                          value={q.name}
                          onChange={(e) => {
                            const next = [...qualities];
                            next[idx] = { ...q, name: e.target.value };
                            setQualities(next);
                          }}
                          className="w-full rounded border border-border bg-surface-2 p-1.5 text-xs text-fg"
                        />
                      </td>
                      <td className="py-2.5 pr-2 w-28">
                        <input
                          type="number"
                          min="0"
                          step="0.05"
                          value={q.mult}
                          onChange={(e) => {
                            const next = [...qualities];
                            next[idx] = { ...q, mult: Math.max(0, Number(e.target.value)) };
                            setQualities(next);
                          }}
                          className="w-full rounded border border-border bg-surface-2 p-1.5 text-xs font-semibold tabular-nums text-fg"
                        />
                      </td>
                      <td className="py-2.5 w-36">
                        <input
                          type="text"
                          value={q.days}
                          onChange={(e) => {
                            const next = [...qualities];
                            next[idx] = { ...q, days: e.target.value };
                            setQualities(next);
                          }}
                          className="w-full rounded border border-border bg-surface-2 p-1.5 text-xs text-muted"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Infill Multipliers Table */}
          <div className="rounded-xl border border-border bg-surface p-4 sm:p-5 space-y-3">
            <div>
              <h4 className="text-sm font-semibold text-fg">Infill Density Multipliers (`infill_mult`)</h4>
              <p className="text-xs text-muted">Factor applied based on internal density percentage.</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-muted">
                    <th className="pb-2 font-medium">Identifier</th>
                    <th className="pb-2 font-medium">Infill Tier</th>
                    <th className="pb-2 font-medium">Multiplier (×)</th>
                    <th className="pb-2 font-medium">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {infills.map((i, idx) => (
                    <tr key={i.id}>
                      <td className="py-2.5 font-mono text-[11px] text-muted">{i.id}</td>
                      <td className="py-2.5 pr-2">
                        <input
                          type="text"
                          value={i.name}
                          onChange={(e) => {
                            const next = [...infills];
                            next[idx] = { ...i, name: e.target.value };
                            setInfills(next);
                          }}
                          className="w-full rounded border border-border bg-surface-2 p-1.5 text-xs text-fg"
                        />
                      </td>
                      <td className="py-2.5 pr-2 w-28">
                        <input
                          type="number"
                          min="0"
                          step="0.05"
                          value={i.mult}
                          onChange={(e) => {
                            const next = [...infills];
                            next[idx] = { ...i, mult: Math.max(0, Number(e.target.value)) };
                            setInfills(next);
                          }}
                          className="w-full rounded border border-border bg-surface-2 p-1.5 text-xs font-semibold tabular-nums text-fg"
                        />
                      </td>
                      <td className="py-2.5">
                        <input
                          type="text"
                          value={i.note || ""}
                          onChange={(e) => {
                            const next = [...infills];
                            next[idx] = { ...i, note: e.target.value };
                            setInfills(next);
                          }}
                          className="w-full rounded border border-border bg-surface-2 p-1.5 text-xs text-muted"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Size Presets Table */}
          <div className="rounded-xl border border-border bg-surface p-4 sm:p-5 space-y-3">
            <div>
              <h4 className="text-sm font-semibold text-fg">Size Presets (cm³ Volume)</h4>
              <p className="text-xs text-muted">
                Fallback volumes used when no STL is uploaded or when ordering by description.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-muted">
                    <th className="pb-2 font-medium">Identifier</th>
                    <th className="pb-2 font-medium">Preset Name</th>
                    <th className="pb-2 font-medium">Hint / Dimensions</th>
                    <th className="pb-2 font-medium">Volume (cm³)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {sizePresets.map((s, idx) => (
                    <tr key={s.id}>
                      <td className="py-2.5 font-mono text-[11px] text-muted">{s.id}</td>
                      <td className="py-2.5 pr-2">
                        <input
                          type="text"
                          value={s.name}
                          onChange={(e) => {
                            const next = [...sizePresets];
                            next[idx] = { ...s, name: e.target.value };
                            setSizePresets(next);
                          }}
                          className="w-full rounded border border-border bg-surface-2 p-1.5 text-xs text-fg"
                        />
                      </td>
                      <td className="py-2.5 pr-2">
                        <input
                          type="text"
                          value={s.hint}
                          onChange={(e) => {
                            const next = [...sizePresets];
                            next[idx] = { ...s, hint: e.target.value };
                            setSizePresets(next);
                          }}
                          className="w-full rounded border border-border bg-surface-2 p-1.5 text-xs text-muted"
                        />
                      </td>
                      <td className="py-2.5 w-28">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={s.cm3}
                          onChange={(e) => {
                            const next = [...sizePresets];
                            next[idx] = { ...s, cm3: Math.max(0, Number(e.target.value)) };
                            setSizePresets(next);
                          }}
                          className="w-full rounded border border-border bg-surface-2 p-1.5 text-xs font-semibold tabular-nums text-fg"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Modeling Complexity Tiers Table */}
          <div className="rounded-xl border border-border bg-surface p-4 sm:p-5 space-y-3">
            <div>
              <h4 className="text-sm font-semibold text-fg">Modeling Complexity Tiers (`modeling_fee`)</h4>
              <p className="text-xs text-muted">CAD design labor fees for description-based custom prints.</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-muted">
                    <th className="pb-2 font-medium">Identifier</th>
                    <th className="pb-2 font-medium">Tier Name</th>
                    <th className="pb-2 font-medium">Design Fee (₹)</th>
                    <th className="pb-2 font-medium">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {complexities.map((c, idx) => (
                    <tr key={c.id}>
                      <td className="py-2.5 font-mono text-[11px] text-muted">{c.id}</td>
                      <td className="py-2.5 pr-2">
                        <input
                          type="text"
                          value={c.name}
                          onChange={(e) => {
                            const next = [...complexities];
                            next[idx] = { ...c, name: e.target.value };
                            setComplexities(next);
                          }}
                          className="w-full rounded border border-border bg-surface-2 p-1.5 text-xs text-fg"
                        />
                      </td>
                      <td className="py-2.5 pr-2 w-28">
                        <input
                          type="number"
                          min="0"
                          step="50"
                          value={c.fee}
                          onChange={(e) => {
                            const next = [...complexities];
                            next[idx] = { ...c, fee: Math.max(0, Number(e.target.value)) };
                            setComplexities(next);
                          }}
                          className="w-full rounded border border-border bg-surface-2 p-1.5 text-xs font-semibold tabular-nums text-fg"
                        />
                      </td>
                      <td className="py-2.5">
                        <input
                          type="text"
                          value={c.note || ""}
                          onChange={(e) => {
                            const next = [...complexities];
                            next[idx] = { ...c, note: e.target.value };
                            setComplexities(next);
                          }}
                          className="w-full rounded border border-border bg-surface-2 p-1.5 text-xs text-muted"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
