import { useState, useEffect, useRef } from "react";
import { Link, useRouterState, getRouteApi } from "@tanstack/react-router";
import {
  ShoppingBag,
  ChevronRight,
  ChevronLeft,
  X,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  Truck,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useCart, cartCount, cartSubtotal, FREE_SHIPPING_AT } from "@/lib/cart-store";
import { formatINR } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const rootRoute = getRouteApi("__root__");

export function CartSideRibbon() {
  const rootData = rootRoute.useLoaderData();
  const freeThreshold = Number(rootData?.settings?.free_shipping_threshold) || FREE_SHIPPING_AT;
  const router = useRouterState();
  const pathname = router.location.pathname;

  const { items, setQty, remove } = useCart();
  const count = cartCount(items);
  const subtotal = cartSubtotal(items);

  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(count);
  const autoCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const closeRibbon = () => {
    if (autoCloseTimerRef.current) {
      clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = null;
    }
    setIsOpen(false);
  };

  // Clean up any legacy pinned preference in storage
  useEffect(() => {
    try {
      localStorage.removeItem("prynth_side_ribbon_pinned");
    } catch {
      // ignore
    }
  }, []);

  // Close ribbon on route change
  useEffect(() => {
    closeRibbon();
  }, [pathname]);

  // Close ribbon when clicking anywhere outside or pressing Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        closeRibbon();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeRibbon();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Auto-peek when new item is added to cart
  useEffect(() => {
    if (count > prevCountRef.current) {
      setIsOpen(true);
      if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = setTimeout(() => {
        closeRibbon();
      }, 5000);
    }
    prevCountRef.current = count;
  }, [count]);

  // Hide on checkout or admin routes
  if (pathname.startsWith("/checkout") || pathname.startsWith("/admin")) {
    return null;
  }

  const freeShippingProgress = Math.min(100, Math.round((subtotal / freeThreshold) * 100));
  const amountToFreeShipping = Math.max(0, freeThreshold - subtotal);

  return (
    <aside
      aria-label="Quick Cart Side Ribbon"
      className="hidden xl:block pointer-events-none select-none"
    >
      {/* ── COLLAPSED VERTICAL TAB PILL ───────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-hidden={isOpen}
        tabIndex={isOpen ? -1 : 0}
        className={cn(
          "pointer-events-auto fixed right-0 top-1/2 -translate-y-1/2 z-30 group flex flex-col items-center gap-2",
          "rounded-l-2xl border-l-2 border-y-2 border-accent/60 bg-surface/90 dark:bg-surface-2/95 backdrop-blur-2xl",
          "p-2.5 shadow-2xl shadow-black/30 transition-all duration-300 hover:pr-3.5 hover:border-accent cursor-pointer",
          isOpen && "opacity-0 pointer-events-none translate-x-4"
        )}
        title="Open Cart Ribbon"
      >
        <div className="relative">
          <ShoppingBag className="size-5 text-accent transition-transform group-hover:scale-110" />
          {count > 0 && (
            <span className="absolute -top-1.5 -right-2 flex size-4 items-center justify-center rounded-full bg-accent text-[9px] font-bold text-ink">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </div>

        <span
          className="text-[11px] font-semibold text-fg tracking-wider uppercase [writing-mode:vertical-rl] rotate-180 py-1"
        >
          Cart
        </span>

        {subtotal > 0 && (
          <span className="rounded-md bg-accent/15 px-1.5 py-0.5 text-[10px] font-bold text-accent tabular-nums">
            {formatINR(subtotal)}
          </span>
        )}

        <ChevronLeft className="size-3.5 text-muted group-hover:text-accent transition-transform group-hover:-translate-x-0.5" />
      </button>

      {/* ── EXPANDED FLOATING DOCKED PANEL ────────────────────────────────── */}
      <div
        ref={panelRef}
        className={cn(
          "pointer-events-auto fixed right-0 top-20 bottom-6 z-40 flex flex-col",
          "w-80 2xl:w-92 rounded-l-3xl border-l border-y border-white/20 dark:border-white/10",
          "bg-surface/95 dark:bg-surface-2/95 backdrop-blur-2xl shadow-2xl shadow-black/40",
          "transition-all duration-300 ease-out overflow-hidden",
          isOpen ? "translate-x-0 opacity-100" : "translate-x-full opacity-0 pointer-events-none"
        )}
      >
        {/* PANEL HEADER */}
        <div className="flex items-center justify-between border-b border-border/70 px-4 py-3.5 bg-surface/50">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-accent/15 text-accent">
              <ShoppingBag className="size-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-fg">Studio Cart</span>
                <span className="rounded-full bg-accent/20 px-1.5 py-0.2 text-[10px] font-bold text-accent">
                  {count}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={closeRibbon}
              title="Close ribbon"
              className="size-7 rounded-lg flex items-center justify-center text-muted hover:bg-surface-2 hover:text-fg transition-colors cursor-pointer"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>

        {/* FREE SHIPPING PROGRESS METER */}
        <div className="border-b border-border/60 bg-surface-2/40 px-4 py-2.5">
          <div className="flex items-center justify-between text-[11px] font-medium">
            <span className="flex items-center gap-1 text-muted">
              <Truck className="size-3 text-accent" />
              <span>
                {amountToFreeShipping > 0
                  ? `Add ${formatINR(amountToFreeShipping)} for Free Standard Shipping`
                  : "🎉 Free Standard Shipping Unlocked!"}
              </span>
            </span>
            <span className="text-[10px] font-semibold text-accent">{freeShippingProgress}%</span>
          </div>

          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-2 border border-border/50">
            <div
              className="h-full rounded-full bg-accent transition-all duration-500"
              style={{ width: `${freeShippingProgress}%` }}
            />
          </div>
        </div>

        {/* ITEMS SCROLLABLE LIST */}
        <div className="flex-1 overflow-y-auto px-4 py-3 divide-y divide-border/50 space-y-3">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
              <div className="size-12 rounded-2xl bg-surface-2 flex items-center justify-center text-muted">
                <ShoppingBag className="size-6 stroke-[1.5]" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold text-fg">Your cart is empty</p>
                <p className="text-[11px] text-muted max-w-[200px]">
                  Explore precision pegboards or configure a custom 3D model.
                </p>
              </div>

              <div className="flex flex-col gap-1.5 w-full pt-2">
                <Link
                  to="/pegboard"
                  onClick={closeRibbon}
                  className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-fg hover:border-accent hover:text-accent transition-colors"
                >
                  Explore Modular Pegboard
                </Link>
                <Link
                  to="/shop"
                  onClick={closeRibbon}
                  className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-fg hover:border-accent hover:text-accent transition-colors"
                >
                  Browse Ready-Made Prints
                </Link>
              </div>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="pt-3 first:pt-0 flex gap-3 items-start group">
                {/* Thumbnail */}
                <div className="size-14 rounded-xl border border-border overflow-hidden bg-surface-2 shrink-0">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="size-full object-cover"
                    />
                  ) : (
                    <div className="size-full flex items-center justify-center text-muted">
                      <ShoppingBag className="size-5" />
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-start justify-between gap-1">
                    <h4 className="text-xs font-semibold text-fg truncate leading-tight">
                      {item.name}
                    </h4>
                    <button
                      type="button"
                      onClick={() => remove(item.id)}
                      className="text-subtle hover:text-danger p-0.5 rounded transition-colors cursor-pointer shrink-0"
                      title="Remove item"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-muted">
                    {item.color && (
                      <span className="rounded bg-surface-2 px-1.5 py-0.5 border border-border/50">
                        {item.color}
                      </span>
                    )}
                    {item.size && (
                      <span className="rounded bg-surface-2 px-1.5 py-0.5 border border-border/50">
                        {item.size}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    {/* Qty controls */}
                    <div className="flex items-center border border-border rounded-lg bg-surface-2/60">
                      <button
                        type="button"
                        onClick={() => setQty(item.id, item.qty - 1)}
                        className="size-5 flex items-center justify-center text-muted hover:text-fg transition-colors cursor-pointer"
                      >
                        <Minus className="size-2.5" />
                      </button>
                      <span className="text-[11px] font-bold text-fg px-1.5 tabular-nums">
                        {item.qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQty(item.id, item.qty + 1)}
                        className="size-5 flex items-center justify-center text-muted hover:text-fg transition-colors cursor-pointer"
                      >
                        <Plus className="size-2.5" />
                      </button>
                    </div>

                    <span className="text-xs font-bold text-fg tabular-nums">
                      {formatINR(item.unitPrice * item.qty)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* PANEL FOOTER ACTIONS */}
        {items.length > 0 && (
          <div className="border-t border-border/80 bg-surface/70 p-4 space-y-3">
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-xs text-muted block">Subtotal</span>
                <span className="text-[10px] text-subtle block">Taxes included</span>
              </div>
              <span className="text-base font-bold text-fg tabular-nums">
                {formatINR(subtotal)}
              </span>
            </div>

            <div className="space-y-2">
              <Button
                asChild
                className="w-full h-10 bg-accent text-ink hover:opacity-95 font-semibold text-xs cursor-pointer shadow-md shadow-accent/20"
              >
                <Link to="/checkout" onClick={closeRibbon}>
                  <span>Express Checkout</span>
                  <ArrowRight className="size-3.5 ml-1.5" />
                </Link>
              </Button>

              <Button
                asChild
                variant="outline"
                className="w-full h-8 text-xs font-medium cursor-pointer border-border hover:bg-surface-2"
              >
                <Link to="/cart" onClick={closeRibbon}>
                  View Full Cart ({count})
                </Link>
              </Button>
            </div>

            {/* Micro trust cues */}
            <div className="flex items-center justify-center gap-3 pt-1 text-[10px] text-subtle">
              <span className="flex items-center gap-1">
                <ShieldCheck className="size-3 text-accent" />
                <span>Secure Checkout</span>
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Sparkles className="size-3 text-accent" />
                <span>Pan-India Air</span>
              </span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
