import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { GUIDES, type GuideArticle } from "@/lib/guides-data";
import { generateBreadcrumbJsonLd, generateFAQJsonLd } from "@/lib/jsonld";
import {
  CheckCircle2,
  Calendar,
  Clock,
  User,
  ArrowLeft,
  ArrowRight,
  BookmarkCheck,
  ExternalLink,
  HelpCircle,
  Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/guides/$slug")({
  loader: ({ params }) => {
    const guide = GUIDES.find((g) => g.slug === params.slug);
    if (!guide) {
      throw notFound();
    }
    return { guide };
  },
  head: ({ loaderData }) => {
    const guide = loaderData?.guide;
    if (!guide) return {};

    const articleJsonLd = {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: guide.title,
      description: guide.metaDescription,
      datePublished: "2026-10-27",
      dateModified: "2026-10-27",
      author: {
        "@type": "Organization",
        name: guide.author,
        url: "https://prynth.in",
      },
      publisher: {
        "@type": "Organization",
        name: "Prynth!",
        url: "https://prynth.in",
        logo: {
          "@type": "ImageObject",
          url: "https://prynth.in/logo.png",
        },
      },
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": `https://prynth.in/guides/${guide.slug}`,
      },
    };

    return {
      links: [{ rel: "canonical", href: `https://prynth.in/guides/${guide.slug}` }],
      meta: [
        { title: `${guide.shortTitle} — 2026 Guide | Prynth` },
        { name: "description", content: guide.metaDescription },
        { property: "og:title", content: `${guide.shortTitle} — 2026 Guide | Prynth` },
        { property: "og:description", content: guide.metaDescription },
        { property: "og:url", content: `https://prynth.in/guides/${guide.slug}` },
        { property: "og:type", content: "article" },
      ],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(articleJsonLd),
        },
      ],
    };
  },
  component: GuideArticlePage,
});

export default function GuideArticlePage() {
  const { guide } = Route.useLoaderData();

  return (
    <article className="relative mx-auto max-w-4xl px-4 py-10 md:px-6 md:py-16 space-y-10 animate-in fade-in duration-300">
      {/* Structured Data: Breadcrumbs & FAQPage */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            generateBreadcrumbJsonLd([
              { name: "Home", url: "/" },
              { name: "Guides", url: "/guides" },
              { name: guide.shortTitle, url: `/guides/${guide.slug}` },
            ])
          ),
        }}
      />
      {guide.faqs.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(generateFAQJsonLd(guide.faqs)),
          }}
        />
      )}

      {/* Navigation Breadcrumb & Back Link */}
      <div className="flex items-center justify-between text-xs text-muted">
        <Link
          to="/guides"
          className="inline-flex items-center gap-1.5 text-accent hover:underline font-medium"
        >
          <ArrowLeft className="size-3.5" />
          <span>All Guides</span>
        </Link>
        <span className="font-mono text-xs uppercase tracking-wider text-muted">
          {guide.category}
        </span>
      </div>

      {/* Title & Metadata Byline */}
      <header className="space-y-4 border-b border-border/80 pb-8">
        <h1 className="font-instrument text-4xl sm:text-5xl font-normal tracking-tight text-fg leading-tight">
          {guide.title}
        </h1>

        <div className="flex flex-wrap items-center gap-y-2 gap-x-5 text-xs text-muted">
          <span className="flex items-center gap-1.5 text-fg font-medium">
            <User className="size-3.5 text-accent" />
            <span>{guide.author}</span>
          </span>
          <span className="flex items-center gap-1.5 text-subtle">
            <Calendar className="size-3.5" />
            <span>Last Updated: {guide.lastUpdated}</span>
          </span>
          <span className="flex items-center gap-1.5 text-subtle">
            <Clock className="size-3.5" />
            <span>{guide.readingTime}</span>
          </span>
        </div>
      </header>

      {/* Featured Direct Answer Callout Box (Google Featured Snippet / AI Overview Target) */}
      <div className="rounded-2xl border-2 border-accent/40 bg-accent/5 p-5 sm:p-7 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-accent mb-2">
          <CheckCircle2 className="size-4" />
          <span>Direct Answer</span>
        </div>
        <p className="text-base sm:text-lg text-fg font-medium leading-relaxed font-jakarta">
          {guide.directAnswer}
        </p>
      </div>

      {/* Key Takeaways */}
      {guide.keyTakeaways && guide.keyTakeaways.length > 0 && (
        <div className="rounded-2xl border border-border bg-surface p-6 space-y-3">
          <h2 className="text-xs font-mono uppercase tracking-widest text-muted flex items-center gap-2">
            <BookmarkCheck className="size-4 text-accent" />
            <span>Key Takeaways at a Glance</span>
          </h2>
          <ul className="grid gap-2.5 sm:grid-cols-2 text-xs text-muted leading-relaxed">
            {guide.keyTakeaways.map((point, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="size-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Guide Main Content Sections with Question-Style Headings */}
      <div className="space-y-8 pt-2">
        {guide.sections.map((section, idx) => (
          <section key={idx} className="space-y-3">
            <h2 className="font-instrument text-2xl sm:text-3xl font-normal text-fg leading-snug">
              {section.heading}
            </h2>
            <p className="text-sm sm:text-base text-muted font-jakarta leading-relaxed font-light">
              {section.content}
            </p>
          </section>
        ))}
      </div>

      {/* Frequently Asked Questions */}
      {guide.faqs && guide.faqs.length > 0 && (
        <section className="space-y-4 pt-6 border-t border-border/80">
          <h2 className="font-instrument text-2xl sm:text-3xl font-normal text-fg flex items-center gap-2">
            <HelpCircle className="size-6 text-accent" />
            <span>Frequently Asked Questions</span>
          </h2>
          <div className="divide-y divide-border/60 rounded-2xl border border-border bg-surface">
            {guide.faqs.map((faq, idx) => (
              <div key={idx} className="p-5 space-y-2">
                <h3 className="text-sm font-semibold text-fg font-jakarta">
                  {faq.question}
                </h3>
                <p className="text-xs sm:text-sm text-muted leading-relaxed font-jakarta">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Cited Industry Sources */}
      {guide.sources && guide.sources.length > 0 && (
        <footer className="space-y-2 pt-6 border-t border-border/60 text-xs text-muted">
          <p className="font-mono uppercase tracking-wider text-subtle text-[11px]">
            Sources &amp; Reference Specifications
          </p>
          <ul className="space-y-1">
            {guide.sources.map(
              (src: { title: string; organization: string }, idx: number) => (
                <li key={idx} className="flex items-center gap-2">
                <span className="text-accent">·</span>
                <span className="font-medium text-fg">{src.title}</span>
                <span className="text-subtle">({src.organization})</span>
              </li>
            ))}
          </ul>
        </footer>
      )}

      {/* Bottom Sticky Action Banner */}
      <div className="rounded-2xl border border-border bg-surface-2 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="font-instrument text-xl font-normal text-fg">Ready to print your parts?</h3>
          <p className="text-xs text-muted mt-0.5">
            Instant quotes from ₹149. Real-time slicer geometry checks in your browser.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Button asChild className="cursor-pointer">
            <Link to="/custom">
              <span>Start Custom Print</span>
              <ArrowRight className="size-4 ml-1.5" />
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}
