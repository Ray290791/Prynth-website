import { getRequest } from "@tanstack/react-start/server";
import { auth, authConfigured } from "./server";
import { getSql } from "../db";

/** True when a real database is configured server-side. */
const databaseConfigured = Boolean(process.env.DATABASE_URL?.trim());

/** Re-export so callers can branch on it without importing `server.ts`. */
export { authConfigured };

if (databaseConfigured && !authConfigured) {
  console.error(
    "[auth] DATABASE_URL is set but auth is disabled (VITE_AUTH_ENABLED=false) " +
      "— requireUserId() will reject every request (fail closed) rather than " +
      "share one dev user on a real database.",
  );
}

/** Dev fallback user id, used only when auth is disabled (VITE_AUTH_ENABLED=false). */
export const DEV_USER_ID = "dev-user";

export class UnauthorizedError extends Error {
  readonly status = 401;
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}

export type VerifiedUser = { id: string; email: string | null };

/**
 * Resolve the signed-in user from the current request, or `null` when auth isn't
 * configured / nobody is signed in. Safe to call from server functions and SSR
 * loaders.
 */
export async function getSessionUser(): Promise<VerifiedUser | null> {
  if (!authConfigured) return null;
  const request = getRequest();
  if (!request) return null;

  // 1. Direct stateless SQL session lookup from Cookie or Authorization header.
  // This avoids Cloudflare Workers WebSocket / Pool I/O issues on server functions.
  try {
    const cookieHeader = request.headers.get("cookie") || "";
    // Match either prynth.session_token or better-auth.session_token, with or without __Secure- prefix
    const match = cookieHeader.match(/(?:^|;\s*)(?:__Secure-)?(?:prynth|better-auth)\.session_token=([^;]+)/);
    let token = match ? decodeURIComponent(match[1].trim()) : null;

    if (!token) {
      const authHeader = request.headers.get("authorization") || "";
      if (authHeader.toLowerCase().startsWith("bearer ")) {
        token = authHeader.slice(7).trim();
      }
    }

    if (token) {
      // Better-Auth signs cookies as <token>.<signature>
      const cleanToken = token.split(".")[0];
      if (cleanToken) {
        const sql = await getSql();
        const rows = await sql`
          SELECT "session".*, "user".id as user_id, "user".email as user_email 
          FROM "session" 
          JOIN "user" ON "session"."userId" = "user".id 
          WHERE "session".token = ${cleanToken} AND "session"."expiresAt" > NOW()
          LIMIT 1
        `;
        if (rows && rows.length > 0) {
          const row = rows[0] as any;
          return { id: row.user_id, email: row.user_email ?? null };
        }
      }
    }
  } catch (err) {
    console.error("[getSessionUser direct sql error]:", err);
  }

  // 2. Fallback to auth.api.getSession
  try {
    const headers = request.headers;
    const session = await auth.api.getSession({ headers });
    if (session?.user) {
      return { id: session.user.id, email: session.user.email ?? null };
    }
  } catch (err) {
    console.error("[getSessionUser auth.api fallback error]:", err);
  }

  return null;
}

/**
 * Resolve the current user id for a server function, or throw when unauthorized.
 */
export async function requireUserId(): Promise<string> {
  if (!authConfigured) {
    if (databaseConfigured) {
      throw new Error(
        "Auth is disabled (VITE_AUTH_ENABLED=false) but DATABASE_URL is set — " +
          "refusing to fall back to the shared dev user against a real database.",
      );
    }
    return DEV_USER_ID;
  }
  const user = await getSessionUser();
  if (!user) throw new UnauthorizedError();
  return user.id;
}
