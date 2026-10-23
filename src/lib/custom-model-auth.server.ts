import crypto from "crypto";
import { getSql } from "./db";
import { auth, authConfigured } from "./auth/server";
import { DEV_USER_ID } from "./auth/verify.server";
import { verifyAdminRole } from "./admin-fns";

const MODEL_TOKEN_SECRET =
  process.env.BETTER_AUTH_SECRET ||
  (globalThis as any).__env__?.BETTER_AUTH_SECRET ||
  "development-secret-key-change-me";

const databaseConfigured = Boolean(process.env.DATABASE_URL?.trim());

/**
 * Generate a cryptographically signed short-lived token specifically for
 * opening 3D CAD/model files in desktop slicers (Bambu Studio, Orca Slicer)
 * which do not share browser session cookies.
 */
export function generateModelAccessToken(
  fileId: string,
  userId: string,
  expiresInMs = 15 * 60 * 1000,
): string {
  const expiresAt = Date.now() + expiresInMs;
  const payload = `${fileId}:${userId}:${expiresAt}`;
  const hmac = crypto
    .createHmac("sha256", MODEL_TOKEN_SECRET)
    .update(payload)
    .digest("hex");
  return `${expiresAt}.${userId}.${hmac}`;
}

/**
 * Verifies a slicer access token for a given file ID.
 */
export function verifyModelAccessToken(
  token: string,
  fileId: string,
): { userId: string } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [expiresAtStr, userId, signature] = parts;
    const expiresAt = Number(expiresAtStr);
    if (!expiresAt || isNaN(expiresAt) || Date.now() > expiresAt) return null;

    const payload = `${fileId}:${userId}:${expiresAt}`;
    const expected = crypto
      .createHmac("sha256", MODEL_TOKEN_SECRET)
      .update(payload)
      .digest("hex");

    const sigBuf = Buffer.from(signature, "hex");
    const expBuf = Buffer.from(expected, "hex");
    if (
      sigBuf.length !== expBuf.length ||
      !crypto.timingSafeEqual(sigBuf, expBuf)
    ) {
      return null;
    }

    return { userId };
  } catch {
    return null;
  }
}

/**
 * Verifies that an incoming HTTP request to `/api/custom-model/:id` is from
 * an authenticated administrator. Checks session cookies, Bearer header,
 * or a valid signed slicer query token.
 */
export async function verifyCustomModelAccess(
  request: Request,
  fileId: string,
  sqlInstance?: any,
): Promise<{ id: string; email: string; role: string } | null> {
  const sql = sqlInstance || (await getSql());

  // 1. Dev fallback: if auth is explicitly disabled and no DB is set, allow dev
  if (!authConfigured) {
    if (databaseConfigured) {
      return null; // Fail closed if DB is set but auth is disabled
    }
    return { id: DEV_USER_ID, email: "dev@prynth.in", role: "super_admin" };
  }

  // 2. Check signed slicer token in query string (used by Bambu Studio / Orca Slicer)
  const url = new URL(request.url);
  const queryToken = url.searchParams.get("token");
  if (queryToken) {
    const slicerAuth = verifyModelAccessToken(queryToken, fileId);
    if (slicerAuth?.userId) {
      const admin = await verifyAdminRole(slicerAuth.userId, sql);
      if (admin) {
        return {
          id: slicerAuth.userId,
          email: admin.email,
          role: admin.role,
        };
      }
    }
  }

  // 3. Check browser session cookie (or query token if passed as session token)
  let sessionToken: string | null = null;
  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader.match(
    /(?:^|;\s*)(?:__Secure-)?(?:prynth|better-auth)\.session_token=([^;]+)/,
  );
  if (match) {
    sessionToken = decodeURIComponent(match[1].trim());
  }

  // 4. Check Authorization Bearer header
  if (!sessionToken) {
    const authHeader = request.headers.get("authorization") || "";
    if (authHeader.toLowerCase().startsWith("bearer ")) {
      sessionToken = authHeader.slice(7).trim();
    }
  }

  // Direct stateless SQL session lookup
  if (sessionToken) {
    const cleanToken = sessionToken.split(".")[0];
    if (cleanToken) {
      try {
        const rows = await sql`
          SELECT "session".*, "user".id as user_id, "user".email as user_email
          FROM "session"
          JOIN "user" ON "session"."userId" = "user".id
          WHERE "session".token = ${cleanToken} AND "session"."expiresAt" > NOW()
          LIMIT 1
        `;
        if (rows && rows.length > 0) {
          const row = rows[0] as any;
          const admin = await verifyAdminRole(row.user_id, sql);
          if (admin) {
            return {
              id: row.user_id,
              email: row.user_email ?? admin.email,
              role: admin.role,
            };
          }
        }
      } catch (err) {
        console.error("[verifyCustomModelAccess session lookup error]:", err);
      }
    }
  }

  // 5. Fallback to auth.api.getSession
  try {
    const headers = request.headers;
    const session = await auth.api.getSession({ headers });
    if (session?.user) {
      const admin = await verifyAdminRole(session.user.id, sql);
      if (admin) {
        return {
          id: session.user.id,
          email: session.user.email ?? admin.email,
          role: admin.role,
        };
      }
    }
  } catch (err) {
    console.error("[verifyCustomModelAccess auth.api fallback error]:", err);
  }

  return null;
}
