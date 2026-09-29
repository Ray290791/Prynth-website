import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth/server";

// In-memory sliding window rate limiter for auth endpoints
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const MAX_AUTH_ATTEMPTS = 8;
const WINDOW_MS = 60 * 1000; // 1 minute

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_AUTH_ATTEMPTS;
}

function checkBotProtection(request: Request): Response | null {
  const ua = request.headers.get("user-agent") || "";
  // Block empty user-agent or known automated scanning tools
  if (!ua.trim() || /sqlmap|nikto|wpscan|masscan|zgrab|acunetix/i.test(ua)) {
    return new Response(JSON.stringify({ error: "Access denied" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
  return null;
}

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const botBlock = checkBotProtection(request);
        if (botBlock) return botBlock;

        try {
          return await auth.handler(request);
        } catch (err: any) {
          console.error("[auth GET error]:", err);
          return new Response(JSON.stringify({ error: err?.message || "Authentication error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
      POST: async ({ request }) => {
        const botBlock = checkBotProtection(request);
        if (botBlock) return botBlock;

        const ip =
          request.headers.get("cf-connecting-ip") ||
          request.headers.get("x-real-ip") ||
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          "unknown";

        if (isRateLimited(ip)) {
          return new Response(
            JSON.stringify({ error: "Too many authentication attempts. Please wait a minute before retrying." }),
            {
              status: 429,
              headers: {
                "Content-Type": "application/json",
                "Retry-After": "60",
              },
            }
          );
        }

        try {
          return await auth.handler(request);
        } catch (err: any) {
          console.error("[auth POST error]:", err);
          return new Response(JSON.stringify({ error: err?.message || "Authentication error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});

