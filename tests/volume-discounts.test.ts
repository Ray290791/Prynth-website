import { describe, it, expect } from "vitest";
import {
  getVolumeDiscount,
  calculateDiscountedUnitPrice,
  calculateVolumeSavings,
  VOLUME_TIERS,
} from "@/lib/volume-discounts";

describe("Volume Discounts Calculator (src/lib/volume-discounts.ts)", () => {
  it("defines standard progressive tiers accurately", () => {
    expect(VOLUME_TIERS).toHaveLength(4);
    expect(VOLUME_TIERS[0].discountPercent).toBe(0);
    expect(VOLUME_TIERS[1].discountPercent).toBe(10);
    expect(VOLUME_TIERS[2].discountPercent).toBe(18);
    expect(VOLUME_TIERS[3].discountPercent).toBe(25);
  });

  it("returns 0% discount for quantities 1 to 4 and suggests next tier at 5", () => {
    const single = getVolumeDiscount(1);
    expect(single.percent).toBe(0);
    expect(single.nextTier).toBeDefined();
    expect(single.nextTier?.minQty).toBe(5);
    expect(single.nextTier?.percent).toBe(10);
    expect(single.nextTier?.needed).toBe(4);

    const four = getVolumeDiscount(4);
    expect(four.percent).toBe(0);
    expect(four.nextTier?.needed).toBe(1);
  });

  it("returns 10% discount for quantities 5 to 9 and suggests next tier at 10", () => {
    const five = getVolumeDiscount(5);
    expect(five.percent).toBe(10);
    expect(five.nextTier?.minQty).toBe(10);
    expect(five.nextTier?.percent).toBe(18);
    expect(five.nextTier?.needed).toBe(5);

    const nine = getVolumeDiscount(9);
    expect(nine.percent).toBe(10);
    expect(nine.nextTier?.needed).toBe(1);
  });

  it("returns 18% discount for quantities 10 to 24 and suggests next tier at 25", () => {
    const ten = getVolumeDiscount(10);
    expect(ten.percent).toBe(18);
    expect(ten.nextTier?.minQty).toBe(25);
    expect(ten.nextTier?.percent).toBe(25);
    expect(ten.nextTier?.needed).toBe(15);

    const twentyFour = getVolumeDiscount(24);
    expect(twentyFour.percent).toBe(18);
    expect(twentyFour.nextTier?.needed).toBe(1);
  });

  it("returns maximum 25% discount for 25+ units with no further tier", () => {
    const twentyFive = getVolumeDiscount(25);
    expect(twentyFive.percent).toBe(25);
    expect(twentyFive.nextTier).toBeUndefined();

    const hundred = getVolumeDiscount(100);
    expect(hundred.percent).toBe(25);
    expect(hundred.nextTier).toBeUndefined();
  });

  it("safely handles 0 and negative inputs by clamping to 1 unit", () => {
    const zero = getVolumeDiscount(0);
    expect(zero.percent).toBe(0);
    expect(zero.nextTier?.needed).toBe(4);

    const negative = getVolumeDiscount(-5);
    expect(negative.percent).toBe(0);
  });

  it("calculates discounted unit price correctly", () => {
    const basePrice = 200;

    // 1 unit: 0% discount => 200
    expect(calculateDiscountedUnitPrice(basePrice, 1)).toBe(200);

    // 5 units: 10% discount => 180
    expect(calculateDiscountedUnitPrice(basePrice, 5)).toBe(180);

    // 10 units: 18% discount => 164
    expect(calculateDiscountedUnitPrice(basePrice, 10)).toBe(164);

    // 25 units: 25% discount => 150
    expect(calculateDiscountedUnitPrice(basePrice, 25)).toBe(150);
  });

  it("calculates total volume savings correctly", () => {
    const basePrice = 200;

    // 1 unit: savings = 0
    expect(calculateVolumeSavings(basePrice, 1)).toBe(0);

    // 5 units: normal = 1000, discounted = 180 * 5 = 900 => savings = 100
    expect(calculateVolumeSavings(basePrice, 5)).toBe(100);

    // 10 units: normal = 2000, discounted = 164 * 10 = 1640 => savings = 360
    expect(calculateVolumeSavings(basePrice, 10)).toBe(360);

    // 25 units: normal = 5000, discounted = 150 * 25 = 3750 => savings = 1250
    expect(calculateVolumeSavings(basePrice, 25)).toBe(1250);
  });
});
