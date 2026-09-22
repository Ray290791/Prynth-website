import { betterAuth } from "better-auth";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { getCookie } from "@tanstack/react-start/server";
import { Pool as NeonPool } from "@neondatabase/serverless";
import { Pool as PgPool } from "pg";
import { ensureDbReady, getPglite, isCloudflare, isProd, getDatabaseUrl } from "../db";
import { emailAndPasswordEnabled } from "./email-password";
import { pgliteDialect } from "./pglite-dialect";

/** Read an env var, treating empty/whitespace as unset. */
const env = (key: string): string | undefined => {
  const val = (typeof process !== "undefined" ? process.env[key] : undefined) || (globalThis as any).__env__?.[key];
  return val && val.trim() ? val.trim() : undefined;
};

// Kick (and share) PGLite bootstrap only in local development without Neon.
if (!isProd && !isCloudflare && !env("DATABASE_URL")) {
  void ensureDbReady();
}

// Explicit off-switch.
const authDisabled = env("VITE_AUTH_ENABLED") === "false";

export const authConfigured = !authDisabled;

export const SESSION_TOKEN_COOKIE = "prynth.session_token";

function initAuth() {
  const explicitBaseURL = env("BETTER_AUTH_URL");
  const LOCAL_DEV_ORIGINS: string[] = [
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "http://[::1]:8080",
  ];

  const baseURL = explicitBaseURL ?? (isCloudflare ? "https://prynth.prynth07.workers.dev" : "http://localhost:8080");

  const trustedOrigins: string[] = explicitBaseURL
    ? [explicitBaseURL, ...LOCAL_DEV_ORIGINS]
    : [baseURL, ...LOCAL_DEV_ORIGINS];

  const databaseUrl = getDatabaseUrl();

  let pool: any = null;
  if (databaseUrl || isProd || isCloudflare) {
    const PoolClass = (isCloudflare ? NeonPool : PgPool) as any;
    pool = new PoolClass({
      connectionString: databaseUrl || "postgres://localhost/dummy",
    });
    pool.on("error", (err: any) => {
      console.error("[auth pg pool error]:", err);
    });
  }

  const database = pool ?? { dialect: pgliteDialect(() => getPglite()), type: "postgres" as const };

  const socialProviders: Record<string, any> = {};
  const googleId = env("GOOGLE_CLIENT_ID");
  const googleSecret = env("GOOGLE_CLIENT_SECRET");
  if (googleId && googleSecret) {
    socialProviders.google = {
      clientId: googleId,
      clientSecret: googleSecret,
    };
  }
  const twitterId = env("TWITTER_CLIENT_ID");
  const twitterSecret = env("TWITTER_CLIENT_SECRET");
  if (twitterId && twitterSecret) {
    socialProviders.twitter = {
      clientId: twitterId,
      clientSecret: twitterSecret,
    };
  }

  return betterAuth({
    baseURL,
    secret: env("BETTER_AUTH_SECRET") ?? "development-secret-key-change-me",
    database,
    trustedOrigins,

    session: { cookieCache: { enabled: false, maxAge: 300 } },

    ...(emailAndPasswordEnabled ? { emailAndPassword: { enabled: true } } : {}),

    ...(Object.keys(socialProviders).length > 0 ? { socialProviders } : {}),

    advanced: {
      useSecureCookies: false, // Allows auth over HTTP localhost
      defaultCookieAttributes: { secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/" },
      cookies: {
        session_token: { name: SESSION_TOKEN_COOKIE },
        session_data: { name: "prynth.session_data" },
        account_data: { name: "prynth.account_data" },
        dont_remember: { name: "prynth.dont_remember" },
      },
    },

    plugins: [
      tanstackStartCookies(),
    ],
  });
}

let _authInstance: ReturnType<typeof initAuth> | null = null;
export const auth = new Proxy({} as any, {
  get(_target, prop) {
    if (!_authInstance || !(_authInstance as any).options?.socialProviders?.google) {
      _authInstance = initAuth();
    }
    return (_authInstance as any)[prop];
  },
}) as ReturnType<typeof initAuth>;

export function readSessionToken(): string | null {
  return getCookie(SESSION_TOKEN_COOKIE) ?? null;
}

export { AUTH_PROVIDERS } from "./providers";
