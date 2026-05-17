# MediBook SA

Online booking SaaS for South African medical practices. Reduces no-shows, eliminates phone-tag, and automates WhatsApp + email reminders.

**Stack:** Next.js 15 · Supabase · Drizzle ORM · Tailwind CSS · shadcn/ui · Resend · Vitest · Playwright

---

## Quickstart (< 15 minutes)

### Prerequisites

- Node.js ≥ 20
- pnpm (`npm install -g pnpm`)
- [Supabase CLI](https://supabase.com/docs/guides/cli) (`scoop install supabase` on Windows, or `brew install supabase/tap/supabase`)
- A Supabase project (free tier works for development)

### 1. Clone and install

```bash
git clone <repo-url> medibook
cd medibook
pnpm install
pnpm rebuild @biomejs/biome esbuild sharp   # build native binaries
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in:

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same |
| `SUPABASE_SERVICE_ROLE_KEY` | Same (keep secret) |
| `DATABASE_URL` | Dashboard → Settings → Database → Connection string (use Transaction pooler, port 6543) |
| `RESEND_API_KEY` | resend.com → API Keys |

All other variables are optional for local development.

### 3. Run database migrations

```bash
# Apply schema + RLS policies to your Supabase project
pnpm db:migrate

# (Optional) seed a demo practice with realistic data
pnpm db:seed
```

> **Note:** Migrations in `supabase/migrations/` must be applied in order. `0001_schema.sql` creates tables; `0002_rls.sql` applies RLS policies and helper functions. Drizzle manages the schema; RLS is in raw SQL.

### 4. Start the dev server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

- Public booking: `http://localhost:3000/book/demo-practice` (after seeding)
- Admin dashboard: `http://localhost:3000/dashboard` (sign up first)
- Email preview: `pnpm email:dev` → http://localhost:3001

---

## Key commands

| Command | What it does |
|---|---|
| `pnpm dev` | Next.js dev server with Turbopack |
| `pnpm test` | Vitest unit + integration tests |
| `pnpm test:watch` | Vitest in watch mode |
| `pnpm test:e2e` | Playwright E2E tests (requires dev server) |
| `pnpm lint` | Biome lint check |
| `pnpm format` | Biome format (writes files) |
| `pnpm typecheck` | TypeScript strict check |
| `pnpm db:generate` | Generate Drizzle migration from schema changes |
| `pnpm db:migrate` | Apply pending migrations |
| `pnpm db:studio` | Drizzle Studio (visual DB explorer) |
| `pnpm db:seed` | Seed demo practice data |
| `pnpm email:dev` | React Email preview server |

---

## Project structure

```
app/              Next.js App Router pages
  (auth)/         Login, signup, invite acceptance
  (dashboard)/    Protected admin routes (/dashboard/*)
  book/[slug]/    Public booking flow (unauthenticated)
  api/            Route handlers (health, webhooks)

components/
  ui/             shadcn/ui components (auto-generated)
  dashboard/      Admin UI components
  booking/        Public booking flow components

lib/
  availability/   Slot generation engine + tests
  sa/             SA utilities (ID validation, mobile, ZAR, medical aids)
  db/             Drizzle schema + client + queries
  supabase/       Supabase clients (server/service/browser)
  communications/ Channel-agnostic email/WhatsApp dispatcher
  audit/          Audit log writer (service role only)
  env.ts          Type-safe env validation

supabase/
  migrations/     0001_schema.sql, 0002_rls.sql
  functions/      Edge Functions (reminder engine, comms worker)
  seed.ts         Demo data seed script

emails/           React Email templates
tests/
  integration/    RLS cross-practice isolation tests
  e2e/            Playwright happy-path tests
```

---

## Architecture decisions

### Multi-tenancy
Every domain table has `practice_id`. RLS policies enforce isolation at the database layer using two `SECURITY DEFINER` helper functions (`get_my_practice_ids()`, `get_my_role()`) to avoid circular evaluation when querying `practice_users` inside policies.

### Timezone
All `timestamptz` columns store UTC. The practice timezone (`Africa/Johannesburg`, UTC+2, no DST) is applied only at the display layer using `date-fns-tz`. Never use `new Date()` for business logic — always use the timezone-aware wrappers in `lib/sa/`.

### ID number encryption
SA ID numbers are encrypted with `pgsodium.crypto_aead_det_encrypt` (key managed by Supabase Vault). A SHA-256 hash (`id_number_hash`) is stored alongside for lookup without decryption.

### Availability engine
`lib/availability/index.ts` is a pure TypeScript function. It composes weekly rules → exceptions → existing bookings → buffer → slicing. Buffer minutes are enforced here (soft), not in the database exclusion constraint (which only prevents true overlaps).

### Cross-border data transfer (POPIA)
Patient data is stored in Supabase's EU region (eu-west-1, AWS Ireland). The EU is generally recognised as having adequate protection under POPIA Section 72. A data processing agreement with Supabase covers this transfer. Document this in your practice's POPIA compliance register.

---

## POPIA compliance summary

| Requirement | Implementation |
|---|---|
| Consent at collection | `patients.popia_consent_at` + `popia_consent_version` captured at booking |
| Audit trail | `audit_log` table — append-only, owner-visible only |
| ID number encryption | `pgsodium` AES-256 at rest; hash for lookup |
| Right to access | `/dashboard/settings/popia` → export all patient data as JSON |
| Right to erasure | Hard-delete via service role server action; audit event preserved |
| Data minimisation | Only fields actively used in Phase 1 collected |

---

## Security notes

- `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS entirely. It lives only in server-side code (`lib/supabase/service.ts`, Edge Functions). Never import this module in client code — `server-only` enforces this at build time.
- The public booking form uses a service-role server action with explicit `practice_id` scoping — not a direct client-to-database write.
- Cloudflare Turnstile + IP rate limiting protect the booking endpoint in production.

---

## CVEs and known issues

- `next@15.3.2` — CVE-2025-66478. Upgrade to the latest patched 15.x before deploying to production. Check https://nextjs.org/blog/CVE-2025-66478 for the patched version.
