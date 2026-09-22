import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getMaterials, type Material } from "@/lib/materials-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Thermometer, ShieldCheck, Zap, Layers, CheckCircle2, AlertTriangle, ArrowRight, Sun, Droplets, Flame, Cpu } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/materials")({
  component: MaterialsPage,
  head: () => ({
    meta: [
      { title: "Filaments & Materials Guide | prynth!" },
      { name: "description", content: "Explore our range of 3D printing filaments: PLA, PETG, ABS, and ASA. Compare thermal resistance, durability, flexibility, and best use cases." }
    ]
  })
});

export default function MaterialsPage() {
  const { data: materials = [], isLoading } = useQuery({
    queryKey: ["materials"],
    queryFn: () => getMaterials(),
  });

  const [activeTab, setActiveTab] = useState<string>("all");

  const filteredMaterials = activeTab === "all" 
    ? materials 
    : materials.filter(m => m.code.toLowerCase() === activeTab.toLowerCase());

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-20 animate-in fade-in duration-300">
      {/* Hero Section with Glassmorphism */}
      <div className="relative rounded-3xl border border-white/20 dark:border-white/10 bg-surface/30 backdrop-blur-2xl backdrop-saturate-150 p-8 md:p-12 shadow-xl shadow-black/5 overflow-hidden">
        <div className="absolute top-0 right-0 -mr-24 -mt-24 w-96 h-96 rounded-full bg-accent/15 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-24 w-80 h-80 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 backdrop-blur-md px-3.5 py-1 text-xs font-semibold text-accent mb-4">
            <Sparkles className="size-3.5" />
            <span>The Prynth! Filament Field Guide</span>
          </div>

          <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-fg">
            Engineered for durability, tuned for aesthetics.
          </h1>

          <p className="mt-4 text-base sm:text-lg text-muted leading-relaxed">
            Every 3D print begins with the polymer. From silky everyday desktop models to weather-proof outdoor fixtures and high-temperature brackets, here is everything you need to know about the materials we print.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild className="rounded-xl shadow-lg shadow-accent/20">
              <Link to="/custom" className="flex items-center gap-2">
                <span>Start a Custom Print</span>
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="rounded-xl border-white/20 dark:border-white/10 bg-surface/40 backdrop-blur-md">
              <Link to="/shop">
                <span>Browse Ready-Made Prints</span>
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="mt-12 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Our Filament Lineup</h2>
          <p className="text-sm text-muted">Currently active materials on our production print farm.</p>
        </div>

        <div className="flex items-center gap-1.5 p-1 rounded-2xl border border-white/20 dark:border-white/10 bg-surface/30 backdrop-blur-xl shadow-sm overflow-x-auto max-w-full">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
              activeTab === "all" 
                ? "bg-accent text-ink font-semibold shadow-md shadow-accent/20" 
                : "text-muted hover:text-fg hover:bg-surface/50"
            }`}
          >
            All Filaments
          </button>
          {materials.map((m) => (
            <button
              key={m.id}
              onClick={() => setActiveTab(m.code)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all uppercase tracking-wider ${
                activeTab === m.code 
                  ? "bg-accent text-ink font-semibold shadow-md shadow-accent/20" 
                  : "text-muted hover:text-fg hover:bg-surface/50"
              }`}
            >
              {m.code}
            </button>
          ))}
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading ? (
        <div className="mt-8 grid gap-8 md:grid-cols-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-96 rounded-3xl bg-surface/40 animate-pulse border border-border/30" />
          ))}
        </div>
      ) : (
        /* Materials Showcase Cards */
        <div className="mt-8 grid gap-8 md:grid-cols-2">
          {filteredMaterials.map((mat) => {
            const accent = mat.accent_color || "#00B8A9";
            
            return (
              <div
                key={mat.id}
                className="group relative flex flex-col justify-between rounded-3xl border border-white/20 dark:border-white/10 bg-surface/30 backdrop-blur-2xl backdrop-saturate-150 p-6 sm:p-8 shadow-xl shadow-black/5 hover:border-white/30 transition-all duration-300"
              >
                <div>
                  {/* Top Bar with Accent Pill & Code */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span 
                        className="inline-block size-3 rounded-full shadow-sm" 
                        style={{ backgroundColor: accent, boxShadow: `0 0 12px ${accent}` }} 
                      />
                      <span className="font-mono text-xs font-bold uppercase tracking-widest text-muted">
                        {mat.code}
                      </span>
                    </div>

                    {mat.finish_type && (
                      <Badge className="border border-white/20 dark:border-white/10 bg-surface/40 backdrop-blur-sm text-[11px]">
                        {mat.finish_type}
                      </Badge>
                    )}
                  </div>

                  {/* Title & Tagline */}
                  <div className="mt-4">
                    <h3 className="font-display text-2xl font-bold tracking-tight text-fg">
                      {mat.name}
                    </h3>
                    {mat.tagline && (
                      <p className="mt-1 text-sm font-medium text-accent">
                        {mat.tagline}
                      </p>
                    )}
                  </div>

                  {/* Description */}
                  <p className="mt-3 text-sm text-muted leading-relaxed">
                    {mat.description}
                  </p>

                  {/* Rating Gauges */}
                  <div className="mt-6 grid grid-cols-3 gap-3 p-3.5 rounded-2xl border border-white/10 bg-surface/20 backdrop-blur-md">
                    {/* Durability */}
                    <div>
                      <div className="flex items-center justify-between text-[11px] font-medium text-muted mb-1.5">
                        <span className="flex items-center gap-1">
                          <ShieldCheck className="size-3 text-fg/70" />
                          <span>Strength</span>
                        </span>
                        <span className="tabular-nums font-bold text-fg">{mat.durability_score}/5</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-surface-2 overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-500" 
                          style={{ width: `${(mat.durability_score / 5) * 100}%`, backgroundColor: accent }} 
                        />
                      </div>
                    </div>

                    {/* Flexibility */}
                    <div>
                      <div className="flex items-center justify-between text-[11px] font-medium text-muted mb-1.5">
                        <span className="flex items-center gap-1">
                          <Zap className="size-3 text-fg/70" />
                          <span>Flex</span>
                        </span>
                        <span className="tabular-nums font-bold text-fg">{mat.flexibility_score}/5</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-surface-2 overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-500" 
                          style={{ width: `${(mat.flexibility_score / 5) * 100}%`, backgroundColor: accent }} 
                        />
                      </div>
                    </div>

                    {/* Print Ease */}
                    <div>
                      <div className="flex items-center justify-between text-[11px] font-medium text-muted mb-1.5">
                        <span className="flex items-center gap-1">
                          <Layers className="size-3 text-fg/70" />
                          <span>Precision</span>
                        </span>
                        <span className="tabular-nums font-bold text-fg">{mat.print_ease_score}/5</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-surface-2 overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-500" 
                          style={{ width: `${(mat.print_ease_score / 5) * 100}%`, backgroundColor: accent }} 
                        />
                      </div>
                    </div>
                  </div>

                  {/* Thermal Specs Strip */}
                  <div className="mt-4 flex flex-wrap items-center gap-4 text-xs font-mono text-muted border-t border-b border-border/30 py-3">
                    {mat.temp_nozzle && (
                      <div className="flex items-center gap-1.5">
                        <Thermometer className="size-3.5 text-accent" />
                        <span>Nozzle: <strong className="text-fg">{mat.temp_nozzle}</strong></span>
                      </div>
                    )}
                    {mat.temp_bed && (
                      <div className="flex items-center gap-1.5">
                        <Flame className="size-3.5 text-amber-500" />
                        <span>Bed: <strong className="text-fg">{mat.temp_bed}</strong></span>
                      </div>
                    )}
                    {mat.heat_resistance && (
                      <div className="flex items-center gap-1.5">
                        <Cpu className="size-3.5 text-emerald-500" />
                        <span>Deflection: <strong className="text-fg">{mat.heat_resistance}</strong></span>
                      </div>
                    )}
                  </div>

                  {/* Benefits & Considerations */}
                  <div className="mt-5 space-y-3">
                    {mat.benefits && mat.benefits.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">Advantages</p>
                        <ul className="space-y-1.5">
                          {mat.benefits.map((b, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-xs text-fg/90">
                              <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0 mt-0.5" />
                              <span>{b}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {mat.drawbacks && mat.drawbacks.length > 0 && (
                      <div className="pt-2">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">Considerations</p>
                        <ul className="space-y-1.5">
                          {mat.drawbacks.map((d, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-xs text-fg/80">
                              <AlertTriangle className="size-3.5 text-amber-500/90 shrink-0 mt-0.5" />
                              <span>{d}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Ideal For Scenarios */}
                  {mat.ideal_for && mat.ideal_for.length > 0 && (
                    <div className="mt-5 pt-4 border-t border-border/30">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">Recommended Scenarios</p>
                      <div className="flex flex-wrap gap-1.5">
                        {mat.ideal_for.map((sc, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center rounded-lg border border-white/10 bg-surface-2/40 px-2.5 py-1 text-[11px] text-fg font-medium"
                          >
                            {sc}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Card Action */}
                <div className="mt-8 pt-4 border-t border-border/20 flex items-center justify-between">
                  <span className="text-xs text-subtle">Ready to print in {mat.code.toUpperCase()}?</span>
                  <Button asChild size="sm" variant="outline" className="rounded-xl border-accent/30 text-accent hover:bg-accent hover:text-ink">
                    <Link to="/custom">
                      <span>Order {mat.code.toUpperCase()} Print</span>
                    </Link>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Decision Matrix Section */}
      <div className="mt-16 rounded-3xl border border-white/20 dark:border-white/10 bg-surface/30 backdrop-blur-2xl backdrop-saturate-150 p-8 md:p-10 shadow-xl shadow-black/5">
        <div className="text-center max-w-xl mx-auto">
          <Badge className="bg-accent/20 text-accent mb-2">Quick Decision Matrix</Badge>
          <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
            Which filament matches your project?
          </h2>
          <p className="mt-2 text-sm text-muted">
            Match your requirements to the optimal engineering polymer in seconds.
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-border/50 bg-surface/40 p-5 flex flex-col justify-between">
            <div>
              <div className="size-9 rounded-xl bg-accent/15 text-accent flex items-center justify-center mb-3">
                <Sparkles className="size-5" />
              </div>
              <h4 className="font-bold text-base">Desk & Home Decor</h4>
              <p className="mt-1 text-xs text-muted">Vibrant colors, razor-sharp details, odorless and eco-friendly.</p>
            </div>
            <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between">
              <span className="text-xs text-subtle">Pick:</span>
              <strong className="text-accent text-sm font-mono">PLA</strong>
            </div>
          </div>

          <div className="rounded-2xl border border-border/50 bg-surface/40 p-5 flex flex-col justify-between">
            <div>
              <div className="size-9 rounded-xl bg-blue-500/15 text-blue-500 flex items-center justify-center mb-3">
                <Droplets className="size-5" />
              </div>
              <h4 className="font-bold text-base">Bath, Kitchen & Water</h4>
              <p className="mt-1 text-xs text-muted">Moisture-impervious, soap-safe, impact shock absorbing.</p>
            </div>
            <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between">
              <span className="text-xs text-subtle">Pick:</span>
              <strong className="text-blue-500 text-sm font-mono">PETG</strong>
            </div>
          </div>

          <div className="rounded-2xl border border-border/50 bg-surface/40 p-5 flex flex-col justify-between">
            <div>
              <div className="size-9 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center mb-3">
                <Flame className="size-5" />
              </div>
              <h4 className="font-bold text-base">Cars & High Heat</h4>
              <p className="mt-1 text-xs text-muted">Handles up to 100°C without warping. Great for car interiors and brackets.</p>
            </div>
            <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between">
              <span className="text-xs text-subtle">Pick:</span>
              <strong className="text-amber-500 text-sm font-mono">ABS</strong>
            </div>
          </div>

          <div className="rounded-2xl border border-border/50 bg-surface/40 p-5 flex flex-col justify-between">
            <div>
              <div className="size-9 rounded-xl bg-pink-500/15 text-pink-500 flex items-center justify-center mb-3">
                <Sun className="size-5" />
              </div>
              <h4 className="font-bold text-base">Outdoor & Sun Exposure</h4>
              <p className="mt-1 text-xs text-muted">Zero UV degradation, withstands rain, frost, and intense heat up to 105°C.</p>
            </div>
            <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between">
              <span className="text-xs text-subtle">Pick:</span>
              <strong className="text-pink-500 text-sm font-mono">ASA</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Material Request Banner */}
      <div className="mt-12 rounded-2xl border border-border/40 bg-surface-2/40 p-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
        <div>
          <h4 className="font-semibold text-base">Looking for an exotic filament?</h4>
          <p className="text-sm text-muted mt-0.5">We frequently source Carbon Fiber Nylon, flexible TPU, Wood-fill, and Polycarbonate for custom runs.</p>
        </div>
        <Button asChild variant="outline" className="rounded-xl border-accent/40 text-accent hover:bg-accent hover:text-ink shrink-0">
          <Link to="/contact">Ask About Special Filaments</Link>
        </Button>
      </div>
    </div>
  );
}
