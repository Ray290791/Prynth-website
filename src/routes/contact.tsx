import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import {
  Instagram,
  Mail,
  Phone,
  MapPin,
  Clock,
  MessageSquare,
  Check,
  Copy,
  Sparkles,
  Send,
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
    meta: [
      { title: "Contact Us | prynth!" },
      {
        name: "description",
        content:
          "Have a question about a print, custom 3D model, or order in progress? Get in touch with our studio team.",
      },
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
  const contactPhone = settings.contact_phone || "+91 98765 43210";
  const contactWhatsApp = settings.contact_whatsapp || contactPhone;
  const contactAddress = settings.contact_address || "Bengaluru, Karnataka, India";
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

            {/* WhatsApp / Phone Card */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-surface-2/60 border border-border/60 hover:border-accent/40 transition-colors">
              <a
                href={
                  cleanWhatsAppNumber
                    ? `https://wa.me/${cleanWhatsAppNumber}`
                    : `tel:${contactPhone.replace(/\s+/g, "")}`
                }
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 min-w-0"
              >
                <div className="size-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                  <Phone className="size-4.5" />
                </div>
                <div className="truncate">
                  <span className="block text-[11px] font-semibold text-muted uppercase tracking-wider">
                    WhatsApp &amp; Phone
                  </span>
                  <span className="text-sm font-medium text-fg truncate">
                    {contactWhatsApp}
                  </span>
                </div>
              </a>
              <button
                type="button"
                onClick={() => copyToClipboard(contactWhatsApp, "phone")}
                className="size-8 rounded-lg flex items-center justify-center text-muted hover:text-fg hover:bg-surface transition-colors cursor-pointer shrink-0 ml-2"
                title="Copy phone"
              >
                {copiedKey === "phone" ? (
                  <Check className="size-4 text-emerald-400" />
                ) : (
                  <Copy className="size-4" />
                )}
              </button>
            </div>

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

              <div className="flex items-center justify-between pt-2">
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
