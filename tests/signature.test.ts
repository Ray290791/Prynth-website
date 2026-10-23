import { describe, it, expect, beforeAll, afterAll } from "vitest";
import crypto from "crypto";
import {
  timingSafeEqualString,
  verifyRazorpaySignature,
  verifyRazorpayWebhookSignature,
} from "../src/lib/razorpay.server";

const TEST_SECRET = "test_secret_for_razorpay_mocking_12345";
const TEST_WEBHOOK_SECRET = "test_webhook_secret_for_razorpay_mocking_67890";

describe("Razorpay Signature Verification & Constant-Time Security", () => {
  const originalKeySecret = process.env.RAZORPAY_KEY_SECRET;
  const originalWebhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  beforeAll(() => {
    process.env.RAZORPAY_KEY_SECRET = TEST_SECRET;
    process.env.RAZORPAY_WEBHOOK_SECRET = TEST_WEBHOOK_SECRET;
  });

  afterAll(() => {
    if (originalKeySecret !== undefined) {
      process.env.RAZORPAY_KEY_SECRET = originalKeySecret;
    } else {
      delete process.env.RAZORPAY_KEY_SECRET;
    }
    if (originalWebhookSecret !== undefined) {
      process.env.RAZORPAY_WEBHOOK_SECRET = originalWebhookSecret;
    } else {
      delete process.env.RAZORPAY_WEBHOOK_SECRET;
    }
  });

  it("timingSafeEqualString returns true for identical strings", () => {
    expect(timingSafeEqualString("hello world", "hello world")).toBe(true);
    expect(
      timingSafeEqualString(
        "4a5b6c7d8e9f0123456789abcdef0123456789abcdef0123456789abcdef0123",
        "4a5b6c7d8e9f0123456789abcdef0123456789abcdef0123456789abcdef0123"
      )
    ).toBe(true);
  });

  it("timingSafeEqualString returns false for differing characters", () => {
    expect(timingSafeEqualString("hello", "hella")).toBe(false);
    expect(
      timingSafeEqualString(
        "4a5b6c7d8e9f0123456789abcdef0123456789abcdef0123456789abcdef0123",
        "4a5b6c7d8e9f0123456789abcdef0123456789abcdef0123456789abcdef0124"
      )
    ).toBe(false);
  });

  it("timingSafeEqualString returns false for different lengths without timing leak", () => {
    expect(timingSafeEqualString("short", "much longer string")).toBe(false);
    expect(timingSafeEqualString("", "not empty")).toBe(false);
  });

  it("verifies valid Razorpay payment signature correctly", async () => {
    const orderId = "order_test_123456";
    const paymentId = "pay_test_789012";

    const validSignature = crypto
      .createHmac("sha256", TEST_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    const isValid = await verifyRazorpaySignature(orderId, paymentId, validSignature);
    expect(isValid).toBe(true);
  });

  it("rejects forged or tampered Razorpay payment signature", async () => {
    const orderId = "order_test_123456";
    const paymentId = "pay_test_789012";
    const forgedSignature = "0000000000000000000000000000000000000000000000000000000000000000";

    const isValid = await verifyRazorpaySignature(orderId, paymentId, forgedSignature);
    expect(isValid).toBe(false);
  });

  it("verifies valid Razorpay webhook signature", async () => {
    const rawBody = JSON.stringify({
      event: "order.paid",
      payload: { order: { entity: { id: "order_123" } } },
    });

    const validSignature = crypto
      .createHmac("sha256", TEST_WEBHOOK_SECRET)
      .update(rawBody)
      .digest("hex");

    const isValid = await verifyRazorpayWebhookSignature(rawBody, validSignature);
    expect(isValid).toBe(true);
  });

  it("rejects invalid webhook signature", async () => {
    const rawBody = JSON.stringify({ event: "order.paid" });
    const invalidSignature = "invalid_signature_hex";

    const isValid = await verifyRazorpayWebhookSignature(rawBody, invalidSignature);
    expect(isValid).toBe(false);
  });
});
