import { createFileRoute } from "@tanstack/react-router";
import { getSql } from "@/lib/db";
import { verifyCustomModelAccess } from "@/lib/custom-model-auth.server";

const SAFE_ID_REGEX = /^(?:file-)?[a-z0-9_-]{4,64}$/i;

export const Route = createFileRoute("/api/custom-model/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          const url = new URL(request.url);
          const rawId = params?.id || url.pathname.split("/").pop() || "";
          const id = decodeURIComponent(rawId).trim();

          if (!id || !SAFE_ID_REGEX.test(id)) {
            return new Response("Invalid model file identifier", {
              status: 400,
              headers: {
                "Cache-Control": "private, no-store",
                "X-Content-Type-Options": "nosniff",
              },
            });
          }

          const sql = await getSql();

          // Require verified admin session (or valid signed desktop slicer token)
          const admin = await verifyCustomModelAccess(request, id, sql);
          if (!admin) {
            return new Response("Unauthorized. Admin access required to view uploaded customer models.", {
              status: 401,
              headers: {
                "Cache-Control": "private, no-store",
                "Content-Type": "text/plain",
                "X-Content-Type-Options": "nosniff",
              },
            });
          }

          const rows = await sql<{
            file_name: string;
            mime_type: string;
            file_data: string | null;
            file_size: number;
            r2_key: string | null;
          }>`
            SELECT file_name, mime_type, file_data, file_size, r2_key
            FROM custom_files
            WHERE id = ${id}
          `;

          if (!rows || rows.length === 0) {
            return new Response("Model file not found", {
              status: 404,
              headers: {
                "Cache-Control": "private, no-store",
                "X-Content-Type-Options": "nosniff",
              },
            });
          }

          const record = rows[0];
          const ext = record.file_name.split(".").pop()?.toLowerCase() || "";

          // Strict whitelist for 3D model content types to prevent MIME confusion or XSS
          let contentType = "application/octet-stream";
          if (ext === "stl") contentType = "model/stl";
          else if (ext === "3mf") contentType = "model/3mf";
          else if (ext === "step" || ext === "stp") contentType = "model/step";
          else if (ext === "obj") contentType = "model/obj";

          // Sanitize filename for Content-Disposition header
          const safeFileName = record.file_name
            .replace(/[\r\n\0"'\\]/g, "_")
            .slice(0, 100);

          // Stream directly from Cloudflare R2 if available to prevent Worker memory bloat
          if (record.r2_key) {
            const { getModelFromR2 } = await import("@/lib/r2.server");
            const r2Object = await getModelFromR2(record.r2_key);
            if (r2Object && r2Object.body) {
              return new Response(r2Object.body as any, {
                status: 200,
                headers: {
                  "Content-Type": contentType,
                  "Content-Disposition": `inline; filename="${encodeURIComponent(safeFileName)}"`,
                  "Content-Length": String(r2Object.size || record.file_size || ""),
                  "Cache-Control": "private, no-store",
                  "X-Content-Type-Options": "nosniff",
                  "Content-Security-Policy": "default-src 'none'; sandbox",
                  "X-Frame-Options": "DENY",
                },
              });
            }
          }

          // Fallback to base64 decoding for legacy files stored before R2 migration
          const buffer = record.file_data
            ? Buffer.from(record.file_data, "base64")
            : Buffer.alloc(0);

          return new Response(buffer, {
            status: 200,
            headers: {
              "Content-Type": contentType,
              "Content-Disposition": `inline; filename="${encodeURIComponent(safeFileName)}"`,
              "Content-Length": String(buffer.byteLength),
              "Cache-Control": "private, no-store",
              "X-Content-Type-Options": "nosniff",
              "Content-Security-Policy": "default-src 'none'; sandbox",
              "X-Frame-Options": "DENY",
            },
          });
        } catch (err: any) {
          console.error("[custom-model API error]:", err);
          return new Response("Failed to retrieve 3D model: " + (err?.message || String(err)), {
            status: 500,
            headers: {
              "Cache-Control": "private, no-store",
            },
          });
        }
      },
    },
  },
});

