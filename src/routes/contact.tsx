import { createFileRoute, getRouteApi } from "@tanstack/react-router";

const rootRoute = getRouteApi("__root__");
import { Instagram, Mail, Phone, MapPin, Clock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitContactMessage } from "@/lib/contact-fns";

export const Route = createFileRoute("/contact")({ component: ContactPage });

function ContactPage() {
  const { settings } = rootRoute.useLoaderData();
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const contactEmail = settings.contact_email || "hello@prynth.in";
  const contactPhone = settings.contact_phone || "+91 98765 43210";
  const contactAddress = settings.contact_address || "Bengaluru, Karnataka, India";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const message = String(data.get("message") ?? "").trim();
    // Honeypot: if the hidden field has a value, it's a bot submission — silently drop it
    const honeypot = String(data.get("_hp") ?? "");
    if (honeypot) { setSent(true); return; }
    if (name.length < 2 || !email.includes("@") || message.length < 8) {
      toast.error("Please fill in your name, email, and a short message.");
      return;
    }
    setBusy(true);
    try {
      await submitContactMessage({ data: { name, email, message } });
      setSent(true);
      toast.success("Message saved. We'll reply to that email.");
    } catch {
      toast.error("Failed to send message. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-16">
      <p className="text-[11px] font-medium tracking-[0.18em] text-subtle uppercase">
        Contact
      </p>
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight md:text-5xl">
        Say hello
      </h1>
      <p className="mt-3 max-w-xl text-muted">
        Questions about a print, a custom idea, or an order that's already in
        the works. We read everything that lands here.
      </p>

      <div className="mt-10 grid gap-10 md:grid-cols-12">
        <div className="md:col-span-5">
          <div className="space-y-4 rounded-3xl bg-surface p-6 shadow-[var(--shadow-border)]">
            <a
              href={`mailto:${contactEmail}`}
              className="flex items-center gap-3 rounded-2xl p-3 hover:bg-surface-2 transition-colors"
            >
              <Mail className="size-5 text-accent shrink-0" strokeWidth={1.75} />
              <div>
                <span className="block text-xs font-medium text-subtle uppercase tracking-wider">Email</span>
                <span className="text-sm font-medium">{contactEmail}</span>
              </div>
            </a>

            <a
              href={`tel:${contactPhone.replace(/\s+/g, '')}`}
              className="flex items-center gap-3 rounded-2xl p-3 hover:bg-surface-2 transition-colors"
            >
              <Phone className="size-5 text-accent shrink-0" strokeWidth={1.75} />
              <div>
                <span className="block text-xs font-medium text-subtle uppercase tracking-wider">Phone / WhatsApp</span>
                <span className="text-sm font-medium">{contactPhone}</span>
              </div>
            </a>

            <div className="flex items-start gap-3 rounded-2xl p-3">
              <MapPin className="size-5 text-accent shrink-0 mt-0.5" strokeWidth={1.75} />
              <div>
                <span className="block text-xs font-medium text-subtle uppercase tracking-wider">Operating Address</span>
                <span className="text-sm font-medium leading-relaxed">{contactAddress}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl p-3">
              <Clock className="size-5 text-accent shrink-0" strokeWidth={1.75} />
              <div>
                <span className="block text-xs font-medium text-subtle uppercase tracking-wider">Business Hours</span>
                <span className="text-sm">Monday – Saturday: 10:00 AM – 7:00 PM IST</span>
              </div>
            </div>

            {settings.contact_instagram && (
              <a
                href={`https://instagram.com/${settings.contact_instagram.replace('@', '')}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 rounded-2xl p-3 hover:bg-surface-2 transition-colors"
              >
                <Instagram className="size-5 text-accent shrink-0" strokeWidth={1.75} />
                <div>
                  <span className="block text-xs font-medium text-subtle uppercase tracking-wider">Instagram</span>
                  <span className="text-sm font-medium">{settings.contact_instagram}</span>
                </div>
              </a>
            )}

            <div className="px-3 pt-2 text-xs text-muted border-t border-border/50">
              For order queries, please mention your PRY- order number for faster assistance.
            </div>
          </div>
        </div>
        <div className="md:col-span-7">
          {sent ? (
            <div className="rounded-3xl bg-surface p-8 shadow-[var(--shadow-border)]">
              <h2 className="font-display text-2xl font-semibold">Got it.</h2>
              <p className="mt-2 text-muted">
                We'll write back at the email you left. If it's urgent, mail
                hello@prynth.in directly.
              </p>
              <Button className="mt-6" variant="secondary" onClick={() => setSent(false)}>
                Send another
              </Button>
            </div>
          ) : (
            <form
              onSubmit={onSubmit}
              className="space-y-4 rounded-3xl bg-surface p-6 shadow-[var(--shadow-border)] md:p-8"
            >
              {/* Honeypot field — hidden from real users, bots fill it in */}
              <input name="_hp" type="text" autoComplete="off" tabIndex={-1} aria-hidden="true" className="absolute -top-[9999px] -left-[9999px] opacity-0 pointer-events-none" />
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" name="name" autoComplete="name" required />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" autoComplete="email" required />
                </div>
              </div>
              <div>
                <Label htmlFor="message">Message</Label>
                <Textarea id="message" name="message" required />
              </div>
              <Button type="submit" size="lg" disabled={busy}>
                {busy ? "Sending..." : "Send"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
