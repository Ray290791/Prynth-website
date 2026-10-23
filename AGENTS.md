# Prynth! Project & Agent Guidelines

**Prynth** (https://prynth.in) is an on-demand 3D printing studio based in Mumbai, India, selling ready-made functional desk and home accessories and offering custom 3D printing, CAD modeling, and custom lithophane services shipped across India.

---

## 1. Architecture & Tech Stack

- **Framework:** [TanStack Start](https://tanstack.com/start) with [TanStack React Router](https://tanstack.com/router) and React 19.
- **Hosting & Runtime:** **Cloudflare Workers** via Nitro preset (`cloudflare-module`), configured via [`wrangler.toml`](./wrangler.toml) for `prynth.in` and `www.prynth.in`.
- **Database:** **Neon Serverless PostgreSQL** (`@neondatabase/serverless`).
  - In production / Cloudflare Workers: Stateless HTTP fetch queries via `neon(dbUrl)` to prevent worker I/O connection locking.
  - Queries must strictly respect Cloudflare's subrequest limit (max 50 HTTP subrequests per Worker invocation). Routine read loaders must never execute unbounded loops or auto-seeding sweeps.
  - Local fallback: Embedded PGLite (`@electric-sql/pglite`) for offline / preview dev.
- **Styling:** Tailwind CSS v4 (`@tailwindcss/vite`), Radix UI primitives, Lucide React icons, and Sonner toasts.
- **Payments:** Razorpay Payments Gateway (Standard Checkout modal + server-side HMAC signature verification).
- **Transactional Email:** Resend (`resend`) for order confirmations, custom quote receipts, and customer notifications.
- **Authentication:** Better Auth (`better-auth`) with Google OAuth and Email/Password credentials.

---

## 2. Directory Structure

```
├── public/                 # Static assets (favicons, product images, 3D samples)
├── migrations/             # SQL schema migrations (applied via scripts/migrate.mjs)
├── server/
│   └── middleware/         # Nitro server-side middlewares (Security headers, canonical hosts)
├── scripts/
│   ├── migrate.mjs         # Production migration runner executed on build
│   ├── migration-plan.mjs  # Migration file resolution & order planner
│   └── check-db.ts         # Diagnostic script for database connectivity
├── src/
│   ├── components/         # Reusable UI components, Modals, 3D viewers, Admin tabs
│   ├── lib/                # Business logic, server functions (createServerFn), auth, DB client
│   └── routes/             # TanStack Router route definitions (__root, index, shop, custom, etc.)
└── wrangler.toml           # Cloudflare Workers deployment configuration & env bindings
```

---

## 3. Key Principles for AI Pair Programmers

1. **Conservative & Production-Ready:** Always prioritize user data safety, checkout reliability, and low serverless latency. Never trade working e-commerce functionality for experimental patterns.
2. **Subrequest Discipline:** Because Cloudflare Workers restricts subrequests (external fetches), server functions called during SSR (loaders in `__root.tsx`, `index.tsx`, etc.) must run in single, optimized SQL queries.
3. **Database Migrations:** Schema changes belong in `migrations/` as numbered SQL files (e.g. `0005_*.sql`). Never alter production tables with ad-hoc runtime migrations during normal user traffic.
4. **Environment Variables:**
   - Production secrets (`DATABASE_URL`, `RAZORPAY_KEY_SECRET`, `RESEND_API_KEY`, `BETTER_AUTH_SECRET`) are configured in Cloudflare Workers / Wrangler secrets.
   - Public credentials (`RAZORPAY_KEY_ID`, `BETTER_AUTH_URL`) are bound in `wrangler.toml`.
   - Never log secrets, passwords, or private API keys.

---

## 4. Development Workflow

- **Start Dev Server:** `npm run dev` (Runs on `http://localhost:8080`)
- **Type Check:** `npm run typecheck` (`tsc --noEmit`)
- **Production Build:** `npm run build` (`vite build && npm run db:migrate`)
- **Deploy to Cloudflare:** `npm run deploy` (`npx wrangler deploy`)
