import { Tag, Sparkles, TrendingDown } from "lucide-react";
import { VOLUME_TIERS, getVolumeDiscount, calculateDiscountedUnitPrice, calculateVolumeSavings } from "@/lib/volume-discounts";
import { formatINR } from "@/lib/format";

export function VolumeDiscountBanner({
  basePrice,
  currentQty,
  onSelectQty,
  className = "",
}: {
  basePrice: number;
  currentQty: number;
  onSelectQty?: (qty: number) => void;
  className?: string;
}) {
  const { percent, nextTier } = getVolumeDiscount(currentQty);
  const savings = calculateVolumeSavings(basePrice, currentQty);

  return (
    <div className={`rounded-2xl border border-border/80 bg-surface/60 p-3.5 sm:p-4 backdrop-blur-xs space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tag className="size-4 text-accent" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted">
            Batch & Volume Pricing
          </span>
        </div>
        {percent > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <Sparkles className="size-3" />
            {percent}% OFF Applied (Saving {formatINR(savings)})
          </span>
        )}
      </div>

      {/* Tier Badges Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {VOLUME_TIERS.map((tier) => {
          const isActive =
            currentQty >= tier.minQty &&
            (tier.maxQty === null || currentQty <= tier.maxQty);
          const unitPrice = calculateDiscountedUnitPrice(basePrice, tier.minQty);

          return (
            <button
              key={tier.label}
              type="button"
              onClick={() => onSelectQty && onSelectQty(tier.minQty)}
              className={`rounded-xl p-2.5 text-left border transition-all cursor-pointer ${
                isActive
                  ? "border-accent bg-accent/10 shadow-xs ring-1 ring-accent"
                  : "border-border/70 bg-surface-2/60 hover:border-border hover:bg-surface-2"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-fg">{tier.label}</span>
                {tier.discountPercent > 0 && (
                  <span className="text-[10px] font-bold text-accent">
                    -{tier.discountPercent}%
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs font-mono font-medium text-muted">
                {formatINR(unitPrice)} <span className="text-[10px]">/ unit</span>
              </p>
            </button>
          );
        })}
      </div>

      {/* Upsell helper */}
      {nextTier && (
        <p className="text-xs text-muted flex items-center gap-1.5 pt-0.5">
          <TrendingDown className="size-3.5 text-accent shrink-0" />
          <span>
            Add <strong className="text-fg">{nextTier.needed} more</strong> to unlock{" "}
            <strong className="text-accent">{nextTier.percent}% OFF</strong> batch discount!
          </span>
        </p>
      )}
    </div>
  );
}
