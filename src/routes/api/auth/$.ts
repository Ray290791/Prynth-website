import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth/server";

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        if (url.pathname.endsWith("/debug")) {
          const envObj = (globalThis as any).__env__ || {};
          const procEnv = typeof process !== "undefined" && process.env ? process.env : {};
          return new Response(JSON.stringify({
            envKeys: Object.keys(envObj),
            procKeys: Object.keys(procEnv).filter(k => !k.startsWith("npm_")),
            googleIdFound: Boolean(envObj.GOOGLE_CLIENT_ID || procEnv.GOOGLE_CLIENT_ID),
            googleSecretFound: Boolean(envObj.GOOGLE_CLIENT_SECRET || procEnv.GOOGLE_CLIENT_SECRET),
          }), { headers: { "Content-Type": "application/json" } });
        }
        try {
          return await auth.handler(request);
        } catch (err: any) {
          console.error("[auth GET error]:", err);
          return new Response(JSON.stringify({ error: err?.message || String(err), stack: err?.stack }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
      POST: async ({ request }) => {
        try {
          return await auth.handler(request);
        } catch (err: any) {
          console.error("[auth POST error]:", err);
          return new Response(JSON.stringify({ error: err?.message || String(err), stack: err?.stack }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
