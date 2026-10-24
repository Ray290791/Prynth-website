import { Link, useRouterState } from "@tanstack/react-router";
import {
  Menu,
  ShoppingBag,
  X,
  User,
  Clock,
  ChevronDown,
  ArrowRight,
  Sparkles,
  Camera,
  Info,
  HelpCircle,
  Mail,
  Layers,
} from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { LogoLink } from "@/components/logo";
import { AuthModal } from "@/components/auth-modal";
import { ThemeToggle } from "@/components/theme-toggle";
import { InlineSearch } from "@/components/inline-search";
import { ServicesDropdown, usePublicServices } from "@/components/services-dropdown";
import { SignedIn, SignedOut, UserButton } from "@/lib/auth/gates";
import { cartCount, useCart } from "@/lib/cart-store";
import { useHydrated } from "@/lib/use-hydrated";
import { cn } from "@/lib/utils";

const PRIMARY_NAV = [
  { to: "/shop", label: "Shop", matchPrefix: true },
  { to: "/custom", label: "Custom Print" },
  { to: "/pegboard", label: "Pegboards" },
  { to: "/materials", label: "Materials" },
] as const;

const EXPLORE_ITEMS = [
  {
    to: "/lithophane",
    label: "3D Lithophanes",
    desc: "Photo-to-3D backlit night lamps with warm LED base",
    icon: Sparkles,
  },
  {
    to: "/gallery",
    label: "Print Quality Gallery",
    desc: "Macro photos of surface finishes & layer precision",
    icon: Camera,
  },
  {
    to: "/about",
    label: "About Prynth",
    desc: "Our Mumbai studio, philosophy & Bambu CoreXY fleet",
    icon: Info,
  },
  {
    to: "/faq",
    label: "FAQ & Shipping",
    desc: "Turnaround times, materials & ordering answers",
    icon: HelpCircle,
  },
  {
    to: "/contact",
    label: "Contact & Support",
    desc: "Direct WhatsApp support & custom consultations",
    icon: Mail,
  },
] as const;

function ExploreDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isExploreActive = EXPLORE_ITEMS.some((item) => pathname.startsWith(item.to));

  const handleMouseEnter = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    closeTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 150);
  };

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors duration-150 cursor-pointer",
          isExploreActive
            ? "text-fg bg-surface-2/60 font-semibold"
            : "text-muted hover:bg-surface-2 hover:text-fg"
        )}
      >
        <span>Explore</span>
        <ChevronDown
          className={cn(
            "size-3.5 transition-transform duration-200 text-muted",
            isOpen && "rotate-180 text-accent"
          )}
          strokeWidth={2}
        />
      </button>

      {isOpen && (
        <div
          className="absolute left-1/2 -translate-x-1/2 top-full pt-2 z-50 w-72 max-w-[calc(100vw-2rem)] animate-in fade-in-0 zoom-in-95 duration-150"
          role="region"
          aria-label="Explore Menu"
        >
          <div className="overflow-hidden rounded-2xl border border-glass-border bg-surface/98 backdrop-blur-2xl backdrop-saturate-150 shadow-2xl shadow-black/20 p-2">
            <div className="flex flex-col gap-0.5">
              {EXPLORE_ITEMS.map((item) => {
                const isActive = pathname.startsWith(item.to);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={cn(
                      "group flex items-start gap-2.5 rounded-xl p-2 transition-colors cursor-pointer",
                      isActive
                        ? "bg-accent/10 text-fg"
                        : "hover:bg-surface-2/80 text-muted hover:text-fg"
                    )}
                  >
                    <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-2/70 text-fg group-hover:border-accent/60 group-hover:text-accent transition-colors">
                      <Icon className="size-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-fg group-hover:text-accent transition-colors">
                        {item.label}
                      </div>
                      <p className="text-[11px] text-muted line-clamp-1 mt-0.5">
                        {item.desc}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function SiteHeader() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const items = useCart((s) => s.items);
  const hydrated = useHydrated();
  const count = hydrated ? cartCount(items) : 0;
  const [open, setOpen] = useState(false);
  const [mobileServicesOpen, setMobileServicesOpen] = useState(false);
  const [mobileExploreOpen, setMobileExploreOpen] = useState(false);
  const services = usePublicServices();

  useEffect(() => {
    setOpen(false);
    setMobileServicesOpen(false);
    setMobileExploreOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b border-glass-border bg-glass backdrop-blur-2xl backdrop-saturate-150 shadow-sm">
      <div className="mx-auto flex h-14 sm:h-16 max-w-6xl items-center justify-between gap-2 sm:gap-4 px-4 sm:px-6 md:h-[4.25rem]">
        <LogoLink className="shrink-0" />

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {PRIMARY_NAV.map((item) => {
            const active =
              "matchPrefix" in item && item.matchPrefix
                ? pathname.startsWith(item.to)
                : pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors duration-150",
                  active
                    ? "text-fg font-semibold bg-surface-2/60"
                    : "text-muted hover:bg-surface-2 hover:text-fg"
                )}
              >
                {item.label}
              </Link>
            );
          })}

          {/* Services Dropdown */}
          <ServicesDropdown />

          {/* Explore / More Dropdown */}
          <ExploreDropdown />
        </nav>

        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <InlineSearch />
          <ThemeToggle />
          <Link
            to="/cart"
            aria-label={count ? `Cart, ${count} items` : "Cart"}
            className="relative inline-flex size-9 sm:size-10 items-center justify-center rounded-xl text-fg transition-colors duration-150 hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 shrink-0"
          >
            <ShoppingBag className="size-4.5 sm:size-5" strokeWidth={1.75} aria-hidden="true" />
            <span className="sr-only">{count ? `Cart, ${count} items` : "Cart"}</span>
            {count > 0 ? (
              <span
                className="absolute top-1 right-1 sm:top-1.5 sm:right-1.5 flex h-3.5 min-w-3.5 sm:h-4 sm:min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] sm:text-[10px] font-semibold text-ink tabular-nums"
                aria-hidden="true"
              >
                {count > 99 ? "99+" : count}
              </span>
            ) : null}
          </Link>
          <SignedOut>
            <AuthModal
              trigger={
                <button
                  type="button"
                  className="cursor-pointer rounded-xl px-3 py-1.5 text-xs sm:text-sm font-medium text-fg hover:bg-surface-2 transition-colors duration-150 whitespace-nowrap shrink-0 leading-none h-9 sm:h-10 hidden sm:inline-flex items-center justify-center"
                >
                  Sign in
                </button>
              }
            />
          </SignedOut>
          <UserButton />
          <button
            type="button"
            className="inline-flex size-9 sm:size-10 items-center justify-center rounded-xl text-fg hover:bg-surface-2 md:hidden shrink-0 cursor-pointer"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? (
              <X className="size-5" strokeWidth={1.75} />
            ) : (
              <Menu className="size-5" strokeWidth={1.75} />
            )}
          </button>
        </div>
      </div>

      {open ? (
        <div className="border-t border-border bg-surface/98 dark:bg-surface/98 backdrop-blur-3xl md:hidden shadow-2xl shadow-black/20 animate-in fade-in-0 duration-200 max-h-[calc(100dvh-3.5rem)] overflow-y-auto">
          <nav className="mx-auto flex max-w-6xl flex-col px-4 py-4 gap-1.5" aria-label="Mobile">
            {PRIMARY_NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="rounded-xl px-3.5 py-2.5 text-base font-medium text-fg hover:bg-surface-2 transition-colors"
              >
                {item.label}
              </Link>
            ))}

            {/* Mobile Services Accordion */}
            <div className="rounded-xl border border-border/60 bg-surface-2/40 px-3.5 py-2">
              <button
                type="button"
                onClick={() => setMobileServicesOpen((v) => !v)}
                className="flex w-full items-center justify-between py-1 text-base font-semibold text-fg cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <span>Engineering Services</span>
                  <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold text-accent">
                    CAD &amp; Parts
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
                  {services.map((srv) => (
                    <Link
                      key={srv.slug}
                      to="/services/$slug"
                      params={{ slug: srv.slug }}
                      className="flex items-center justify-between rounded-lg px-2.5 py-2 text-sm font-medium text-muted hover:bg-surface hover:text-fg transition-colors"
                    >
                      <span>{srv.title}</span>
                      <span className="text-[11px] text-accent font-mono font-semibold">
                        ₹{srv.starting_price}+
                      </span>
                    </Link>
                  ))}
                  <Link
                    to="/services"
                    className="flex items-center justify-between rounded-lg px-2.5 py-2 text-xs font-semibold text-accent hover:bg-accent/10 transition-colors mt-1"
                  >
                    <span>All services overview</span>
                    <ArrowRight className="size-3.5" />
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile Explore Accordion */}
            <div className="rounded-xl border border-border/60 bg-surface-2/40 px-3.5 py-2">
              <button
                type="button"
                onClick={() => setMobileExploreOpen((v) => !v)}
                className="flex w-full items-center justify-between py-1 text-base font-semibold text-fg cursor-pointer"
              >
                <span>Studio &amp; Info</span>
                <ChevronDown
                  className={cn(
                    "size-4 text-muted transition-transform duration-200",
                    mobileExploreOpen && "rotate-180 text-accent"
                  )}
                />
              </button>

              {mobileExploreOpen && (
                <div className="mt-2 flex flex-col gap-1 border-t border-border/50 pt-2 pb-1 pl-1">
                  {EXPLORE_ITEMS.map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      className="flex items-center justify-between rounded-lg px-2.5 py-2 text-sm font-medium text-muted hover:bg-surface hover:text-fg transition-colors"
                    >
                      <span>{item.label}</span>
                      <ArrowRight className="size-3 text-subtle" />
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-3 pt-3 border-t border-border/50 flex flex-col gap-2">
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
                  My Account
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
                      className="w-full h-11 rounded-xl bg-accent text-ink font-semibold text-sm flex items-center justify-center transition-colors shadow-xs cursor-pointer"
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
