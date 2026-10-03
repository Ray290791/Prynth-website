import { useState } from "react";
import { formatINR } from "@/lib/format";
import { Sun, Lightbulb, Gift, Percent, Sparkles, Check, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

interface LithophanePricingSettingsProps {
  settings: Record<string, any>;
  onQuickSave?: (pricingData: Record<string, string>) => Promise<void>;
  isSaving?: boolean;
}

export function LithophanePricingSettings({
  settings,
  onQuickSave,
  isSaving = false,
}: LithophanePricingSettingsProps) {
  // Base prices
  const [priceMedium, setPriceMedium] = useState<number>(() =>
    Number(settings.lithophane_price_medium || "399")
  );
  const [priceStandard, setPriceStandard] = useState<number>(() =>
    Number(settings.lithophane_price_standard || "549")
  );
  const [priceLarge, setPriceLarge] = useState<number>(() =>
    Number(settings.lithophane_price_large || "749")
  );

  // Light box bundle add-on fees
  const [lightboxMedium, setLightboxMedium] = useState<number>(() =>
    Number(settings.lithophane_lightbox_addon_medium || "249")
  );
  const [lightboxStandard, setLightboxStandard] = useState<number>(() =>
    Number(settings.lithophane_lightbox_addon_standard || "299")
  );
  const [lightboxLarge, setLightboxLarge] = useState<number>(() =>
    Number(settings.lithophane_lightbox_addon_large || "399")
  );

  // Gift & volume discounts
  const [giftFee, setGiftFee] = useState<number>(() =>
    Number(settings.lithophane_gift_packaging_fee || "99")
  );
  const [discount5, setDiscount5] = useState<number>(() =>
    Number(settings.lithophane_bulk_discount_5 || "5")
  );
  const [discount10, setDiscount10] = useState<number>(() =>
    Number(settings.lithophane_bulk_discount_10 || "10")
  );
  const [discount20, setDiscount20] = useState<number>(() =>
    Number(settings.lithophane_bulk_discount_20 || "15")
  );

  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleQuickSave = async () => {
    if (!onQuickSave) return;
    await onQuickSave({
      lithophane_price_medium: String(priceMedium),
      lithophane_price_standard: String(priceStandard),
      lithophane_price_large: String(priceLarge),
      lithophane_lightbox_addon_medium: String(lightboxMedium),
      lithophane_lightbox_addon_standard: String(lightboxStandard),
      lithophane_lightbox_addon_large: String(lightboxLarge),
      lithophane_gift_packaging_fee: String(giftFee),
      lithophane_bulk_discount_5: String(discount5),
      lithophane_bulk_discount_10: String(discount10),
      lithophane_bulk_discount_20: String(discount20),
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <section className="space-y-6 rounded-3xl border border-border/80 bg-surface-2/40 p-6 backdrop-blur-sm shadow-sm transition-all hover:border-accent/30">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-xl bg-accent/15 flex items-center justify-center text-accent">
              <Sparkles className="size-4" />
            </div>
            <h3 className="text-lg font-semibold text-fg tracking-tight">
              Lithophane Studio &amp; LED Light Box Pricing
            </h3>
          </div>
          <p className="text-xs text-muted mt-1">
            Configure customer pricing for sunlit lithophanes, illuminated LED light box bundle add-ons, luxury gift packaging, and bulk discounts.
          </p>
        </div>

        {onQuickSave && (
          <button
            type="button"
            onClick={handleQuickSave}
            disabled={isSaving}
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-xs",
              savedSuccess
                ? "bg-emerald-500 text-white"
                : "bg-accent text-ink hover:bg-accent-hover"
            )}
          >
            {savedSuccess ? (
              <>
                <Check className="size-3.5 stroke-[3]" />
                <span>Saved Lithophane Prices!</span>
              </>
            ) : (
              <>
                <DollarSign className="size-3.5" />
                <span>{isSaving ? "Saving..." : "Quick Save Lithophane Prices"}</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Grid of pricing categories */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Column 1: Base Sunlit Lithophane (Stand Included) */}
        <div className="rounded-2xl border border-border bg-surface p-4 space-y-4 shadow-xs">
          <div className="flex items-center gap-2 text-amber-500 font-semibold text-xs border-b border-border/60 pb-2">
            <Sun className="size-4 shrink-0" />
            <span>1. Base Sunlit Lithophanes (Stand Included)</span>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-medium text-fg">Medium (120×90mm)</label>
                <span className="text-[11px] font-mono text-muted">₹ INR</span>
              </div>
              <input
                type="number"
                min="0"
                step="1"
                name="lithophane_price_medium"
                value={priceMedium}
                onChange={(e) => setPriceMedium(Number(e.target.value) || 0)}
                className="w-full rounded-xl border border-border bg-surface-2/60 px-3 py-2 text-xs font-semibold text-fg focus:border-accent focus:outline-none"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-medium text-fg">Standard (150×100mm)</label>
                <span className="text-[10px] uppercase font-bold text-accent px-1.5 py-0.2 rounded-full bg-accent/15">Popular</span>
              </div>
              <input
                type="number"
                min="0"
                step="1"
                name="lithophane_price_standard"
                value={priceStandard}
                onChange={(e) => setPriceStandard(Number(e.target.value) || 0)}
                className="w-full rounded-xl border border-border bg-surface-2/60 px-3 py-2 text-xs font-semibold text-fg focus:border-accent focus:outline-none"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-medium text-fg">Deluxe (190×130mm)</label>
                <span className="text-[11px] font-mono text-muted">₹ INR</span>
              </div>
              <input
                type="number"
                min="0"
                step="1"
                name="lithophane_price_large"
                value={priceLarge}
                onChange={(e) => setPriceLarge(Number(e.target.value) || 0)}
                className="w-full rounded-xl border border-border bg-surface-2/60 px-3 py-2 text-xs font-semibold text-fg focus:border-accent focus:outline-none"
              />
            </div>
          </div>
          <p className="text-[11px] text-muted leading-tight">
            Base price includes the 3D relief sculpture and precision-matched desktop display stand.
          </p>
        </div>

        {/* Column 2: Warm LED Light Box Bundle (Add-on Fee) */}
        <div className="rounded-2xl border border-border bg-surface p-4 space-y-4 shadow-xs">
          <div className="flex items-center gap-2 text-accent font-semibold text-xs border-b border-border/60 pb-2">
            <Lightbulb className="size-4 shrink-0 text-amber-400" />
            <span>2. Warm LED Light Box Bundle (Add-on Fee)</span>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-medium text-fg">Medium Light Box Fee</label>
                <span className="text-[11px] font-mono text-muted">+₹ INR</span>
              </div>
              <input
                type="number"
                min="0"
                step="1"
                name="lithophane_lightbox_addon_medium"
                value={lightboxMedium}
                onChange={(e) => setLightboxMedium(Number(e.target.value) || 0)}
                className="w-full rounded-xl border border-border bg-surface-2/60 px-3 py-2 text-xs font-semibold text-fg focus:border-accent focus:outline-none"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-medium text-fg">Standard Light Box Fee</label>
                <span className="text-[11px] font-mono text-muted">+₹ INR</span>
              </div>
              <input
                type="number"
                min="0"
                step="1"
                name="lithophane_lightbox_addon_standard"
                value={lightboxStandard}
                onChange={(e) => setLightboxStandard(Number(e.target.value) || 0)}
                className="w-full rounded-xl border border-border bg-surface-2/60 px-3 py-2 text-xs font-semibold text-fg focus:border-accent focus:outline-none"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-medium text-fg">Deluxe Light Box Fee</label>
                <span className="text-[11px] font-mono text-muted">+₹ INR</span>
              </div>
              <input
                type="number"
                min="0"
                step="1"
                name="lithophane_lightbox_addon_large"
                value={lightboxLarge}
                onChange={(e) => setLightboxLarge(Number(e.target.value) || 0)}
                className="w-full rounded-xl border border-border bg-surface-2/60 px-3 py-2 text-xs font-semibold text-fg focus:border-accent focus:outline-none"
              />
            </div>
          </div>
          <p className="text-[11px] text-muted leading-tight">
            Added to the base price when customer selects &ldquo;Lithophane with Warm LED Light Box&rdquo;.
          </p>
        </div>

        {/* Column 3: Gift Packaging & Volume Discounts */}
        <div className="rounded-2xl border border-border bg-surface p-4 space-y-4 shadow-xs">
          <div className="flex items-center gap-2 text-rose-400 font-semibold text-xs border-b border-border/60 pb-2">
            <Gift className="size-4 shrink-0" />
            <span>3. Gift Packaging &amp; Volume Discounts</span>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-medium text-fg">Luxury Gift Box Fee</label>
                <span className="text-[11px] font-mono text-muted">+₹ INR</span>
              </div>
              <input
                type="number"
                min="0"
                step="1"
                name="lithophane_gift_packaging_fee"
                value={giftFee}
                onChange={(e) => setGiftFee(Number(e.target.value) || 0)}
                className="w-full rounded-xl border border-border bg-surface-2/60 px-3 py-2 text-xs font-semibold text-fg focus:border-accent focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[11px] font-medium text-muted block mb-1">5+ Qty (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  name="lithophane_bulk_discount_5"
                  value={discount5}
                  onChange={(e) => setDiscount5(Number(e.target.value) || 0)}
                  className="w-full rounded-xl border border-border bg-surface-2/60 px-2.5 py-2 text-xs font-semibold text-fg focus:border-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-muted block mb-1">10+ Qty (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  name="lithophane_bulk_discount_10"
                  value={discount10}
                  onChange={(e) => setDiscount10(Number(e.target.value) || 0)}
                  className="w-full rounded-xl border border-border bg-surface-2/60 px-2.5 py-2 text-xs font-semibold text-fg focus:border-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-muted block mb-1">20+ Qty (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  name="lithophane_bulk_discount_20"
                  value={discount20}
                  onChange={(e) => setDiscount20(Number(e.target.value) || 0)}
                  className="w-full rounded-xl border border-border bg-surface-2/60 px-2.5 py-2 text-xs font-semibold text-fg focus:border-accent focus:outline-none"
                />
              </div>
            </div>
          </div>
          <p className="text-[11px] text-muted leading-tight">
            Volume discounts apply automatically at checkout when ordering gifts or wedding favors.
          </p>
        </div>
      </div>

      {/* Real-time Customer Pricing Preview Matrix */}
      <div className="rounded-2xl border border-border/80 bg-surface/70 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-fg uppercase tracking-wider flex items-center gap-1.5">
            <Percent className="size-3.5 text-accent" />
            Live Customer Pricing Table Preview
          </span>
          <span className="text-[11px] text-muted">What shoppers see on the lithophane studio page</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-border/60 text-muted">
                <th className="py-2 pr-4 font-medium">Size Tier</th>
                <th className="py-2 px-4 font-medium">Sunlit (Stand Only)</th>
                <th className="py-2 px-4 font-medium">With Warm LED Light Box</th>
                <th className="py-2 px-4 font-medium">Light Box + Gift Box</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 font-mono">
              <tr>
                <td className="py-2.5 pr-4 font-sans font-medium text-fg">Medium (120×90mm)</td>
                <td className="py-2.5 px-4 font-bold text-fg">{formatINR(priceMedium)}</td>
                <td className="py-2.5 px-4 font-bold text-accent">
                  {formatINR(priceMedium + lightboxMedium)}
                  <span className="text-[10px] text-muted font-normal ml-1">(+{formatINR(lightboxMedium)})</span>
                </td>
                <td className="py-2.5 px-4 text-muted">
                  {formatINR(priceMedium + lightboxMedium + giftFee)}
                </td>
              </tr>
              <tr>
                <td className="py-2.5 pr-4 font-sans font-medium text-fg">
                  Standard (150×100mm) <span className="text-[9px] font-sans font-bold text-accent ml-1 uppercase">Popular</span>
                </td>
                <td className="py-2.5 px-4 font-bold text-fg">{formatINR(priceStandard)}</td>
                <td className="py-2.5 px-4 font-bold text-accent">
                  {formatINR(priceStandard + lightboxStandard)}
                  <span className="text-[10px] text-muted font-normal ml-1">(+{formatINR(lightboxStandard)})</span>
                </td>
                <td className="py-2.5 px-4 text-muted">
                  {formatINR(priceStandard + lightboxStandard + giftFee)}
                </td>
              </tr>
              <tr>
                <td className="py-2.5 pr-4 font-sans font-medium text-fg">Deluxe (190×130mm)</td>
                <td className="py-2.5 px-4 font-bold text-fg">{formatINR(priceLarge)}</td>
                <td className="py-2.5 px-4 font-bold text-accent">
                  {formatINR(priceLarge + lightboxLarge)}
                  <span className="text-[10px] text-muted font-normal ml-1">(+{formatINR(lightboxLarge)})</span>
                </td>
                <td className="py-2.5 px-4 text-muted">
                  {formatINR(priceLarge + lightboxLarge + giftFee)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
