# Prynth! Website — Changes Status

*Tracked progress for prynth.in · Created 27 Oct 2026*

## Summary

| Priority | Total | Done | In Progress | Blocked | Todo |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **P0** | 11 | 3 | 1 | 3 | 4 |
| **P1** | 18 | 0 | 0 | 4 | 14 |
| **P2** | 13 | 0 | 0 | 4 | 9 |
| **Total** | **42** | **3** | **1** | **11** | **27** |

---

## P0 Tasks (Highest Priority)

| ID | Title | Status | Notes |
| :--- | :--- | :---: | :--- |
| **S1** | Make every shipping amount come from settings | **DONE** | Audited all hardcoded shipping/COD amounts; bound cart, pegboard, shipping policy, checkout, and admin defaults to dynamic site settings. |
| **S2** | No COD for custom and lithophane orders | **DONE** | Implemented client-side exclusion of COD and user notice when custom prints, lithophanes, or configured pegboards are in cart; strictly rejected on server-side in createRazorpayOrder. |
| **C1** | Secrets hygiene | **DONE** | Verified .env/.env.* in .gitignore; 0 commits in git history contain .env; verified no secrets in source, wrangler.toml, or public/; owner reminded to rotate credentials if external zip was shared. |
| **C2** | Lock down customer file downloads | **IN PROGRESS** | Switching to `crypto.randomUUID()`, requiring admin session, `Cache-Control: private, no-store`, and removing CORS wildcard. |
| **C3** | Deduplicate uploads by content hash | **TODO** | New migration for `content_hash` column, SHA-256 calculation & unique constraint. |
| **C4** | Razorpay webhook | **TODO** | New `/api/razorpay-webhook` route, signature check, idempotent fulfillment. |
| **R1** | One source for legal and business details | **TODO** | Admin settings group for legal details, checklist & centralized consumption. |
| **R2** | Business identity and grievance officer | **BLOCKED** | Blocked on owner decisions: legal entity type, grievance officer appointment, public phone decision. |
| **R3** | Complaint workflow | **TODO** | Legal page complaint form, ticket generation, 48h/1mo SLA tracking in admin. |
| **R4** | GST (tax) readiness | **BLOCKED** | Blocked on owner decision: registered under GST or not (CA confirmation). |
| **R14** | Legal review gate | **BLOCKED** | Blocked on owner review with CA and lawyer. |

---

## P1 Tasks

| ID | Title | Status | Notes |
| :--- | :--- | :---: | :--- |
| **S3** | COD fee | **BLOCKED** | Blocked on owner decision: recommended ₹39–49. |
| **S4** | Express is never free | **TODO** | Ensure express shipping is never zeroed out by free shipping threshold. |
| **C5** | Upload abuse protection | **TODO** | Cloudflare Turnstile, IP limits, unlinked files cleanup. |
| **C6** | Real rate limiting | **TODO** | KV / Durable Object / Cloudflare rate-limiting. |
| **C7** | Move uploads to R2 and remove runtime DDL | **TODO** | R2 storage binding, remove `CREATE TABLE IF NOT EXISTS`. |
| **C8** | Timing-safe signature check | **TODO** | `timingSafeEqual` for Razorpay signatures. |
| **C9** | Remove placeholder phone fallback | **TODO** | Remove "+91 98765 43210" fallback in privacy.tsx. |
| **G1** | Structured data (JSON-LD) | **TODO** | Organization, Product with Offer, Breadcrumbs, FAQPage. |
| **G2** | LocalBusiness telephone warning | **BLOCKED** | Blocked on owner decision: phone number inclusion in markup vs accept warning. |
| **G3** | Meta descriptions and titles | **TODO** | 120-160 char descriptions, ~60 char titles across all routes. |
| **G4** | Authorship, dates and first-hand expertise | **BLOCKED** | Blocked on owner providing: founder name, bio, real photos. |
| **L1** | Audit every route in light mode | **TODO** | Full visual check of light mode across viewports. |
| **L2** | Move all colors to theme tokens | **TODO** | Semantic CSS variables for light & dark themes. |
| **L3** | Light palette and contrast | **TODO** | WCAG AA 4.5:1 / 3:1 contrast compliance in light mode. |
| **L4** | Silk Wave background and hero artwork in light mode | **TODO** | Ensure light mode wave and contrast pass legibility tests. |
| **L5** | Component checklist in light mode | **TODO** | Header, modals, buttons, forms, configurators in light theme. |
| **L8** | Verification | **TODO** | Playwright & accessibility score tests >= 95. |
| **R6** | Retention and deletion | **BLOCKED** | Blocked on owner decision: retention periods for files & orders. |
| **R7** | Terms, shipping, returns, refund and cancellation pages | **BLOCKED** | Blocked on owner decision: refund vs reprint for custom items. |
| **R8** | Product page disclosures | **TODO** | Tax inclusive pricing, origin, pack size, seller info. |
| **R9** | Prohibited items, IP and upload confirmation | **TODO** | Terms checkbox, IP complaint email, weapon/infringement refusal. |
| **R10** | Advertising claims and dark patterns | **TODO** | Audit claims, badges, real stock numbers only. |
| **R11** | Marketing messages | **TODO** | Explicit opt-in, unsubscribe mechanism, order updates separation. |

---

## P2 Tasks

| ID | Title | Status | Notes |
| :--- | :--- | :---: | :--- |
| **S5** | Zone-based standard shipping | **BLOCKED** | Blocked on owner decision: parked until approved. |
| **S6** | Free-shipping threshold review | **BLOCKED** | Blocked on owner decision: review margins vs ₹349 threshold. |
| **C10** | Remove public photo archive | **TODO** | Delete `public/all-product-photos.zip`. |
| **C11** | Header hardening | **TODO** | Remove legacy `X-XSS-Protection`. |
| **C12** | Migration numbering | **TODO** | Audit migration order safely without breaking applied migrations. |
| **C13** | TypeScript config | **TODO** | Fix deprecation warnings in `tsconfig.json`. |
| **C14** | Tests | **TODO** | Vitest for core calculators, Razorpay signature, models. |
| **C15** | Housekeeping | **TODO** | Rename package to `prynth`, remove `attachments/`, split massive routes. |
| **G5** | Answer-style content | **TODO** | Guide pages with direct 40-60 word answers. |
| **G6** | llms.txt | **TODO** | Add `/llms.txt` summary file. |
| **G7** | Brand and review signals | **BLOCKED** | Blocked on owner creating external profiles. |
| **G8** | Measurement | **TODO** | Verify sitemap, CWV, audit scores. |
| **L6** | Logo and imagery in light mode | **TODO** | Dark wordmark in light mode, check contrast. |
| **L7** | Theme switching behavior | **TODO** | Inline script in `<head>` to prevent flash of unstyled theme, system default. |
| **R12** | Payments | **TODO** | Verify no card data stored, gateway refund compliance. |
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
