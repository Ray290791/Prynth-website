import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Image as ImageIcon,
  Sparkles,
  Layers,
  ArrowRight,
  Filter,
  MessageCircle,
  ExternalLink,
  CheckCircle2,
  X,
  Printer,
} from "lucide-react";
import { getGalleryItems, type GalleryItem } from "@/lib/gallery-fns";
import { TestimonialsSection } from "@/components/testimonials-carousel";
import { WhatsAppInlineButton, buildWhatsAppUrl, getCleanWhatsAppNumber } from "@/components/whatsapp-support";
import { getSiteSettings } from "@/lib/settings-fns";

export const Route = createFileRoute("/gallery")({
  head: () => ({
    meta: [
      { title: "Print Quality Showcase & Gallery — Real 3D Prints | Prynth" },
      {
        name: "description",
        content:
          "Browse real, unedited photographs of 3D prints produced at Prynth's Mumbai studio on Bambu Lab CoreXY printers. Fine layer lines, functional engineering prototypes, and modular desk accessories.",
      },
      {
        name: "keywords",
        content:
          "3d print quality gallery, bambu lab prints india, 3d printed desk accessories photos, engineering prototype prints, prynth studio",
      },
      {
        property: "og:title",
        content: "Print Quality Showcase & Gallery | Prynth 3D Studio",
      },
      {
        property: "og:description",
        content:
          "Real photographs of 3D printed models, functional parts, and desk accessories from our Mumbai print farm.",
      },
    ],
  }),
  component: GalleryPage,
});

function GalleryPage() {
  const [selectedTag, setSelectedTag] = useState<string>("All");
  const [activeModalItem, setActiveModalItem] = useState<GalleryItem | null>(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["galleryItems"],
    queryFn: () => getGalleryItems(),
  });

  const { data: settings } = useQuery({
    queryKey: ["siteSettings"],
    queryFn: () => getSiteSettings(),
  });

  // Extract unique tags for category filter
  const tags = useMemo(() => {
    const set = new Set<string>(["All"]);
    items.forEach((item) => {
      if (item.tag) set.add(item.tag);
    });
    return Array.from(set);
  }, [items]);

  const filteredItems = useMemo(() => {
    if (selectedTag === "All") return items;
    return items.filter((item) => item.tag === selectedTag);
  }, [items, selectedTag]);

  const rawPhone = settings?.contact_whatsapp || settings?.contact_phone || "919999999999";
  const cleanPhone = getCleanWhatsAppNumber(rawPhone);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-6 md:py-16 space-y-16 sm:space-y-24">
      {/* HERO SECTION */}
      <section className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full bg-accent/10 border border-accent/20 px-3.5 py-1 text-xs font-semibold text-accent">
          <Sparkles className="size-3.5" />
          <span>Real Studio Production Gallery</span>
        </div>

        <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">
          Obsessive Precision in Every Layer
        </h1>

        <p className="text-sm sm:text-base text-muted leading-relaxed max-w-2xl mx-auto">
          No airbrushed 3D renders. These are real photographs and production samples created on our Bambu Lab CoreXY printers in Mumbai, showing our layer consistency, clean overhangs, and surface finishes.
        </p>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-4">
          {tags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                selectedTag === tag
                  ? "bg-accent text-ink shadow-xs"
                  : "bg-surface border border-border text-muted hover:border-fg/30 hover:text-fg"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </section>

      {/* GALLERY GRID */}
      <section>
        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="aspect-4/3 rounded-3xl bg-surface-2 animate-pulse"
              />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border p-16 text-center max-w-md mx-auto">
            <ImageIcon className="mx-auto size-12 text-muted/40" />
            <h3 className="mt-4 text-base font-semibold">No items found</h3>
            <p className="mt-1 text-xs text-muted">
              Select another category filter or check back as new prints are added.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredItems.map((item) => {
              const hasPhoto = Boolean(item.image_url?.trim());

              return (
                <article
                  key={item.id}
                  className="group rounded-3xl border border-white/20 dark:border-white/10 bg-surface/60 backdrop-blur-xl overflow-hidden shadow-xl shadow-black/5 flex flex-col justify-between transition-all hover:scale-[1.01] hover:border-accent/40"
                >
                  <div>
                    {/* Media Container: Real Photo or Blank Placeholder */}
                    <div
                      onClick={() => hasPhoto && setActiveModalItem(item)}
                      className={`relative aspect-4/3 w-full overflow-hidden bg-surface-2 border-b border-border ${
                        hasPhoto ? "cursor-zoom-in" : ""
                      }`}
                    >
                      {hasPhoto ? (
                        <img
                          src={item.image_url!}
                          alt={item.title}
                          loading="lazy"
                          className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        /* Stylish Blank Photo Placeholder */
                        <div className="size-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-surface-2 via-surface to-surface-2">
                          <div className="size-14 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent mb-3 group-hover:scale-110 transition-transform">
                            <Printer className="size-7 stroke-[1.75]" />
                          </div>
                          <span className="text-xs font-bold text-fg tracking-wide uppercase">
                            Studio Print Showcase
                          </span>
                          <span className="text-[11px] text-muted mt-1 max-w-[200px]">
                            Bambu Lab 0.16mm High-Precision Finish
                          </span>
                          <div className="mt-3 flex items-center gap-1.5 rounded-full bg-surface/80 border border-border px-2.5 py-1 text-[10px] text-muted">
                            <span className="size-1.5 rounded-full bg-emerald-500" />
                            <span>Photo slot active</span>
                          </div>
                        </div>
                      )}

                      {/* Tag pill */}
                      {item.tag && (
                        <span className="absolute top-3 left-3 rounded-full bg-black/60 backdrop-blur-md px-3 py-1 text-[11px] font-semibold text-white border border-white/10">
                          {item.tag}
                        </span>
                      )}
                    </div>

                    {/* Details */}
                    <div className="p-5 sm:p-6 space-y-2.5">
                      <h3 className="font-display text-base sm:text-lg font-bold text-fg">
                        {item.title}
                      </h3>

                      {item.material && (
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-accent">
                          <Layers className="size-3.5" />
                          <span>{item.material}</span>
                        </div>
                      )}

                      {item.caption && (
                        <p className="text-xs sm:text-sm text-muted leading-relaxed line-clamp-3">
                          {item.caption}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div className="p-5 sm:p-6 pt-0">
                    <div className="pt-3 border-t border-border/60 flex items-center justify-between gap-2">
                      <a
                        href={buildWhatsAppUrl(
                          cleanPhone,
                          `Hi Prynth! I saw the "${item.title}" in your gallery. Can you produce something similar for my project?`
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
                      >
                        <MessageCircle className="size-3.5 fill-current" />
                        <span>Inquire on WhatsApp</span>
                      </a>

                      <Link
                        to="/custom"
                        className="inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-fg transition-colors"
                      >
                        <span>Print Yours</span>
                        <ArrowRight className="size-3" />
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* LIGHTBOX MODAL */}
      {activeModalItem && activeModalItem.image_url && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setActiveModalItem(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-3xl border border-white/20 bg-surface shadow-2xl flex flex-col"
          >
            <button
              onClick={() => setActiveModalItem(null)}
              className="absolute top-4 right-4 z-10 rounded-full bg-black/60 p-2 text-white hover:bg-black transition-colors"
              aria-label="Close modal"
            >
              <X className="size-5" />
            </button>

            <img
              src={activeModalItem.image_url}
              alt={activeModalItem.title}
              className="max-h-[70vh] w-full object-contain bg-black/40"
            />

            <div className="p-5 sm:p-6 bg-surface">
              <h3 className="font-display text-xl font-bold">{activeModalItem.title}</h3>
              {activeModalItem.material && (
                <p className="text-xs font-semibold text-accent mt-1 flex items-center gap-1">
                  <Layers className="size-3.5" />
                  <span>{activeModalItem.material}</span>
                </p>
              )}
              {activeModalItem.caption && (
                <p className="text-xs sm:text-sm text-muted mt-2 leading-relaxed">
                  {activeModalItem.caption}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TESTIMONIALS SECTION AT BOTTOM */}
      <TestimonialsSection />

      {/* STUDIO BANNER CTA */}
      <section className="rounded-3xl border border-white/20 dark:border-white/10 bg-gradient-to-br from-surface via-surface-2 to-surface p-8 sm:p-12 text-center space-y-4">
        <span className="text-xs font-bold text-accent tracking-wider uppercase">
          Custom 3D Printing Studio
        </span>
        <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
          Have a 3D File Ready to Print?
        </h2>
        <p className="text-sm text-muted max-w-lg mx-auto leading-relaxed">
          Upload your STL, 3MF, or OBJ mesh in our instant slicer for an automated weight, volume, and flat price quotation.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            to="/custom"
            className="rounded-xl bg-accent px-5 py-2.5 text-xs sm:text-sm font-semibold text-ink shadow-md hover:opacity-90 transition-all"
          >
            Open Custom Studio
          </Link>
          <WhatsAppInlineButton text="Chat on WhatsApp" />
        </div>
      </section>
    </div>
  );
}
