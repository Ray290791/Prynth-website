import { createServerFn } from "@tanstack/react-start";
import { getSql } from "./db";
import { z } from "zod";

async function ensureCustomFilesTable(sql: any) {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS custom_files (
        id TEXT PRIMARY KEY,
        file_name TEXT NOT NULL,
        file_size BIGINT NOT NULL,
        mime_type TEXT NOT NULL,
        file_data TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;
  } catch (err) {
    console.error("[ensureCustomFilesTable error]:", err);
  }
}

const ALLOWED_EXTENSIONS = /\.(stl|obj|3mf|step|stp|f3d)$/i;
// Keep uploads small enough to avoid filling the Neon free-tier DB.
// 3D model files for custom quotes only need to be referenced — large files
// should be shared via Google Drive / WeTransfer and linked in notes.
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB hard cap
const MAX_PAYLOAD_CHARS = 8_000_000; // ~6 MB base64

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
          message: "File too large. Please keep files under 5 MB, or share a Google Drive link in the notes field instead.",
        }),
      mimeType: z.string().max(100).default("application/octet-stream"),
      fileData: z.string().min(1).max(MAX_PAYLOAD_CHARS, {
        message: "File data exceeds allowed upload size. Please keep files under 5 MB.",
      }),
    })
  )
  .handler(async ({ data }) => {
    try {
      const sql = await getSql();
      await ensureCustomFilesTable(sql);

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

      // ── Deduplication: if the same file (name + size) already exists, reuse it ──
      // This prevents the same 3D model being stored repeatedly when a customer
      // re-uploads or reloads the page, which was rapidly filling the Neon DB WAL.
      const existing = await sql`
        SELECT id, file_name, file_size FROM custom_files
        WHERE file_name = ${sanitizedFileName} AND file_size = ${data.fileSize}
        ORDER BY created_at DESC
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

      const fileId = `file-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

      await sql`
        INSERT INTO custom_files (id, file_name, file_size, mime_type, file_data, created_at)
        VALUES (${fileId}, ${sanitizedFileName}, ${data.fileSize}, ${data.mimeType}, ${cleanData}, now())
      `;

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
    await ensureCustomFilesTable(sql);
    const rows = await sql<{
      id: string;
      file_name: string;
      file_size: number;
      mime_type: string;
      file_data: string;
      created_at: string;
    }>`
      SELECT id, file_name, file_size, mime_type, file_data, created_at
      FROM custom_files
      WHERE id = ${data.id}
    `;
    if (!rows || rows.length === 0) return null;
    return rows[0];
  });
