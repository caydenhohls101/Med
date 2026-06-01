"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { revalidatePath } from "next/cache";

export async function markNotificationRead(id: string) {
  const supabase = await createClient();
  await supabase.from("notifications").update({ read: true }).eq("id", id);
  revalidatePath("/", "layout");
}

export async function markAllRead() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("notifications").update({ read: true }).eq("user_id", user.id);
  revalidatePath("/", "layout");
}

/** Creates notifications for all relevant parties after a booking event */
export async function createBookingNotifications(params: {
  practiceId: string;
  patientEmail: string;
  patientName: string;
  referenceNumber: string;
  doctorName: string;
  dateFormatted: string;
  timeFormatted: string;
  type: "booking_created" | "booking_cancelled";
}) {
  const supabase = createServiceClient();
  const isCancel = params.type === "booking_cancelled";
  const rows: { user_id: string; type: string; title: string; body: string; href: string }[] = [];

  // 1. Patient notification — find their auth account by email
  try {
    const { data } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const patientUser = data?.users?.find((u) => u.email === params.patientEmail);
    if (patientUser) {
      rows.push({
        user_id: patientUser.id,
        type: params.type,
        title: isCancel ? "Booking Cancelled" : "✅ Booking Request Received",
        body: isCancel
          ? `Your appointment with ${params.doctorName} on ${params.dateFormatted} at ${params.timeFormatted} has been cancelled.`
          : `Your booking with ${params.doctorName} on ${params.dateFormatted} at ${params.timeFormatted} is pending confirmation. Ref: ${params.referenceNumber}`,
        href: "/my-appointments",
      });
    }
  } catch (e) {
    console.warn("[notifications] Could not look up patient user:", e);
  }

  // 2. ALL practice staff — owners, receptionists AND doctors linked to this practice
  const { data: staff, error: staffErr } = await supabase
    .from("practice_users")
    .select("user_id, role")
    .eq("practice_id", params.practiceId);

  if (staffErr) console.warn("[notifications] Staff query failed:", staffErr.message);

  for (const member of staff ?? []) {
    const isDoctor = member.role === "doctor";
    rows.push({
      user_id: member.user_id,
      type: params.type,
      title: isCancel ? "⚠️ Booking Cancelled" : "📅 New Booking",
      body: isCancel
        ? `${params.patientName} cancelled their appointment with ${params.doctorName} on ${params.dateFormatted} at ${params.timeFormatted}.`
        : `${params.patientName} has booked with ${params.doctorName} on ${params.dateFormatted} at ${params.timeFormatted}. Ref: ${params.referenceNumber}`,
      href: isDoctor ? "/dashboard" : "/dashboard/bookings",
    });
  }

  if (rows.length > 0) {
    const { error } = await supabase.from("notifications").insert(rows);
    if (error) console.error("[notifications] Insert failed:", error.message);
  }
}
