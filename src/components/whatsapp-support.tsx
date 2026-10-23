import { useState, useEffect } from "react";
import { MessageCircle, X } from "lucide-react";
import { useLocation } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getSiteSettings } from "@/lib/settings-fns";

export function getCleanWhatsAppNumber(rawNumber?: string): string {
  if (!rawNumber) return "919999999999";
  const cleaned = rawNumber.replace(/[^\d]/g, "");
  // If 10 digits (India domestic), prepend country code 91
  if (cleaned.length === 10) return `91${cleaned}`;
  return cleaned;
}

export function buildWhatsAppUrl(phone: string, text: string): string {
  const cleanPhone = getCleanWhatsAppNumber(phone);
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text.trim())}`;
}

export function WhatsAppFloatingWidget() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [hasPrompted, setHasPrompted] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ["siteSettings"],
    queryFn: () => getSiteSettings(),
  });

  const isEnabled = settings?.whatsapp_enabled === "true";
  if (!isEnabled) return null;

  const rawPhone = settings?.contact_whatsapp || settings?.contact_phone || "";
  if (!rawPhone.trim()) return null;
  const cleanPhone = getCleanWhatsAppNumber(rawPhone);

  // Generate context-aware prompt based on the current page
  const pathname = location.pathname;

  let defaultPrompt = "Hi Prynth! I have a question about 3D printing services and products on prynth.in.";
  let badgeText = "Chat with Studio";

  if (pathname.startsWith("/shop/")) {
    const slug = pathname.replace("/shop/", "").split("?")[0];
    const formattedSlug = slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    defaultPrompt = `Hi Prynth! I'm interested in the "${formattedSlug}" on prynth.in. Do you have this ready to ship from Mumbai?`;
    badgeText = "Ask about this print";
  } else if (pathname === "/custom") {
    defaultPrompt = "Hi Prynth! I'm planning a custom 3D printing project. Can I share my 3D CAD/mesh file for a quick feasibility check?";
    badgeText = "Custom Quote Help";
  } else if (pathname === "/pegboard") {
    defaultPrompt = "Hi Prynth! I'm configuring a modular desk pegboard. Can you help me size the tiles and accessories?";
    badgeText = "Pegboard Advice";
  } else if (pathname === "/lithophane") {
    defaultPrompt = "Hi Prynth! I want to order a custom 3D lithophane light panel. Can you check if my photo resolution works?";
    badgeText = "Photo Check";
  } else if (pathname === "/gallery") {
    defaultPrompt = "Hi Prynth! I saw the print quality in your gallery. Can you produce something similar for my project?";
    badgeText = "Inquire About Prints";
  }

  // Auto-show a subtle prompt tooltip after 8 seconds on first visit
  useEffect(() => {
    const hasSeen = sessionStorage.getItem("prynth_wa_prompt_seen");
    if (!hasSeen && !hasPrompted) {
      const timer = setTimeout(() => {
        setIsOpen(true);
        setHasPrompted(true);
        sessionStorage.setItem("prynth_wa_prompt_seen", "true");
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [hasPrompted]);

  const handleOpenWhatsApp = () => {
    const url = buildWhatsAppUrl(cleanPhone, defaultPrompt);
    window.open(url, "_blank", "noopener,noreferrer");
    setIsOpen(false);
  };

  return (
    <aside
      aria-label="WhatsApp Studio Support"
      className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-2 print:hidden"
    >
      {/* Speech Bubble / Mini Prompt */}
      {isOpen && (
        <div className="relative max-w-xs rounded-2xl border border-border bg-surface/95 p-3.5 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-200">
          <button
            onClick={() => setIsOpen(false)}
            aria-label="Dismiss WhatsApp helper"
            className="absolute top-2 right-2 rounded-full p-1 text-muted hover:bg-surface-2 hover:text-fg transition-colors"
          >
            <X className="size-3.5" />
          </button>
          <div className="flex items-center gap-2 pr-4">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-xs font-semibold text-fg">Prynth Studio · Online</p>
          </div>
          <p className="mt-1 text-xs text-muted leading-relaxed">
            Need material advice or quick feasibility on a print? Chat with our team in Mumbai.
          </p>
          <button
            onClick={handleOpenWhatsApp}
            className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#25D366] px-3 py-1.5 text-xs font-medium text-white shadow-xs hover:bg-[#20ba59] transition-all cursor-pointer"
          >
            <MessageCircle className="size-3.5 fill-current" />
            <span>Open WhatsApp Chat</span>
          </button>
        </div>
      )}

      {/* Main Floating Trigger Button */}
      <button
        onClick={() => {
          if (!isOpen) {
            handleOpenWhatsApp();
          } else {
            setIsOpen(false);
          }
        }}
        onMouseEnter={() => !isOpen && setIsOpen(true)}
        aria-label="Contact Prynth Studio on WhatsApp"
        className="group relative flex items-center gap-2 rounded-full bg-[#25D366] p-3 text-white shadow-lg shadow-[#25D366]/30 hover:shadow-xl hover:shadow-[#25D366]/40 hover:scale-105 active:scale-95 transition-all cursor-pointer"
      >
        <MessageCircle className="size-6 fill-current" />
        <span className="hidden md:inline-block max-w-0 overflow-hidden whitespace-nowrap text-xs font-semibold group-hover:max-w-xs transition-all duration-300 pr-1">
          {badgeText}
        </span>
        <span className="absolute -top-1 -right-1 flex size-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full size-3 bg-emerald-500"></span>
        </span>
      </button>
    </aside>
  );
}

/**
 * Inline contextual button for use directly inside PDPs, Custom Studio, or Cart
 */
export function WhatsAppInlineButton({
  text = "Chat on WhatsApp",
  message,
  className = "",
}: {
  text?: string;
  message?: string;
  className?: string;
}) {
  const { data: settings } = useQuery({
    queryKey: ["siteSettings"],
    queryFn: () => getSiteSettings(),
  });

  const isEnabled = settings?.whatsapp_enabled === "true";
  if (!isEnabled) return null;

  const rawPhone = settings?.contact_whatsapp || settings?.contact_phone || "";
  if (!rawPhone.trim()) return null;
  const cleanPhone = getCleanWhatsAppNumber(rawPhone);
  const prompt = message || "Hi Prynth! I have a question about 3D printing.";

  return (
    <a
      href={buildWhatsAppUrl(cleanPhone, prompt)}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-600/30 bg-emerald-500/10 px-4 py-2.5 text-xs sm:text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-all ${className}`}
    >
      <MessageCircle className="size-4 fill-emerald-600 dark:fill-emerald-400" />
      <span>{text}</span>
    </a>
  );
}
