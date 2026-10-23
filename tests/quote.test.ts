import { describe, it, expect } from "vitest";
import { computeQuote, getInfillMultFromPercentage, getPricingConfig } from "../src/lib/quote";
import { getBulkDiscount, type CartItem } from "../src/lib/cart-store";

describe("Quote & Infill Calculations", () => {
  it("computes continuous infill multipliers from percentage accurately", () => {
    expect(getInfillMultFromPercentage(5)).toBe(0.7);
    expect(getInfillMultFromPercentage(15)).toBe(0.85);
    expect(getInfillMultFromPercentage(20)).toBe(1.0);
    expect(getInfillMultFromPercentage(40)).toBe(1.3);
    expect(getInfillMultFromPercentage(100)).toBe(1.65);
  });

  it("calculates standard custom print quote correctly", () => {
    const quote = computeQuote({
      volumeCm3: 20,
      materialId: "pla",
      qualityId: "standard",
      infillPercentage: 20,
      qty: 1,
    });

    expect(quote.total).toBeGreaterThan(0);
    expect(quote.print).toBeGreaterThan(0);
    expect(quote.volumeCm3).toBe(20);
    expect(quote.days).toBeDefined();
  });

  it("scales total with quantity correctly", () => {
    const q1 = computeQuote({
      volumeCm3: 30,
      materialId: "pla",
      qualityId: "standard",
      infillPercentage: 20,
      qty: 1,
    });

    const q5 = computeQuote({
      volumeCm3: 30,
      materialId: "pla",
      qualityId: "standard",
      infillPercentage: 20,
      qty: 5,
    });

    // 5 units cost more than 1 unit, but setup fee is amortized per batch
    expect(q5.total).toBeGreaterThan(q1.total);
    expect(q5.total).toBeLessThan(q1.total * 5);
  });

  it("handles idea mode with modeling fee", () => {
    const quote = computeQuote(
      {
        volumeCm3: 15,
        materialId: "petg",
        qualityId: "fine",
        qty: 1,
        modelingFee: 250,
      },
      null,
      "idea"
    );

    expect(quote.modeling).toBe(250);
    expect(quote.total).toBeGreaterThan(250);
  });

  it("extracts and auto-heals pricing configuration from site settings", () => {
    const config = getPricingConfig({});
    expect(config.uploadFormula).toBeDefined();
    expect(config.ideaFormula).toBeDefined();
    expect(config.materials.length).toBeGreaterThan(0);
    expect(config.qualities.length).toBeGreaterThan(0);
  });
});

describe("Volume / Bulk Discounts", () => {
  function makeItem(qty: number): CartItem {
    return {
      kind: "product",
      id: "prod-1",
      name: "Desk Stand",
      price: 299,
      qty,
      productSlug: "desk-stand",
    };
  }

  it("returns 0% for fewer than 5 items", () => {
    const res = getBulkDiscount([makeItem(3)]);
    expect(res.percent).toBe(0);
    expect(res.nextTierAt).toBe(5);
    expect(res.remainingForNext).toBe(2);
  });

  it("applies 5% tier for 5-9 items", () => {
    const res = getBulkDiscount([makeItem(6)]);
    expect(res.percent).toBe(5);
    expect(res.tier).toContain("5+");
    expect(res.nextTierAt).toBe(10);
    expect(res.remainingForNext).toBe(4);
  });

  it("applies 10% tier for 10-19 items", () => {
    const res = getBulkDiscount([makeItem(12)]);
    expect(res.percent).toBe(10);
    expect(res.tier).toContain("10+");
    expect(res.nextTierAt).toBe(20);
    expect(res.remainingForNext).toBe(8);
  });

  it("applies 15% tier for 20+ items", () => {
    const res = getBulkDiscount([makeItem(25)]);
    expect(res.percent).toBe(15);
    expect(res.tier).toContain("20+");
    expect(res.nextTierAt).toBeNull();
    expect(res.remainingForNext).toBe(0);
  });
});
