import { createFileRoute, Link } from "@tanstack/react-router";
import {
  DraftingCompass,
  Cpu,
  Wrench,
  Zap,
  Layers,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  Printer,
  FileCheck,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/format";
import { getServicesPublic, type ServiceRecord } from "@/lib/services-fns";
import { getServiceIcon } from "@/components/services-dropdown";

export const Route = createFileRoute("/services/")({
  loader: async () => {
    const services = await getServicesPublic();
    return { services };
  },
  head: () => ({
    meta: [
      {
        title: "On-Demand 3D Design & Engineering Services | prynth!",
      },
      {
        name: "description",
        content:
          "Professional 3D CAD modeling, electronics enclosure design, broken part reverse engineering, rapid prototyping, and low-volume production across India.",
      },
      {
        property: "og:title",
        content: "On-Demand 3D Design & Engineering Services | prynth!",
      },
      {
        property: "og:description",
        content:
          "Professional 3D CAD modeling, custom IoT enclosures, reverse engineering, and low-volume batch 3D printing.",
      },
      { property: "og:url", content: "https://prynth.in/services" },
    ],
  }),
  component: ServicesIndexPage,
});

function ServicesIndexPage() {
  const { services } = Route.useLoaderData();

  return (
    <div className="pb-24">
      {/* ── Hero ───────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-border/60 bg-surface/30 py-16 md:py-24">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-6 md:px-8 xl:px-12">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-1 text-xs font-semibold text-accent shadow-2xs">
              <Sparkles className="size-3.5" />
              <span>Additive Engineering &amp; On-Demand CAD</span>
            </div>
            <h1 className="mt-4 font-display text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-fg">
              Engineering Services for <br />
              <span className="text-accent">Makers, Startups &amp; Businesses</span>
            </h1>
            <p className="mt-6 text-base sm:text-lg text-muted leading-relaxed">
              From rough napkin ideas and PCB schematics to production batches. We combine precision industrial 3D CAD design with high-speed Bambu Lab additive manufacturing to build custom functional plastic hardware with zero tooling costs.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Button asChild size="lg" className="shadow-xs cursor-pointer">
                <Link to="/custom" search={{ path: "idea" }}>
                  <span>Request a Custom Quote</span>
                  <ArrowRight className="size-4 ml-1.5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="cursor-pointer">
                <Link to="/custom" search={{ path: "upload" }}>
                  <span>Have an STL / STEP? Upload here</span>
                </Link>
              </Button>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="mt-14 grid grid-cols-2 gap-4 sm:grid-cols-4 border-t border-border/60 pt-8">
            <div>
              <p className="font-mono text-2xl sm:text-3xl font-bold text-fg">0.08mm</p>
              <p className="text-xs text-muted mt-1">Layer precision standard</p>
            </div>
            <div>
              <p className="font-mono text-2xl sm:text-3xl font-bold text-fg">24–48h</p>
              <p className="text-xs text-muted mt-1">Prototype turnaround</p>
            </div>
            <div>
              <p className="font-mono text-2xl sm:text-3xl font-bold text-fg">₹0</p>
              <p className="text-xs text-muted mt-1">Tooling or mold setup fee</p>
            </div>
            <div>
              <p className="font-mono text-2xl sm:text-3xl font-bold text-fg">Pan-India</p>
              <p className="text-xs text-muted mt-1">Express logistics coverage</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Services Grid ──────────────────────────────────── */}
      <section className="mx-auto max-w-[1600px] px-4 sm:px-6 md:px-8 xl:px-12 py-16">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <p className="text-[11px] font-medium tracking-[0.18em] text-accent uppercase">
            Capabilities Catalog
          </p>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-fg">
            Explore Our Engineering Services
          </h2>
          <p className="mt-3 text-sm text-muted">
            Select a specialized service to view deliverables, mechanical design specifications, tolerances, and direct quotation workflows.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {(services || []).map((srv: ServiceRecord) => {
            const Icon = getServiceIcon(srv.icon);
            return (
              <div
                key={srv.slug}
                className="group relative flex flex-col justify-between rounded-2xl border border-border bg-surface p-6 shadow-xs hover:border-accent/50 hover:shadow-lg transition-all"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <div className="flex size-12 items-center justify-center rounded-xl border border-border bg-surface-2 text-fg group-hover:border-accent group-hover:text-accent transition-colors">
                      <Icon className="size-6" strokeWidth={1.8} />
                    </div>
                    {srv.badge && (
                      <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-xs font-semibold text-accent">
                        {srv.badge}
                      </span>
                    )}
                  </div>

                  <h3 className="font-display text-xl font-bold text-fg group-hover:text-accent transition-colors">
                    {srv.title}
                  </h3>
                  <p className="mt-2 text-xs font-medium text-accent">
                    {srv.tagline}
                  </p>
                  <p className="mt-3 text-sm text-muted leading-relaxed line-clamp-3">
                    {srv.short_desc}
                  </p>

                  {/* Highlights */}
                  <div className="mt-5 space-y-1.5 border-t border-border/50 pt-4 text-xs text-muted">
                    {srv.deliverables.slice(0, 3).map((d: string) => (
                      <div key={d} className="flex items-center gap-2">
                        <CheckCircle2 className="size-3.5 shrink-0 text-accent" />
                        <span className="line-clamp-1">{d}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-muted block">Starts from</span>
                    <strong className="text-base font-bold text-fg tabular-nums">
                      {formatINR(srv.starting_price)}
                    </strong>
                  </div>
                  <Button asChild size="sm" className="gap-1.5 cursor-pointer">
                    <Link to="/services/$slug" params={{ slug: srv.slug }}>
                      <span>View Service</span>
                      <ArrowRight className="size-3.5" />
                    </Link>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Workflow Roadmap ───────────────────────────────── */}
      <section className="border-y border-border/60 bg-surface/30 py-16 md:py-20">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-6 md:px-8 xl:px-12">
          <div className="text-center max-w-xl mx-auto mb-12">
            <p className="text-[11px] font-medium tracking-[0.18em] text-accent uppercase">
              Streamlined Process
            </p>
            <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-fg">
              How We Deliver Your Hardware
            </h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-border bg-surface p-5 shadow-xs">
              <div className="font-mono text-xs font-bold text-accent mb-2">PHASE 01</div>
              <h3 className="font-semibold text-fg">Project Brief &amp; Dimensions</h3>
              <p className="text-xs text-muted mt-2 leading-relaxed">
                Submit phone photos, rough dimensions, sketches, or PCB DXF schematics. We review technical requirements and send an upfront quotation.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-surface p-5 shadow-xs">
              <div className="font-mono text-xs font-bold text-accent mb-2">PHASE 02</div>
              <h3 className="font-semibold text-fg">CAD &amp; DFM Optimization</h3>
              <p className="text-xs text-muted mt-2 leading-relaxed">
                Engineered in parametric 3D CAD with stress fillets, snap-fits, and tolerance compensation tailored for high-speed additive manufacturing.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-surface p-5 shadow-xs">
              <div className="font-mono text-xs font-bold text-accent mb-2">PHASE 03</div>
              <h3 className="font-semibold text-fg">Interactive 3D Review</h3>
              <p className="text-xs text-muted mt-2 leading-relaxed">
                Inspect 3D digital renderings and verify mating clearances with our engineering team before authorizing physical fabrication.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-surface p-5 shadow-xs">
              <div className="font-mono text-xs font-bold text-accent mb-2">PHASE 04</div>
              <h3 className="font-semibold text-fg">Precision Print &amp; Courier</h3>
              <p className="text-xs text-muted mt-2 leading-relaxed">
                Manufactured on our Bambu Lab fleet, deburred, dimensionally verified, and express couriered right to your doorstep across India.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ─────────────────────────────────────── */}
      <section className="mx-auto max-w-4xl px-4 pt-16 md:px-6 text-center">
        <div className="rounded-3xl border border-white/20 dark:border-white/10 bg-surface/60 backdrop-blur-2xl p-8 sm:p-12 shadow-xl">
          <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-fg">
            Ready to bring your physical idea to life?
          </h2>
          <p className="mt-4 text-sm sm:text-base text-muted max-w-lg mx-auto">
            Get an instant evaluation and transparent quote from our engineering team today. Zero commitment required.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button asChild size="lg" className="w-full sm:w-auto shadow-sm cursor-pointer">
              <Link to="/custom" search={{ path: "idea" }}>
                <span>Start with an Idea or Photo</span>
                <ArrowRight className="size-4 ml-1.5" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full sm:w-auto cursor-pointer">
              <Link to="/contact">
                <span>Contact Engineering Team</span>
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
