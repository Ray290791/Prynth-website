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

export const uploadCustomFile = createServerFn({ method: "POST" })
  .validator(
    z.object({
      fileName: z.string().min(1),
      fileSize: z.number(),
      mimeType: z.string().default("application/octet-stream"),
      fileData: z.string().min(1), // Base64 or Data URL
    })
  )
  .handler(async ({ data }) => {
    try {
      const sql = await getSql();
      await ensureCustomFilesTable(sql);

      // Clean base64 data if it contains a data URL prefix
      let cleanData = data.fileData;
      if (cleanData.includes(";base64,")) {
        cleanData = cleanData.split(";base64,")[1];
      }

      const fileId = `file-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

      await sql`
        INSERT INTO custom_files (id, file_name, file_size, mime_type, file_data, created_at)
        VALUES (${fileId}, ${data.fileName}, ${data.fileSize}, ${data.mimeType}, ${cleanData}, now())
      `;

      return {
        success: true,
        fileId,
        fileName: data.fileName,
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
