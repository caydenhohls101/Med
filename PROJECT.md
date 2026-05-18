# MediBook SA — Project Tracker

> Multi-tenant SaaS booking platform for South African medical practices.  
> R299–R1299/month. Target: solo GPs, specialists, dentists, physios in Pretoria suburbs.

---

## The Goal

Patients can find a practice on the map, see real availability, and book an appointment without calling. Practices get fewer no-shows through automated WhatsApp + email reminders and a simple reception dashboard.

**Phase 1 scope:** One owner + optional receptionist per practice. Public booking flow. Email reminders. POPIA-compliant. No billing yet.

---

## Quick Start (new machine)

```bash
git clone <repo>
cd Med
pnpm install
pnpm approve-builds          # one-time interactive step, approve all
cp .env.example .env.local   # fill in values from Supabase dashboard
node node_modules/.bin/next.cmd dev --turbopack   # port 3000
```

Supabase project: `tjdibrpsmcphqnozelie` (eu-north-1)  
Dashboard: https://supabase.com/dashboard/project/tjdibrpsmcphqnozelie

---

## Stack (locked — do not change without discussion)

| Layer | Choice |
|---|---|
| Framework | Next.js 15 App Router + TypeScript strict |
| Database | Supabase Postgres + RLS + Auth |
| ORM | Drizzle (types) + raw SQL migrations |
| Styling | Tailwind CSS + shadcn/ui |
| Validation | Zod + React Hook Form |
| Dates | date-fns + date-fns-tz (Africa/Johannesburg) |
| Email | Resend + React Email |
| Payments | Paystack (Phase 3 — not yet) |
| WhatsApp | 360dialog (Phase 2 — not yet) |
| Tests | Vitest (unit) + Playwright (e2e) |
| Lint/Format | Biome (replaces ESLint + Prettier) |
| Package manager | pnpm 11 |

---

## What's Built Right Now

### Pages

| Route | Status | Notes |
|---|---|---|
| `/` | ✅ Done | Landing, "Patient" vs "Practice" CTA |
| `/login` | ✅ Done | Email + password, redirects by role |
| `/signup/practice` | ✅ Done | Creates user + practice + geocodes address |
| `/signup/patient` | ✅ Done | Creates Supabase auth user |
| `/browse` | ✅ Done | Map + list of practices (Leaflet / OpenStreetMap) |
| `/browse/[slug]` | ✅ Done | Practice detail page |
| `/book/[slug]` | ✅ Done | 5-step booking: doctor → service → date → details → confirm |
| `/dashboard` | ✅ Done | Today's appointments, status updater |
| `/dashboard/doctors` | ✅ Done | Add/manage doctors |
| `/dashboard/services` | ✅ Done | Add/manage services |
| `/dashboard/bookings` | ✅ Done | Bookings list |
| `/api/health` | ✅ Done | `{ status: "ok", database: "ok" }` |

### Backend / Actions

| File | What it does |
|---|---|
| `app/actions/auth.ts` | signupPractice, signupPatient, login, logout |
| `app/actions/bookings.ts` | getAvailableSlots (basic 8–17 window), createBooking |
| `app/actions/doctors.ts` | Create / update doctors |
| `app/actions/services.ts` | Create / update services |

### Libraries

| Path | What it does |
|---|---|
| `lib/sa/` | SA utilities: ID number validation, mobile E.164, ZAR formatter, public holidays, medical aid schemes |
| `lib/supabase/server.ts` | SSR client (cookie-based) |
| `lib/supabase/service.ts` | Service-role client — bypasses RLS |
| `lib/supabase/client.ts` | Browser client |
| `lib/db/` | Drizzle schema (typed) |

---

## Database Migrations

All SQL lives in `supabase/migrations/`. Apply in order via Supabase SQL Editor when the remote DB is out of date.

| File | Applied? | What it does |
|---|---|---|
| `20260517000001_schema.sql` | ✅ | All tables, constraints, GIST exclusion, indexes |
| `20260517000002_rls.sql` | ✅ | RLS policies + SECURITY DEFINER helpers |
| `20260517000003_add_coordinates.sql` | ⚠️ **Needs applying** | `latitude` + `longitude` on practices (map won't show pins without this) |
| `20260517000004_performance_indexes.sql` | ⚠️ **Needs applying** | RLS speed index + query indexes |
| `20260517000005_storage_avatars.sql` | ⚠️ **Needs applying** | Avatars storage bucket + policies (idempotent — safe to re-run) |

---

## Milestone Plan

| # | Milestone | Status | Owner |
|---|---|---|---|
| M1 | Foundation — scaffold, schema, RLS, env, Supabase clients | ✅ Done | — |
| M2 | SA utilities + tests (ID, mobile, ZAR, holidays, medical aids) | ✅ Done | — |
| M3 | Availability engine — `getAvailableSlots()` using `availability_rules` table + 11 test cases | 🔲 Todo | — |
| M4 | Auth hardening — invite flow, cross-practice RLS test suite | 🔲 Todo | — |
| M5 | Doctor & service management (dashboard CRUD, proper form validation) | 🟡 Partial (basic UI done, no Zod validation yet) | — |
| M6 | Public booking flow — tie booking to `availability_rules`, block public holidays, POPIA consent | 🟡 Partial (happy path done, no rules engine yet) | — |
| M7 | Admin calendar — appointment calendar view, status transitions | 🔲 Todo | — |
| M8 | Patient management + POPIA (consent, export, erasure) | 🔲 Todo | — |
| M9 | Email — Resend + React Email templates (confirmation, reminder, cancellation) | 🔲 Todo | — |
| M10 | Reminder engine — pg_cron + Edge Function | 🔲 Todo | — |
| M11 | Settings, POPIA audit log viewer, subscription status | 🔲 Todo | — |
| M12 | CI (GitHub Actions), Playwright e2e, demo seed data, hardening | 🔲 Todo | — |

---

## Known Issues / Tech Debt

| # | Issue | Impact | Fix |
|---|---|---|---|
| 1 | Migrations 3–5 not applied to remote DB | Map pins won't show; avatar bucket missing | Paste SQL in Supabase SQL editor |
| 2 | `pnpm dev` blocked by build-script approval | Dev startup | Use `node node_modules/.bin/next.cmd dev --turbopack` or run `pnpm approve-builds` once per machine |
| 3 | Booking uses fixed 8–17 window, ignores `availability_rules` table | Practices can't set custom hours yet | M3 |
| 4 | No POPIA consent captured at booking | Compliance gap | M8 |
| 5 | Patient mobile normalisation in `signupPatient` action is manual — should use `normalizeMobile()` from `lib/sa/` | Minor inconsistency | Small refactor |
| 6 | `DATABASE_URL` via Supabase transaction pooler may fail for Drizzle direct queries | Needed for M3+ server-side queries | Investigate Session Pooler (port 5432) |
| 7 | `next@15.3.2` has CVE-2025-66478 | Security | Upgrade before production |

---

## Architecture Decisions (the non-obvious ones)

- **RLS everywhere, service role for writes that cross tenant boundaries.** Booking from the public `/book/[slug]` uses the service role scoped to the practice — never a direct client insert.
- **`SECURITY DEFINER` functions** (`get_my_practice_ids`, `get_my_role`) prevent circular RLS evaluation on `practice_users`.
- **`practice_id` denormalised** on `availability_rules`, `availability_exceptions`, `appointment_status_history` — avoids joins in every RLS policy.
- **Buffer minutes are soft** (availability engine only), not part of the DB exclusion constraint. The GIST exclusion prevents hard double-booking; buffer is enforced in `getAvailableSlots`.
- **All money in integer cents.** Never floats. `formatZAR()` in `lib/sa/currency.ts`.
- **All times stored in UTC**, displayed in `Africa/Johannesburg` (UTC+2, no DST).
- **Patient hard-delete** requires service role + audit log entry. Authenticated users get `USING (false)` on the patients DELETE policy (POPIA right to erasure).

---

## POPIA Checklist

| Requirement | Status |
|---|---|
| Consent at booking with timestamp + policy version | ⚠️ Not yet (M8) |
| Patient data encrypted at rest (ID numbers via pgsodium) | ⚠️ Not yet (M8) |
| Right to erasure (hard-delete via service role + audit) | ✅ Schema ready, action not built |
| Right to access (JSON export) | 🔲 M8 |
| Audit log (append-only, service role only) | ✅ Schema + RLS done |
| No PII in plain-text logs | ✅ Enforced by code review |

---

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL         # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY    # Supabase anon key
SUPABASE_SERVICE_ROLE_KEY        # Service role key — server only, never expose
DATABASE_URL                     # postgres:// connection string (pooler)
RESEND_API_KEY                   # Resend (email) — use re_local_dev_placeholder locally
RESEND_FROM_EMAIL                # bookings@medibook.co.za
NEXT_PUBLIC_APP_URL              # http://localhost:3000 locally
```

---

## Conventions

- **Commits:** conventional commits — `feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `docs:`
- **Branching:** discuss before merging anything that touches the DB schema or RLS
- **Tests:** Vitest for anything involving dates, money, availability, or access control
- **New dependencies:** discuss before installing
- **POPIA:** never log patient name, ID, email, mobile, or medical info in plain text
