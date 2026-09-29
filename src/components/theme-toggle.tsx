import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={cn(
        "relative inline-flex items-center justify-center rounded-xl text-fg transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 shrink-0",
        "size-9 sm:h-10 sm:w-15 md:w-16 hover:bg-surface-2 sm:hover:bg-transparent",
        className,
      )}
    >
      {/* Mobile Icon Button (< sm) */}
      <span className="sm:hidden flex items-center justify-center size-7.5 rounded-lg bg-surface/80 border border-border/70 text-fg">
        {isDark ? (
          <Moon className="size-4 text-accent transition-transform duration-200" strokeWidth={2} />
        ) : (
          <Sun className="size-4 text-amber-500 transition-transform duration-200" strokeWidth={2} />
        )}
      </span>

      {/* Tablet & Desktop Pill Toggle (sm+) */}
      <div className="hidden sm:inline-flex relative h-7.5 w-[52px] md:h-8 md:w-[56px] items-center rounded-full bg-surface border border-border shadow-inner">
        <div className="absolute inset-0 flex w-full items-center justify-between px-1.5 pointer-events-none">
          <Sun className={cn("size-3.5 md:size-4 transition-colors duration-300", isDark ? "text-muted" : "opacity-0")} />
          <Moon className={cn("size-3.5 md:size-4 transition-colors duration-300", isDark ? "opacity-0" : "text-muted")} />
        </div>
        <span
          className={cn(
            "absolute flex size-5.5 md:size-6 items-center justify-center rounded-full bg-bg shadow-[0_1px_3px_rgba(0,0,0,0.1)] ring-1 ring-black/5 dark:ring-white/10 transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)]",
            isDark ? "left-[26px] md:left-[27px]" : "left-[3px]",
          )}
        >
          {isDark ? (
            <Moon className="size-3 md:size-3.5 text-fg" strokeWidth={2.5} />
          ) : (
            <Sun className="size-3 md:size-3.5 text-fg" strokeWidth={2.5} />
          )}
        </span>
      </div>
    </button>
  );
}
