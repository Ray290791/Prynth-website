import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ShoppingBag, Heart, Minus, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ColorSwatches } from "@/components/color-swatches";
import { ProductCard } from "@/components/product-card";
import { QuantityStepper } from "@/components/quantity-stepper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart-store";
import { formatINR } from "@/lib/format";
import { productColor } from "@/lib/products";
import { getProductBySlug, getRelatedProducts, getProductReviews } from "@/lib/products-fns";
import { useHydrated } from "@/lib/use-hydrated";
import { getRecentlyViewed, trackProductView, toggleWishlist } from "@/lib/ecommerce-fns";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { Star } from "lucide-react";

export const Route = createFileRoute("/shop/$slug")({
  loader: async ({ params }) => {
    const product = await getProductBySlug({ data: params.slug });
    if (!product) throw new Error("Product not found");
    const [related, reviews] = await Promise.all([
      getRelatedProducts({ data: params.slug }),
      getProductReviews({ data: params.slug }),
    ]);
    return { product, related, reviews };
  },
  head: ({ loaderData }) => {
    if (!loaderData?.product) return {};
    const p = loaderData.product;
    return {
      meta: [
        { title: `${p.name} | prynth!` },
        { name: "description", content: p.description.substring(0, 160) },
        { property: "og:title", content: `${p.name} | prynth!` },
        { property: "og:description", content: p.description.substring(0, 160) },
        { property: "og:image", content: p.image },
        { property: "og:type", content: "product" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: `${p.name} | prynth!` },
        { name: "twitter:description", content: p.description.substring(0, 160) },
        { name: "twitter:image", content: p.image },
      ]
    };
  },
  component: ProductPage,
});

function ProductPage() {
  const { product, related, reviews } = Route.useLoaderData();
  const user = useCurrentUser();
  const navigate = useNavigate();
  const add = useCart((s) => s.add);
  const items = useCart((s) => s.items);
  const setQtyInCart = useCart((s) => s.setQty);
  const hydrated = useHydrated();
  const [color, setColor] = useState(product?.colors?.[0] ?? "charcoal");
  const [size, setSize] = useState(product?.sizes?.[0] ?? product?.size ?? "");
  const [material, setMaterial] = useState(product?.materials?.[0] ?? product?.material ?? "");
  const [qty, setQty] = useState(1);
  const [notifyEmail, setNotifyEmail] = useState("");

  const selectedTags = [
    productColor(color).name,
    size,
    material
  ].filter(Boolean).map(t => t.toLowerCase());

  const filteredGallery = (product?.gallery || []).filter(img => {
    if (!img.tags || img.tags.length === 0) return false;
    const imgTags = img.tags.map(t => t.toLowerCase());
    return imgTags.some(t => selectedTags.includes(t));
  });

  const displayImages = filteredGallery.length > 0 
    ? filteredGallery.map(g => g.url) 
    : (product?.gallery && product.gallery.length > 0 ? product.gallery.map(g => g.url) : [product?.image || ""]);
  
  const [activeImage, setActiveImage] = useState(displayImages[0]);

  useEffect(() => {
    setActiveImage(displayImages[0]);
  }, [displayImages.join(",")]);

  const trackViewMutation = useMutation({
    mutationFn: trackProductView,
  });

  const wishlistMutation = useMutation({
    mutationFn: toggleWishlist,
    onSuccess: (data) => {
      toast.success(data.added ? "Added to wishlist" : "Removed from wishlist");
    }
  });

  const { data: recentlyViewed } = useQuery({
    queryKey: ["recentlyViewed"],
    queryFn: () => getRecentlyViewed(),
    enabled: !!user,
  });

  useEffect(() => {
    if (product) {
      setColor(product.colors?.[0] ?? "charcoal");
      setSize(product.sizes?.[0] ?? product.size ?? "");
      setMaterial(product.materials?.[0] ?? product.material ?? "");
      setQty(1);
      import("@/lib/product-history").then(({ recordProductView }) => {
        recordProductView(product.slug);
      });
      if (user) {
        trackViewMutation.mutate({ data: product.slug });
      }
    }
  }, [product?.slug, user?.id]);

  if (!product) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-24 text-center md:px-6">
        <h1 className="font-display text-3xl font-semibold">We don't make that one</h1>
        <p className="mt-2 text-muted">It might have been renamed, or the link is old.</p>
        <Button asChild className="mt-6">
          <Link to="/shop">Back to shop</Link>
        </Button>
      </div>
    );
  }

  const productCartItems = items.filter(
    i => i.productSlug === product?.slug && i.color === color && i.size === (size || undefined)
  );
  const totalQty = hydrated ? productCartItems.reduce((acc, i) => acc + i.qty, 0) : 0;

  const handleNotifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (notifyEmail) {
      toast.success("We'll email you when it's back in stock!");
      setNotifyEmail("");
    }
  };

  const selectedVariant = product.variants?.find(v => 
    (v.color === color || (v.color === null && !color)) && 
    (v.size === size || (v.size === null && !size))
  );

  const displayPrice = selectedVariant?.price ?? product.price;
  const displayStock = selectedVariant?.stockCount ?? product.stockCount ?? -1;
  const isOutOfStock = product.inStock === false || displayStock === 0;

  function addToCart() {
    if (!product) return;
    add({
      kind: "product",
      productSlug: product.slug,
      name: product.name,
      image: product.image,
      color,
      size: size || undefined,
      material: material || undefined,
      unitPrice: displayPrice,
      qty,
    });
    toast.success(`${product.name} added to cart`, {
      description: `${productColor(color).name} ${size ? `· ${size}` : ""} ${material ? `· ${material}` : ""} · Qty: ${qty}`,
    });
  }

  function handleQtyChange(newQty: number) {
    if (!product) return;
    if (newQty > totalQty) {
      add({
        kind: "product",
        productSlug: product.slug,
        name: product.name,
        image: product.image,
        color,
        size: size || undefined,
        unitPrice: displayPrice,
        qty: 1,
      });
    } else if (newQty < totalQty) {
      const firstItem = productCartItems[0];
      if (firstItem) {
        setQtyInCart(firstItem.id, firstItem.qty - 1);
      }
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 pb-32 md:px-6 md:py-16 md:pb-16 relative">
      <p className="text-sm text-subtle">
        <Link to="/shop" className="hover:text-fg">
          Shop
        </Link>
        <span className="mx-2">/</span>
        <span className="text-fg">{product.name}</span>
      </p>

      <div className="mt-8 grid gap-10 md:grid-cols-12 md:gap-10 lg:gap-14">
        <div className="md:col-span-6 lg:col-span-7">
          <div className="flex flex-col gap-4">
            <div className="overflow-hidden rounded-3xl bg-surface shadow-[var(--shadow-border)] transition-opacity duration-300">
              <img
                src={activeImage}
                alt={product.name}
                fetchPriority="high"
                loading="eager"
                className="product-photo aspect-square w-full object-cover"
              />
            </div>
            {displayImages.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2 snap-x">
                {displayImages.map((img, i) => (
                  <button 
                    key={i} 
                    onClick={() => setActiveImage(img)}
                    className={`shrink-0 snap-center rounded-xl overflow-hidden border-2 transition-all w-20 h-20 md:w-24 md:h-24 ${activeImage === img ? 'border-primary ring-2 ring-primary/20 scale-95' : 'border-transparent hover:border-border'}`}
                  >
                    <img src={img} alt="" loading="lazy" className="w-full h-full object-cover bg-surface" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="md:col-span-6 lg:col-span-5">
          <div className="flex items-center justify-between">
            <div>{product.badge ? <Badge>{product.badge}</Badge> : null}</div>
            {user && (
              <button 
                onClick={() => wishlistMutation.mutate({ data: product.slug })}
                disabled={wishlistMutation.isPending}
                className="flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm font-medium hover:bg-secondary transition-colors"
              >
                <Heart className="size-4" />
                Save
              </button>
            )}
          </div>
          <h1 className="mt-3 font-display text-3xl sm:text-4xl font-semibold tracking-tight">
            {product.name}
          </h1>
          <p className="mt-3 text-xl sm:text-2xl font-medium tabular-nums">
            {formatINR(displayPrice)}
          </p>
          <p className="mt-1 text-sm text-subtle">Includes packaging. Made to order.</p>
          <p className="mt-5 text-muted">{product.description}</p>

          <div className="mt-8">
            <p className="mb-2 text-sm font-medium">Colour</p>
            <ColorSwatches
              colors={product.colors}
              value={color}
              onChange={setColor}
            />
          </div>

          {product.sizes && product.sizes.length > 0 && (
            <div className="mt-6">
              <p className="mb-2 text-sm font-medium">Size</p>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((s: string) => (
                  <button
                    key={s}
                    onClick={() => setSize(s)}
                    className={`rounded-md border px-4 py-2 text-sm font-medium transition-colors active:scale-95 ${
                      size === s ? "border-primary bg-primary text-primary-foreground shadow-md" : "border-border hover:bg-secondary text-muted hover:text-fg"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {product.materials && product.materials.length > 0 && (
            <div className="mt-6">
              <p className="mb-2 text-sm font-medium">Material</p>
              <div className="flex flex-wrap gap-2">
                {product.materials.map((m: string) => (
                  <button
                    key={m}
                    onClick={() => setMaterial(m)}
                    className={`rounded-md border px-4 py-2 text-sm font-medium transition-colors active:scale-95 ${
                      material === m ? "border-primary bg-primary text-primary-foreground shadow-md" : "border-border hover:bg-secondary text-muted hover:text-fg"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!isOutOfStock ? (
            <>
              {totalQty === 0 && (
                <div className="mt-6">
                  <p className="mb-2 text-sm font-medium">Quantity</p>
                  <QuantityStepper 
                    value={qty} 
                    onChange={setQty} 
                    max={displayStock > 0 ? displayStock : 99} 
                  />
                </div>
              )}

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                {totalQty > 0 ? (
                  <div 
                    className="flex h-11 sm:flex-1 overflow-hidden rounded-lg bg-accent text-ink transition-transform active:scale-[0.98]" 
                    onClick={e => e.preventDefault()}
                  >
                    <div className="flex flex-1 items-center justify-between px-2">
                      <button 
                        type="button"
                        className="flex size-9 items-center justify-center rounded-md transition-colors hover:bg-black/10 active:scale-95"
                        onClick={() => handleQtyChange(totalQty - 1)}
                      >
                        <Minus className="size-5" strokeWidth={2.5} />
                      </button>
                      <span className="text-base font-semibold tabular-nums">{totalQty}</span>
                      <button 
                        type="button"
                        className="flex size-9 items-center justify-center rounded-md transition-colors hover:bg-black/10 active:scale-95"
                        onClick={() => handleQtyChange(totalQty + 1)}
                      >
                        <Plus className="size-5" strokeWidth={2.5} />
                      </button>
                    </div>
                    
                    <div className="w-[1px] bg-ink/15" />
                    
                    <button 
                      type="button"
                      className="flex w-12 items-center justify-center transition-colors hover:bg-black/10 active:scale-95"
                      onClick={() => {
                        productCartItems.forEach(item => setQtyInCart(item.id, 0));
                      }}
                    >
                      <Trash2 className="size-5" strokeWidth={2} />
                    </button>
                  </div>
                ) : (
                  <Button size="lg" className="sm:flex-1" onClick={addToCart}>
                    <ShoppingBag className="size-4" strokeWidth={1.75} />
                    Add to cart
                  </Button>
                )}
                
                {totalQty === 0 && (
                  <Button
                    size="lg"
                    variant="secondary"
                    onClick={() => { addToCart(); navigate({ to: "/checkout" }); }}
                  >
                    Buy now
                  </Button>
                )}
              </div>
            </>
          ) : (
            <div className="mt-8 rounded-xl border border-border bg-secondary/50 p-6">
              <h3 className="font-semibold text-destructive">Out of Stock</h3>
              <p className="mt-1 text-sm text-muted">Enter your email to be notified when this is back.</p>
              <form onSubmit={handleNotifySubmit} className="mt-4 flex gap-2">
                <input 
                  type="email" 
                  value={notifyEmail}
                  onChange={(e) => setNotifyEmail(e.target.value)}
                  placeholder="Your email address" 
                  className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  required
                />
                <Button type="submit">Notify Me</Button>
              </form>
            </div>
          )}

          <dl className="mt-10 grid grid-cols-1 gap-4 border-t border-border pt-6 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-subtle">Base Size</dt>
              <dd className="mt-1 text-fg">{size || product.size}</dd>
            </div>
            <div>
              <dt className="text-subtle">Material</dt>
              <dd className="mt-1 text-fg">{material || product.material}</dd>
            </div>
            <div>
              <dt className="text-subtle">Turnaround</dt>
              <dd className="mt-1 text-fg">{product.printTime}</dd>
            </div>
            <div>
              <dt className="text-subtle">Includes</dt>
              <dd className="mt-1 text-fg">{product.includes}</dd>
            </div>
          </dl>
          <p className="mt-4 text-sm text-muted">{product.care}</p>
        </div>
      </div>

      <section className="mt-20">
        <h2 className="font-display text-2xl font-semibold tracking-tight">
          Customer Reviews
        </h2>
        {reviews.length === 0 ? (
          <p className="mt-6 text-muted">No reviews yet. Be the first to review this product!</p>
        ) : (
          <div className="mt-8 space-y-8">
            <div className="flex items-center gap-4 border-b border-border pb-6">
              <div className="text-4xl font-semibold">
                {(reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)}
              </div>
              <div>
                <div className="flex text-brand">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star 
                      key={s} 
                      className="size-5" 
                      fill={s <= Math.round(reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length) ? "currentColor" : "none"} 
                    />
                  ))}
                </div>
                <p className="mt-1 text-sm text-muted">Based on {reviews.length} review{reviews.length === 1 ? '' : 's'}</p>
              </div>
            </div>
            
            <div className="divide-y divide-border">
              {reviews.map((r) => (
                <div key={r.id} className="py-6">
                  <div className="flex items-center gap-3">
                    <div className="size-10 overflow-hidden rounded-full bg-surface-2">
                      {r.user_image ? (
                        <img src={r.user_image} alt={r.user_name} className="size-full object-cover" />
                      ) : (
                        <div className="flex size-full items-center justify-center text-sm font-medium">
                          {r.user_name?.[0]?.toUpperCase() || '?'}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{r.user_name}</p>
                      <div className="flex text-brand mt-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} className="size-3" fill={s <= r.rating ? "currentColor" : "none"} />
                        ))}
                      </div>
                    </div>
                    <div className="ml-auto text-sm text-muted">
                      {new Date(r.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                  {r.comment && <p className="mt-4 text-muted">{r.comment}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="mt-20">
        <h2 className="font-display text-2xl font-semibold tracking-tight">
          Also in the shop
        </h2>
        <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 sm:gap-y-12 lg:grid-cols-4">
          {related.map((p) => (
            <ProductCard key={p.slug} product={p} />
          ))}
        </div>
      </section>

      {recentlyViewed && recentlyViewed.length > 0 && (
        <section className="mt-20 border-t border-border pt-16">
          <h2 className="font-display text-2xl font-semibold tracking-tight">
            Recently Viewed
          </h2>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {recentlyViewed.filter(rv => rv.product_slug !== product.slug).slice(0, 5).map((rv) => (
              <Link key={rv.id} to="/shop/$slug" params={{ slug: rv.product_slug }} target="_blank" className="group block">
                <div className="overflow-hidden rounded-lg border border-border bg-surface">
                  <img src={rv.image} alt={rv.name} className="aspect-square object-cover transition-transform group-hover:scale-105" />
                  <div className="p-3">
                    <p className="truncate text-sm font-medium">{rv.name}</p>
                    <p className="mt-1 text-xs text-muted">{formatINR(rv.price)}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Sticky Mobile Add to Cart Bar */}
      {!isOutOfStock && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-surface p-4 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] md:hidden flex items-center justify-between">
          <div>
            <p className="font-medium">{product.name}</p>
            <p className="text-sm text-muted">{formatINR(displayPrice)}</p>
          </div>
          {totalQty > 0 ? (
            <div 
              className="flex h-9 w-[120px] overflow-hidden rounded-lg bg-accent text-ink" 
            >
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
            </div>
          ) : (
            <Button onClick={addToCart} size="sm">
              <ShoppingBag className="mr-2 size-4" /> Add
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
