import { createServerFn } from "@tanstack/react-start";
import { getSql } from "./db";
import { authMiddleware } from "./auth/middleware";
import { verifyAdminRole } from "./admin-fns";
import { z } from "zod";
import {
  DEFAULT_UPLOAD_FORMULA,
  DEFAULT_IDEA_FORMULA,
  DEFAULT_SETUP_FEE,
  DEFAULT_MIN_PRINT,
  MATERIALS,
  QUALITIES,
  INFILLS,
  SIZE_PRESETS,
  COMPLEXITY,
} from "./quote";

export type SiteSettings = {
  tagline: string;
  email: string;
  instagram: string;
  copyright: string;
  bottom_text: string;
  hero_tagline: string;
  hero_description: string;
  about_story: string;
  contact_email: string;
  contact_instagram: string;
  contact_address: string;
  contact_phone: string;
  shipping_policy: string;
  returns_policy: string;
  product_categories: string;
  free_shipping_threshold: string;
  standard_shipping_fee: string;
  express_shipping_fee: string;
  cod_fee: string;
  promo_banner: string;
  hero_featured_slots?: string;
  // Custom print pricing formula & values
  custom_pricing_upload_formula?: string;
  custom_pricing_idea_formula?: string;
  custom_pricing_setup_fee?: string;
  custom_pricing_min_print?: string;
  custom_pricing_materials?: string;
  custom_pricing_qualities?: string;
  custom_pricing_infills?: string;
  custom_pricing_size_presets?: string;
  custom_pricing_complexities?: string;
  // Payment methods toggles
  payment_online_enabled?: string;
  payment_cod_enabled?: string;
  payment_upi_enabled?: string;
  payment_upi_id?: string;
  // Live Gateway & Email Credentials
  resend_from_email?: string;
  razorpay_key_id?: string;
  razorpay_key_secret?: string;
  // Lithophane Studio Pricing & Options
  lithophane_price_medium?: string;
  lithophane_price_standard?: string;
  lithophane_price_large?: string;
  lithophane_lightbox_addon_medium?: string;
  lithophane_lightbox_addon_standard?: string;
  lithophane_lightbox_addon_large?: string;
  lithophane_gift_packaging_fee?: string;
  lithophane_bulk_discount_5?: string;
  lithophane_bulk_discount_10?: string;
  lithophane_bulk_discount_20?: string;
  // Editorial, Brand & Social customization
  brand_name?: string;
  announcement_enabled?: string;
  about_headline?: string;
  about_pillar1_title?: string;
  about_pillar1_desc?: string;
  about_pillar2_title?: string;
  about_pillar2_desc?: string;
  about_pillar3_title?: string;
  about_pillar3_desc?: string;
  contact_hours?: string;
  contact_whatsapp?: string;
  whatsapp_enabled?: string;
  social_twitter?: string;
  social_youtube?: string;
  // Pegboard Star Product settings
  pegboard_hero_title?: string;
  pegboard_hero_subtitle?: string;
  pegboard_badge?: string;
  pegboard_price_compact?: string;
  pegboard_price_studio?: string;
  pegboard_price_executive?: string;
  pegboard_price_duo?: string;
  pegboard_size_presets?: string;
  pegboard_addon_tech_price?: string;
  pegboard_addon_desk_price?: string;
  pegboard_addon_botanical_price?: string;
  pegboard_story?: string;
  pegboard_images?: string;
  // Logistics & Courier settings
  shiprocket_email?: string;
  shiprocket_password?: string;
  shiprocket_pickup_location?: string;
  shiprocket_pickup_pincode?: string;
  // Legal & Business Identity (R1)
  legal_entity_type?: string;
  legal_name?: string;
  legal_director_name?: string;
  legal_registered_address?: string;
  legal_customer_email?: string;
  legal_customer_phone?: string;
  legal_customer_hours?: string;
  grievance_officer_name?: string;
  grievance_officer_designation?: string;
  grievance_officer_email?: string;
  grievance_officer_phone?: string;
  grievance_officer_address?: string;
  legal_gstin?: string;
  legal_country_of_origin?: string;
  legal_jurisdiction_city?: string;
  // Interim Selling Phase Settings (Nov 2026)
  checkout_enabled?: string;
  cod_enabled?: string;
  max_orders_per_day?: string;
  max_orders_per_week?: string;
  profit_target_inr?: string;
  custom_orders_enabled?: string;
  lithophane_enabled?: string;
  pegboard_checkout_enabled?: string;
  allowed_delivery_states?: string;
  invoice_mode?: string;
  turnaround_min_days?: string;
  turnaround_max_days?: string;
  payment_fee_percent?: string;
  gst_on_fee_percent?: string;
  seller_display_name?: string;
  seller_city?: string;
  seller_state?: string;
  seller_address?: string;
  seller_email?: string;
  seller_whatsapp?: string;
  shiprocket_pickup_address?: string;
};

function parseSiteSettings(rows: { key: string; value: string }[]): SiteSettings {
  // Default fallback values if DB is empty somehow
  const settings: SiteSettings = {
    tagline: "Quality prints at honest prices. No catches — just good work, done right.",
    email: "hello@prynth.in",
    instagram: "@prynth07",
    copyright: "Ships across India",
    bottom_text: "Prices include packaging. Made to order.",
    hero_tagline: "Quality prints at honest prices. No catches — just good work, done right.",
    hero_description: "Everyday objects, printed well. Pick something from the shop, send a file, or describe what you need. We handle the rest.",
    about_story: "Founded by Ray Kapadia and Supas Kumar (Co-Founders), prynth! operates out of Mumbai, Maharashtra. It started from a simple annoyance: 3D printing quotes that hid fees, talked over people, or assumed you already owned a printer. We wanted a studio you could use the same way you buy a lamp or a mug — see the price, pick a colour, wait a few days.\n\nWe print ready-made pieces for desks, shelves, and sinks using a dedicated fleet of calibrated Bambu Lab CoreXY printers. We also print your custom CAD files, and we'll model something from a description if you don't have one. The custom page uses the technical words (layer height, infill, PETG) because that's where they help. The rest of the site doesn't.\n\nQuality without theatre. Every print is personally inspected under natural studio light before dispatch. If a layer shifted or a surface came out wrong, it doesn't ship. Prices include packaging. Shipping is listed transparently at checkout. There is no membership, no \"request a quote and wait three emails.\"\n\nWe're small on purpose. That means made-to-order craft rather than warehouse surplus, and direct human attention from our co-founders at hello@prynth.in. If something arrives off, we reprint it.",
    contact_email: "hello@prynth.in",
    contact_instagram: "@prynth07",
    contact_address: "",
    contact_phone: "",
    shipping_policy: "We ship across India. Pieces are packed in a small box with a bit of paper fill — enough to survive a courier, not a crate of foam.\n\nStandard Delivery: 3–5 days (₹79 flat rate across India, free over ₹399)\nPriority Air Express: 1–2 days (₹189, always charged separately)\n\nPrint time is separate. Ready-made orders typically spend 3–5 days on the printer and cooling bench before they go out. Fine-quality custom work can take a week. We email a tracking link when the courier has the packet.\n\nRemote PIN codes can add a day or two. If a route isn't serviceable we'll write before charging shipping. Cash on delivery is available for catalog items with a ₹39 collection fee.",
    returns_policy: "Ready-Made Catalog Pieces:\nIf a piece arrives broken, incomplete, or clearly not what you ordered, we'll reprint it or issue a prompt refund. Photograph the issue and email hello@prynth.in within 7 days of delivery with your order number. Change-of-mind returns are accepted on unused ready-made items in original packaging within 7 days (buyer covers return courier; product amount refunded).\n\nCustom Made-to-Order Prints & Lithophanes:\nBecause custom prints and lithophanes are manufactured uniquely to your submitted files and bespoke specifications, change-of-mind returns or cancellations are not supported once manufacturing begins on the print bed.\n\nOur Zero-Flaw Custom Guarantee:\nIf your custom print arrives damaged in transit, warped, delaminated, dimensionally out-of-spec (>0.5% deviation), or in the wrong polymer/colour, photograph the piece within 48 hours of delivery. We will either:\n1. Rush a 100% free priority reprint with expedited courier dispatch; OR\n2. Issue an immediate 100% full refund to your original payment method (settled in 5–7 business days).\n\nIf an issue is due to an inherent geometry flaw in your uploaded CAD file (such as sub-0.8mm non-manifold walls), we provide design guidance and a 50% courtesy discount on a corrected re-run.",
    product_categories: "Desk, Home, Bath",
    free_shipping_threshold: "399",
    standard_shipping_fee: "79",
    express_shipping_fee: "189",
    cod_fee: "39",
    promo_banner: "Free standard delivery across India on orders over ₹399",
    payment_online_enabled: "true",
    payment_cod_enabled: "true",
    payment_upi_enabled: "true",
    payment_upi_id: "",
    resend_from_email: "Prynth <orders@prynth.in>",
    razorpay_key_id: "",
    hero_featured_slots: JSON.stringify([
      { slug: "catch-bowl", image: "/products/catch-bowl.jpg" },
      { slug: "desk-tray", image: "/products/desk-tray.jpg" },
      { slug: "geo-planter", image: "/products/geo-planter.jpg" },
      { slug: "hex-coasters", image: "/products/hex-coasters.jpg" },
    ]),
    custom_pricing_upload_formula: DEFAULT_UPLOAD_FORMULA,
    custom_pricing_idea_formula: DEFAULT_IDEA_FORMULA,
    custom_pricing_setup_fee: String(DEFAULT_SETUP_FEE),
    custom_pricing_min_print: String(DEFAULT_MIN_PRINT),
    custom_pricing_materials: JSON.stringify(MATERIALS),
    custom_pricing_qualities: JSON.stringify(QUALITIES),
    custom_pricing_infills: JSON.stringify(INFILLS),
    custom_pricing_size_presets: JSON.stringify(SIZE_PRESETS),
    custom_pricing_complexities: JSON.stringify(COMPLEXITY),
    lithophane_price_medium: "399",
    lithophane_price_standard: "549",
    lithophane_price_large: "749",
    lithophane_lightbox_addon_medium: "249",
    lithophane_lightbox_addon_standard: "299",
    lithophane_lightbox_addon_large: "399",
    lithophane_gift_packaging_fee: "99",
    lithophane_bulk_discount_5: "5",
    lithophane_bulk_discount_10: "10",
    lithophane_bulk_discount_20: "15",
    brand_name: "prynth!",
    announcement_enabled: "true",
    about_headline: "Honest prices. Good prints. For people who just need the thing.",
    about_pillar1_title: "The price is the price",
    about_pillar1_desc: "No setup surprises, no colour upcharge on the listed palette, no 'from' pricing.",
    about_pillar2_title: "Everyday, not exclusive",
    about_pillar2_desc: "Built for people who want a stand or a hook, not a lecture on nozzles.",
    about_pillar3_title: "If it's wrong, we redo it",
    about_pillar3_desc: "Prints are checked. Returns are simple. See the returns page for the details.",
    contact_hours: "Monday – Saturday: 10:00 AM – 7:00 PM IST",
    contact_whatsapp: "",
    whatsapp_enabled: "false",
    social_twitter: "@prynth",
    social_youtube: "",
    pegboard_hero_title: "The Modular Pegboard System",
    pegboard_hero_subtitle: "Precision 3D printed modular wall and desk organization. Engineered for creators, tech setups, and intentional workspaces.",
    pegboard_badge: "Signature Star Product",
    pegboard_price_compact: "699",
    pegboard_price_studio: "999",
    pegboard_price_executive: "1499",
    pegboard_price_duo: "1799",
    pegboard_size_presets: JSON.stringify([
      {
        id: "compact",
        name: "Compact",
        dims: "20 × 20 cm Tile",
        desc: "Perfect for monitor risers & small headphone nooks",
        price: 699,
        popular: false,
      },
      {
        id: "studio",
        name: "Studio",
        dims: "30 × 30 cm Tile",
        desc: "Our flagship size. Ideal for full desk setups",
        price: 999,
        popular: true,
      },
      {
        id: "executive",
        name: "Executive",
        dims: "40 × 40 cm Tile",
        desc: "High-capacity grid for audio gear & tech tools",
        price: 1499,
        popular: false,
      },
      {
        id: "duo",
        name: "Dual Tile Duo",
        dims: "2x 30 × 30 cm Tiles",
        desc: "Includes 2 interlocking panels + alignment clips",
        price: 1799,
        popular: false,
      },
    ]),
    pegboard_addon_tech_price: "299",
    pegboard_addon_desk_price: "249",
    pegboard_addon_botanical_price: "279",
    pegboard_story: "Every square millimetre of the Modular Pegboard was engineered with intention. 3D-printed from high-impact matte filament, it pairs an architectural silhouette with an ultra-versatile 25mm beveled grid. Whether you choose removable adhesive strips, desk edge clamps, or wall anchors, it transforms chaotic tool piles into a calm, focused craft sanctum.",
    pegboard_images: JSON.stringify([
      "/products/modular-pegboard.jpg",
      "/products/pegboard-white.jpg",
      "/products/pegboard-detail.jpg"
    ]),
    shiprocket_email: "",
    shiprocket_password: "",
    shiprocket_pickup_location: "Primary",
    shiprocket_pickup_pincode: "400001",
    // Legal & Business Identity (R1, R2, R4)
    legal_entity_type: "Unregistered Firm (Operated by Co-Founders)",
    legal_name: "Prynth",
    legal_director_name: "Ray Kapadia & Supas Kumar (Co-Founders)",
    legal_registered_address: "Mumbai, Maharashtra, India",
    legal_customer_email: "support@prynth.in",
    legal_customer_phone: "",
    legal_customer_hours: "Monday–Saturday, 10:00 AM – 7:00 PM IST",
    grievance_officer_name: "Ray Kapadia",
    grievance_officer_designation: "Co-Founder & Grievance Redressal Officer",
    grievance_officer_email: "grievance@prynth.in",
    grievance_officer_phone: "",
    grievance_officer_address: "Mumbai, Maharashtra, India",
    legal_gstin: "",
    legal_country_of_origin: "Made in India",
    legal_jurisdiction_city: "Mumbai, Maharashtra, India",
    // Interim Selling Phase Defaults (Nov 2026)
    checkout_enabled: "false",
    cod_enabled: "false",
    max_orders_per_day: "3",
    max_orders_per_week: "10",
    profit_target_inr: "10000",
    custom_orders_enabled: "false",
    lithophane_enabled: "false",
    pegboard_checkout_enabled: "false",
    allowed_delivery_states: JSON.stringify(["Maharashtra"]),
    invoice_mode: "receipt",
    turnaround_min_days: "4",
    turnaround_max_days: "7",
    payment_fee_percent: "2.0",
    gst_on_fee_percent: "18.0",
    seller_display_name: "Prynth",
    seller_city: "Mumbai",
    seller_state: "Maharashtra",
    seller_address: "",
    seller_email: "hello@prynth.in",
    seller_whatsapp: "",
    shiprocket_pickup_address: "",
  };

  for (const row of rows) {
    // Security: NEVER expose private credentials (e.g. razorpay_key_secret, notification tokens) in public site settings
    if (
      row.key === "razorpay_key_secret" ||
      row.key.includes("secret") ||
      row.key.includes("token") ||
      row.key.includes("apikey")
    ) {
      continue;
    }
    if (row.key in settings) {
      settings[row.key as keyof SiteSettings] = row.value;
    }
  }
  delete (settings as any).razorpay_key_secret;

  // Auto-heal legacy buggy formula records if present in DB
  if (
    settings.custom_pricing_upload_formula?.includes("setup_fee)) * qty")
  ) {
    settings.custom_pricing_upload_formula = DEFAULT_UPLOAD_FORMULA;
  }
  if (
    settings.custom_pricing_idea_formula &&
    (!settings.custom_pricing_idea_formula.includes("modeling_fee") ||
      settings.custom_pricing_idea_formula.includes("setup_fee)) * qty"))
  ) {
    settings.custom_pricing_idea_formula = DEFAULT_IDEA_FORMULA;
  }

  return settings;
}

export async function fetchSiteSettings(sqlInstance?: any): Promise<SiteSettings> {
  const sql = sqlInstance || (await getSql());
  const rows = await sql<{ key: string; value: string }>`SELECT key, value FROM site_settings`;
  return parseSiteSettings(rows);
}

export const getSiteSettings = createServerFn({ method: "GET" }).handler(
  async (): Promise<SiteSettings> => {
    return fetchSiteSettings();
  }
);

/**
 * Admin-only: Fetch site settings with masked credentials indicator and Razorpay mode
 */
export const getAdminSiteSettings = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<SiteSettings & { has_razorpay_secret: boolean; razorpay_mode: "live" | "test" | "unconfigured"; is_live_key: boolean }> => {
    const sql = await getSql();
    const admin = await verifyAdminRole(context.userId, sql);
    if (!admin) throw new Error("Unauthorized");

    const rows = await sql<{ key: string; value: string }>`SELECT key, value FROM site_settings`;
    const settings = parseSiteSettings(rows);
    const secretRow = rows.find((r) => r.key === "razorpay_key_secret");
    const hasSecret = Boolean(secretRow?.value?.trim());

    const { getRazorpayCredentials } = await import("./razorpay.server");
    const creds = await getRazorpayCredentials();
    const razorpay_mode = creds.isLive ? "live" : creds.keyId ? "test" : "unconfigured";

    return {
      ...settings,
      has_razorpay_secret: hasSecret,
      razorpay_mode,
      is_live_key: creds.isLive,
      // Provide masked indicator so real secret is never sent to browser DOM
      razorpay_key_secret: hasSecret ? "••••••••••••••••" : "",
    };
  });

export const updateSiteSettings = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({
    tagline: z.string().min(1),
    email: z.string().email(),
    instagram: z.string().min(1),
    copyright: z.string().min(1),
    bottom_text: z.string().min(1),
    hero_tagline: z.string().min(1),
    hero_description: z.string().min(1),
    about_story: z.string().min(1),
    contact_email: z.string().email().or(z.literal("")),
    contact_instagram: z.string(),
    contact_address: z.string(),
    contact_phone: z.string(),
    shipping_policy: z.string().min(1),
    returns_policy: z.string().min(1),
    product_categories: z.string().min(1).optional(),
    free_shipping_threshold: z.string().optional(),
    standard_shipping_fee: z.string().optional(),
    express_shipping_fee: z.string().optional(),
    cod_fee: z.string().optional(),
    promo_banner: z.string().optional(),
    payment_online_enabled: z.string().optional(),
    payment_cod_enabled: z.string().optional(),
    payment_upi_enabled: z.string().optional(),
    payment_upi_id: z.string().optional(),
    resend_from_email: z.string().optional(),
    razorpay_key_id: z.string().optional(),
    razorpay_key_secret: z.string().optional(),
    hero_featured_slots: z.string().optional(),
    custom_pricing_upload_formula: z.string().optional(),
    custom_pricing_idea_formula: z.string().optional(),
    custom_pricing_setup_fee: z.string().optional(),
    custom_pricing_min_print: z.string().optional(),
    custom_pricing_materials: z.string().optional(),
    custom_pricing_qualities: z.string().optional(),
    custom_pricing_infills: z.string().optional(),
    custom_pricing_size_presets: z.string().optional(),
    custom_pricing_complexities: z.string().optional(),
    lithophane_price_medium: z.string().optional(),
    lithophane_price_standard: z.string().optional(),
    lithophane_price_large: z.string().optional(),
    lithophane_lightbox_addon_medium: z.string().optional(),
    lithophane_lightbox_addon_standard: z.string().optional(),
    lithophane_lightbox_addon_large: z.string().optional(),
    lithophane_gift_packaging_fee: z.string().optional(),
    lithophane_bulk_discount_5: z.string().optional(),
    lithophane_bulk_discount_10: z.string().optional(),
    lithophane_bulk_discount_20: z.string().optional(),
    brand_name: z.string().optional(),
    announcement_enabled: z.string().optional(),
    about_headline: z.string().optional(),
    about_pillar1_title: z.string().optional(),
    about_pillar1_desc: z.string().optional(),
    about_pillar2_title: z.string().optional(),
    about_pillar2_desc: z.string().optional(),
    about_pillar3_title: z.string().optional(),
    about_pillar3_desc: z.string().optional(),
    contact_hours: z.string().optional(),
    contact_whatsapp: z.string().optional(),
    whatsapp_enabled: z.string().optional(),
    social_twitter: z.string().optional(),
    social_youtube: z.string().optional(),
    pegboard_hero_title: z.string().optional(),
    pegboard_hero_subtitle: z.string().optional(),
    pegboard_badge: z.string().optional(),
    pegboard_price_compact: z.string().optional(),
    pegboard_price_studio: z.string().optional(),
    pegboard_price_executive: z.string().optional(),
    pegboard_price_duo: z.string().optional(),
    pegboard_size_presets: z.string().optional(),
    pegboard_addon_tech_price: z.string().optional(),
    pegboard_addon_desk_price: z.string().optional(),
    pegboard_addon_botanical_price: z.string().optional(),
    pegboard_story: z.string().optional(),
    pegboard_images: z.string().optional(),
    shiprocket_email: z.string().optional(),
    shiprocket_password: z.string().optional(),
    shiprocket_pickup_location: z.string().optional(),
    shiprocket_pickup_pincode: z.string().optional(),
    // Legal & Business Identity (R1)
    legal_entity_type: z.string().optional(),
    legal_name: z.string().optional(),
    legal_director_name: z.string().optional(),
    legal_registered_address: z.string().optional(),
    legal_customer_email: z.string().optional(),
    legal_customer_phone: z.string().optional(),
    legal_customer_hours: z.string().optional(),
    grievance_officer_name: z.string().optional(),
    grievance_officer_designation: z.string().optional(),
    grievance_officer_email: z.string().optional(),
    grievance_officer_phone: z.string().optional(),
    grievance_officer_address: z.string().optional(),
    legal_gstin: z.string().optional(),
    legal_country_of_origin: z.string().optional(),
    legal_jurisdiction_city: z.string().optional(),
    // Interim Selling Phase Settings (Nov 2026)
    checkout_enabled: z.string().optional(),
    cod_enabled: z.string().optional(),
    max_orders_per_day: z.string().optional(),
    max_orders_per_week: z.string().optional(),
    profit_target_inr: z.string().optional(),
    custom_orders_enabled: z.string().optional(),
    lithophane_enabled: z.string().optional(),
    pegboard_checkout_enabled: z.string().optional(),
    allowed_delivery_states: z.string().optional(),
    invoice_mode: z.string().optional(),
    turnaround_min_days: z.string().optional(),
    turnaround_max_days: z.string().optional(),
    payment_fee_percent: z.string().optional(),
    gst_on_fee_percent: z.string().optional(),
    seller_display_name: z.string().optional(),
    seller_city: z.string().optional(),
    seller_state: z.string().optional(),
    seller_address: z.string().optional(),
    seller_email: z.string().optional(),
    seller_whatsapp: z.string().optional(),
    shiprocket_pickup_address: z.string().optional(),
    confirm_phrase: z.string().optional(),
  }).partial())
  .handler(async ({ data, context }) => {
    if (!context.userId) throw new Error("Unauthorized");

    const sql = await getSql();
    // Admin check: verify if the current user is the admin
    const admin = await verifyAdminRole(context.userId, sql);
    if (!admin) {
      throw new Error("Unauthorized");
    }

    const currentSettings = await fetchSiteSettings(sql);

    // Enforce typed confirmation if enabling checkout with live Razorpay keys
    if (data.checkout_enabled === "true" && currentSettings.checkout_enabled !== "true") {
      const { getRazorpayCredentials } = await import("./razorpay.server");
      const creds = await getRazorpayCredentials();
      if (creds.isLive && data.confirm_phrase !== "OPEN CHECKOUT") {
        throw new Error("Live Gateway Gate: To enable customer checkout with live Razorpay keys, you must type 'OPEN CHECKOUT' to confirm.");
      }
    }

    // Write audit log if checkout_enabled flag is modified
    if (data.checkout_enabled !== undefined && data.checkout_enabled !== currentSettings.checkout_enabled) {
      const logId = "log_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 6);
      await sql`
        INSERT INTO admin_audit_logs (id, admin_email, action, details)
        VALUES (
          ${logId},
          ${admin.email || "admin"},
          'UPDATE_CHECKOUT_ENABLED',
          ${JSON.stringify({
            previous: currentSettings.checkout_enabled,
            new: data.checkout_enabled,
            timestamp: new Date().toISOString(),
          })}
        )
      `;
    }

    for (const [key, value] of Object.entries(data)) {
      if (key === "confirm_phrase") continue;
      if (value !== undefined) {
        // Prevent clearing or saving masked secret
        if (key === "razorpay_key_secret") {
          const secretStr = String(value).trim();
          if (!secretStr || secretStr.includes("•")) {
            continue;
          }
        }

        await sql`
          INSERT INTO site_settings (key, value)
          VALUES (${key}, ${value})
          ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
        `;
      }
    }

    return { success: true };
  });

/**
 * Launch Ledger and Raw-Profit Calculation (D1 & A4)
 * Formula: Raw Profit = Sum over settled orders of (Total Received - Refunds - Unit Costs - Packaging - Courier - Payment Fee) - Adjustments.
 * Unsettled orders are excluded from raw profit.
 */
export async function calculateSettledProfit(sqlInstance?: any) {
  const sql = sqlInstance || (await getSql());

  // 1. Fetch unit costs and packaging costs for all products
  const products = await sql<{ slug: string; unit_cost_inr: string | number; packaging_cost_inr: string | number }>`
    SELECT slug, unit_cost_inr, packaging_cost_inr FROM products
  `;
  const productCostMap = new Map<string, { unitCost: number; packagingCost: number }>();
  for (const p of products) {
    productCostMap.set(p.slug, {
      unitCost: Number(p.unit_cost_inr) || 0,
      packagingCost: Number(p.packaging_cost_inr) || 0,
    });
  }

  // 2. Fetch payment fee parameters from settings
  const settingsRows = await sql<{ key: string; value: string }>`
    SELECT key, value FROM site_settings WHERE key IN ('payment_fee_percent', 'gst_on_fee_percent')
  `;
  let feePct = 2.0;
  let gstPct = 18.0;
  for (const r of settingsRows) {
    if (r.key === "payment_fee_percent") feePct = Number(r.value) || 2.0;
    if (r.key === "gst_on_fee_percent") gstPct = Number(r.value) || 18.0;
  }
  const effectiveFeeMultiplier = (feePct / 100) * (1 + gstPct / 100);

  // 3. Fetch all orders
  const orders = await sql<any>`
    SELECT id, order_number, total, subtotal, shipping, extra, refund_amount, 
           courier_actual_cost, payment_fee_actual, settled, settled_date, 
           items, payment_status, created_at, utm_source, utm_campaign
    FROM orders
    ORDER BY created_at DESC
  `;

  // 4. Fetch manual adjustments
  const adjustments = await sql<{ id: string; order_id: string; reason: string; amount_inr: number; created_at: string; created_by: string }>`
    SELECT * FROM order_adjustments ORDER BY created_at DESC
  `;
  const totalAdjustments = adjustments.reduce((acc: number, a: any) => acc + (Number(a.amount_inr) || 0), 0);

  let settledProfit = 0;
  let settledOrdersCount = 0;
  let totalSettledRevenue = 0;
  let totalRefunds = 0;
  let totalUnitCosts = 0;
  let totalPackagingCosts = 0;
  let totalCourierCosts = 0;
  let totalPaymentFees = 0;

  const orderLedger = orders.map((ord: any) => {
    const isSettled = Boolean(ord.settled);
    const amountReceived = Number(ord.total) || 0;
    const refund = Number(ord.refund_amount) || 0;

    let itemsUnitCost = 0;
    let itemsPackagingCost = 0;
    const items = Array.isArray(ord.items) ? ord.items : [];
    for (const item of items) {
      const qty = Number(item.qty) || 1;
      const costs = item.productSlug ? productCostMap.get(item.productSlug) : null;
      itemsUnitCost += (costs?.unitCost || 0) * qty;
      itemsPackagingCost += (costs?.packagingCost || 0) * qty;
    }

    const courierCost = Number(ord.courier_actual_cost) || 0;
    const paymentFee = Number(ord.payment_fee_actual) > 0 
      ? Number(ord.payment_fee_actual) 
      : Math.round(amountReceived * effectiveFeeMultiplier * 100) / 100;

    const netProfit = amountReceived - refund - itemsUnitCost - itemsPackagingCost - courierCost - paymentFee;

    if (isSettled) {
      settledProfit += netProfit;
      settledOrdersCount += 1;
      totalSettledRevenue += amountReceived;
      totalRefunds += refund;
      totalUnitCosts += itemsUnitCost;
      totalPackagingCosts += itemsPackagingCost;
      totalCourierCosts += courierCost;
      totalPaymentFees += paymentFee;
    }

    return {
      id: ord.id,
      orderNumber: ord.order_number,
      createdAt: ord.created_at,
      paymentStatus: ord.payment_status,
      settled: isSettled,
      settledDate: ord.settled_date,
      amountReceived,
      refund,
      unitCost: itemsUnitCost,
      packagingCost: itemsPackagingCost,
      courierCost,
      paymentFee,
      netProfit: Math.round(netProfit * 100) / 100,
      utmSource: ord.utm_source,
      utmCampaign: ord.utm_campaign,
    };
  });

  const finalSettledProfit = Math.round((settledProfit - totalAdjustments) * 100) / 100;

  return {
    settledProfit: finalSettledProfit,
    settledOrdersCount,
    totalOrdersCount: orders.length,
    totalSettledRevenue: Math.round(totalSettledRevenue * 100) / 100,
    totalRefunds: Math.round(totalRefunds * 100) / 100,
    totalUnitCosts: Math.round(totalUnitCosts * 100) / 100,
    totalPackagingCosts: Math.round(totalPackagingCosts * 100) / 100,
    totalCourierCosts: Math.round(totalCourierCosts * 100) / 100,
    totalPaymentFees: Math.round(totalPaymentFees * 100) / 100,
    totalAdjustments: Math.round(totalAdjustments * 100) / 100,
    adjustments,
    orderLedger,
  };
}

/**
 * Public checkout status endpoint (A1, A2, A3, A4, C4)
 */
export const getCheckoutStatus = createServerFn({ method: "GET" }).handler(
  async (): Promise<{
    checkoutEnabled: boolean;
    reason?: "disabled" | "daily_cap_reached" | "weekly_cap_reached" | "profit_target_reached";
    isTestMode: boolean;
    allowedStates: string[];
    maxOrdersPerDay: number;
    maxOrdersPerWeek: number;
    ordersToday: number;
    ordersThisWeek: number;
    settledProfitInr: number;
    profitTargetInr: number;
    codEnabled: boolean;
    customOrdersEnabled: boolean;
    lithophaneEnabled: boolean;
    pegboardCheckoutEnabled: boolean;
    turnaroundMin: number;
    turnaroundMax: number;
  }> => {
    const sql = await getSql();
    const settings = await fetchSiteSettings(sql);

    const checkoutMasterSwitch = settings.checkout_enabled === "true";
    const maxPerDay = parseInt(settings.max_orders_per_day || "3", 10);
    const maxPerWeek = parseInt(settings.max_orders_per_week || "10", 10);
    const profitTarget = parseFloat(settings.profit_target_inr || "10000");

    // Count paid orders in rolling 24 hours
    const dayRows = await sql<{ count: string }>`
      SELECT COUNT(*)::text as count FROM orders 
      WHERE (payment_status = 'paid' OR payment_method = 'cod') 
        AND status != 'cancelled' 
        AND created_at >= (NOW() - INTERVAL '24 hours')
    `;
    const ordersToday = parseInt(dayRows[0]?.count || "0", 10);

    // Count paid orders in Monday-to-Sunday week in IST
    const weekRows = await sql<{ count: string }>`
      SELECT COUNT(*)::text as count FROM orders 
      WHERE (payment_status = 'paid' OR payment_method = 'cod') 
        AND status != 'cancelled' 
        AND (created_at AT TIME ZONE 'Asia/Kolkata') >= date_trunc('week', NOW() AT TIME ZONE 'Asia/Kolkata')
    `;
    const ordersThisWeek = parseInt(weekRows[0]?.count || "0", 10);

    // Calculate settled raw profit
    const profitData = await calculateSettledProfit(sql);
    const settledProfitInr = profitData.settledProfit;

    let checkoutEnabled = checkoutMasterSwitch;
    let reason: "disabled" | "daily_cap_reached" | "weekly_cap_reached" | "profit_target_reached" | undefined;

    // Check profit target threshold (A4)
    if (settledProfitInr >= profitTarget) {
      if (settings.checkout_enabled === "true") {
        // Auto-pause checkout
        await sql`UPDATE site_settings SET value = 'false' WHERE key = 'checkout_enabled'`;
        const logId = "log_" + Date.now().toString(36);
        await sql`
          INSERT INTO admin_audit_logs (id, admin_email, action, details)
          VALUES (
            ${logId},
            'system:profit_target',
            'AUTO_PAUSE_PROFIT_TARGET_REACHED',
            ${JSON.stringify({ settledProfit: settledProfitInr, profitTarget, timestamp: new Date().toISOString() })}
          )
        `;
      }
      checkoutEnabled = false;
      reason = "profit_target_reached";
    } else if (!checkoutMasterSwitch) {
      checkoutEnabled = false;
      reason = "disabled";
    } else if (ordersToday >= maxPerDay) {
      checkoutEnabled = false;
      reason = "daily_cap_reached";
    } else if (ordersThisWeek >= maxPerWeek) {
      checkoutEnabled = false;
      reason = "weekly_cap_reached";
    }

    const { getRazorpayCredentials } = await import("./razorpay.server");
    const creds = await getRazorpayCredentials();
    const isTestMode = !creds.isLive;

    let allowedStates = ["Maharashtra"];
    try {
      if (settings.allowed_delivery_states) {
        allowedStates = JSON.parse(settings.allowed_delivery_states);
      }
    } catch {
      allowedStates = ["Maharashtra"];
    }

    return {
      checkoutEnabled,
      reason,
      isTestMode,
      allowedStates,
      maxOrdersPerDay: maxPerDay,
      maxOrdersPerWeek: maxPerWeek,
      ordersToday,
      ordersThisWeek,
      settledProfitInr,
      profitTargetInr: profitTarget,
      codEnabled: settings.cod_enabled === "true",
      customOrdersEnabled: settings.custom_orders_enabled === "true",
      lithophaneEnabled: settings.lithophane_enabled === "true",
      pegboardCheckoutEnabled: settings.pegboard_checkout_enabled === "true",
      turnaroundMin: parseInt(settings.turnaround_min_days || "4", 10),
      turnaroundMax: parseInt(settings.turnaround_max_days || "7", 10),
    };
  }
);
