import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCachedUser, getCachedPracticeUser } from "@/lib/supabase/cached";
import { BentoGrid } from "@/components/ui/bento-grid";
import { BookingCalendar } from "@/components/dashboard/booking-calendar";
import { Calendar, CheckCircle, Clock, TrendingUp } from "lucide-react";
import { format, addDays, startOfMonth } from "date-fns";

export default async function DashboardPage() {
  const [user, practiceUser] = await Promise.all([getCachedUser(), getCachedPracticeUser()]);
  if (!user || !practiceUser) return null;

  const role = practiceUser.role;
  const supabase = await createClient();
  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");

  let doctorId: string | null = null;
  if (role === "doctor") {
    const { data: doc } = await supabase.from("doctors").select("id").eq("user_id", user.id).maybeSingle();
    doctorId = doc?.id ?? null;
  }

  const select = `id, starts_at, ends_at, status, reference_number, notes,
    doctors(full_name, title), patients(first_name, last_name, mobile, email), services(name)`;

  let calQ = supabase.from("appointments").select(select)
    .gte("starts_at", format(startOfMonth(today), "yyyy-MM-dd") + "T00:00:00+02:00")
    .lte("starts_at", format(addDays(today, 60), "yyyy-MM-dd") + "T23:59:59+02:00")
    .order("starts_at");

  let todayQ = supabase.from("appointments").select(select)
    .gte("starts_at", `${todayStr}T00:00:00+02:00`)
    .lte("starts_at", `${todayStr}T23:59:59+02:00`)
    .order("starts_at");

  if (doctorId) { calQ = calQ.eq("doctor_id", doctorId); todayQ = todayQ.eq("doctor_id", doctorId); }

  const [{ data: calAppts }, { data: todayAppts }] = await Promise.all([calQ, todayQ]);

  const all    = calAppts  ?? [];
  const today_ = todayAppts ?? [];
  const upcoming7 = all.filter((a) =>
    ["pending","confirmed"].includes(a.status) &&
    new Date(a.starts_at) >= today && new Date(a.starts_at) <= addDays(today, 7)
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">{format(today, "EEEE, d MMMM yyyy")}</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            {role === "doctor" ? "Your schedule" : "Practice schedule"}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/bookings"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground border hover:bg-muted px-4 py-2 rounded-xl font-medium transition-colors">
            📋 All Bookings
          </Link>
          <Link href="/dashboard/calendar"
            className="inline-flex items-center gap-1.5 text-sm text-primary border border-primary/30 hover:bg-primary/5 px-4 py-2 rounded-xl font-medium transition-colors">
            📅 Full Calendar
          </Link>
        </div>
      </div>

      {/* Stats */}
      <BentoGrid cols={4} items={[
        {
          icon: <Calendar className="w-4 h-4 text-blue-500" />,
          title: String(today_.length),
          description: "appointments scheduled today",
          meta: "Today",
          status: today_.length > 0 ? "Active" : "Clear",
          hasPersistentHover: today_.length > 0,
        },
        {
          icon: <TrendingUp className="w-4 h-4 text-indigo-500" />,
          title: String(upcoming7.length),
          description: "upcoming in the next 7 days",
          meta: "This week",
          status: upcoming7.length > 0 ? `${upcoming7.length} ahead` : "Quiet",
        },
        {
          icon: <CheckCircle className="w-4 h-4 text-green-500" />,
          title: String(today_.filter((a) => a.status === "confirmed").length),
          description: "confirmed for today",
          meta: "Confirmed",
          status: "Today",
        },
        {
          icon: <Clock className="w-4 h-4 text-amber-500" />,
          title: String(today_.filter((a) => a.status === "pending").length),
          description: "awaiting confirmation",
          meta: "Pending",
          status: today_.filter((a) => a.status === "pending").length > 0 ? "Action needed" : "All clear",
        },
      ]} />

      {/* Single calendar view — replaces the separate "Today's Appointments" list */}
      <BookingCalendar
        appointments={all.map((a) => ({
          id: a.id,
          starts_at: a.starts_at,
          status: a.status,
          reference_number: a.reference_number,
          doctors:  a.doctors  as { full_name: string; title: string } | null,
          patients: a.patients as { first_name: string; last_name: string } | null,
          services: a.services as { name: string } | null,
        }))}
        fullWidth
      />
    </div>
  );
}
