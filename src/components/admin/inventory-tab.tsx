import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatINR } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { getAllProductsAdmin, updateProductInventory } from "@/lib/products-fns";
import { Search, Package } from "lucide-react";
import type { Product } from "@/lib/products";

export function InventoryTable() {
  const queryClient = useQueryClient();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const { data: products, isLoading } = useQuery({
    queryKey: ["adminProducts"],
    queryFn: () => getAllProductsAdmin(),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ slug, stockCount }: { slug: string, stockCount: number }) => {
      await updateProductInventory({ data: { slug, stockCount } });
    },
    onMutate: ({ slug }) => setUpdatingId(slug),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminProducts"] });
      toast.success("Inventory updated");
      setUpdatingId(null);
    },
    onError: () => {
      toast.error("Failed to update inventory");
      setUpdatingId(null);
    }
  });

  if (isLoading) {
    return <div className="p-8 text-center text-muted">Loading inventory...</div>;
  }

  if (!products || products.length === 0) {
    return <div className="p-8 text-center text-muted">No products found.</div>;
  }

  return (
    <table className="w-full text-left text-sm">
      <thead className="border-b border-border bg-surface-2 text-muted">
        <tr>
          <th className="p-4 font-medium">Product</th>
          <th className="p-4 font-medium text-center">Status</th>
          <th className="p-4 font-medium text-right">Stock Count</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {products.map((p) => {
          const stockCount = p.stockCount ?? -1;
          const isLowStock = stockCount !== -1 && stockCount <= 5;
          const isOutOfStock = stockCount === 0 || !p.inStock;
          
          return (
            <tr key={p.slug} className="hover:bg-surface-2/50 transition-colors">
              <td className="p-4">
                <div className="flex items-center gap-3">
                  <img src={p.image} alt={p.name} className="size-10 rounded-lg object-cover bg-surface-2" />
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-muted">{p.category}</div>
                  </div>
                </div>
              </td>
              <td className="p-4 text-center">
                {isOutOfStock ? (
                  <Badge className="bg-danger text-white">Out of Stock</Badge>
                ) : isLowStock ? (
                  <Badge className="bg-warning text-black">Low Stock</Badge>
                ) : (
                  <Badge className="bg-success text-white">In Stock</Badge>
                )}
              </td>
              <td className="p-4 text-right">
                <input
                  type="number"
                  disabled={updatingId === p.slug}
                  className="w-24 rounded border border-border bg-surface p-1 text-right text-sm focus:ring-1 focus:ring-accent"
                  defaultValue={stockCount}
                  onBlur={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val) && val !== stockCount) {
                      updateMutation.mutate({ slug: p.slug, stockCount: val });
                    }
                  }}
                />
                <div className="text-[10px] text-muted mt-1">(-1 for infinite)</div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

