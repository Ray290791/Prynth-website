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
import { PreviewHostBridge } from "@/components/preview-host-bridge";
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
      'background:#1e2124','color:#f3f1ec','font-family:sans-serif',
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
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: APP_NAME },
      {
        name: "description",
        content:
          "prynth! — quality 3D prints at honest prices. Ready-made pieces and custom print or design, ships across India.",
      },
      { name: "theme-color", content: "#F6F5F2" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "apple-touch-icon", href: "/brand/mark.png" },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
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

const queryClient = new QueryClient();

function Root() {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
        {/* Theme boot — must be first so no flash */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
        {/* Security: disable image right-click and drag */}
        <script dangerouslySetInnerHTML={{ __html: DISABLE_IMG_CONTEXT_MENU }} />
        {/* Security: DevTools soft deterrent + keyboard shortcut blocking */}
        <script dangerouslySetInnerHTML={{ __html: DEVTOOLS_DETERRENT }} />
      </head>
      <body className="antialiased">
        <PreviewHostBridge />
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <ThemeProvider>
              <SiteShell>
                <Outlet />
              </SiteShell>
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
