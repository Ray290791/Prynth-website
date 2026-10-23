import { describe, it, expect } from "vitest";
import { evaluateFormula, type PricingVariables } from "../src/lib/formula-evaluator";

describe("Formula Evaluator", () => {
  it("evaluates basic arithmetic and operator precedence", () => {
    const res = evaluateFormula("10 + 20 * 2");
    expect(res.success).toBe(true);
    expect(res.value).toBe(50);
  });

  it("handles parentheses correctly", () => {
    const res = evaluateFormula("(10 + 20) * 2");
    expect(res.success).toBe(true);
    expect(res.value).toBe(60);
  });

  it("evaluates power operator", () => {
    const res = evaluateFormula("2 ^ 3 + 1");
    expect(res.success).toBe(true);
    expect(res.value).toBe(9);
  });

  it("evaluates pricing variables", () => {
    const vars: PricingVariables = {
      volume: 15,
      material_rate: 6.5,
      quality_mult: 1.2,
      infill_mult: 1.1,
      setup_fee: 50,
      min_print: 100,
      qty: 2,
      modeling_fee: 0,
    };

    const res = evaluateFormula(
      "max(min_print, (volume * material_rate * quality_mult * infill_mult + setup_fee)) * qty",
      vars
    );
    expect(res.success).toBe(true);
    // 15 * 6.5 = 97.5 * 1.2 = 117 * 1.1 = 128.7 + 50 = 178.7
    // max(100, 178.7) = 178.7 * 2 = 357.4
    expect(res.value).toBeCloseTo(357.4, 1);
  });

  it("supports built-in math functions: min, max, round, ceil, floor", () => {
    expect(evaluateFormula("max(10, 50, 25)").value).toBe(50);
    expect(evaluateFormula("min(10, 50, 25)").value).toBe(10);
    expect(evaluateFormula("round(4.6)").value).toBe(5);
    expect(evaluateFormula("ceil(4.1)").value).toBe(5);
    expect(evaluateFormula("floor(4.9)").value).toBe(4);
  });

  it("returns error on invalid syntax or mismatched parentheses", () => {
    const res = evaluateFormula("(10 + 20");
    expect(res.success).toBe(false);
    expect(res.error).toBeDefined();
  });

  it("handles division by zero gracefully", () => {
    const res = evaluateFormula("100 / 0");
    expect(res.success).toBe(false);
    expect(res.error).toContain("Division by zero");
  });
});
