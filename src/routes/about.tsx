import { createFileRoute, Link, getRouteApi } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { products } from "@/lib/products";
import { Sparkles, ShieldCheck, ArrowRight, Tag, HeartHandshake, Layers } from "lucide-react";

const rootRoute = getRouteApi("__root__");

export const Route = createFileRoute("/about")({
  component: AboutPage,
  head: () => ({
    meta: [
      { title: "Our Story | prynth!" },
      {
        name: "description",
        content:
          "We started prynth! because finding reliable, honest 3D printing shouldn't be a hassle. Learn about our mission and craft.",
      },
    ],
  }),
});

export function AboutPage() {
  const { settings } = rootRoute.useLoaderData();

  const headline =
    settings.about_headline ||
    "Honest prices. Good prints. For people who just need the thing.";

  const pillars = [
    {
      icon: Tag,
      title: settings.about_pillar1_title || "The price is the price",
      desc:
        settings.about_pillar1_desc ||
        "No setup surprises, no colour upcharge on the listed palette, no 'from' pricing.",
    },
    {
      icon: Sparkles,
      title: settings.about_pillar2_title || "Everyday, not exclusive",
      desc:
        settings.about_pillar2_desc ||
        "Built for people who want a sleek stand or home piece, not a lecture on nozzles.",
    },
    {
      icon: HeartHandshake,
      title: settings.about_pillar3_title || "If it's wrong, we redo it",
      desc:
        settings.about_pillar3_desc ||
        "Prints are inspected under natural light. Returns are straightforward and human.",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-20 animate-in fade-in duration-300">
      {/* Header Badge & Title */}
      <div className="max-w-3xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-3.5 py-1 text-xs font-semibold text-accent">
          <Sparkles className="size-3.5" />
          <span>Our Story &amp; Philosophy</span>
        </div>
        <h1 className="mt-4 font-display text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-fg leading-[1.12]">
          {headline}
        </h1>
      </div>

      {/* Main Content & Visual Showcase */}
      <div className="mt-12 grid gap-10 md:grid-cols-12 md:gap-12 lg:gap-16 items-start">
        {/* Story Paragraphs */}
        <div className="space-y-6 text-base sm:text-lg text-muted md:col-span-7 leading-relaxed font-normal">
          {settings.about_story.split("\n\n").map((paragraph, i) => (
            <p key={i} className="first:text-fg first:font-medium">
              {paragraph}
            </p>
          ))}
        </div>

        {/* Aside Photo Grid */}
        <aside className="md:col-span-5 relative">
          <div className="grid grid-cols-2 gap-3.5 rounded-3xl border border-white/20 dark:border-white/10 bg-surface/40 p-3.5 backdrop-blur-xl shadow-xl shadow-black/5">
            {products.slice(0, 4).map((p, idx) => (
              <div
                key={p.slug}
                className="group relative aspect-square overflow-hidden rounded-2xl bg-surface-2 border border-border/60"
              >
                <img
                  src={p.image}
                  alt={p.name}
                  className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-3 flex items-end">
                  <span className="text-[11px] font-semibold text-white truncate">
                    {p.name}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Craft Floating Badge */}
          <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-4 py-3 shadow-sm">
            <div className="flex items-center gap-2.5 text-xs">
              <ShieldCheck className="size-4 text-accent shrink-0" />
              <span className="text-muted">
                Made on calibrated CoreXY printers in India
              </span>
            </div>
            <span className="text-[10px] font-mono text-accent font-bold uppercase tracking-wider">
              0.08mm Layer
            </span>
          </div>
        </aside>
      </div>

      {/* 3 Core Value Pillars */}
      <div className="mt-16 grid gap-5 md:grid-cols-3">
        {pillars.map((pillar, idx) => {
          const Icon = pillar.icon;
          return (
            <div
              key={pillar.title}
              className="group relative rounded-3xl border border-border bg-surface p-7 shadow-xs hover:border-accent/40 transition-all duration-300"
            >
              <div className="flex size-11 items-center justify-center rounded-2xl border border-accent/20 bg-accent/10 text-accent mb-5 group-hover:scale-110 transition-transform">
                <Icon className="size-5" />
              </div>
              <h2 className="font-display text-xl font-semibold tracking-tight text-fg">
                {pillar.title}
              </h2>
              <p className="mt-2.5 text-sm text-muted leading-relaxed">
                {pillar.desc}
              </p>
            </div>
          );
        })}
      </div>

      {/* Direct CTA */}
      <div className="mt-14 flex flex-col sm:flex-row items-center gap-4 border-t border-border/80 pt-8">
        <Button asChild size="lg" className="w-full sm:w-auto shadow-sm cursor-pointer">
          <Link to="/shop">
            <span>Explore Ready-Made Prints</span>
            <ArrowRight className="size-4 ml-1" />
          </Link>
        </Button>
        <Button
          asChild
          size="lg"
          variant="secondary"
          className="w-full sm:w-auto cursor-pointer"
        >
          <Link to="/custom">
            <Layers className="size-4 mr-1.5 text-accent" />
            <span>Start a Custom Print</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}
