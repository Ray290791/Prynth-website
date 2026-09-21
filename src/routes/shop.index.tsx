import { createFileRoute, getRouteApi } from "@tanstack/react-router";

const rootRoute = getRouteApi("__root__");
import { useMemo, useState } from "react";
import { ProductCard } from "@/components/product-card";
import { Input } from "@/components/ui/input";
import { type Category } from "@/lib/products";
import { getProductsPublic } from "@/lib/products-fns";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/shop/")({
  loader: async () => await getProductsPublic(),
  component: ShopPage,
});

// Categories are now loaded dynamically from settings

function ShopPage() {
  const products = Route.useLoaderData();
  const { settings } = rootRoute.useLoaderData();
  
  const categories = useMemo(() => {
    const raw = (settings?.product_categories || "Desk, Home, Bath").split(",").map(s => s.trim());
    const mapped = raw.map(c => ({ id: c.toLowerCase() as Category, label: c }));
    return [{ id: "all" as const, label: "All products" }, ...mapped];
  }, [settings]);

  const [category, setCategory] = useState<"all" | Category>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("featured");

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = products.filter((p) => {
      if (category !== "all" && p.category !== category) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.blurb.toLowerCase().includes(q) ||
        p.category.includes(q)
      );
    });

    return filtered.sort((a, b) => {
      if (sort === "price_asc") return a.price - b.price;
      if (sort === "price_desc") return b.price - a.price;
      if (sort === "newest") return b.badge === "New" ? 1 : -1;
      return 0; 
    });
  }, [category, query, sort, products]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-16">
      <p className="text-[11px] font-medium tracking-[0.18em] text-subtle uppercase">
        Ready-made
      </p>
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight md:text-5xl">
        Shop
      </h1>
      <p className="mt-3 max-w-xl text-muted">
        Printed when you order, in the colour you pick. The price on the card is
        the price you pay.
      </p>

      <div className="mt-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Category">
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={category === c.id}
              onClick={() => setCategory(c.id)}
              className={cn(
                "h-11 rounded-full px-4 text-sm font-medium transition-colors duration-150",
                category === c.id
                  ? "bg-accent text-ink"
                  : "bg-surface text-muted shadow-[var(--shadow-border)] hover:text-fg",
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 items-center">
          <select 
            value={sort} 
            onChange={(e) => setSort(e.target.value)}
            className="w-[140px] h-11 bg-surface border-none shadow-[var(--shadow-border)] rounded-md px-3 text-sm focus:ring-1 focus:ring-accent outline-none appearance-none cursor-pointer"
            aria-label="Sort by"
          >
            <option value="featured">Featured</option>
            <option value="newest">Newest</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
          </select>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search prints"
            aria-label="Search prints"
            className="md:max-w-xs h-11"
          />
        </div>
      </div>

      {list.length === 0 ? (
        <p className="mt-16 text-center text-muted">
          Nothing matches that. Try another word, or browse all.
        </p>
      ) : (
        <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 sm:gap-y-12 lg:grid-cols-3 xl:grid-cols-4">
          {list.map((p) => (
            <ProductCard key={p.slug} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
