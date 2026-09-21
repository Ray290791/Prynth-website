import { Link } from "@tanstack/react-router";
import { ShoppingBag, Minus, Plus, Trash2 } from "lucide-react";
import { type MouseEvent } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart-store";
import { formatINR } from "@/lib/format";
import { productColor, type Product } from "@/lib/products";
import { useHydrated } from "@/lib/use-hydrated";

export function ProductCard({ product }: { product: Product }) {
  const add = useCart((s) => s.add);
  const setQty = useCart((s) => s.setQty);
  const items = useCart((s) => s.items);
  const hydrated = useHydrated();
  
  const color = product.colors[0];

  const productCartItems = items.filter(i => i.productSlug === product.slug);
  const totalQty = hydrated ? productCartItems.reduce((acc, i) => acc + i.qty, 0) : 0;

  function addToCart(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    add({
      kind: "product",
      productSlug: product.slug,
      name: product.name,
      image: product.image,
      color,
      unitPrice: product.price,
      qty: 1,
    });
    toast.success(`${product.name} added to cart`, {
      description: productColor(color).name,
    });
  }

  function handleQtyChange(newQty: number) {
    if (newQty > totalQty) {
      add({
        kind: "product",
        productSlug: product.slug,
        name: product.name,
        image: product.image,
        color,
        unitPrice: product.price,
        qty: 1,
      });
    } else if (newQty < totalQty) {
      const firstItem = productCartItems[0];
      if (firstItem) {
        setQty(firstItem.id, firstItem.qty - 1);
      }
    }
  }

  return (
    <article className="group flex flex-col">
      <Link
        to="/shop/$slug"
        params={{ slug: product.slug }}
        target="_blank"
        className="relative overflow-hidden rounded-2xl bg-surface shadow-[var(--shadow-border)] transition-[box-shadow,transform] duration-200 ease-out hover:shadow-[var(--shadow-border-hover)]"
      >
        <img
          src={product.image}
          alt={product.name}
          className="product-photo aspect-square w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03]"
        />
        {product.badge ? (
          <Badge className="absolute top-3 left-3 bg-surface/90 text-fg backdrop-blur-sm">
            {product.badge}
          </Badge>
        ) : null}
      </Link>
      <div className="flex flex-1 flex-col gap-3 pt-4">
        <div className="flex flex-col items-start justify-between gap-1 sm:flex-row sm:gap-3">
          <div>
            <Link
              to="/shop/$slug"
              params={{ slug: product.slug }}
              target="_blank"
              className="font-display text-sm sm:text-base font-semibold tracking-tight text-fg hover:text-accent line-clamp-1"
            >
              {product.name}
            </Link>
            <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-muted line-clamp-2">{product.blurb}</p>
          </div>
          <p className="shrink-0 text-sm sm:text-base font-medium tabular-nums">{formatINR(product.price)}</p>
        </div>
        
        {totalQty > 0 ? (
          <div 
            className="mt-auto flex h-9 w-full overflow-hidden rounded-lg bg-accent text-ink transition-transform active:scale-[0.98]" 
            onClick={e => e.preventDefault()}
          >
            {/* Section 1: Quantity Controls */}
            <div className="flex flex-1 items-center justify-between px-1">
              <button 
                type="button"
                className="flex size-7 items-center justify-center rounded-md transition-colors hover:bg-black/10 active:scale-95"
                onClick={() => handleQtyChange(totalQty - 1)}
              >
                <Minus className="size-4" strokeWidth={2.5} />
              </button>
              <span className="text-sm font-semibold tabular-nums">{totalQty}</span>
              <button 
                type="button"
                className="flex size-7 items-center justify-center rounded-md transition-colors hover:bg-black/10 active:scale-95"
                onClick={() => handleQtyChange(totalQty + 1)}
              >
                <Plus className="size-4" strokeWidth={2.5} />
              </button>
            </div>
            
            {/* Divider */}
            <div className="w-[1px] bg-ink/15" />
            
            {/* Section 2: Remove All */}
            <button 
              type="button"
              className="flex w-10 items-center justify-center transition-colors hover:bg-black/10 active:scale-95"
              onClick={() => {
                productCartItems.forEach(item => setQty(item.id, 0));
              }}
            >
              <Trash2 className="size-4" strokeWidth={2} />
            </button>
          </div>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            className="mt-auto w-full"
            onClick={addToCart}
          >
            <ShoppingBag className="size-4" strokeWidth={1.75} />
            Add to cart
          </Button>
        )}
      </div>
    </article>
  );
}
