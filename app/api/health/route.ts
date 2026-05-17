import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, "ok" | "error"> = {};

  // Database check
  try {
    const { createServiceClient } = await import("@/lib/supabase/service");
    const client = createServiceClient();
    const { error } = await client.from("practices").select("id").limit(1);
    checks.database = error ? "error" : "ok";
  } catch {
    checks.database = "error";
  }

  const allHealthy = Object.values(checks).every((s) => s === "ok");

  return NextResponse.json(
    { status: allHealthy ? "ok" : "degraded", checks, timestamp: new Date().toISOString() },
    { status: allHealthy ? 200 : 503 },
  );
}
