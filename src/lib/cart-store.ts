import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CustomSpec = {
  path: "upload" | "idea";
  fileName?: string;
  fileSize?: number;
  fileId?: string;
  fileUrl?: string;
  printerId?: string;
  printerName?: string;
  printerModel?: string;
  material: string;
  materialId?: string;
  quality: string;
  qualityId?: string;
  infill: string;
  infillPercentage?: number;
  infillPattern?: string;
  wallLoops?: number;
  supports?: string;
  supportEnabled?: boolean;
  supportType?: string;
  supportThresholdAngle?: number;
  supportOnBuildPlateOnly?: boolean;
  supportBaseFilament?: string;
  supportInterfaceFilament?: string;
  surfaceFinish?: string;
  brim?: string;
  orientation?: string;
  preflightScore?: string;
  color: string;
  colorId?: string;
  colorHex?: string;
  dimensions?: string;
  dimensionsMm?: { x: number; y: number; z: number };
  notes?: string;
  volumeCm3?: number;
  solidVolumeCm3?: number;
  surfaceAreaMm2?: number;
  modeling?: string;
  idea?: string;
  email?: string;
  sizeId?: string;
  complexityId?: string;
  modelRotation?: [number, number, number];
  referencePhotos?: string[];
};

export type CartItem = {
  id: string;
  kind: "product" | "custom";
  productSlug?: string;
  name: string;
  image?: string;
  color: string;
  size?: string;
  material?: string;
  unitPrice: number;
  qty: number;
  custom?: CustomSpec;
};

type CartState = {
  items: CartItem[];
  add: (item: Omit<CartItem, "id"> & { id?: string }) => void;
  updateItem: (id: string, updated: Partial<CartItem>) => void;
  remove: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (item) => {
        const items = get().items;
        if (item.kind === "product" && item.productSlug) {
          const existing = items.find(
            (i) =>
              i.kind === "product" &&
              i.productSlug === item.productSlug &&
              i.color === item.color &&
              i.size === item.size,
          );
          if (existing) {
            set({
              items: items.map((i) =>
                i.id === existing.id ? { ...i, qty: i.qty + item.qty } : i,
              ),
            });
            return;
          }
        }
        const id =
          item.id ??
          `${item.kind}-${item.productSlug ?? "c"}-${item.color}-${Date.now()}`;
        set({ items: [...items, { ...item, id }] });
      },
      updateItem: (id, updated) => {
        set({
          items: get().items.map((i) =>
            i.id === id ? { ...i, ...updated, custom: { ...i.custom, ...updated.custom } as CustomSpec } : i,
          ),
        });
      },
      remove: (id) => set({ items: get().items.filter((i) => i.id !== id) }),
      setQty: (id, qty) => {
        if (qty < 1) {
          set({ items: get().items.filter((i) => i.id !== id) });
          return;
        }
        set({
          items: get().items.map((i) => (i.id === id ? { ...i, qty } : i)),
        });
      },
      clear: () => set({ items: [] }),
    }),
    { name: "prynth-cart" },
  ),
);

export function cartCount(items: CartItem[]) {
  return items.reduce((sum, i) => sum + i.qty, 0);
}

export function cartSubtotal(items: CartItem[]) {
  return items.reduce((sum, i) => sum + i.unitPrice * i.qty, 0);
}

export const FREE_SHIPPING_AT = 399;
export const STANDARD_SHIPPING = 79;
export const EXPRESS_SHIPPING = 189;
export const COD_FEE = 39;

export function isMaharashtraPincode(pincode?: string): boolean {
  if (!pincode) return false;
  const clean = pincode.replace(/\D/g, "");
  if (clean.length < 2) return false;
  const prefix = clean.slice(0, 2);
  return ["40", "41", "42", "43", "44"].includes(prefix);
}

export interface ShippingRates {
  freeThreshold?: number;
  standardFee?: number;
  expressFee?: number;
  codFee?: number;
  pincode?: string;
}

export function shippingFee(
  subtotal: number,
  method: "standard" | "express",
  rates?: ShippingRates,
) {
  const express = rates?.expressFee ?? EXPRESS_SHIPPING;
  const standard = rates?.standardFee ?? STANDARD_SHIPPING;
  const freeAt = rates?.freeThreshold ?? FREE_SHIPPING_AT;

  if (method === "express") return express;
  if (subtotal >= freeAt) return 0;
  return standard;
}

export function getBulkDiscount(items: CartItem[]) {
  const totalCount = cartCount(items);
  if (totalCount >= 20) {
    return { percent: 15, tier: "20+ units", discount: 0.15, count: totalCount, nextTierAt: null, remainingForNext: 0 };
  }
  if (totalCount >= 10) {
    return { percent: 10, tier: "10+ units", discount: 0.10, count: totalCount, nextTierAt: 20, remainingForNext: 20 - totalCount };
  }
  if (totalCount >= 5) {
    return { percent: 5, tier: "5+ units", discount: 0.05, count: totalCount, nextTierAt: 10, remainingForNext: 10 - totalCount };
  }
  return { percent: 0, tier: "", discount: 0, count: totalCount, nextTierAt: 5, remainingForNext: 5 - totalCount };
}

export function isNonCodItem(item: Partial<CartItem>): boolean {
  if (!item) return false;
  if (item.kind === "custom") return true;
  if (item.productSlug === "modular-pegboard") return true;
  const name = item.name?.toLowerCase() || "";
  if (name.includes("pegboard") || name.includes("lithophane") || name.includes("custom")) return true;
  if (item.custom && Object.keys(item.custom).length > 0) return true;
  return false;
}

export function hasNonCodItems(items?: CartItem[] | null): boolean {
  if (!items || !Array.isArray(items)) return false;
  return items.some(isNonCodItem);
}


