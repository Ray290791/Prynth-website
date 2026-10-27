import { createFileRoute, useNavigate, Link, getRouteApi } from "@tanstack/react-router";
import { generateBreadcrumbJsonLd } from "@/lib/jsonld";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart-store";
import { getPricingConfig } from "@/lib/quote";
import { getPrinters } from "@/lib/printers-fns";
import { getAvailableFilaments } from "@/lib/filaments-fns";
import { Sliders, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { UploadForm } from "@/components/custom/upload-form";
import { IdeaForm } from "@/components/custom/idea-form";

const rootRoute = getRouteApi("__root__");

type Path = "upload" | "idea";

export const Route = createFileRoute("/custom")({
  validateSearch: (s: Record<string, unknown>): { path?: Path; edit?: string; idea?: string } => ({
    path: s.path === "idea" ? "idea" : s.path === "upload" ? "upload" : undefined,
    edit: typeof s.edit === "string" ? s.edit : undefined,
    idea: typeof s.idea === "string" ? s.idea : undefined,
  }),
  head: () => ({
    links: [
      { rel: "canonical", href: "https://prynth.in/custom" },
    ],
    meta: [
      { title: "Custom 3D Printing Service India — Instant STL Quote | Prynth" },
      {
        name: "description",
        content:
          "Upload 3D models (STL, 3MF, OBJ) for instant printing quotes, or submit custom CAD ideas (STEP, F3D). High-precision rapid prototyping across India by Prynth.",
      },
      {
        name: "keywords",
        content:
          "custom 3d printing service, online 3d printing quote, stl 3d print india, rapid prototyping service, 3d print on demand, cad design service, prynth",
      },
      { property: "og:title", content: "Custom 3D Printing Service India — Instant STL Quote | Prynth" },
      {
        property: "og:description",
        content:
          "Upload 3D models (STL, 3MF, OBJ) for instant printing quotes, or submit custom CAD ideas (STEP, F3D). High-precision rapid prototyping across India by Prynth.",
      },
      { property: "og:url", content: "https://prynth.in/custom" },
    ],
  }),
  component: CustomPage,
});

function CustomPage() {
  const { path, edit, idea: searchIdea } = Route.useSearch();
  const navigate = useNavigate({ from: "/custom" });
  const add = useCart((s) => s.add);
  const updateItem = useCart((s) => s.updateItem);
  const cartItems = useCart((s) => s.items);

  const editItem = useMemo(() => {
    if (!edit) return null;
    return cartItems.find((i) => i.id === edit && i.kind === "custom") ?? null;
  }, [edit, cartItems]);

  const { settings } = rootRoute.useLoaderData();
  const pricingConfig = useMemo(() => getPricingConfig(settings), [settings]);

  const { data: printers = [] } = useQuery({
    queryKey: ["printers"],
    queryFn: () => getPrinters(),
  });

  const { data: filaments = [] } = useQuery({
    queryKey: ["filaments"],
    queryFn: () => getAvailableFilaments(),
  });

  const tab = path ?? (editItem?.custom?.path === "idea" ? "idea" : "upload");

  function switchTab(next: Path) {
    void navigate({ search: { path: next, edit, idea: searchIdea } });
  }

  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: "Home", url: "/" },
    { name: "Custom Studio", url: "/custom" },
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium tracking-[0.18em] text-subtle uppercase">
            Custom Studio
          </p>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight md:text-5xl">
            {editItem ? "Edit custom order" : "Print it your way"}
          </h1>
          <p className="mt-3 max-w-2xl text-muted">
            {editItem
              ? "Modify your print specifications, material, quality, or model settings below. Your changes will update directly in the cart."
              : "Precision 3D printing on our high-speed Bambu Lab fleet. Choose your machine, upload your 3D model, or describe your concept and we'll model it first."}
          </p>
        </div>

        {editItem && (
          <Link
            to="/cart"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-4 py-2 text-sm font-medium text-muted hover:text-fg shadow-xs transition-colors"
          >
            <ArrowLeft className="size-4" />
            Back to Cart
          </Link>
        )}
      </div>

      {editItem && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-accent/40 bg-accent/10 p-4 sm:p-5 shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-ink shadow-xs">
              <Sliders className="size-5" />
            </div>
            <div>
              <p className="font-semibold text-sm sm:text-base text-fg">
                Editing: <span className="text-accent">{editItem.name}</span>
              </p>
              <p className="text-xs text-muted mt-0.5">
                Adjust material, infill, quality, or orientation below. Click &quot;Update in cart&quot; when done.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void navigate({ search: { edit: undefined } })}
            className="text-xs h-9"
          >
            Cancel editing
          </Button>
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => switchTab("upload")}
          className={cn(
            "rounded-2xl p-5 text-left shadow-[var(--shadow-border)] transition-shadow duration-150",
            tab === "upload" ? "bg-accent-soft ring-2 ring-accent" : "bg-surface hover:shadow-[var(--shadow-border-hover)]",
          )}
        >
          <p className="font-display text-lg font-semibold">Upload your model</p>
          <p className="mt-1 text-sm text-muted">
            STL, 3MF, or OBJ. Instant volume estimate, printer selection, and full Bambu slicer tuning.
          </p>
        </button>
        <button
          type="button"
          onClick={() => switchTab("idea")}
          className={cn(
            "rounded-2xl p-5 text-left shadow-[var(--shadow-border)] transition-shadow duration-150",
            tab === "idea" ? "bg-accent-soft ring-2 ring-accent" : "bg-surface hover:shadow-[var(--shadow-border-hover)]",
          )}
        >
          <p className="font-display text-lg font-semibold">Describe your idea</p>
          <p className="mt-1 text-sm text-muted">
            No file needed. Tell us what you need or attach photos. We will review your request and send a custom quote within 24 hours.
          </p>
        </button>
      </div>

      <div className="mt-10">
        {tab === "upload" ? (
          <UploadForm
            add={add}
            pricingConfig={pricingConfig}
            printers={printers}
            filaments={filaments}
            editItem={editItem}
            onUpdateItem={updateItem}
          />
        ) : (
          <IdeaForm
            add={add}
            pricingConfig={pricingConfig}
            printers={printers}
            filaments={filaments}
            editItem={editItem}
            onUpdateItem={updateItem}
            initialIdea={searchIdea}
            settings={settings}
          />
        )}
      </div>
    </div>
  );
}
