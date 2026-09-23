import { createFileRoute } from "@tanstack/react-router";
import { getSql } from "@/lib/db";

export const Route = createFileRoute("/api/custom-model/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          const url = new URL(request.url);
          const id = params?.id || url.pathname.split("/").pop() || "";

          if (!id) {
            return new Response("Missing model file ID", { status: 400 });
          }

          const sql = await getSql();
          const rows = await sql<{
            file_name: string;
            mime_type: string;
            file_data: string;
            file_size: number;
          }>`
            SELECT file_name, mime_type, file_data, file_size
            FROM custom_files
            WHERE id = ${id}
          `;

          if (!rows || rows.length === 0) {
            return new Response("Model file not found", { status: 404 });
          }

          const record = rows[0];
          const buffer = Buffer.from(record.file_data, "base64");
          const ext = record.file_name.split(".").pop()?.toLowerCase();

          let contentType = record.mime_type || "application/octet-stream";
          if (ext === "stl") contentType = "model/stl";
          else if (ext === "3mf") contentType = "model/3mf";
          else if (ext === "step" || ext === "stp") contentType = "model/step";

          return new Response(buffer, {
            status: 200,
            headers: {
              "Content-Type": contentType,
              "Content-Disposition": `inline; filename="${encodeURIComponent(record.file_name)}"`,
              "Content-Length": String(buffer.byteLength),
              "Access-Control-Allow-Origin": "*",
              "Cache-Control": "public, max-age=86400, immutable",
            },
          });
        } catch (err: any) {
          console.error("[custom-model API error]:", err);
          return new Response("Failed to retrieve 3D model: " + (err?.message || String(err)), {
            status: 500,
          });
        }
      },
    },
  },
});
