import { betterAuth } from "better-auth";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { getCookie } from "@tanstack/react-start/server";
import { Pool } from "pg";
import { ensureDbReady, getPglite } from "../db";
import { emailAndPasswordEnabled } from "./email-password";
import { pgliteDialect } from "./pglite-dialect";

// Kick (and share) PGLite bootstrap as soon as the auth server module loads.
void ensureDbReady();

/** Read an env var, treating empty/whitespace as unset. */
const env = (key: string): string | undefined => {
  const value = process.env[key]?.trim();
  return value ? value : undefined;
};

// Explicit off-switch.
const authDisabled = env("VITE_AUTH_ENABLED") === "false";

export const authConfigured = !authDisabled;

const explicitBaseURL = env("BETTER_AUTH_URL");
const LOCAL_DEV_ORIGINS: string[] = [
  "http://localhost:8080",
  "http://127.0.0.1:8080",
  "http://[::1]:8080",
];

const baseURL = explicitBaseURL ?? "http://localhost:8080";

const trustedOrigins: string[] = explicitBaseURL
  ? [explicitBaseURL, ...LOCAL_DEV_ORIGINS]
  : [...LOCAL_DEV_ORIGINS];

const databaseUrl = env("DATABASE_URL");

const database = databaseUrl
  ? new Pool({ connectionString: databaseUrl })
  : { dialect: pgliteDialect(() => getPglite()), type: "postgres" as const };

export const SESSION_TOKEN_COOKIE = "prynth.session_token";

export const auth = betterAuth({
  baseURL,
  secret: env("BETTER_AUTH_SECRET") ?? "development-secret-key-change-me",
  database,
  trustedOrigins,

  session: { cookieCache: { enabled: false, maxAge: 300 } },

  ...(emailAndPasswordEnabled ? { emailAndPassword: { enabled: true } } : {}),

  socialProviders: {
    google: {
      clientId: env("GOOGLE_CLIENT_ID") as string,
      clientSecret: env("GOOGLE_CLIENT_SECRET") as string,
    },
    twitter: {
      clientId: env("TWITTER_CLIENT_ID") as string,
      clientSecret: env("TWITTER_CLIENT_SECRET") as string,
    },
  },

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

export function readSessionToken(): string | null {
  return getCookie(SESSION_TOKEN_COOKIE) ?? null;
}

export { AUTH_PROVIDERS } from "./providers";
