"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function addService(practiceId: string, data: {
  name: string;
  durationMinutes: number;
  priceCents: number;
  description: string;
}) {
  const supabase = await createClient();
  const { error } = await supabase.from("services").insert({
    practice_id: practiceId,
    name: data.name,
    duration_minutes: data.durationMinutes,
    price_cents: data.priceCents,
    description: data.description || null,
  });
  if (error) return { error: error.message };
  revalidatePath("/dashboard/services");
  return { success: true };
}
