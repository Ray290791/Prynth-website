import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import { Shield, Lock, Eye, FileText, Mail } from "lucide-react";

const rootRoute = getRouteApi("__root__");

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
  head: () => ({
    meta: [
      { title: "Privacy Policy | prynth!" },
      {
        name: "description",
        content:
          "Privacy Policy for prynth! — how we collect, store, and protect your information.",
      },
    ],
  }),
});

export function PrivacyPage() {
  const { settings } = rootRoute.useLoaderData();
  const contactEmail = settings.contact_email || settings.email || "hello@prynth.in";

  const sections = [
    {
      icon: Eye,
      title: "1. Information We Collect",
      body: "We collect information you provide directly to us when placing an order, requesting a custom 3D model, or communicating with customer support. This includes your name, email address, contact phone number, shipping address, and reference photos or 3D CAD files you submit for custom manufacturing.",
    },
    {
      icon: FileText,
      title: "2. How We Use Information",
      body: "We use the information we collect solely to manufacture, pack, and deliver your orders; communicate status updates; provide customer support; and send technical alerts or order invoices. We do not sell your personal data to third parties.",
    },
    {
      icon: Shield,
      title: "3. Sharing with Logistics Partners",
      body: "To deliver physical 3D prints to your doorstep, necessary delivery details (name, shipping address, and phone number) are securely shared with our trusted logistics courier partners (Delhivery, Blue Dart, DTDC, India Post via Shiprocket).",
    },
    {
      icon: Lock,
      title: "4. Payment Security (Razorpay PCI-DSS Level 1)",
      body: "All online transactions (UPI, Credit/Debit cards, Netbanking) are processed directly by Razorpay Software Private Limited using bank-grade 128-bit SSL encryption. Razorpay complies with the highest Payment Card Industry Data Security Standards (PCI-DSS Level 1). We do not capture or store your UPI PINs, CVVs, or card numbers on our servers.",
    },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 md:px-6 md:py-20 animate-in fade-in duration-300 space-y-10">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-3.5 py-1 text-xs font-semibold text-accent">
          <Shield className="size-3.5" />
          <span>Security &amp; Privacy</span>
        </div>
        <h1 className="mt-4 font-display text-4xl sm:text-5xl font-semibold tracking-tight text-fg">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-muted">
          Last updated: October 2026 · Compliant with Indian Information Technology Act rules.
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

        {/* Contact section */}
        <div className="rounded-3xl border border-border bg-surface-2/60 p-6 sm:p-7 space-y-2">
          <h2 className="font-display text-base font-semibold text-fg flex items-center gap-2">
            <Mail className="size-4 text-accent" />
            <span>5. Privacy Inquiries</span>
          </h2>
          <p className="text-sm text-muted leading-relaxed">
            If you have questions about your personal data or wish to request data
            deletion, contact our privacy team at{" "}
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
