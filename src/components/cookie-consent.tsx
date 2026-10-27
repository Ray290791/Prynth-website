import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

const GA_ID = "G-R1LGD7FBVN";

function updateConsent(granted: boolean) {
  if (typeof window === "undefined") return;
  const status = granted ? "granted" : "denied";
  (window as any).dataLayer = (window as any).dataLayer || [];
  function gtag(...args: any[]) {
    (window as any).dataLayer.push(args);
  }
  gtag("consent", "update", {
    analytics_storage: status,
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
}

export function openCookiePreferences() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("prynth:open-cookie-preferences"));
  }
}

export function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check if consent has already been given or denied
    const consent = localStorage.getItem("prynth-cookie-consent");
    if (!consent) {
      setShowBanner(true);
      updateConsent(false);
    } else if (consent === "denied") {
      if (typeof window !== "undefined") {
        (window as any)[`ga-disable-${GA_ID}`] = true;
      }
      updateConsent(false);
    } else if (consent === "granted") {
      updateConsent(true);
      loadGoogleAnalytics();
    }

    const handleOpen = () => setShowBanner(true);
    window.addEventListener("prynth:open-cookie-preferences", handleOpen);
    return () => window.removeEventListener("prynth:open-cookie-preferences", handleOpen);
  }, []);

  const handleAccept = () => {
    localStorage.setItem("prynth-cookie-consent", "granted");
    setShowBanner(false);
    if (typeof window !== "undefined") {
      (window as any)[`ga-disable-${GA_ID}`] = false;
    }
    updateConsent(true);
    loadGoogleAnalytics();
  };

  const handleDecline = () => {
    localStorage.setItem("prynth-cookie-consent", "denied");
    setShowBanner(false);
    if (typeof window !== "undefined") {
      (window as any)[`ga-disable-${GA_ID}`] = true;
    }
    updateConsent(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 z-[9999] pointer-events-none flex justify-center sm:p-6">
      <div className="bg-surface/98 dark:bg-surface/98 backdrop-blur-3xl border border-border rounded-2xl shadow-2xl shadow-black/20 max-w-4xl w-full p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pointer-events-auto">
        <div className="text-sm text-fg/80 flex-1">
          <p className="font-medium text-fg mb-1">Cookie &amp; Privacy Preferences</p>
          We use strictly necessary cookies to keep your cart and theme preferences synchronized. 
          With your permission, we also use optional privacy-preserving analytics to understand traffic. 
          You can choose to accept or decline analytics. 
          Read our <Link to="/privacy" className="underline hover:text-fg font-medium">Privacy Policy</Link> for full details.
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDecline}
            className="flex-1 sm:flex-none cursor-pointer"
          >
            Decline
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleAccept}
            className="flex-1 sm:flex-none shadow-sm cursor-pointer"
          >
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
}

function loadGoogleAnalytics() {
  if (typeof window === "undefined") return;
  (window as any)[`ga-disable-${GA_ID}`] = false;

  // Avoid loading multiple times if already injected
  if (document.getElementById("ga-script")) return;

  const gaId = (typeof import.meta !== "undefined" ? import.meta.env?.VITE_GA_MEASUREMENT_ID : undefined) || GA_ID;
  if (!gaId || gaId === "G-XXXXXXXXXX") {
    return;
  }

  const script1 = document.createElement("script");
  script1.id = "ga-script";
  script1.async = true;
  script1.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
  document.head.appendChild(script1);

  const script2 = document.createElement("script");
  script2.id = "ga-script-init";
  script2.innerHTML = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('consent', 'update', {
      'analytics_storage': 'granted'
    });
    gtag('config', '${gaId}', {
      'anonymize_ip': true
    });
  `;
  document.head.appendChild(script2);
}
