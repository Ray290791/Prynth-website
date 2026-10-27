export interface GuideSection {
  heading: string;
  content: string;
  subsections?: { title: string; text: string }[];
}

export interface GuideArticle {
  slug: string;
  title: string;
  shortTitle: string;
  metaDescription: string;
  category: string;
  readingTime: string;
  lastUpdated: string;
  author: string;
  directAnswer: string;
  sections: GuideSection[];
  keyTakeaways: string[];
  sources: { title: string; organization: string; url?: string }[];
  faqs: { question: string; answer: string }[];
}

export const GUIDES: GuideArticle[] = [
  {
    slug: "how-much-does-3d-printing-cost-in-india",
    title: "How Much Does 3D Printing Cost in India? (2026 Pricing Guide)",
    shortTitle: "3D Printing Cost in India",
    metaDescription:
      "Comprehensive 2026 pricing guide for 3D printing in India. Real costs per gram (₹6–₹14), setup fees, volume discounts, and studio minimums explained.",
    category: "Pricing & Economics",
    readingTime: "4 min read",
    lastUpdated: "27 October 2026",
    author: "Prynth Engineering Studio",
    directAnswer:
      "In India, professional FDM 3D printing typically costs ₹6 to ₹14 per gram of finished material, plus a modest setup fee of ₹49 to ₹99 per unique geometry. At Prynth, minimum print orders start at ₹149, standard desk accessories range between ₹199 and ₹699, and volume discounts reduce per-unit costs by up to 25% for batches of 25 units or more.",
    keyTakeaways: [
      "FDM 3D printing costs in India are primarily driven by part volume, infill density, and raw polymer type (PLA, PETG, ABS, ASA).",
      "Prynth charges ₹6–₹12/gram with a ₹49 setup fee and a ₹149 minimum order threshold.",
      "Volume batching yields progressive discounts: 10% off for 5–9 units, 18% off for 10–24 units, and 25% off for 25+ units.",
      "Free standard nationwide shipping applies automatically on all orders over ₹349.",
    ],
    sections: [
      {
        heading: "What Factors Determine 3D Printing Cost in India?",
        content:
          "Unlike traditional manufacturing where tooling dies cost hundreds of thousands of rupees upfront, 3D printing pricing is directly tied to part volume and machine runtime. The primary pricing components include material mass (measured in grams), machine runtime hours, print resolution (layer heights between 0.08mm and 0.24mm), and support structures required for overhangs exceeding 45 degrees.",
      },
      {
        heading: "Material Cost Breakdown: PLA vs PETG vs Engineering Polymers",
        content:
          "Standard PLA (Polylactic Acid) is the most economical polymer at ₹6–₹8 per gram, suitable for desk organizers, decorative items, and indoor prototypes. Tough PETG costs ₹8–₹10 per gram, offering superior impact resistance, chemical stability, and thermal deflection up to 75°C. High-performance ABS and ASA run ₹10–₹14 per gram due to enclosed heated chamber requirements and active carbon air filtration.",
      },
      {
        heading: "How Can You Reduce Your 3D Print Cost?",
        content:
          "To minimize cost without sacrificing structural integrity, design parts with hollow geometry or reduce infill density from 100% to 15%–20% using gyroid infill patterns. Orient flat faces directly on the print bed to eliminate disposable support material, and consolidate multiple functional components into single interlocking prints.",
      },
      {
        heading: "Typical Turnaround Times and Pan-India Shipping",
        content:
          "Standard custom print orders in Mumbai are manufactured within 2 to 4 business days. Ground courier shipping across Tier 1 and Tier 2 cities in India takes 3 to 5 business days (standard delivery is ₹79 or free over ₹349), while priority Air Express reaches most metro cities within 24 to 48 hours for a flat ₹189 fee.",
      },
    ],
    sources: [
      {
        title: "Standard Terminology for Additive Manufacturing Technologies",
        organization: "ISO / ASTM 52900",
      },
      {
        title: "Fused Deposition Modeling Cost Benchmarks & Economics",
        organization: "All3DP Professional Additive Manufacturing Report",
      },
      {
        title: "Prynth Live Studio Pricing Matrix & Admin Settings",
        organization: "Prynth Engineering Studio, Mumbai",
      },
    ],
    faqs: [
      {
        question: "Is there a minimum order value for custom 3D printing at Prynth?",
        answer:
          "Yes. Our minimum order threshold is ₹149. This covers initial file inspection, bed slicing preparation, and machine calibration.",
      },
      {
        question: "Do you offer COD on custom 3D prints?",
        answer:
          "No. Because custom prints are made to order and non-returnable per our statutory terms, payment via UPI, debit/credit card, or net banking is required before production begins.",
      },
      {
        question: "How are volume discounts applied?",
        answer:
          "Volume discounts apply automatically at checkout: 10% off for 5–9 units, 18% off for 10–24 units, and 25% off for 25+ units of the same model.",
      },
    ],
  },
  {
    slug: "pla-vs-petg-vs-abs-vs-asa",
    title: "PLA vs PETG vs ABS vs ASA: 3D Printing Filament Comparison",
    shortTitle: "PLA vs PETG vs ABS vs ASA",
    metaDescription:
      "Technical comparison of PLA, PETG, ABS, and ASA filaments. Heat resistance, UV durability, tensile strength, and engineering selection guide by Prynth.",
    category: "Materials & Engineering",
    readingTime: "5 min read",
    lastUpdated: "27 October 2026",
    author: "Prynth Engineering Studio",
    directAnswer:
      "Choose PLA for crisp indoor aesthetics and desk accessories (deflects at 55°C). Choose PETG for tough everyday functional parts with water and chemical resistance (deflects at 75°C). Choose ABS for high-heat mechanical enclosures (deflects at 95°C). Choose ASA for outdoor fixtures requiring total UV weather-resistance without yellowing or degradation.",
    keyTakeaways: [
      "PLA delivers unmatched surface finish and dimensional precision for indoor accessories but softens in hot cars or direct Indian summer sun.",
      "PETG combines the ease of printing with high impact toughness and water resistance, making it our default recommendation for functional parts.",
      "ABS provides superior heat tolerance (up to 95°C) and can be acetone vapor smoothed for glossy, layerless injection-molded finishes.",
      "ASA possesses built-in UV stabilizers, preventing mechanical embrittlement and discoloration when exposed to outdoor tropical weather.",
    ],
    sections: [
      {
        heading: "Heat Deflection Temperature (HDT) Compared",
        content:
          "Heat resistance is the single most critical differentiator in the Indian climate. In an unventilated vehicle or near heat-generating power supplies, ambient temperatures routinely exceed 60°C. Standard PLA softens at approximately 52°C–55°C, resulting in structural creep. PETG safely withstands up to 75°C, while ABS and ASA maintain dimensional rigidity up to 95°C and 98°C respectively.",
      },
      {
        heading: "Mechanical Strength, Flexibility, and Layer Adhesion",
        content:
          "While PLA exhibits high tensile strength and rigidity, it is brittle under sudden shock. PETG offers superior impact resistance with slight ductile flex, preventing catastrophic snap failures. ABS features high impact absorption and ductility, making it ideal for snap-fit joints and interlocking automotive clips. ASA matches ABS mechanically while offering superior outdoor surface resilience.",
      },
      {
        heading: "UV Weathering and Outdoor Resistance",
        content:
          "When exposed to direct sunlight and ultraviolet radiation, ABS degrades over time, becoming brittle and discolored. ASA replaces the polybutadiene rubber in ABS with an acrylic ester elastomer, rendering it almost completely immune to UV degradation, ozone, and acid rain. For drone hulls, outdoor sensor housings, or marine mounts, ASA is mandatory.",
      },
    ],
    sources: [
      {
        title: "Standard Test Method for Deflection Temperature of Plastics Under Flexural Load",
        organization: "ASTM D648",
      },
      {
        title: "Polymer Weathering and Accelerated Photodegradation Testing",
        organization: "Polymer Testing Journal",
      },
    ],
    faqs: [
      {
        question: "Which material should I choose for an automotive dashboard mount?",
        answer:
          "Always choose ABS or ASA. Dashboard temperatures in parked cars in India frequently exceed 65°C, causing PLA to warp and soften completely.",
      },
      {
        question: "Is PETG food safe?",
        answer:
          "Raw PETG polymer is chemically inert, but 3D printed microscopic layer lines can trap bacteria. For food-contact items, specialized food-grade resin coatings are required.",
      },
    ],
  },
  {
    slug: "how-to-prepare-an-stl-for-printing",
    title: "How to Prepare an STL File for 3D Printing (Step-by-Step Checklist)",
    shortTitle: "Prepare STL for 3D Printing",
    metaDescription:
      "Step-by-step checklist to prepare watertight STL and 3MF files for FDM 3D printing. Fix non-manifold edges, wall thickness, and print tolerances.",
    category: "Design for Manufacturing",
    readingTime: "4 min read",
    lastUpdated: "27 October 2026",
    author: "Prynth Engineering Studio",
    directAnswer:
      "To prepare an STL for 3D printing, ensure your 3D mesh is 100% watertight (manifold) with zero inverted normals, maintain a minimum wall thickness of 1.2mm (at least 3 perimeter walls), design interlocking clearances between 0.2mm and 0.4mm, and export in binary STL or 3MF format with facet deviation under 0.02mm.",
    keyTakeaways: [
      "A watertight (manifold) mesh is mandatory: every edge must connect exactly two faces with zero holes or zero-thickness geometry.",
      "Maintain a minimum wall thickness of 1.2mm to allow 3 solid perimeter passes with a standard 0.4mm nozzle.",
      "Clearances for sliding or interlocking snap-fits should be 0.25mm for tight friction fits and 0.40mm for loose moving joints.",
      "Chamfer 45-degree angles on bottom edges to counteract bed elephant's foot and eliminate the need for support material.",
    ],
    sections: [
      {
        heading: "1. Ensure Watertight (Manifold) Geometry",
        content:
          "In 3D CAD modeling, a solid must represent an unambiguous volume with a distinct inside and outside. Non-manifold errors—such as internal floating faces, duplicate vertices, or open boundary edges—cause slicers to miscalculate solid fills. Use tools like Blender's 3D Print Toolbox or Fusion 360's Mesh Repair to audit and eliminate non-manifold geometry before exporting.",
      },
      {
        heading: "2. Wall Thickness and Rib Reinforcement",
        content:
          "While a 3D model can visually display razor-thin paper sheets, physical FDM extruders use molten plastic beads typically 0.4mm wide. Unsupported walls should be at least 1.6mm thick for everyday durability. For taller thin components, add triangular gusset ribs or gentle filleted corners to distribute mechanical shear stress.",
      },
      {
        heading: "3. Calibrating Interlocking Fit Tolerances",
        content:
          "Thermal expansion and layer bonding cause plastic to expand slightly outward during printing. When designing modular lids, hinges, or pegboard accessories: use 0.15mm clearance for press-fits, 0.25mm for smooth sliding tracks, and 0.40mm for freely pivoting hinges.",
      },
      {
        heading: "4. The 45-Degree Rule for Overhangs",
        content:
          "FDM printers deposit hot polymer on top of preceding layers. Overhangs shallower than 45 degrees relative to the vertical axis require temporary support material that increases cost and leaves cosmetic blemishes. Designing self-supporting 45-degree chamfers reduces material waste and speeds up production turnaround.",
      },
    ],
    sources: [
      {
        title: "Design for Additive Manufacturing Guidelines",
        organization: "Bambu Lab Engineering Documentation",
      },
      {
        title: "Geometric Dimensioning and Tolerancing for Additive Manufacturing",
        organization: "ASME Y14.46",
      },
    ],
    faqs: [
      {
        question: "Should I export as STL or 3MF?",
        answer:
          "We recommend 3MF. 3MF files are compact, preserve mesh unit dimensions (mm vs inches), retain color and orientation metadata, and eliminate facet repair errors inherent in older ASCII STL files.",
      },
      {
        question: "Can Prynth fix my broken STL file?",
        answer:
          "Yes. Our automated upload engine automatically repairs minor mesh gaps. For severely corrupted or hollow models, our 3D CAD design service can rebuild or repair your model starting at ₹399.",
      },
    ],
  },
  {
    slug: "custom-3d-printing-in-mumbai",
    title: "Custom 3D Printing Service in Mumbai: Turnaround, Materials & Delivery",
    shortTitle: "3D Printing in Mumbai",
    metaDescription:
      "Reliable on-demand custom 3D printing in Mumbai. High-speed Bambu CoreXY fleet, instant automated quotes, local pickup & express same-day courier dispatch.",
    category: "Local Manufacturing",
    readingTime: "3 min read",
    lastUpdated: "27 October 2026",
    author: "Prynth Engineering Studio",
    directAnswer:
      "Prynth operates an automated Bambu CoreXY print farm based in Mumbai, delivering precision custom 3D prints across the Mumbai Metropolitan Region (MMR) and pan-India. With instant automated quoting, transparent pricing from ₹149, and typical production in 2 to 4 days, we support fast local courier dispatch across Mumbai, Thane, and Navi Mumbai.",
    keyTakeaways: [
      "Local Mumbai manufacturing farm equipped with enclosed Bambu Lab CoreXY printers capable of 0.12mm high-resolution layer heights.",
      "Instant automated quoting on your 3D CAD models (STL, OBJ, 3MF, STEP) directly on prynth.in without waiting for email estimates.",
      "Local intra-city dispatch via express courier reaches Mumbai, Thane, and Navi Mumbai addresses within 24–48 hours of print completion.",
      "Zero tooling costs, transparent server-side pricing with all taxes included, and free standard delivery on orders over ₹349.",
    ],
    sections: [
      {
        heading: "Why Choose a Local Mumbai 3D Printing Studio?",
        content:
          "Whether you are prototyping consumer electronics in Powai, fabricating architectural models in Bandra, or producing custom replacement gears in Andheri, working with a local Mumbai studio drastically cuts transit delays and transit damage risks. Intra-city delivery avoids inter-state logistics delays and weather-related flight holds.",
      },
      {
        heading: "From Rapid Prototyping to Low-Volume Production Batches",
        content:
          "Our automated Bambu CoreXY fleet runs around the clock with vibration compensation and active filament monitoring. We cater to single custom one-offs (minimum ₹149) as well as pilot production runs of 10 to 500 units with progressive volume discounts up to 25%.",
      },
      {
        heading: "How to Order Custom 3D Prints in Mumbai",
        content:
          "Ordering is entirely self-serve: simply upload your 3D file on prynth.in/custom, view real-time 3D dimensions and bed limits, pick your material and color, and receive an instant price quote. Once placed, your part enters our queue immediately with automated production tracking.",
      },
    ],
    sources: [
      {
        title: "Micro, Small and Medium Enterprises Manufacturing Ecosystem in Maharashtra",
        organization: "Government of Maharashtra Industry Department",
      },
      {
        title: "Prynth Fleet Specifications & Lead Times",
        organization: "Prynth Engineering Studio, Mumbai",
      },
    ],
    faqs: [
      {
        question: "Can I collect my print in person in Mumbai?",
        answer:
          "Orders are dispatched via door-to-door courier across Mumbai, Thane, and Navi Mumbai to ensure fast, trackable transit. Contact support for emergency production collections.",
      },
      {
        question: "What is the typical shipping time within Mumbai?",
        answer:
          "Once printing is complete, local courier delivery within Mumbai usually arrives in 24 hours.",
      },
    ],
  },
];
