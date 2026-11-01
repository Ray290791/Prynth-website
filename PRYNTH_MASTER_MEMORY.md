# PRYNTH! — MASTER KNOWLEDGE BASE & SYSTEM MEMORY
> **Version:** 2.1 (Verified & Production Synchronized)  
> **Last Updated:** November 2026  
> **Target Audience:** AI Assistants (Claude, Antigravity, LLM pair programmers), Developers, Operations & Founders  
> **Domain:** [https://prynth.in](https://prynth.in) · [https://www.prynth.in](https://www.prynth.in)

---

## 1. Executive Summary & Brand Identity

### 1.1 Brand Overview
**Prynth!** (`prynth!`) is an independent, on-demand 3D printing and digital manufacturing studio based in **Mumbai, Maharashtra, India**. The brand bridges industrial additive manufacturing and functional everyday design, producing ready-made architectural desk accessories, modular organization systems, custom photo-relief lithophanes, and full-service CAD engineering / rapid prototyping for clients across India.

### 1.2 The Core Philosophy
- **"Form, precision, and functional intent"** / **"Engineered form in monolithic balance."**
- **Quality Without Theatre:** No hidden setup fees, no inflated "quote request" email tag, no artificial scarcity. Customers can purchase ready-made objects with predictable pricing, configure modular pegboards, or upload 3D models for instant slicing quotes.
- **Made-to-Order Manufacturing:** Every piece is printed on-demand using modern CoreXY 3D printers rather than stockpiled in warehouse bulk. This ensures zero material waste and allows rigorous per-piece quality inspections before dispatch.

### 1.3 Studio Location & Operations
- **Studio Headquarters:** Mumbai, Maharashtra 400001, India (Geographic Coordinates: `19.0760° N, 72.8777° E`).
- **Founders & Leadership:** Founded and operated by **Ray Kapadia** and **Supas Kumar** (Co-Founders).
- **Legal Entity:** Unregistered Firm operated by the Co-Founders.
- **Grievance Redressal Officer:** Ray Kapadia (`grievance@prynth.in`) in compliance with the Consumer Protection (E-Commerce) Rules, 2020 and DPDP Act 2023.
- **Hardware Fleet:** Industrial-grade **Bambu Lab CoreXY 3D printers** featuring high acceleration, automatic vibration compensation, multi-material switching, and 0.08mm – 0.28mm layer resolution.
- **Official Communication:**
  - Customer Inquiries: `hello@prynth.in`
  - Transactional & Order Updates: `orders@prynth.in`
  - Statutory Grievances & Data Rights: `grievance@prynth.in`
  - Official WhatsApp Studio Support: Connected via studio contact button (strictly email and WhatsApp; no unmonitored telephone numbers or landlines displayed on `/contact`).
  - Social: Instagram `@prynth07` · Twitter/X `@prynth`
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

### 2.1 Theme Architecture & Color System
The interface is architected around semantic CSS variables supporting both **Obsidian Dark Mode** (default) and **Bone Light Mode** (WCAG AA/AAA compliant):
- **Obsidian Dark (Default):**
  - Background: `#0C0E12`
  - Surface Deep: `#14171D`
  - Card / Raised: `#1B1F27`
  - Primary Accent (Cyber Teal): `#00B8A9` (Hover: `#00D4C3`, Dark Teal: `#007A70`)
  - Accent Text: `#00B8A9`
  - Contrasting Foreground: `#EFEBE3` (Bone)
  - Card Borders: `#2A2E32` / `#23272F`
  - Secondary Text: `#9AA0A6` (Muted), `#6B7280` (Subtle)
- **Bone Light Mode:**
  - Background (`--bg`): `#F8F6F0` (Bone/Warm Off-White)
  - Surface (`--surface`): `#FFFFFF`
  - Surface 2 (`--surface-2`): `#EFECE6`
  - Text Foreground (`--fg`): `#1E2124` (Charcoal)
  - Muted Text (`--muted`): `#4E555E` ($\ge 4.5:1$ contrast)
  - High-Contrast Teal Accent (`--accent-text`): `#007369` ($5.17:1$ contrast on white, $4.73:1$ on bone)
- **Theme Switching:** Theme toggle component (`src/components/theme-toggle.tsx`) with zero-flash inline boot script (`THEME_BOOT`), persisting choice in `localStorage` and respecting visitor OS preference on initial visit.

### 2.2 Typography
1. **Headlines & Display:** **Instrument Serif** (Google Fonts). Headlines feature serif phrasing paired with italic gradient highlights:
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
- **Adaptive Appearance:**
  - **Dark Mode:** Deep cyan-teal ribbons `#00b8a9` against dark vignette.
  - **Light Mode:** Dynamically shifts to soft pine `#008075` with 0.22 opacity via MutationObserver; vignette fades into `[var(--bg)]`.
  - **Route Transparency:** 75% opacity on homepage (`/`), 30% on interior routes (`/shop`, `/custom`, `/pegboard`, etc.).

### 2.4 Navigation & Header Architecture
- **Sticky Header:** The site header (`src/components/site-header.tsx`) is permanently sticky at `top-0` with `z-40`, backdrop blur, and subtle glass border.
- **Containment Rule:** `<SiteHeader />` is mounted directly in `src/components/site-shell.tsx` as a direct flex child.
- **Navigation Order:** "Home" is strictly the first link in the primary navbar, followed by Shop, Custom Print, Pegboards, Materials, Services dropdown, and Explore dropdown.

---

## 3. Product Catalog & Studio Offerings

### 3.1 Ready-Made Functional Catalog

| Product Name | Slug | Price | Material | Available Colors | Sizes / Variants | Description & Key Specifications |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **Modular Desk Pegboard System (Kit)** | `modular-pegboard` | **₹699** | PETG / Matte PLA | Charcoal, Bone, Stone, Teal | Compact (20×20cm), Studio (30×30cm), Exec (40×40cm), Duo | Complete starter kit including tile, wall adhesive strips, starter hooks, alignment clips. Individual tiles from ₹200 on `/pegboard`. |
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
- **Interactive 3D Grid Configurator:** Interactive builder to select tile size, layout, polymer color, and mounting method.
- **Base Tile Pricing:** Starter single tile from **₹200**; starter kit from **₹699**.
- **Preset Kits:** Compact (₹699), Studio (₹999), Executive (₹1499), Dual Tile Duo (₹1799).
- **Accessory Add-ons:** Tech Pack (₹299), Desk Pack (₹249), Botanical Pack (₹279).
- **Mounting Options:** Adhesive wall strips (smooth painted walls, glass, tile), desk-edge clamps, or drywall anchors.

### 3.3 3D Lithophane Studio (`/lithophane`)
- **Process:** Translates 2D uploaded photos into 3D thickness-mapped light-relief sculptures illuminated via backlighting.
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
   - Client-side Three.js slicing engine calculates volume, bounding dimensions, and surface area.
   - Files deduplicated via SHA-256 byte hash (`content_hash`) and stored securely in Cloudflare R2 (`r2_key`).
   - Protected with Cloudflare Turnstile bot verification and sliding rate limits (10 uploads per 10 minutes per IP).
   - Dynamic formula calculates cost from material rate, infill, quality multiplier, and quantity.
2. **Path 2: Idea / CAD Design Flow:**
   - Free engineering review by the Mumbai studio team.
   - Comprehensive CAD modeling in Autodesk Fusion 360 / SolidWorks from sketches or reference images.

### 3.5 Materials Guide (`/materials`)
- **PLA (Polylactic Acid):** Plant-based, bioderived, crisp detail, zero warping. Heat resistance up to 55°C.
- **PETG (Polyethylene Terephthalate Glycol):** Impact resistant, waterproof, chemical resistant, ductile flex. Heat resistance up to 75°C.
- **ABS (Acrylonitrile Butadiene Styrene):** High thermal resistance (up to 95°C), high mechanical strength for functional enclosures.
- **ASA (Acrylonitrile Styrene Acrylate):** UV-stable, weatherproof outdoor plastic that resists yellowing under intense Indian sunlight.

---

## 4. Technical Architecture & Stack

### 4.1 Core Technologies
- **Frontend Framework:** React 19 (Server Components + Client interactivity).
- **Routing & SSR:** [TanStack Start](https://tanstack.com/start) with [TanStack React Router](https://tanstack.com/router) (type-safe file-based routing and loaders).
- **Bundler & Tooling:** Vite 8 (`@tailwindcss/vite`).
- **Styling:** Tailwind CSS v4 (`@theme` variables), Radix UI accessible primitives, Lucide React icons, Sonner toast notifications.
- **Hosting & Edge Runtime:** **Cloudflare Workers** using Nitro preset (`cloudflare-module`), configured via `wrangler.toml` for `prynth.in` and `www.prynth.in`.
- **Database:** **Neon Serverless PostgreSQL** (`@neondatabase/serverless`).
  - Production uses stateless HTTP driver (`neon(dbUrl)`) to prevent worker socket locking.
  - Queries strictly adhere to Cloudflare Worker subrequest quotas (<50 subrequests per invocation).
  - Local Dev / Offline Fallback: Embedded PGLite (`@electric-sql/pglite`).
- **Database Schema & Migrations:** 28 numbered migrations (`migrations/0001_` through `0028_update_shipping_and_cod_settings.sql`) applied automatically during build via `scripts/migrate.mjs`.
- **Object Storage:** Cloudflare R2 bucket (`custom-files`) for 3D model STL/3MF files, lithophane images, and order attachments.
- **Security & Cryptography:**
  - Timing-safe constant-time signature comparisons (`crypto.timingSafeEqual` and `timingSafeEqualString` XOR) for Razorpay payment callbacks and webhooks.
  - Cloudflare Turnstile bot verification on public upload and inquiry endpoints.
  - Sliding distributed rate limiting (`src/lib/rate-limiter.ts`) backed by Postgres/KV.
  - Content Security Policy, strict HSTS, X-Frame-Options, and nosniff headers.
- **Authentication:** **Better Auth** (`better-auth`) with Google OAuth and Email/Password credentials, admin role verification, and admin PIN lockout protection.
- **Payment Processing:** **Razorpay Gateway** (Standard Checkout modal + server-side HMAC-SHA256 signature verification).
- **Transactional Email:** **Resend** (`resend`) configured with sender `orders@prynth.in`.

### 4.2 Key Project Directory Layout
```
c:\Users\raybe\Documents\Prynth!\Prynth! Website\
├── public/                 # Static assets, product photos, 3D sample files, robots.txt, sitemap.xml, llms.txt
├── migrations/             # 28 numbered SQL schema migrations (0001_... to 0028_...)
├── server/
│   └── middleware/         # Security headers, canonical domain host redirects
├── scripts/
│   ├── migrate.mjs         # Production database migration runner
│   ├── migration-plan.mjs  # Migration sorter and pending plan
│   └── check-db.ts         # Connectivity diagnostic script
├── src/
│   ├── components/
│   │   ├── admin/          # Modular admin console tabs (settings, products, orders, inventory, grievances, coupons, faqs, team)
│   │   ├── custom/         # 3D upload form, idea form, printability checkers
│   │   ├── ui/             # Radix UI primitives (button, badge, dialog, input, etc.)
│   │   ├── silk-wave-background.tsx # Fullscreen Three.js WebGL canvas
│   │   ├── site-header.tsx # Sticky glass navigation
│   │   └── site-footer.tsx # Footer with statutory legal links and cookie preferences
│   ├── lib/                # db.ts, auth/, orders-fns.ts, products.ts, settings-fns.ts, shiprocket.server.ts, r2.server.ts
│   ├── routes/             # TanStack Start file-based routes
│   │   ├── __root.tsx      # Global HTML shell, fonts, meta, SilkWaveBackground mount
│   │   ├── index.tsx       # Homepage (Instrument Serif, Silk Wave 75% opacity)
│   │   ├── shop.index.tsx  # Product catalog with search, filter, sort
│   │   ├── shop.$slug.tsx  # Dynamic product page with gallery and reviews
│   │   ├── pegboard.tsx    # Modular Pegboard Studio Configurator
│   │   ├── lithophane.tsx  # 3D Lithophane Studio
│   │   ├── custom.tsx      # Dual-pathway 3D upload and CAD quote
│   │   ├── cart.tsx        # Shopping cart with dynamic free-shipping progress
│   │   ├── checkout.tsx    # Razorpay and COD checkout flows with address book
│   │   ├── contact.tsx     # Contact page (Strictly NO telephone number displayed)
│   │   ├── admin.tsx       # Protected dashboard (orders, stock, tracking, settings)
│   │   ├── wishlist.tsx    # Saved items and wishlist
│   │   ├── legal.tsx       # Statutory DPDP forms & consumer complaint workflow
│   │   └── ...             # Legal (terms, privacy, shipping, returns), FAQ, profile
│   └── styles.css          # Tailwind CSS v4 directives, font imports, and semantic theme tokens
└── wrangler.toml           # Cloudflare Workers configuration & bindings
```

---

## 5. E-Commerce Logistics, Pricing & Legal SLAs

### 5.1 Shipping & Delivery Policy (Single Source of Truth)
Every shipping amount across the website and admin console is driven dynamically by **Site Settings**:
- **Standard Delivery:** **₹79 flat rate nationwide across India** (transit: 3–5 business days). Managed dynamically via `settings.standard_shipping_fee`.
- **Free Shipping Threshold:** Orders **₹399 and above** qualify for free standard shipping. Managed dynamically via `settings.free_shipping_threshold`.
- **Express Priority Courier:** **₹189** (priority air courier, transit: 1–2 business days). Always charged separately on all orders; express fee is never zeroed by order subtotal. Managed dynamically via `settings.express_shipping_fee`.
- **Single Centralized Configuration:** All shipping and COD fees are configured strictly from **Site Settings → Shipping & Delivery Rates**. No conflicting fields exist in other tabs.
- **Manufacturing Turnaround:** 2–4 business days for ready-made catalog prints; 5–7 days for complex multi-part custom CAD orders.
- **Packaging:** Reinforced corrugated boxes with biodegradable paper cushioning (zero single-use styrofoam).

### 5.2 Payment Methods & COD Rules
1. **Online Prepayment:** Cards (Visa, Mastercard, RuPay), Netbanking, UPI, and digital wallets securely processed via Razorpay.
2. **UPI Payments:** Dynamic QR code and direct UPI intent.
3. **Cash on Delivery (COD):** Available across serviceable Indian postal PIN codes with a **₹39 collection surcharge** (managed dynamically via `settings.cod_fee`).
4. **Strict Made-to-Order COD Exclusion:** Cash on Delivery is strictly restricted to ready-made catalog items. Custom CAD prints, lithophanes, and configured pegboards are manufactured to bespoke customer specifications and **strictly exclude COD** (rejected client-side and verified server-side in `createRazorpayOrder`).

### 5.3 Consumer Grievance & DPDP Act 2023 Compliance
- **Grievance Redressal Officer:** Ray Kapadia (`grievance@prynth.in`).
- **Statutory SLAs:** Automated acknowledgement within **48 hours** with unique tracking ticket (`PRY-GRV-YYYY-XXXX`), and mandatory resolution within **30 days** in accordance with Rule 5(9) of the Consumer Protection (E-Commerce) Rules, 2020.
- **Statutory Forms at `/legal`:** Consumers can file grievances, request DPDP data erasure, request data copies, or withdraw marketing consent without needing to sign in.
- **Statutory Data Retention Schedules:**
  - Customer 3D models and lithophane images: Retained for **30 days post-fulfillment** solely for warranty reprints and defect inspection, then permanently erased from Cloudflare R2 and database.
  - Abandoned uncompleted uploads: Automatically cleaned up after **72 hours** (`maintenance.server.ts`).
  - Tax invoices & transaction receipts: Retained for **8 years** under Section 44AA of the Income Tax Act, 1961.
  - Grievance and complaint records: Retained for **3 years** under Consumer Protection guidelines.

### 5.4 Return, Refund & Zero-Flaw Guarantee
- **Ready-Made Catalog Items:** 7-day reprint or refund guarantee if an item arrives broken, incomplete, or damaged in transit. Photograph required within 7 days of delivery. Change-of-mind returns accepted on unused ready-made pieces in original packaging within 7 days (buyer covers return courier).
- **Custom Prints & Lithophanes (Zero-Flaw Guarantee):** Non-cancellable once manufacturing begins on the print bed. If a custom print arrives damaged, warped, delaminated, dimensionally out-of-spec (>0.5% deviation), or in the wrong polymer/color within 48 hours of delivery:
  1. Rush 100% Free Priority Reprint with expedited dispatch; OR
  2. Immediate 100% full refund to original payment method (settled in 5–7 business days).

---

## 6. Strict Development Directives & User Preferences

When updating, refactoring, or generating code for the Prynth! project, Claude and all AI assistants MUST adhere to the following standing rules established by the project owner:

### ❌ What NEVER To Do
1. **NEVER Display a Telephone Number on `/contact`:** Under no circumstances should a phone number or `tel:` link be visible on the Contact page. Contact must be limited to Email (`hello@prynth.in`), Grievance Officer, and the WhatsApp chat button.
2. **NEVER Box Background Animations in Cards:** Three.js and WebGL animations must ALWAYS be rendered edge-to-edge as full-screen backgrounds (`fixed inset-0 pointer-events-none`). Never constrain the Silk Wave inside an isolated card.
3. **NEVER Remove the "Home" Button from the Header:** The navigation bar in `src/components/site-header.tsx` must always have "Home" as the very first link.
4. **NEVER Use Placeholder CAD Meshes in Catalog:** Do not replace real product catalog objects (Wave Stand, Modular Pegboard, Cable Nest, etc.) with dummy test cubes or arbitrary 3D models.
5. **NEVER Re-Introduce Unverified Claims:** Do not use uncertified marketing claims such as "Patented lugs", "4.5kg / 5kg load tested", "±0.08mm machine tolerance", or "Zero-damage mount". Use factual descriptions: "Precision-engineered wedge lugs", "Damage-free adhesive strips (for painted walls & tiles)", "Layer resolution 0.08mm – 0.28mm".
6. **NEVER Accept Client-Specified Amounts in Payment:** All Razorpay orders must be validated and calculated on the server from PostgreSQL (`createRazorpayOrder` in `orders-fns.ts`). Never trust client cart subtotals.
7. **NEVER Allow COD for Made-to-Order Custom Prints:** Custom prints, lithophanes, and configured pegboards must never be selectable for Cash on Delivery.
8. **NEVER Hardcode Shipping or COD Fees in Code or Secondary Tabs:** Standard shipping fee, express fee, free shipping threshold, and COD surcharge MUST be read dynamically from `SiteSettings` with single-source inputs in Admin Site Settings.

### ✅ What ALWAYS To Do
1. **Maintain Adaptive Background Transparency:** Keep `SilkWaveBackground` at `opacity-75` on the home page (`/`) and `opacity-30` on all inner pages, with dynamic mode tinting.
2. **Use Instrument Serif for Display:** Use `font-serif` (Instrument Serif) for prominent section titles with italic gradient accents (`from-teal-400 via-teal-300 to-emerald-400`).
3. **Respect Cloudflare Subrequest Quotas:** Keep SSR data loaders in single, consolidated SQL queries (`<50 subrequests` per request).
4. **Run Migrations via `scripts/migrate.mjs`:** Schema changes must be added as SQL files in `migrations/` and never executed ad-hoc during live traffic.
5. **Preserve Dynamic Settings Hierarchy:** All delivery thresholds, promo banners, and fees must resolve from database settings first, falling back cleanly to default constants (`FREE_SHIPPING_AT = 399`, `STANDARD_SHIPPING = 79`, `EXPRESS_SHIPPING = 189`, `COD_FEE = 39`).
6. **Commit & Push Etiquette:** When instructed to push, run commands individually or with PowerShell `;` syntax (never PowerShell `&&` which breaks on older hosts).

---

## 7. Production-Ready Modules & System Status

The following core modules are fully implemented, verified, and active in production:

1. **Customer Address Book:** Registered users can save, retrieve, and manage multiple delivery addresses directly in PostgreSQL during checkout and on `/profile`.
2. **Live Product Stock & Low-Stock Alerts:** `products.stock` counts tracked in database, low-stock indicators in Admin inventory, and sold-out badges on product pages.
3. **Wishlist & Save-for-Later (`/wishlist`):** User-specific persistent wishlist synced across sessions with direct "Move to Cart" support.
4. **Promotional Coupon & Referral Engine:** Table-backed coupon validation (`coupons` table with discount percentage, max uses, expiry date) and personal referral credits on user profiles.
5. **5-Stage Visual Order Stepper (`/order/$id`):** Visual tracker (Placed → Processing / Printing → Shipped → Delivered) with live tracking courier links and payment confirmation receipts.
6. **Logistics & Automated Courier Booking:** Shiprocket API integration in Admin Order Details modal for automated AWB generation, coupled with manual tracking number entry for custom couriers.
7. **Consumer Grievance Redressal System:** Statutory `/legal` portal with automated ticket generation (`PRY-GRV-YYYY-XXXX`), 48-hour email acknowledgement, and 30-day SLA resolution queue in Admin Console.
8. **Cloudflare R2 Object Storage:** Secure pre-signed / streaming asset storage for 3D model files with SHA-256 byte deduplication and automated cleanup of abandoned files.

---
*End of Master Knowledge Base — Prynth! Mumbai Studio*
