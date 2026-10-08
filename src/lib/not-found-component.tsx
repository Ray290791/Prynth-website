import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { PackageX, Home, ShoppingBag, PenTool, HelpCircle } from "lucide-react";

export function NotFoundComponent() {
  useEffect(() => {
    document.title = "404 - Page Not Found | prynth!";
  }, []);

  return (
    <div className="mx-auto flex min-h-[65vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center animate-in fade-in duration-300">
      <div className="rounded-2xl border border-border bg-surface-2/80 p-5 text-accent shadow-xs">
        <PackageX className="size-10" strokeWidth={1.75} />
      </div>
      <p className="mt-6 text-xs font-semibold uppercase tracking-widest text-accent">
        Error 404
      </p>
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-fg sm:text-5xl">
        Page Not Found
      </h1>
      <p className="mt-3 text-sm text-muted max-w-sm leading-relaxed">
        The 3D model, page, or link you're looking for doesn't exist or may have moved.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-ink transition-transform active:scale-95 shadow-xs"
        >
          <Home className="size-4" />
          <span>Home</span>
        </Link>
        <Link
          to="/shop"
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-5 py-2.5 text-sm font-medium text-fg transition-colors hover:bg-surface-2"
        >
          <ShoppingBag className="size-4 text-muted" />
          <span>Browse Shop</span>
        </Link>
        <Link
          to="/custom"
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-5 py-2.5 text-sm font-medium text-fg transition-colors hover:bg-surface-2"
        >
          <PenTool className="size-4 text-muted" />
          <span>Custom Prints</span>
        </Link>
        <Link
          to="/contact"
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-5 py-2.5 text-sm font-medium text-fg transition-colors hover:bg-surface-2"
        >
          <HelpCircle className="size-4 text-muted" />
          <span>Contact Us</span>
        </Link>
      </div>
    </div>
  );
}
