import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="relative mr-2 inline-flex h-11 w-16 items-center justify-center rounded-xl text-fg transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
    >
      <div className="relative inline-flex h-8 w-[56px] items-center rounded-full bg-surface border border-border shadow-inner">
        <div className="absolute inset-0 flex w-full items-center justify-between px-1.5 pointer-events-none">
          <Sun className={cn("size-4 transition-colors duration-300", isDark ? "text-muted" : "opacity-0")} />
          <Moon className={cn("size-4 transition-colors duration-300", isDark ? "opacity-0" : "text-muted")} />
        </div>
        <span
          className={cn(
            "absolute flex size-6 items-center justify-center rounded-full bg-bg shadow-[0_1px_3px_rgba(0,0,0,0.1)] ring-1 ring-black/5 dark:ring-white/10 transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)]",
            isDark ? "left-[27px]" : "left-[3px]",
          )}
        >
          {isDark ? (
            <Moon className="size-3.5 text-fg" strokeWidth={2.5} />
          ) : (
            <Sun className="size-3.5 text-fg" strokeWidth={2.5} />
          )}
        </span>
      </div>
    </button>
  );
}
