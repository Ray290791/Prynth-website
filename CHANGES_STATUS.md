# Prynth! Website — Changes Status

*Tracked progress for prynth.in · Updated 27 Oct 2026*

## Summary

| Priority | Total | Done | In Progress | Blocked | Todo |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **P0** | 11 | 10 | 0 | 1 | 0 |
| **P1** | 23 | 23 | 0 | 0 | 0 |
| **P2** | 16 | 16 | 0 | 0 | 0 |
| **Total** | **50** | **49** | **0** | **1** | **0** |

> **49 out of 50 tasks across P0, P1, and P2 are 100% COMPLETE.**
> All technical implementations, policy formulations, and owner-approved items (S3, S5, S6, G2, G4, G7, R2, R4, R6, R7, R13) are complete, verified, and tested.
> The single remaining item (R14) is the owner's legal review gate with CA and lawyer prior to high-volume commercial scaling.

---

## P0 Tasks (Highest Priority)

| ID | Title | Status | Notes |
| :--- | :--- | :---: | :--- |
| **S1** | Make every shipping amount come from settings | **DONE** | Audited all hardcoded shipping/COD amounts; bound cart, pegboard, shipping policy, checkout, and admin defaults to dynamic site settings. |
| **S2** | No COD for custom and lithophane orders | **DONE** | Implemented client-side exclusion of COD and user notice when custom prints, lithophanes, or configured pegboards are in cart; strictly rejected on server-side in createRazorpayOrder. |
| **C1** | Secrets hygiene | **DONE** | Verified .env/.env.* in .gitignore; 0 commits in git history contain .env; verified no secrets in source, wrangler.toml, or public/; owner reminded to rotate credentials if external zip was shared. |
| **C2** | Lock down customer file downloads | **DONE** | Customer 3D uploads use `crypto.randomUUID()`, downloads require verified admin session, headers enforce `Cache-Control: private, no-store`, and CORS wildcard removed. |
| **C3** | Deduplicate uploads by content hash | **DONE** | Migration 0024 added `content_hash` column and unique index; SHA-256 byte hash calculation prevents duplicate file storage. |
| **C4** | Razorpay webhook | **DONE** | Implemented `/api/razorpay-webhook` route with timing-safe HMAC SHA-256 signature verification and idempotent order settlement (`confirmOrderPaymentIdempotent`). |
| **R1** | One source for legal and business details | **DONE** | Centralized legal & business identity fields in SiteSettings, added Admin Legal section with Readiness Checklist, linked `/legal` in footer. |
| **R2** | Business identity and grievance officer | **DONE** | Entity configured as Unregistered Firm operated by co-founders Ray Kapadia & Supas Kumar; Ray Kapadia designated as Grievance Redressal Officer (`grievance@prynth.in`) with automated 48h SLA ticket generation and 30-day resolution tracking. Strictly email/WhatsApp support per owner decision. |
| **R3** | Complaint workflow | **DONE** | Created migration 0027, added `/legal` statutory complaint form, automated ticket generation (`PRY-GRV-YYYY-XXXX`), email acknowledgement, 48h/30d SLA tracking, and test suite. |
| **R4** | GST (tax) readiness | **DONE** | Configured for unregistered GST status; simplified commercial receipts without GSTIN or false tax breakdown issued to customers until statutory thresholds/registration are formalized. |
| **R5** | Privacy policy, notices and consent | **DONE** | Complete DPDP Act 2023 compliance: code-level data inventory table, itemized notices across collection points (checkout, contact, 3D upload, idea form, lithophane, signup), checkboxes unticked by default, separate marketing consent, cookie preference trigger in footer and policy, DPDP rights forms at `/legal`, dedicated admin queue in Admin Console, and breach protocol in `COMPLIANCE.md`. |
| **R14** | Legal review gate | **BLOCKED** | Blocked on owner final review with CA and lawyer before launch. |

---

## P1 Tasks

| ID | Title | Status | Notes |
| :--- | :--- | :---: | :--- |
| **S3** | COD fee | **DONE** | Implemented ₹39 COD collection fee across cart store, server-side orders `createRazorpayOrder`, checkout, shipping page, settings defaults, and unit tests. |
| **S4** | Express is never free | **DONE** | Removed promises of free express in lithophane and index routes; clarified express air courier is always charged separately on all orders; added unit tests verifying express fee is never zeroed by cart total. |
| **C5** | Upload abuse protection | **DONE** | Integrated Cloudflare Turnstile verification on upload form (`upload-form.tsx`) and server endpoint (`custom-files-fns.ts`); added per-IP sliding rate limiting (max 10 uploads/10 min); implemented automated cleanup of unlinked custom models older than 3 days (`cleanupUnattachedCustomFiles` in `maintenance.server.ts`); verified via unit tests. |
| **C6** | Real rate limiting | **DONE** | Distributed rate limiting (`RateLimiter`) with Cloudflare Workers KV support, Postgres atomic upserts with TTL across isolates, and in-memory fallback; integrated across `/api/auth/*`, `/api/verify-payment`, `uploadCustomFile`, and contact inquiry endpoints. |
| **C7** | Move uploads to R2 and remove runtime DDL | **DONE** | Removed `ensureCustomFilesTable` runtime DDL on uploads; integrated Cloudflare R2 object storage with streaming support (`r2.server.ts`), saving only object keys in `custom_files.r2_key`; maintained fallback for existing base64 records. |
| **C8** | Timing-safe signature check | **DONE** | Replaced string equality with `crypto.timingSafeEqual` on Node runtime and constant-time XOR comparison (`timingSafeEqualString`) on Web Crypto/edge runtime across both payment and webhook signature verification; verified via test suite `tests/signature.test.ts`. |
| **C9** | Remove placeholder phone fallback | **DONE** | Removed "+91 98765 43210" fallback in `privacy.tsx`; only dynamic configured phone is displayed. |
| **G1** | Structured data (JSON-LD) | **DONE** | Standardized JSON-LD generators for `Organization`, `Product` with `Offer` (price, availability, shippingDetails, returnPolicy from settings), `BreadcrumbList`, and `FAQPage`. Verified with 5 unit tests in `tests/jsonld.test.ts`. |
| **G2** | LocalBusiness telephone warning | **DONE** | Confirmed strictly email/WhatsApp support; phone number cleanly omitted from markup and UI, avoiding unmonitored landlines or misleading contact details. |
| **G3** | Meta descriptions and titles | **DONE** | Tuned meta descriptions to 120–160 chars and titles to ~60 chars across all public routes, removing unverified claims. |
| **G4** | Authorship, dates and first-hand expertise | **DONE** | Founders Ray Kapadia and Supas Kumar (Co-Founders) credited across `/about`, site story, and all 4 `/guides` articles with real studio craft details and Bambu Lab CoreXY fleet specs. |
| **L1** | Audit every route in light mode | **DONE** | Full visual check across 375px, 768px, and 1440px viewports; resolved low contrast on `.text-accent`, subtle opacity wireframe for Silk Wave, and synchronized theme meta. |
| **L2** | Move all colors to theme tokens | **DONE** | Established semantic CSS variables for both light and dark themes (`--bg`, `--surface`, `--surface-2`, `--fg`, `--muted`, `--subtle`, `--accent`, `--accent-text`, `--ink`, `--border`, `--ring`, `--shadow-border`, `--glass-bg`) in `src/styles.css` without modifying dark mode styling. |
| **L3** | Light palette and contrast | **DONE** | Enforced `--accent-text: #007369` ensuring 5.17:1 on white and 4.73:1 on bone, `--muted: #4e555e` and `--subtle: #6c737c` ensuring WCAG AA >= 4.5:1. Added automated test suite `tests/theme.test.ts`. |
| **L4** | Silk Wave background and hero artwork in light mode | **DONE** | Dynamically shifts Three.js wireframe to softer `0x008075` with 0.22 opacity via MutationObserver, replaced hardcoded dark vignette `#0c0e12` with `[var(--bg)]` for natural bone fade. |
| **L5** | Component checklist in light mode | **DONE** | Set `color-scheme` per theme on `:root` and `.dark`, visible focus rings, adaptive backgrounds in `model-viewer.tsx` and `lithophane-viewer.tsx`, modals, toasts, header, and product cards. |
| **L8** | Verification | **DONE** | Automated test suite `tests/theme.test.ts` confirms WCAG AA/AAA compliance; full suite of 58 tests across 10 files, typecheck, and production SSR build pass with 0 errors. |
| **R6** | Retention and deletion | **DONE** | Formulated statutory retention schedule: 30 days for customer 3D models and lithophane photos post-fulfillment, 72 hours for uncompleted abandoned uploads, 8 years for tax invoices under Section 44AA of Income Tax Act 1961, and 3 years for grievance records; published in `COMPLIANCE.md` and `/privacy`. |
| **R7** | Terms, shipping, returns, refund and cancellation pages | **DONE** | Formulated custom refund & reprint framework: non-cancellable once manufacturing commences; 100% Free Priority Reprint OR Full Refund if piece arrives damaged in transit, warped, delaminated, dimensionally out-of-spec (>0.5%), or wrong polymer/color within 48h; documented in `COMPLIANCE.md`, `/returns`, `/terms`, and settings. |
| **R8** | Product page disclosures | **DONE** | Added statutory disclosures on product pages (tax inclusive, net quantity, dimensions, materials, country of origin, legal manufacturer/packer address from settings, customer care) and itemized fee/tax breakups in cart and checkout. |
| **R9** | Prohibited items, IP and upload confirmation | **DONE** | Added mandatory IP and non-weapon compliance warranty checkboxes on `/custom` and `/lithophane` upload flows, expanded Terms with strict weapon/counterfeit prohibitions and takedown procedure, and added dedicated refused order status reasons in Admin Console. |
| **R10** | Advertising claims and dark patterns | **DONE** | Audited all routes, copy, and badges. Purged unverified "damage-free" and "4.5kg" claims in pegboard and homepage, verified no fake urgency counters or timers, no pre-ticked add-ons, only real customer reviews, and full guest checkout without forced account creation. |
| **R11** | Marketing messages | **DONE** | Marketing opt-in is strictly separated from order processing and unticked by default at checkout, transactional emails are segregated from promotional mail, cookie consent blocks analytics until accepted, and DPDP consent withdrawal/data rights forms are provided at `/legal`. |

---

## P2 Tasks

| ID | Title | Status | Notes |
| :--- | :--- | :---: | :--- |
| **S5** | Zone-based standard shipping | **DONE** | Implemented ₹49 standard shipping for Maharashtra (India Post PIN codes 40–44) vs ₹79 for Rest of India; free above ₹399 threshold; verified via unit tests. |
| **S6** | Free-shipping threshold review | **DONE** | Free standard shipping threshold raised to ₹399 across cart store, orders server fn, checkout, shipping page, guides, and settings defaults; verified via unit tests. |
| **C10** | Remove public photo archive | **DONE** | Verified `public/all-product-photos.zip` is absent from repo and git history. |
| **C11** | Header hardening | **DONE** | Verified legacy `X-XSS-Protection` is completely removed; strict Content-Security-Policy, HSTS, X-Frame-Options, and nosniff active across middleware and `_headers`. |
| **C12** | Migration numbering | **DONE** | Audited ordering mechanism in `scripts/migration-plan.mjs`; migrations are tracked by filename in `_migrations` and sorted via `localeCompare`; applied migrations must not be renamed to avoid breaking production DBs. |
| **C13** | TypeScript config | **DONE** | Removed `baseUrl` deprecation trigger from `tsconfig.json`; typecheck passes with 0 warnings and 0 errors. |
| **C14** | Tests | **DONE** | Added comprehensive Vitest test suites for `volume-discounts.ts`, `quote.ts`, `formula-evaluator.ts`, `model-parser.ts`, `signature.ts`, `shipping.ts`, `jsonld.ts`, `theme.ts`, `grievance.ts`, plus Playwright Razorpay checkout e2e spec (58 tests across 10 files passing). |
| **C15** | Housekeeping | **DONE** | Renamed package to `prynth` in `package.json`, confirmed `attachments/` folder absent, verified `admin.tsx` and `custom.tsx` are modularized into component directories (`src/components/admin/` and `src/components/custom/`). |
| **G5** | Answer-style content | **DONE** | Added 4 high-value answer-style guide articles at `/guides` opening with 40–60 word direct answers, question-style headings, real studio numbers, and named sources; rewrote homepage product section intro into a cohesive self-contained paragraph. |
| **G6** | llms.txt | **DONE** | Created `/llms.txt` summary file listing key routes, products, pricing, and policies for AI crawlers and LLM indexing (excluding `/cart`). |
| **G7** | Brand and review signals | **DONE** | Configured Instagram handle `@prynth07` in site settings, footer links, and Schema.org structured data `sameAs` array (`https://www.instagram.com/prynth07`); verified via unit tests. |
| **G8** | Measurement | **DONE** | Verified `public/sitemap.xml` lists all public core, service, product, legal, and guide pages while strictly excluding `/cart`; Core Web Vitals optimized. |
| **L6** | Logo and imagery in light mode | **DONE** | Wordmark switches to charcoal `#1e2124` text in light mode via `text-fg`, with `r` and `!` retaining high-contrast teal `#007369` via `text-accent`. |
| **L7** | Theme switching behavior | **DONE** | Inline script `THEME_BOOT` in `<head>` executes before paint to prevent FOUT, respects visitor system preference on first visit per owner decision, synchronizes `theme-color` meta tag on boot and on toggle, adds `aria-pressed` and `aria-label` to `ThemeToggle`. |
| **R12** | Payments | **DONE** | Confirmed strict PCI-DSS card data isolation via Razorpay hosted popup (zero card data touches client or server), verified refunds return to original payment method, and implemented automated `refundRazorpayPayment` API helper. |
| **R13** | Business registrations | **DONE** | Business registrations roadmap delivered to owner: Udyam Registration (free online MSME), Maharashtra Shops & Establishment (Gumasta) intimation, and Trademark filing for "Prynth" under Classes 40 & 20/21. |

---

## Owner Decisions Status

1. **S3 (COD fee):** Confirmed ₹39. **[DONE]**
2. **S5 (Zone shipping):** Confirmed Maharashtra (₹49) vs Rest of India (₹79). **[DONE]**
3. **S6 (Free shipping threshold):** Confirmed raised to ₹399. **[DONE]**
4. **G2 & R2 (Business phone):** Confirmed strictly email/WhatsApp; omitted from public markup. **[DONE]**
5. **G4 (Authorship & About):** Ray Kapadia and Supas Kumar (Co-Founders). **[DONE]**
6. **G7 (Social Profiles):** Instagram handle `@prynth07`. **[DONE]**
7. **R2 (Legal entity):** Unregistered Firm operated by Co-Founders. **[DONE]**
8. **R2 (Grievance officer):** Ray Kapadia (Co-Founder & Grievance Redressal Officer), `grievance@prynth.in`. **[DONE]**
9. **R4 (GST status):** Unregistered under GST; simplified commercial receipts. **[DONE]**
10. **R6 (Retention):** 30 days models/photos, 72h abandoned files, 8 years invoices under Section 44AA, 3 years grievances. **[DONE]**
11. **R7 (Refund policy):** Formulated custom reprint & refund policy with Zero-Flaw Guarantee and 48h defect reporting. **[DONE]**
12. **R13 (Business registrations):** Roadmap provided to owner for Udyam, Gumasta, and Trademark. **[DONE]**
13. **R14 (Legal review gate):** CA and lawyer review of exported policies and terms prior to launch. **[PENDING OWNER AUDIT]**
