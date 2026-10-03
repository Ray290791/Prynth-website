import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import { Scale, ShieldCheck, CreditCard, Box, AlertTriangle, Globe } from "lucide-react";

const rootRoute = getRouteApi("__root__");

export const Route = createFileRoute("/terms")({
  component: TermsPage,
  head: () => ({
    meta: [
      { title: "Terms & Conditions | prynth!" },
      {
        name: "description",
        content:
          "Terms and Conditions governing orders, custom 3D printing services, and website usage at prynth!.",
      },
    ],
  }),
});

export function TermsPage() {
  const { settings } = rootRoute.useLoaderData();
  const contactEmail = settings.contact_email || settings.email || "hello@prynth.in";
  const brandName = settings.brand_name || "prynth!";

  const sections = [
    {
      icon: Scale,
      title: "1. Agreement to Terms",
      body: `By browsing our website, placing an order, or uploading 3D files to ${brandName}, you agree to be bound by these Terms and Conditions, our Shipping Policy, and Privacy Policy. If you do not agree with any part, please refrain from using our services.`,
    },
    {
      icon: Box,
      title: "2. 3D Printed Products & Manufacturing Characteristics",
      body: "All items sold in our shop or custom printed on order are produced using additive manufacturing (FDM 3D printing). Layer lines, minor micro-textures, and microscopic filament seam variations are intrinsic physical characteristics of the technology and do not constitute manufacturing defects.",
    },
    {
      icon: CreditCard,
      title: "3. Pricing, Taxes & Secure Payments",
      body: "All product prices are quoted in Indian Rupees (INR). Payments are processed securely via Razorpay Software Private Limited. We support UPI, major Debit/Credit cards, Netbanking, and Cash on Delivery (where serviceable).",
    },
    {
      icon: AlertTriangle,
      title: "4. Custom Orders & Intellectual Property",
      body: `When submitting 3D models (.stl, .obj, .3mf, .step) or sketches for custom fabrication, you warrant that you possess all necessary intellectual property rights, licenses, or permissions to reproduce the design. ${brandName} reserves the right to decline manufacturing any model that violates copyright, is hazardous, or is prohibited by applicable Indian laws.`,
    },
    {
      icon: ShieldCheck,
      title: "5. Limitation of Liability",
      body: `${brandName} and its operators shall not be liable for any indirect, incidental, or consequential damages resulting from the use or inability to use manufactured goods beyond the purchase value of the product ordered.`,
    },
    {
      icon: Globe,
      title: "6. Governing Law & Dispute Resolution",
      body: "These Terms and all purchase agreements shall be governed by and interpreted in accordance with the laws of India. Any disputes arising in connection with orders shall be subject to the exclusive jurisdiction of the competent courts of India.",
    },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 md:px-6 md:py-20 animate-in fade-in duration-300 space-y-10">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-3.5 py-1 text-xs font-semibold text-accent">
          <Scale className="size-3.5" />
          <span>Legal Agreement</span>
        </div>
        <h1 className="mt-4 font-display text-4xl sm:text-5xl font-semibold tracking-tight text-fg">
          Terms &amp; Conditions
        </h1>
        <p className="mt-2 text-sm text-muted">
          Governing manufacturing services, ready-made shop orders, and digital custom quotes.
        </p>
      </div>

      <div className="space-y-5">
        {sections.map((sec) => {
          const Icon = sec.icon;
          return (
            <div
              key={sec.title}
              className="rounded-3xl border border-border bg-surface p-6 sm:p-7 shadow-xs space-y-3"
            >
              <h2 className="font-display text-lg font-semibold text-fg flex items-center gap-2.5">
                <Icon className="size-4.5 text-accent shrink-0" />
                <span>{sec.title}</span>
              </h2>
              <p className="text-sm text-muted leading-relaxed">{sec.body}</p>
            </div>
          );
        })}

        <div className="rounded-3xl border border-border bg-surface-2/60 p-6 sm:p-7">
          <p className="text-xs text-muted leading-relaxed">
            Questions regarding our commercial terms or business orders may be
            addressed directly to{" "}
            <a href={`mailto:${contactEmail}`} className="text-accent underline font-medium">
              {contactEmail}
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
