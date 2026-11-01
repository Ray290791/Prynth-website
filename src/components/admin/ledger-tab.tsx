import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatINR } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  getLaunchLedgerAdmin,
  toggleOrderSettledAdmin,
  addOrderAdjustmentAdmin,
  deleteOrderAdjustmentAdmin,
} from "@/lib/orders-fns";
import { getSiteSettings } from "@/lib/settings-fns";
import {
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Plus,
  Trash2,
  Download,
  DollarSign,
  Scale,
  Package,
  Truck,
  CreditCard,
  Sparkles,
} from "lucide-react";

export function LaunchLedgerTab() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"all" | "settled" | "unsettled">("all");
  const [isAdjModalOpen, setIsAdjModalOpen] = useState(false);
  const [adjReason, setAdjReason] = useState("");
  const [adjAmount, setAdjAmount] = useState("");
  const [editingCourierOrderId, setEditingCourierOrderId] = useState<number | null>(null);
  const [courierCostInput, setCourierCostInput] = useState("");

  const { data: ledger, isLoading, error } = useQuery({
    queryKey: ["launchLedgerAdmin"],
    queryFn: () => getLaunchLedgerAdmin(),
    staleTime: 30_000,
  });

  const { data: settings } = useQuery({
    queryKey: ["siteSettings"],
    queryFn: () => getSiteSettings(),
    staleTime: 60_000,
  });

  const profitTarget = parseFloat(settings?.profit_target_inr || "10000");

  const toggleSettledMutation = useMutation({
    mutationFn: async (payload: { order_id: number; settled: boolean; courier_actual_cost?: number }) => {
      await toggleOrderSettledAdmin({ data: payload });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["launchLedgerAdmin"] });
      queryClient.invalidateQueries({ queryKey: ["adminOrders"] });
      toast.success("Order settlement status updated!");
      setEditingCourierOrderId(null);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to update settlement status");
    },
  });

  const addAdjMutation = useMutation({
    mutationFn: async (payload: { reason: string; amount_inr: number }) => {
      await addOrderAdjustmentAdmin({ data: payload });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["launchLedgerAdmin"] });
      toast.success("Adjustment added to ledger!");
      setIsAdjModalOpen(false);
      setAdjReason("");
      setAdjAmount("");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to add adjustment");
    },
  });

  const deleteAdjMutation = useMutation({
    mutationFn: async (id: string) => {
      await deleteOrderAdjustmentAdmin({ data: id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["launchLedgerAdmin"] });
      toast.success("Adjustment removed from ledger!");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to remove adjustment");
    },
  });

  if (isLoading) {
    return (
      <div className="p-8 text-center text-muted">
        <div className="inline-flex size-8 animate-spin items-center justify-center rounded-full border-2 border-accent border-t-transparent mb-3" />
        <p className="text-sm">Calculating launch ledger &amp; settled raw profit...</p>
      </div>
    );
  }

  if (error || !ledger) {
    return (
      <div className="p-8 text-center text-danger">
        Failed to load launch ledger. Please check admin authorization.
      </div>
    );
  }

  const settledProfit = ledger.settledProfit;
  const progressPercent = Math.min(Math.max(Math.round((settledProfit / profitTarget) * 100), 0), 100);
  const isTargetReached = settledProfit >= profitTarget;

  const filteredOrders = (ledger.orderLedger || []).filter((ord: any) => {
    if (filter === "settled") return ord.settled;
    if (filter === "unsettled") return !ord.settled;
    return true;
  });

  const handleExportCSV = () => {
    const headers = [
      "Order Number",
      "Created At",
      "Payment Status",
      "Settled",
      "Settled Date",
      "Revenue (INR)",
      "Refund (INR)",
      "Unit Cost (INR)",
      "Packaging Cost (INR)",
      "Courier Cost (INR)",
      "Payment Fee (INR)",
      "Net Raw Profit (INR)",
      "UTM Source",
      "UTM Campaign",
    ];

    const rows = (ledger.orderLedger || []).map((o: any) => [
      o.orderNumber,
      new Date(o.createdAt).toLocaleDateString(),
      o.paymentStatus,
      o.settled ? "YES" : "NO",
      o.settledDate ? new Date(o.settledDate).toLocaleDateString() : "",
      o.amountReceived,
      o.refund,
      o.unitCost,
      o.packagingCost,
      o.courierCost,
      o.paymentFee,
      o.netProfit,
      o.utmSource || "",
      o.utmCampaign || "",
    ]);

    const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `prynth-launch-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Target Reached Banner */}
      {isTargetReached && (
        <div className="rounded-2xl border-2 border-emerald-500 bg-emerald-500/10 p-5 text-emerald-700 dark:text-emerald-300 shadow-md">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="size-6 shrink-0 text-emerald-500" />
            <div>
              <h3 className="text-base font-bold">
                Profit Target Reached ({formatINR(settledProfit)} of {formatINR(profitTarget)})!
              </h3>
              <p className="text-xs sm:text-sm mt-0.5">
                Target reached. Pause customer checkout, deliver pending orders, and proceed with LLP incorporation per the runbook.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <span>📊</span> Launch Ledger &amp; Raw Profit Tracker
          </h2>
          <p className="text-muted mt-1 text-sm">
            Tracking exact net margin toward the ₹{profitTarget.toLocaleString("en-IN")} LLP transition gate (D1).
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-ink text-xs sm:text-sm font-semibold hover:opacity-90 shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <Download className="size-4" /> Export Ledger CSV
        </button>
      </div>

      {/* Primary KPI Progress Card */}
      <div className="rounded-2xl border border-accent/30 bg-surface-2/60 p-6 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">
              Settled Raw Profit (Net Margin)
            </span>
            <div className="text-3xl sm:text-4xl font-bold font-display text-accent mt-1">
              {formatINR(settledProfit)}
            </div>
            <p className="text-xs text-muted mt-1">
              Target: <strong className="text-fg">{formatINR(profitTarget)}</strong> ({progressPercent}% achieved across {ledger.settledOrdersCount} settled orders)
            </p>
          </div>

          <div className="text-right">
            <span className="text-xs text-muted">
              {ledger.settledOrdersCount} Settled / {ledger.totalOrdersCount} Total Orders
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="h-3.5 w-full rounded-full bg-surface border border-border overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                isTargetReached ? "bg-emerald-500" : "bg-accent"
              )}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-muted font-mono">
            <span>₹0</span>
            <span>Target: {formatINR(profitTarget)}</span>
          </div>
        </div>
      </div>

      {/* Financial Breakdown Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-xl border border-border bg-surface space-y-1">
          <span className="text-[11px] font-medium text-muted block">Settled Gross</span>
          <span className="text-sm font-bold font-mono text-fg">{formatINR(ledger.totalSettledRevenue)}</span>
        </div>

        <div className="p-3.5 rounded-xl border border-border bg-surface space-y-1">
          <span className="text-[11px] font-medium text-muted block">Refunds</span>
          <span className="text-sm font-bold font-mono text-danger">-{formatINR(ledger.totalRefunds)}</span>
        </div>

        <div className="p-3.5 rounded-xl border border-border bg-surface space-y-1">
          <span className="text-[11px] font-medium text-muted block">Materials / Print</span>
          <span className="text-sm font-bold font-mono text-muted">-{formatINR(ledger.totalUnitCosts)}</span>
        </div>

        <div className="p-3.5 rounded-xl border border-border bg-surface space-y-1">
          <span className="text-[11px] font-medium text-muted block">Packaging</span>
          <span className="text-sm font-bold font-mono text-muted">-{formatINR(ledger.totalPackagingCosts)}</span>
        </div>

        <div className="p-3.5 rounded-xl border border-border bg-surface space-y-1">
          <span className="text-[11px] font-medium text-muted block">Couriers</span>
          <span className="text-sm font-bold font-mono text-muted">-{formatINR(ledger.totalCourierCosts)}</span>
        </div>

        <div className="p-3.5 rounded-xl border border-border bg-surface space-y-1">
          <span className="text-[11px] font-medium text-muted block">Gateway Fees</span>
          <span className="text-sm font-bold font-mono text-muted">-{formatINR(ledger.totalPaymentFees)}</span>
        </div>
      </div>

      {/* Manual Adjustments Section (D1) */}
      <div className="rounded-2xl border border-border bg-surface p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-fg flex items-center gap-2">
              <span>🛠️</span> Manual Adjustments (Reprints &amp; Replacements)
            </h3>
            <p className="text-xs text-muted mt-0.5">
              Deduct material, courier, or defect reprint costs from raw profit. Total: -{formatINR(ledger.totalAdjustments)}
            </p>
          </div>
          <button
            onClick={() => setIsAdjModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface-2 hover:bg-surface-3 text-xs font-semibold transition-colors cursor-pointer"
          >
            <Plus className="size-3.5" /> Add Adjustment
          </button>
        </div>

        {ledger.adjustments && ledger.adjustments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-surface-2 text-muted">
                <tr>
                  <th className="p-2.5 font-medium">Date</th>
                  <th className="p-2.5 font-medium">Reason</th>
                  <th className="p-2.5 font-medium">Logged By</th>
                  <th className="p-2.5 font-medium text-right">Amount (INR)</th>
                  <th className="p-2.5 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {ledger.adjustments.map((adj: any) => (
                  <tr key={adj.id} className="hover:bg-surface-2/40">
                    <td className="p-2.5 text-muted">{new Date(adj.created_at).toLocaleDateString()}</td>
                    <td className="p-2.5 font-medium">{adj.reason}</td>
                    <td className="p-2.5 text-muted">{adj.created_by}</td>
                    <td className="p-2.5 text-right font-mono font-bold text-danger">-{formatINR(adj.amount_inr)}</td>
                    <td className="p-2.5 text-right">
                      <button
                        onClick={() => deleteAdjMutation.mutate(adj.id)}
                        disabled={deleteAdjMutation.isPending}
                        className="text-danger hover:opacity-80 p-1"
                        title="Delete adjustment"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-muted italic py-2">
            No adjustments recorded yet. Add an entry whenever a reprint or defect occurs.
          </p>
        )}
      </div>

      {/* Orders Table with Settlement Toggle */}
      <div className="rounded-2xl border border-border bg-surface overflow-hidden shadow-xs">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-2/40">
          <div>
            <h3 className="font-semibold text-sm">Order Margin Breakdown</h3>
            <p className="text-xs text-muted">Toggle orders as settled when delivery and payment settlement are finalized.</p>
          </div>

          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-surface border border-border self-start sm:self-auto text-xs font-medium">
            <button
              onClick={() => setFilter("all")}
              className={cn("px-3 py-1 rounded-lg transition-colors cursor-pointer", filter === "all" ? "bg-accent text-ink font-semibold" : "text-muted hover:text-fg")}
            >
              All ({ledger.orderLedger.length})
            </button>
            <button
              onClick={() => setFilter("settled")}
              className={cn("px-3 py-1 rounded-lg transition-colors cursor-pointer", filter === "settled" ? "bg-accent text-ink font-semibold" : "text-muted hover:text-fg")}
            >
              Settled ({ledger.settledOrdersCount})
            </button>
            <button
              onClick={() => setFilter("unsettled")}
              className={cn("px-3 py-1 rounded-lg transition-colors cursor-pointer", filter === "unsettled" ? "bg-accent text-ink font-semibold" : "text-muted hover:text-fg")}
            >
              Pending ({ledger.orderLedger.length - ledger.settledOrdersCount})
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-surface-2 text-muted">
              <tr>
                <th className="p-3 font-medium">Order #</th>
                <th className="p-3 font-medium">Date</th>
                <th className="p-3 font-medium text-right">Revenue</th>
                <th className="p-3 font-medium text-right">Materials</th>
                <th className="p-3 font-medium text-right">Packaging</th>
                <th className="p-3 font-medium text-right">Courier</th>
                <th className="p-3 font-medium text-right">Gate Fee</th>
                <th className="p-3 font-medium text-right font-bold text-fg">Net Margin</th>
                <th className="p-3 font-medium text-center">Settled Gate</th>
                <th className="p-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredOrders.length > 0 ? (
                filteredOrders.map((ord: any) => (
                  <tr key={ord.id} className="hover:bg-surface-2/40 transition-colors">
                    <td className="p-3 font-mono font-semibold text-fg">
                      #{ord.orderNumber}
                      {ord.utmCampaign && (
                        <span className="block text-[10px] text-muted font-sans font-normal truncate max-w-[120px]">
                          {ord.utmSource ? `${ord.utmSource}: ` : ""}{ord.utmCampaign}
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-muted whitespace-nowrap">
                      {new Date(ord.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-3 text-right font-mono font-medium">
                      {formatINR(ord.amountReceived)}
                      {ord.refund > 0 && (
                        <span className="block text-[10px] text-danger font-sans">
                          -{formatINR(ord.refund)} ref
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right font-mono text-muted">-{formatINR(ord.unitCost)}</td>
                    <td className="p-3 text-right font-mono text-muted">-{formatINR(ord.packagingCost)}</td>
                    <td className="p-3 text-right font-mono text-muted">-{formatINR(ord.courierCost)}</td>
                    <td className="p-3 text-right font-mono text-muted">-{formatINR(ord.paymentFee)}</td>
                    <td className="p-3 text-right font-mono font-bold text-fg">
                      <span className={ord.netProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-danger"}>
                        {formatINR(ord.netProfit)}
                      </span>
                    </td>
                    <td className="p-3 text-center whitespace-nowrap">
                      {ord.settled ? (
                        <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-medium">
                          Settled
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-medium">
                          Unsettled
                        </Badge>
                      )}
                    </td>
                    <td className="p-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => {
                          toggleSettledMutation.mutate({
                            order_id: ord.id,
                            settled: !ord.settled,
                          });
                        }}
                        disabled={toggleSettledMutation.isPending}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer",
                          ord.settled
                            ? "border-amber-500/30 text-amber-600 hover:bg-amber-500/10"
                            : "border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10"
                        )}
                      >
                        {ord.settled ? "Unsettle" : "Mark Settled"}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-muted">
                    No orders match the selected filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Adjustment Modal */}
      {isAdjModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <h3 className="text-base font-bold text-fg">Record Reprint or Defect Adjustment</h3>
            <p className="text-xs text-muted">
              Deducts materials, replacement courier, or disposal costs directly from settled profit.
            </p>
            <div className="space-y-3">
              <div>
                <Label htmlFor="adj-reason" className="text-xs">Reason for Adjustment *</Label>
                <Input
                  id="adj-reason"
                  value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value)}
                  placeholder="e.g. Hex Coasters reprint - bed adhesion failure"
                  className="h-9 text-xs mt-1"
                />
              </div>
              <div>
                <Label htmlFor="adj-amount" className="text-xs">Amount to Deduct (₹) *</Label>
                <Input
                  id="adj-amount"
                  type="number"
                  min="1"
                  step="1"
                  value={adjAmount}
                  onChange={(e) => setAdjAmount(e.target.value)}
                  placeholder="e.g. 150"
                  className="h-9 text-xs mt-1 font-mono"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAdjModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  const amt = parseFloat(adjAmount);
                  if (!adjReason.trim() || isNaN(amt) || amt <= 0) {
                    toast.error("Please provide a valid reason and amount");
                    return;
                  }
                  addAdjMutation.mutate({ reason: adjReason.trim(), amount_inr: amt });
                }}
                disabled={addAdjMutation.isPending || !adjReason.trim() || !adjAmount}
                className="text-xs bg-accent text-ink hover:opacity-90 font-semibold"
              >
                {addAdjMutation.isPending ? "Saving..." : "Add to Ledger"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
