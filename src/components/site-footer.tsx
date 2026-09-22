import { Link, getRouteApi } from "@tanstack/react-router";
import { Instagram, Mail } from "lucide-react";
import { Wordmark } from "@/components/logo";

const rootRoute = getRouteApi("__root__");

const SHOP = [
  { to: "/shop", label: "Ready-made prints" },
  { to: "/custom", label: "Custom orders" },
  { to: "/materials", label: "Filaments & Materials" },
  { to: "/cart", label: "Cart" },
] as const;

const HELP = [
  { to: "/faq", label: "FAQ" },
  { to: "/shipping", label: "Shipping" },
  { to: "/returns", label: "Returns & Refunds" },
  { to: "/privacy", label: "Privacy Policy" },
  { to: "/terms", label: "Terms & Conditions" },
  { to: "/contact", label: "Contact" },
] as const;

export function SiteFooter() {
  const { settings } = rootRoute.useLoaderData();

  return (
    <footer className="mt-auto border-t border-border bg-surface">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-12 md:px-6 lg:gap-12">
        <div className="md:col-span-5 lg:col-span-6">
          <Wordmark className="text-2xl" />
          <p className="mt-3 max-w-sm text-sm text-muted">
            {settings.tagline}
          </p>
          <div className="mt-5 flex flex-col gap-2 text-sm">
            <a
              href={`mailto:${settings.email}`}
              className="inline-flex items-center gap-2 text-fg hover:text-accent"
            >
              <Mail className="size-4" strokeWidth={1.75} />
              {settings.email}
            </a>
            <a
              href={`https://instagram.com/${settings.instagram.replace('@', '')}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-fg hover:text-accent"
            >
              <Instagram className="size-4" strokeWidth={1.75} />
              {settings.instagram}
            </a>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 md:col-span-7 lg:col-span-6 lg:grid-cols-2">
          <div>
            <p className="text-xs font-medium tracking-[0.14em] text-subtle uppercase">
              Shop
            </p>
            <ul className="mt-3 space-y-2">
              {SHOP.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="text-sm text-muted hover:text-fg">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-medium tracking-[0.14em] text-subtle uppercase">
              Help
            </p>
            <ul className="mt-3 space-y-2">
              {HELP.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="text-sm text-muted hover:text-fg">
                    {l.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link to="/about" className="text-sm text-muted hover:text-fg">
                  Our story
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 text-xs text-subtle sm:flex-row sm:items-center sm:justify-between md:px-6">
          <p>© {new Date().getFullYear()} prynth! · {settings.copyright}</p>
          <p>{settings.bottom_text}</p>
        </div>
      </div>
    </footer>
  );
}
