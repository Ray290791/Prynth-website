import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Star, CheckCircle2, ChevronLeft, ChevronRight, MessageSquareQuote } from "lucide-react";
import { getTestimonials, type Testimonial } from "@/lib/testimonials-fns";

export function TestimonialsSection({
  title = "Trusted by Makers, Engineers & Studios",
  subtitle = "Real feedback from hardware developers, industrial designers, and makers across India.",
  className = "",
}: {
  title?: string;
  subtitle?: string;
  className?: string;
}) {
  const { data: testimonials = [], isLoading } = useQuery({
    queryKey: ["testimonials"],
    queryFn: () => getTestimonials(),
  });

  const [currentIndex, setCurrentIndex] = useState(0);

  if (isLoading) {
    return (
      <div className={`py-12 animate-pulse space-y-4 ${className}`}>
        <div className="h-6 w-48 bg-surface-2 rounded-lg mx-auto" />
        <div className="h-4 w-72 bg-surface-2 rounded-lg mx-auto" />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto px-4 mt-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 rounded-2xl bg-surface-2" />
          ))}
        </div>
      </div>
    );
  }

  if (testimonials.length === 0) {
    return null;
  }

  return (
    <section className={`space-y-10 ${className}`}>
      <div className="text-center max-w-2xl mx-auto px-4">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 border border-accent/20 px-3 py-1 text-xs font-semibold text-accent mb-3">
          <MessageSquareQuote className="size-3.5" />
          <span>Client Reviews & Feedback</span>
        </div>
        <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
          {title}
        </h2>
        <p className="mt-2 text-sm sm:text-base text-muted leading-relaxed">
          {subtitle}
        </p>
      </div>

      <div className="mx-auto max-w-6xl px-4">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((item) => (
            <div
              key={item.id}
              className="group rounded-3xl border border-white/20 dark:border-white/10 bg-surface/60 backdrop-blur-xl p-6 shadow-xl shadow-black/5 flex flex-col justify-between transition-all hover:scale-[1.01] hover:border-accent/40"
            >
              <div>
                {/* 5 Stars */}
                <div className="flex items-center gap-1">
                  {[...Array(item.rating)].map((_, i) => (
                    <Star
                      key={i}
                      className="size-4 fill-amber-400 text-amber-400"
                    />
                  ))}
                </div>

                {/* Quote */}
                <p className="mt-4 text-xs sm:text-sm text-fg/90 leading-relaxed font-normal">
                  "{item.quote}"
                </p>
              </div>

              {/* Author info */}
              <div className="mt-6 pt-4 border-t border-border/50 flex items-center gap-3">
                {item.avatar_url ? (
                  <img
                    src={item.avatar_url}
                    alt={item.author_name}
                    className="size-10 rounded-full object-cover border border-border"
                  />
                ) : (
                  <div className="size-10 rounded-full bg-accent/15 border border-accent/20 flex items-center justify-center font-bold text-accent text-sm select-none">
                    {item.author_name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs sm:text-sm font-semibold text-fg truncate">
                      {item.author_name}
                    </p>
                    {item.verified && (
                      <span title="Verified Client">
                        <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
                      </span>
                    )}
                  </div>
                  {item.author_role && (
                    <p className="text-[11px] text-muted truncate">
                      {item.author_role}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
