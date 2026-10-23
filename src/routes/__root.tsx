import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { SiteShell } from "@/components/site-shell";
import { ThemeProvider } from "@/lib/theme";
import { Toaster } from "sonner";
import { getSiteSettings } from "@/lib/settings-fns";
import { CartSync } from "@/components/cart-sync";
import { CookieConsent } from "@/components/cookie-consent";
import appCss from "../styles.css?url";

const APP_NAME = "prynth!";
const THEME_BOOT = `try{if(localStorage.getItem("prynth-theme")==="dark")document.documentElement.classList.add("dark")}catch(e){}`;

// ── Security deterrent scripts ────────────────────────────────────────────────
// Runs before React hydration so protections are in place immediately.

/** Disable right-click context menu on images and product cards only, but allow links. */
const DISABLE_IMG_CONTEXT_MENU = `
(function(){
  document.addEventListener('contextmenu',function(e){
    var t=e.target;
    // Allow context menu if the user is right-clicking a link (e.g. to open in new tab)
    if(t.closest('a')) return;
    
    if(t.tagName==='IMG'||t.closest('[data-product-card]')){
      e.preventDefault();
    }
  },true);
  // Prevent drag-saving images
  document.addEventListener('dragstart',function(e){
    if(e.target.tagName==='IMG'){e.preventDefault();}
  },true);
})();
`;

/** Block common DevTools keyboard shortcuts and show a warning overlay on open. */
const DEVTOOLS_DETERRENT = `
(function(){
  // Block F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U (view-source)
  document.addEventListener('keydown',function(e){
    if(
      e.key==='F12'||
      (e.ctrlKey&&e.shiftKey&&(e.key==='I'||e.key==='i'||e.key==='J'||e.key==='j'))||
      (e.ctrlKey&&(e.key==='U'||e.key==='u'))
    ){
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  },true);

  // Soft warning overlay shown when DevTools window is detected open
  var _warned=false;
  var _overlay=null;
  function showWarning(){
    if(_warned)return;
    _warned=true;
    var o=document.createElement('div');
    o.id='__dt-warn';
    o.setAttribute('style',[
      'position:fixed','top:0','left:0','width:100%','padding:14px 20px',
      'background:#0c0e12','color:#f4f6f8','font-family:sans-serif',
      'font-size:14px','z-index:2147483647','display:flex',
      'align-items:center','justify-content:space-between','gap:16px',
      'box-shadow:0 4px 24px rgba(0,0,0,.4)','border-bottom:1px solid rgba(255,255,255,.1)'
    ].join(';'));
    o.innerHTML='⚠️ <strong style="color:#00b8a9">prynth!</strong>&nbsp;'
      +'This site is protected. Unauthorised inspection or reproduction of code is prohibited.'
      +'<button onclick="this.parentNode.remove()" style="'
      +'background:transparent;border:1px solid rgba(255,255,255,.2);color:#f3f1ec;'
      +'padding:4px 12px;border-radius:6px;cursor:pointer;font-size:12px;">Dismiss</button>';
    document.body.appendChild(o);
    _overlay=o;
    // Clear console so casual state inspection is harder
    try{console.clear();}catch(e){}
  }
  function hideWarning(){
    _warned=false;
    if(_overlay){_overlay.remove();_overlay=null;}
  }
  // Heuristic: if the browser window gets much wider than the viewport,
  // DevTools panel is likely docked to the side.
  var _threshold=160;
  function checkDevTools(){
    if (window.innerWidth < 768) return;
    var open=(
      window.outerWidth-window.innerWidth>_threshold||
      window.outerHeight-window.innerHeight>_threshold
    );
    if(open){showWarning();}else{hideWarning();}
  }
  setInterval(checkDevTools,1500);
})();
`;

export const Route = createRootRoute({
  loader: async () => {
    const settings = await getSiteSettings();
    return { settings };
  },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "Prynth — 3D Printing Services & Custom 3D Printed Products in India" },
      {
        name: "description",
        content:
          "Prynth is an on-demand 3D printing studio based in Mumbai, India. Custom rapid prototyping, CAD design, online 3D printing quotes, and modern functional desk accessories shipped across India.",
      },
      {
        name: "keywords",
        content:
          "3d printing services, 3d printed products, 3d printing india, custom 3d printing, rapid prototyping, mumbai 3d printing, stl 3d print, desk accessories, prynth, additive manufacturing",
      },
      { name: "author", content: "Prynth" },
      { name: "robots", content: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" },
      { name: "theme-color", content: "#F6F5F2" },
      {
        property: "og:site_name",
        content: "Prynth",
      },
      {
        property: "og:type",
        content: "website",
      },
      {
        property: "og:title",
        content: "Prynth — 3D Printing Services & Custom 3D Printed Products in India",
      },
      {
        property: "og:description",
        content:
          "Quality 3D printing services and modern functional prints at honest prices. Ready-made pieces and custom print or design, ships across India.",
      },
      {
        property: "og:image",
        content: "https://prynth.in/og.jpg",
      },
      {
        name: "twitter:card",
        content: "summary_large_image",
      },
      {
        name: "twitter:title",
        content: "Prynth — 3D Printing Services & Custom 3D Printed Products in India",
      },
      {
        name: "twitter:description",
        content:
          "Quality 3D printing services and modern functional prints at honest prices. Ready-made pieces and custom print or design, ships across India.",
      },
      {
        name: "twitter:image",
        content: "https://prynth.in/og.jpg",
      },
      {
        name: "strix-verification",
        content: "strix-verify-e881dc2df817534b0d76e030da14de8e",
      },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "icon", type: "image/x-icon", href: "/favicon.ico" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32x32.png" },
      { rel: "icon", type: "image/png", sizes: "16x16", href: "/favicon-16x16.png" },
      { rel: "stylesheet", href: appCss },
      { rel: "apple-touch-icon", href: "/brand/mark.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "preload",
        as: "style",
        href: "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap",
      },
    ],
  }),
  component: Root,
});

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
    },
  },
});

const SITE_JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://prynth.in/#website",
      "url": "https://prynth.in/",
      "name": "Prynth",
      "alternateName": ["prynth!", "Prynth 3D", "Prynth India", "Prynth Studio"],
      "description": "On-demand 3D printing services, CAD design, and modern 3D printed desk accessories in India.",
      "publisher": { "@id": "https://prynth.in/#organization" },
      "inLanguage": "en-IN",
    },
    {
      "@type": ["Store", "LocalBusiness"],
      "@id": "https://prynth.in/#organization",
      "name": "Prynth",
      "legalName": "Prynth 3D Printing Studio",
      "alternateName": ["prynth!", "Prynth 3D", "Prynth India"],
      "url": "https://prynth.in/",
      "logo": "https://prynth.in/brand/mark.png",
      "image": "https://prynth.in/og.jpg",
      "description": "Prynth is an on-demand 3D printing studio based in Mumbai, India. We provide instant custom 3D printing from STL/3MF files, CAD modeling, rapid prototyping, and high-quality ready-made functional desk and home products with nationwide delivery.",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": "Mumbai",
        "addressRegion": "Maharashtra",
        "postalCode": "400001",
        "addressCountry": "IN",
      },
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": 19.0760,
        "longitude": 72.8777,
      },
      "areaServed": {
        "@type": "Country",
        "name": "India",
      },
      "priceRange": "₹₹",
      "currenciesAccepted": "INR",
      "paymentAccepted": "Cash on Delivery, UPI, Credit Card, Debit Card, Net Banking",
      "openingHoursSpecification": [
        {
          "@type": "OpeningHoursSpecification",
          "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
          "opens": "09:00",
          "closes": "20:00",
        },
      ],
      "sameAs": [
        "https://www.instagram.com/prynth.in",
        "https://twitter.com/prynth_in",
      ],
    },
  ],
};

function Root() {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
        {/* Structured Data: WebSite and LocalBusiness/Store Entity schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(SITE_JSON_LD) }}
        />
        {/* Google Consent Mode v2 default — privacy-first: all tracking denied until explicit consent */}
        <script
          id="consent-mode-init"
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('consent', 'default', {
  'analytics_storage': 'denied',
  'ad_storage': 'denied',
  'ad_user_data': 'denied',
  'ad_personalization': 'denied'
});`,
          }}
        />
        <meta name="strix-verification" content="strix-verify-e881dc2df817534b0d76e030da14de8e" />
        {/* Theme boot — must be first so no flash */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
        {/* Security: disable image right-click and drag */}
        <script dangerouslySetInnerHTML={{ __html: DISABLE_IMG_CONTEXT_MENU }} />
        {/* Security: DevTools soft deterrent + keyboard shortcut blocking */}
        <script dangerouslySetInnerHTML={{ __html: DEVTOOLS_DETERRENT }} />
        {/* Razorpay Standard Web Checkout SDK */}
        <script src="https://checkout.razorpay.com/v1/checkout.js" async />
      </head>
      <body className="antialiased">
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <ThemeProvider>
              <SiteShell>
                <Outlet />
              </SiteShell>
              <CookieConsent />
              <CartSync />
              <Toaster
                position="top-center"
                richColors={false}
                toastOptions={{
                  className: "!bg-surface !text-fg !border-border !shadow-[var(--shadow-border)]",
                }}
              />
            </ThemeProvider>
          </AuthProvider>
        </QueryClientProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
