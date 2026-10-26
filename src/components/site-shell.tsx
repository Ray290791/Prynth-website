import { useState, useEffect, type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { CartSideRibbon } from "@/components/cart-side-ribbon";
import { WhatsAppFloatingWidget } from "@/components/whatsapp-support";
import { SilkWaveBackground } from "@/components/silk-wave-background";
import { Download } from "lucide-react";

export function SiteShell({ children }: { children: ReactNode }) {
  const isHome = useRouterState({
    select: (s) => s.location.pathname === "/",
  });
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // Dismiss "Add to Home Screen" floating window after 10 seconds
  useEffect(() => {
    if (!showPrompt) return;
    const timer = setTimeout(() => {
      setShowPrompt(false);
    }, 10000);
    return () => clearTimeout(timer);
  }, [showPrompt]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowPrompt(false);
    }
  };

  return (
    <div className="relative flex min-h-dvh flex-col bg-bg text-fg">
      {/* Full-Screen Interactive Silk Wave WebGL Background (subtle & higher transparency on all other pages) */}
      <SilkWaveBackground subtle={!isHome} />

      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-accent focus:px-3 focus:py-2 focus:text-ink"
      >
        Skip to content
      </a>
      <div className="relative z-20">
        <SiteHeader />
      </div>
      <main id="main" className="page-enter relative z-10 flex-1">
        {children}
      </main>
      <div className="relative z-10">
        <CartSideRibbon />
        <WhatsAppFloatingWidget />
        <SiteFooter />
      </div>
      {showPrompt && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-surface border border-border shadow-lg rounded-xl p-4 z-50 animate-in slide-in-from-bottom-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-semibold text-sm">Add Prynth to Home Screen</h3>
              <p className="text-xs text-muted mt-1">Install our app for faster access and a better experience.</p>
            </div>
            <button onClick={() => setShowPrompt(false)} className="text-muted hover:text-fg">
              <span className="sr-only">Close</span>
              &times;
            </button>
          </div>
          <button 
            onClick={handleInstallClick}
            className="mt-3 w-full flex items-center justify-center gap-2 bg-accent text-ink rounded-lg py-2 text-sm font-medium hover:opacity-90"
          >
            <Download className="size-4" />
            Install App
          </button>
        </div>
      )}
    </div>
  );
}
