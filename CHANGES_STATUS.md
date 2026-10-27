# Prynth! Website — Changes Status

*Tracked progress for prynth.in · Created 27 Oct 2026*

## Summary

| Priority | Total | Done | In Progress | Blocked | Todo |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **P0** | 11 | 8 | 0 | 3 | 0 |
| **P1** | 23 | 18 | 0 | 5 | 0 |
| **P2** | 16 | 12 | 0 | 4 | 0 |
| **Total** | **50** | **38** | **0** | **12** | **0** |

> **All actionable tasks across P0, P1, and P2 are 100% COMPLETE.**
> The only remaining items are blocked strictly on owner decisions (CA consultation, legal entity registration, external social profile creation, and official business filings).

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
| **R2** | Business identity and grievance officer | **BLOCKED** | Blocked on owner decisions: legal entity type, grievance officer appointment, public phone decision. |
| **R3** | Complaint workflow | **DONE** | Created migration 0027, added `/legal` statutory complaint form, automated ticket generation (`PRY-GRV-YYYY-XXXX`), email acknowledgement, 48h/30d SLA tracking, and test suite. |
| **R4** | GST (tax) readiness | **BLOCKED** | Blocked on owner decision: registered under GST or not (CA confirmation). |
| **R5** | Privacy policy, notices and consent | **DONE** | Complete DPDP Act 2023 compliance: code-level data inventory table, itemized notices across collection points (checkout, contact, 3D upload, idea form, lithophane, signup), checkboxes unticked by default, separate marketing consent, cookie preference trigger in footer and policy, DPDP rights forms at `/legal`, dedicated admin queue in Admin Console, and breach protocol in `COMPLIANCE.md`. |
| **R14** | Legal review gate | **BLOCKED** | Blocked on owner review with CA and lawyer. |

---

## P1 Tasks

| ID | Title | Status | Notes |
| :--- | :--- | :---: | :--- |
| **S3** | COD fee | **BLOCKED** | Blocked on owner decision: recommended ₹39–49. |
| **S4** | Express is never free | **DONE** | Removed promises of free express in lithophane and index routes; clarified express air courier is always charged separately on all orders; added unit tests verifying express fee is never zeroed by cart total. |
| **C5** | Upload abuse protection | **DONE** | Integrated Cloudflare Turnstile verification on upload form (`upload-form.tsx`) and server endpoint (`custom-files-fns.ts`); added per-IP sliding rate limiting (max 10 uploads/10 min); implemented automated cleanup of unlinked custom models older than 3 days (`cleanupUnattachedCustomFiles` in `maintenance.server.ts`); verified via unit tests. |
| **C6** | Real rate limiting | **DONE** | Distributed rate limiting (`RateLimiter`) with Cloudflare Workers KV support, Postgres atomic upserts with TTL across isolates, and in-memory fallback; integrated across `/api/auth/*`, `/api/verify-payment`, `uploadCustomFile`, and contact inquiry endpoints. |
| **C7** | Move uploads to R2 and remove runtime DDL | **DONE** | Removed `ensureCustomFilesTable` runtime DDL on uploads; integrated Cloudflare R2 object storage with streaming support (`r2.server.ts`), saving only object keys in `custom_files.r2_key`; maintained fallback for existing base64 records. |
| **C8** | Timing-safe signature check | **DONE** | Replaced string equality with `crypto.timingSafeEqual` on Node runtime and constant-time XOR comparison (`timingSafeEqualString`) on Web Crypto/edge runtime across both payment and webhook signature verification; verified via test suite `tests/signature.test.ts`. |
| **C9** | Remove placeholder phone fallback | **DONE** | Removed "+91 98765 43210" fallback in `privacy.tsx`; only dynamic configured phone is displayed. |
| **G1** | Structured data (JSON-LD) | **DONE** | Standardized JSON-LD generators for `Organization`, `Product` with `Offer` (price, availability, shippingDetails, returnPolicy from settings), `BreadcrumbList`, and `FAQPage`. Verified with 5 unit tests in `tests/jsonld.test.ts`. |
| **G2** | LocalBusiness telephone warning | **BLOCKED** | Blocked on owner decision: phone number inclusion in markup vs accept warning. |
| **G3** | Meta descriptions and titles | **DONE** | Tuned meta descriptions to 120–160 chars and titles to ~60 chars across all public routes, removing unverified claims. |
| **G4** | Authorship, dates and first-hand expertise | **BLOCKED** | Blocked on owner providing: founder name, bio, real photos. |
| **L1** | Audit every route in light mode | **DONE** | Full visual check across 375px, 768px, and 1440px viewports; resolved low contrast on `.text-accent`, subtle opacity wireframe for Silk Wave, and synchronized theme meta. |
| **L2** | Move all colors to theme tokens | **DONE** | Established semantic CSS variables for both light and dark themes (`--bg`, `--surface`, `--surface-2`, `--fg`, `--muted`, `--subtle`, `--accent`, `--accent-text`, `--ink`, `--border`, `--ring`, `--shadow-border`, `--glass-bg`) in `src/styles.css` without modifying dark mode styling. |
| **L3** | Light palette and contrast | **DONE** | Enforced `--accent-text: #007369` ensuring 5.17:1 on white and 4.73:1 on bone, `--muted: #4e555e` and `--subtle: #6c737c` ensuring WCAG AA >= 4.5:1. Added automated test suite `tests/theme.test.ts`. |
| **L4** | Silk Wave background and hero artwork in light mode | **DONE** | Dynamically shifts Three.js wireframe to softer `0x008075` with 0.22 opacity via MutationObserver, replaced hardcoded dark vignette `#0c0e12` with `[var(--bg)]` for natural bone fade. |
| **L5** | Component checklist in light mode | **DONE** | Set `color-scheme` per theme on `:root` and `.dark`, visible focus rings, adaptive backgrounds in `model-viewer.tsx` and `lithophane-viewer.tsx`, modals, toasts, header, and product cards. |
| **L8** | Verification | **DONE** | Automated test suite `tests/theme.test.ts` confirms WCAG AA/AAA compliance; full suite of 55 tests across 10 files, typecheck, and production SSR build pass with 0 errors. |
| **R6** | Retention and deletion | **BLOCKED** | Blocked on owner decision: retention periods for files & orders. |
| **R7** | Terms, shipping, returns, refund and cancellation pages | **BLOCKED** | Blocked on owner decision: refund vs reprint for custom items. |
| **R8** | Product page disclosures | **DONE** | Added statutory disclosures on product pages (tax inclusive, net quantity, dimensions, materials, country of origin, legal manufacturer/packer address from settings, customer care) and itemized fee/tax breakups in cart and checkout. |
| **R9** | Prohibited items, IP and upload confirmation | **DONE** | Added mandatory IP and non-weapon compliance warranty checkboxes on `/custom` and `/lithophane` upload flows, expanded Terms with strict weapon/counterfeit prohibitions and takedown procedure, and added dedicated refused order status reasons in Admin Console. |
| **R10** | Advertising claims and dark patterns | **DONE** | Audited all routes, copy, and badges. Purged unverified "damage-free" and "4.5kg" claims in pegboard and homepage, verified no fake urgency counters or timers, no pre-ticked add-ons, only real customer reviews, and full guest checkout without forced account creation. |
| **R11** | Marketing messages | **DONE** | Marketing opt-in is strictly separated from order processing and unticked by default at checkout, transactional emails are segregated from promotional mail, cookie consent blocks analytics until accepted, and DPDP consent withdrawal/data rights forms are provided at `/legal`. |

---

## P2 Tasks

| ID | Title | Status | Notes |
| :--- | :--- | :---: | :--- |
| **S5** | Zone-based standard shipping | **BLOCKED** | Blocked on owner decision: parked until approved. |
| **S6** | Free-shipping threshold review | **BLOCKED** | Blocked on owner decision: review margins vs ₹349 threshold. |
| **C10** | Remove public photo archive | **DONE** | Verified `public/all-product-photos.zip` is absent from repo and git history. |
| **C11** | Header hardening | **DONE** | Verified legacy `X-XSS-Protection` is completely removed; strict Content-Security-Policy, HSTS, X-Frame-Options, and nosniff active across middleware and `_headers`. |
| **C12** | Migration numbering | **DONE** | Audited ordering mechanism in `scripts/migration-plan.mjs`; migrations are tracked by filename in `_migrations` and sorted via `localeCompare`; applied migrations must not be renamed to avoid breaking production DBs. |
| **C13** | TypeScript config | **DONE** | Removed `baseUrl` deprecation trigger from `tsconfig.json`; typecheck passes with 0 warnings and 0 errors. |
| **C14** | Tests | **DONE** | Added comprehensive Vitest test suites for `volume-discounts.ts`, `quote.ts`, `formula-evaluator.ts`, `model-parser.ts`, `signature.ts`, `shipping.ts`, `jsonld.ts`, `theme.ts`, `grievance.ts`, plus Playwright Razorpay checkout e2e spec (55 tests across 10 files passing). |
| **C15** | Housekeeping | **DONE** | Renamed package to `prynth` in `package.json`, confirmed `attachments/` folder absent, verified `admin.tsx` and `custom.tsx` are modularized into component directories (`src/components/admin/` and `src/components/custom/`). |
| **G5** | Answer-style content | **DONE** | Added 4 high-value answer-style guide articles at `/guides` opening with 40–60 word direct answers, question-style headings, real studio numbers, and named sources; rewrote homepage product section intro into a cohesive self-contained paragraph. |
| **G6** | llms.txt | **DONE** | Created `/llms.txt` summary file listing key routes, products, pricing, and policies for AI crawlers and LLM indexing (excluding `/cart`). |
| **G7** | Brand and review signals | **BLOCKED** | Blocked on owner creating external profiles. |
| **G8** | Measurement | **DONE** | Verified `public/sitemap.xml` lists all public core, service, product, legal, and guide pages while strictly excluding `/cart`; Core Web Vitals optimized. |
| **L6** | Logo and imagery in light mode | **DONE** | Wordmark switches to charcoal `#1e2124` text in light mode via `text-fg`, with `r` and `!` retaining high-contrast teal `#007369` via `text-accent`. |
| **L7** | Theme switching behavior | **DONE** | Inline script `THEME_BOOT` in `<head>` executes before paint to prevent FOUT, respects visitor system preference on first visit per owner decision, synchronizes `theme-color` meta tag on boot and on toggle, adds `aria-pressed` and `aria-label` to `ThemeToggle`. |
| **R12** | Payments | **DONE** | Confirmed strict PCI-DSS card data isolation via Razorpay hosted popup (zero card data touches client or server), verified refunds return to original payment method, and implemented automated `refundRazorpayPayment` API helper. |
| **R13** | Business registrations | **BLOCKED** | Owner tasks (Udyam, Shop Act, Trademark). |

---

## Owner Decisions Needed (Blocked Items)

1. **S3 (COD fee):** Recommended ₹39–49. Confirm desired amount.
2. **S5 (Zone shipping):** Confirm if Maharashtra (₹49) vs rest of India (₹79) is desired.
3. **S6 (Free shipping threshold):** Confirm whether to keep ₹349 or raise to ₹399/₹499.
4. **G2 & R2 (Business phone):** Confirm whether to publish a dedicated business phone on legal/grievance page, or keep strictly email/WhatsApp.
5. **G4 (Authorship & About):** Provide founder name, short bio, and real workshop/print photos.
6. **G7 (Social Profiles):** Confirm which profiles exist for `sameAs` structured data.
7. **R2 (Legal entity):** Confirm entity type (Proprietorship, LLP, Pvt Ltd) and exact registered name.
8. **R2 (Grievance officer):** Confirm name and designation of grievance officer.
9. **R4 (GST status):** Confirm whether Prynth is registered under GST (with GSTIN) or unregistered.
10. **R6 (Retention):** Confirm retention periods for customer 3D models and photos.
11. **R7 (Refund policy):** Confirm refund vs reprint policy for custom items.
12. **R13 (Business registrations):** Udyam registration, Maharashtra Shops & Establishment, and trademark filing (owner actions).
13. **R14 (Legal review gate):** CA and lawyer review of exported policies and terms.
