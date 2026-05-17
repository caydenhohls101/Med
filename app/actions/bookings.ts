"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

function generateRef(): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let rand = "";
  for (let i = 0; i < 4; i++) rand += chars[Math.floor(Math.random() * chars.length)];
  return `MB-${yy}${mm}${dd}-${rand}`;
}

export async function getAvailableSlots(
  doctorId: string,
  date: string,
  durationMinutes: number
): Promise<{ slots: { time: string; startsAt: string; endsAt: string }[] }> {
  const supabase = createServiceClient();

  // Skip weekends
  const dayOfWeek = new Date(`${date}T12:00:00`).getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) return { slots: [] };

  // Fetch existing appointments on this date (SAST = UTC+2)
  const { data: existing } = await supabase
    .from("appointments")
    .select("starts_at, ends_at")
    .eq("doctor_id", doctorId)
    .in("status", ["pending", "confirmed"])
    .gte("starts_at", `${date}T00:00:00+02:00`)
    .lte("starts_at", `${date}T23:59:59+02:00`);

  const slots: { time: string; startsAt: string; endsAt: string }[] = [];
  let current = 8 * 60; // 8:00 SAST in minutes
  const end = 17 * 60; // 17:00 SAST

  while (current + durationMinutes <= end) {
    const sh = Math.floor(current / 60);
    const sm = current % 60;
    const eh = Math.floor((current + durationMinutes) / 60);
    const em = (current + durationMinutes) % 60;

    const startsAt = `${date}T${String(sh).padStart(2, "0")}:${String(sm).padStart(2, "0")}:00+02:00`;
    const endsAt = `${date}T${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}:00+02:00`;
    const time = `${String(sh).padStart(2, "0")}:${String(sm).padStart(2, "0")}`;

    const conflict = (existing ?? []).some((a) => {
      const aStart = new Date(a.starts_at).getTime();
      const aEnd = new Date(a.ends_at).getTime();
      const sStart = new Date(startsAt).getTime();
      const sEnd = new Date(endsAt).getTime();
      return sStart < aEnd && sEnd > aStart;
    });

    if (!conflict) slots.push({ time, startsAt, endsAt });
    current += durationMinutes;
  }

  return { slots };
}

export async function createBooking(data: {
  practiceId: string;
  doctorId: string;
  serviceId: string;
  startsAt: string;
  endsAt: string;
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  notes?: string;
}): Promise<{ referenceNumber?: string; error?: string }> {
  const supabase = createServiceClient();

  // Normalise mobile to E.164
  let mobile = data.mobile.trim().replace(/\s+/g, "");
  if (mobile.startsWith("0")) mobile = "+27" + mobile.slice(1);
  else if (mobile.startsWith("27")) mobile = "+" + mobile;

  // Find existing patient by email + practice, or create
  const { data: existing } = await supabase
    .from("patients")
    .select("id")
    .eq("practice_id", data.practiceId)
    .eq("email", data.email)
    .maybeSingle();

  let patientId: string;

  if (existing) {
    patientId = existing.id;
  } else {
    const { data: patient, error } = await supabase
      .from("patients")
      .insert({
        practice_id: data.practiceId,
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email,
        mobile,
        popia_consent_at: new Date().toISOString(),
        popia_consent_version: "1.0",
      })
      .select("id")
      .single();

    if (error || !patient) return { error: "Could not create patient record." };
    patientId = patient.id;
  }

  const { data: appt, error: apptError } = await supabase
    .from("appointments")
    .insert({
      practice_id: data.practiceId,
      doctor_id: data.doctorId,
      service_id: data.serviceId,
      patient_id: patientId,
      starts_at: data.startsAt,
      ends_at: data.endsAt,
      status: "pending",
      source: "online",
      reference_number: generateRef(),
      notes: data.notes ?? null,
    })
    .select("reference_number")
    .single();

  if (apptError) return { error: apptError.message };

  return { referenceNumber: appt.reference_number };
}

export async function updateAppointmentStatus(
  appointmentId: string,
  status: "confirmed" | "cancelled" | "completed" | "no_show"
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("appointments")
    .update({ status })
    .eq("id", appointmentId);

  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/bookings");
  return { success: true };
}
