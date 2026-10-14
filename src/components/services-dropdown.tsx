import { Link, useRouterState } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import {
  ChevronDown,
  DraftingCompass,
  Cpu,
  Wrench,
  Zap,
  Layers,
  ArrowRight,
  PenTool,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatINR } from "@/lib/format";

export interface HeaderServiceItem {
  slug: string;
  title: string;
  tagline: string;
  icon: string;
  badge?: string;
  startingPrice: number;
}

export const HEADER_SERVICES: HeaderServiceItem[] = [
  {
    slug: "3d-modelling",
    title: "3D CAD Modelling & Design",
    tagline: "Turn sketches or broken parts into parametric STEP/STL CAD",
    icon: "DraftingCompass",
    badge: "Popular",
    startingPrice: 399,
  },
  {
    slug: "electronics-enclosures",
    title: "Electronics Enclosure Design",
    tagline: "Custom snap-fit & screw-boss housings for IoT, PCBs & devices",
    icon: "Cpu",
    badge: "Hardware & IoT",
    startingPrice: 499,
  },
  {
    slug: "reverse-engineering",
    title: "Broken Part Replication",
    tagline: "Replicate & structurally reinforce discontinued plastic spares",
    icon: "Wrench",
    badge: "Cost Saver",
    startingPrice: 349,
  },
  {
    slug: "rapid-prototyping",
    title: "Rapid Prototyping",
    tagline: "24–48hr turnaround on functional engineering fit checks",
    icon: "Zap",
    badge: "Express",
    startingPrice: 299,
  },
  {
    slug: "batch-manufacturing",
    title: "Small-Batch Production",
    tagline: "10 to 500+ units on Bambu Lab fleet without tooling dies",
    icon: "Layers",
    badge: "Low MOQ",
    startingPrice: 999,
  },
];

export function getServiceIcon(iconName: string) {
  switch (iconName) {
    case "DraftingCompass":
      return DraftingCompass;
    case "Cpu":
      return Cpu;
    case "Wrench":
      return Wrench;
    case "Zap":
      return Zap;
    case "Layers":
      return Layers;
    default:
      return PenTool;
  }
}

export function ServicesDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isServicesActive = pathname.startsWith("/services");
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    closeTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 150);
  };

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className={cn(
          "inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 cursor-pointer",
          isServicesActive
            ? "text-fg bg-surface-2/60"
            : "text-muted hover:bg-surface-2 hover:text-fg"
        )}
      >
        <span>Services</span>
        <ChevronDown
          className={cn(
            "size-3.5 transition-transform duration-200",
            isOpen && "rotate-180 text-accent"
          )}
          strokeWidth={2}
        />
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          className="absolute left-1/2 -translate-x-1/2 top-full pt-2 z-50 w-[420px] max-w-[calc(100vw-2rem)] animate-in fade-in-0 zoom-in-95 duration-150"
          role="region"
          aria-label="Services Menu"
        >
          <div className="overflow-hidden rounded-2xl border border-glass-border bg-surface/98 backdrop-blur-2xl backdrop-saturate-150 shadow-2xl shadow-black/20 p-2">
            <div className="px-3 pt-2.5 pb-1.5 flex items-center justify-between border-b border-border/50">
              <span className="text-[11px] font-semibold tracking-wider uppercase text-subtle">
                On-Demand Engineering &amp; Fabrication
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] text-accent font-medium">
                <Sparkles className="size-3" />
                Pan-India
              </span>
            </div>

            <div className="flex flex-col gap-1 py-1.5">
              {HEADER_SERVICES.map((srv) => {
                const IconComponent = getServiceIcon(srv.icon);
                const isActive = pathname === `/services/${srv.slug}`;
                return (
                  <Link
                    key={srv.slug}
                    to="/services/$slug"
                    params={{ slug: srv.slug }}
                    className={cn(
                      "group flex items-start gap-3 rounded-xl p-2.5 transition-all cursor-pointer",
                      isActive
                        ? "bg-accent/10 border border-accent/20"
                        : "hover:bg-surface-2/80 hover:translate-x-0.5"
                    )}
                  >
                    <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-2 text-fg group-hover:border-accent group-hover:text-accent transition-colors">
                      <IconComponent className="size-4.5" strokeWidth={1.8} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-fg group-hover:text-accent transition-colors truncate">
                          {srv.title}
                        </span>
                        {srv.badge && (
                          <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.2 rounded bg-surface-2 border border-border text-muted">
                            {srv.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted leading-tight mt-0.5 line-clamp-1">
                        {srv.tagline}
                      </p>
                    </div>
                    <span className="shrink-0 text-[11px] font-medium text-subtle pt-1 tabular-nums">
                      from {formatINR(srv.startingPrice)}
                    </span>
                  </Link>
                );
              })}
            </div>

            <div className="border-t border-border/50 pt-2 pb-1 px-2">
              <Link
                to="/services"
                className="flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold text-accent hover:bg-accent/10 transition-colors"
              >
                <span>View all services &amp; engineering capabilities</span>
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
