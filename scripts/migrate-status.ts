/**
 * scripts/migrate-status.ts
 *
 * Shows which migrations are applied and which are pending.
 *
 * Usage: pnpm db:status
 */

import "dotenv/config";
import { readdirSync } from "fs";
import { join } from "path";
import pg from "pg";

const { Client } = pg;

async function status() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.log("\n⚠️  DATABASE_URL not set — cannot check status.");
    console.log("   Add it to .env.local — see MIGRATIONS.md\n");
    return;
  }

  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const allFiles = readdirSync(join(process.cwd(), "supabase/migrations"))
    .filter((f) => f.endsWith(".sql") && !f.startsWith("reset"))
    .sort();

  // Check if tracking table exists yet
  const { rows: [{ exists }] } = await client.query<{ exists: boolean }>(`
    SELECT EXISTS(
      SELECT FROM information_schema.tables WHERE table_name = '_migrations'
    ) AS exists
  `);

  if (!exists) {
    console.log("\n⚠️  Migration tracking not initialised yet.");
    console.log("   Run: pnpm db:migrate:safe\n");
    console.log("Files that will be applied:");
    allFiles.forEach((f) => console.log(`  ⏳  ${f}`));
    console.log();
    await client.end();
    return;
  }

  const { rows: applied } = await client.query<{ filename: string; applied_at: string }>(
    "SELECT filename, applied_at FROM _migrations ORDER BY applied_at"
  );
  const appliedSet = new Set(applied.map((r) => r.filename));
  const pending    = allFiles.filter((f) => !appliedSet.has(f));

  console.log("\n📊  Migration Status");
  console.log("═══════════════════════════════════════════════════");

  if (applied.length > 0) {
    console.log(`\n✅  Applied (${applied.length}):`);
    applied.forEach((r) => {
      const date = new Date(r.applied_at).toLocaleDateString("en-ZA", {
        day: "2-digit", month: "short", year: "numeric",
      });
      console.log(`   ✓  ${r.filename.padEnd(50)} ${date}`);
    });
  }

  if (pending.length > 0) {
    console.log(`\n⏳  Pending (${pending.length}):`);
    pending.forEach((f) => console.log(`   -  ${f}`));
    console.log("\n  → Run: pnpm db:migrate:safe");
  } else {
    console.log("\n✅  Database is up to date.");
  }

  console.log();
  await client.end();
}

status().catch(console.error);
