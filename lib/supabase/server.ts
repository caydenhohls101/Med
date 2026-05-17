import "server-only";

import { type CookieOptions, createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

/**
 * Creates a Supabase client for Server Components, Server Actions, and Route Handlers.
 * Uses the anon key with RLS enforced by the authenticated user's JWT.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server Components cannot set cookies — caller must be a Server Action
            // or Route Handler. Silently ignore in read-only contexts.
          }
        },
      },
    },
  );
}
