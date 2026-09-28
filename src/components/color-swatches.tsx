import { productColor } from "@/lib/products";
import { cn } from "@/lib/utils";

export interface ColorItem {
  id: string;
  name: string;
  hex: string;
}

export function ColorSwatches({
  colors,
  value,
  onChange,
  colorMap,
}: {
  colors: string[];
  value: string;
  onChange: (id: string) => void;
  colorMap?: Record<string, ColorItem>;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 w-full" role="radiogroup" aria-label="Colour">
      {colors.map((id) => {
        const c = colorMap?.[id] ?? productColor(id);
        const selected = value === id;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={c.name}
            onClick={() => onChange(id)}
            className={cn(
              "inline-flex h-10 items-center justify-center gap-2 rounded-full border px-3.5 text-xs font-medium whitespace-nowrap leading-none transition-all cursor-pointer active:scale-[0.98]",
              selected
                ? "border-accent bg-accent-soft text-fg ring-1 ring-accent font-semibold shadow-xs"
                : "border-border bg-surface text-muted hover:border-fg/30 hover:text-fg",
            )}
          >
            <span
              className="size-3.5 rounded-full shrink-0 ring-1 ring-black/10 dark:ring-white/20"
              style={{ backgroundColor: c.hex }}
            />
            <span className="truncate">{c.name}</span>
          </button>
        );
      })}
    </div>
  );
}
