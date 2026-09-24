import { defineEventHandler, setResponseHeader } from "h3";

/**
 * Security-headers middleware — runs on every Nitro HTTP response.
 *
 * Injects all key HTTP security headers to harden the site against:
 *   • clickjacking (X-Frame-Options / CSP frame-src)
 *   • MIME sniffing (X-Content-Type-Options)
 *   • referrer leakage (Referrer-Policy)
 *   • XSS / code injection (Content-Security-Policy)
 *   • unnecessary browser API access (Permissions-Policy)
 *
 * To permit additional external origins, extend the csp array below.
 */
export default defineEventHandler((event) => {
  // ── Content-Security-Policy ────────────────────────────────────────────────
  // 'unsafe-inline' is required by TanStack Start hydration scripts and
  // Tailwind @layer injected CSS. Without it, the app cannot boot.
  const csp = [
    "default-src 'self'",
    // Own scripts + Grok platform extension + Razorpay checkout SDK
    "script-src 'self' 'unsafe-inline' https://grok.com https://checkout.razorpay.com https://*.razorpay.com",
    // Own styles + Google Fonts + Tailwind inline
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    // Font files
    "font-src 'self' https://fonts.gstatic.com",
    // Images: own origin, base64 data URIs (thumbnails), blob (canvas) + Razorpay
    "img-src 'self' data: blob: https://*.razorpay.com",
    // API / WebSocket calls: own origin + Razorpay (payments) + Neon (DB)
    "connect-src 'self' https://*.razorpay.com https://*.neon.tech wss://*.neon.tech",
    // Razorpay checkout modal runs inside an iframe
    "frame-src 'self' https://api.razorpay.com https://*.razorpay.com",
    "object-src 'none'",
    // Force HTTPS for all requests made by the page
    "upgrade-insecure-requests",
  ].join("; ");

  setResponseHeader(event, "Content-Security-Policy", csp);

  // Block embedding this page in any iframe (clickjacking protection)
  setResponseHeader(event, "X-Frame-Options", "DENY");

  // Prevent browser from guessing content types
  setResponseHeader(event, "X-Content-Type-Options", "nosniff");

  // Only include origin (not full path) in Referer header on cross-origin requests
  setResponseHeader(event, "Referrer-Policy", "strict-origin-when-cross-origin");

  // Restrict which browser APIs are allowed by this page
  setResponseHeader(
    event,
    "Permissions-Policy",
    [
      "camera=()",       // deny camera
      "microphone=()",   // deny mic
      "geolocation=()",  // deny location
      "payment=*",       // allow payment API for Razorpay
      "usb=()",          // deny USB
    ].join(", "),
  );
});
