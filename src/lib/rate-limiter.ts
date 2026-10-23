/**
 * Distributed rate limiter for Cloudflare Workers & Node.js.
 * 
 * Supports:
 * 1. Cloudflare Workers KV (when RATE_LIMIT_KV is bound in wrangler.toml)
 * 2. Neon Serverless Postgres atomic upserts (shared across all Worker isolates)
 * 3. In-memory sliding-window fallback for local development & offline preview
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

function getKvBinding(): any {
  const g = globalThis as any;
  if (g.RATE_LIMIT_KV && typeof g.RATE_LIMIT_KV.get === "function") {
    return g.RATE_LIMIT_KV;
  }
  if (g.__env__?.RATE_LIMIT_KV && typeof g.__env__.RATE_LIMIT_KV.get === "function") {
    return g.__env__.RATE_LIMIT_KV;
  }
  if (typeof process !== "undefined" && (process.env as any)?.RATE_LIMIT_KV) {
    const kv = (process.env as any).RATE_LIMIT_KV;
    if (typeof kv.get === "function") return kv;
  }
  return null;
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

  /**
   * Synchronous in-memory rate limit check (backward-compatible).
   */
  isLimited(key: string): boolean {
    const now = Date.now();

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

  /**
   * Distributed rate limit check that holds across all Cloudflare Workers isolates.
   */
  async checkLimit(key: string): Promise<{ limited: boolean; remainingSeconds: number }> {
    // 1. Check Cloudflare KV if configured
    const kv = getKvBinding();
    if (kv) {
      try {
        const raw = await kv.get(key);
        let count = raw ? parseInt(raw, 10) || 0 : 0;
        count += 1;
        const ttlSeconds = Math.max(60, Math.ceil(this.windowMs / 1000));
        await kv.put(key, count.toString(), { expirationTtl: ttlSeconds });
        return {
          limited: count > this.maxAttempts,
          remainingSeconds: ttlSeconds,
        };
      } catch (kvErr) {
        console.warn("[RateLimiter] KV check error, falling back:", kvErr);
      }
    }

    // 2. Check Postgres distributed rate_limits table
    try {
      const { getSql } = await import("./db");
      const sql = await getSql();
      const rows = await sql<{ count: number; reset_at: string }>`
        INSERT INTO rate_limits (key, count, reset_at)
        VALUES (${key}, 1, now() + (${this.windowMs} / 1000.0) * interval '1 second')
        ON CONFLICT (key) DO UPDATE
        SET count = CASE 
          WHEN rate_limits.reset_at < now() THEN 1 
          ELSE rate_limits.count + 1 
        END,
        reset_at = CASE 
          WHEN rate_limits.reset_at < now() THEN now() + (${this.windowMs} / 1000.0) * interval '1 second'
          ELSE rate_limits.reset_at 
        END
        RETURNING count, reset_at
      `;

      if (rows && rows.length > 0) {
        const count = Number(rows[0].count);
        const resetTime = new Date(rows[0].reset_at).getTime();
        const remainingSeconds = Math.max(0, Math.ceil((resetTime - Date.now()) / 1000));
        return {
          limited: count > this.maxAttempts,
          remainingSeconds,
        };
      }
    } catch {
      // Fallback to local memory if database is unreachable
    }

    // 3. Fallback to in-memory sliding window
    return {
      limited: this.isLimited(key),
      remainingSeconds: this.getRemainingSeconds(key),
    };
  }
}

/**
 * Convenience helper for distributed rate limiting across Workers isolates.
 */
export async function checkRateLimit(
  key: string,
  limit = 5,
  windowMs = 10 * 60 * 1000
): Promise<boolean> {
  const limiter = new RateLimiter({ maxAttempts: limit, windowMs });
  const result = await limiter.checkLimit(key);
  return !result.limited;
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
