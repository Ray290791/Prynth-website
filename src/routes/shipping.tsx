import { createFileRoute, Link, getRouteApi } from "@tanstack/react-router";
import { generateBreadcrumbJsonLd } from "@/lib/jsonld";
import { Truck, Clock, ShieldCheck, Box, Zap, MapPin, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/format";

const rootRoute = getRouteApi("__root__");

export const Route = createFileRoute("/shipping")({
  component: ShippingPage,
  head: () => ({
    links: [
      { rel: "canonical", href: "https://prynth.in/shipping" },
    ],
    meta: [
      { title: "Shipping & Delivery Policy | Prynth India" },
      {
        name: "description",
        content:
          "Fast, insured shipping across India. Standard 3–5 day delivery, Express air courier options, and free standard delivery on qualifying orders.",
      },
      { property: "og:title", content: "Shipping & Delivery Policy | Prynth India" },
      {
        property: "og:description",
        content:
          "Fast, insured shipping across India. Standard 3–5 day delivery, Express air courier options, and free standard delivery on qualifying orders.",
      },
      { property: "og:url", content: "https://prynth.in/shipping" },
    ],
  }),
});

export function ShippingPage() {
  const { settings } = rootRoute.useLoaderData();

  const standardFee = Number(settings.standard_shipping_fee || 79);
  const expressFee = Number(settings.express_shipping_fee || 189);
  const freeThreshold = Number(settings.free_shipping_threshold || 399);
  const codFee = Number(settings.cod_fee || 39);
  const codEnabled = settings.cod_enabled === "true";
  const turnaroundMin = parseInt(settings.turnaround_min_days || "4", 10);
  const turnaroundMax = parseInt(settings.turnaround_max_days || "7", 10);

  let allowedStates: string[] = ["Maharashtra"];
  try {
    if (settings.allowed_delivery_states) {
      allowedStates = JSON.parse(settings.allowed_delivery_states);
    }
  } catch {
    allowedStates = ["Maharashtra"];
  }
  const isAllIndia = allowedStates.some((s) => s.toLowerCase() === "all india");
  const deliveryScopeText = isAllIndia
    ? "We ship across India."
    : `We currently deliver within ${allowedStates.join(", ")}. More states are opening soon.`;

  const couriers = [
    { name: "Blue Dart", badge: "Express Priority" },
    { name: "Delhivery", badge: "Surface & Air Logistics" },
    { name: "DTDC", badge: "Regional Direct" },
    { name: "India Post Speed Post", badge: "PIN Code Coverage" },
  ];

  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: "Home", url: "/" },
    { name: "Shipping Policy", url: "/shipping" },
  ]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 md:px-6 md:py-20 animate-in fade-in duration-300 space-y-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-3.5 py-1 text-xs font-semibold text-accent">
          <Truck className="size-3.5" />
          <span>{isAllIndia ? "Pan-India Logistics" : "Regional Delivery"}</span>
        </div>
        <h1 className="mt-4 font-display text-4xl sm:text-5xl font-semibold tracking-tight text-fg">
          Shipping &amp; Delivery
        </h1>
        <p className="mt-3 text-base sm:text-lg text-muted max-w-2xl leading-relaxed">
          Every object is manufactured to order in our print workshop, inspected by
          hand, and packaged carefully for safe transit. {deliveryScopeText}
        </p>
      </div>

      {/* Shipping Rates Comparison Grid */}
      <div className="grid gap-5 sm:grid-cols-2">
        {/* Standard Tier */}
        <div className="relative rounded-3xl border border-border bg-surface p-7 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted">
              Standard Delivery
            </span>
            <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-400">
              Free over {formatINR(freeThreshold)}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-3xl font-semibold text-fg">
              {formatINR(standardFee)}
            </span>
            <span className="text-xs text-muted">standard rate</span>
          </div>
          <p className="text-sm text-muted leading-relaxed">
            Delivered in <strong>{turnaroundMin}–{turnaroundMax} days</strong> total turnaround (print time plus transit). Ideal
            for everyday desk organizers, planters, and standard home pieces.
          </p>
        </div>

        {/* Express Tier */}
        <div className="relative rounded-3xl border border-accent/40 bg-accent/5 p-7 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-accent">
              Express Courier
            </span>
            <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-bold text-ink">
              Fastest Transit
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-3xl font-semibold text-fg">
              {formatINR(expressFee)}
            </span>
            <span className="text-xs text-muted">priority air shipping</span>
          </div>
          <p className="text-sm text-muted leading-relaxed">
            Delivered via priority express courier once manufactured. Best for time-sensitive gifts and urgent requirements.
          </p>
          <p className="text-[11px] text-muted/80 pt-1 border-t border-accent/20">
            Note: Free shipping thresholds apply strictly to Standard Delivery. Express priority air courier is charged on all orders.
          </p>
        </div>
      </div>

      {/* Production vs Delivery Clarification */}
      <div className="rounded-3xl border border-border bg-surface p-6 sm:p-8 space-y-4">
        <h2 className="font-display text-xl font-semibold text-fg flex items-center gap-2.5">
          <Clock className="size-5 text-accent" />
          <span>Understanding Print Time vs Transit Time</span>
        </h2>
        <div className="space-y-3 text-sm text-muted leading-relaxed">
          <p>
            Unlike a warehouse with pre-packed surplus, each order is individually
            printed using high-grade filaments.
          </p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              <strong>Ready-Made Pieces:</strong> Typically spend {turnaroundMin}–{turnaroundMax} days from print bed calibration to final packaging and dispatch.
            </li>
            <li>
              <strong>Delivery Coverage:</strong> {deliveryScopeText}
            </li>
            {codEnabled && (
              <li>
                <strong>Cash on Delivery (COD):</strong> Available across serviceable
                PIN codes with a nominal {formatINR(codFee)} collection surcharge.
              </li>
            )}
          </ul>
        </div>
      </div>

      {/* Courier Partners */}
      <div className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted">
          Trusted Courier Partners &amp; Tracking
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {couriers.map((c) => (
            <div
              key={c.name}
              className="p-4 rounded-2xl border border-border bg-surface text-center space-y-1"
            >
              <span className="block text-sm font-semibold text-fg">{c.name}</span>
              <span className="block text-[11px] text-muted">{c.badge}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted">
          As soon as your package leaves our bench, an AWB tracking link is
          automatically emailed to you so you can follow its live progress.
        </p>
      </div>

      {/* Footer Support Card */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 rounded-3xl border border-border bg-surface-2/60">
        <div>
          <span className="text-sm font-semibold text-fg block">
            Have questions regarding your delivery address or PIN code?
          </span>
          <span className="text-xs text-muted block mt-0.5">
            Contact us anytime at{" "}
            <a
              href={`mailto:${settings.contact_email || settings.email}`}
              className="text-accent underline"
            >
              {settings.contact_email || settings.email}
            </a>
          </span>
        </div>
        <Button asChild variant="outline" className="shrink-0 cursor-pointer">
          <Link to="/contact">
            <span>Write to Studio</span>
            <ArrowRight className="size-4 ml-1" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
