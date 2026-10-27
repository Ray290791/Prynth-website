import React, { useState, useEffect } from "react";
import { useRouter } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CustomPricingSettings } from "@/components/custom-pricing-settings";
import { LithophanePricingSettings } from "@/components/lithophane-pricing-settings";
import { PegboardSettings } from "@/components/pegboard-settings";
import { getAdminSiteSettings, updateSiteSettings } from "@/lib/settings-fns";
import { getAllProductsAdmin } from "@/lib/products-fns";
import { triggerDatabaseMaintenance } from "@/lib/orders-fns";
import { cn } from "@/lib/utils";
import { Settings, Image as ImageIcon, Shield, Search, Plus, Trash2, Edit2, CreditCard, Mail, Truck } from "lucide-react";

export function SettingsTab() {
  const queryClient = useQueryClient();
  const router = useRouter();

  const { data: settings, isLoading, error } = useQuery({
    queryKey: ["adminSiteSettings"],
    queryFn: () => getAdminSiteSettings(),
    staleTime: 60_000,
  });

  const { data: products } = useQuery({
    queryKey: ["adminProducts"],
    queryFn: () => getAllProductsAdmin(),
    staleTime: 60_000,
  });

  const [heroSlots, setHeroSlots] = useState<{ slug: string; image?: string }[]>(() => {
    try {
      if (settings?.hero_featured_slots) {
        const parsed = JSON.parse(settings.hero_featured_slots);
        if (Array.isArray(parsed) && parsed.length === 4) return parsed;
      }
    } catch (_e) {
      // Fallback to default slots on parse error
    }
    return [
      { slug: "catch-bowl", image: "/products/catch-bowl.jpg" },
      { slug: "desk-tray", image: "/products/desk-tray.jpg" },
      { slug: "geo-planter", image: "/products/geo-planter.jpg" },
      { slug: "hex-coasters", image: "/products/hex-coasters.jpg" },
    ];
  });

  const [maintenanceStatus, setMaintenanceStatus] = useState<string | null>(null);
  const [isCleaning, setIsCleaning] = useState(false);

  useEffect(() => {
    if (settings?.hero_featured_slots) {
      try {
        const parsed = JSON.parse(settings.hero_featured_slots);
        if (Array.isArray(parsed) && parsed.length === 4) {
          setHeroSlots(parsed);
        }
      } catch (_e) {
        // Ignore JSON parse error on setting update
      }
    }
  }, [settings?.hero_featured_slots]);

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      await updateSiteSettings({ data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["siteSettings"] });
      void router.invalidate();
      toast.success("Site settings updated!");
    },
    onError: (err: any) => {
      console.error("Failed to update site settings:", err);
      toast.error(err?.message || "Failed to update site settings");
    }
  });

  if (isLoading) return <div className="p-8">Loading settings...</div>;
  if (error || !settings) return <div className="p-8 text-danger">Failed to load settings</div>;

  const handleQuickSavePricing = async (pricingData: Record<string, string>) => {
    try {
      await updateMutation.mutateAsync(pricingData);
    } catch (err: any) {
      console.error("Failed to quick save custom pricing settings:", err);
    }
  };

  const handleRunMaintenance = async () => {
    setIsCleaning(true);
    try {
      const res = await triggerDatabaseMaintenance();
      if (res.report) {
        toast.success(
          `Storage cleanup complete! Pruned ${res.report.cartSessionsDeleted} carts, ${res.report.customFilesDeleted} temporary files, and ${res.report.recentlyViewedDeleted} logs.`
        );
        setMaintenanceStatus(
          `Last cleaned: ${new Date().toLocaleTimeString()} (Pruned ${res.report.customFilesDeleted} temp files, ${res.report.cartSessionsDeleted} carts)`
        );
      } else {
        toast.success("Storage is healthy and up-to-date.");
      }
    } catch (err: any) {
      toast.error("Cleanup failed: " + (err.message || String(err)));
    } finally {
      setIsCleaning(false);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data: Record<string, any> = {
      tagline: (fd.get("tagline") as string)?.trim(),
      email: (fd.get("email") as string)?.trim(),
      instagram: (fd.get("instagram") as string)?.trim(),
      copyright: (fd.get("copyright") as string)?.trim(),
      bottom_text: (fd.get("bottom_text") as string)?.trim(),
      hero_tagline: (fd.get("hero_tagline") as string)?.trim(),
      hero_description: (fd.get("hero_description") as string)?.trim(),
      about_story: (fd.get("about_story") as string)?.trim(),
      contact_email: (fd.get("contact_email") as string)?.trim() || "",
      contact_instagram: (fd.get("contact_instagram") as string)?.trim() || "",
      contact_address: (fd.get("contact_address") as string)?.trim() || "",
      contact_phone: (fd.get("contact_phone") as string)?.trim() || "",
      shipping_policy: (fd.get("shipping_policy") as string)?.trim(),
      returns_policy: (fd.get("returns_policy") as string)?.trim(),
      product_categories: ((fd.get("product_categories") as string) || settings?.product_categories || "Desk, Home, Bath").trim(),
      free_shipping_threshold: ((fd.get("free_shipping_threshold") as string) || settings?.free_shipping_threshold || "349").trim(),
      standard_shipping_fee: ((fd.get("standard_shipping_fee") as string) || settings?.standard_shipping_fee || "49").trim(),
      express_shipping_fee: ((fd.get("express_shipping_fee") as string) || settings?.express_shipping_fee || "129").trim(),
      cod_fee: ((fd.get("cod_fee") as string) || settings?.cod_fee || "40").trim(),
      shiprocket_pickup_location: ((fd.get("shiprocket_pickup_location") as string) || settings?.shiprocket_pickup_location || "Primary").trim(),
      shiprocket_pickup_pincode: ((fd.get("shiprocket_pickup_pincode") as string) || settings?.shiprocket_pickup_pincode || "400001").trim(),
      promo_banner: ((fd.get("promo_banner") as string) || settings?.promo_banner || "").trim(),
      hero_featured_slots: JSON.stringify(heroSlots),
      custom_pricing_upload_formula: ((fd.get("custom_pricing_upload_formula") as string) || settings?.custom_pricing_upload_formula || "").trim(),
      custom_pricing_idea_formula: ((fd.get("custom_pricing_idea_formula") as string) || settings?.custom_pricing_idea_formula || "").trim(),
      custom_pricing_setup_fee: ((fd.get("custom_pricing_setup_fee") as string) || settings?.custom_pricing_setup_fee || "49").trim(),
      custom_pricing_min_print: ((fd.get("custom_pricing_min_print") as string) || settings?.custom_pricing_min_print || "99").trim(),
      custom_pricing_materials: ((fd.get("custom_pricing_materials") as string) || settings?.custom_pricing_materials || "").trim(),
      custom_pricing_qualities: ((fd.get("custom_pricing_qualities") as string) || settings?.custom_pricing_qualities || "").trim(),
      custom_pricing_infills: ((fd.get("custom_pricing_infills") as string) || settings?.custom_pricing_infills || "").trim(),
      custom_pricing_size_presets: ((fd.get("custom_pricing_size_presets") as string) || settings?.custom_pricing_size_presets || "").trim(),
      custom_pricing_complexities: ((fd.get("custom_pricing_complexities") as string) || settings?.custom_pricing_complexities || "").trim(),
      lithophane_price_medium: ((fd.get("lithophane_price_medium") as string) || settings?.lithophane_price_medium || "399").trim(),
      lithophane_price_standard: ((fd.get("lithophane_price_standard") as string) || settings?.lithophane_price_standard || "549").trim(),
      lithophane_price_large: ((fd.get("lithophane_price_large") as string) || settings?.lithophane_price_large || "749").trim(),
      lithophane_lightbox_addon_medium: ((fd.get("lithophane_lightbox_addon_medium") as string) || settings?.lithophane_lightbox_addon_medium || "249").trim(),
      lithophane_lightbox_addon_standard: ((fd.get("lithophane_lightbox_addon_standard") as string) || settings?.lithophane_lightbox_addon_standard || "299").trim(),
      lithophane_lightbox_addon_large: ((fd.get("lithophane_lightbox_addon_large") as string) || settings?.lithophane_lightbox_addon_large || "399").trim(),
      lithophane_gift_packaging_fee: ((fd.get("lithophane_gift_packaging_fee") as string) || settings?.lithophane_gift_packaging_fee || "99").trim(),
      lithophane_bulk_discount_5: ((fd.get("lithophane_bulk_discount_5") as string) || settings?.lithophane_bulk_discount_5 || "5").trim(),
      lithophane_bulk_discount_10: ((fd.get("lithophane_bulk_discount_10") as string) || settings?.lithophane_bulk_discount_10 || "10").trim(),
      lithophane_bulk_discount_20: ((fd.get("lithophane_bulk_discount_20") as string) || settings?.lithophane_bulk_discount_20 || "15").trim(),
      brand_name: ((fd.get("brand_name") as string) || settings?.brand_name || "prynth!").trim(),
      announcement_enabled: fd.get("announcement_enabled") === "on" ? "true" : "false",
      about_headline: ((fd.get("about_headline") as string) || settings?.about_headline || "").trim(),
      about_pillar1_title: ((fd.get("about_pillar1_title") as string) || settings?.about_pillar1_title || "").trim(),
      about_pillar1_desc: ((fd.get("about_pillar1_desc") as string) || settings?.about_pillar1_desc || "").trim(),
      about_pillar2_title: ((fd.get("about_pillar2_title") as string) || settings?.about_pillar2_title || "").trim(),
      about_pillar2_desc: ((fd.get("about_pillar2_desc") as string) || settings?.about_pillar2_desc || "").trim(),
      about_pillar3_title: ((fd.get("about_pillar3_title") as string) || settings?.about_pillar3_title || "").trim(),
      about_pillar3_desc: ((fd.get("about_pillar3_desc") as string) || settings?.about_pillar3_desc || "").trim(),
      contact_hours: ((fd.get("contact_hours") as string) || settings?.contact_hours || "").trim(),
      contact_whatsapp: ((fd.get("contact_whatsapp") as string) || "").trim(),
      whatsapp_enabled: fd.get("whatsapp_enabled") === "on" ? "true" : "false",
      social_twitter: ((fd.get("social_twitter") as string) || settings?.social_twitter || "").trim(),
      social_youtube: ((fd.get("social_youtube") as string) || settings?.social_youtube || "").trim(),
      pegboard_hero_title: ((fd.get("pegboard_hero_title") as string) || settings?.pegboard_hero_title || "").trim(),
      pegboard_hero_subtitle: ((fd.get("pegboard_hero_subtitle") as string) || settings?.pegboard_hero_subtitle || "").trim(),
      pegboard_badge: ((fd.get("pegboard_badge") as string) || settings?.pegboard_badge || "").trim(),
      pegboard_size_presets: ((fd.get("pegboard_size_presets") as string) || settings?.pegboard_size_presets || "").trim(),
      pegboard_price_compact: ((fd.get("pegboard_price_compact") as string) || settings?.pegboard_price_compact || "699").trim(),
      pegboard_price_studio: ((fd.get("pegboard_price_studio") as string) || settings?.pegboard_price_studio || "999").trim(),
      pegboard_price_executive: ((fd.get("pegboard_price_executive") as string) || settings?.pegboard_price_executive || "1499").trim(),
      pegboard_price_duo: ((fd.get("pegboard_price_duo") as string) || settings?.pegboard_price_duo || "1799").trim(),
      pegboard_addon_tech_price: ((fd.get("pegboard_addon_tech_price") as string) || settings?.pegboard_addon_tech_price || "299").trim(),
      pegboard_addon_desk_price: ((fd.get("pegboard_addon_desk_price") as string) || settings?.pegboard_addon_desk_price || "249").trim(),
      pegboard_addon_botanical_price: ((fd.get("pegboard_addon_botanical_price") as string) || settings?.pegboard_addon_botanical_price || "279").trim(),
      pegboard_story: ((fd.get("pegboard_story") as string) || settings?.pegboard_story || "").trim(),
      payment_online_enabled: fd.get("payment_online_enabled") === "on" ? "true" : "false",
      payment_cod_enabled: fd.get("payment_cod_enabled") === "on" ? "true" : "false",
      payment_upi_enabled: fd.get("payment_upi_enabled") === "on" ? "true" : "false",
      payment_upi_id: ((fd.get("payment_upi_id") as string) || "").trim(),
      resend_from_email: ((fd.get("resend_from_email") as string) || "").trim(),
      razorpay_key_id: ((fd.get("razorpay_key_id") as string) || "").trim(),
    };
    const secretInput = ((fd.get("razorpay_key_secret") as string) || "").trim();
    if (secretInput && !secretInput.includes("•")) {
      data.razorpay_key_secret = secretInput;
    }
    updateMutation.mutate(data);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div>
        <h2 className="text-2xl font-semibold">Site Settings</h2>
        <p className="text-muted mt-1 text-sm">Update the global content across your site.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-12 max-w-3xl">
        {/* HOMEPAGE SECTION */}
        <section className="space-y-5">
          <h3 className="text-lg font-semibold border-b border-border pb-2">Homepage & Hero Showcase</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Brand Name / Store Name</label>
              <input name="brand_name" defaultValue={settings.brand_name || "prynth!"} required className="w-full rounded border border-border bg-surface p-2 text-sm" />
            </div>
            <div className="flex items-center pt-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="announcement_enabled"
                  defaultChecked={settings.announcement_enabled !== "false"}
                  className="size-4 rounded border-border accent-accent"
                />
                <span className="text-sm font-medium">Show Announcement Promo Pill on Homepage</span>
              </label>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Hero Tagline</label>
            <input name="hero_tagline" defaultValue={settings.hero_tagline} required className="w-full rounded border border-border bg-surface p-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Hero Description</label>
            <textarea name="hero_description" defaultValue={settings.hero_description} required rows={3} className="w-full rounded border border-border bg-surface p-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Floating Promo Pill / Free Delivery Banner</label>
            <input
              name="promo_banner"
              defaultValue={settings.promo_banner || `Free delivery across India on orders over ₹${settings.free_shipping_threshold || "349"}`}
              className="w-full rounded border border-border bg-surface p-2 text-sm"
              placeholder="Free delivery across India on orders over ₹349"
            />
            <p className="text-xs text-muted mt-1">Badge shown above hero on the homepage. (Leave empty to auto-update based on the free delivery threshold below).</p>
          </div>

          {/* 4-SLOT HERO SHOWCASE SELECTOR */}
          <div className="rounded-xl border border-border bg-surface-2/40 p-5 space-y-4">
            <div>
              <h4 className="font-semibold text-base text-fg">Hero 2×2 Showcase Products & Images</h4>
              <p className="text-xs text-muted mt-0.5">Select the 4 products to show in the 2×2 grid on the homepage hero, and pick which photo from their gallery to display.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { title: "Slot 1 (Top Left)", index: 0 },
                { title: "Slot 2 (Top Right)", index: 1 },
                { title: "Slot 3 (Bottom Left)", index: 2 },
                { title: "Slot 4 (Bottom Right)", index: 3 },
              ].map(({ title, index }) => {
                const currentSlot = heroSlots[index] || { slug: products?.[index]?.slug || "", image: products?.[index]?.image || "" };
                const currentProduct = products?.find((p: any) => p.slug === currentSlot.slug) || products?.[index];

                const productImages = currentProduct
                  ? Array.from(new Set([
                      currentProduct.image,
                      ...(currentProduct.gallery || []).map((g: any) => typeof g === "string" ? g : g.url),
                    ].filter(Boolean)))
                  : [];

                const activeImage = currentSlot.image || currentProduct?.image || "";

                return (
                  <div key={index} className="rounded-xl border border-border bg-surface p-4 space-y-3 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-accent">{title}</span>
                      {activeImage && (
                        <img src={activeImage} alt="Preview" className="w-10 h-10 rounded-lg object-cover border border-border shrink-0" />
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-muted mb-1">Choose Product</label>
                      <select
                        className="w-full rounded border border-border bg-surface-2 p-2 text-xs text-fg focus:ring-1 focus:ring-accent"
                        value={currentSlot.slug || currentProduct?.slug || ""}
                        onChange={(e) => {
                          const newSlug = e.target.value;
                          const chosen = products?.find((p: any) => p.slug === newSlug);
                          const next = [...heroSlots];
                          next[index] = {
                            slug: newSlug,
                            image: chosen?.image || "",
                          };
                          setHeroSlots(next);
                        }}
                      >
                        {products?.map((p: any) => (
                          <option key={p.slug} value={p.slug}>
                            {p.name} ({p.slug})
                          </option>
                        ))}
                      </select>
                    </div>

                    {productImages.length > 0 && (
                      <div>
                        <label className="block text-xs font-medium text-muted mb-1.5">Select Display Image</label>
                        <div className="flex flex-wrap gap-2">
                          {productImages.map((imgUrl, imgIdx) => {
                            const isSelected = activeImage === imgUrl;
                            return (
                              <button
                                key={imgIdx}
                                type="button"
                                onClick={() => {
                                  const next = [...heroSlots];
                                  next[index] = {
                                    slug: currentSlot.slug || currentProduct?.slug || "",
                                    image: imgUrl,
                                  };
                                  setHeroSlots(next);
                                }}
                                className={cn(
                                  "relative rounded-lg overflow-hidden border-2 transition-all p-0.5",
                                  isSelected ? "border-accent ring-2 ring-accent/30" : "border-transparent opacity-65 hover:opacity-100 hover:border-border"
                                )}
                              >
                                <img src={imgUrl} alt={`Option ${imgIdx + 1}`} className="w-12 h-12 object-cover rounded-md" />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-medium text-muted mb-1">Image URL (or custom link)</label>
                      <input
                        type="text"
                        value={currentSlot.image || ""}
                        onChange={(e) => {
                          const next = [...heroSlots];
                          next[index] = {
                            slug: currentSlot.slug || currentProduct?.slug || "",
                            image: e.target.value.trim(),
                          };
                          setHeroSlots(next);
                        }}
                        placeholder="e.g. /products/catch-bowl.jpg"
                        className="w-full rounded border border-border bg-surface-2 p-1.5 text-xs text-fg"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* SHIPPING & DELIVERY RATES SECTION */}
        <section className="space-y-4">
          <h3 className="text-lg font-semibold border-b border-border pb-2">Shipping & Delivery Rates</h3>
          <p className="text-xs text-muted">Configure shipping thresholds and courier fees used across the homepage, cart calculation, and checkout.</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Free Delivery Threshold (₹)</label>
              <input
                type="number"
                min="0"
                step="1"
                name="free_shipping_threshold"
                defaultValue={settings.free_shipping_threshold || "349"}
                required
                className="w-full rounded border border-border bg-surface p-2 text-sm"
                placeholder="349"
              />
              <p className="text-xs text-muted mt-1">Orders at or above this cart amount unlock free standard delivery.</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Standard Shipping Fee (₹)</label>
              <input
                type="number"
                min="0"
                step="1"
                name="standard_shipping_fee"
                defaultValue={settings.standard_shipping_fee || "49"}
                required
                className="w-full rounded border border-border bg-surface p-2 text-sm"
                placeholder="49"
              />
              <p className="text-xs text-muted mt-1">Standard 3–5 day delivery fee charged for orders below threshold.</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Express Shipping Fee (₹)</label>
              <input
                type="number"
                min="0"
                step="1"
                name="express_shipping_fee"
                defaultValue={settings.express_shipping_fee || "129"}
                required
                className="w-full rounded border border-border bg-surface p-2 text-sm"
                placeholder="129"
              />
              <p className="text-xs text-muted mt-1">Faster 1–2 day courier fee.</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Cash on Delivery (COD) Fee (₹)</label>
              <input
                type="number"
                min="0"
                step="1"
                name="cod_fee"
                defaultValue={settings.cod_fee || "40"}
                required
                className="w-full rounded border border-border bg-surface p-2 text-sm"
                placeholder="40"
              />
              <p className="text-xs text-muted mt-1">Collection fee added when customer selects Cash on Delivery.</p>
            </div>
          </div>
        </section>

        {/* LOGISTICS & SHIPROCKET INTEGRATION SECTION */}
        <section className="space-y-4 rounded-2xl border border-border bg-surface p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h3 className="text-base font-semibold text-fg flex items-center gap-2">
                <Truck className="size-4 text-accent" />
                <span>Logistics & Courier Integration (Shiprocket / Manual)</span>
              </h3>
              <p className="text-xs text-muted mt-0.5">
                Dispatch orders manually or connect your Shiprocket account for automated AWB and courier booking.
              </p>
            </div>
            <span className="rounded-full bg-accent/10 border border-accent/20 px-2.5 py-0.5 text-[10px] font-semibold text-accent">
              Easy Courier Setup
            </span>
          </div>

          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3.5 text-xs text-blue-900 dark:text-blue-300 leading-relaxed">
            <p className="font-semibold flex items-center gap-1.5">
              <span>💡 Don't have a Shiprocket account yet?</span>
            </p>
            <p className="mt-1">
              No problem! You can ship orders today using <strong>Manual Tracking</strong> in the Order Details modal. When you're ready to automate label creation, simply enter your Shiprocket email & password below or add them to your Cloudflare Worker secrets via <code className="font-mono bg-surface-2 px-1 py-0.5 rounded">npx wrangler secret put SHIPROCKET_EMAIL</code>.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Shiprocket Pickup Location Name</label>
              <input
                name="shiprocket_pickup_location"
                defaultValue={settings.shiprocket_pickup_location || "Primary"}
                className="w-full rounded border border-border bg-surface p-2 text-sm"
                placeholder="e.g. Primary or Mumbai Studio"
              />
              <p className="text-xs text-muted mt-1">Must match the pickup warehouse name saved in your Shiprocket account.</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Default Pickup PIN Code</label>
              <input
                name="shiprocket_pickup_pincode"
                defaultValue={settings.shiprocket_pickup_pincode || "400001"}
                className="w-full rounded border border-border bg-surface p-2 text-sm font-mono"
                placeholder="400001"
              />
              <p className="text-xs text-muted mt-1">Studio origin pincode used for transit calculation.</p>
            </div>
          </div>
        </section>

        {/* CUSTOM PRINT PRICING & FORMULAS SECTION */}
        <CustomPricingSettings
          settings={settings}
          onQuickSave={handleQuickSavePricing}
          isSaving={updateMutation.isPending}
        />

        {/* LITHOPHANE STUDIO & LIGHT BOX PRICING SECTION */}
        <LithophanePricingSettings
          settings={settings}
          onQuickSave={handleQuickSavePricing}
          isSaving={updateMutation.isPending}
        />

        {/* STAR PRODUCT: MODULAR PEGBOARD SETTINGS */}
        <PegboardSettings
          settings={settings}
          onQuickSave={handleQuickSavePricing}
          isSaving={updateMutation.isPending}
        />

        {/* SHOP & CATEGORIES SECTION */}
        <section className="space-y-4">
          <h3 className="text-lg font-semibold border-b border-border pb-2">Shop & Categories</h3>
          <div>
            <label className="block text-sm font-medium mb-1">Product Categories (comma-separated)</label>
            <input
              name="product_categories"
              defaultValue={settings.product_categories || "Desk, Home, Bath"}
              required
              className="w-full rounded border border-border bg-surface p-2 text-sm"
              placeholder="Desk, Home, Bath"
            />
            <p className="text-xs text-muted mt-1">Categories displayed on the shop filters and product creation forms.</p>
          </div>
        </section>

        {/* ABOUT SECTION */}
        <section className="space-y-4">
          <h3 className="text-lg font-semibold border-b border-border pb-2">About Us</h3>
          <div>
            <label className="block text-sm font-medium mb-1">About Page Headline</label>
            <input
              name="about_headline"
              defaultValue={settings.about_headline || "Honest prices. Good prints. For people who just need the thing."}
              required
              className="w-full rounded border border-border bg-surface p-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Our Story (paragraphs separated by blank lines)</label>
            <textarea name="about_story" defaultValue={settings.about_story} required rows={8} className="w-full rounded border border-border bg-surface p-2 text-sm" />
          </div>

          <div className="rounded-xl border border-border bg-surface-2/40 p-4 space-y-4">
            <h4 className="text-sm font-semibold text-fg">Three Core Value Pillars</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-2 p-3 rounded-lg border border-border bg-surface">
                <span className="text-xs font-semibold text-accent uppercase">Pillar 1</span>
                <input
                  name="about_pillar1_title"
                  defaultValue={settings.about_pillar1_title || "The price is the price"}
                  placeholder="Pillar 1 Title"
                  className="w-full rounded border border-border bg-surface-2 p-1.5 text-xs font-medium"
                />
                <textarea
                  name="about_pillar1_desc"
                  defaultValue={settings.about_pillar1_desc || "No setup surprises, no colour upcharge on the listed palette, no 'from' pricing."}
                  placeholder="Pillar 1 Description"
                  rows={3}
                  className="w-full rounded border border-border bg-surface-2 p-1.5 text-xs"
                />
              </div>

              <div className="space-y-2 p-3 rounded-lg border border-border bg-surface">
                <span className="text-xs font-semibold text-accent uppercase">Pillar 2</span>
                <input
                  name="about_pillar2_title"
                  defaultValue={settings.about_pillar2_title || "Everyday, not exclusive"}
                  placeholder="Pillar 2 Title"
                  className="w-full rounded border border-border bg-surface-2 p-1.5 text-xs font-medium"
                />
                <textarea
                  name="about_pillar2_desc"
                  defaultValue={settings.about_pillar2_desc || "Built for people who want a stand or a hook, not a lecture on nozzles."}
                  placeholder="Pillar 2 Description"
                  rows={3}
                  className="w-full rounded border border-border bg-surface-2 p-1.5 text-xs"
                />
              </div>

              <div className="space-y-2 p-3 rounded-lg border border-border bg-surface">
                <span className="text-xs font-semibold text-accent uppercase">Pillar 3</span>
                <input
                  name="about_pillar3_title"
                  defaultValue={settings.about_pillar3_title || "If it's wrong, we redo it"}
                  placeholder="Pillar 3 Title"
                  className="w-full rounded border border-border bg-surface-2 p-1.5 text-xs font-medium"
                />
                <textarea
                  name="about_pillar3_desc"
                  defaultValue={settings.about_pillar3_desc || "Prints are checked. Returns are simple. See the returns page for the details."}
                  placeholder="Pillar 3 Description"
                  rows={3}
                  className="w-full rounded border border-border bg-surface-2 p-1.5 text-xs"
                />
              </div>
            </div>
          </div>
        </section>

        {/* CONTACT SECTION */}
        <section className="space-y-4">
          <h3 className="text-lg font-semibold border-b border-border pb-2">Contact Page</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Support Email</label>
              <input type="email" name="contact_email" defaultValue={settings.contact_email} className="w-full rounded border border-border bg-surface p-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Instagram Handle</label>
              <input name="contact_instagram" defaultValue={settings.contact_instagram} className="w-full rounded border border-border bg-surface p-2 text-sm" />
            </div>
          </div>
          {/* WhatsApp Support Master Toggle */}
          <div className="rounded-xl border border-border/80 bg-surface-2/40 p-4 space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <label htmlFor="whatsapp_enabled" className="block text-sm font-semibold text-fg cursor-pointer">
                  Enable WhatsApp Support &amp; Chat Buttons
                </label>
                <p className="text-xs text-muted mt-0.5">
                  Master toggle to enable or disable all WhatsApp floating widgets, contact cards, and inquiry buttons across the entire website. Keep disabled until your dedicated studio number is active.
                </p>
              </div>
              <input
                id="whatsapp_enabled"
                name="whatsapp_enabled"
                type="checkbox"
                defaultChecked={settings.whatsapp_enabled === "true"}
                className="size-5 rounded border-border accent-accent cursor-pointer"
              />
            </div>
            {settings.whatsapp_enabled !== "true" && (
              <div className="text-xs text-amber-500/90 flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg">
                <span>⚠️ WhatsApp chat buttons are currently hidden for all website visitors.</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Phone Number</label>
              <input name="contact_phone" defaultValue={settings.contact_phone} placeholder="+91 98765 43210" className="w-full rounded border border-border bg-surface p-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">WhatsApp Number / Direct Chat</label>
              <input name="contact_whatsapp" defaultValue={settings.contact_whatsapp || ""} placeholder="+91 98765 43210" className="w-full rounded border border-border bg-surface p-2 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Operating Business Hours</label>
              <input name="contact_hours" defaultValue={settings.contact_hours || "Monday – Saturday: 10:00 AM – 7:00 PM IST"} className="w-full rounded border border-border bg-surface p-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Physical Operating Address</label>
              <input name="contact_address" defaultValue={settings.contact_address} placeholder="City, State, India" className="w-full rounded border border-border bg-surface p-2 text-sm" />
            </div>
          </div>
        </section>

        {/* POLICIES SECTION */}
        <section className="space-y-4">
          <h3 className="text-lg font-semibold border-b border-border pb-2">Policies</h3>
          <div>
            <label className="block text-sm font-medium mb-1">Shipping Policy</label>
            <textarea name="shipping_policy" defaultValue={settings.shipping_policy} required rows={4} className="w-full rounded border border-border bg-surface p-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Returns Policy</label>
            <textarea name="returns_policy" defaultValue={settings.returns_policy} required rows={4} className="w-full rounded border border-border bg-surface p-2 text-sm" />
          </div>
        </section>

        {/* PAYMENT & EMAIL LIVE GATEWAYS SECTION */}
        <section className="space-y-6 rounded-2xl border border-border bg-surface-2/40 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <span>💳</span> Payment Gateway & Email Verification (Live Setup)
              </h3>
              <p className="text-xs text-muted mt-0.5">
                Configure Razorpay credentials and Resend sender email to transition out of test modes.
              </p>
            </div>
            {/* Live status badge */}
            <div className="flex items-center gap-2">
              {(settings.razorpay_key_id?.startsWith("rzp_live_")) ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Razorpay Live Mode
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  <span className="size-1.5 rounded-full bg-amber-500" />
                  Razorpay Test Mode
                </span>
              )}
            </div>
          </div>

          {/* Resend Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <span>✉️</span> Resend Custom Domain & Sender Email
              </h4>
              <span className="text-xs font-mono text-muted">
                {settings.resend_from_email && !settings.resend_from_email.includes("resend.dev") ? "Verified Domain Mode" : "Sandbox Test Mode (onboarding@resend.dev)"}
              </span>
            </div>
            <div>
              <label className="block text-xs font-medium text-subtle mb-1">
                From Sender Email (e.g. Prynth &lt;orders@prynth.in&gt; or hello@prynth.in)
              </label>
              <input
                name="resend_from_email"
                defaultValue={settings.resend_from_email || "Prynth <orders@prynth.in>"}
                placeholder="Prynth <orders@prynth.in>"
                className="w-full rounded border border-border bg-surface p-2 text-sm font-mono"
              />
              <p className="text-xs text-muted mt-1.5 leading-relaxed">
                💡 To send from your email without Resend test restrictions, add your domain at <a href="https://resend.com/domains" target="_blank" rel="noreferrer" className="text-accent underline font-medium">resend.com/domains</a> and add the 3 DNS records (DKIM, SPF, DMARC) at your domain host.
              </p>
            </div>
          </div>

          {/* Razorpay Section */}
          <div className="space-y-4 pt-4 border-t border-border">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <span>⚡</span> Razorpay Live Credentials
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-subtle mb-1">
                  Razorpay Key ID (rzp_live_... or rzp_test_...)
                </label>
                <input
                  name="razorpay_key_id"
                  defaultValue={settings.razorpay_key_id}
                  placeholder="rzp_live_..."
                  className="w-full rounded border border-border bg-surface p-2 text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-subtle mb-1">
                  Razorpay Key Secret
                </label>
                <input
                  type="password"
                  name="razorpay_key_secret"
                  defaultValue=""
                  placeholder={settings.has_razorpay_secret ? "•••••••••••••••• (Configured — leave blank to keep)" : "Enter Razorpay Secret"}
                  className="w-full rounded border border-border bg-surface p-2 text-sm font-mono"
                  autoComplete="new-password"
                />
              </div>
            </div>
            <p className="text-xs text-muted">
              Once your Razorpay KYC verification is approved, toggle to <strong>Live Mode</strong> in your Razorpay dashboard, generate Live API keys, and paste them here or in your Cloudflare Workers environment variables.
            </p>
          </div>

          {/* Payment Toggles */}
          <div className="space-y-3 pt-4 border-t border-border">
            <h4 className="text-sm font-semibold">Store Checkout Payment Methods</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="flex items-center gap-2 rounded-xl border border-border bg-surface p-3 cursor-pointer hover:bg-surface-2 transition-colors">
                <input
                  type="checkbox"
                  name="payment_online_enabled"
                  defaultChecked={settings.payment_online_enabled !== "false"}
                  className="size-4 rounded border-border accent-accent cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-medium block text-fg">Razorpay Online</span>
                  <span className="text-muted">UPI, Cards, Netbanking</span>
                </div>
              </label>

              <label className="flex items-center gap-2 rounded-xl border border-border bg-surface p-3 cursor-pointer hover:bg-surface-2 transition-colors">
                <input
                  type="checkbox"
                  name="payment_cod_enabled"
                  defaultChecked={settings.payment_cod_enabled !== "false"}
                  className="size-4 rounded border-border accent-accent cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-medium block text-fg">Cash on Delivery</span>
                  <span className="text-muted">Pay on courier delivery</span>
                </div>
              </label>

              <label className="flex items-center gap-2 rounded-xl border border-border bg-surface p-3 cursor-pointer hover:bg-surface-2 transition-colors">
                <input
                  type="checkbox"
                  name="payment_upi_enabled"
                  defaultChecked={settings.payment_upi_enabled !== "false"}
                  className="size-4 rounded border-border accent-accent cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-medium block text-fg">Direct UPI / QR</span>
                  <span className="text-muted">Scan QR & enter UTR</span>
                </div>
              </label>
            </div>

            <div>
              <label className="block text-xs font-medium text-subtle mb-1">
                Direct UPI ID (for manual QR payments)
              </label>
              <input
                name="payment_upi_id"
                defaultValue={settings.payment_upi_id}
                placeholder="e.g. prynth@okhdfcbank"
                className="w-full rounded border border-border bg-surface p-2 text-sm font-mono"
              />
            </div>
          </div>

          {/* Razorpay Merchant Compliance Status Checklist */}
          <div className="pt-4 border-t border-border">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-subtle mb-2">
              Razorpay KYC Compliance Checklist (Audit Ready)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2 text-emerald-500">
                <span>✓</span> <span>Contact Us page (Email, Phone, Operating Address)</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-500">
                <span>✓</span> <span>Terms & Conditions (Governing Law & Razorpay clause)</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-500">
                <span>✓</span> <span>Refund & Cancellation (5–7 days timeline & mode)</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-500">
                <span>✓</span> <span>Shipping Policy (Estimated 3–5 days across India)</span>
              </div>
            </div>
          </div>
        </section>

        {/* FOOTER SECTION */}
        <section className="space-y-4">
          <h3 className="text-lg font-semibold border-b border-border pb-2">Global Footer</h3>
          <div>
            <label className="block text-sm font-medium mb-1">Footer Tagline</label>
            <input name="tagline" defaultValue={settings.tagline} required className="w-full rounded border border-border bg-surface p-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Footer Email</label>
              <input type="email" name="email" defaultValue={settings.email} required className="w-full rounded border border-border bg-surface p-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Footer Instagram</label>
              <input name="instagram" defaultValue={settings.instagram} required className="w-full rounded border border-border bg-surface p-2 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Twitter / X Handle</label>
              <input name="social_twitter" defaultValue={settings.social_twitter || "@prynth"} placeholder="@prynth" className="w-full rounded border border-border bg-surface p-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">YouTube Channel URL</label>
              <input name="social_youtube" defaultValue={settings.social_youtube || ""} placeholder="https://youtube.com/@prynth" className="w-full rounded border border-border bg-surface p-2 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Copyright Text</label>
              <input name="copyright" defaultValue={settings.copyright} required className="w-full rounded border border-border bg-surface p-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Bottom Text</label>
              <input name="bottom_text" defaultValue={settings.bottom_text} required className="w-full rounded border border-border bg-surface p-2 text-sm" />
            </div>
          </div>
        </section>

        {/* DATABASE STORAGE & PERFORMANCE MAINTENANCE */}
        <section className="space-y-4 rounded-2xl border border-border bg-surface-2/40 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold flex items-center gap-2">
                <span>🧹</span> Database Storage &amp; Cache Maintenance
              </h3>
              <p className="text-xs text-muted mt-0.5">
                Automatically prunes expired guest carts, stale visitor history, and abandoned 3D files to keep your Neon PostgreSQL database lean and responsive.
              </p>
            </div>
            <button
              type="button"
              onClick={handleRunMaintenance}
              disabled={isCleaning}
              className="shrink-0 px-4 py-2 rounded-xl bg-surface hover:bg-surface-2 border border-border text-xs font-semibold text-fg transition-all shadow-xs cursor-pointer flex items-center gap-2"
            >
              <span>{isCleaning ? "Optimizing Storage..." : "⚡ Run Storage Cleanup Now"}</span>
            </button>
          </div>
          {maintenanceStatus && (
            <p className="text-xs text-emerald-500 font-medium bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg">
              {maintenanceStatus}
            </p>
          )}
        </section>

        <div className="pt-6 border-t border-border flex items-center justify-between">
          <button type="submit" disabled={updateMutation.isPending} className="px-6 py-3 rounded-lg bg-accent text-ink hover:opacity-90 text-sm font-medium cursor-pointer shadow-xs">
            {updateMutation.isPending ? "Saving..." : "Save All Settings"}
          </button>
        </div>
      </form>
    </div>
  );
}

