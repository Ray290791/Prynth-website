import { getSql } from "./db";

/**
 * Cloudflare Turnstile token verification.
 * Verifies turnstile responses against Cloudflare's siteverify endpoint.
 */

// Cloudflare official dummy test keys (always pass)
const CLOUDFLARE_TEST_SECRET = "1x0000000000000000000000000000000AA";

export async function getTurnstileSecretKey(): Promise<string> {
  let secret =
    (typeof process !== "undefined" ? process.env.TURNSTILE_SECRET_KEY : undefined)?.trim() ||
    (globalThis as any).__env__?.TURNSTILE_SECRET_KEY?.trim() ||
    "";

  if (!secret) {
    try {
      const sql = await getSql();
      const rows = await sql<{ key: string; value: string }>`
        SELECT value FROM site_settings 
        WHERE key = 'turnstile_secret_key'
        LIMIT 1
      `;
      if (rows.length > 0 && rows[0].value?.trim()) {
        secret = rows[0].value.trim();
      }
    } catch {
      // Ignore DB lookup error
    }
  }

  return secret;
}

/**
 * Verifies a Cloudflare Turnstile CAPTCHA response token.
 */
export async function verifyTurnstileToken(
  token?: string | null,
  clientIp?: string
): Promise<{ success: boolean; error?: string }> {
  const secretKey = await getTurnstileSecretKey();

  // If no secret key is configured, allow in development or fallback to test key
  const isDev =
    typeof process !== "undefined" &&
    (process.env.NODE_ENV === "development" || !secretKey);

  if (!secretKey) {
    if (isDev) {
      // In local development without Turnstile configured, bypass verification
      return { success: true };
    }
    return {
      success: false,
      error: "Turnstile secret key is not configured on the server.",
    };
  }

  if (!token || !token.trim()) {
    return {
      success: false,
      error: "Verification failed: Turnstile token is missing. Please complete the security check.",
    };
  }

  try {
    const formData = new URLSearchParams();
    formData.append("secret", secretKey);
    formData.append("response", token.trim());
    if (clientIp && clientIp !== "127.0.0.1") {
      formData.append("remoteip", clientIp);
    }

    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: formData,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    if (!res.ok) {
      return {
        success: false,
        error: `Cloudflare Turnstile verification server responded with ${res.status}`,
      };
    }

    const outcome = (await res.json()) as {
      success: boolean;
      "error-codes"?: string[];
    };

    if (!outcome.success) {
      console.warn("[Turnstile] Verification failed:", outcome["error-codes"]);
      return {
        success: false,
        error: "Security verification failed. Please refresh and try again.",
      };
    }

    return { success: true };
  } catch (err: any) {
    console.error("[Turnstile] Verification error:", err);
    return {
      success: false,
      error: "Security check service temporarily unavailable. Please try again.",
    };
  }
}
