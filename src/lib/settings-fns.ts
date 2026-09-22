import { createServerFn } from "@tanstack/react-start";
import { getSql } from "./db";
import { authMiddleware } from "./auth/middleware";
import { verifyAdminRole } from "./admin-fns";
import { z } from "zod";

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
    };

    for (const row of rows) {
      if (row.key in settings) {
        settings[row.key as keyof SiteSettings] = row.value;
      }
    }

    return settings;
  }
);

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
  }))
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
        await sql`
          INSERT INTO site_settings (key, value)
          VALUES (${key}, ${value})
          ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
        `;
      }
    }

    return { success: true };
  });
