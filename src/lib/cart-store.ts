import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CustomSpec = {
  path: "upload" | "idea";
  fileName?: string;
  fileSize?: number;
  material: string;
  quality: string;
  infill: string;
  color: string;
  notes?: string;
  volumeCm3?: number;
  modeling?: string;
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

export const FREE_SHIPPING_AT = 799;
export const STANDARD_SHIPPING = 49;
export const EXPRESS_SHIPPING = 129;
export const COD_FEE = 40;

export function shippingFee(
  subtotal: number,
  method: "standard" | "express",
) {
  if (method === "express") return EXPRESS_SHIPPING;
  if (subtotal >= FREE_SHIPPING_AT) return 0;
  return STANDARD_SHIPPING;
}
