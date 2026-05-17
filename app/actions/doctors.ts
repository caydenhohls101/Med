"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function addDoctor(practiceId: string, data: {
  fullName: string;
  title: string;
  specialty: string;
  hpcsaNumber: string;
  durationMinutes: number;
}) {
  const supabase = await createClient();
  const { error } = await supabase.from("doctors").insert({
    practice_id: practiceId,
    full_name: data.fullName,
    title: data.title,
    specialty: data.specialty || null,
    hpcsa_number: data.hpcsaNumber || null,
    default_appointment_duration_minutes: data.durationMinutes,
  });
  if (error) return { error: error.message };
  revalidatePath("/dashboard/doctors");
  return { success: true };
}
