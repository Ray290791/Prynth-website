import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, ShoppingBag, X, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { LogoLink } from "@/components/logo";
import { AuthModal } from "@/components/auth-modal";
import { ThemeToggle } from "@/components/theme-toggle";
import { InlineSearch } from "@/components/inline-search";
import { SignedOut, UserButton } from "@/lib/auth/gates";
import { cartCount, useCart } from "@/lib/cart-store";
import { useHydrated } from "@/lib/use-hydrated";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/shop", label: "Shop" },
  { to: "/custom", label: "Custom" },
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

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b border-glass-border bg-glass backdrop-blur-2xl backdrop-saturate-150 shadow-xl shadow-black/5">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 md:h-[4.25rem] md:px-6">
        <LogoLink />

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {NAV.map((item) => {
            const active =
              item.to === "/shop"
                ? pathname.startsWith("/shop")
                : pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150",
                  active
                    ? "text-fg"
                    : "text-muted hover:bg-surface-2 hover:text-fg",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-0.5">
          <InlineSearch />
          <ThemeToggle />
          <Link
            to="/cart"
            aria-label={count ? `Cart, ${count} items` : "Cart"}
            className="relative inline-flex size-11 items-center justify-center rounded-xl text-fg transition-colors duration-150 hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
          >
            <ShoppingBag className="size-5" strokeWidth={1.75} />
            {count > 0 ? (
              <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-ink tabular-nums">
                {count > 99 ? "99+" : count}
              </span>
            ) : null}
          </Link>
          <SignedOut>
            <AuthModal
              trigger={
                <button
                  type="button"
                  className="cursor-pointer rounded-xl px-3 py-2 text-sm font-medium text-fg hover:bg-surface-2 transition-colors duration-150 whitespace-nowrap shrink-0 leading-none h-11 hidden sm:inline-flex items-center justify-center"
                >
                  Sign in
                </button>
              }
            />
          </SignedOut>
          <UserButton />
          <button
            type="button"
            className="inline-flex size-11 items-center justify-center rounded-xl text-fg hover:bg-surface-2 md:hidden shrink-0"
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
        <div className="border-t border-glass-border bg-glass backdrop-blur-2xl backdrop-saturate-150 md:hidden shadow-xl shadow-black/5 animate-in fade-in-0 duration-200">
          <nav className="mx-auto flex max-w-6xl flex-col px-4 py-3 gap-1" aria-label="Mobile">
            {NAV.map((item) => (
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

              <SignedOut>
                <AuthModal
                  trigger={
                    <button
                      type="button"
                      className="w-full h-11 rounded-xl bg-accent text-ink font-semibold text-sm flex items-center justify-center transition-colors shadow-sm"
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
