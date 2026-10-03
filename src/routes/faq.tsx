import { createFileRoute, Link, getRouteApi } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getFaqs, type Faq } from "@/lib/faq-fns";
import { HelpCircle, Search, ChevronDown, MessageSquare, ArrowRight } from "lucide-react";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";

const rootRoute = getRouteApi("__root__");

export const Route = createFileRoute("/faq")({
  component: FaqPage,
  head: () => ({
    meta: [
      { title: "Frequently Asked Questions | prynth!" },
      {
        name: "description",
        content:
          "Answers to common questions about our 3D print turnaround, materials, lithophanes, custom files, and shipping across India.",
      },
    ],
  }),
});

export function FaqPage() {
  const { settings } = rootRoute.useLoaderData();
  const [search, setSearch] = useState("");
  const [openIds, setOpenIds] = useState<number[]>([]);

  const { data: faqs = [], isLoading } = useQuery({
    queryKey: ["faqs"],
    queryFn: () => getFaqs(),
  });

  const filteredFaqs = useMemo(() => {
    if (!search.trim()) return faqs;
    const q = search.toLowerCase();
    return faqs.filter(
      (f: Faq) =>
        f.question.toLowerCase().includes(q) ||
        f.answer.toLowerCase().includes(q)
    );
  }, [faqs, search]);

  const toggleOpen = (id: number) => {
    setOpenIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 md:px-6 md:py-20 animate-in fade-in duration-300 space-y-10">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-3.5 py-1 text-xs font-semibold text-accent">
          <HelpCircle className="size-3.5" />
          <span>Knowledge &amp; Support</span>
        </div>
        <h1 className="mt-4 font-display text-4xl sm:text-5xl font-semibold tracking-tight text-fg">
          Frequently Asked Questions
        </h1>
        <p className="mt-3 text-base sm:text-lg text-muted max-w-2xl leading-relaxed">
          Everything you need to know about our materials, 3D lithophanes, custom
          CAD modeling, and pan-India delivery.
        </p>

        {/* Real-time search filter */}
        <div className="mt-8 relative max-w-lg">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search questions (e.g. shipping, materials, lithophane, PETG)..."
            className="w-full rounded-2xl border border-border bg-surface pl-10 pr-4 py-2.5 text-sm text-fg placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent transition-colors shadow-2xs"
          />
        </div>
      </div>

      {/* Accordion Questions */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-16 rounded-2xl bg-surface-2/60 animate-pulse"
            />
          ))}
        </div>
      ) : filteredFaqs.length === 0 ? (
        <div className="rounded-3xl border border-border bg-surface p-12 text-center space-y-3">
          <p className="text-base font-semibold text-fg">No matching questions</p>
          <p className="text-xs text-muted">
            Try a different search term or write to our team directly.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSearch("")}
            className="cursor-pointer"
          >
            Clear Search
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredFaqs.map((faq: Faq) => {
            const isOpen = openIds.includes(faq.id);
            return (
              <div
                key={faq.id}
                className="rounded-2xl border border-border bg-surface overflow-hidden transition-all duration-200"
              >
                <button
                  type="button"
                  onClick={() => toggleOpen(faq.id)}
                  className="w-full flex items-center justify-between p-5 text-left cursor-pointer hover:bg-surface-2/40 transition-colors"
                >
                  <span className="font-display text-base sm:text-lg font-semibold text-fg pr-4">
                    {faq.question}
                  </span>
                  <div
                    className={`size-7 rounded-lg flex items-center justify-center bg-surface-2 text-muted shrink-0 transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-accent" : ""
                    }`}
                  >
                    <ChevronDown className="size-4" />
                  </div>
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-sm text-muted leading-relaxed border-t border-border/40 animate-in fade-in-50 duration-150">
                    <p className="whitespace-pre-wrap">{faq.answer}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Quick Links Card */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 sm:p-7 rounded-3xl border border-border bg-surface-2/60">
        <div>
          <span className="text-base font-semibold text-fg block flex items-center gap-2">
            <MessageSquare className="size-4 text-accent" />
            <span>Still have a question?</span>
          </span>
          <span className="text-xs text-muted block mt-1">
            Our studio team is available to help with 3D files, custom sizing, or
            order assistance.
          </span>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <Button asChild variant="outline" size="sm" className="cursor-pointer">
            <Link to="/shipping">Shipping Info</Link>
          </Button>
          <Button asChild size="sm" className="cursor-pointer">
            <Link to="/contact">
              <span>Contact Us</span>
              <ArrowRight className="size-3.5 ml-1" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
