import "server-only";

import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/**
 * Creates a Supabase client with the service role key.
 * BYPASSES RLS ENTIRELY — use only for:
 *   - Practice creation during signup
 *   - Patient hard-delete (POPIA erasure) with audit
 *   - Audit log writes
 *   - Reminder engine Edge Functions
 *   - Webhook processing
 *
 * Never expose this client to the browser or pass it as a prop.
 */
export function createServiceClient() {
  return createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
