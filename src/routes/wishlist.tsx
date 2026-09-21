import { createFileRoute, Link } from "@tanstack/react-router";
import { getWishlist, toggleWishlist } from "@/lib/ecommerce-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatINR } from "@/lib/format";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/wishlist")({
  component: WishlistPage,
});

function WishlistPage() {
  const user = useCurrentUser();
  const queryClient = useQueryClient();

  const { data: wishlist, isLoading } = useQuery({
    queryKey: ["wishlist"],
    queryFn: () => getWishlist(),
    enabled: !!user,
  });

  const removeMutation = useMutation({
    mutationFn: toggleWishlist,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
    },
  });

  if (!user) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <h1 className="font-display text-3xl font-semibold">Your Wishlist</h1>
        <p className="mt-4 text-muted">Please log in to save and view your favorite items.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-16">
      <h1 className="font-display text-4xl font-semibold tracking-tight">Your Wishlist</h1>
      <p className="mt-2 text-muted">Items you've saved for later.</p>

      {isLoading ? (
        <p className="mt-10 text-muted">Loading wishlist...</p>
      ) : !wishlist || wishlist.length === 0 ? (
        <div className="mt-10 flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20 text-center">
          <p className="text-xl font-medium">Your wishlist is empty</p>
          <p className="mt-2 text-muted">Find something you love and save it for later.</p>
          <Link to="/" className="mt-6 rounded-full bg-primary px-8 py-3 font-medium text-primary-foreground hover:bg-primary/90">
            Explore Products
          </Link>
        </div>
      ) : (
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {wishlist.map((item) => (
            <div key={item.id} className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-surface">
              <Link to="/shop/$slug" params={{ slug: item.product_slug }} className="block overflow-hidden">
                <img 
                  src={item.image} 
                  alt={item.name} 
                  className="aspect-square object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </Link>
              <div className="flex flex-1 flex-col p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1 sm:gap-0">
                  <div>
                    <h3 className="text-sm sm:text-base font-medium">
                      <Link to="/shop/$slug" params={{ slug: item.product_slug }} className="hover:underline">
                        {item.name}
                      </Link>
                    </h3>
                    <p className="mt-0.5 text-xs sm:text-sm text-muted">{item.category}</p>
                  </div>
                  <p className="text-sm sm:text-base font-semibold">{formatINR(item.price)}</p>
                </div>
                
                <div className="mt-auto pt-3 sm:pt-4 flex items-center justify-between">
                  <span className={`text-xs font-medium ${item.in_stock ? 'text-green-600' : 'text-red-500'}`}>
                    {item.in_stock ? 'In Stock' : 'Out of Stock'}
                  </span>
                  
                  <button
                    onClick={() => removeMutation.mutate({ data: item.product_slug })}
                    disabled={removeMutation.isPending}
                    className="rounded p-2 text-muted hover:bg-secondary hover:text-foreground"
                    title="Remove from wishlist"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
