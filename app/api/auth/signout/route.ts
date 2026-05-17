import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * POST /api/auth/signout
 * Route handler sign-out — more reliable than a server action because
 * the cookie deletion is guaranteed to be flushed in the HTTP response
 * before the redirect is followed.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  const origin = new URL(request.url).origin;
  return NextResponse.redirect(`${origin}/`, { status: 303 });
}
