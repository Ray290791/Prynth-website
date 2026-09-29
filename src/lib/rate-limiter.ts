/**
 * In-memory sliding-window rate limiter with automatic memory cleanup.
 * Compatible with Node.js and Cloudflare Workers.
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

export class RateLimiter {
  private map = new Map<string, RateLimitEntry>();
  private maxAttempts: number;
  private windowMs: number;
  private maxEntries: number;

  constructor(options: { maxAttempts: number; windowMs: number; maxEntries?: number }) {
    this.maxAttempts = options.maxAttempts;
    this.windowMs = options.windowMs;
    this.maxEntries = options.maxEntries ?? 5000;
  }

  isLimited(key: string): boolean {
    const now = Date.now();

    // Periodic cleanup if map grows too large
    if (this.map.size > this.maxEntries) {
      for (const [k, entry] of this.map.entries()) {
        if (now > entry.resetTime) {
          this.map.delete(k);
        }
      }
    }

    const entry = this.map.get(key);
    if (!entry || now > entry.resetTime) {
      this.map.set(key, { count: 1, resetTime: now + this.windowMs });
      return false;
    }

    entry.count += 1;
    return entry.count > this.maxAttempts;
  }

  getRemainingSeconds(key: string): number {
    const entry = this.map.get(key);
    if (!entry) return 0;
    return Math.max(0, Math.ceil((entry.resetTime - Date.now()) / 1000));
  }
}

export function getClientIp(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "127.0.0.1"
  );
}

export function isBotUserAgent(userAgent: string | null | undefined): boolean {
  if (!userAgent || !userAgent.trim()) return true;
  return /sqlmap|nikto|wpscan|masscan|zgrab|acunetix|nessus|openvas|arachni/i.test(userAgent);
}
