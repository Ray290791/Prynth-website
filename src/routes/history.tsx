import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getProductHistory } from "@/lib/product-history";
import { type Product } from "@/lib/products";
import { getProductBySlug } from "@/lib/products-fns";
import { ProductCard } from "@/components/product-card";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/history")({ component: HistoryPage });

function HistoryPage() {
  const [history, setHistory] = useState<Product[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const localSlugs = getProductHistory();
    const hasSession = document.cookie.includes("prynth.session_token");

    async function load() {
      let slugs = localSlugs;
      if (hasSession) {
        try {
          const { getProductHistoryDb } = await import("@/lib/history-fns");
          const dbSlugs = await getProductHistoryDb();
          if (dbSlugs && dbSlugs.length > 0) {
            slugs = dbSlugs;
          }
        } catch {
          // ignore and fallback to local
        }
      }
      const products = await Promise.all(slugs.map((slug) => getProductBySlug({ data: slug })));
      setHistory(products.filter(Boolean) as Product[]);
    }
    
    load();
  }, []);

  if (!mounted) return null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-24">
      <div className="flex items-center gap-3">
        <Clock className="h-8 w-8 text-accent" />
        <h1 className="font-display text-4xl font-semibold tracking-tight">Your History</h1>
      </div>
      <p className="mt-4 text-muted">
        Items you've looked at recently.
      </p>

      {history.length === 0 ? (
        <div className="mt-12 rounded-3xl border border-border bg-surface p-12 text-center">
          <p className="text-muted">You haven't looked at any items yet.</p>
          <Button asChild className="mt-6">
            <Link to="/shop">Go to shop</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-12 grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
          {history.map((product) => (
            <ProductCard key={product.slug} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
