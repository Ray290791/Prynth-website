import { useState, useEffect, useRef } from "react";
import { Search, X, Loader2 } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getProductsPublic } from "@/lib/products-fns";
import { cn } from "@/lib/utils";

export function InlineSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const { data: products, isLoading } = useQuery({
    queryKey: ["products", "search"],
    queryFn: () => getProductsPublic(),
    enabled: open, // Only fetch when search is active
  });

  const filteredProducts = products?.filter((p) => {
    const q = query.toLowerCase();
    const pCats = p.categories && p.categories.length > 0 ? p.categories.map(c => c.toLowerCase()) : (p.category ? [p.category.toLowerCase()] : []);
    return (
      p.name.toLowerCase().includes(q) ||
      (p.blurb && p.blurb.toLowerCase().includes(q)) ||
      pCats.some(c => c.includes(q))
    );
  }) || [];

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
    }
  }, [open]);

  // Handle click outside to close
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      window.addEventListener("mousedown", handleOutsideClick);
    }
    return () => window.removeEventListener("mousedown", handleOutsideClick);
  }, [open]);

  // Handle Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      } else if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const handleSelect = (slug: string) => {
    setOpen(false);
    setQuery("");
    navigate({ to: "/shop/$slug", params: { slug } });
  };

  return (
    <div ref={containerRef} className="relative flex items-center justify-end">
      {/* Search Bar Container */}
      <div 
        className={cn(
          "flex items-center overflow-hidden transition-all duration-300 ease-in-out bg-surface-2 rounded-xl",
          open ? "w-64 opacity-100 px-2" : "w-11 opacity-0 pointer-events-none"
        )}
      >
        <Search className="size-5 text-muted shrink-0 ml-1" strokeWidth={1.75} />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search products..."
          className="w-full bg-transparent border-none outline-none text-sm text-fg placeholder:text-muted py-2.5 px-2"
        />
        <button 
          onClick={() => {
            setOpen(false);
            setQuery("");
          }}
          className="p-1 text-muted hover:text-fg transition-colors"
        >
          <X className="size-4" strokeWidth={2} />
        </button>
      </div>

      {/* Trigger Button (Shows when closed) */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search products"
        className={cn(
          "absolute right-0 inline-flex size-11 items-center justify-center rounded-xl text-fg hover:bg-surface-2 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70",
          open ? "opacity-0 scale-95 pointer-events-none" : "opacity-100 scale-100"
        )}
      >
        <Search className="size-5" strokeWidth={1.75} />
      </button>

      {/* Dropdown Results */}
      {open && query.trim().length > 0 && (
        <div className="absolute top-14 right-0 w-80 max-h-[70vh] overflow-hidden bg-glass backdrop-blur-2xl backdrop-saturate-150 border border-glass-border shadow-xl shadow-black/5 rounded-2xl flex flex-col z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="overflow-y-auto p-2">
            {isLoading && (
              <div className="p-8 flex items-center justify-center text-muted">
                <Loader2 className="size-5 animate-spin" />
              </div>
            )}
            
            {!isLoading && query && filteredProducts.length === 0 && (
              <div className="p-8 text-center text-sm text-muted">
                No products found for "{query}"
              </div>
            )}

            {!isLoading && filteredProducts.length > 0 && (
              <div className="flex flex-col gap-1">
                {filteredProducts.map((product) => (
                  <button
                    key={product.slug}
                    onClick={() => handleSelect(product.slug)}
                    className="flex items-center gap-3 p-2 hover:bg-surface-2 rounded-xl text-left transition-colors"
                  >
                    <div className="size-10 shrink-0 bg-surface rounded-md overflow-hidden border border-border">
                      {product.image ? (
                        <img src={product.image} alt={product.name} loading="lazy" className="w-full h-full object-cover" />
                      ) : null}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <h4 className="font-medium text-sm text-fg truncate">{product.name}</h4>
                      <p className="text-xs text-muted truncate">{product.category}</p>
                    </div>
                    <div className="text-xs font-medium text-fg whitespace-nowrap">
                      ₹{Number(product.price).toLocaleString("en-IN")}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
