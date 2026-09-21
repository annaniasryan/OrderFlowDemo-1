# OrderFlow v4.0

A working prototype of OrderFlow — the distributor PO, sales, PPIC, production,
inventory, shipment and analytics control system described in
`OrderFlow_v4_Full_Module_Specification.docx`. All 20 modules from the spec's
module map are implemented end to end: User & Access Management, Dashboard,
Distributor Management, Product Master, Raw Material Master, Purchase Order,
PO Revision, Shipment Schedule, Production Requirement, Material Availability,
Production Scheduling, Production Actual, Finished Goods Inventory, Raw
Material Inventory, Material Request & Purchasing, Shipment & Cubication,
Delivery Order, Sales Monitoring, Reports & Analytics, and Audit & System
Settings.

Stack: **Next.js 14 (App Router) + TypeScript + Prisma + PostgreSQL +
Tailwind CSS**, using React Server Components and Server Actions (no separate
REST/GraphQL API layer, no client-side state library). Auth is a lightweight
custom credentials + signed-cookie session (no third-party auth vendor).

## ⚠️ Important: this was hand-built without `npm install`

This project's code was written directly (no scaffolding tool) inside a
sandbox whose network policy blocks the npm registry, so **`npm install`,
`next build` and `next dev` were never actually executed while building
this**. The code was checked as carefully as possible by hand and with a
standalone TypeScript compiler pass against stubbed type declarations, but
you should treat the very first `npm install && npm run dev` on your machine
as the real first test. If something doesn't compile, it's most likely a
small typo or an off-by-one in a Prisma field/relation name — check the error
message against `prisma/schema.prisma` first.

## Getting started locally

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up Postgres.** Any Postgres 13+ works — a local install, Docker, or
   a free hosted instance (Neon, Supabase, Railway all work fine and are also
   Vercel-compatible). Copy `.env.example` to `.env` and set `DATABASE_URL`
   and a random `SESSION_SECRET`:
   ```bash
   cp .env.example .env
   ```

3. **Create the schema and seed demo data**
   ```bash
   npm run db:push   # creates tables from prisma/schema.prisma
   npm run db:seed   # demo users, distributors, products, a PO walked through the full pipeline
   ```

4. **Run it**
   ```bash
   npm run dev
   ```
   Open http://localhost:3000 — you'll land on the login page.

### Demo accounts

All seeded accounts use the password `password123`:

| Role | Email |
|---|---|
| Super Admin | superadmin@orderflow.demo |
| Executive Viewer | exec@orderflow.demo |
| Sales Admin | salesadmin@orderflow.demo |
| PPIC | ppic@orderflow.demo |
| Head Production | production@orderflow.demo |
| Account Executive | ae@orderflow.demo |
| Sales Manager | salesmanager@orderflow.demo |
| Product Warehouse | fgwarehouse@orderflow.demo |
| Raw Material Warehouse | rmwarehouse@orderflow.demo |
| Purchasing | purchasing@orderflow.demo |
| Shipment Division | shipment@orderflow.demo |
| Distributor (Toko Makmur Jaya) | distributor@orderflow.demo |

The seed script walks one PO all the way through PO → Accept → Shipment
Confirmed → Production → FG Receiving → Cubication → Delivery Order, a second
PO sitting mid-pipeline (production scheduled, a material shortage visible on
the Material Availability board, an open Material Request), and two more POs
at Draft/Submitted so you can see the review workflow too.

## Deploying to Vercel

1. Push this project to a GitHub/GitLab/Bitbucket repo and import it in
   Vercel, **or** run `vercel` from this folder with the Vercel CLI.
2. Provision a Postgres database. Note that **Vercel Postgres no longer
   exists as a first-party product** — existing databases were migrated to
   Neon in December 2024, and new databases are provisioned through the
   Vercel Marketplace. In your project go to **Storage → Create Database**
   and pick a Postgres provider (Neon, Prisma Postgres and Supabase all
   work). The integration injects the connection environment variables into
   the project for you.
3. In the Vercel project's Environment Variables, confirm/set:
   - `DATABASE_URL` — the Postgres connection string. **Use the provider's
     pooled connection string** (for Neon, the host containing `-pooler`).
     Serverless functions open a connection per invocation, so an unpooled
     URL will exhaust the connection limit under any real traffic.
   - `SESSION_SECRET` — a long random string (`openssl rand -base64 32`)
4. Deploy. The `postinstall` script runs `prisma generate` automatically, and
   `build` runs `prisma generate && next build`.
5. After the first deploy, run the schema push and seed once against the
   production database (from your machine, with `DATABASE_URL` pointed at
   the hosted database):
   ```bash
   npx prisma db push
   npx tsx prisma/seed.ts
   ```
   (Or use `prisma migrate deploy` instead of `db push` if you'd rather keep
   a migration history — run `npx prisma migrate dev` locally first to
   generate the initial migration.)

## Architecture notes

- **Authorization**: every role/module permission is centralized in
  `src/lib/rbac.ts` and enforced **server-side** in every Server Action via
  `requireManage()` / the page-level `requireView()` guard — never only by
  hiding a button, per the spec's explicit requirement. Executive Viewer is
  granted view-everywhere / manage-nowhere by construction.
- **Distributor privacy boundary**: the Distributor role's `PERMISSIONS`
  entries simply omit every production/material/warehouse/purchasing module,
  and PO/PO-Revision queries are always scoped to the signed-in distributor's
  own `distributorId`. There is no code path that renders internal
  operational data into a distributor-visible page.
- **Stock balances** (`src/lib/stock.ts`) are always derived by summing the
  movement ledger (`FGMovement` / `RMMovement`), never stored/edited
  directly — matches spec section 13/14.
- **Key calculations** (`src/lib/calc.ts`) centralize every formula from
  spec section 6 (CBM/CTN, Need Production, Good Output, stock balance,
  shipment CBM/weight, target achievement, sales growth) so every module
  uses the exact same logic.
- **Audit log**: every mutating action writes to `AuditLog` via
  `src/lib/audit.ts`.
- **Workflow wiring** across modules (the spec's End-to-End Workflow,
  section 2) is implemented as transactional side effects inside Server
  Actions — e.g. accepting a PO creates its one Shipment; confirming a
  shipment date generates Production Requirements from current FG stock;
  completing a Production Actual creates the pending FG receiving line;
  generating a DO computes CBM/weight and flips the shipment to Shipped;
  confirming delivery posts the FG Product Out.

## What's simplified for a prototype

- BOM/raw-material ratios (`ProductMaterialRequirement`) are seeded with
  illustrative quantities — the spec explicitly allows these to be added
  later without changing module structure, which this schema supports.
- Sales Monitoring's top-level KPIs aren't distributor-scoped for the
  Account Executive role (the distributor/product breakdown tables below
  them are); a real deployment would scope every number consistently.
- "PO Revision" applies structured changes only for the requested shipping
  date; a free-text `requestedChanges` field carries any other requested
  change for a human to action, rather than auto-applying arbitrary line
  edits.
- No email/notification delivery is wired up — "notify Sales Admin/PPIC"
  requirements are satisfied by the data being immediately visible in their
  respective modules, not by an actual notification.
