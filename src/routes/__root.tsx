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
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
        {/* Mock Live Chat Widget */}
        <script dangerouslySetInnerHTML={{ __html: `
          window.mockLiveChat = function() { console.log('Live chat initialized'); };
          setTimeout(window.mockLiveChat, 2000);
        `}} />
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
