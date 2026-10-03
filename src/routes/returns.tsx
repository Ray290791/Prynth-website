import { createFileRoute, Link, getRouteApi } from "@tanstack/react-router";
import { RotateCcw, ShieldCheck, CheckCircle2, AlertCircle, ArrowRight, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const rootRoute = getRouteApi("__root__");

export const Route = createFileRoute("/returns")({
  component: ReturnsPage,
  head: () => ({
    meta: [
      { title: "Returns & Refund Policy | prynth!" },
      {
        name: "description",
        content:
          "Our straightforward 7-day guarantee. If something arrives damaged or off, we reprint it or issue a prompt refund within 5–7 business days.",
      },
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

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 md:px-6 md:py-20 animate-in fade-in duration-300 space-y-12">
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
