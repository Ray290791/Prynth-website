import { createFileRoute, Link } from "@tanstack/react-router";
import { GUIDES } from "@/lib/guides-data";
import { generateBreadcrumbJsonLd } from "@/lib/jsonld";
import { BookOpen, ArrowRight, Clock, Calendar, CheckCircle2, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/guides/")({
  component: GuidesIndexPage,
  head: () => ({
    links: [{ rel: "canonical", href: "https://prynth.in/guides" }],
    meta: [
      {
        title: "3D Printing Guides & Engineering Insights | Prynth",
      },
      {
        name: "description",
        content:
          "Practical 3D printing guides, pricing breakdowns, material comparisons, and STL preparation checklists from the Prynth engineering studio in Mumbai.",
      },
      {
        property: "og:title",
        content: "3D Printing Guides & Engineering Insights | Prynth",
      },
      {
        property: "og:description",
        content:
          "Practical 3D printing guides, pricing breakdowns, material comparisons, and STL preparation checklists from the Prynth engineering studio in Mumbai.",
      },
      { property: "og:url", content: "https://prynth.in/guides" },
    ],
  }),
});

export default function GuidesIndexPage() {
  return (
    <div className="relative mx-auto max-w-5xl px-4 py-12 md:px-6 md:py-16 space-y-12 animate-in fade-in duration-300">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            generateBreadcrumbJsonLd([
              { name: "Home", url: "/" },
              { name: "Guides", url: "/guides" },
            ])
          ),
        }}
      />

      {/* Header Banner */}
      <div className="space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-mono text-muted">
          <BookOpen className="size-3.5 text-accent" />
          <span>PRYNTH ENGINEERING FIELD GUIDES</span>
        </div>
        <h1 className="font-instrument text-4xl sm:text-5xl font-normal tracking-tight text-fg leading-tight">
          Clear, practical answers for{" "}
          <span className="italic text-accent">precision 3D printing.</span>
        </h1>
        <p className="text-base sm:text-lg text-muted max-w-2xl leading-relaxed font-light">
          No vague jargon or sales fluff. Direct answers, real studio numbers, and engineering-grade material guidance from our Mumbai print farm.
        </p>
      </div>

      {/* Grid of Guide Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {GUIDES.map((guide) => (
          <article
            key={guide.slug}
            className="group relative flex flex-col justify-between rounded-2xl border border-border/80 bg-surface/90 p-6 shadow-xs backdrop-blur-md transition-all hover:border-accent/50 hover:shadow-md"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-muted">
                <span className="font-mono uppercase tracking-wider text-accent font-semibold">
                  {guide.category}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="size-3 text-subtle" />
                  <span>{guide.readingTime}</span>
                </span>
              </div>

              <h2 className="font-instrument text-2xl font-normal text-fg group-hover:text-accent transition-colors leading-snug">
                <Link to="/guides/$slug" params={{ slug: guide.slug }}>
                  {guide.title}
                </Link>
              </h2>

              {/* Direct Answer Preview */}
              <div className="rounded-xl border border-border/60 bg-surface-2/60 p-3.5 text-xs text-muted leading-relaxed">
                <strong className="block text-fg font-medium mb-1 flex items-center gap-1.5">
                  <CheckCircle2 className="size-3.5 text-accent shrink-0" />
                  <span>Direct Answer</span>
                </strong>
                <p className="line-clamp-3">{guide.directAnswer}</p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-border/60 flex items-center justify-between text-xs text-muted">
              <span className="flex items-center gap-1.5 text-subtle">
                <Calendar className="size-3" />
                <span>Updated {guide.lastUpdated}</span>
              </span>
              <Link
                to="/guides/$slug"
                params={{ slug: guide.slug }}
                className="inline-flex items-center gap-1 font-medium text-accent hover:underline"
              >
                <span>Read Full Guide</span>
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </article>
        ))}
      </div>

      {/* Studio CTA */}
      <div className="rounded-2xl border border-border bg-surface-2/50 p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="font-instrument text-xl font-normal text-fg">Have a specific file to print?</h2>
          <p className="text-xs sm:text-sm text-muted mt-0.5">
            Upload your STL, OBJ, or 3MF for instant automated slicing, bed clearance checks, and transparent quotes.
          </p>
        </div>
        <Button asChild className="shrink-0 cursor-pointer">
          <Link to="/custom">
            <span>Upload 3D Model</span>
            <ArrowRight className="size-4 ml-1.5" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
