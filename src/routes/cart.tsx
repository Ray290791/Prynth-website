import { createFileRoute, Link } from "@tanstack/react-router";
import { ShoppingBag, Trash2 } from "lucide-react";
import { QuantityStepper } from "@/components/quantity-stepper";
import { Button } from "@/components/ui/button";
import {
  cartSubtotal,
  FREE_SHIPPING_AT,
  shippingFee,
  useCart,
} from "@/lib/cart-store";
import { formatINR } from "@/lib/format";
import { productColor } from "@/lib/products";
import { useHydrated } from "@/lib/use-hydrated";

export const Route = createFileRoute("/cart")({ component: CartPage });

function CartPage() {
  const hydrated = useHydrated();
  const items = useCart((s) => s.items);
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);
  const subtotal = cartSubtotal(items);
  const ship = shippingFee(subtotal, "standard");
  const remaining = Math.max(0, FREE_SHIPPING_AT - subtotal);

  if (!hydrated) {
    return <div className="mx-auto max-w-6xl px-4 py-16 md:px-6">Loading cart…</div>;
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-24 text-center md:px-6">
        <ShoppingBag className="mx-auto size-8 text-accent" strokeWidth={1.5} />
        <h1 className="mt-4 font-display text-3xl font-semibold">Your cart is empty</h1>
        <p className="mt-2 text-muted">Ready-made pieces, or a custom quote — both live here.</p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild>
            <Link to="/shop">Browse the shop</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link to="/custom">Custom order</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-16">
      <h1 className="font-display text-4xl font-semibold tracking-tight">Cart</h1>
      <div className="mt-10 grid gap-10 md:grid-cols-12">
        <ul className="space-y-4 md:col-span-7">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex gap-4 rounded-2xl bg-surface p-4 shadow-[var(--shadow-border)] sm:p-5"
            >
              {item.image ? (
                <img
                  src={item.image}
                  alt=""
                  loading="lazy"
                  className="product-photo size-24 rounded-xl object-cover sm:size-28"
                />
              ) : (
                <div className="flex size-24 items-center justify-center rounded-xl bg-accent-soft text-sm font-medium text-accent sm:size-28">
                  custom
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="mt-1 text-sm text-muted">
                      {productColor(item.color).name}
                      {item.custom?.material ? ` · ${item.custom.material}` : ""}
                    </p>
                    {item.custom?.fileName ? (
                      <p className="mt-1 truncate text-xs text-subtle">{item.custom.fileName}</p>
                    ) : null}
                  </div>
                  <p className="shrink-0 font-medium tabular-nums">
                    {formatINR(item.unitPrice * item.qty)}
                  </p>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <QuantityStepper
                    value={item.qty}
                    onChange={(n) => setQty(item.id, n)}
                  />
                  <button
                    type="button"
                    onClick={() => remove(item.id)}
                    className="inline-flex h-11 items-center gap-1.5 rounded-xl px-3 text-sm text-muted hover:bg-surface-2 hover:text-fg"
                  >
                    <Trash2 className="size-4" strokeWidth={1.75} />
                    Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <aside className="h-fit rounded-3xl bg-surface p-6 shadow-[var(--shadow-border)] md:sticky md:top-24 md:col-span-5">
          <h2 className="font-display text-xl font-semibold">Summary</h2>
          <dl className="mt-5 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Subtotal</dt>
              <dd className="tabular-nums">{formatINR(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Standard shipping</dt>
              <dd className="tabular-nums">{ship === 0 ? "Free" : formatINR(ship)}</dd>
            </div>
          </dl>
          {remaining > 0 ? (
            <p className="mt-4 text-sm text-muted">
              Add {formatINR(remaining)} for free standard shipping.
            </p>
          ) : (
            <p className="mt-4 text-sm text-muted">Free standard shipping unlocked.</p>
          )}
          <div className="mt-5 flex justify-between border-t border-border pt-4 text-base font-medium">
            <span>Total</span>
            <span className="tabular-nums">{formatINR(subtotal + ship)}</span>
          </div>
          <Button asChild size="lg" className="mt-6 w-full">
            <Link to="/checkout">Checkout</Link>
          </Button>
          <Button asChild variant="ghost" className="mt-2 w-full">
            <Link to="/shop">Continue shopping</Link>
          </Button>
        </aside>
      </div>
    </div>
  );
}
