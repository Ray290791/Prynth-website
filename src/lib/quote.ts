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

export const QUALITIES = [
  {
    id: "draft",
    name: "Draft · 0.28 mm",
    mult: 0.85,
    days: "2–3 days",
    note: "Faster, layer lines more visible. Fine for jigs and hidden parts.",
  },
  {
    id: "standard",
    name: "Standard · 0.20 mm",
    mult: 1,
    days: "3–5 days",
    note: "The usual finish for most objects we ship.",
  },
  {
    id: "fine",
    name: "Fine · 0.12 mm",
    mult: 1.35,
    days: "5–7 days",
    note: "Smoother surfaces. Worth it for small details and display pieces.",
  },
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
] as const;

export const SIZE_PRESETS = [
  { id: "palm", name: "Palm", hint: "under 8 cm", cm3: 8 },
  { id: "desk", name: "Desk", hint: "8–15 cm", cm3: 28 },
  { id: "shelf", name: "Shelf", hint: "15–25 cm", cm3: 90 },
  { id: "large", name: "Large", hint: "25 cm+", cm3: 220 },
] as const;

export const COMPLEXITY = [
  {
    id: "file",
    name: "I already have a model",
    fee: 0,
    note: "You upload an STL or 3MF. We print it.",
  },
  {
    id: "photo",
    name: "Match a photo or sketch",
    fee: 799,
    note: "We model from your reference. Simple household objects.",
  },
  {
    id: "original",
    name: "Design from scratch",
    fee: 1499,
    note: "A conversation, then a model, then a print. For new ideas.",
  },
] as const;

export const DEFAULT_UPLOAD_FORMULA =
  "Math.max(min_print, Math.round(volume * material_rate * quality_mult * infill_mult + setup_fee)) * qty";

export const DEFAULT_IDEA_FORMULA =
  "Math.max(min_print, Math.round(volume * material_rate * quality_mult * infill_mult + setup_fee)) * qty + modeling_fee";

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
  infillId: string;
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
  const uploadFormula =
    settings?.custom_pricing_upload_formula?.trim() || DEFAULT_UPLOAD_FORMULA;
  const ideaFormula =
    settings?.custom_pricing_idea_formula?.trim() || DEFAULT_IDEA_FORMULA;

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
  const infills = safeJsonParse<InfillPricing[]>(
    settings?.custom_pricing_infills,
    INFILLS as unknown as InfillPricing[],
  );
  const sizePresets = safeJsonParse<SizePresetPricing[]>(
    settings?.custom_pricing_size_presets,
    SIZE_PRESETS as unknown as SizePresetPricing[],
  );
  const complexities = safeJsonParse<ComplexityPricing[]>(
    settings?.custom_pricing_complexities,
    COMPLEXITY as unknown as ComplexityPricing[],
  );

  return {
    uploadFormula,
    ideaFormula,
    setupFee: Math.max(0, setupFee),
    minPrint: Math.max(0, minPrint),
    materials: Array.isArray(materials) && materials.length > 0 ? materials : (MATERIALS as unknown as MaterialPricing[]),
    qualities: Array.isArray(qualities) && qualities.length > 0 ? qualities : (QUALITIES as unknown as QualityPricing[]),
    infills: Array.isArray(infills) && infills.length > 0 ? infills : (INFILLS as unknown as InfillPricing[]),
    sizePresets: Array.isArray(sizePresets) && sizePresets.length > 0 ? sizePresets : (SIZE_PRESETS as unknown as SizePresetPricing[]),
    complexities: Array.isArray(complexities) && complexities.length > 0 ? complexities : (COMPLEXITY as unknown as ComplexityPricing[]),
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
    config.qualities.find((q) => q.id === input.qualityId) ?? config.qualities[1];
  const infill =
    config.infills.find((i) => i.id === input.infillId) ?? config.infills[1];

  const qty = Math.max(1, Math.round(input.qty) || 1);
  const volume = Math.max(0, input.volumeCm3);
  const modeling = input.modelingFee ?? 0;

  // Determine pricing variables for evaluator
  const vars: PricingVariables = {
    volume,
    material_rate: material.rate,
    quality_mult: quality.mult,
    infill_mult: infill.mult,
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
    total = Math.round(evalResult.value);
    printUnit = isIdea ? Math.max(0, Math.round((total - modeling) / qty)) : Math.round(total / qty);
  } else {
    // Fallback standard calculation
    printUnit = Math.max(
      config.minPrint,
      Math.round(volume * material.rate * quality.mult * infill.mult + config.setupFee),
    );
    total = printUnit * qty + modeling;
  }

  return {
    print: printUnit * qty,
    modeling,
    setup: config.setupFee * qty,
    total,
    days: quality.days,
    volumeCm3: volume,
  };
}

export function volumeFromBoxMm(x: number, y: number, z: number, fill = 0.28) {
  if (![x, y, z].every((n) => n > 0)) return 0;
  return (x * y * z * fill) / 1000;
}
