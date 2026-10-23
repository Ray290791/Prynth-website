import { createServerFn } from "@tanstack/react-start";
import { getSql } from "./db";
import { z } from "zod";
import { authMiddleware } from "./auth/middleware";
import { verifyAdminRole } from "./admin-fns";

const ALLOWED_EXTENSIONS = /\.(stl|obj|3mf|step|stp|f3d)$/i;
// Keep uploads small enough to avoid filling worker memory or storage.
// 3D model files for custom quotes only need to be referenced — large files
// should be shared via Google Drive / WeTransfer and linked in notes.
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB cap
const MAX_PAYLOAD_CHARS = 36_000_000; // ~26 MB base64

export const uploadCustomFile = createServerFn({ method: "POST" })
  .validator(
    z.object({
      fileName: z
        .string()
        .min(1)
        .max(255)
        .refine((name) => ALLOWED_EXTENSIONS.test(name), {
          message: "Only 3D model files (.stl, .obj, .3mf, .step, .stp, .f3d) are permitted.",
        }),
      fileSize: z
        .number()
        .positive()
        .max(MAX_FILE_SIZE_BYTES, {
          message: "File too large. Please keep files under 25 MB, or share a Google Drive / WeTransfer link in the notes field instead.",
        }),
      mimeType: z.string().max(100).default("application/octet-stream"),
      fileData: z.string().min(1).max(MAX_PAYLOAD_CHARS, {
        message: "File data exceeds allowed upload size. Please keep files under 25 MB.",
      }),
      turnstileToken: z.string().optional(),
    })
  )
  .handler(async ({ data }) => {
    try {
      const sql = await getSql();

      // 1. Per-IP Rate Limiting across Worker isolates
      const { getRequest } = await import("@tanstack/react-start/server");
      const { RateLimiter, getClientIp } = await import("./rate-limiter");
      const req = getRequest();
      const ip = req ? getClientIp(req) : "127.0.0.1";

      const uploadLimiter = new RateLimiter({ maxAttempts: 10, windowMs: 10 * 60 * 1000 });
      const limitCheck = await uploadLimiter.checkLimit(`upload-model:${ip}`);
      if (limitCheck.limited) {
        throw new Error("Upload rate limit exceeded. Please wait a few minutes before uploading more 3D models.");
      }

      // 2. Cloudflare Turnstile Verification
      const { verifyTurnstileToken } = await import("./turnstile.server");
      const turnstileCheck = await verifyTurnstileToken(data.turnstileToken, ip);
      if (!turnstileCheck.success) {
        throw new Error(turnstileCheck.error || "Security verification failed. Please complete the security check.");
      }

      // Sanitize fileName to prevent directory traversal or injection
      const sanitizedFileName = data.fileName
        .replace(/[\\/\0]/g, "")
        .replace(/^\.+/, "")
        .slice(0, 150);

      // Clean base64 data if it contains a data URL prefix
      let cleanData = data.fileData;
      if (cleanData.includes(";base64,")) {
        cleanData = cleanData.split(";base64,")[1];
      }

      // Compute SHA-256 hash of the decoded file bytes for strict content deduplication
      const cryptoMod = await import("crypto");
      const fileBytes = Buffer.from(cleanData, "base64");
      const contentHash = cryptoMod
        .createHash("sha256")
        .update(fileBytes)
        .digest("hex");

      // ── Deduplication: if the exact same file bytes already exist in DB, reuse the record ──
      const existing = await sql`
        SELECT id, file_name, file_size FROM custom_files
        WHERE content_hash = ${contentHash}
        LIMIT 1
      `;
      if (existing.length > 0) {
        return {
          success: true,
          fileId: existing[0].id as string,
          fileName: existing[0].file_name as string,
          fileSize: existing[0].file_size as number,
        };
      }

      // Cryptographically secure, unguessable file identifier
      const fileId = `file-${crypto.randomUUID()}`;

      // 3. Store in Cloudflare R2 if configured, leaving file_data null in Postgres
      const { uploadModelToR2, isR2Configured } = await import("./r2.server");
      let r2Key: string | null = null;
      if (isR2Configured()) {
        r2Key = `models/${contentHash}-${fileId}.stl`;
        await uploadModelToR2(r2Key, fileBytes, data.mimeType, sanitizedFileName);
      }

      try {
        await sql`
          INSERT INTO custom_files (id, file_name, file_size, mime_type, file_data, r2_key, content_hash, created_at)
          VALUES (${fileId}, ${sanitizedFileName}, ${data.fileSize}, ${data.mimeType}, ${r2Key ? null : cleanData}, ${r2Key}, ${contentHash}, now())
        `;
      } catch (insertErr: any) {
        // Handle race condition on content_hash unique constraint
        const raced = await sql`
          SELECT id, file_name, file_size FROM custom_files
          WHERE content_hash = ${contentHash}
          LIMIT 1
        `;
        if (raced.length > 0) {
          return {
            success: true,
            fileId: raced[0].id as string,
            fileName: raced[0].file_name as string,
            fileSize: raced[0].file_size as number,
          };
        }
        throw insertErr;
      }

      return {
        success: true,
        fileId,
        fileName: sanitizedFileName,
        fileSize: data.fileSize,
      };
    } catch (err: any) {
      console.error("[uploadCustomFile error]:", err);
      throw new Error("Failed to save uploaded 3D model file: " + (err.message || String(err)));
    }
  });

export const getCustomFileRecord = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    const sql = await getSql();
    const rows = await sql<{
      id: string;
      file_name: string;
      file_size: number;
      mime_type: string;
      file_data: string | null;
      r2_key?: string | null;
      content_hash?: string;
      created_at: string;
    }>`
      SELECT id, file_name, file_size, mime_type, file_data, r2_key, content_hash, created_at
      FROM custom_files
      WHERE id = ${data.id}
    `;
    if (!rows || rows.length === 0) return null;
    return rows[0];
  });

export const getAdminModelDownloadUrl = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ fileId: z.string().min(1) }))
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    const admin = await verifyAdminRole(context.userId, sql);
    if (!admin) {
      throw new Error("Unauthorized: Admin role required to access customer 3D models");
    }
    const { generateModelAccessToken } = await import("./custom-model-auth.server");
    const token = generateModelAccessToken(data.fileId, context.userId);
    return { token };
  });

