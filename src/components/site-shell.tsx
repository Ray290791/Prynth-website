import { useState, useEffect, type ReactNode } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Download } from "lucide-react";

export function SiteShell({ children }: { children: ReactNode }) {
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
    <div className="flex min-h-dvh flex-col bg-bg text-fg">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-accent focus:px-3 focus:py-2 focus:text-ink"
      >
        Skip to content
      </a>
      <SiteHeader />
      <main id="main" className="page-enter flex-1">
        {children}
      </main>
      <SiteFooter />
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
