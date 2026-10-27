import { createFileRoute, Link, getRouteApi } from "@tanstack/react-router";
import {
  Instagram,
  Mail,
  MapPin,
  Clock,
  MessageSquare,
  Check,
  Copy,
  Sparkles,
  Send,
  Scale,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitContactMessage } from "@/lib/contact-fns";
import { cn } from "@/lib/utils";

const rootRoute = getRouteApi("__root__");

export const Route = createFileRoute("/contact")({
  component: ContactPage,
  head: () => ({
    links: [
      { rel: "canonical", href: "https://prynth.in/contact" },
    ],
    meta: [
      { title: "Contact Prynth — 3D Printing Studio Mumbai, India | Prynth" },
      {
        name: "description",
        content:
          "Have questions about custom 3D printing, CAD design, or order tracking? Contact the Prynth studio team in Mumbai. Fast response by email or online message.",
      },
      {
        name: "keywords",
        content:
          "contact prynth, 3d printing mumbai contact, 3d print studio customer support india",
      },
      { property: "og:title", content: "Contact Prynth — 3D Printing Studio Mumbai, India" },
      {
        property: "og:description",
        content:
          "Have questions about custom 3D printing or orders? Contact our studio team.",
      },
      { property: "og:url", content: "https://prynth.in/contact" },
    ],
  }),
});

export function ContactPage() {
  const { settings } = rootRoute.useLoaderData();
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; email?: string; message?: string }>({});

  const contactEmail = settings.contact_email || settings.email || "hello@prynth.in";
  const contactWhatsApp = settings.whatsapp_enabled === "true" ? (settings.contact_whatsapp || "") : "";
  const contactAddress = settings.contact_address || "Mumbai, Maharashtra 400001, India";
  const businessHours =
    settings.contact_hours || "Monday – Saturday: 10:00 AM – 7:00 PM IST";

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success(`Copied ${text} to clipboard!`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const message = String(data.get("message") ?? "").trim();

    // Honeypot: silent drop for bots
    const honeypot = String(data.get("_hp") ?? "");
    if (honeypot) {
      setSent(true);
      return;
    }

    const errs: { name?: string; email?: string; message?: string } = {};
    if (name.length < 2) errs.name = "Please enter your name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = "Please enter a valid email address.";
    if (message.length < 6) errs.message = "Please write a message with at least 6 characters.";

    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      toast.error("Please fix the highlighted fields.");
      return;
    }

    setFieldErrors({});
    setBusy(true);
    try {
      await submitContactMessage({ data: { name, email, message } });
      setSent(true);
      toast.success("Message received. Our team will email you shortly.");
    } catch (err: any) {
      toast.error(err?.message || "Failed to send message. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const cleanWhatsAppNumber = contactWhatsApp.replace(/[^\d]/g, "");

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-20 animate-in fade-in duration-300">
      {/* Title */}
      <div className="max-w-2xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-3.5 py-1 text-xs font-semibold text-accent">
          <MessageSquare className="size-3.5" />
          <span>Support &amp; Studio Inquiries</span>
        </div>
        <h1 className="mt-4 font-display text-4xl sm:text-5xl font-semibold tracking-tight text-fg">
          Say Hello
        </h1>
        <p className="mt-3 text-base sm:text-lg text-muted leading-relaxed">
          Questions about ready-made pieces, custom CAD modeling, or an order
          already on the printer bench. We reply to every message.
        </p>
      </div>

      <div className="mt-12 grid gap-8 lg:grid-cols-12 items-start">
        {/* Contact Info Cards */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-3xl border border-border bg-surface p-6 shadow-xs space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted px-1">
              Direct Contact Channels
            </h2>

            {/* Email Card */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-surface-2/60 border border-border/60 hover:border-accent/40 transition-colors">
              <a
                href={`mailto:${contactEmail}`}
                className="flex items-center gap-3 min-w-0"
              >
                <div className="size-9 rounded-xl bg-accent/10 text-accent flex items-center justify-center shrink-0">
                  <Mail className="size-4.5" />
                </div>
                <div className="truncate">
                  <span className="block text-[11px] font-semibold text-muted uppercase tracking-wider">
                    Studio Email
                  </span>
                  <span className="text-sm font-medium text-fg truncate">
                    {contactEmail}
                  </span>
                </div>
              </a>
              <button
                type="button"
                onClick={() => copyToClipboard(contactEmail, "email")}
                className="size-8 rounded-lg flex items-center justify-center text-muted hover:text-fg hover:bg-surface transition-colors cursor-pointer shrink-0 ml-2"
                title="Copy email"
              >
                {copiedKey === "email" ? (
                  <Check className="size-4 text-emerald-400" />
                ) : (
                  <Copy className="size-4" />
                )}
              </button>
            </div>

            {/* WhatsApp Support (only shown if WhatsApp is explicitly enabled, no phone number displayed) */}
            {settings.whatsapp_enabled === "true" && cleanWhatsAppNumber && (
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-surface-2/60 border border-border/60 hover:border-emerald-500/40 transition-colors">
                <a
                  href={`https://wa.me/${cleanWhatsAppNumber}?text=${encodeURIComponent("Hi Prynth! I have an inquiry about 3D printing.")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 min-w-0 flex-1"
                >
                  <div className="size-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                    <MessageSquare className="size-4.5" />
                  </div>
                  <div className="truncate">
                    <span className="block text-[11px] font-semibold text-muted uppercase tracking-wider">
                      WhatsApp Support
                    </span>
                    <span className="text-sm font-medium text-fg truncate hover:text-emerald-400 transition-colors">
                      Chat with Studio Team
                    </span>
                  </div>
                </a>
                <a
                  href={`https://wa.me/${cleanWhatsAppNumber}?text=${encodeURIComponent("Hi Prynth! I have an inquiry about 3D printing.")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-emerald-400 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors shrink-0 ml-2"
                >
                  Chat →
                </a>
              </div>
            )}

            {/* Operating Hours */}
            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-surface-2/60 border border-border/60">
              <div className="size-9 rounded-xl bg-surface text-accent flex items-center justify-center shrink-0 mt-0.5">
                <Clock className="size-4.5" />
              </div>
              <div>
                <span className="block text-[11px] font-semibold text-muted uppercase tracking-wider">
                  Operating Hours
                </span>
                <span className="text-sm text-fg leading-relaxed">
                  {businessHours}
                </span>
              </div>
            </div>

            {/* Address */}
            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-surface-2/60 border border-border/60">
              <div className="size-9 rounded-xl bg-surface text-accent flex items-center justify-center shrink-0 mt-0.5">
                <MapPin className="size-4.5" />
              </div>
              <div>
                <span className="block text-[11px] font-semibold text-muted uppercase tracking-wider">
                  Print Studio &amp; Dispatch
                </span>
                <span className="text-sm text-fg leading-relaxed">
                  {contactAddress}
                </span>
              </div>
            </div>

            {/* Instagram */}
            {settings.contact_instagram && (
              <a
                href={`https://instagram.com/${settings.contact_instagram.replace("@", "")}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 p-3.5 rounded-2xl bg-surface-2/60 border border-border/60 hover:border-accent/40 transition-colors"
              >
                <div className="size-9 rounded-xl bg-pink-500/10 text-pink-400 flex items-center justify-center shrink-0">
                  <Instagram className="size-4.5" />
                </div>
                <div>
                  <span className="block text-[11px] font-semibold text-muted uppercase tracking-wider">
                    Instagram Showcase
                  </span>
                  <span className="text-sm font-medium text-fg">
                    {settings.contact_instagram}
                  </span>
                </div>
              </a>
            )}

            <div className="px-3 pt-3 text-xs text-muted border-t border-border/60">
              💡 For questions regarding an existing order, please mention your{" "}
              <strong className="text-fg">PRY-…</strong> order number for
              faster dispatch status.
            </div>
          </div>

          {/* Statutory Grievance Redressal Card (Consumer Protection E-Commerce Rules, 2020) */}
          <div className="rounded-3xl border border-border bg-surface p-6 shadow-xs space-y-3.5">
            <div className="flex items-center gap-2">
              <Scale className="size-4 text-accent" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted">
                Statutory Grievance Redressal (India)
              </h2>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              Designated pursuant to Rule 5(9) of the Consumer Protection (E-Commerce) Rules, 2020 and IT Rules 2021:
            </p>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between border-b border-border/50 pb-1.5">
                <span className="text-muted">Designated Officer:</span>
                <span className="font-medium text-fg">Grievance Redressal Officer</span>
              </div>
              <div className="flex justify-between border-b border-border/50 pb-1.5">
                <span className="text-muted">Grievance Email:</span>
                <a href="mailto:grievance@prynth.in" className="font-medium text-accent underline">
                  grievance@prynth.in
                </a>
              </div>
              <div className="flex justify-between border-b border-border/50 pb-1.5">
                <span className="text-muted">Studio Address:</span>
                <span className="font-medium text-fg text-right max-w-[200px] truncate">{contactAddress}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Statutory SLA:</span>
                <span className="font-medium text-fg">48h Ack · 30d Resolution</span>
              </div>
            </div>
          </div>
        </div>

        {/* Message Form */}
        <div className="lg:col-span-7">
          {sent ? (
            <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-8 sm:p-10 shadow-sm text-center space-y-4">
              <div className="size-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <Check className="size-6 stroke-[2.5]" />
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-semibold text-fg">
                Message Received!
              </h2>
              <p className="text-sm text-muted max-w-md mx-auto leading-relaxed">
                Thank you for reaching out. We will write back to you shortly at
                the email you provided. For urgent inquiries, email{" "}
                <a
                  href={`mailto:${contactEmail}`}
                  className="text-accent underline"
                >
                  {contactEmail}
                </a>
                .
              </p>
              <Button
                variant="outline"
                onClick={() => setSent(false)}
                className="mt-4 cursor-pointer"
              >
                Send Another Note
              </Button>
            </div>
          ) : (
            <form
              onSubmit={onSubmit}
              className="space-y-5 rounded-3xl border border-border bg-surface p-6 sm:p-8 shadow-xs"
            >
              {/* Honeypot field */}
              <input
                name="_hp"
                type="text"
                autoComplete="off"
                tabIndex={-1}
                aria-hidden="true"
                className="absolute -top-[9999px] -left-[9999px] opacity-0 pointer-events-none"
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-xs font-semibold">
                    Your Name
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    autoComplete="name"
                    placeholder="e.g. Rahul Sharma"
                    aria-invalid={Boolean(fieldErrors.name)}
                    className={cn(fieldErrors.name && "border-destructive focus-visible:ring-destructive/30")}
                    required
                  />
                  {fieldErrors.name && (
                    <p className="text-xs text-destructive mt-1 font-medium">{fieldErrors.name}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-semibold">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="name@example.com"
                    aria-invalid={Boolean(fieldErrors.email)}
                    className={cn(fieldErrors.email && "border-destructive focus-visible:ring-destructive/30")}
                    required
                  />
                  {fieldErrors.email && (
                    <p className="text-xs text-destructive mt-1 font-medium">{fieldErrors.email}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="message" className="text-xs font-semibold">
                  How Can We Help?
                </Label>
                <Textarea
                  id="message"
                  name="message"
                  rows={5}
                  placeholder="Tell us about the piece you need printed, dimensions, color preferences, or your order question..."
                  aria-invalid={Boolean(fieldErrors.message)}
                  className={cn(fieldErrors.message && "border-destructive focus-visible:ring-destructive/30")}
                  required
                />
                {fieldErrors.message && (
                  <p className="text-xs text-destructive mt-1 font-medium">{fieldErrors.message}</p>
                )}
              </div>

              <div className="rounded-xl border border-border/80 bg-surface-2/40 p-3 text-[11px] text-muted leading-relaxed">
                By submitting this note, you consent to Prynth processing your name and email solely to reply to your inquiry in accordance with our{" "}
                <Link to="/privacy" className="text-accent underline font-medium">
                  Privacy Policy
                </Link>.
              </div>

              <div className="flex items-center justify-between pt-1">
                <p className="text-[11px] text-muted">
                  We typically reply within 2–4 business hours.
                </p>
                <Button
                  type="submit"
                  size="lg"
                  disabled={busy}
                  className="cursor-pointer shadow-xs"
                >
                  {busy ? (
                    "Sending..."
                  ) : (
                    <>
                      <Send className="size-4 mr-2" />
                      <span>Send Note</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
