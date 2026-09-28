import { defineEventHandler, getRequestHost, sendRedirect } from "h3";

/**
 * Redirect any traffic arriving via *.workers.dev directly to the official domain: https://prynth.in
 */
export default defineEventHandler((event) => {
  const host = getRequestHost(event);
  if (host && (host.endsWith(".workers.dev") || host.includes("workers.dev"))) {
    const originalUrl = event.node?.req?.url || "/";
    return sendRedirect(event, `https://prynth.in${originalUrl}`, 301);
  }
});
