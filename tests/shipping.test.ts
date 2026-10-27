import { describe, it, expect } from "vitest";
import {
  shippingFee,
  FREE_SHIPPING_AT,
  STANDARD_SHIPPING,
  EXPRESS_SHIPPING,
  isNonCodItem,
  hasNonCodItems,
  type CartItem,
} from "../src/lib/cart-store";

describe("Shipping & Delivery Rules (S1, S2, S4)", () => {
  const customRates = {
    freeThreshold: 349,
    standardFee: 79,
    expressFee: 189,
    codFee: 30,
  };

  it("charges standard shipping when subtotal is below the free threshold", () => {
    expect(shippingFee(100, "standard", customRates)).toBe(79);
    expect(shippingFee(348, "standard", customRates)).toBe(79);
  });

  it("applies free shipping strictly to standard delivery above the threshold", () => {
    expect(shippingFee(349, "standard", customRates)).toBe(0);
    expect(shippingFee(799, "standard", customRates)).toBe(0);
    expect(shippingFee(2500, "standard", customRates)).toBe(0);
  });

  it("S4: Express is never free, regardless of order amount", () => {
    // Under threshold
    expect(shippingFee(100, "express", customRates)).toBe(189);
    // At threshold
    expect(shippingFee(349, "express", customRates)).toBe(189);
    // Well above threshold
    expect(shippingFee(799, "express", customRates)).toBe(189);
    expect(shippingFee(1999, "express", customRates)).toBe(189);
    expect(shippingFee(10000, "express", customRates)).toBe(189);
  });

  it("falls back cleanly to default rates when custom rates are omitted", () => {
    expect(shippingFee(100, "standard")).toBe(STANDARD_SHIPPING);
    expect(shippingFee(500, "standard")).toBe(0);
    expect(shippingFee(500, "express")).toBe(EXPRESS_SHIPPING);
  });

  it("S2: correctly identifies made-to-order items that restrict Cash on Delivery", () => {
    const catalogItem: CartItem = {
      id: "cat-1",
      name: "Desk Pen Pot",
      price: 299,
      unitPrice: 299,
      color: "galaxy-black",
      qty: 1,
      kind: "product",
      productSlug: "desk-pen-pot",
    };
    expect(isNonCodItem(catalogItem)).toBe(false);

    const customPrint: CartItem = {
      id: "c-1",
      name: "Custom Bracket",
      price: 450,
      unitPrice: 450,
      color: "charcoal",
      qty: 1,
      kind: "custom",
      custom: { fileName: "bracket.stl", volumeCm3: 12 },
    };
    expect(isNonCodItem(customPrint)).toBe(true);

    const lithophane: CartItem = {
      id: "litho-1",
      name: "Sunlit Keepsake Lithophane",
      price: 699,
      unitPrice: 699,
      color: "warm-white",
      qty: 1,
      kind: "custom",
    };
    expect(isNonCodItem(lithophane)).toBe(true);

    const pegboard: CartItem = {
      id: "peg-1",
      name: "Modular Pegboard Studio Kit",
      price: 899,
      unitPrice: 899,
      color: "galaxy-black",
      qty: 1,
      kind: "product",
      productSlug: "modular-pegboard",
    };
    expect(isNonCodItem(pegboard)).toBe(true);

    expect(hasNonCodItems([catalogItem])).toBe(false);
    expect(hasNonCodItems([catalogItem, customPrint])).toBe(true);
    expect(hasNonCodItems([lithophane])).toBe(true);
  });
});
