# MediBook SA — Claude Code Instructions

> Two developers (Cayden + Dumel) building a multi-tenant SaaS booking platform for South African medical practices.
> Working directory: `C:\Users\hohls\Med`

---

## Supabase MCP Server

This project has the Supabase MCP server configured (`.mcp.json`, project scope). It connects directly to the live database `tjdibrpsmcphqnozelie`.

**To authenticate** (once per machine, in a regular terminal — not the IDE extension):
```bash
claude /mcp
# Select: supabase → Authenticate → authorize in browser with caydenhwork@gmail.com
```

**What this enables:**
- Run SQL queries and inspect live table data while debugging
- Apply migrations directly without pasting SQL into the Supabase dashboard
- Verify RLS policies are enforced correctly on the real DB
- Check `audit_log`, `appointments`, `availability_rules` etc. against real data
- Validate server actions actually wrote what they were supposed to
- Debug slot availability issues against live `availability_rules` rows (critical for M3)

**Note:** Both devs need to authenticate separately on their own machines.

---

## How We Work — Non-Negotiable Rules

1. **Plan before code.** For any non-trivial feature or change, output a short plan first and wait for approval before implementing. Never implement speculatively.
2. **No unsolicited changes.** Fix what was asked. Don't refactor, add error handling, or introduce abstractions that weren't requested.
3. **No new dependencies without asking.** Discuss before installing anything.
4. **Conventional commits:** `feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `docs:`
5. **Write Vitest tests for:** dates, times, availability calculations, money, and access control.
6. **Never log patient PII** — name, ID number, mobile, email, or medical information — in plain text anywhere.
7. **POPIA is a constraint on every line** touching patient data, not a feature to add later.
8. **No emojis as icons.** All icons use `lucide-react` components. Never use emoji characters as UI icons.
9. **DB schema changes** need both devs to agree and apply migrations. Discuss before touching `supabase/migrations/` or RLS.

---

## What We're Building

**MediBook SA** — patients find a medical practice on a map, see real availability, and book online 24/7. Practices (GPs, dentists, physios, specialists) pay R299–R1299/month for listing, dashboard, and automated reminders.

- **Practice staff** (owner / receptionist / doctor): manage appointments via dashboard
- **Patients**: browse on map, pick doctor + service, book slot, get confirmation
- Target: solo practitioners in Pretoria suburbs. 14-day free trial, no credit card required.

---

## Tech Stack (Locked)

Do not change any of these without team discussion.

| Layer | Technology |
|---|---|
| Framework | Next.js 15 App Router, TypeScript strict (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`) |
| Database | Supabase Postgres — project `tjdibrpsmcphqnozelie` (eu-north-1) |
| Auth | Supabase Auth, cookie-based via `@supabase/ssr` |
| ORM | Drizzle ORM (TypeScript types) + raw SQL migration files (for RLS, GIST, partial indexes) |
| Styling | Tailwind CSS v3 + shadcn/ui components |
| Icons | `lucide-react` only — never emoji |
| Validation | Zod + React Hook Form + `@hookform/resolvers` |
| Dates | `date-fns` + `date-fns-tz` — store UTC, display in `Africa/Johannesburg` (UTC+2, no DST) |
| Email | Resend + React Email (not yet wired) |
| Maps | Leaflet + react-leaflet + OpenStreetMap (free, no API key needed) |
| Geocoding | Nominatim (called at practice signup, stores lat/lng on practice row) |
| Payments | Paystack — Phase 3, not started |
| WhatsApp | 360dialog — Phase 2, not started |
| Tests | Vitest (unit) + Playwright (e2e, not yet written) |
| Lint/Format | Biome (replaces ESLint + Prettier — use `pnpm lint`) |
| Package manager | pnpm 11.1.2 |

---

## Local Development

```bash
pnpm install
pnpm approve-builds          # one-time interactive step per machine
cp .env.example .env.local   # fill in from Supabase dashboard

# Start dev server:
pnpm dev                     # port 3000 (after approve-builds)
# OR if blocked:
node node_modules/.bin/next.cmd dev --turbopack

pnpm test        # Vitest unit tests (44 passing)
pnpm typecheck   # tsc --noEmit
pnpm lint        # Biome
```

**Supabase dashboard:** `https://supabase.com/dashboard/project/tjdibrpsmcphqnozelie`

---

## Project Structure

```
app/
  (auth)/              Public auth pages — login, signup (patient/practice/admin)
  (dashboard)/         Protected dashboard (middleware guards /dashboard/**)
    dashboard/
      page.tsx         Today's appointments
      bookings/        All bookings list
      doctors/         Manage doctors (add-doctor-form.tsx)
      services/        Manage services (add-service-form.tsx)
      calendar/        Calendar view (UI stub)
  admin/               Platform admin panel (prospects, practices)
  book/[slug]/         Public 5-step booking flow (booking-steps.tsx)
  browse/              Practice map + list (browse-client.tsx)
    [slug]/            Practice detail page
  pricing/             Pricing page
  api/
    health/            GET → { status: "ok", database: "ok" }
    auth/signout/      POST → sign out handler
    places/search/     Nominatim / places search
  actions/
    auth.ts            signupPractice, signupPatient, login, logout
    bookings.ts        getAvailableSlots, createBooking
    doctors.ts         Create/update doctors
    services.ts        Create/update services
    prospects.ts       Prospect CRUD

components/
  ui/                  shadcn/ui: Button, Card, Input, Label, Badge + custom DateWheelPicker
  navbar.tsx           Top nav
  navbar-avatar.tsx    User avatar dropdown (Camera, LogOut, Shield, LayoutDashboard icons)
  dashboard/
    booking-calendar.tsx
    status-updater.tsx  Inline appointment status changer
    week-calendar.tsx
  map/practice-map.tsx  Leaflet map (SSR disabled via dynamic import)
  patient/
    patient-booking-calendar.tsx
    cancel-booking-btn.tsx

lib/
  supabase/
    client.ts          Browser Supabase client
    server.ts          SSR client (cookie-based) — use in server components & actions
    service.ts         Service role client — bypasses RLS, NEVER import in client components
    cached.ts          Cached queries (getCachedUser, getCachedPracticeUser)
  db/
    index.ts           Drizzle client
    schema/            Drizzle table definitions (one file per domain)
  sa/                  SA-specific utilities (see below)
  env.ts               Type-safe env with @t3-oss/env-nextjs + Zod
  utils.ts             clsx/cn helpers

supabase/migrations/   SQL migration files — apply in order via Supabase SQL editor
```

---

## Database — 14 Tables

| Table | Purpose |
|---|---|
| `practices` | One row per practice. Has `slug`, `settings` (JSONB), `latitude`/`longitude`, `verified` |
| `practice_users` | Links `auth.users` to practices with role (`owner`/`doctor`/`receptionist`). `accepted_at` must be non-null for RLS |
| `doctors` | Doctors within a practice. Optionally linked to `practice_users.user_id` |
| `services` | Services offered — `price_cents` (integer), `duration_minutes`, `requires_referral` |
| `availability_rules` | Weekly recurring schedule per doctor (day_of_week, start_time, end_time, buffer_minutes) |
| `availability_exceptions` | One-off overrides (closures, holiday hours, ad-hoc availability) |
| `patients` | One row per patient per practice — `popia_consent_at`, `deleted_at` (soft-delete), encrypted ID |
| `appointments` | Core booking record — GIST exclusion prevents double-booking |
| `appointment_status_history` | Immutable log of status changes (service role only) |
| `communications_log` | Every outbound email/WhatsApp — idempotent via partial unique index |
| `reminder_schedules` | Config for when to send reminders per practice |
| `audit_log` | Append-only POPIA audit trail — service role only, authenticated users cannot insert |
| `subscriptions` | One per practice — trial/active/past_due/cancelled |
| `webhook_events` | Idempotent inbound webhooks (Paystack, 360dialog) |

### Key Constraints (Never Remove)

- **GIST exclusion on `appointments`** — prevents `(doctor_id, tsrange(starts_at, ends_at))` overlap. Hard double-booking guard. Written in raw SQL — Drizzle can't express GIST.
- **`FORCE ROW LEVEL SECURITY`** on all 14 tables — applies even to superusers (POPIA requirement).
- **`SECURITY DEFINER` functions** — `get_my_practice_ids()` and `get_my_role(practice_id)` bypass RLS on `practice_users` to prevent circular policy evaluation.
- **`practice_id` denormalised** on `availability_rules`, `availability_exceptions`, `appointment_status_history` — avoids joins in every RLS policy check.
- **All money in integer cents** — never floats. Use `formatZAR(cents)` from `lib/sa/currency.ts`.
- **Patient hard-delete** — `USING (false)` for authenticated users. Only service role can hard-delete, and only after writing an audit log entry.

### Migrations (apply in order)

| File | Applied |
|---|---|
| `20260517000001_schema.sql` | ✅ |
| `20260517000002_rls.sql` | ✅ |
| `20260517000003_add_coordinates.sql` | ✅ |
| `20260517000004_performance_indexes.sql` | ✅ |
| `20260517000005_storage_avatars.sql` | ✅ |
| `20260517000006_prospects.sql` | ✅ |
| `20260517000007_verification.sql` | ✅ |

---

## Supabase Client Rules

| Client | File | When to use |
|---|---|---|
| Browser | `lib/supabase/client.ts` | Client components, browser-side mutations |
| SSR | `lib/supabase/server.ts` | Server components, server actions, route handlers |
| Service role | `lib/supabase/service.ts` | Cross-tenant writes, audit log, patient erasure, booking creation — **never in client components** |

Use `getCachedUser()` and `getCachedPracticeUser()` from `lib/supabase/cached.ts` in server components to avoid duplicate auth calls.

---

## SA Utilities (`lib/sa/`) — 44 Vitest Tests, All Passing

| Export | What it does |
|---|---|
| `validateIdNumber(id)` | Luhn checksum, DOB parse, gender/citizenship — SA ID format |
| `normalizeMobile(raw)` | Strips spaces/dashes, `0xx` → `+27xx`, E.164 format |
| `formatZAR(cents)` | Integer cents → `"R 1 234,00"` (SA locale, comma decimal) |
| `publicHolidaysZA(year)` | All SA public holidays including Easter, Family Day, observed Mondays |
| `isPublicHoliday(date)` | Boolean check |
| `MEDICAL_AID_SCHEMES` | 15 major SA medical aid scheme names |

---

## Architecture Decisions

1. **Service role for all cross-tenant writes.** Public booking (`/book/[slug]`) uses the service role scoped to the practice — patients never get an auth session that touches the DB directly.

2. **RLS is the security boundary.** The application layer is defence-in-depth. Even with a bug in app code, the DB won't leak cross-tenant data due to `FORCE ROW LEVEL SECURITY`.

3. **Buffer minutes are soft.** The GIST exclusion only prevents hard `tsrange` overlap. Buffer minutes are enforced only in `getAvailableSlots()`. Intentional — receptionists can still add walk-ins inside buffer windows.

4. **Drizzle for types, raw SQL for constraints.** Drizzle generates TypeScript types. Raw SQL handles GIST exclusion, partial unique indexes with `WHERE`, RLS policies, SECURITY DEFINER functions, storage setup.

5. **Geocoding at signup time.** `signupPractice` calls Nominatim and stores lat/lng. Non-fatal — if geocoding fails, the practice appears in lists but not on the map.

6. **All timestamps stored UTC, displayed in `Africa/Johannesburg`.** Use `date-fns-tz` with `Africa/Johannesburg` timezone. SA does not observe DST (always UTC+2).

---

## Booking Flow (`/book/[slug]`)

Five-step client-side state machine in `app/book/[slug]/booking-steps.tsx`:

1. **Doctor** — pick from active doctors
2. **Service** — pick a service (shows duration + price in ZAR)
3. **Date & time** — date picker → calls `getAvailableSlots()` server action
4. **Patient details** — first name, last name, email, mobile (must be SA format)
5. **Success** — shows reference number (`MB-YYMMDD-XXXX` format)

**Current limitation:** `getAvailableSlots()` uses a fixed 08:00–17:00 window. The `availability_rules` table is not yet wired up (M3).

---

## Milestone Status

| # | Milestone | Status |
|---|---|---|
| M1 | Foundation — scaffold, schema, RLS, clients, env | ✅ Done |
| M2 | SA utilities + tests (ID, mobile, ZAR, holidays, medical aids) | ✅ Done |
| M3 | Availability engine — `getAvailableSlots()` using `availability_rules` + 11 test cases | Next |
| M4 | Auth hardening — invite flow, cross-practice RLS test suite | Pending |
| M5 | Doctor & service management — Zod validation, full CRUD | Partial (basic UI done) |
| M6 | Public booking — tie to availability engine, POPIA consent checkbox | Partial (happy path done) |
| M7 | Admin calendar view | Pending |
| M8 | Patient management + POPIA (consent, export, erasure, ID encryption) | Pending |
| M9 | Email — Resend + React Email templates (confirmation, reminder, cancellation) | Pending |
| M10 | Reminder engine — pg_cron + Edge Function | Pending |
| M11 | Settings, audit log viewer, subscription status | Pending |
| M12 | CI (GitHub Actions), Playwright e2e, demo seed, hardening | Pending |

---

## POPIA Status

| Requirement | Status |
|---|---|
| Consent timestamp + version stored on patient creation | ✅ Schema done |
| No PII in server logs | ✅ By convention |
| Audit log schema (append-only, service role only) | ✅ Schema + RLS done |
| Right to erasure (service role hard-delete + audit entry) | ✅ Schema ready, action not built (M8) |
| Explicit consent checkbox shown to patient at booking | ❌ M6 |
| Patient ID number encrypted at rest (pgsodium) | ❌ M8 |
| Right to access (JSON data export) | ❌ M8 |

---

## Known Issues & Tech Debt

| # | Issue | Fix |
|---|---|---|
| 1 | `getAvailableSlots()` ignores `availability_rules` — fixed 8–17 window | M3 |
| 2 | No POPIA consent checkbox at booking | M6 |
| 3 | `normalizeMobile()` not used in `signupPatient` — manual conversion | Small refactor |
| 4 | `DATABASE_URL` pooler may fail for Drizzle direct queries | Investigate Session Pooler (port 5432) |
| 5 | `next@15.3.2` has CVE-2025-66478 | Upgrade before production |
| 6 | No Playwright e2e tests | M12 |
| 7 | Patient ID number encryption (pgsodium) not implemented | M8 |
