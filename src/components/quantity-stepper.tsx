import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 20,
  className,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex h-11 items-center overflow-hidden rounded-full border border-border bg-surface shadow-[var(--shadow-border)]",
        className,
      )}
    >
      <button
        type="button"
        aria-label="Decrease quantity"
        className="flex size-11 items-center justify-center text-fg transition-colors hover:bg-surface-2 disabled:opacity-30"
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
      >
        <Minus className="size-4" strokeWidth={1.75} />
      </button>
      <span className="min-w-8 text-center text-sm font-medium tabular-nums">
        {value}
      </span>
      <button
        type="button"
        aria-label="Increase quantity"
        className="flex size-11 items-center justify-center text-fg transition-colors hover:bg-surface-2 disabled:opacity-30"
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
      >
        <Plus className="size-4" strokeWidth={1.75} />
      </button>
    </div>
  );
}
