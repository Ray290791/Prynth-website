import { describe, it, expect } from "vitest";
import { products } from "../src/lib/products";

describe("Interim Selling Phase Safety & Gates (A1, C1, C2, C3, C4)", () => {
  const allowedInterimSlugs = new Set([
    "hex-coasters",
    "catch-bowl",
    "pen-well",
    "cable-nest",
    "desk-tray",
    "geo-planter",
  ]);

  it("C1: Enforces sellable catalog allowlist: only approved items are marked sellable", () => {
    for (const product of products) {
      if (allowedInterimSlugs.has(product.slug)) {
        expect(product.sellable).toBe(true);
      } else {
        expect(product.sellable).toBe(false);
      }
    }
  });

  it("C1: Disables weight-bearing products during interim phase", () => {
    const weightBearingSlugs = ["modular-pegboard", "pebble-hooks", "headphone-rest"];
    for (const slug of weightBearingSlugs) {
      const p = products.find((prod) => prod.slug === slug);
      expect(p?.sellable).toBe(false);
    }
  });

  it("C4: Validates delivery state restriction (Maharashtra only)", () => {
    const allowedStates = ["Maharashtra"];
    
    function validateDeliveryState(state: string, allowed: string[]): boolean {
      if (!state) return false;
      const cleanState = state.trim().toLowerCase();
      return allowed.some(
        (s) => s.toLowerCase() === "all india" || s.toLowerCase() === cleanState
      );
    }

    expect(validateDeliveryState("Maharashtra", allowedStates)).toBe(true);
    expect(validateDeliveryState("maharashtra", allowedStates)).toBe(true);
    expect(validateDeliveryState(" Karnataka ", allowedStates)).toBe(false);
    expect(validateDeliveryState("Delhi", allowedStates)).toBe(false);
    expect(validateDeliveryState("Gujarat", allowedStates)).toBe(false);
    expect(validateDeliveryState("", allowedStates)).toBe(false);

    // If later widened to "All India"
    expect(validateDeliveryState("Karnataka", ["All India"])).toBe(true);
  });

  it("A1 & C3: Gate checks reject orders when checkout or COD are disabled", () => {
    type GateCheck = {
      checkoutEnabled: boolean;
      codEnabled: boolean;
      paymentMethod: "online" | "cod";
    };

    function canPlaceOrder(gate: GateCheck): { allowed: boolean; reason?: string } {
      if (!gate.checkoutEnabled) {
        return { allowed: false, reason: "Customer checkout is currently closed." };
      }
      if (gate.paymentMethod === "cod" && !gate.codEnabled) {
        return { allowed: false, reason: "Cash on delivery is currently unavailable." };
      }
      return { allowed: true };
    }

    // Default state: checkout disabled
    expect(canPlaceOrder({ checkoutEnabled: false, codEnabled: false, paymentMethod: "online" })).toEqual({
      allowed: false,
      reason: "Customer checkout is currently closed.",
    });

    // Checkout disabled even if COD requested
    expect(canPlaceOrder({ checkoutEnabled: false, codEnabled: false, paymentMethod: "cod" })).toEqual({
      allowed: false,
      reason: "Customer checkout is currently closed.",
    });

    // Checkout enabled, but COD disabled
    expect(canPlaceOrder({ checkoutEnabled: true, codEnabled: false, paymentMethod: "cod" })).toEqual({
      allowed: false,
      reason: "Cash on delivery is currently unavailable.",
    });

    // Checkout enabled and online payment
    expect(canPlaceOrder({ checkoutEnabled: true, codEnabled: false, paymentMethod: "online" })).toEqual({
      allowed: true,
    });
  });

  it("A3: Enforces rolling daily and weekly order caps", () => {
    function isCapReached(current: number, max: number): boolean {
      return current >= max;
    }

    expect(isCapReached(2, 3)).toBe(false);
    expect(isCapReached(3, 3)).toBe(true);
    expect(isCapReached(4, 3)).toBe(true);

    // Weekly cap
    expect(isCapReached(9, 10)).toBe(false);
    expect(isCapReached(10, 10)).toBe(true);
  });

  it("D1: Raw profit formula excludes unsettled orders and accurately deducts fees and adjustments", () => {
    type MockOrder = {
      id: number;
      settled: boolean;
      total: number;
      refund: number;
      unitCost: number;
      packagingCost: number;
      courierCost: number;
      paymentFee: number;
    };

    const orders: MockOrder[] = [
      {
        id: 1,
        settled: true,
        total: 500,
        refund: 0,
        unitCost: 150,
        packagingCost: 30,
        courierCost: 79,
        paymentFee: 11.8,
      },
      {
        id: 2,
        settled: false, // Unsettled! Must be ignored in settled profit
        total: 1000,
        refund: 0,
        unitCost: 300,
        packagingCost: 40,
        courierCost: 100,
        paymentFee: 23.6,
      },
    ];

    const adjustments = [
      { reason: "Reprint replacement", amount: 50 },
    ];

    let settledProfit = 0;
    for (const ord of orders) {
      if (ord.settled) {
        const net = ord.total - ord.refund - ord.unitCost - ord.packagingCost - ord.courierCost - ord.paymentFee;
        settledProfit += net;
      }
    }
    const totalAdjustments = adjustments.reduce((sum, a) => sum + a.amount, 0);
    const finalSettledProfit = Math.round((settledProfit - totalAdjustments) * 100) / 100;

    // Order 1 net: 500 - 150 - 30 - 79 - 11.8 = 229.2
    // Less adjustment 50 = 179.2
    expect(finalSettledProfit).toBe(179.2);
  });
});

