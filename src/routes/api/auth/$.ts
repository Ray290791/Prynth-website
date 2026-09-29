import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth/server";

import { RateLimiter, getClientIp, isBotUserAgent } from "@/lib/rate-limiter";

// Rate limiter for auth endpoints: max 8 attempts per minute
const authRateLimiter = new RateLimiter({ maxAttempts: 8, windowMs: 60 * 1000 });

function checkBotProtection(request: Request): Response | null {
  const ua = request.headers.get("user-agent") || "";
  if (isBotUserAgent(ua)) {
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

        const ip = getClientIp(request);

        if (authRateLimiter.isLimited(ip)) {
          const retryAfter = authRateLimiter.getRemainingSeconds(ip);
          return new Response(
            JSON.stringify({ error: "Too many authentication attempts. Please wait a minute before retrying." }),
            {
              status: 429,
              headers: {
                "Content-Type": "application/json",
                "Retry-After": String(retryAfter || 60),
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

