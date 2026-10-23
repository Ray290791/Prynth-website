import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatINR } from "@/lib/format";
import { getCouponsAdmin, createCoupon, deleteCoupon } from "@/lib/ecommerce-fns";
import { Plus, Trash2, X, Tag } from "lucide-react";

export function CouponsTab() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: coupons, isLoading } = useQuery({
    queryKey: ["adminCoupons"],
    queryFn: () => getCouponsAdmin(),
  });

  const deleteMutation = useMutation({
    mutationFn: async (code: string) => {
      await deleteCoupon({ data: code });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminCoupons"] });
      toast.success("Coupon deleted successfully");
    },
    onError: (err: any) => toast.error(err?.message || "Failed to delete coupon")
  });

  if (isLoading) {
    return <div className="p-8 text-center text-muted">Loading coupons...</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold">Coupons</h2>
          <p className="text-muted mt-1 text-sm">Manage discount codes for the store.</p>
        </div>
        <button
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-ink hover:opacity-90"
          onClick={() => setIsModalOpen(true)}
        >
          Add Coupon
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-surface-2 text-muted">
            <tr>
              <th className="p-4 font-medium">Code</th>
              <th className="p-4 font-medium">Discount</th>
              <th className="p-4 font-medium">Uses</th>
              <th className="p-4 font-medium">Created</th>
              <th className="p-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {!coupons || coupons.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-muted">No coupons found.</td>
              </tr>
            ) : (
              coupons.map((c: any) => (
                <tr key={c.code} className="hover:bg-surface-2/50 transition-colors">
                  <td className="p-4 font-medium text-accent">{c.code}</td>
                  <td className="p-4">{c.discount_percent}% OFF</td>
                  <td className="p-4">{c.current_uses} / {c.max_uses ? c.max_uses : "∞"}</td>
                  <td className="p-4 text-muted">{new Date(c.created_at).toLocaleDateString()}</td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => {
                        if (confirm(`Are you sure you want to delete coupon ${c.code}?`)) {
                          deleteMutation.mutate(c.code);
                        }
                      }}
                      className="text-xs px-2 py-1 rounded bg-danger/10 text-danger hover:bg-danger/20 transition-colors border border-danger/20"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <CouponModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}

function CouponModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);

  const mutation = useMutation({
    mutationFn: async (data: { code: string; discount_percent: number; max_uses?: number }) => {
      await createCoupon({ data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminCoupons"] });
      toast.success("Coupon created!");
      onClose();
    },
    onError: (err) => toast.error(err.message),
    onSettled: () => setBusy(false)
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-surface border border-border rounded-xl shadow-xl w-full max-w-md flex flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-border p-6 bg-surface shrink-0">
          <h2 className="text-xl font-bold">Add Coupon</h2>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-surface-2 transition-colors text-muted hover:text-ink">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setBusy(true);
              const fd = new FormData(e.currentTarget);
              mutation.mutate({
                code: fd.get("code") as string,
                discount_percent: parseInt(fd.get("discount_percent") as string, 10),
                max_uses: fd.get("max_uses") ? parseInt(fd.get("max_uses") as string, 10) : undefined,
              });
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium mb-1">Coupon Code</label>
              <input name="code" required className="w-full rounded border border-border bg-surface-2 p-2 text-sm uppercase" placeholder="e.g. SUMMER10" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Discount Percent (%)</label>
              <input name="discount_percent" type="number" min="1" max="100" required className="w-full rounded border border-border bg-surface-2 p-2 text-sm" placeholder="e.g. 10" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Max Uses (Optional)</label>
              <input name="max_uses" type="number" min="1" className="w-full rounded border border-border bg-surface-2 p-2 text-sm" placeholder="Leave empty for unlimited" />
            </div>

            <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-border">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-border hover:bg-surface-2 text-sm font-medium">Cancel</button>
              <button type="submit" disabled={busy} className="px-4 py-2 rounded-lg bg-accent text-ink hover:opacity-90 text-sm font-medium">
                {busy ? "Saving..." : "Create Coupon"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

