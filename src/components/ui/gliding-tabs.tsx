import React, { useRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";

export interface TabItem {
  id: string;
  label: string;
  count?: number | string;
  icon?: React.ReactNode;
}

export interface GlidingTabsProps {
  tabs: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
  variant?: "pills" | "glass" | "subtle";
  size?: "sm" | "md" | "lg";
}

export function GlidingTabs({
  tabs,
  activeId,
  onChange,
  className,
  variant = "pills",
  size = "md",
}: GlidingTabsProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number; opacity: number }>({
    left: 0,
    width: 0,
    opacity: 0,
  });

  const updateIndicator = () => {
    if (!containerRef.current) return;
    const activeButton = containerRef.current.querySelector<HTMLButtonElement>(`[data-tab-id="${activeId}"]`);
    if (activeButton) {
      setIndicatorStyle({
        left: activeButton.offsetLeft,
        width: activeButton.offsetWidth,
        opacity: 1,
      });
    }
  };

  useEffect(() => {
    updateIndicator();
    window.addEventListener("resize", updateIndicator);
    return () => window.removeEventListener("resize", updateIndicator);
  }, [activeId, tabs]);

  const sizeClasses = {
    sm: "h-8 px-2.5 text-xs gap-1.5",
    md: "h-9 px-3.5 text-xs sm:text-sm gap-2",
    lg: "h-11 px-4 text-sm gap-2.5",
  }[size];

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative flex items-center p-1 rounded-xl sm:rounded-2xl border select-none overflow-x-auto no-scrollbar",
        variant === "glass" && "border-glass-border bg-surface/60 backdrop-blur-md shadow-inner",
        variant === "pills" && "border-border/60 bg-surface-2/40",
        variant === "subtle" && "border-transparent bg-transparent",
        className
      )}
    >
      {/* Gliding Active Indicator Pill */}
      <div
        className={cn(
          "absolute top-1 bottom-1 rounded-lg sm:rounded-xl pointer-events-none transition-all duration-250 ease-out",
          variant === "glass"
            ? "bg-accent/20 border border-accent/40 shadow-sm"
            : "bg-surface shadow-sm border border-border/80 dark:bg-surface-2 dark:border-border"
        )}
        style={{
          left: `${indicatorStyle.left}px`,
          width: `${indicatorStyle.width}px`,
          opacity: indicatorStyle.opacity,
          transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      />

      {tabs.map((tab) => {
        const isActive = tab.id === activeId;
        return (
          <button
            key={tab.id}
            data-tab-id={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              "relative z-10 inline-flex items-center justify-center font-medium rounded-lg sm:rounded-xl whitespace-nowrap cursor-pointer transition-colors duration-150 tactile-btn",
              sizeClasses,
              isActive
                ? "text-fg font-semibold"
                : "text-muted hover:text-fg"
            )}
          >
            {tab.icon && <span className="shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={cn(
                  "ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold tabular-nums transition-colors",
                  isActive
                    ? "bg-accent text-white"
                    : "bg-surface-2 text-muted"
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
