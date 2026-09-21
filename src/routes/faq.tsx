import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getFaqs, type Faq } from "@/lib/faq-fns";

export const Route = createFileRoute("/faq")({ 
  component: FaqPage,
  head: () => ({
    meta: [
      { title: "FAQ | prynth!" },
      { name: "description", content: "Frequently asked questions about 3D printing, shipping, materials, and ordering from prynth!." }
    ]
  })
});

function FaqPage() {
  const { data: faqs = [], isLoading } = useQuery({
    queryKey: ["faqs"],
    queryFn: () => getFaqs(),
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 md:px-6 md:py-16">
      <p className="text-[11px] font-medium tracking-[0.18em] text-subtle uppercase">
        Help
      </p>
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">FAQ</h1>
      
      {isLoading ? (
        <div className="mt-10 animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-surface-2 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="mt-10 divide-y divide-border">
          {faqs.map((item: Faq) => (
          <details key={item.id} className="group py-5">
            <summary className="cursor-pointer list-none font-display text-lg font-semibold tracking-tight marker:content-none">
              <span className="flex items-start justify-between gap-4">
                {item.question}
                <span className="text-accent transition-transform duration-150 group-open:rotate-45">
                  +
                </span>
              </span>
            </summary>
            <p className="mt-3 text-sm text-muted">{item.answer}</p>
          </details>
        ))}
      </div>
      )}
      <p className="mt-10 text-sm text-muted">
        Still stuck?{" "}
        <Link to="/contact" className="text-accent hover:underline">
          Write to us
        </Link>
        , or read{" "}
        <Link to="/shipping" className="text-accent hover:underline">
          shipping
        </Link>{" "}
        and{" "}
        <Link to="/returns" className="text-accent hover:underline">
          returns
        </Link>
        .
      </p>
    </div>
  );
}
