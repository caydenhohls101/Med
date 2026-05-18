# MediBook SA — Database Migration Guide

All schema changes live in `supabase/migrations/` and are tracked in git.
Every developer runs the same migration files in the same order.

---

## Quick Reference

| Command | What it does |
|---|---|
| `pnpm db:status` | Show which migrations are applied and which are pending |
| `pnpm db:migrate:safe` | Apply all pending migrations (safe — skips already applied) |
| `pnpm db:migrate:dry` | Show what *would* run without touching the database |
| `pnpm db:mark-applied` | One-time: mark all files as applied on an existing database |

---

## Setup — Getting DATABASE_URL

The migration scripts need a direct Postgres connection (not the app's pooled URL).

1. Open [Supabase Dashboard → Settings → Database](https://supabase.com/dashboard/project/tjdibrpsmcphqnozelie/settings/database)
2. Scroll to **Connection string**
3. Select **URI** and copy the string that starts with `postgresql://postgres:...`
4. Add it to your `.env.local`:

```
DATABASE_URL=postgresql://postgres.[ref]:[PASSWORD]@db.[ref].supabase.co:5432/postgres
```

> The password is your Supabase database password — not the Supabase anon/service keys.
> If you've forgotten it, reset it at Settings → Database → Reset database password.

---

## Environments

| Environment | Supabase Project | Who uses it |
|---|---|---|
| **Development** | `tjdibrpsmcphqnozelie` (shared) | All devs |
| **Production** | Separate project (TBD) | Deployed app only |

Keep `.env.local` pointing to the **dev** project. Never run migrations against prod manually — use the CI/CD pipeline.

---

## First-time setup for a new developer

```bash
# 1. Clone the repo
git clone https://github.com/caydenhohls101/Med.git
cd Med

# 2. Install dependencies
pnpm install

# 3. Copy the env template
cp .env.example .env.local
# Then fill in: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
#               SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL

# 4. Check what migrations need applying
pnpm db:status

# 5. Apply any pending migrations
pnpm db:migrate:safe

# 6. Start the dev server
pnpm dev
```

---

## Existing database (already set up via reset_and_migrate.sql)

If you set up the database manually through the Supabase SQL Editor, run this **once** to tell the migration tracker that those files are already applied:

```bash
pnpm db:mark-applied
```

After that, `pnpm db:migrate:safe` will only apply genuinely new migrations.

---

## How to write a new migration

### 1. Create the file

Name format: `YYYYMMDDHHMMSS_short_description.sql`

```
supabase/migrations/20260601120000_add_patient_notes.sql
```

Use `date +%Y%m%d%H%M%S` on Mac/Linux, or `(Get-Date -Format "yyyyMMddHHmmss")` on Windows PowerShell.

### 2. Write idempotent SQL

Always use `IF NOT EXISTS` / `IF EXISTS` so the migration is safe to inspect:

```sql
-- Good
ALTER TABLE patients ADD COLUMN IF NOT EXISTS allergies_updated_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_patients_updated ON patients(updated_at);

-- Bad (will fail if run twice)
ALTER TABLE patients ADD COLUMN allergies_updated_at TIMESTAMPTZ;
```

### 3. Never edit an existing migration file

Once a file is committed and applied anywhere, it is **immutable**.
To change something, create a **new** migration file.

### 4. Test locally before pushing

```bash
pnpm db:migrate:dry   # see what will run
pnpm db:migrate:safe  # apply it
pnpm db:status        # confirm it was recorded
```

### 5. Commit the migration file before merging

```bash
git add supabase/migrations/20260601120000_add_patient_notes.sql
git commit -m "migration: add patient notes timestamp"
```

---

## What gets tracked

The `_migrations` table in Postgres records every applied file:

```sql
SELECT * FROM _migrations ORDER BY applied_at;
```

```
 id │ filename                              │ applied_at             │ applied_by
────┼───────────────────────────────────────┼────────────────────────┼───────────
  1 │ 20260517000001_schema.sql             │ 2026-05-17 00:00:00+00 │ postgres
  2 │ 20260517000002_rls.sql                │ 2026-05-17 00:00:00+00 │ postgres
  …
```

---

## Protecting production data

- **Backups**: Enable Point-in-Time Recovery in Supabase Dashboard → Database → Backups
- **Before any destructive migration**: `pg_dump` or use Supabase's manual backup button
- **Never run `DROP TABLE` or `TRUNCATE` in a migration** without a backup and team sign-off

---

## Git workflow for migrations

```
feature branch ──► PR review ──► merge to main ──► deploy (applies migrations)
                       ↑
                 "Does this migration
                  have IF NOT EXISTS?"
                 "Has it been tested
                  locally?"
```

If two developers create migrations simultaneously:
- The one with the **earlier timestamp** runs first
- Both should still apply cleanly because they use `IF NOT EXISTS`
- If there's a genuine conflict, resolve it in a new migration

---

## Migration files in this project

| File | What it does |
|---|---|
| `20260517000001_schema.sql` | All 13 tables, enums, triggers |
| `20260517000002_rls.sql` | Row-level security policies |
| `20260517000003_add_coordinates.sql` | lat/lng on practices (for map) |
| `20260517000004_performance_indexes.sql` | Query performance indexes |
| `20260517000005_storage_avatars.sql` | Supabase Storage bucket for avatars |
| `20260517000006_prospects.sql` | Prospect pipeline table for admin |
| `20260517000007_verification.sql` | Verified badge on practices |

`reset_and_migrate.sql` — **one-time convenience file** used to set up a blank database. Do not use on any database that has real data.
