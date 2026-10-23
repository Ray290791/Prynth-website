export interface VolumeTier {
  minQty: number;
  maxQty: number | null; // null means unbounded (e.g. 25+)
  discountPercent: number;
  label: string;
}

export const VOLUME_TIERS: VolumeTier[] = [
  { minQty: 1, maxQty: 4, discountPercent: 0, label: "1–4 units" },
  { minQty: 5, maxQty: 9, discountPercent: 10, label: "5–9 units" },
  { minQty: 10, maxQty: 24, discountPercent: 18, label: "10–24 units" },
  { minQty: 25, maxQty: null, discountPercent: 25, label: "25+ units" },
];

export function getVolumeDiscount(qty: number): {
  percent: number;
  label: string;
  nextTier?: { minQty: number; percent: number; needed: number };
} {
  const safeQty = Math.max(1, qty);
  const matched =
    [...VOLUME_TIERS].reverse().find((tier) => safeQty >= tier.minQty) ||
    VOLUME_TIERS[0];

  // Find next tier for upselling
  const nextTier = VOLUME_TIERS.find((tier) => tier.minQty > safeQty);

  return {
    percent: matched.discountPercent,
    label: matched.label,
    nextTier: nextTier
      ? {
          minQty: nextTier.minQty,
          percent: nextTier.discountPercent,
          needed: nextTier.minQty - safeQty,
        }
      : undefined,
  };
}

export function calculateDiscountedUnitPrice(basePrice: number, qty: number): number {
  const { percent } = getVolumeDiscount(qty);
  if (percent === 0) return basePrice;
  return Math.round(basePrice * (1 - percent / 100));
}

export function calculateVolumeSavings(basePrice: number, qty: number): number {
  const normalTotal = basePrice * qty;
  const discountedTotal = calculateDiscountedUnitPrice(basePrice, qty) * qty;
  return normalTotal - discountedTotal;
}
