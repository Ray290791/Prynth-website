# PRYNTH! — MASTER KNOWLEDGE BASE & SYSTEM MEMORY
> **Version:** 2.0 (Post-Audit & Concept 3 Integration)  
> **Last Updated:** October 2026  
> **Target Audience:** AI Assistants (Claude, Antigravity, LLM pair programmers), Developers, Operations & Founders  
> **Domain:** [https://prynth.in](https://prynth.in) · [https://www.prynth.in](https://www.prynth.in)

---

## 1. Executive Summary & Brand Identity

### 1.1 Brand Overview
**Prynth!** is an independent, on-demand 3D printing and digital manufacturing studio based in **Mumbai, Maharashtra, India**. The brand bridges industrial additive manufacturing and functional everyday design, producing ready-made architectural desk accessories, modular organization systems, custom photo-relief lithophanes, and full-service CAD engineering / rapid prototyping for clients across India.

### 1.2 The Core Philosophy
- **"Form, precision, and functional intent"** / **"Engineered form in monolithic balance."**
- **Quality Without Theatre:** No hidden setup fees, no inflated "quote request" email tag, no artificial scarcity. Customers can buy ready-made objects with predictable pricing, configure custom pegboards, or upload 3D models for instant slicing quotes.
- **Made-to-Order Manufacturing:** Every piece is printed on-demand using modern CoreXY 3D printers rather than stockpiled in warehouse bulk. This ensures zero material waste and allows rigorous per-piece quality inspections before dispatch.

### 1.3 Studio Location & Operations
- **Studio Headquarters:** Mumbai, Maharashtra 400001, India (Geographic Coordinates: `19.0760° N, 72.8777° E`).
- **Hardware Fleet:** Industrial-grade **Bambu Lab CoreXY 3D printers** featuring high acceleration, automatic vibration compensation, multi-material switching, and 0.08mm – 0.28mm layer resolution.
- **Official Communication:**
  - Customer Inquiries: `hello@prynth.in`
  - Transactional & Order Updates: `orders@prynth.in`
  - Legal & Grievance Officer: `grievance@prynth.in`
  - Social: Instagram `@prynth` · Twitter/X `@prynth`
  - Operating Hours: Monday – Saturday, 10:00 AM – 7:00 PM IST

### 1.4 Visual Brand Identity
- **Wordmark Typography:** Styled in `Poppins` (weights 700/800) in lowercase with distinctive Cyber Teal accents on the letters `r` and `!`:
  ```html
  <span style="font-family:'Poppins',sans-serif; font-weight:800;">
    p<span style="color:#00B8A9;">r</span>ynth<span style="color:#00B8A9;">!</span>
  </span>
  ```
- **Monogram Icon:** Compact rounded square badge featuring `p!` in charcoal on cyber teal.

---

## 2. Design System & Aesthetics

### 2.1 Color Palette
The Prynth! interface is strictly built upon an **Obsidian Dark Mode** architecture:
- **Obsidian Dark (Background):** `#0C0E12` (Surface Deep: `#14171D`, Card / Raised: `#1B1F27`)
- **Cyber Teal (Primary Accent):** `#00B8A9` (Hover / Glow: `#00D4C3`, Dark Teal: `#007A70`)
- **Bone / Off-White (Contrast Light):** `#EFEBE3`
- **Charcoal (Card Surface & Border):** `#2A2E32` / `#23272F`
- **Stone Gray (Secondary Text & Muted):** `#9AA0A6` / `#6B7280`
- **Emerald Accent (Success & Highlights):** `#10B981` / `#34D399`

### 2.2 Typography
1. **Headlines & Display:** **Instrument Serif** (Google Fonts). Headlines feature elegant serif phrasing paired with italic gradient highlights:
   ```tsx
   <h1 className="font-serif text-5xl md:text-7xl tracking-tight text-white">
     Engineered form in{" "}
     <span className="italic font-normal bg-gradient-to-r from-teal-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
       monolithic balance.
     </span>
   </h1>
   ```
2. **Body & Interface:** **Plus Jakarta Sans** (Google Fonts). Highly legible, modern geometric sans-serif for UI components, descriptions, navigation, and forms.
3. **Brand Wordmark:** **Poppins** (Google Fonts, weights 700 and 800).
4. **Technical Specifications & Tags:** **Space Grotesk** / `font-mono` for layer heights, dimensions, infill percentages, and SKU tags.

### 2.3 Interactive 3D Silk Wave WebGL Engine
Mounted globally in `src/components/silk-wave-background.tsx` behind all route content:
- **Renderer:** Three.js WebGL canvas (`fixed inset-0 pointer-events-none`).
- **Shader / Geometry:** 25 curved parametric ribbon splines with 220 vertices each, animated with dual-frequency sine waves (`sin(x * 0.003 + time) + cos(z * 0.002 + time)`).
- **Interactive Cursor Physics:** Tracks pointer movement (`clientX`, `clientY`) normalized to NDC space (`-1` to `+1`), creating real-time dampening ripple waves that deform ribbons under the cursor.
- **Route-Aware Adaptive Transparency:**
  - **Home Page (`/`):** **75% Opacity (`opacity-75`)** — vivid, energetic, first-impression visual centerpiece.
  - **Inner Routes (`/shop`, `/custom`, `/pegboard`, `/lithophane`, etc.):** **30% Opacity (`opacity-30`)** — subtle, deep ambient motion that never distracts from reading text or viewing products.
  - Transition handled smoothly via CSS `transition-opacity duration-700`.

---

## 3. Product Catalog & Studio Offerings

### 3.1 Ready-Made Functional Catalog

| Product Name | Slug | Price | Material | Available Colors | Sizes / Variants | Description & Key Specifications |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **Modular Desk Pegboard System (Kit)** | `modular-pegboard` | **₹699** | PETG / Matte PLA | Charcoal, Bone, Stone, Teal | Compact (20×20cm), Studio (30×30cm), Exec (40×40cm), Duo | Complete starter kit including tile, damage-free wall adhesive strips, starter hooks, alignment clips. Holds up to 4.5kg per anchored tile. Individual tiles from ₹200 on configurator. |
| **Wave Stand** | `wave-stand` | **₹249** | PLA | Charcoal, Teal, Bone | Standard, Plus, Max | Organic curved phone/tablet stand. Holds devices in landscape or portrait. Fingerprint-hiding matte finish. |
| **Cable Nest** | `cable-nest` | **₹199** | PLA | Teal, Charcoal, Bone | 12 cm dia. × 4 cm | Desk bowl with peripheral rim slots that clip charging cords so they never slip behind furniture. |
| **Geo Planter** | `geo-planter` | **₹349** | PLA | Bone, Charcoal, Teal | 9 × 9 × 9 cm | Multi-faceted geometric indoor succulent/cactus planter with integrated drainage hole. |
| **Desk Tray** | `desk-tray` | **₹399** | PLA | Charcoal, Bone, Stone | 22 × 12 × 3 cm | Two-compartment EDC catch-all tray for keys, coins, watch, and AirPods with rounded interior fillets. |
| **Pebble Hooks (Set of 3)** | `pebble-hooks` | **₹279** | PETG | Teal, Charcoal, Bone | ~8 × 5 × 4 cm each | Set of 3 organic wall hooks for coats, jackets, towels, or headphones. Mounting hole for screws/anchors. |
| **Hex Coasters (Set of 4)** | `hex-coasters` | **₹329** | PLA | Teal + Charcoal (2+2) | 10 cm across × 0.8 cm | 4 stackable hexagonal drink coasters with raised rim to catch drips. Ships as 2 charcoal and 2 teal. |
| **Headphone Rest** | `headphone-rest` | **₹449** | PLA | Charcoal, Teal, Bone | 16 × 12 × 24 cm | Wide arched over-ear headset stand. Preserves headband foam cushioning without flattening earcups. |
| **Catch Bowl** | `catch-bowl` | **₹229** | PLA | Charcoal, Teal, Bone | Small, Medium, Large | Organic pebble-shaped bowl for rings, watches, pocket essentials. Natural matte layered finish. |
| **Ripple Soap Dish** | `ripple-soap` | **₹179** | PETG | Bone, Charcoal, Teal | 12 × 8 × 2 cm | Raised wavy ripples drain water away from soap bar, small raised feet keep base dry. Mold-resistant PETG. |
| **Pen Well** | `pen-well` | **₹199** | PLA | Teal, Charcoal, Bone | 8 cm dia. × 11 cm | Flared anti-tip stationery cup for pens, styluses, markers, and rulers. |

### 3.2 Modular Pegboard Studio (`/pegboard`)
- **Interactive 3D Grid Configurator:** Users can assemble modular 20×20cm or 30×30cm interlocking tiles on an interactive canvas.
- **Base Pricing:** **Starter Tile from ₹200**, **Complete Kit ₹699**.
- **Accessory Add-ons:**
  - Tech Pack (Headphone hanger, cable clip organizers, phone cradle)
  - Desk Pack (Stationery bin, card holder, sticky note tray)
  - Botanical Pack (Air plant cradles, mini pot holders)
- **Mounting Options:** Damage-free adhesive strips (suitable for smooth painted walls and glass), desk-edge clamps, or drywall anchors.

### 3.3 3D Lithophane Studio (`/lithophane`)
- **Process:** Translates 2D uploaded photos (portraits, pets, architectural memories) into 3D thickness-mapped light-relief sculptures that illuminate when backlit.
- **Sizes & Base Prices:**
  - Medium (10 × 10 cm): **₹399**
  - Standard (15 × 10 cm): **₹549**
  - Large (20 × 15 cm): **₹749**
- **Hardware & Lightbox Add-ons:**
  - Warm LED Wooden Base Stand: **₹249 – ₹399**
  - Luxury Gift Box Packaging: **₹99**
- **Volume Bulk Discounts:** 5% off for 5+, 10% off for 10+, 15% off for 20+.

### 3.4 Custom 3D Printing & CAD Services (`/custom`)
Dual-pathway workflow:
1. **Path 1: Instant STL / 3MF Upload Flow:**
   - Dropzone supports `.stl`, `.3mf`, `.obj` files up to **25 MB**.
   - Client-side Three.js slicing engine calculates mesh bounding box, surface area, and solid volume in cubic centimeters.
   - Live pricing calculation based on material, infill (15%, 30%, 50%, 100%), and print resolution (0.12mm fine to 0.28mm draft).
2. **Path 2: Idea / CAD Design Flow:**
   - For users with sketches, photos, or dimensions but no 3D file.
   - Free engineering review by the Mumbai studio team.
   - Comprehensive CAD modeling services in Autodesk Fusion 360 / SolidWorks.

### 3.5 Materials Guide (`/materials`)
- **PLA (Polylactic Acid):** Plant-based, bioderived, crisp detail, zero warping. Ideal for desk organizers, planters, decorative objects. Heat resistance up to 55°C.
- **PETG (Polyethylene Terephthalate Glycol):** Impact resistant, waterproof, chemical resistant, ductile flex. Ideal for bathroom accessories, soap dishes, mechanical clips, outdoor fixtures. Heat resistance up to 75°C.
- **ABS (Acrylonitrile Butadiene Styrene):** High thermal resistance (up to 95°C), high mechanical strength. Ideal for functional automotive brackets and tool holders.
- **ASA (Acrylonitrile Styrene Acrylate):** UV-stable, weatherproof outdoor plastic that will not degrade or yellow in Indian sun.

---

## 4. Technical Architecture & Stack

### 4.1 Core Technologies
- **Frontend Framework:** React 19 (Server Components + Client interactivity).
- **Routing & SSR:** [TanStack Start](https://tanstack.com/start) with [TanStack React Router](https://tanstack.com/router) (file-based routing, type-safe route parameters, automatic code splitting).
- **Bundler & Tooling:** Vite 8 (`@tailwindcss/vite`).
- **Styling:** Tailwind CSS v4 (`@theme` variables), Radix UI accessible primitives, Lucide React icons, Sonner toast notifications.
- **Hosting & Edge Runtime:** **Cloudflare Workers** using Nitro preset (`cloudflare-module`), configured via `wrangler.toml` for `prynth.in` and `www.prynth.in`.
- **Database:** **Neon Serverless PostgreSQL** (`@neondatabase/serverless`).
  - Production uses stateless HTTP driver (`neon(dbUrl)`) to prevent worker socket locking.
  - Queries strictly adhere to Cloudflare Worker subrequest quotas (<50 subrequests per invocation).
  - Local Dev / Offline Fallback: Embedded PGLite (`@electric-sql/pglite`).
- **Database Schema & Migrations:** Kysely query builder, schema migrations stored in `migrations/` and executed at build time via `scripts/migrate.mjs`.
- **Authentication:** **Better Auth** (`better-auth`) with Google OAuth and Email/Password credentials with Admin role protection.
- **Payment Processing:** **Razorpay Gateway** (Standard Checkout modal + server-side HMAC-SHA256 signature verification).
- **Transactional Email:** **Resend** (`resend`) configured with sender `orders@prynth.in`.

### 4.2 Key Project Directory Layout
```
c:\Users\raybe\Documents\Prynth!\Prynth! Website\
├── public/                 # Static assets, product photos, 3D sample files, robots.txt
├── migrations/             # Numbered SQL schema migrations (0001_... to 0005_...)
├── server/
│   └── middleware/         # Security headers, canonical domain host redirects
├── scripts/
│   ├── migrate.mjs         # Production database migration runner
│   └── check-db.ts         # Connectivity diagnostic script
├── src/
│   ├── components/         # SilkWaveBackground, SiteHeader, SiteFooter, Modals, AdminTabs
│   ├── lib/                # db.ts, auth/, orders-fns.ts, products.ts, settings-fns.ts
│   ├── routes/             # TanStack Start file-based routes
│   │   ├── __root.tsx      # Global HTML shell, fonts, meta, SilkWaveBackground mount
│   │   ├── index.tsx       # Homepage (Instrument Serif, Silk Wave 75% opacity)
│   │   ├── shop.index.tsx  # Product catalog with search, filter, sort
│   │   ├── shop.$slug.tsx  # Dynamic product page with gallery and reviews
│   │   ├── pegboard.tsx    # Modular Pegboard Studio Configurator
│   │   ├── lithophane.tsx  # 3D Lithophane Studio
│   │   ├── custom.tsx      # Dual-pathway 3D upload and CAD quote
│   │   ├── cart.tsx        # Shopping cart with ₹349 free-shipping bar
│   │   ├── checkout.tsx    # Razorpay and COD checkout flows
│   │   ├── contact.tsx     # Contact page (Strictly NO phone number displayed)
│   │   ├── admin.tsx       # Protected dashboard (orders, stock, tracking)
│   │   └── ...             # Legal (terms, privacy, shipping, returns), FAQ, profile
│   └── styles.css          # Tailwind CSS v4 directives & font imports
└── wrangler.toml           # Cloudflare Workers configuration & bindings
```

---

## 5. E-Commerce Logistics, Pricing & Legal SLAs

### 5.1 Shipping Policy
- **Coverage:** Pan-India delivery to all serviceable Indian PIN codes.
- **Shipping Tiers:**
  - **Standard Delivery:** **₹49** (Estimated transit: 3–5 business days).
  - **Free Shipping Threshold:** Orders **₹349 and above** qualify for free standard shipping.
  - **Express Delivery:** **₹129** (Estimated transit: 1–2 business days).
- **Manufacturing Turnaround:** 2–4 business days for ready-made catalog prints; 5–7 days for complex multi-part custom CAD orders.
- **Packaging:** Reinforced corrugated boxes with biodegradable paper cushioning (zero single-use styrofoam).

### 5.2 Payment Methods
1. **Online Prepayment:** Cards (Visa, Mastercard, RuPay), Netbanking, Wallets via Razorpay.
2. **UPI Payments:** Direct UPI intent and dynamic QR codes.
3. **Cash on Delivery (COD):** Available across India with a **₹40** collection fee.

### 5.3 Return, Refund & Defect Guarantee
- **7-Day Reprint Guarantee:** If an item arrives broken, cracked, or defective from transit, Prynth! provides a free reprint upon receipt of photo verification within 7 days of delivery.
- **Change-of-Mind Returns:** Permitted on unused ready-made catalog objects in original packaging within 7 days (customer pays return shipping; product purchase amount is refunded).
- **Non-Returnable Items:** Custom 3D prints produced from customer files, custom lithophanes, bespoke CAD models approved by client, and hygiene-sensitive bath accessories.

---

## 6. Strict Development Directives & User Preferences

When updating, refactoring, or generating code for the Prynth! project, Claude and all AI assistants MUST adhere to the following standing rules established by the project owner:

### ❌ What NEVER To Do
1. **NEVER Display a Phone Number on `/contact`:** Under no circumstances should a telephone number, raw digits, or `tel:` link be visible on the Contact page. Contact must be limited to Email (`hello@prynth.in`), Grievance Officer, and the WhatsApp chat button.
2. **NEVER Box Background Animations in Cards:** Three.js and WebGL animations must ALWAYS be rendered edge-to-edge as full-screen backgrounds (`fixed inset-0 pointer-events-none`). Never constrain the Silk Wave inside an isolated card or container.
3. **NEVER Change the Theme from Obsidian Dark:** The dark aesthetic (`#0c0e12`) is the permanent signature of Prynth!. Do not add user theme toggles or light-mode color pickers.
4. **NEVER Remove the "Home" Button from the Header:** The navigation bar in `src/components/site-header.tsx` must always have "Home" as the very first link.
5. **NEVER Use Placeholder CAD Meshes in Catalog:** Do not replace real product catalog objects (Wave Stand, Modular Pegboard, Cable Nest, etc.) with dummy test cubes or arbitrary 3D models.
6. **NEVER Re-Introduce Unverified Claims:** Do not use uncertified marketing claims such as "Patented lugs", "5kg load tested", "±0.08mm machine tolerance", or "Zero-damage mount". Use factual descriptions: "Precision-engineered wedge lugs", "Damage-free adhesive strips (for painted walls & tiles)", "Layer resolution 0.08mm – 0.28mm".
7. **NEVER Accept Client-Specified Amounts in Payment:** All Razorpay orders must be validated and calculated on the server from PostgreSQL (`createRazorpayOrder` in `orders-fns.ts`). Never trust client cart subtotals.

### ✅ What ALWAYS To Do
1. **Maintain Adaptive Background Transparency:** Keep `SilkWaveBackground` at `opacity-75` on the home page (`/`) and `opacity-30` on all inner pages.
2. **Use Instrument Serif for Display:** Use `font-serif` (Instrument Serif) for prominent section titles with italic gradient accents (`from-teal-400 via-teal-300 to-emerald-400`).
3. **Respect Cloudflare Subrequest Quotas:** Keep SSR data loaders in single, consolidated SQL queries (`<50 subrequests` per request).
4. **Run Migrations via `scripts/migrate.mjs`:** Schema changes must be added as SQL files in `migrations/` and never executed ad-hoc during live traffic.
5. **Preserve Free Shipping at ₹349:** Ensure every banner, cart calculation, and checkout validation uses the ₹349 threshold.
6. **Commit & Push Etiquette:** When instructed to push, run commands individually or with PowerShell `;` syntax (never PowerShell `&&` which breaks on older hosts).

---

## 7. Current Feature Backlog & Roadmap

The following prioritized features represent the active improvement roadmap for Prynth!:

1. **Customer Saved Address Book:** Allow registered customers to save multiple delivery addresses in PostgreSQL for one-click checkout.
2. **Live Product Stock & Inventory Badges:** Real-time stock counters (`stockCount`, "Sold Out" badges, "Only 3 left" urgency tags).
3. **Wishlist & Save-for-Later (`/wishlist`):** User-specific persistent wishlist synced across sessions.
4. **Promotional Coupon / Referral Engine:** Table-backed coupon validation (`coupons` table with discount percentage, expiry date, minimum order amount).
5. **Enhanced Order Tracker (`/order/$id`):** Visual 5-stage progress tracker (Placed → Queue → Printing → QC Passed → Shipped via Courier) with integrated courier tracking number links.
6. **Automated Courier Tracking (Shiprocket / Delhivery):** Direct API integration to generate shipping waybills and auto-email tracking links to customers.
7. **B2B / GST Invoice Generation:** Optional GSTIN input at checkout and instant PDF receipt download.
8. **WhatsApp Business Order Notifications:** Transactional order status alerts sent directly via WhatsApp API.

---
*End of Master Knowledge Base — Prynth! Mumbai Studio*
