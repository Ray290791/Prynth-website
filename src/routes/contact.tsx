import { createFileRoute, getRouteApi } from "@tanstack/react-router";

const rootRoute = getRouteApi("__root__");
import { Instagram, Mail } from "lucide-react";
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

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const message = String(data.get("message") ?? "").trim();
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
            {settings.contact_email && (
              <a
                href={`mailto:${settings.contact_email}`}
                className="flex items-center gap-3 rounded-2xl p-3 hover:bg-surface-2"
              >
                <Mail className="size-5 text-accent" strokeWidth={1.75} />
                <span>
                  <span className="block text-sm text-subtle">Email</span>
                  {settings.contact_email}
                </span>
              </a>
            )}
            {settings.contact_instagram && (
              <a
                href={`https://instagram.com/${settings.contact_instagram.replace('@', '')}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 rounded-2xl p-3 hover:bg-surface-2"
              >
                <Instagram className="size-5 text-accent" strokeWidth={1.75} />
                <span>
                  <span className="block text-sm text-subtle">Instagram</span>
                  {settings.contact_instagram}
                </span>
              </a>
            )}
            <p className="px-3 pt-2 text-sm text-muted">
              We usually reply within one working day. For order changes, include
              your order number (PRY-…).
            </p>
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
