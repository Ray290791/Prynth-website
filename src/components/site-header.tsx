import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, ShoppingBag, X, User, Clock, ChevronDown, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { LogoLink } from "@/components/logo";
import { AuthModal } from "@/components/auth-modal";
import { ThemeToggle } from "@/components/theme-toggle";
import { InlineSearch } from "@/components/inline-search";
import { ServicesDropdown, HEADER_SERVICES } from "@/components/services-dropdown";
import { SignedIn, SignedOut, UserButton } from "@/lib/auth/gates";
import { cartCount, useCart } from "@/lib/cart-store";
import { useHydrated } from "@/lib/use-hydrated";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/shop", label: "Shop" },
  { to: "/pegboard", label: "Pegboards" },
  { to: "/custom", label: "Custom" },
  { to: "/lithophane", label: "Lithophanes" },
  { to: "/materials", label: "Materials" },
  { to: "/about", label: "About" },
  { to: "/faq", label: "FAQ" },
  { to: "/contact", label: "Contact" },
] as const;

export function SiteHeader() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const items = useCart((s) => s.items);
  const hydrated = useHydrated();
  const count = hydrated ? cartCount(items) : 0;
  const [open, setOpen] = useState(false);
  const [mobileServicesOpen, setMobileServicesOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
    setMobileServicesOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b border-glass-border bg-glass backdrop-blur-2xl backdrop-saturate-150 shadow-xl shadow-black/5">
      <div className="mx-auto flex h-14 sm:h-16 max-w-[1600px] items-center justify-between gap-1 sm:gap-4 px-3 sm:px-6 md:h-[4.25rem] md:px-8 xl:px-12">
        <LogoLink className="shrink-0" />

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          <Link
            to="/"
            className={cn(
              "rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150",
              pathname === "/"
                ? "text-fg font-semibold"
                : "text-muted hover:bg-surface-2 hover:text-fg",
            )}
          >
            Home
          </Link>
          <Link
            to="/shop"
            className={cn(
              "rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150",
              pathname.startsWith("/shop")
                ? "text-fg font-semibold"
                : "text-muted hover:bg-surface-2 hover:text-fg",
            )}
          >
            Shop
          </Link>

          {/* Services Dropdown */}
          <ServicesDropdown />

          {NAV.slice(2).map((item) => {
            const active = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150",
                  active
                    ? "text-fg font-semibold"
                    : "text-muted hover:bg-surface-2 hover:text-fg",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
          <InlineSearch />
          <ThemeToggle />
          <Link
            to="/cart"
            aria-label={count ? `Cart, ${count} items` : "Cart"}
            className="relative inline-flex size-9 sm:size-10 md:size-11 items-center justify-center rounded-xl text-fg transition-colors duration-150 hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 shrink-0"
          >
            <ShoppingBag className="size-4.5 sm:size-5" strokeWidth={1.75} />
            {count > 0 ? (
              <span className="absolute top-1 right-1 sm:top-1.5 sm:right-1.5 flex h-3.5 min-w-3.5 sm:h-4 sm:min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] sm:text-[10px] font-semibold text-ink tabular-nums">
                {count > 99 ? "99+" : count}
              </span>
            ) : null}
          </Link>
          <SignedOut>
            <AuthModal
              trigger={
                <button
                  type="button"
                  className="cursor-pointer rounded-xl px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-fg hover:bg-surface-2 transition-colors duration-150 whitespace-nowrap shrink-0 leading-none h-9 sm:h-10 md:h-11 hidden sm:inline-flex items-center justify-center"
                >
                  Sign in
                </button>
              }
            />
          </SignedOut>
          <UserButton />
          <button
            type="button"
            className="inline-flex size-9 sm:size-10 md:size-11 items-center justify-center rounded-xl text-fg hover:bg-surface-2 md:hidden shrink-0 cursor-pointer"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? (
              <X className="size-4.5 sm:size-5" strokeWidth={1.75} />
            ) : (
              <Menu className="size-4.5 sm:size-5" strokeWidth={1.75} />
            )}
          </button>
        </div>
      </div>

      {open ? (
        <div className="border-t border-border bg-surface/98 dark:bg-surface/98 backdrop-blur-3xl md:hidden shadow-2xl shadow-black/20 animate-in fade-in-0 duration-200 max-h-[calc(100dvh-3.5rem)] overflow-y-auto">
          <nav className="mx-auto flex max-w-[1600px] flex-col px-4 sm:px-6 py-3 gap-1" aria-label="Mobile">
            <Link
              to="/"
              className="rounded-xl px-3.5 py-2.5 text-base font-medium text-fg hover:bg-surface-2 transition-colors"
            >
              Home
            </Link>
            <Link
              to="/shop"
              className="rounded-xl px-3.5 py-2.5 text-base font-medium text-fg hover:bg-surface-2 transition-colors"
            >
              Shop
            </Link>

            {/* Mobile Services Accordion */}
            <div className="rounded-xl border border-border/60 bg-surface-2/40 px-3.5 py-2">
              <button
                type="button"
                onClick={() => setMobileServicesOpen((v) => !v)}
                className="flex w-full items-center justify-between py-1 text-base font-semibold text-fg cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <span>Services</span>
                  <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold text-accent">
                    Engineering
                  </span>
                </span>
                <ChevronDown
                  className={cn(
                    "size-4 text-muted transition-transform duration-200",
                    mobileServicesOpen && "rotate-180 text-accent"
                  )}
                />
              </button>

              {mobileServicesOpen && (
                <div className="mt-2 flex flex-col gap-1 border-t border-border/50 pt-2 pb-1 pl-1">
                  {HEADER_SERVICES.map((srv) => (
                    <Link
                      key={srv.slug}
                      to="/services/$slug"
                      params={{ slug: srv.slug }}
                      className="flex items-center justify-between rounded-lg px-2.5 py-2 text-sm font-medium text-muted hover:bg-surface hover:text-fg transition-colors"
                    >
                      <span>{srv.title}</span>
                      <span className="text-[11px] text-accent font-mono font-semibold">
                        ₹{srv.startingPrice}+
                      </span>
                    </Link>
                  ))}
                  <Link
                    to="/services"
                    className="flex items-center justify-between rounded-lg px-2.5 py-2 text-xs font-semibold text-accent hover:bg-accent/10 transition-colors mt-1"
                  >
                    <span>View all services overview</span>
                    <ArrowRight className="size-3.5" />
                  </Link>
                </div>
              )}
            </div>

            {NAV.slice(2).map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="rounded-xl px-3.5 py-2.5 text-base font-medium text-fg hover:bg-surface-2 transition-colors"
              >
                {item.label}
              </Link>
            ))}

            <div className="mt-2 pt-3 border-t border-border/50 flex flex-col gap-2">
              <Link
                to="/cart"
                className="flex items-center justify-between rounded-xl px-3.5 py-2.5 text-base font-medium text-fg hover:bg-surface-2 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <ShoppingBag className="size-5 text-accent" strokeWidth={1.75} />
                  Cart
                </span>
                {count > 0 && (
                  <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-ink">
                    {count}
                  </span>
                )}
              </Link>

              <SignedIn>
                <Link
                  to="/profile"
                  className="flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-base font-medium text-fg hover:bg-surface-2 transition-colors"
                >
                  <User className="size-5 text-accent" strokeWidth={1.75} />
                  My Account / Dashboard
                </Link>
                <Link
                  to="/history"
                  className="flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-base font-medium text-fg hover:bg-surface-2 transition-colors"
                >
                  <Clock className="size-5 text-muted" strokeWidth={1.75} />
                  Recently Viewed
                </Link>
              </SignedIn>

              <SignedOut>
                <AuthModal
                  trigger={
                    <button
                      type="button"
                      className="w-full h-11 rounded-xl bg-accent text-ink font-semibold text-sm flex items-center justify-center transition-colors shadow-sm cursor-pointer"
                    >
                      Sign In / Sign Up
                    </button>
                  }
                />
              </SignedOut>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
