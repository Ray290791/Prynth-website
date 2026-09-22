import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";

export function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check if consent has already been given or denied
    const consent = localStorage.getItem("prynth-cookie-consent");
    if (!consent) {
      setShowBanner(true);
    } else if (consent === "granted") {
      loadGoogleAnalytics();
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("prynth-cookie-consent", "granted");
    setShowBanner(false);
    loadGoogleAnalytics();
  };

  const handleDecline = () => {
    localStorage.setItem("prynth-cookie-consent", "denied");
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 z-[9999] pointer-events-none flex justify-center sm:p-6">
      <div className="bg-glass backdrop-blur-2xl backdrop-saturate-150 border border-glass-border rounded-xl shadow-xl shadow-black/5 max-w-4xl w-full p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pointer-events-auto">
        <div className="text-sm text-fg/80 flex-1">
          <p className="font-medium text-fg mb-1">We use cookies</p>
          We use cookies and similar technologies to measure site traffic and improve your experience. 
          By clicking "Accept", you consent to our use of these technologies. 
          Read our <Link to="/privacy" className="underline hover:text-fg">Privacy Policy</Link> for more information.
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto shrink-0">
          <button
            onClick={handleDecline}
            className="flex-1 sm:flex-none px-4 py-2 text-sm font-medium border border-border rounded-lg hover:bg-hover transition-colors"
          >
            Decline
          </button>
          <button
            onClick={handleAccept}
            className="flex-1 sm:flex-none px-4 py-2 text-sm font-medium bg-brand text-brand-fg rounded-lg hover:brightness-110 transition-colors"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}

function loadGoogleAnalytics() {
  // Avoid loading multiple times
  if (document.getElementById("ga-script")) return;

  const GA_MEASUREMENT_ID = "G-XXXXXXXXXX"; // Placeholder GA ID

  const script1 = document.createElement("script");
  script1.id = "ga-script";
  script1.async = true;
  script1.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script1);

  const script2 = document.createElement("script");
  script2.id = "ga-script-init";
  script2.innerHTML = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${GA_MEASUREMENT_ID}');
  `;
  document.head.appendChild(script2);
}
