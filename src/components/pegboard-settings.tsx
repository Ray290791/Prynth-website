import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Sparkles, ExternalLink, Save, CheckCircle2, Box, Layers, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SiteSettings } from "@/lib/settings-fns";

interface PegboardSettingsProps {
  settings: SiteSettings;
  onQuickSave: (data: Record<string, string>) => Promise<void>;
  isSaving: boolean;
}

export function PegboardSettings({ settings, onQuickSave, isSaving }: PegboardSettingsProps) {
  const [formData, setFormData] = useState({
    pegboard_hero_title: settings.pegboard_hero_title || "The Modular Pegboard System",
    pegboard_hero_subtitle:
      settings.pegboard_hero_subtitle ||
      "Precision 3D printed modular wall and desk organization. Engineered for creators, tech setups, and intentional workspaces.",
    pegboard_badge: settings.pegboard_badge || "Signature Star Product",
    pegboard_price_compact: settings.pegboard_price_compact || "699",
    pegboard_price_studio: settings.pegboard_price_studio || "999",
    pegboard_price_executive: settings.pegboard_price_executive || "1499",
    pegboard_price_duo: settings.pegboard_price_duo || "1799",
    pegboard_addon_tech_price: settings.pegboard_addon_tech_price || "299",
    pegboard_addon_desk_price: settings.pegboard_addon_desk_price || "249",
    pegboard_addon_botanical_price: settings.pegboard_addon_botanical_price || "279",
    pegboard_story:
      settings.pegboard_story ||
      "Every square millimetre of the Modular Pegboard was engineered with intention. 3D-printed from high-impact matte filament, it pairs an architectural silhouette with an ultra-versatile 25mm beveled grid. Whether you choose damage-free adhesive strips, desk edge clamps, or wall anchors, it transforms chaotic tool piles into a calm, focused craft sanctum.",
  });

  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    await onQuickSave(formData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <section className="space-y-6 rounded-2xl border border-white/20 dark:border-white/10 bg-surface/50 backdrop-blur-2xl backdrop-saturate-150 p-6 shadow-xl shadow-black/5">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-border/80 pb-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-accent/15 text-accent border border-accent/25 mb-1.5">
            <Sparkles className="size-3.5" />
            <span>Star Product Spotlight</span>
          </div>
          <h3 className="text-xl font-bold tracking-tight">Modular Pegboard Studio Settings</h3>
          <p className="text-xs text-muted mt-0.5">
            Customize the live copy, variant pricing, and add-on kit costs for your flagship star product page.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button asChild variant="outline" size="sm" className="h-9 gap-1.5 cursor-pointer">
            <Link to="/pegboard" target="_blank" rel="noreferrer">
              <span>View Live Page</span>
              <ExternalLink className="size-3.5" />
            </Link>
          </Button>

          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            size="sm"
            className="h-9 gap-1.5 bg-accent text-ink hover:opacity-90 font-medium cursor-pointer"
          >
            {savedSuccess ? (
              <>
                <CheckCircle2 className="size-4 text-ink" />
                <span>Saved!</span>
              </>
            ) : (
              <>
                <Save className="size-4" />
                <span>{isSaving ? "Saving…" : "Save Pegboard Settings"}</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Hero Content Settings */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold flex items-center gap-2 text-fg">
          <Layers className="size-4 text-accent" />
          <span>Headline & Hero Copy</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-muted mb-1">Page Hero Title</label>
            <input
              type="text"
              name="pegboard_hero_title"
              value={formData.pegboard_hero_title}
              onChange={(e) => handleChange("pegboard_hero_title", e.target.value)}
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm focus:border-accent focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Spotlight Badge Text</label>
            <input
              type="text"
              name="pegboard_badge"
              value={formData.pegboard_badge}
              onChange={(e) => handleChange("pegboard_badge", e.target.value)}
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm focus:border-accent focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-muted mb-1">Hero Subtitle / Value Hook</label>
          <input
            type="text"
            name="pegboard_hero_subtitle"
            value={formData.pegboard_hero_subtitle}
            onChange={(e) => handleChange("pegboard_hero_subtitle", e.target.value)}
            className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm focus:border-accent focus:outline-none"
          />
        </div>
      </div>

      {/* Sizing & Pricing Matrix */}
      <div className="space-y-3 pt-2">
        <h4 className="text-sm font-semibold flex items-center gap-2 text-fg">
          <DollarSign className="size-4 text-accent" />
          <span>Base Tile Pricing (₹)</span>
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border border-border bg-surface p-3 space-y-1.5">
            <span className="text-[11px] font-semibold text-muted uppercase tracking-wider block">Compact</span>
            <span className="text-xs text-muted block">20 × 20 cm Tile</span>
            <div className="relative mt-1">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted">₹</span>
              <input
                type="number"
                min="0"
                name="pegboard_price_compact"
                value={formData.pegboard_price_compact}
                onChange={(e) => handleChange("pegboard_price_compact", e.target.value)}
                className="w-full rounded-md border border-border bg-surface-2 pl-6 pr-2 py-1.5 text-sm font-medium focus:border-accent focus:outline-none"
              />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface p-3 space-y-1.5">
            <span className="text-[11px] font-semibold text-accent uppercase tracking-wider block">Studio (Most Popular)</span>
            <span className="text-xs text-muted block">30 × 30 cm Tile</span>
            <div className="relative mt-1">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted">₹</span>
              <input
                type="number"
                min="0"
                name="pegboard_price_studio"
                value={formData.pegboard_price_studio}
                onChange={(e) => handleChange("pegboard_price_studio", e.target.value)}
                className="w-full rounded-md border border-border bg-surface-2 pl-6 pr-2 py-1.5 text-sm font-medium focus:border-accent focus:outline-none"
              />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface p-3 space-y-1.5">
            <span className="text-[11px] font-semibold text-muted uppercase tracking-wider block">Executive</span>
            <span className="text-xs text-muted block">40 × 40 cm Tile</span>
            <div className="relative mt-1">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted">₹</span>
              <input
                type="number"
                min="0"
                name="pegboard_price_executive"
                value={formData.pegboard_price_executive}
                onChange={(e) => handleChange("pegboard_price_executive", e.target.value)}
                className="w-full rounded-md border border-border bg-surface-2 pl-6 pr-2 py-1.5 text-sm font-medium focus:border-accent focus:outline-none"
              />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface p-3 space-y-1.5">
            <span className="text-[11px] font-semibold text-muted uppercase tracking-wider block">Dual Tile Duo</span>
            <span className="text-xs text-muted block">2x 30 × 30 cm Tiles</span>
            <div className="relative mt-1">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted">₹</span>
              <input
                type="number"
                min="0"
                name="pegboard_price_duo"
                value={formData.pegboard_price_duo}
                onChange={(e) => handleChange("pegboard_price_duo", e.target.value)}
                className="w-full rounded-md border border-border bg-surface-2 pl-6 pr-2 py-1.5 text-sm font-medium focus:border-accent focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Modular Add-on Kits */}
      <div className="space-y-3 pt-2">
        <h4 className="text-sm font-semibold flex items-center gap-2 text-fg">
          <Box className="size-4 text-accent" />
          <span>Modular Accessory Add-on Packs (₹)</span>
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl border border-border bg-surface p-3 space-y-1.5">
            <span className="text-xs font-semibold text-fg block">Tech Master Kit</span>
            <span className="text-[11px] text-muted block">Headphone cradle, controller mount, cable clips</span>
            <div className="relative mt-2">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted">₹</span>
              <input
                type="number"
                min="0"
                name="pegboard_addon_tech_price"
                value={formData.pegboard_addon_tech_price}
                onChange={(e) => handleChange("pegboard_addon_tech_price", e.target.value)}
                className="w-full rounded-md border border-border bg-surface-2 pl-6 pr-2 py-1.5 text-sm font-medium focus:border-accent focus:outline-none"
              />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface p-3 space-y-1.5">
            <span className="text-xs font-semibold text-fg block">Desk Essentials Kit</span>
            <span className="text-[11px] text-muted block">Faceted pen vessel, sticky note wedge, tray</span>
            <div className="relative mt-2">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted">₹</span>
              <input
                type="number"
                min="0"
                name="pegboard_addon_desk_price"
                value={formData.pegboard_addon_desk_price}
                onChange={(e) => handleChange("pegboard_addon_desk_price", e.target.value)}
                className="w-full rounded-md border border-border bg-surface-2 pl-6 pr-2 py-1.5 text-sm font-medium focus:border-accent focus:outline-none"
              />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface p-3 space-y-1.5">
            <span className="text-xs font-semibold text-fg block">Botanical Shelf Pod</span>
            <span className="text-[11px] text-muted block">Mini plant pot pod + cantilevered wood-top shelf</span>
            <div className="relative mt-2">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted">₹</span>
              <input
                type="number"
                min="0"
                name="pegboard_addon_botanical_price"
                value={formData.pegboard_addon_botanical_price}
                onChange={(e) => handleChange("pegboard_addon_botanical_price", e.target.value)}
                className="w-full rounded-md border border-border bg-surface-2 pl-6 pr-2 py-1.5 text-sm font-medium focus:border-accent focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Story & Narrative */}
      <div className="space-y-2 pt-2">
        <label className="block text-xs font-medium text-muted">Product Craft Story & Design Philosophy</label>
        <textarea
          name="pegboard_story"
          value={formData.pegboard_story}
          onChange={(e) => handleChange("pegboard_story", e.target.value)}
          rows={4}
          className="w-full rounded-lg border border-border bg-surface-2 p-3 text-sm focus:border-accent focus:outline-none"
        />
        <p className="text-[11px] text-muted">
          Displayed in the architectural design narrative section on the dedicated pegboard product page.
        </p>
      </div>
    </section>
  );
}
