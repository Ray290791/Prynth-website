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
  social_twitter?: string;
  social_youtube?: string;
};

export const getSiteSettings = createServerFn({ method: "GET" }).handler(
  async (): Promise<SiteSettings> => {
    const sql = await getSql();
    const rows = await sql<{ key: string; value: string }>`SELECT key, value FROM site_settings`;

    // Default fallback values if DB is empty somehow
    const settings: SiteSettings = {
      tagline: "Quality prints at honest prices. No catches — just good work, done right.",
      email: "hello@prynth.in",
      instagram: "@prynth",
      copyright: "Ships across India",
      bottom_text: "Prices include packaging. Made to order.",
      hero_tagline: "Quality prints at honest prices. No catches — just good work, done right.",
      hero_description: "Everyday objects, printed well. Pick something from the shop, send a file, or describe what you need. We handle the rest.",
      about_story: "prynth! started from a simple annoyance: 3D printing quotes that hid fees, talked over people, or assumed you already owned a printer. We wanted a shop you could use the same way you buy a lamp or a mug — see the price, pick a colour, wait a few days.\n\nWe print ready-made pieces for desks, shelves, and sinks. We also print your files, and we'll model something from a description if you don't have one. The custom page uses the technical words (layer height, infill, PETG) because that's where they help. The rest of the site doesn't.\n\nQuality without theatre. We look at every print. If a layer shifted or a surface came out wrong, it doesn't ship. Prices include packaging. Shipping is listed at checkout. There is no membership, no \"request a quote and wait three emails.\"\n\nWe're small on purpose. That means made-to-order rather than a warehouse, and a human at hello@prynth.in. If something arrives off, we reprint it.",
      contact_email: "hello@prynth.in",
      contact_instagram: "@prynth",
      contact_address: "",
      contact_phone: "",
      shipping_policy: "We ship across India. Pieces are packed in a small box with a bit of paper fill — enough to survive a courier, not a crate of foam.\n\nStandard: 3–5 days (₹49, free over ₹799)\nExpress: 1–2 days (₹129)\n\nPrint time is separate. Ready-made orders typically spend 3–5 days on the printer and cooling bench before they go out. Fine-quality custom work can take a week. We email a tracking link when the courier has the packet.\n\nRemote PIN codes can add a day or two. If a route isn't serviceable we'll write before charging shipping. Cash on delivery is available with a ₹40 collection fee.",
      returns_policy: "If a piece arrives broken, incomplete, or clearly not what you ordered, we'll reprint it. Photograph the issue and email us within 7 days of delivery, with your order number.\n\nChange-of-mind returns are possible on unused ready-made pieces in the original packing, also within 7 days. You cover return shipping; we refund the product amount, not the outbound courier fee.\n\nWe don't take back:\n- Custom prints made from your file, if they match the quote you approved.\n- Modeled-from-scratch work after you've signed off the design.\n- Used bath pieces (soap dishes) or anything that's been washed or soiled.\n\nThat's the whole policy. No restocking riddle. If we're at fault, we make it right.",
      product_categories: "Desk, Home, Bath",
      free_shipping_threshold: "799",
      standard_shipping_fee: "49",
      express_shipping_fee: "129",
      cod_fee: "40",
      promo_banner: "Free delivery across India on orders over ₹799",
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
      contact_whatsapp: "+91 98765 43210",
      social_twitter: "@prynth",
      social_youtube: "",
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
);

/**
 * Admin-only: Fetch site settings with masked credentials indicator
 */
export const getAdminSiteSettings = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<SiteSettings & { has_razorpay_secret: boolean }> => {
    const sql = await getSql();
    const admin = await verifyAdminRole(context.userId, sql);
    if (!admin) throw new Error("Unauthorized");

    const settings = await getSiteSettings();
    const rows = await sql<{ key: string; value: string }>`
      SELECT value FROM site_settings WHERE key = 'razorpay_key_secret' LIMIT 1
    `;
    const hasSecret = rows.length > 0 && Boolean(rows[0].value?.trim());

    return {
      ...settings,
      has_razorpay_secret: hasSecret,
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
    social_twitter: z.string().optional(),
    social_youtube: z.string().optional(),
  }).partial())
  .handler(async ({ data, context }) => {
    if (!context.userId) throw new Error("Unauthorized");

    const sql = await getSql();
    // Admin check: verify if the current user is the admin
    const admin = await verifyAdminRole(context.userId, sql);
    if (!admin) {
      throw new Error("Unauthorized");
    }

    for (const [key, value] of Object.entries(data)) {
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
