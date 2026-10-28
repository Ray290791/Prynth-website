import { describe, it, expect } from "vitest";
import { RateLimiter, isBotUserAgent } from "../src/lib/rate-limiter";

describe("C5 & C6: Rate Limiting & Bot Protection", () => {
  it("RateLimiter enforces limits within window", () => {
    const limiter = new RateLimiter({ maxAttempts: 3, windowMs: 1000 });
    const key = "test-user-ip-1";

    expect(limiter.isLimited(key)).toBe(false); // 1
    expect(limiter.isLimited(key)).toBe(false); // 2
    expect(limiter.isLimited(key)).toBe(false); // 3
    expect(limiter.isLimited(key)).toBe(true);  // 4 (exceeded)
  });

  it("RateLimiter resets after window expires", async () => {
    const limiter = new RateLimiter({ maxAttempts: 2, windowMs: 100 });
    const key = "test-user-ip-expire";

    expect(limiter.isLimited(key)).toBe(false);
    expect(limiter.isLimited(key)).toBe(false);
    expect(limiter.isLimited(key)).toBe(true);

    await new Promise((r) => setTimeout(r, 150));
    expect(limiter.isLimited(key)).toBe(false);
  });

  it("isBotUserAgent identifies automated vulnerability scanners", () => {
    expect(isBotUserAgent("sqlmap/1.5.2")).toBe(true);
    expect(isBotUserAgent("Mozilla/5.0 (compatible; Nikto/2.1.6)")).toBe(true);
    expect(isBotUserAgent("masscan/1.0")).toBe(true);
    expect(isBotUserAgent("")).toBe(true);
    expect(isBotUserAgent(null)).toBe(true);

    // Legitimate browser user-agent
    expect(
      isBotUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      )
    ).toBe(false);
  });
});
