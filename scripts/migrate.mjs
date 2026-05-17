// One-shot migration runner — executes all SQL files in supabase/migrations/ in order
import pg from "pg";
import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, "../supabase/migrations");

const db = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

await db.connect();
console.log("Connected to database.");

// Run migrations tracking table
await db.query(`
  CREATE TABLE IF NOT EXISTS _medibook_migrations (
    filename text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  )
`);

const applied = await db.query("SELECT filename FROM _medibook_migrations");
const appliedSet = new Set(applied.rows.map((r) => r.filename));

const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

for (const file of files) {
  if (appliedSet.has(file)) {
    console.log(`  skip  ${file} (already applied)`);
    continue;
  }

  console.log(`  apply ${file} ...`);
  const sql = readFileSync(join(migrationsDir, file), "utf8");

  try {
    await db.query("BEGIN");
    await db.query(sql);
    await db.query(
      "INSERT INTO _medibook_migrations (filename) VALUES ($1)",
      [file],
    );
    await db.query("COMMIT");
    console.log(`  done  ${file}`);
  } catch (err) {
    await db.query("ROLLBACK");
    console.error(`  FAIL  ${file}: ${err.message}`);
    process.exit(1);
  }
}

await db.end();
console.log("\nAll migrations applied.");
