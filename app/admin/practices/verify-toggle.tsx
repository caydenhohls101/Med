"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function VerifyToggle({ practiceId, isVerified }: { practiceId: string; isVerified: boolean }) {
  const [verified, setVerified] = useState(isVerified);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function toggle() {
    startTransition(async () => {
      const supabase = createClient();
      await supabase
        .from("practices")
        .update({ is_verified: !verified, verified_at: !verified ? new Date().toISOString() : null })
        .eq("id", practiceId);
      setVerified((v) => !v);
      router.refresh();
    });
  }

  return (
    <button
      onClick={toggle}
      disabled={isPending}
      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full transition-colors ${
        verified
          ? "bg-green-100 text-green-800 hover:bg-green-200"
          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
      }`}
    >
      {isPending ? "…" : verified ? "✓ Verified" : "Unverified"}
    </button>
  );
}
