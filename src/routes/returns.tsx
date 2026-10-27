import { createFileRoute, Link, getRouteApi } from "@tanstack/react-router";
import { generateBreadcrumbJsonLd } from "@/lib/jsonld";
import { RotateCcw, ShieldCheck, CheckCircle2, AlertCircle, ArrowRight, HelpCircle, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";

const rootRoute = getRouteApi("__root__");

export const Route = createFileRoute("/returns")({
  component: ReturnsPage,
  head: () => ({
    links: [
      { rel: "canonical", href: "https://prynth.in/returns" },
    ],
    meta: [
      { title: "Returns & Refund Policy | Prynth India" },
      {
        name: "description",
        content:
          "7-day replacement guarantee by Prynth. If your 3D print arrives damaged or defective, we reprint it free or issue a prompt refund within 5–7 business days.",
      },
      { property: "og:title", content: "Returns & Refund Policy | Prynth India" },
      {
        property: "og:description",
        content:
          "7-day replacement guarantee by Prynth. If your 3D print arrives damaged or defective, we reprint it free or issue a prompt refund within 5–7 business days.",
      },
      { property: "og:url", content: "https://prynth.in/returns" },
    ],
  }),
});

export function ReturnsPage() {
  const { settings } = rootRoute.useLoaderData();
  const supportEmail = settings.contact_email || settings.email || "hello@prynth.in";

  const steps = [
    {
      step: "01",
      title: "Take a Photo",
      desc: "If an item arrives damaged or incomplete, photograph the issue within 7 days of courier delivery.",
    },
    {
      step: "02",
      title: "Email with Order #",
      desc: `Send the photos to ${supportEmail} along with your PRY- order number.`,
    },
    {
      step: "03",
      title: "Instant Reprint or Refund",
      desc: "We promptly reprint your piece at zero extra charge, or issue a full refund within 5–7 business days.",
    },
  ];

  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: "Home", url: "/" },
    { name: "Returns Policy", url: "/returns" },
  ]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 md:px-6 md:py-20 animate-in fade-in duration-300 space-y-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-1 text-xs font-semibold text-emerald-400">
          <ShieldCheck className="size-3.5" />
          <span>7-Day Quality Promise</span>
        </div>
        <h1 className="mt-4 font-display text-4xl sm:text-5xl font-semibold tracking-tight text-fg">
          Returns &amp; Refunds
        </h1>
        <p className="mt-3 text-base sm:text-lg text-muted max-w-2xl leading-relaxed">
          No restocking riddle, no automated hurdles. If we made an error or a
          package had a rough courier journey, we make it right.
        </p>
      </div>

      {/* 3 Step Visual Progression */}
      <div className="grid gap-4 sm:grid-cols-3">
        {steps.map((s) => (
          <div
            key={s.step}
            className="p-6 rounded-3xl border border-border bg-surface space-y-3 shadow-xs"
          >
            <span className="font-mono text-xs font-bold text-accent">
              {s.step}
            </span>
            <h2 className="font-display text-lg font-semibold text-fg">
              {s.title}
            </h2>
            <p className="text-xs text-muted leading-relaxed">{s.desc}</p>
          </div>
        ))}
      </div>

      {/* Policy Details */}
      <div className="space-y-6 rounded-3xl border border-border bg-surface p-6 sm:p-8">
        <div>
          <h2 className="font-display text-xl font-semibold text-fg">
            Our Clear Guarantee
          </h2>
          <div className="mt-3 space-y-3 text-sm text-muted leading-relaxed">
            {settings.returns_policy.split("\n\n").map((paragraph, i) => (
              <p key={i} className="whitespace-pre-wrap">
                {paragraph}
              </p>
            ))}
          </div>
        </div>

        {/* Custom vs Ready-Made Policy Grid */}
        <div className="grid gap-4 sm:grid-cols-2 pt-4">
          <div className="rounded-2xl border border-border/80 bg-surface-2/40 p-5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-accent font-semibold">
              <CheckCircle2 className="size-4" />
              <span>Ready-Made Items</span>
            </div>
            <h3 className="font-display text-base font-semibold text-fg">Catalog Desk &amp; Home Pieces</h3>
            <ul className="text-xs text-muted space-y-2 list-disc pl-4 leading-relaxed">
              <li><strong>7-day replacement guarantee</strong> for pieces damaged in courier transit or defective on arrival.</li>
              <li>Change-of-mind returns accepted for unused, unaltered pieces in original packaging.</li>
              <li>Outbound product amount refunded upon safe return inspection.</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-accent/30 bg-accent/5 p-5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-accent font-semibold">
              <Layers className="size-4" />
              <span>Custom Made-to-Order</span>
            </div>
            <h3 className="font-display text-base font-semibold text-fg">Client 3D Models &amp; Lithophanes</h3>
            <ul className="text-xs text-muted space-y-2 list-disc pl-4 leading-relaxed">
              <li><strong>Zero-Flaw Guarantee:</strong> 100% free priority reprint OR full refund if the piece arrives damaged, warped, or out of spec (&gt;0.5% tolerance).</li>
              <li>Non-returnable for change of mind once material slicing and printing commences on the machine bed.</li>
              <li>Report within 48h to 7 days of delivery with photos to <strong className="text-fg">{supportEmail}</strong>.</li>
            </ul>
          </div>
        </div>

        {/* Refund Timelines Card */}
        <div className="pt-6 border-t border-border/60 space-y-3">
          <h3 className="font-display text-base font-semibold text-fg flex items-center gap-2">
            <CheckCircle2 className="size-4.5 text-accent" />
            <span>Refund Processing &amp; Bank Timelines</span>
          </h3>
          <p className="text-sm text-muted leading-relaxed">
            Once approved, refunds are credited back to your original mode of
            payment (Bank, UPI, or Card via Razorpay) within{" "}
            <strong className="text-fg">5 to 7 business days</strong>.
          </p>
          <p className="text-sm text-muted leading-relaxed">
            For Cash on Delivery (COD) orders, refunds are settled via direct NEFT /
            IMPS bank transfer or instant UPI once verified with our team.
          </p>
        </div>

        {/* Cancellations */}
        <div className="pt-6 border-t border-border/60 space-y-3">
          <h3 className="font-display text-base font-semibold text-fg flex items-center gap-2">
            <AlertCircle className="size-4.5 text-amber-400" />
            <span>Order Cancellations</span>
          </h3>
          <p className="text-sm text-muted leading-relaxed">
            Orders can be cancelled before printing begins. Because 3D printing
            involves dedicated material extrusion tailored to your selected size
            and color, once a piece is running on the printer, cancellation is no
            longer possible.
          </p>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 rounded-3xl border border-border bg-surface-2/60">
        <div>
          <span className="text-sm font-semibold text-fg block">
            Need help with an item or cancellation?
          </span>
          <span className="text-xs text-muted block mt-0.5">
            Email us directly at{" "}
            <a href={`mailto:${supportEmail}`} className="text-accent underline">
              {supportEmail}
            </a>
          </span>
        </div>
        <Button asChild variant="outline" className="shrink-0 cursor-pointer">
          <Link to="/contact">
            <span>Contact Support</span>
            <ArrowRight className="size-4 ml-1" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
