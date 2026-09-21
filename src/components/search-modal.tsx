import { useState, useEffect, useRef } from "react";
import { Search, X, Loader2 } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getProductsPublic } from "@/lib/products-fns";
import * as Dialog from "@radix-ui/react-dialog";

export function SearchModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const { data: products, isLoading } = useQuery({
    queryKey: ["products", "search"],
    queryFn: () => getProductsPublic(),
    enabled: open,
  });

  const filteredProducts = products?.filter((p) => {
    const q = query.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
  }) || [];

  // Focus input when modal opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 10);
      setQuery("");
    }
  }, [open]);

  // Handle Cmd+K / Ctrl+K to open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onOpenChange(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onOpenChange]);

  const handleSelect = (slug: string) => {
    onOpenChange(false);
    navigate({ to: "/shop/$slug", params: { slug } });
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[20%] z-50 w-full max-w-2xl translate-x-[-50%] gap-4 p-4 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[15%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[15%]">
          <div className="bg-bg border border-border shadow-2xl rounded-2xl overflow-hidden flex flex-col max-h-[70vh]">
            <div className="flex items-center px-4 py-3 border-b border-border gap-3">
              <Search className="size-5 text-muted shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search products..."
                className="flex-1 bg-transparent border-none outline-none text-fg placeholder:text-muted text-base sm:text-lg"
              />
              <Dialog.Close asChild>
                <button className="p-1 rounded-lg hover:bg-surface text-muted hover:text-fg transition-colors">
                  <X className="size-5" />
                  <span className="sr-only">Close</span>
                </button>
              </Dialog.Close>
            </div>
            
            <div className="overflow-y-auto p-2">
              {isLoading && (
                <div className="p-8 flex items-center justify-center text-muted">
                  <Loader2 className="size-6 animate-spin" />
                </div>
              )}
              
              {!isLoading && query && filteredProducts.length === 0 && (
                <div className="p-8 text-center text-muted">
                  No products found for "{query}"
                </div>
              )}

              {!isLoading && filteredProducts.length > 0 && (
                <div className="flex flex-col gap-1">
                  {filteredProducts.map((product) => (
                    <button
                      key={product.slug}
                      onClick={() => handleSelect(product.slug)}
                      className="flex items-center gap-4 p-3 hover:bg-surface-2 rounded-xl text-left transition-colors"
                    >
                      <div className="size-12 shrink-0 bg-surface rounded-lg overflow-hidden border border-border">
                        {product.image ? (
                          <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                        ) : null}
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <h4 className="font-medium text-fg truncate">{product.name}</h4>
                        <p className="text-sm text-muted truncate">{product.category}</p>
                      </div>
                      <div className="text-sm font-medium text-fg whitespace-nowrap">
                        ₹{Number(product.price).toLocaleString("en-IN")}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              
              {!isLoading && !query && products && products.length > 0 && (
                <div className="p-4 text-center text-sm text-muted">
                  Type to start searching across {products.length} products...
                </div>
              )}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
