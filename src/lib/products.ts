export type ProductColor = {
  id: string;
  name: string;
  hex: string;
};

export const COLORS: Record<string, ProductColor> = {
  charcoal: { id: "charcoal", name: "Charcoal", hex: "#2A2E32" },
  teal: { id: "teal", name: "Teal", hex: "#00B8A9" },
  bone: { id: "bone", name: "Bone", hex: "#EFEBE3" },
  stone: { id: "stone", name: "Stone", hex: "#9AA0A6" },
};

export type Category = string;

export type ProductVariant = {
  id: number;
  productSlug: string;
  size: string | null;
  color: string | null;
  price: number;
  stockCount: number;
};

export type Product = {
  slug: string;
  name: string;
  price: number;
  image: string;
  category: Category;
  blurb: string;
  description: string;
  colors: string[];
  size: string;
  material: string;
  printTime: string;
  featured?: boolean;
  badge?: "Favourite" | "New";
  includes: string;
  care: string;
  inStock?: boolean;
  stockCount?: number;
  sizes?: string[];
  variants?: ProductVariant[];
};

// CATEGORIES is now dynamic and fetched from SiteSettings

export const products: Product[] = [
  {
    slug: "wave-stand",
    name: "Wave Stand",
    price: 249,
    image: "/products/wave-stand.jpg",
    category: "desk",
    blurb: "A curved phone stand that keeps your screen at a comfortable angle.",
    description:
      "The Wave Stand holds a phone in landscape or portrait without clamps or magnets. The curve is wide enough for most cases, and the base stays put on a desk. Printed in a matte finish that hides fingerprints.",
    colors: ["charcoal", "teal", "bone"],
    size: "10 × 8 × 9 cm",
    sizes: ["Standard", "Plus", "Max"],
    material: "PLA",
    printTime: "Printed to order · ships in 3–5 days",
    featured: true,
    badge: "Favourite",
    includes: "One stand. Phone not included.",
    care: "Wipe with a dry cloth. Keep away from hot car dashboards.",
  },
  {
    slug: "cable-nest",
    name: "Cable Nest",
    price: 199,
    image: "/products/cable-nest.jpg",
    category: "desk",
    blurb: "A small bowl with slots so charging cables stay where you left them.",
    description:
      "Drop your cables into the nest and clip each cord into a rim slot. No more fishing behind the desk. Works for phone chargers, watch cables, and earbuds.",
    colors: ["teal", "charcoal", "bone"],
    size: "12 cm diameter × 4 cm",
    material: "PLA",
    printTime: "Printed to order · ships in 3–5 days",
    includes: "One nest.",
    care: "Wipe clean. Not for liquids.",
  },
  {
    slug: "geo-planter",
    name: "Geo Planter",
    price: 349,
    image: "/products/geo-planter.jpg",
    category: "home",
    blurb: "A faceted pot for a small succulent or air plant.",
    description:
      "A compact geometric planter for a windowsill or desk. The facets catch the light without looking fussy. Drainage hole in the base — sit it on a saucer if you water in place. Plant not included; we just liked how it looked.",
    colors: ["bone", "charcoal", "teal"],
    size: "9 × 9 × 9 cm",
    material: "PLA",
    printTime: "Printed to order · ships in 3–5 days",
    featured: true,
    badge: "Favourite",
    includes: "One planter. Plant and soil not included.",
    care: "Water plants in a sink and let drain. Not dishwasher safe.",
  },
  {
    slug: "desk-tray",
    name: "Desk Tray",
    price: 399,
    image: "/products/desk-tray.jpg",
    category: "desk",
    blurb: "Two compartments for keys, cards, and the day's loose bits.",
    description:
      "A low tray that keeps a desk from collecting piles. One side for keys and coins, the other for a watch or earbuds. Rounded corners so it doesn't snag.",
    colors: ["charcoal", "bone", "stone"],
    size: "22 × 12 × 3 cm",
    material: "PLA",
    printTime: "Printed to order · ships in 3–5 days",
    includes: "One tray.",
    care: "Wipe with a damp cloth. Dry after.",
  },
  {
    slug: "pebble-hooks",
    name: "Pebble Hooks",
    price: 279,
    image: "/products/pebble-hooks.jpg",
    category: "home",
    blurb: "A set of three wall hooks with a soft, stone-like shape.",
    description:
      "Three hooks for jackets, bags, or kitchen towels. Each one has a mounting hole — use a wall plug and screw (not included). The shape is kind to fabric and easy to live with.",
    colors: ["teal", "charcoal", "bone"],
    size: "Each hook ~8 × 5 × 4 cm",
    material: "PETG",
    printTime: "Printed to order · ships in 3–5 days",
    includes: "Set of three hooks. Screws not included.",
    care: "Indoor use. Wipe clean.",
  },
  {
    slug: "hex-coasters",
    name: "Hex Coasters",
    price: 329,
    image: "/products/hex-coasters.jpg",
    category: "home",
    blurb: "A set of four hexagonal coasters, two charcoal and two teal.",
    description:
      "Four coasters that stack neatly and don't stick to the glass. The set ships as two charcoal and two teal so a table doesn't look uniform. A raised rim catches small drips.",
    colors: ["teal", "charcoal"],
    size: "10 cm across × 0.8 cm · set of 4",
    material: "PLA",
    printTime: "Printed to order · ships in 3–5 days",
    featured: true,
    badge: "Favourite",
    includes: "Set of four coasters (two teal, two charcoal).",
    care: "Wipe dry after use. Not a cutting board, not dishwasher safe.",
  },
  {
    slug: "headphone-rest",
    name: "Headphone Rest",
    price: 449,
    image: "/products/headphone-rest.jpg",
    category: "desk",
    blurb: "An arched stand that holds a headset without flattening the cups.",
    description:
      "A single piece stand with a wide base. Hang the headband over the arch so the ear cups hang freely. Sized for most over-ear headphones, including thicker padded ones.",
    colors: ["charcoal", "teal", "bone"],
    size: "16 × 12 × 24 cm",
    material: "PLA",
    printTime: "Printed to order · ships in 4–6 days",
    featured: true,
    includes: "One stand. Headphones not included.",
    care: "Dust with a dry cloth. Keep out of direct sun.",
  },
  {
    slug: "catch-bowl",
    name: "Catch Bowl",
    price: 229,
    image: "/products/catch-bowl.jpg",
    category: "home",
    blurb: "An organic little bowl for keys, rings, or pocket change.",
    description:
      "A pebble-shaped bowl that sits by the door or on a nightstand. The irregular rim is the point — it looks handmade because it is, just with a printer instead of a wheel.",
    colors: ["charcoal", "teal", "bone"],
    size: "14 × 12 × 5 cm",
    sizes: ["Small", "Medium", "Large"],
    material: "PLA",
    printTime: "Printed to order · ships in 3–5 days",
    includes: "One bowl.",
    care: "Wipe clean. Not food-safe for hot or oily foods.",
  },
  {
    slug: "ripple-soap",
    name: "Ripple Soap Dish",
    price: 179,
    image: "/products/ripple-soap.jpg",
    category: "bath",
    blurb: "A ridged dish that lets a bar dry instead of sitting in a puddle.",
    description:
      "Raised ripples keep soap off the standing water. Small feet lift it off the sink. Printed in a dense, easy-to-wipe finish. A daily object that shouldn't cost a lot — and doesn't.",
    colors: ["bone", "charcoal", "teal"],
    size: "12 × 8 × 2 cm",
    material: "PETG",
    printTime: "Printed to order · ships in 3–5 days",
    badge: "New",
    includes: "One soap dish.",
    care: "Rinse and dry. PETG holds up to bathroom moisture.",
  },
  {
    slug: "pen-well",
    name: "Pen Well",
    price: 199,
    image: "/products/pen-well.jpg",
    category: "desk",
    blurb: "A simple cup for pens, scissors, and the one ruler you actually use.",
    description:
      "A flared cup that doesn't tip when you grab a pen. Wide enough for markers, not so wide that everything slumps. A quiet desk object in a colour you'll actually like looking at.",
    colors: ["teal", "charcoal", "bone"],
    size: "8 cm diameter × 11 cm",
    material: "PLA",
    printTime: "Printed to order · ships in 3–5 days",
    badge: "New",
    includes: "One cup.",
    care: "Wipe clean.",
  },
];

export function getProduct(slug: string) {
  return products.find((p) => p.slug === slug);
}

export function relatedProducts(slug: string, limit = 4) {
  const current = getProduct(slug);
  if (!current) return products.slice(0, limit);
  const same = products.filter(
    (p) => p.slug !== slug && p.category === current.category,
  );
  const rest = products.filter(
    (p) => p.slug !== slug && p.category !== current.category,
  );
  return [...same, ...rest].slice(0, limit);
}

export function featuredProducts() {
  return products.filter((p) => p.featured);
}

export function productColor(id: string) {
  return COLORS[id] ?? COLORS.charcoal;
}
