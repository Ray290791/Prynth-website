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

const SETUP = 49;
const MIN_PRINT = 99;

export function computeQuote(input: QuoteInput): Quote {
  const material = MATERIALS.find((m) => m.id === input.materialId) ?? MATERIALS[0];
  const quality = QUALITIES.find((q) => q.id === input.qualityId) ?? QUALITIES[1];
  const infill = INFILLS.find((i) => i.id === input.infillId) ?? INFILLS[1];
  const qty = Math.max(1, Math.round(input.qty) || 1);
  const volume = Math.max(0, input.volumeCm3);
  const printUnit = Math.max(
    MIN_PRINT,
    Math.round(volume * material.rate * quality.mult * infill.mult + SETUP),
  );
  const modeling = input.modelingFee ?? 0;
  return {
    print: printUnit * qty,
    modeling,
    setup: SETUP * qty,
    total: printUnit * qty + modeling,
    days: quality.days,
    volumeCm3: volume,
  };
}

export function volumeFromBoxMm(x: number, y: number, z: number, fill = 0.28) {
  if (![x, y, z].every((n) => n > 0)) return 0;
  return (x * y * z * fill) / 1000;
}
