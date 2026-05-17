# MediBook SA — Full Project Context

> Use this document to brief an AI assistant or onboard a new team member.  
> Working directory: `C:\Users\hohls\Med`  
> Two developers building this together.

---

## What We're Building

**MediBook SA** is a multi-tenant SaaS booking platform for South African medical practices — GPs, specialists, dentists, physios. Practices pay R299–R1299/month to get listed, manage their doctors and services, and let patients book online 24/7. The system sends automated email (and eventually WhatsApp) appointment reminders to reduce no-shows.

**The two user types:**
- **Practice staff** (owner / receptionist / doctor) — manage the practice via a dashboard
- **Patients** — browse practices on a map, pick a doctor and service, book a slot, receive confirmation

**Business context:** Initial target is solo practitioners in Pretoria suburbs. 14-day free trial, no credit card. Paystack billing is Phase 3 and not built yet.

---

## Tech Stack (locked — do not change without team discussion)

| Layer | Technology |
|---|---|
| Framework | Next.js 15 App Router, TypeScript strict mode (`exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`) |
| Database | Supabase Postgres (hosted, `tjdibrpsmcphqnozelie`, eu-north-1) |
| Auth | Supabase Auth (cookie-based via `@supabase/ssr`) |
| ORM | Drizzle ORM for types + raw SQL migration files for constraints RLS can't express |
| Styling | Tailwind CSS v3 + shadcn/ui components |
| Validation | Zod + React Hook Form + `@hookform/resolvers` |
| Dates | `date-fns` + `date-fns-tz` — all storage in UTC, display in `Africa/Johannesburg` (UTC+2, no DST) |
| Email | Resend + React Email (not yet wired up) |
| Maps | Leaflet + react-leaflet + OpenStreetMap (free, no API key) |
| Geocoding | Nominatim API (called during practice signup, result stored as lat/lng) |
| Payments | Paystack — Phase 3, not started |
| WhatsApp | 360dialog — Phase 2, not started |
| Tests | Vitest (unit) + Playwright (e2e, not yet written) |
| Lint/Format | Biome (replaces ESLint + Prettier) |
| Package manager | pnpm 11.1.2 |

**Supabase project:** `https://tjdibrpsmcphqnozelie.supabase.co`  
**Dashboard:** `https://supabase.com/dashboard/project/tjdibrpsmcphqnozelie`

---

## How to Run Locally

```bash
# First time on a new machine:
pnpm install
pnpm approve-builds   # interactive — approve all packages with build scripts

# Start dev server (pnpm dev is blocked by build-script approval on some machines):
node node_modules/.bin/next.cmd dev --turbopack
# OR after approve-builds is done:
pnpm dev

# Run tests:
pnpm test

# Type check:
pnpm typecheck

# Lint:
pnpm lint
```

**Environment:** copy `.env.example` → `.env.local` and fill in values.  
Real credentials are already in `.env.local` (gitignored).

---

## Database Architecture

### The 14 Tables

| Table | Purpose |
|---|---|
| `practices` | One row per practice. Has `slug` (URL-safe unique name), `settings` (JSONB), `latitude`/`longitude` for map |
| `practice_users` | Links auth users to practices with a role (`owner`, `doctor`, `receptionist`). `accepted_at` must be non-null for RLS to count |
| `doctors` | Doctors within a practice. Optionally linked to a `practice_users` row via `user_id` |
| `services` | Services offered (e.g. "General Consultation", "Flu Shot"). Has `price_cents`, `duration_minutes` |
| `availability_rules` | Weekly recurring schedule per doctor (day_of_week, start_time, end_time, `buffer_minutes`) |
| `availability_exceptions` | One-off overrides — closed dates, holiday hours, ad-hoc availability |
| `patients` | One row per patient per practice (not global). Has `popia_consent_at`, `deleted_at` (soft-delete), encrypted ID number |
| `appointments` | Core booking record. Has GIST exclusion constraint preventing double-booking per doctor |
| `appointment_status_history` | Immutable log of every status change. No authenticated INSERT (service role only) |
| `communications_log` | Every outbound message (email/WhatsApp). Idempotent via partial unique index |
| `reminder_schedules` | Configuration for when to send reminders per practice |
| `audit_log` | Append-only POPIA audit trail. Authenticated users cannot insert (service role only) |
| `subscriptions` | One per practice, tracks trial/active/past_due/cancelled |
| `webhook_events` | Idempotent store for inbound webhooks (Paystack, 360dialog). No authenticated access |

### Key Constraints
- **GIST exclusion on `appointments`** — prevents `(doctor_id, tsrange(starts_at, ends_at))` overlap. This is the hard double-booking guard. Written in raw SQL (Drizzle can't express it).
- **`FORCE ROW LEVEL SECURITY`** on all 14 tables — applies even to table owners and superusers (POPIA requirement).
- **`SECURITY DEFINER` functions** — `get_my_practice_ids()` and `get_my_role(practice_id)` query `practice_users` bypassing its own RLS. This prevents circular evaluation: without them, the RLS on `practice_users` would be applied while checking the policy on `practice_users`, causing silent empty results.
- **`practice_id` denormalised** on `availability_rules`, `availability_exceptions`, `appointment_status_history` — avoids a join in every RLS policy evaluation.
- **All money in integer cents** — never floats. `formatZAR(cents)` in `lib/sa/currency.ts`.
- **Patient hard-delete is POPIA-only** — `USING (false)` on the authenticated DELETE policy. Only the service role can hard-delete, and only after writing an audit log entry.

### Migrations

All SQL is in `supabase/migrations/`. Apply via Supabase SQL Editor (Supabase CLI link requires a personal access token we haven't set up).

| File | Applied? | What it does |
|---|---|---|
| `20260517000001_schema.sql` | ✅ Applied | All tables, enums, constraints, GIST exclusion, indexes, triggers |
| `20260517000002_rls.sql` | ✅ Applied | SECURITY DEFINER helpers + all RLS policies |
| `20260517000003_add_coordinates.sql` | ✅ Applied | `latitude` + `longitude` columns on `practices` |
| `20260517000004_performance_indexes.sql` | ✅ Applied | RLS speed index on `practice_users`, browse/appointment/comms indexes |
| `20260517000005_storage_avatars.sql` | ✅ Applied | Avatars storage bucket + storage policies (idempotent) |

---

## What's Built (Current State)

### Pages & Routes

```
/                          Landing page — "I'm a Patient" vs "I Run a Practice"
/login                     Unified email+password login, role-aware redirect
/signup/practice           Practice owner signup — creates user + practice + geocodes address
/signup/patient            Patient signup — creates Supabase auth user
/browse                    Map + list of all practices (Leaflet, OpenStreetMap)
/browse/[slug]             Practice detail — doctors, services, "Book Now" CTA
/book/[slug]               5-step booking flow (see below)
/dashboard                 Today's appointments, status updater
/dashboard/doctors         Add and manage doctors
/dashboard/services        Add and manage services
/dashboard/bookings        All bookings list
/api/health                Returns { status: "ok", checks: { database: "ok" } }
```

### Booking Flow (`/book/[slug]`)

Five steps implemented as a client-side state machine in `app/book/[slug]/booking-steps.tsx`:

1. **Doctor** — pick from the practice's active doctors
2. **Service** — pick a service (shows duration + price)
3. **Date & time** — date picker → fetches available slots via server action
4. **Patient details** — first name, last name, email, mobile
5. **Success** — shows reference number (format: `MB-YYMMDD-XXXX`)

**Current limitation:** slot generation uses a fixed 08:00–17:00 window with no public holidays, no doctor-specific hours, no buffer minutes. The `availability_rules` table exists but isn't wired up yet (M3).

### Server Actions

| File | Functions |
|---|---|
| `app/actions/auth.ts` | `signupPractice` (creates user + practice + geocodes), `signupPatient`, `login` (role-aware redirect), `logout` |
| `app/actions/bookings.ts` | `getAvailableSlots` (fixed 8–17 window, skips weekends, checks existing appointments), `createBooking` (upserts patient, creates appointment, returns reference) |
| `app/actions/doctors.ts` | Create/update doctor records |
| `app/actions/services.ts` | Create/update service records |

### SA Utilities (`lib/sa/`)

All functions are pure, fully tested (44 Vitest tests, all passing):

| Export | What it does |
|---|---|
| `validateIdNumber(id, referenceDate?)` | Luhn checksum, DOB parse, gender + citizenship extraction |
| `normalizeMobile(raw)` | Strips spaces/dashes, converts `0xx` → `+27xx`, validates E.164 |
| `formatZAR(cents)` | Integer cents → `"R 1 234,00"` (SA locale, comma decimal) |
| `publicHolidaysZA(year)` | Returns all SA public holidays incl. Easter, Family Day, observed Mondays |
| `isPublicHoliday(date)` | Boolean check |
| `MEDICAL_AID_SCHEMES` | Static list of 15 major SA medical aid schemes |

### Components

```
components/
  ui/                      shadcn/ui: Button, Card, Input, Label, Badge
  navbar.tsx               Top nav with login/dashboard links
  navbar-avatar.tsx        User avatar with dropdown
  supabase-provider.tsx    Client-side Supabase context
  map/practice-map.tsx     Leaflet map with custom SVG pins, fly-to-selected, popups
  dashboard/
    logout-button.tsx
    status-updater.tsx     Inline appointment status changer
```

---

## Milestone Status

| # | Milestone | Status |
|---|---|---|
| M1 | Foundation — scaffold, schema, RLS, clients, env | ✅ Done |
| M2 | SA utilities + tests (ID, mobile, ZAR, holidays, medical aids) | ✅ Done |
| M3 | Availability engine — `getAvailableSlots` using `availability_rules` table + 11 test cases | 🔲 Next |
| M4 | Auth hardening — invite flow, cross-practice RLS test suite | 🔲 Pending |
| M5 | Doctor & service management — proper Zod validation, full CRUD | 🟡 Partial (basic UI done) |
| M6 | Public booking — wire to availability engine, block public holidays, POPIA consent checkbox | 🟡 Partial (happy path done, no rules engine) |
| M7 | Admin calendar view | 🔲 Pending |
| M8 | Patient management + POPIA (consent, JSON export, erasure) | 🔲 Pending |
| M9 | Email — Resend + React Email (confirmation, reminder, cancellation templates) | 🔲 Pending |
| M10 | Reminder engine — pg_cron + Edge Function | 🔲 Pending |
| M11 | Settings page, audit log viewer, subscription status | 🔲 Pending |
| M12 | CI (GitHub Actions), Playwright e2e tests, demo seed data, hardening | 🔲 Pending |

---

## Key Architecture Decisions

1. **Service role for all cross-tenant writes.** Public booking (`/book/[slug]`) uses the service role scoped to the practice — patients never get an authenticated session that touches the DB directly.

2. **RLS is the security boundary, not the application layer.** Every table has `ENABLE` + `FORCE` RLS. Even if a bug exists in application code, the DB won't leak cross-tenant data.

3. **Buffer minutes are soft.** The GIST exclusion constraint only prevents hard overlap of `(doctor_id, tsrange)`. Buffer minutes are enforced by the slot generation function only. This is intentional — a walk-in can still be added inside the buffer window by a receptionist.

4. **Drizzle for types, raw SQL for constraints.** Drizzle generates the TypeScript schema types. Raw SQL migration files handle: GIST exclusion, partial unique indexes with WHERE clauses, RLS policies, SECURITY DEFINER functions, storage bucket setup. This split is documented with comments in the schema files.

5. **Geocoding at signup time.** When a practice signs up, the server action calls Nominatim (free OpenStreetMap geocoder) and stores `latitude`/`longitude` on the practice row. This is non-fatal — if geocoding fails, the practice appears in the list but not on the map.

6. **`pnpm dev` workaround.** pnpm 11 blocks build scripts until `pnpm approve-builds` is run interactively (once per machine). After that, `pnpm dev` works normally. The dev server runs on port 3000.

---

## Known Issues & Tech Debt

| Issue | Impact | Status |
|---|---|---|
| Booking ignores `availability_rules` — fixed 8–17 window | Practices can't set custom hours | Fix in M3 |
| No POPIA consent checkbox in booking flow | Compliance gap (consent is stored but not explicitly shown to patient) | Fix in M6 |
| `normalizeMobile()` from `lib/sa/` not used in `signupPatient` action — manual conversion | Minor inconsistency | Small refactor |
| `DATABASE_URL` pooler may fail for Drizzle direct queries | Needed for M3+ if we use Drizzle instead of Supabase JS | Investigate |
| `next@15.3.2` has CVE-2025-66478 | Security | Upgrade before production |
| No e2e tests yet | Test coverage gap | M12 |
| Patient ID number encryption (pgsodium) not implemented | Schema supports it, no UI/action for it | M8 |

---

## POPIA Status

| Requirement | Done? |
|---|---|
| Consent timestamp + version stored on patient creation | ✅ (`popia_consent_at`, `popia_consent_version`) |
| No PII in server logs | ✅ By convention |
| Audit log schema (append-only, service role only) | ✅ Schema + RLS done |
| Explicit consent checkbox shown to patient | ❌ M6 |
| Patient data encrypted at rest (ID number via pgsodium) | ❌ M8 |
| Right to erasure (hard-delete via service role + audit entry) | ❌ M8 |
| Right to access (JSON data export) | ❌ M8 |

---

## How We Work

- **Plan before code.** For any non-trivial feature, write a short plan and wait for both devs to agree before implementing.
- **Conventional commits:** `feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `docs:`
- **Never install a new dependency without discussing it first.**
- **Write Vitest tests for:** anything involving dates, times, availability, money, or access control.
- **POPIA is a constraint, not a feature** — it applies to every line touching patient data.
- **Never log patient PII** (name, ID number, mobile, email) in plain text.
- **DB schema changes** — always discuss before touching migrations or RLS. Both devs need to apply migrations to their Supabase project.
