import { Link, getRouteApi } from "@tanstack/react-router";
import { Instagram, Mail, MessageCircle } from "lucide-react";
import { Wordmark } from "@/components/logo";
import { usePublicServices } from "@/components/services-dropdown";

const rootRoute = getRouteApi("__root__");

const SHOP_LINKS = [
  { to: "/shop", label: "Ready-Made Collection" },
  { to: "/pegboard", label: "Modular Pegboards" },
  { to: "/custom", label: "Custom 3D Printing" },
  { to: "/lithophane", label: "3D Lithophanes" },
  { to: "/materials", label: "Filaments & Materials" },
  { to: "/gallery", label: "Print Quality Gallery" },
] as const;

const HELP_LINKS = [
  { to: "/faq", label: "FAQ & Turnarounds" },
  { to: "/shipping", label: "Shipping Policy" },
  { to: "/returns", label: "Returns & Replacements" },
  { to: "/contact", label: "Contact Us" },
  { to: "/about", label: "About Prynth" },
  { to: "/privacy", label: "Privacy Policy" },
  { to: "/terms", label: "Terms of Service" },
] as const;

export function SiteFooter() {
  const { settings } = rootRoute.useLoaderData();
  const services = usePublicServices();

  return (
    <footer className="mt-auto border-t border-border bg-surface">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-12 md:px-6 md:py-16">
        {/* Brand & Mission column */}
        <div className="md:col-span-4 lg:col-span-5 space-y-4">
          <Wordmark className="text-2xl tracking-tight" />
          <p className="max-w-sm text-sm text-muted leading-relaxed">
            {settings.tagline ||
              "On-demand 3D printing and CAD engineering studio based in Mumbai. Crafted with micron precision on Bambu CoreXY, shipped across India."}
          </p>

          {/* Social & Contact Icon Badges */}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <a
              href={`mailto:${settings.email || "support@prynth.in"}`}
              title="Email support"
              className="inline-flex size-9 items-center justify-center rounded-xl border border-border bg-surface-2/60 text-muted transition-colors hover:border-accent hover:text-accent hover:bg-surface"
            >
              <Mail className="size-4" strokeWidth={1.8} />
              <span className="sr-only">Email</span>
            </a>

            {settings.contact_whatsapp && (
              <a
                href={`https://wa.me/${settings.contact_whatsapp.replace(/[^\d]/g, "")}`}
                target="_blank"
                rel="noreferrer"
                title="WhatsApp support"
                className="inline-flex size-9 items-center justify-center rounded-xl border border-border bg-surface-2/60 text-muted transition-colors hover:border-emerald-500 hover:text-emerald-500 hover:bg-surface"
              >
                <MessageCircle className="size-4" strokeWidth={1.8} />
                <span className="sr-only">WhatsApp</span>
              </a>
            )}

            {settings.instagram && (
              <a
                href={`https://instagram.com/${settings.instagram.replace("@", "")}`}
                target="_blank"
                rel="noreferrer"
                title="Instagram"
                className="inline-flex size-9 items-center justify-center rounded-xl border border-border bg-surface-2/60 text-muted transition-colors hover:border-pink-500 hover:text-pink-500 hover:bg-surface"
              >
                <Instagram className="size-4" strokeWidth={1.8} />
                <span className="sr-only">Instagram</span>
              </a>
            )}

            {settings.social_twitter && (
              <a
                href={`https://x.com/${settings.social_twitter.replace("@", "")}`}
                target="_blank"
                rel="noreferrer"
                title="X / Twitter"
                className="inline-flex size-9 items-center justify-center rounded-xl border border-border bg-surface-2/60 text-muted transition-colors hover:border-fg hover:text-fg hover:bg-surface text-xs font-semibold"
              >
                <span>𝕏</span>
                <span className="sr-only">X (Twitter)</span>
              </a>
            )}

            {settings.social_youtube && (
              <a
                href={
                  settings.social_youtube.startsWith("http")
                    ? settings.social_youtube
                    : `https://youtube.com/${settings.social_youtube}`
                }
                target="_blank"
                rel="noreferrer"
                title="YouTube"
                className="inline-flex size-9 items-center justify-center rounded-xl border border-border bg-surface-2/60 text-muted transition-colors hover:border-red-500 hover:text-red-500 hover:bg-surface text-xs font-semibold"
              >
                <span>▶</span>
                <span className="sr-only">YouTube</span>
              </a>
            )}
          </div>
        </div>

        {/* Navigation link columns */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 md:col-span-8 lg:col-span-7">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.18em] text-accent uppercase">
              Shop &amp; Studio
            </p>
            <ul className="mt-3.5 space-y-2.5">
              {SHOP_LINKS.map((l) => (
                <li key={l.to}>
                  <Link
                    to={l.to}
                    className="text-xs sm:text-sm text-muted hover:text-fg transition-colors"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-[11px] font-semibold tracking-[0.18em] text-accent uppercase">
              Services
            </p>
            <ul className="mt-3.5 space-y-2.5">
              <li>
                <Link
                  to="/services"
                  className="text-xs sm:text-sm text-fg font-medium hover:text-accent transition-colors"
                >
                  All Capabilities
                </Link>
              </li>
              {services.map((srv) => (
                <li key={srv.slug}>
                  <Link
                    to="/services/$slug"
                    params={{ slug: srv.slug }}
                    className="text-xs sm:text-sm text-muted hover:text-fg transition-colors"
                  >
                    {srv.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-[11px] font-semibold tracking-[0.18em] text-accent uppercase">
              Help &amp; Info
            </p>
            <ul className="mt-3.5 space-y-2.5">
              {HELP_LINKS.map((l) => (
                <li key={l.to}>
                  <Link
                    to={l.to}
                    className="text-xs sm:text-sm text-muted hover:text-fg transition-colors"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Sub-footer copyright */}
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-4 text-xs text-subtle sm:flex-row sm:items-center sm:justify-between md:px-6">
          <p>© {new Date().getFullYear()} Prynth · All rights reserved.</p>
          <p className="text-[11px]">Designed &amp; 3D printed with intention in Mumbai, India</p>
        </div>
      </div>
    </footer>
  );
}
