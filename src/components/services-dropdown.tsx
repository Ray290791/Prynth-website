import { Link, useRouterState, getRouteApi } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
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
  Printer,
  Box,
  Package,
  ShieldCheck,
  Settings,
  Scale,
  Hammer,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatINR } from "@/lib/format";
import { getServicesPublic, type ServiceRecord } from "@/lib/services-fns";

export interface HeaderServiceItem {
  slug: string;
  title: string;
  tagline: string;
  icon: string;
  badge?: string;
  startingPrice: number;
}

/**
 * Fallback list if DB is initializing or offline
 */
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
];

export function getServiceIcon(iconName: string) {
  switch (iconName?.toLowerCase()) {
    case "draftingcompass":
      return DraftingCompass;
    case "cpu":
      return Cpu;
    case "wrench":
      return Wrench;
    case "zap":
      return Zap;
    case "layers":
      return Layers;
    case "printer":
      return Printer;
    case "box":
      return Box;
    case "package":
      return Package;
    case "shieldcheck":
      return ShieldCheck;
    case "settings":
      return Settings;
    case "scale":
      return Scale;
    case "hammer":
      return Hammer;
    default:
      return DraftingCompass;
  }
}

/**
 * Hook to retrieve active services synced with the database & site settings
 */
export function usePublicServices(): ServiceRecord[] {
  const rootRoute = getRouteApi("__root__");
  const rootData = (rootRoute as any).useLoaderData?.() as { services?: ServiceRecord[] } | undefined;

  const { data: services = [] } = useQuery({
    queryKey: ["publicServices"],
    queryFn: () => getServicesPublic(),
    initialData: rootData?.services,
    staleTime: 1000 * 60 * 5,
  });

  return services;
}

export function ServicesDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isServicesActive = pathname.startsWith("/services");
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const services = usePublicServices();

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

  // If there are no active services in database, render a plain link
  if (services.length === 0) {
    return (
      <Link
        to="/services"
        className={cn(
          "rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150",
          isServicesActive
            ? "text-fg font-semibold"
            : "text-muted hover:bg-surface-2 hover:text-fg"
        )}
      >
        Services
      </Link>
    );
  }

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
              {services.map((srv) => {
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
                        {srv.tagline || srv.short_desc}
                      </p>
                    </div>
                    <span className="shrink-0 text-[11px] font-medium text-subtle pt-1 tabular-nums">
                      from {formatINR(srv.starting_price)}
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
