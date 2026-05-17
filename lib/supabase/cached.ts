import { cache } from "react";
import { createClient } from "./server";

// Deduplicated within a single server render — layout + page share one call.
export const getCachedUser = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
});

export const getCachedPracticeUser = cache(async () => {
  const user = await getCachedUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("practice_users")
    .select("role, practice_id, practices(id, name, slug)")
    .eq("user_id", user.id)
    .maybeSingle();
  return data;
});
