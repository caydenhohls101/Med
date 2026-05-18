/**
 * scripts/migrate.ts
 *
 * Safe, idempotent migration runner.
 * - Reads every *.sql file in supabase/migrations/ (sorted alphabetically)
 * - Skips files already recorded in the _migrations tracking table
 * - Runs pending migrations in order, wrapped in a transaction
 * - Records each success; stops and rolls back on any failure
 *
 * Usage:
 *   pnpm db:migrate:safe          — apply pending migrations
 *   pnpm db:migrate:safe --dry-run — show pending without applying
 */

import "dotenv/config";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import pg from "pg";

const { Client } = pg;
const DRY_RUN = process.argv.includes("--dry-run");

async function getClient() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("\n❌  DATABASE_URL is not set.");
    console.error("   Add it to .env.local — see MIGRATIONS.md for how to get it from Supabase.\n");
    process.exit(1);
  }
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  return client;
}

async function ensureTrackingTable(client: pg.Client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id          SERIAL PRIMARY KEY,
      filename    TEXT NOT NULL UNIQUE,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      applied_by  TEXT DEFAULT current_user
    );
    COMMENT ON TABLE _migrations IS
      'Tracks which migration files from supabase/migrations/ have been applied.';
  `);
}

function getSqlFiles(): string[] {
  const dir = join(process.cwd(), "supabase/migrations");
  return readdirSync(dir)
    .filter((f) => f.endsWith(".sql") && !f.startsWith("reset"))
    .sort(); // timestamp prefix guarantees order
}

async function getApplied(client: pg.Client): Promise<Set<string>> {
  const { rows } = await client.query<{ filename: string }>(
    "SELECT filename FROM _migrations"
  );
  return new Set(rows.map((r) => r.filename));
}

async function migrate() {
  const client = await getClient();

  try {
    await ensureTrackingTable(client);

    const allFiles = getSqlFiles();
    const applied  = await getApplied(client);
    const pending  = allFiles.filter((f) => !applied.has(f));

    console.log("\n🗂  Migration status");
    console.log(`   Applied : ${applied.size} / ${allFiles.length}`);
    console.log(`   Pending : ${pending.length}\n`);

    if (pending.length === 0) {
      console.log("✅  Database is up to date. Nothing to do.\n");
      return;
    }

    pending.forEach((f) => console.log(`   ⏳  ${f}`));
    console.log();

    if (DRY_RUN) {
      console.log("ℹ️   Dry-run mode — no changes made.\n");
      return;
    }

    for (const file of pending) {
      const path = join(process.cwd(), "supabase/migrations", file);
      const sql  = readFileSync(path, "utf-8");

      process.stdout.write(`▶  Applying ${file} … `);
      try {
        await client.query("BEGIN");
        await client.query(sql);
        await client.query("INSERT INTO _migrations (filename) VALUES ($1)", [file]);
        await client.query("COMMIT");
        console.log("✅");
      } catch (err) {
        console.log("❌");
        await client.query("ROLLBACK");
        console.error(`\n🛑  Failed on ${file}:`);
        console.error((err as Error).message);
        console.error("\nDatabase rolled back. Fix the migration and try again.\n");
        process.exit(1);
      }
    }

    console.log(`\n🎉  ${pending.length} migration(s) applied successfully.\n`);
  } finally {
    await client.end();
  }
}

migrate().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
