import { useState, useEffect } from "react";
import { getRouteApi } from "@tanstack/react-router";
import { Truck, CheckCircle2, MapPin, Sparkles, AlertCircle } from "lucide-react";
import { formatINR } from "@/lib/format";

const rootRoute = getRouteApi("__root__");

interface PincodeEstimate {
  zone: string;
  days: string;
  speed: string;
  courier: string;
}

export function calculateDeliveryEstimate(pincode: string): PincodeEstimate | null {
  const pin = pincode.trim();
  if (!/^\d{6}$/.test(pin)) return null;

  // 400xxx: Mumbai, Navi Mumbai, Thane
  if (pin.startsWith("400") || pin.startsWith("401")) {
    return {
      zone: "Mumbai Metropolitan Region",
      days: "1–2 business days",
      speed: "Fastest Local Courier",
      courier: "Dispatches direct from our Mumbai studio within 24 hrs",
    };
  }

  // 410xxx - 449xxx: Rest of Maharashtra & Goa
  if (/^4[1-4]\d{4}$/.test(pin)) {
    return {
      zone: "Maharashtra & Western Zone",
      days: "2–3 business days",
      speed: "Express Surface / Regional Air",
      courier: "Bluedart / Delhivery Express",
    };
  }

  // Tier 1 Metro Air Pincodes (Delhi NCR, Bengaluru, Hyderabad, Chennai, Kolkata, Ahmedabad)
  if (
    pin.startsWith("11") || // Delhi
    pin.startsWith("12") || // Haryana / Gurgaon / Faridabad
    pin.startsWith("20") || // Noida / Ghaziabad
    pin.startsWith("56") || // Bengaluru
    pin.startsWith("50") || // Hyderabad
    pin.startsWith("60") || // Chennai
    pin.startsWith("70") || // Kolkata
    pin.startsWith("38")    // Ahmedabad
  ) {
    return {
      zone: "Tier 1 Metro (Direct Air Corridor)",
      days: "2–3 business days",
      speed: "Priority Express Air",
      courier: "Dispatches from Mumbai Airport hub via Express Air",
    };
  }

  // Rest of India
  return {
    zone: "Rest of India (All States & UTs)",
    days: "3–5 business days",
    speed: "Standard Express Air",
    courier: "Nationwide doorstep delivery via Bluedart / Delhivery",
  };
}

export function PincodeEstimator({
  itemPrice = 349,
  compact = false,
  className = "",
}: {
  itemPrice?: number;
  compact?: boolean;
  className?: string;
}) {
  const rootData = rootRoute.useLoaderData();
  const freeThreshold = Number(rootData?.settings?.free_shipping_threshold) || 349;
  const standardFee = Number(rootData?.settings?.standard_shipping_fee) || 79;

  const [pincode, setPincode] = useState("");
  const [estimate, setEstimate] = useState<PincodeEstimate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  // Initialize from saved pincode
  useEffect(() => {
    try {
      const saved = localStorage.getItem("prynth_user_pincode");
      if (saved && /^\d{6}$/.test(saved)) {
        setPincode(saved);
        setEstimate(calculateDeliveryEstimate(saved));
        setChecked(true);
      }
    } catch {}
  }, []);

  const handleCheck = (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);

    const clean = pincode.trim();
    if (!/^\d{6}$/.test(clean)) {
      setError("Please enter a valid 6-digit Indian PIN code");
      setEstimate(null);
      return;
    }

    const est = calculateDeliveryEstimate(clean);
    setEstimate(est);
    setChecked(true);

    try {
      localStorage.setItem("prynth_user_pincode", clean);
    } catch {}
  };

  const isFreeDelivery = itemPrice >= freeThreshold;

  return (
    <div
      className={`rounded-2xl border border-border/80 bg-surface/50 p-3.5 sm:p-4 backdrop-blur-xs transition-all ${className}`}
    >
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted">
        <Truck className="size-4 text-accent" />
        <span>Delivery & Transit Estimator</span>
      </div>

      <form onSubmit={handleCheck} className="mt-2.5 flex items-center gap-2">
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted pointer-events-none" />
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="Enter 6-digit PIN code"
            value={pincode}
            onChange={(e) => {
              const val = e.target.value.replace(/[^\d]/g, "").slice(0, 6);
              setPincode(val);
              if (error) setError(null);
            }}
            className="w-full rounded-xl border border-border bg-surface-2 pl-9 pr-3 py-2 text-xs sm:text-sm font-mono placeholder:font-sans placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
        <button
          type="submit"
          className="shrink-0 rounded-xl bg-surface-2 border border-border px-3.5 py-2 text-xs sm:text-sm font-semibold hover:bg-accent hover:text-ink hover:border-accent transition-all cursor-pointer"
        >
          Check
        </button>
      </form>

      {error && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-danger animate-in fade-in">
          <AlertCircle className="size-3.5 shrink-0" />
          {error}
        </p>
      )}

      {estimate && checked && (
        <div className="mt-3 pt-3 border-t border-border/60 animate-in fade-in duration-200 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs sm:text-sm font-semibold text-fg flex items-center gap-1.5">
                <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                <span>Estimated: <span className="text-accent underline decoration-accent/40">{estimate.days}</span></span>
              </p>
              <p className="text-[11px] sm:text-xs text-muted mt-0.5">
                {estimate.courier}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
              {estimate.speed}
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px] text-muted pt-1">
            <span className="flex items-center gap-1">
              <Sparkles className="size-3 text-accent" />
              {isFreeDelivery ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                  Free Delivery applied (orders over {formatINR(freeThreshold)})
                </span>
              ) : (
                <span>Standard flat shipping {formatINR(standardFee)} (Free over {formatINR(freeThreshold)})</span>
              )}
            </span>
            <span className="text-[10px] uppercase font-mono text-muted/70">From Mumbai 400001</span>
          </div>
        </div>
      )}
    </div>
  );
}
