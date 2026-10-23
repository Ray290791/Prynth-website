import { createServerFn } from "@tanstack/react-start";
import { getSql } from "./db";
import { authMiddleware } from "./auth/middleware";
import { verifyAdminRole } from "./admin-fns";

export interface ServiceProcessStep {
  step: string;
  title: string;
  description: string;
}

export interface ServiceFAQ {
  question: string;
  answer: string;
}

export interface ServiceExample {
  title: string;
  description: string;
  specs?: string;
  badge?: string;
}

export interface ServiceRecord {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  short_desc: string;
  full_desc: string;
  icon: string;
  badge?: string;
  turnaround: string;
  starting_price: number;
  deliverables: string[];
  features: string[];
  process_steps: ServiceProcessStep[];
  faq: ServiceFAQ[];
  examples: ServiceExample[];
  is_active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export const DEFAULT_SERVICES: ServiceRecord[] = [
  {
    id: "3d-modelling",
    slug: "3d-modelling",
    title: "3D CAD Modelling & Design",
    tagline: "From Napkin Sketch to Production-Ready CAD",
    short_desc:
      "Transform rough concepts, 2D sketches, or broken physical parts into millimeter-accurate parametric 3D CAD models.",
    full_desc:
      "Whether you're developing an inventive hardware product or need a custom mechanical component, our engineering team creates high-precision parametric 3D CAD models engineered specifically for 3D printing and manufacturing. We optimize draft angles, wall thicknesses, and tolerances so your parts fit seamlessly on the first print.",
    icon: "DraftingCompass",
    badge: "Most Requested",
    turnaround: "2–4 days",
    starting_price: 399,
    deliverables: [
      "Production-ready STEP (.step / .stp) files",
      "High-poly watertight STL / 3MF print files",
      "Dimensioned 2D engineering drawings (PDF)",
      "Native parametric CAD source upon request",
    ],
    features: [
      "Design for Additive Manufacturing (DFAM) optimization",
      "Interference and clearance tolerance checking",
      "Custom thread geometries & snap-fit latch engineering",
      "Iterative revision loop with 3D web preview approvals",
    ],
    process_steps: [
      {
        step: "01",
        title: "Brief & Requirements",
        description: "Submit sketches, reference photos, or critical dimensions along with intended use cases.",
      },
      {
        step: "02",
        title: "3D Parametric CAD Modeling",
        description: "Our mechanical engineers build your model in industrial CAD software with structural ribs and fillets.",
      },
      {
        step: "03",
        title: "Digital Review & Revision",
        description: "Review interactive 3D renderings and verify dimensions before locking in the final design.",
      },
      {
        step: "04",
        title: "Test Print & Delivery",
        description: "We test-print the part on our Bambu Lab fleet to guarantee fit, then deliver source files or ship the physical piece.",
      },
    ],
    faq: [
      {
        question: "What if I only have a hand-drawn sketch on paper?",
        answer: "A clear photo of your paper sketch with a few key dimensions (length, width, hole spacing) is plenty to get started. We will draft the precise CAD geometry for you.",
      },
      {
        question: "Do I own the intellectual property (IP) and files?",
        answer: "Yes, 100%. All 3D models and deliverables created under custom requests belong entirely to you for commercial or personal use.",
      },
      {
        question: "Can you 3D print the model once it is designed?",
        answer: "Absolutely. We seamlessly bridge the design into our print fleet, using durable PLA, PETG, ABS, or ASA and shipping across India.",
      },
    ],
    examples: [
      {
        title: "Ergonomic Macro-Pad Enclosure",
        description: "Custom mechanical keyboard housing with hot-swap PCB standoffs and magnetic top plate.",
        specs: "PETG · 0.12mm layer height · Brass heat-set inserts",
        badge: "Electronics",
      },
      {
        title: "Heavy-Duty Action Camera Gimbal Clamp",
        description: "Lightweight aerodynamically curved bracket with vibration-dampening rubber grommet slots.",
        specs: "ASA · 100% infill · High UV resistance",
        badge: "Automotive / Action",
      },
    ],
    is_active: true,
    sort_order: 1,
  },
  {
    id: "electronics-enclosures",
    slug: "electronics-enclosures",
    title: "Electronics Enclosure Design",
    tagline: "Custom Housings for IoT, PCBs & Embedded Hardware",
    short_desc:
      "Engineered snap-fit enclosures, sensor pods, and DIN rail cases with exact port cutouts, screw bosses, and thermal venting.",
    full_desc:
      "Don't compromise with generic off-the-shelf plastic boxes. We design bespoke, professional enclosures tailored precisely to your PCB footprint, connector locations, OLED displays, battery compartments, and thermal ventilation requirements. Perfect for makers, startups, university research, and commercial IoT hardware.",
    icon: "Cpu",
    badge: "Hardware & IoT",
    turnaround: "3–5 days",
    starting_price: 499,
    deliverables: [
      "Snap-fit top & bottom enclosure STLs/3MFs",
      "STEP assembly file with PCB clearance check",
      "BOM with recommended hardware (screws, heat inserts)",
      "Optional fully printed & assembled prototype",
    ],
    features: [
      "M2 / M3 brass threaded heat-set insert bosses",
      "Zero-hardware cantilever snap-fit joints",
      "Precision cutouts for USB-C, HDMI, SMA antennas & switches",
      "Passive convection cooling slats & airflow channels",
      "Gasket channels for splash resistance (IP54 style)",
    ],
    process_steps: [
      {
        step: "01",
        title: "PCB Specs & Port Layout",
        description: "Share your KiCAD/Eagle DXF, 3D PCB export (STEP), or caliper measurements of board and ports.",
      },
      {
        step: "02",
        title: "Enclosure Architecture",
        description: "We engineer wall thickness, connector clearances, standoff heights, and assembly access.",
      },
      {
        step: "03",
        title: "Virtual Assembly Fit Test",
        description: "We mate the CAD enclosure against your PCB model to inspect connector alignment down to 0.1mm.",
      },
      {
        step: "04",
        title: "Precision Print & Validation",
        description: "Manufactured in impact-grade PETG or flame-resistant ABS, test-assembled, and dispatched.",
      },
    ],
    faq: [
      {
        question: "Can you design enclosures for standard boards like Raspberry Pi or Arduino?",
        answer: "Yes! We have standard verified models for Raspberry Pi 4/5, Pi Zero 2W, Arduino Uno/Nano, ESP32 DevKit, and can customize mounting flanges, fan ducts, or sensor cutouts.",
      },
      {
        question: "What material is best for electronics?",
        answer: "PETG is our go-to for indoor consumer electronics due to durability and neat finish. For automotive or hot power supplies, we print in high-temp ABS or ASA.",
      },
      {
        question: "Do you install brass heat-set inserts?",
        answer: "Yes, we can pre-install M2, M2.5, or M3 brass threaded inserts into the screw bosses before shipping your enclosure.",
      },
    ],
    examples: [
      {
        title: "ESP32 LoRa Air Quality Weather Station",
        description: "Weather-resistant outdoor housing with solar panel clamp, sensor louver, and O-ring seal groove.",
        specs: "UV-Proof ASA · White matte · M3 brass inserts",
        badge: "Smart Agriculture",
      },
      {
        title: "Desktop Audio DAC Aluminium-Look Case",
        description: "Sleek desktop enclosure with rear RCA/optical port plate and front volume encoder cutout.",
        specs: "Matte Charcoal PLA · Fine matte finish",
        badge: "Hi-Fi Audio",
      },
    ],
    is_active: true,
    sort_order: 2,
  },
  {
    id: "reverse-engineering",
    slug: "reverse-engineering",
    title: "Broken Part Replication & Reverse Engineering",
    tagline: "Don't Replace the Machine. Replicate the Part.",
    short_desc:
      "Duplicate broken, discontinued, or unobtainable plastic components with micrometer-precision measurement and structural reinforcement.",
    full_desc:
      "When a critical washing machine dial, refrigerator shelf clip, car dashboard vent, or drone landing gear snaps, manufacturers often force you to buy an entire expensive subassembly or declare the machine obsolete. We reconstruct the broken part from physical fragments, caliper measurements, or reference photos, frequently re-engineering weak injection-molded failure zones with solid infill and thicker stress radii.",
    icon: "Wrench",
    badge: "Cost Saver",
    turnaround: "2–4 days",
    starting_price: 349,
    deliverables: [
      "Precision-replicated replacement 3D model",
      "Enhanced structural design with reinforced stress points",
      "Ready-to-print STL/3MF file",
      "Express manufactured and couriered physical spare",
    ],
    features: [
      "Digital caliper and contour gauge measurement",
      "Reinforcement of factory failure-prone weak spots",
      "D-shaft, splined shaft, and press-fit keyway matching",
      "High-durability impact plastics (PETG/ABS/ASA)",
    ],
    process_steps: [
      {
        step: "01",
        title: "Snap Photos with Scale",
        description: "Take top, front, and side photos of the broken piece next to a ruler or coin.",
      },
      {
        step: "02",
        title: "Geometry Reconstruction",
        description: "We reconstruct the true un-broken geometry in CAD and reinforce areas that failed originally.",
      },
      {
        step: "03",
        title: "Fit Check & Tolerance Verification",
        description: "We verify mating dimensions with you before physical fabrication.",
      },
      {
        step: "04",
        title: "Production & Delivery",
        description: "Printed on high-speed Bambu Lab printers with structural wall counts and couriered to your door.",
      },
    ],
    faq: [
      {
        question: "Can you replicate a part that has snapped into pieces?",
        answer: "Yes! If you have the broken fragments, align them together and snap photos from multiple angles with a ruler for scale. We can extrapolate the missing sections.",
      },
      {
        question: "Will the 3D printed replacement part be strong enough?",
        answer: "Yes. Often our replacements are stronger than the original OEM plastic because we eliminate hollow hollows, add fillet radii, and print in heavy-duty PETG or ABS.",
      },
    ],
    examples: [
      {
        title: "Front-Load Washing Machine Rotary Dial",
        description: "Replaced a cracked D-shaft selector knob with a solid reinforced core and tactile knurled rim.",
        specs: "PETG · 100% infill · Exact shaft fit",
        badge: "Home Appliance",
      },
      {
        title: "Automotive Sun Visor Pivot Clip",
        description: "Replicated discontinued dashboard clip that snapped in the sun; reinforced with UV-proof ASA.",
        specs: "ASA · 85°C heat resistance · Black matte",
        badge: "Automotive",
      },
    ],
    is_active: true,
    sort_order: 3,
  },
  {
    id: "rapid-prototyping",
    slug: "rapid-prototyping",
    title: "Rapid Prototyping & Functional Testing",
    tagline: "Turn Iterations into Hours, Not Weeks",
    short_desc:
      "Rapid turnaround 3D printing and iterative design verification for engineers, startups, and hardware teams across India.",
    full_desc:
      "Accelerate your product development cycle without committing to prohibitive injection mold tooling fees. We provide rapid additive prototyping with dimensional validation, layer resolutions down to 0.08mm, and comprehensive polymer selection (PLA, PETG, ABS, ASA) to test form, ergonomics, and mechanical assembly function under real conditions.",
    icon: "Zap",
    badge: "Fast Turnaround",
    turnaround: "24–48 hours",
    starting_price: 299,
    deliverables: [
      "Physical high-detail prototypes shipped via express courier",
      "Dimensional inspection summary report",
      "DFM / Tooling preparation feedback",
    ],
    features: [
      "Multi-printer parallel production for rapid speed",
      "0.08mm ultra-fine layer height capability",
      "Functional snap-fit and thread testing",
      "Full material selection (rigid, impact, UV-stable)",
    ],
    process_steps: [
      {
        step: "01",
        title: "Instant File Submission",
        description: "Upload your STL, 3MF, or STEP file or submit an engineering draft.",
      },
      {
        step: "02",
        title: "Printability & Slicing Review",
        description: "Our fleet engineers verify wall thickness, overhang angles, and optimal orientation.",
      },
      {
        step: "03",
        title: "Same-Day Fabrication",
        description: "Printed on calibrated Bambu Lab units with active vibration compensation.",
      },
      {
        step: "04",
        title: "Quality Check & Express Dispatch",
        description: "Post-processed, quality inspected, and express air shipped across India.",
      },
    ],
    faq: [
      {
        question: "How fast can I receive a prototype?",
        answer: "Standard turnaround is 24 to 48 hours for fabrication, followed by express air shipping across major Indian metros (1-2 days).",
      },
      {
        question: "Can I test multiple revisions in one batch?",
        answer: "Yes, you can upload multiple variants (e.g. 0.2mm tolerance offsets) to test which clearance provides the ideal mechanical fit.",
      },
    ],
    examples: [
      {
        title: "Medical Diagnostic Handheld Wand Shell",
        description: "Three ergonomic grip revisions tested with clinicians before finalizing tooling.",
        specs: "Bio-safe PLA · White · 0.12mm layers",
        badge: "HealthTech",
      },
      {
        title: "Drone Propeller Quick-Release Shroud",
        description: "Aerodynamic duct prototyping with impact stress testing under high motor RPM.",
        specs: "Carbon-Reinforced PETG · High Rigidity",
        badge: "Robotics",
      },
    ],
    is_active: true,
    sort_order: 4,
  },
  {
    id: "batch-manufacturing",
    slug: "batch-manufacturing",
    title: "Small-Batch & On-Demand Production",
    tagline: "10 to 500+ Units with Zero Injection Tooling Fees",
    short_desc:
      "Scale your physical product line with low-volume 3D manufacturing, tiered volume discounts, and consistent part repeatability.",
    full_desc:
      "Traditional injection molding requires tens of thousands of rupees in upfront tooling dies and months of lead time. With our farm of automated Bambu Lab 3D printers, you can manufacture production batches of 10 to 500+ units on demand. Tweak designs between runs, avoid warehouse inventory waste, and enjoy tiered volume discounts.",
    icon: "Layers",
    badge: "Low MOQ",
    turnaround: "4–7 days",
    starting_price: 999,
    deliverables: [
      "Consistent batch production runs (10–500+ units)",
      "Uniform post-processing & deburring",
      "Bulk packaging & labeled SKU distribution",
      "B2B GST invoice with commercial warranty",
    ],
    features: [
      "Zero tooling / die mold capital expenditure",
      "Tiered quantity discounts (up to 35% off)",
      "Strict quality control with dimensional repeatability",
      "Custom branded debossed logos or serial numbering",
    ],
    process_steps: [
      {
        step: "01",
        title: "Sample Golden Master",
        description: "We manufacture and ship 1 golden sample unit for your final sign-off.",
      },
      {
        step: "02",
        title: "Fleet Print Farm Allocation",
        description: "Upon approval, your order is distributed across multiple synchronized printers.",
      },
      {
        step: "03",
        title: "100% Manual QC Inspection",
        description: "Every single unit is manually inspected for surface quality and dimensional accuracy.",
      },
      {
        step: "04",
        title: "Bulk Secure Packaging",
        description: "Carefully wrapped and delivered via registered surface or air logistics pan-India.",
      },
    ],
    faq: [
      {
        question: "What is the minimum order quantity (MOQ)?",
        answer: "Our batch manufacturing starts at just 10 units! There is no minimum lock-in of thousands of parts.",
      },
      {
        question: "Do you offer GST input tax credit for businesses?",
        answer: "Yes, enter your business GSTIN during checkout or quotation, and you will receive a tax invoice with full ITC eligibility.",
      },
    ],
    examples: [
      {
        title: "Boutique Cafe Branded Table QR Stands",
        description: "Batch of 60 sleek angled table stands with embedded NFC disc slots and embossed logo.",
        specs: "Matte Black PLA · 60 Units · 4 Day Turnaround",
        badge: "Hospitality",
      },
      {
        title: "Industrial Sensor DIN-Rail Mount Brackets",
        description: "Batch of 150 UL-rated flame-resistant electrical cabinet clips for automation vendor.",
        specs: "ABS Industrial Gray · 150 Units",
        badge: "Automation B2B",
      },
    ],
    is_active: true,
    sort_order: 5,
  },
];

function parseServiceRow(row: any): ServiceRecord {
  return {
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title),
    tagline: String(row.tagline || ""),
    short_desc: String(row.short_desc || ""),
    full_desc: String(row.full_desc || ""),
    icon: String(row.icon || "PenTool"),
    badge: String(row.badge || ""),
    turnaround: String(row.turnaround || "2–4 days"),
    starting_price: Number(row.starting_price || 0),
    deliverables: Array.isArray(row.deliverables)
      ? row.deliverables
      : typeof row.deliverables === "string"
      ? JSON.parse(row.deliverables)
      : [],
    features: Array.isArray(row.features)
      ? row.features
      : typeof row.features === "string"
      ? JSON.parse(row.features)
      : [],
    process_steps: Array.isArray(row.process_steps)
      ? row.process_steps
      : typeof row.process_steps === "string"
      ? JSON.parse(row.process_steps)
      : [],
    faq: Array.isArray(row.faq)
      ? row.faq
      : typeof row.faq === "string"
      ? JSON.parse(row.faq)
      : [],
    examples: Array.isArray(row.examples)
      ? row.examples
      : typeof row.examples === "string"
      ? JSON.parse(row.examples)
      : [],
    is_active: Boolean(row.is_active ?? true),
    sort_order: Number(row.sort_order || 0),
    created_at: row.created_at ? String(row.created_at) : undefined,
    updated_at: row.updated_at ? String(row.updated_at) : undefined,
  };
}

/**
 * Public: Get all active services.
 * Falls back to built-in presets if DB is empty or during first boot.
 */
export const getServicesPublic = createServerFn({ method: "GET" }).handler(
  async (): Promise<ServiceRecord[]> => {
    try {
      const sql = await getSql();

      const rows = await sql`
        SELECT * FROM services
        WHERE is_active = true
        ORDER BY sort_order ASC, title ASC
      `;
      if (rows && rows.length > 0) {
        return rows.map(parseServiceRow);
      }

      // If no active rows returned, check if table is completely unseeded (e.g. fresh DB)
      const countRows = await sql<{ count: string }>`SELECT count(*)::text as count FROM services`;
      const totalCount = parseInt(countRows?.[0]?.count || "0", 10);
      if (totalCount === 0) {
        try {
          for (const s of DEFAULT_SERVICES) {
            await sql`
              INSERT INTO services (
                id, slug, title, tagline, short_desc, full_desc, icon, badge, turnaround,
                starting_price, deliverables, features, process_steps, faq, examples, is_active, sort_order
              ) VALUES (
                ${s.id}, ${s.slug}, ${s.title}, ${s.tagline}, ${s.short_desc}, ${s.full_desc}, ${s.icon},
                ${s.badge || ""}, ${s.turnaround}, ${s.starting_price},
                ${JSON.stringify(s.deliverables)}::jsonb,
                ${JSON.stringify(s.features)}::jsonb,
                ${JSON.stringify(s.process_steps)}::jsonb,
                ${JSON.stringify(s.faq)}::jsonb,
                ${JSON.stringify(s.examples)}::jsonb,
                ${s.is_active}, ${s.sort_order}
              )
              ON CONFLICT (id) DO NOTHING
            `;
          }
          return DEFAULT_SERVICES;
        } catch (seedErr) {
          console.warn("[services-fns] Could not auto-seed services table:", seedErr);
        }
      }

      return [];
    } catch (err) {
      console.warn("[services-fns] Failed to fetch services from DB, falling back to defaults:", err);
      return DEFAULT_SERVICES;
    }
  }
);

/**
 * Public: Get a single service by slug.
 */
export const getServiceBySlug = createServerFn({ method: "GET" })
  .validator((slug: string) => slug.toLowerCase().trim())
  .handler(async ({ data: slug }): Promise<ServiceRecord | null> => {
    try {
      const sql = await getSql();
      const rows = await sql`
        SELECT * FROM services
        WHERE slug = ${slug} AND is_active = true
        LIMIT 1
      `;
      if (rows && rows.length > 0) {
        return parseServiceRow(rows[0]);
      }
    } catch (err) {
      console.warn(`[services-fns] DB lookup failed for service slug '${slug}', falling back:`, err);
    }

    const fallback = DEFAULT_SERVICES.find((s) => s.slug === slug);
    return fallback || null;
  });

/**
 * Admin: Get all services (active and inactive) for admin console.
 */
export const getAllServicesAdmin = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<ServiceRecord[]> => {
    const sql = await getSql();
    const admin = await verifyAdminRole(context.userId, sql);
    if (!admin) throw new Error("Unauthorized");

    try {
      const rows = await sql`
        SELECT * FROM services
        ORDER BY sort_order ASC, created_at ASC
      `;
      if (!rows || rows.length === 0) {
        // Auto-seed defaults into DB if table is completely empty
        for (const s of DEFAULT_SERVICES) {
          await sql`
            INSERT INTO services (
              id, slug, title, tagline, short_desc, full_desc, icon, badge, turnaround,
              starting_price, deliverables, features, process_steps, faq, examples, is_active, sort_order
            ) VALUES (
              ${s.id}, ${s.slug}, ${s.title}, ${s.tagline}, ${s.short_desc}, ${s.full_desc}, ${s.icon},
              ${s.badge || ""}, ${s.turnaround}, ${s.starting_price},
              ${JSON.stringify(s.deliverables)}::jsonb,
              ${JSON.stringify(s.features)}::jsonb,
              ${JSON.stringify(s.process_steps)}::jsonb,
              ${JSON.stringify(s.faq)}::jsonb,
              ${JSON.stringify(s.examples)}::jsonb,
              ${s.is_active}, ${s.sort_order}
            )
            ON CONFLICT (id) DO NOTHING
          `;
        }
        return DEFAULT_SERVICES;
      }
      return rows.map(parseServiceRow);
    } catch (err) {
      console.error("[services-fns] Admin get all services failed:", err);
      return DEFAULT_SERVICES;
    }
  });

/**
 * Admin: Create a new service.
 */
export const createServiceAdmin = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: Partial<ServiceRecord>) => {
    if (!data.title || !data.title.trim()) throw new Error("Service title is required.");
    const slug = (data.slug || data.title)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    if (!slug) throw new Error("Valid slug is required.");
    return {
      id: data.id || `srv-${slug}-${Date.now().toString(36)}`,
      slug,
      title: data.title.trim(),
      tagline: (data.tagline || "").trim(),
      short_desc: (data.short_desc || "").trim(),
      full_desc: (data.full_desc || "").trim(),
      icon: (data.icon || "PenTool").trim(),
      badge: (data.badge || "").trim(),
      turnaround: (data.turnaround || "2–4 days").trim(),
      starting_price: Number(data.starting_price || 0),
      deliverables: data.deliverables || [],
      features: data.features || [],
      process_steps: data.process_steps || [],
      faq: data.faq || [],
      examples: data.examples || [],
      is_active: data.is_active ?? true,
      sort_order: Number(data.sort_order || 0),
    };
  })
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    const admin = await verifyAdminRole(context.userId, sql);
    if (!admin) throw new Error("Unauthorized");

    await sql`
      INSERT INTO services (
        id, slug, title, tagline, short_desc, full_desc, icon, badge, turnaround,
        starting_price, deliverables, features, process_steps, faq, examples, is_active, sort_order, updated_at
      ) VALUES (
        ${data.id}, ${data.slug}, ${data.title}, ${data.tagline}, ${data.short_desc}, ${data.full_desc},
        ${data.icon}, ${data.badge}, ${data.turnaround}, ${data.starting_price},
        ${JSON.stringify(data.deliverables)}::jsonb,
        ${JSON.stringify(data.features)}::jsonb,
        ${JSON.stringify(data.process_steps)}::jsonb,
        ${JSON.stringify(data.faq)}::jsonb,
        ${JSON.stringify(data.examples)}::jsonb,
        ${data.is_active}, ${data.sort_order}, NOW()
      )
    `;

    return { success: true, service: data };
  });

/**
 * Admin: Update an existing service.
 */
export const updateServiceAdmin = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: Partial<ServiceRecord> & { id: string }) => {
    if (!data.id) throw new Error("Service ID is required.");
    return data;
  })
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    const admin = await verifyAdminRole(context.userId, sql);
    if (!admin) throw new Error("Unauthorized");

    await sql`
      UPDATE services SET
        title = COALESCE(${data.title}, title),
        slug = COALESCE(${data.slug}, slug),
        tagline = COALESCE(${data.tagline}, tagline),
        short_desc = COALESCE(${data.short_desc}, short_desc),
        full_desc = COALESCE(${data.full_desc}, full_desc),
        icon = COALESCE(${data.icon}, icon),
        badge = COALESCE(${data.badge}, badge),
        turnaround = COALESCE(${data.turnaround}, turnaround),
        starting_price = COALESCE(${data.starting_price}, starting_price),
        deliverables = ${JSON.stringify(data.deliverables || [])}::jsonb,
        features = ${JSON.stringify(data.features || [])}::jsonb,
        process_steps = ${JSON.stringify(data.process_steps || [])}::jsonb,
        faq = ${JSON.stringify(data.faq || [])}::jsonb,
        examples = ${JSON.stringify(data.examples || [])}::jsonb,
        is_active = COALESCE(${data.is_active}, is_active),
        sort_order = COALESCE(${data.sort_order}, sort_order),
        updated_at = NOW()
      WHERE id = ${data.id}
    `;

    return { success: true };
  });

/**
 * Admin: Delete a service.
 */
export const deleteServiceAdmin = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { id: string }) => data)
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    const admin = await verifyAdminRole(context.userId, sql);
    if (!admin) throw new Error("Unauthorized");

    await sql`
      DELETE FROM services WHERE id = ${data.id}
    `;

    return { success: true };
  });
