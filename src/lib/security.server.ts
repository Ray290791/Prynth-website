import { getRequest } from "@tanstack/react-start/server";
import { RateLimiter, getClientIp } from "./rate-limiter";

// Rate limiter for coupon code validation: max 10 attempts per minute per IP
const couponRateLimiter = new RateLimiter({ maxAttempts: 10, windowMs: 60 * 1000 });

// Rate limiter for cart session updates: max 60 updates per minute per IP
const cartSessionRateLimiter = new RateLimiter({ maxAttempts: 60, windowMs: 60 * 1000 });

export function checkCouponRateLimit(): void {
  try {
    const req = getRequest();
    if (req) {
      const ip = getClientIp(req);
      if (couponRateLimiter.isLimited(ip)) {
        throw new Error("Too many coupon validation attempts. Please wait a minute before retrying.");
      }
    }
  } catch (err: any) {
    if (err.message?.includes("Too many coupon validation attempts")) {
      throw err;
    }
  }
}

export function checkCartSessionRateLimit(): void {
  try {
    const req = getRequest();
    if (req) {
      const ip = getClientIp(req);
      if (cartSessionRateLimiter.isLimited(ip)) {
        throw new Error("Too many cart updates. Please slow down.");
      }
    }
  } catch (err: any) {
    if (err.message?.includes("Too many cart updates")) {
      throw err;
    }
  }
}
