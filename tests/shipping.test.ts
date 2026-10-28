import { describe, it, expect } from "vitest";
import {
  shippingFee,
  FREE_SHIPPING_AT,
  STANDARD_SHIPPING,
  EXPRESS_SHIPPING,
  COD_FEE,
  isMaharashtraPincode,
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
    expect(shippingFee(398, "standard")).toBe(STANDARD_SHIPPING);
    expect(shippingFee(399, "standard")).toBe(0);
    expect(shippingFee(500, "standard")).toBe(0);
    expect(shippingFee(500, "express")).toBe(EXPRESS_SHIPPING);
  });

  it("S3 & S6: default constants match owner approval (₹399 free threshold, ₹39 COD fee)", () => {
    expect(FREE_SHIPPING_AT).toBe(399);
    expect(COD_FEE).toBe(39);
    expect(STANDARD_SHIPPING).toBe(79);
    expect(EXPRESS_SHIPPING).toBe(189);
  });

  it("S5: correctly classifies Maharashtra pincodes (40-44 prefix)", () => {
    expect(isMaharashtraPincode("400001")).toBe(true); // Mumbai
    expect(isMaharashtraPincode("411001")).toBe(true); // Pune
    expect(isMaharashtraPincode("422001")).toBe(true); // Nashik
    expect(isMaharashtraPincode("431001")).toBe(true); // Aurangabad / Chhatrapati Sambhajinagar
    expect(isMaharashtraPincode("440001")).toBe(true); // Nagpur
    expect(isMaharashtraPincode("400 050")).toBe(true); // Space formatted

    expect(isMaharashtraPincode("560001")).toBe(false); // Bengaluru
    expect(isMaharashtraPincode("110001")).toBe(false); // New Delhi
    expect(isMaharashtraPincode("600001")).toBe(false); // Chennai
    expect(isMaharashtraPincode("700001")).toBe(false); // Kolkata
    expect(isMaharashtraPincode("")).toBe(false);
    expect(isMaharashtraPincode(undefined)).toBe(false);
  });

  it("charges single standard delivery fee from site settings below threshold and free above", () => {
    // Uses default standard fee (79)
    expect(shippingFee(250, "standard")).toBe(79);
    expect(shippingFee(399, "standard")).toBe(0);

    // Uses dynamic fee from site settings (e.g. 89)
    const dynamicRates = { standardFee: 89, freeThreshold: 399 };
    expect(shippingFee(250, "standard", dynamicRates)).toBe(89);
    expect(shippingFee(399, "standard", dynamicRates)).toBe(0);
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
