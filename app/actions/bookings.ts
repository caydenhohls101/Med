"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendWhatsApp, confirmationMessage } from "@/lib/notifications/whatsapp";
import { createBookingNotifications } from "@/app/actions/notifications";
import { format } from "date-fns";

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

  // Send WhatsApp confirmation — non-blocking, won't fail the booking
  const [{ data: practice }, { data: doctor }] = await Promise.all([
    supabase.from("practices").select("name, phone").eq("id", data.practiceId).single(),
    supabase.from("doctors").select("full_name, title").eq("id", data.doctorId).single(),
  ]);

  if (practice && doctor) {
    const startDate   = new Date(data.startsAt);
    const dateFormatted = format(startDate, "EEEE, d MMMM yyyy");
    const timeFormatted = format(startDate, "HH:mm");

    // WhatsApp + in-app notifications — errors are swallowed, never block the booking
    await Promise.all([
      sendWhatsApp(mobile, confirmationMessage({
        patientName: data.firstName, patientMobile: mobile,
        practiceName: practice.name, doctorTitle: doctor.title,
        doctorName: doctor.full_name, date: dateFormatted, time: timeFormatted,
        referenceNumber: appt.reference_number,
        practicePhone: practice.phone ?? undefined,
      })),
      createBookingNotifications({
        practiceId: data.practiceId,
        patientEmail: data.email,
        patientName: `${data.firstName} ${data.lastName}`,
        referenceNumber: appt.reference_number,
        doctorName: `${doctor.title} ${doctor.full_name}`,
        dateFormatted, timeFormatted,
        type: "booking_created",
      }).catch((e) => console.warn("[notifications]", e)),
    ]);
  }

  return { referenceNumber: appt.reference_number };
}

/**
 * Patient-facing cancellation. Validates ownership by email, then sends
 * urgent WhatsApp to practice + doctor before updating the status.
 */
export async function cancelPatientBooking(
  referenceNumber: string,
  patientEmail: string,
  reason?: string
): Promise<{ success?: true; error?: string }> {
  const supabase = createServiceClient();

  // 1. Find the appointment by reference, join patient email to verify ownership
  const { data: appt } = await supabase
    .from("appointments")
    .select(`
      id, starts_at, status, reference_number, practice_id, doctor_id,
      patients(email, first_name, last_name, mobile),
      doctors(full_name, title, user_id),
      services(name),
      practices:practice_id(name, phone, email)
    `)
    .eq("reference_number", referenceNumber)
    .maybeSingle();

  if (!appt) return { error: "Booking not found." };

  const patient  = appt.patients  as { email: string; first_name: string; last_name: string; mobile: string } | null;
  const doctor   = appt.doctors   as { full_name: string; title: string; user_id: string | null } | null;
  const service  = appt.services  as { name: string } | null;
  const practice = (appt as any).practices as { name: string; phone: string | null; email: string | null } | null;

  // 2. Verify this patient owns the booking
  if (!patient || patient.email.toLowerCase() !== patientEmail.toLowerCase()) {
    return { error: "You can only cancel your own bookings." };
  }

  // 3. Only allow pending/confirmed
  if (!["pending", "confirmed"].includes(appt.status)) {
    return { error: `This booking is already ${appt.status} and cannot be cancelled.` };
  }

  // 4. Don't allow cancelling in the past
  if (new Date(appt.starts_at) < new Date()) {
    return { error: "Past appointments cannot be cancelled online. Please contact the practice." };
  }

  // 5. Update status
  const { error: updateErr } = await supabase
    .from("appointments")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString(), cancel_reason: reason ?? "Patient cancelled online" })
    .eq("id", appt.id);

  if (updateErr) return { error: updateErr.message };

  // 6. Build notification details
  const apptDate      = new Date(appt.starts_at);
  const isToday       = format(apptDate, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
  const dateFormatted = format(apptDate, "EEEE, d MMMM yyyy");
  const timeFormatted = format(apptDate, "HH:mm");
  const urgentPrefix  = isToday ? "🚨 *SAME-DAY CANCELLATION — Appointment is TODAY!*\n\n" : "";

  // WhatsApp to practice
  if (practice?.phone) {
    const msg = [
      `${urgentPrefix}⚠️ *BOOKING CANCELLATION*`,
      ``,
      `A patient has cancelled their appointment online.`,
      ``,
      `👤 *Patient:* ${patient.first_name} ${patient.last_name}`,
      `📞 *Patient phone:* ${patient.mobile}`,
      `📋 *Ref:* ${appt.reference_number}`,
      `📅 *Date:* ${dateFormatted}`,
      `🕐 *Time:* ${timeFormatted}`,
      `👨‍⚕️ *Doctor:* ${doctor?.title} ${doctor?.full_name}`,
      `🩺 *Service:* ${service?.name}`,
      reason ? `💬 *Reason:* ${reason}` : ``,
      ``,
      `Please update your schedule accordingly.`,
      ``,
      `_MediBook SA_`,
    ].filter(Boolean).join("\n");

    await sendWhatsApp(practice.phone, msg);
  }

  // Confirmation to patient
  const patientMsg = [
    `Hi ${patient.first_name},`,
    ``,
    `Your appointment has been *cancelled* as requested.`,
    ``,
    `📋 *Ref:* ${appt.reference_number}`,
    `🏥 ${practice?.name}`,
    `📅 ${dateFormatted} at ${timeFormatted}`,
    ``,
    practice?.phone ? `To rebook, call ${practice.phone} or visit our website.` : ``,
    ``,
    `_MediBook SA_`,
  ].filter(Boolean).join("\n");

  await sendWhatsApp(patient.mobile, patientMsg);

  revalidatePath("/");
  return { success: true };
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
