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

/** Called from bookings.ts — creates notifications for all relevant parties */
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
  const rows: {
    user_id: string; type: string; title: string; body: string; href?: string;
  }[] = [];

  // Patient notification (find by email in auth.users)
  try {
    const { data } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const patientUser = data?.users?.find((u) => u.email === params.patientEmail);
    if (patientUser) {
      rows.push({
        user_id: patientUser.id,
        type: params.type,
        title: isCancel ? "Booking Cancelled" : "Booking Request Received",
        body: isCancel
          ? `Your appointment with ${params.doctorName} on ${params.dateFormatted} at ${params.timeFormatted} has been cancelled.`
          : `Your booking with ${params.doctorName} on ${params.dateFormatted} at ${params.timeFormatted} is pending confirmation. Ref: ${params.referenceNumber}`,
        href: "/",
      });
    }
  } catch { /* admin listUsers may fail in some configs — non-fatal */ }

  // Practice staff (owners + receptionists)
  const { data: staff } = await supabase
    .from("practice_users")
    .select("user_id, role")
    .eq("practice_id", params.practiceId)
    .in("role", ["owner", "receptionist"]);

  for (const member of (staff ?? [])) {
    rows.push({
      user_id: member.user_id,
      type: params.type,
      title: isCancel ? "⚠️ Booking Cancelled" : "📅 New Booking",
      body: isCancel
        ? `${params.patientName} cancelled their appointment with ${params.doctorName} on ${params.dateFormatted} at ${params.timeFormatted}.`
        : `${params.patientName} booked with ${params.doctorName} on ${params.dateFormatted} at ${params.timeFormatted}. Ref: ${params.referenceNumber}`,
      href: "/dashboard/bookings",
    });
  }

  if (rows.length > 0) {
    await supabase.from("notifications").insert(rows);
  }
}
