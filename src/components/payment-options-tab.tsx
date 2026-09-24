import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CreditCard, Truck, QrCode, CheckCircle2, AlertCircle, Save, Loader2 } from "lucide-react";
import { getSiteSettings, updateSiteSettings, type SiteSettings } from "@/lib/settings-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PaymentOptionsTab() {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["siteSettings"],
    queryFn: () => getSiteSettings(),
  });

  const [onlineEnabled, setOnlineEnabled] = useState(true);
  const [codEnabled, setCodEnabled] = useState(true);
  const [upiEnabled, setUpiEnabled] = useState(true);
  const [codFee, setCodFee] = useState("40");
  const [upiId, setUpiId] = useState("");

  useEffect(() => {
    if (settings) {
      setOnlineEnabled(settings.payment_online_enabled !== "false");
      setCodEnabled(settings.payment_cod_enabled !== "false");
      setUpiEnabled(settings.payment_upi_enabled !== "false");
      setCodFee(settings.cod_fee || "40");
      setUpiId(settings.payment_upi_id || "");
    }
  }, [settings]);

  const mutation = useMutation({
    mutationFn: async () => {
      // At least one payment option should be active
      if (!onlineEnabled && !codEnabled && !upiEnabled) {
        throw new Error("At least one payment method must remain enabled.");
      }

      await updateSiteSettings({
        data: {
          payment_online_enabled: onlineEnabled ? "true" : "false",
          payment_cod_enabled: codEnabled ? "true" : "false",
          payment_upi_enabled: upiEnabled ? "true" : "false",
          payment_upi_id: upiId.trim(),
          cod_fee: codFee.trim() || "40",
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["siteSettings"] });
      toast.success("Payment options updated successfully!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update payment options.");
    },
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Payment Options</h2>
          <p className="text-muted mt-1 text-sm">
            Control which payment methods are available to customers at checkout.
          </p>
        </div>
        <Button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="gap-2 shrink-0"
        >
          {mutation.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          Save Changes
        </Button>
      </div>

      <div className="grid gap-5">
        {/* Razorpay Online Payment */}
        <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6 transition-all shadow-[var(--shadow-border)]">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <CreditCard className="size-5" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h3 className="font-semibold text-base">Online Payment (Razorpay)</h3>
                  {onlineEnabled ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="size-3" /> Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-surface-3 px-2 py-0.5 text-xs font-medium text-muted">
                      Disabled
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted mt-1">
                  Accept Credit/Debit Cards, Netbanking, UPI, and digital wallets securely via the Razorpay payment gateway.
                </p>
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={onlineEnabled}
              onClick={() => setOnlineEnabled(!onlineEnabled)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                onlineEnabled ? "bg-accent" : "bg-muted/30"
              }`}
            >
              <span
                className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  onlineEnabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Cash on Delivery (COD) */}
        <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6 transition-all shadow-[var(--shadow-border)]">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Truck className="size-5" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h3 className="font-semibold text-base">Cash on Delivery (COD)</h3>
                  {codEnabled ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="size-3" /> Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-surface-3 px-2 py-0.5 text-xs font-medium text-muted">
                      Disabled
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted mt-1">
                  Allows customers to pay in cash when the courier delivers their parcel. Toggle off if COD shipping partner is not configured yet.
                </p>
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={codEnabled}
              onClick={() => setCodEnabled(!codEnabled)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                codEnabled ? "bg-accent" : "bg-muted/30"
              }`}
            >
              <span
                className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  codEnabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {codEnabled && (
            <div className="mt-5 border-t border-border/60 pt-4 pl-0 sm:pl-13.5">
              <div className="max-w-xs">
                <Label htmlFor="cod_fee" className="text-xs text-muted">
                  COD Handling Fee (₹)
                </Label>
                <div className="relative mt-1.5">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">
                    ₹
                  </span>
                  <Input
                    id="cod_fee"
                    type="number"
                    min="0"
                    value={codFee}
                    onChange={(e) => setCodFee(e.target.value)}
                    className="pl-7"
                    placeholder="40"
                  />
                </div>
                <p className="text-[11px] text-muted mt-1">
                  Added to the order total when customer chooses Pay on Delivery.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* UPI / QR Code Transfer */}
        <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6 transition-all shadow-[var(--shadow-border)]">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <QrCode className="size-5" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h3 className="font-semibold text-base">Direct UPI / QR Code Transfer</h3>
                  {upiEnabled ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="size-3" /> Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-surface-3 px-2 py-0.5 text-xs font-medium text-muted">
                      Disabled
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted mt-1">
                  Display UPI QR code at checkout and require customers to input their 12-digit UTR reference number.
                </p>
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={upiEnabled}
              onClick={() => setUpiEnabled(!upiEnabled)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                upiEnabled ? "bg-accent" : "bg-muted/30"
              }`}
            >
              <span
                className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  upiEnabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {upiEnabled && (
            <div className="mt-5 border-t border-border/60 pt-4 pl-0 sm:pl-13.5">
              <div className="max-w-sm">
                <Label htmlFor="upi_id" className="text-xs text-muted">
                  Business UPI VPA ID (optional)
                </Label>
                <Input
                  id="upi_id"
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="mt-1.5"
                  placeholder="prynth@okhdfcbank"
                />
                <p className="text-[11px] text-muted mt-1">
                  Displayed to customers on the UPI payment step.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end pt-2">
        <Button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="gap-2"
        >
          {mutation.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          Save Changes
        </Button>
      </div>
    </div>
  );
}
