import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Sparkles,
  ExternalLink,
  Save,
  CheckCircle2,
  Box,
  Layers,
  DollarSign,
  Plus,
  Trash2,
  Star,
  Maximize2,
  Grid,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { SiteSettings } from "@/lib/settings-fns";

export interface PegboardSizePreset {
  id: string;
  name: string;
  dims: string;
  desc: string;
  price: number;
  popular?: boolean;
}

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
    pegboard_addon_tech_price: settings.pegboard_addon_tech_price || "299",
    pegboard_addon_desk_price: settings.pegboard_addon_desk_price || "249",
    pegboard_addon_botanical_price: settings.pegboard_addon_botanical_price || "279",
    pegboard_story:
      settings.pegboard_story ||
      "Every square millimetre of the Modular Pegboard was engineered with intention. 3D-printed from high-impact matte filament, it pairs an architectural silhouette with an ultra-versatile 25mm beveled grid. Whether you choose damage-free adhesive strips, desk edge clamps, or wall anchors, it transforms chaotic tool piles into a calm, focused craft sanctum.",
  });

  const defaultPresets: PegboardSizePreset[] = [
    {
      id: "compact",
      name: "Compact Desk",
      dims: "20 × 20 cm Tile",
      desc: "Perfect for monitor risers & small headphone nooks",
      price: Number(settings.pegboard_price_compact || 699),
      popular: false,
    },
    {
      id: "studio",
      name: "Studio Standard",
      dims: "30 × 30 cm Tile",
      desc: "Our flagship size. Ideal for full desk setups",
      price: Number(settings.pegboard_price_studio || 999),
      popular: true,
    },
    {
      id: "executive",
      name: "Executive Pro",
      dims: "40 × 40 cm Tile",
      desc: "High-capacity grid for audio gear & tech tools",
      price: Number(settings.pegboard_price_executive || 1499),
      popular: false,
    },
    {
      id: "duo",
      name: "Dual Tile Duo",
      dims: "2x 30 × 30 cm Tiles",
      desc: "Includes 2 interlocking panels + alignment clips",
      price: Number(settings.pegboard_price_duo || 1799),
      popular: false,
    },
  ];

  const [presets, setPresets] = useState<PegboardSizePreset[]>(() => {
    try {
      if (settings.pegboard_size_presets) {
        const parsed = JSON.parse(settings.pegboard_size_presets);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((p, idx) => ({
            id: p.id || `preset-${idx}-${Date.now()}`,
            name: p.name || `Preset ${idx + 1}`,
            dims: p.dims || "",
            desc: p.desc || "",
            price: Number(p.price || 0),
            popular: Boolean(p.popular),
          }));
        }
      }
    } catch (_e) {}
    return defaultPresets;
  });

  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleUpdatePreset = (id: string, updates: Partial<PegboardSizePreset>) => {
    setPresets((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
  };

  const handleTogglePopular = (id: string) => {
    setPresets((prev) =>
      prev.map((p) => ({
        ...p,
        popular: p.id === id ? !p.popular : false,
      }))
    );
  };

  const handleAddPreset = () => {
    const newIdx = presets.length + 1;
    const newId = `preset-${Date.now()}`;
    const newPreset: PegboardSizePreset = {
      id: newId,
      name: `Size Tier ${newIdx}`,
      dims: "25 × 25 cm Tile",
      desc: "Precision engineered modular expansion panel",
      price: 849,
      popular: false,
    };
    setPresets((prev) => [...prev, newPreset]);
    toast.success("New size preset added. Adjust dimensions and price, then save.");
  };

  const handleRemovePreset = (id: string) => {
    if (presets.length <= 1) {
      toast.error("You must have at least one size preset available for customers.");
      return;
    }
    setPresets((prev) => prev.filter((p) => p.id !== id));
    toast.info("Size preset removed.");
  };

  const handleSave = async () => {
    const serializedPresets = JSON.stringify(presets);

    // Sync legacy keys for backward compatibility
    const compactPreset = presets.find(
      (p) => p.id === "compact" || p.name.toLowerCase().includes("compact")
    );
    const studioPreset = presets.find(
      (p) => p.id === "studio" || p.popular || p.name.toLowerCase().includes("studio")
    );
    const execPreset = presets.find(
      (p) => p.id === "executive" || p.name.toLowerCase().includes("exec")
    );
    const duoPreset = presets.find(
      (p) => p.id === "duo" || p.name.toLowerCase().includes("duo")
    );

    const payload: Record<string, string> = {
      ...formData,
      pegboard_size_presets: serializedPresets,
      pegboard_price_compact: String(compactPreset?.price ?? (presets[0]?.price || 699)),
      pegboard_price_studio: String(studioPreset?.price ?? (presets[1]?.price || 999)),
      pegboard_price_executive: String(execPreset?.price ?? (presets[2]?.price || 1499)),
      pegboard_price_duo: String(duoPreset?.price ?? (presets[3]?.price || 1799)),
    };

    await onQuickSave(payload);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <section className="space-y-6 rounded-2xl border border-white/20 dark:border-white/10 bg-surface/50 backdrop-blur-2xl backdrop-saturate-150 p-6 shadow-xl shadow-black/5">
      {/* Hidden inputs for form submit in global settings tab */}
      <input type="hidden" name="pegboard_size_presets" value={JSON.stringify(presets)} />
      <input
        type="hidden"
        name="pegboard_price_compact"
        value={String(presets.find((p) => p.id === "compact")?.price ?? presets[0]?.price ?? 699)}
      />
      <input
        type="hidden"
        name="pegboard_price_studio"
        value={String(presets.find((p) => p.id === "studio")?.price ?? presets[1]?.price ?? 999)}
      />
      <input
        type="hidden"
        name="pegboard_price_executive"
        value={String(presets.find((p) => p.id === "executive")?.price ?? presets[2]?.price ?? 1499)}
      />
      <input
        type="hidden"
        name="pegboard_price_duo"
        value={String(presets.find((p) => p.id === "duo")?.price ?? presets[3]?.price ?? 1799)}
      />

      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-border/80 pb-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-accent/15 text-accent border border-accent/25 mb-1.5">
            <Sparkles className="size-3.5" />
            <span>Star Product Spotlight</span>
          </div>
          <h3 className="text-xl font-bold tracking-tight">Modular Pegboard Studio Settings</h3>
          <p className="text-xs text-muted mt-0.5">
            Customize live copy, manage dynamic size presets, and configure add-on kit pricing.
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

      {/* Dynamic Sizing & Pricing Matrix */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold flex items-center gap-2 text-fg">
              <DollarSign className="size-4 text-accent" />
              <span>Base Tile Sizes & Pricing Presets (₹)</span>
            </h4>
            <p className="text-xs text-muted mt-0.5">
              Add new sizes, remove options you do not want to offer, or edit names, dimensions, descriptions, and prices.
            </p>
          </div>

          <Button
            type="button"
            onClick={handleAddPreset}
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 border-dashed border-accent/60 text-accent hover:bg-accent/10 cursor-pointer self-start sm:self-auto"
          >
            <Plus className="size-3.5" />
            <span>Add Size Preset</span>
          </Button>
        </div>

        {/* Presets Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {presets.map((preset, idx) => (
            <div
              key={preset.id}
              className={cn(
                "rounded-2xl border transition-all p-4 space-y-3.5 relative shadow-sm",
                preset.popular
                  ? "border-accent/60 bg-accent/5 ring-1 ring-accent/30"
                  : "border-border/80 bg-surface/80 hover:border-border hover:bg-surface"
              )}
            >
              {/* Card Top Action Bar */}
              <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-md bg-surface-2 text-muted border border-border/60">
                    Preset #{idx + 1}
                  </span>
                  {preset.popular ? (
                    <button
                      type="button"
                      onClick={() => handleTogglePopular(preset.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-accent text-ink shadow-xs cursor-pointer"
                      title="Click to remove popular badge"
                    >
                      <Star className="size-3 fill-ink" />
                      <span>Most Popular</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleTogglePopular(preset.id)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium text-muted hover:text-accent hover:border-accent/40 border border-border/80 bg-surface-2 cursor-pointer transition-colors"
                      title="Set as Most Popular preset"
                    >
                      <Star className="size-3" />
                      <span>Set as Popular</span>
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleRemovePreset(preset.id)}
                  disabled={presets.length <= 1}
                  className="size-7 rounded-lg border border-border/60 hover:border-red-500/40 hover:bg-red-500/10 text-muted hover:text-red-500 flex items-center justify-center transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                  title={presets.length <= 1 ? "At least one preset is required" : "Delete preset"}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>

              {/* Title & Dimension Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">
                    Preset Name
                  </label>
                  <input
                    type="text"
                    value={preset.name}
                    onChange={(e) => handleUpdatePreset(preset.id, { name: e.target.value })}
                    placeholder="e.g. Studio Standard"
                    className="w-full rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-xs font-semibold text-fg focus:border-accent focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">
                    Dimensions / Format
                  </label>
                  <input
                    type="text"
                    value={preset.dims}
                    onChange={(e) => handleUpdatePreset(preset.id, { dims: e.target.value })}
                    placeholder="e.g. 30 × 30 cm Tile"
                    className="w-full rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-xs text-fg focus:border-accent focus:outline-none"
                  />
                </div>
              </div>

              {/* Price & Description Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">
                    Price (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted">₹</span>
                    <input
                      type="number"
                      min="0"
                      value={preset.price}
                      onChange={(e) =>
                        handleUpdatePreset(preset.id, { price: Math.max(0, Number(e.target.value)) })
                      }
                      className="w-full rounded-lg border border-border bg-surface-2 pl-6 pr-2.5 py-1.5 text-xs font-bold text-fg focus:border-accent focus:outline-none"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">
                    Customer Benefit Note
                  </label>
                  <input
                    type="text"
                    value={preset.desc}
                    onChange={(e) => handleUpdatePreset(preset.id, { desc: e.target.value })}
                    placeholder="e.g. Ideal for monitor risers & full setups"
                    className="w-full rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-xs text-muted focus:border-accent focus:outline-none"
                  />
                </div>
              </div>

              {/* Customer Pill Preview */}
              <div className="flex items-center justify-between text-[11px] px-2.5 py-1.5 rounded-lg bg-surface-2/60 border border-border/50 text-muted">
                <span className="truncate">
                  Live button: <strong className="text-fg">{preset.name || "Untitled"}</strong> ({preset.dims || "—"})
                </span>
                <span className="font-bold text-accent shrink-0 ml-2">₹{preset.price}</span>
              </div>
            </div>
          ))}
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
