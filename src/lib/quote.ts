import { evaluateFormula, type PricingVariables } from "./formula-evaluator";

export const MATERIALS = [
  {
    id: "pla",
    name: "PLA",
    rate: 8,
    note: "The everyday choice. Stiff, clean finish, fine for home and desk objects.",
  },
  {
    id: "petg",
    name: "PETG",
    rate: 11,
    note: "Tougher and a bit more heat-resistant. Good for hooks, kitchen tools, outdoor clips.",
  },
  {
    id: "tpu",
    name: "TPU (flexible)",
    rate: 15,
    note: "Rubbery and bendy. Phone bumpers, straps, grips.",
  },
] as const;

/**
 * Bambu Lab P1S Official 0.4mm Nozzle Layer Height Profiles
 */
export const QUALITIES = [
  {
    id: "extra_fine",
    name: "Extra Fine · 0.08 mm",
    mult: 1.55,
    days: "5–7 days",
    note: "Highest surface detail. Layer lines virtually invisible; ideal for miniatures, intricate art, and collector pieces.",
  },
  {
    id: "fine",
    name: "Fine · 0.12 mm",
    mult: 1.35,
    days: "4–6 days",
    note: "Smooth surface quality. Excellent for small details, figurines, desk accessories, and display pieces.",
  },
  {
    id: "optimal",
    name: "Optimal · 0.16 mm",
    mult: 1.15,
    days: "3–5 days",
    note: "Great balance of smooth exterior finish, high strength, and efficient print speed.",
  },
  {
    id: "standard",
    name: "Standard · 0.20 mm",
    mult: 1.0,
    days: "3–4 days",
    note: "The default everyday Bambu Studio profile for home, office, and functional objects.",
  },
  {
    id: "draft",
    name: "Draft · 0.24 mm",
    mult: 0.9,
    days: "2–3 days",
    note: "Faster print speed with solid structural strength. Layer lines slightly visible.",
  },
  {
    id: "extra_draft",
    name: "Extra Draft · 0.28 mm",
    mult: 0.8,
    days: "1–2 days",
    note: "Maximum speed. Ideal for large functional jigs, workshop tools, and structural brackets.",
  },
] as const;

export const INFILL_PATTERNS = [
  { id: "gyroid", name: "Gyroid", hint: "High strength in all directions, no cross-over vibration" },
  { id: "grid", name: "Grid", hint: "Fast traditional grid, everyday general strength" },
  { id: "honeycomb", name: "Honeycomb", hint: "High shear strength hexagon cells" },
  { id: "triangles", name: "Triangles", hint: "Rigid tetrahedral strength" },
  { id: "cubic", name: "Cubic", hint: "Balanced 3D interlocking cube structure" },
  { id: "concentric", name: "Concentric", hint: "Flexible rings, ideal for TPU & round pieces" },
] as const;

export const SUPPORT_TYPES = [
  { id: "none", name: "None", hint: "Clean overhangs up to 45° without supports" },
  { id: "tree", name: "Tree / Organic", hint: "Bambu slim tree branches, minimal contact scars" },
  { id: "standard", name: "Standard (Normal)", hint: "Traditional accordion support pillars" },
] as const;

export const SURFACE_FINISHES = [
  { id: "standard", name: "Standard Smooth", hint: "Standard clean layer finish" },
  { id: "fuzzy", name: "Fuzzy Skin", hint: "Bambu tactile textured matte grip on outer perimeters" },
  { id: "ironing", name: "Top Layer Ironing", hint: "Thermal nozzle smoothing over top flat surfaces" },
] as const;

export const BRIM_TYPES = [
  { id: "auto", name: "Auto / None", hint: "Standard bed contact" },
  { id: "outer", name: "Outer Brim (5 mm)", hint: "Added outer brim ring to eliminate corner lifting" },
] as const;

export const INFILLS = [
  {
    id: "light",
    name: "Light · 15%",
    mult: 0.85,
    note: "Decorative pieces and light holders.",
  },
  {
    id: "standard",
    name: "Standard · 20%",
    mult: 1,
    note: "Everyday strength. Our default.",
  },
  {
    id: "sturdy",
    name: "Sturdy · 40%",
    mult: 1.3,
    note: "Hooks, stands, anything that takes weight.",
  },
  {
    id: "solid",
    name: "Solid / Heavy Duty (70%–100%)",
    mult: 1.65,
    note: "Extreme strength, gears, motor mounts, structural brackets.",
  },
] as const;

export const SIZE_PRESETS = [
  { id: "palm", name: "Palm", hint: "under 8 cm", cm3: 8 },
  { id: "desk", name: "Desk", hint: "8–15 cm", cm3: 28 },
  { id: "shelf", name: "Shelf", hint: "15–25 cm", cm3: 90 },
  { id: "large", name: "Large", hint: "20–25 cm (Max Single Print)", cm3: 220 },
] as const;

export const COMPLEXITY = [
  {
    id: "file",
    name: "I already have a model",
    fee: 0,
    note: "You upload an STL or 3MF. We print it.",
  },
  {
    id: "basic",
    name: "Basic / Small Fix (under 30 mins)",
    fee: 349,
    note: "Simple hooks, flat brackets, basic dimensional shapes.",
  },
  {
    id: "photo",
    name: "Photo / Sketch Reference (Standard)",
    fee: 699,
    note: "Enclosures, contoured parts, multi-feature parts.",
  },
  {
    id: "original",
    name: "Complex Mechanism / From Scratch",
    fee: 1299,
    note: "Assemblies, snap-fits, threaded parts, custom functional mechanisms.",
  },
] as const;

export const DEFAULT_UPLOAD_FORMULA =
  "Math.max(min_print, Math.round(volume * material_rate * quality_mult * infill_mult) * qty + setup_fee)";

export const DEFAULT_IDEA_FORMULA =
  "Math.max(min_print, Math.round(volume * material_rate * quality_mult * infill_mult) * qty + setup_fee) + modeling_fee";

export const DEFAULT_SETUP_FEE = 49;
export const DEFAULT_MIN_PRINT = 99;

export type MaterialPricing = {
  id: string;
  name: string;
  rate: number;
  note?: string;
};

export type QualityPricing = {
  id: string;
  name: string;
  mult: number;
  days: string;
  note?: string;
};

export type InfillPricing = {
  id: string;
  name: string;
  mult: number;
  note?: string;
};

export type SizePresetPricing = {
  id: string;
  name: string;
  hint: string;
  cm3: number;
};

export type ComplexityPricing = {
  id: string;
  name: string;
  fee: number;
  note?: string;
};

export type CustomPricingConfig = {
  uploadFormula: string;
  ideaFormula: string;
  setupFee: number;
  minPrint: number;
  materials: MaterialPricing[];
  qualities: QualityPricing[];
  infills: InfillPricing[];
  sizePresets: SizePresetPricing[];
  complexities: ComplexityPricing[];
};

export type QuoteInput = {
  volumeCm3: number;
  materialId: string;
  qualityId: string;
  infillId?: string;
  infillPercentage?: number;
  infillPattern?: string;
  wallLoops?: number;
  supports?: string;
  surfaceFinish?: string;
  brim?: string;
  qty: number;
  modelingFee?: number;
};

export type Quote = {
  print: number;
  modeling: number;
  setup: number;
  total: number;
  days: string;
  volumeCm3: number;
};

/**
 * Calculates a continuous infill multiplier from percentage (5% to 100%).
 * Matches standard reference:
 * - 5% -> 0.70
 * - 15% -> 0.85 (Light)
 * - 20% -> 1.00 (Standard default)
 * - 40% -> 1.30 (Sturdy)
 * - 70% -> 1.48
 * - 100% -> 1.65 (Solid / Heavy Duty)
 */
export function getInfillMultFromPercentage(pct: number): number {
  const p = Math.max(5, Math.min(100, Math.round(pct)));
  if (p <= 20) {
    if (p <= 15) {
      return Number((0.7 + ((p - 5) / 10) * 0.15).toFixed(2));
    }
    return Number((0.85 + ((p - 15) / 5) * 0.15).toFixed(2));
  } else if (p <= 40) {
    return Number((1.0 + ((p - 20) / 20) * 0.3).toFixed(2));
  } else {
    return Number((1.3 + ((p - 40) / 60) * 0.35).toFixed(2));
  }
}

function safeJsonParse<T>(val: any, fallback: T): T {
  if (!val) return fallback;
  if (typeof val !== "string") return val as T;
  try {
    const parsed = JSON.parse(val);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

/**
 * Extracts normalized custom pricing configuration from site settings.
 */
export function getPricingConfig(settings?: Record<string, any> | null): CustomPricingConfig {
  let uploadFormula =
    settings?.custom_pricing_upload_formula?.trim() || DEFAULT_UPLOAD_FORMULA;
  let ideaFormula =
    settings?.custom_pricing_idea_formula?.trim() || DEFAULT_IDEA_FORMULA;

  // Auto-heal outdated / buggy formulas if stored in DB from older versions:
  // 1. Bug B: Upload formula wrapping setup_fee inside rounded block before * qty
  if (
    uploadFormula.includes("setup_fee)) * qty") ||
    uploadFormula === "Math.max(min_print, Math.round(volume * material_rate * quality_mult * infill_mult + setup_fee)) * qty"
  ) {
    uploadFormula = DEFAULT_UPLOAD_FORMULA;
  }

  // 2. Bug A: Idea formula missing modeling_fee or having setup_fee inside qty
  if (!ideaFormula.includes("modeling_fee")) {
    ideaFormula = `${ideaFormula} + modeling_fee`;
  }
  if (
    ideaFormula.includes("setup_fee)) * qty") ||
    ideaFormula === "Math.max(min_print, Math.round(volume * material_rate * quality_mult * infill_mult + setup_fee)) * qty + modeling_fee" ||
    ideaFormula === "Math.max(min_print, Math.round(volume * material_rate * quality_mult * infill_mult) * qty + setup_fee)"
  ) {
    ideaFormula = DEFAULT_IDEA_FORMULA;
  }

  const setupFee = Number(settings?.custom_pricing_setup_fee) || DEFAULT_SETUP_FEE;
  const minPrint = Number(settings?.custom_pricing_min_print) || DEFAULT_MIN_PRINT;

  const materials = safeJsonParse<MaterialPricing[]>(
    settings?.custom_pricing_materials,
    MATERIALS as unknown as MaterialPricing[],
  );
  const qualities = safeJsonParse<QualityPricing[]>(
    settings?.custom_pricing_qualities,
    QUALITIES as unknown as QualityPricing[],
  );

  let infills = safeJsonParse<InfillPricing[]>(
    settings?.custom_pricing_infills,
    INFILLS as unknown as InfillPricing[],
  );
  if (Array.isArray(infills) && infills.length > 0) {
    if (!infills.some((i) => i.id === "solid")) {
      infills = [
        ...infills,
        {
          id: "solid",
          name: "Solid / Heavy Duty (70%–100%)",
          mult: 1.65,
          note: "Extreme strength, gears, motor mounts, structural brackets.",
        },
      ];
    }
  } else {
    infills = INFILLS as unknown as InfillPricing[];
  }

  let sizePresets = safeJsonParse<SizePresetPricing[]>(
    settings?.custom_pricing_size_presets,
    SIZE_PRESETS as unknown as SizePresetPricing[],
  );
  if (Array.isArray(sizePresets) && sizePresets.length > 0) {
    sizePresets = sizePresets.map((sp) => {
      if (sp.id === "large" && (sp.hint === "25 cm+" || !sp.hint.includes("Max Single Print"))) {
        return { ...sp, hint: "20–25 cm (Max Single Print)" };
      }
      return sp;
    });
  } else {
    sizePresets = SIZE_PRESETS as unknown as SizePresetPricing[];
  }

  let complexities = safeJsonParse<ComplexityPricing[]>(
    settings?.custom_pricing_complexities,
    COMPLEXITY as unknown as ComplexityPricing[],
  );
  if (Array.isArray(complexities) && complexities.length > 0) {
    // If basic tier is missing or old fees are present, sync with updated COMPLEXITY definitions
    if (!complexities.some((c) => c.id === "basic") || complexities.some((c) => c.id === "photo" && c.fee === 799)) {
      complexities = COMPLEXITY as unknown as ComplexityPricing[];
    }
  } else {
    complexities = COMPLEXITY as unknown as ComplexityPricing[];
  }

  return {
    uploadFormula,
    ideaFormula,
    setupFee: Math.max(0, setupFee),
    minPrint: Math.max(0, minPrint),
    materials: Array.isArray(materials) && materials.length > 0 ? materials : (MATERIALS as unknown as MaterialPricing[]),
    qualities: Array.isArray(qualities) && qualities.length > 0 ? qualities : (QUALITIES as unknown as QualityPricing[]),
    infills,
    sizePresets,
    complexities,
  };
}

export function computeQuote(
  input: QuoteInput,
  settingsOrConfig?: Record<string, any> | CustomPricingConfig | null,
  mode: "upload" | "idea" = "upload",
): Quote {
  const config =
    settingsOrConfig && "uploadFormula" in settingsOrConfig
      ? (settingsOrConfig as CustomPricingConfig)
      : getPricingConfig(settingsOrConfig);

  const material =
    config.materials.find((m) => m.id === input.materialId) ?? config.materials[0];
  const quality =
    config.qualities.find((q) => q.id === input.qualityId) ??
    config.qualities.find((q) => q.id === "standard") ??
    config.qualities[0];

  const infillMult =
    typeof input.infillPercentage === "number"
      ? getInfillMultFromPercentage(input.infillPercentage)
      : (config.infills.find((i) => i.id === input.infillId)?.mult ?? 1.0);

  const qty = Math.max(1, Math.round(input.qty) || 1);
  const volume = Math.max(0, input.volumeCm3);
  const modeling = input.modelingFee ?? 0;

  // Bambu Slicer fine adjustments
  let slicerExtraPerUnit = 0;
  if (input.wallLoops && input.wallLoops > 2) {
    // Each additional wall loop above 2 adds slight material
    slicerExtraPerUnit += (input.wallLoops - 2) * 5;
  }
  if (input.supports === "tree" || input.supports === "standard") {
    // Support material usage
    slicerExtraPerUnit += Math.round(volume * 0.35);
  }
  if (input.surfaceFinish === "ironing") {
    // Ironing surface pass
    slicerExtraPerUnit += 29;
  }

  // Determine pricing variables for evaluator
  const vars: PricingVariables = {
    volume,
    material_rate: material.rate,
    quality_mult: quality.mult,
    infill_mult: infillMult,
    setup_fee: config.setupFee,
    min_print: config.minPrint,
    qty,
    modeling_fee: modeling,
  };

  const isIdea = mode === "idea" || modeling > 0;
  const activeFormula = isIdea ? config.ideaFormula : config.uploadFormula;

  const evalResult = evaluateFormula(activeFormula, vars);

  let total: number;
  let printUnit: number;

  if (evalResult.success && evalResult.value >= 0) {
    total = Math.round(evalResult.value) + slicerExtraPerUnit * qty;
    printUnit = isIdea ? Math.max(0, Math.round((total - modeling) / qty)) : Math.round(total / qty);
  } else {
    // Fallback standard calculation: setup fee is one-time per batch, not multiplied per unit
    const batchPrintCost =
      Math.max(
        config.minPrint,
        Math.round(volume * material.rate * quality.mult * infillMult) * qty + config.setupFee,
      ) + slicerExtraPerUnit * qty;
    total = batchPrintCost + modeling;
    printUnit = Math.round(batchPrintCost / qty);
  }

  return {
    print: printUnit * qty,
    modeling,
    setup: config.setupFee,
    total,
    days: quality.days,
    volumeCm3: volume,
  };
}

export function volumeFromBoxMm(x: number, y: number, z: number, fill = 0.28) {
  if (![x, y, z].every((n) => n > 0)) return 0;
  return (x * y * z * fill) / 1000;
}
