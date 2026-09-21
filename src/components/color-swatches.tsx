import { productColor } from "@/lib/products";
import { cn } from "@/lib/utils";

export function ColorSwatches({
  colors,
  value,
  onChange,
}: {
  colors: string[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Colour">
      {colors.map((id) => {
        const c = productColor(id);
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
              "flex h-11 items-center gap-2 rounded-full border px-3 text-sm transition-[box-shadow,border-color] duration-150",
              selected
                ? "border-accent bg-accent-soft text-fg"
                : "border-border bg-surface text-muted hover:border-fg/30",
            )}
          >
            <span
              className="size-4 rounded-full ring-1 ring-black/10 dark:ring-white/15"
              style={{ backgroundColor: c.hex }}
            />
            {c.name}
          </button>
        );
      })}
    </div>
  );
}
