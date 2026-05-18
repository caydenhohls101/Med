/**
 * scripts/migrate-mark-applied.ts
 *
 * ONE-TIME USE for existing databases set up via reset_and_migrate.sql.
 * Marks all current migration files as already applied WITHOUT re-running them.
 *
 * Run this once on any database that was set up manually through the
 * Supabase SQL Editor. After this, pnpm db:migrate:safe will only apply
 * genuinely new migrations.
 *
 * Usage: pnpm db:mark-applied
 */

import "dotenv/config";
import { readdirSync } from "fs";
import { join } from "path";
import pg from "pg";

const { Client } = pg;

async function markApplied() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("\n❌  DATABASE_URL is not set in .env.local\n");
    process.exit(1);
  }

  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();

  // Create tracking table
  await client.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id          SERIAL PRIMARY KEY,
      filename    TEXT NOT NULL UNIQUE,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      applied_by  TEXT DEFAULT current_user
    );
  `);

  const allFiles = readdirSync(join(process.cwd(), "supabase/migrations"))
    .filter((f) => f.endsWith(".sql") && !f.startsWith("reset"))
    .sort();

  // Check what's already recorded
  const { rows } = await client.query<{ filename: string }>(
    "SELECT filename FROM _migrations"
  );
  const already = new Set(rows.map((r) => r.filename));
  const toMark  = allFiles.filter((f) => !already.has(f));

  if (toMark.length === 0) {
    console.log("\n✅  All migrations already marked as applied.\n");
    await client.end();
    return;
  }

  console.log(`\n📝  Marking ${toMark.length} migration(s) as already applied:\n`);

  for (const file of toMark) {
    await client.query(
      "INSERT INTO _migrations (filename) VALUES ($1) ON CONFLICT (filename) DO NOTHING",
      [file]
    );
    console.log(`   ✓  ${file}`);
  }

  console.log("\n✅  Done. Future migrations will be applied normally via pnpm db:migrate:safe\n");
  await client.end();
}

markApplied().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
