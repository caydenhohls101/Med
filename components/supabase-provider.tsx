"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Listens to Supabase auth state changes and calls router.refresh()
 * so server components (Navbar, layouts) re-render with fresh auth state.
 * Place this once in the root layout.
 */
export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "TOKEN_REFRESHED") {
        router.refresh();
      }
    });
    return () => subscription.unsubscribe();
  }, [router]);

  return <>{children}</>;
}
