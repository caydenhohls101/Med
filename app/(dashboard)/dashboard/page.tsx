import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCachedUser, getCachedPracticeUser } from "@/lib/supabase/cached";
import { Badge } from "@/components/ui/badge";
import { BookingCalendar } from "@/components/dashboard/booking-calendar";
import { StatusUpdater } from "@/components/dashboard/status-updater";
import { format, addDays, startOfMonth, endOfMonth } from "date-fns";
import { CalendarDays, Sun } from "lucide-react";

const STATUS_VARIANT: Record<string, "warning"|"success"|"destructive"|"secondary"|"outline"> = {
  pending: "warning", confirmed: "success", cancelled: "destructive",
  completed: "secondary", no_show: "outline",
};

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

  // Fetch this month + next 60 days for the calendar, and today for the side list
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

  const all = calAppts ?? [];
  const today_ = todayAppts ?? [];
  const upcoming7 = all.filter((a) => ["pending","confirmed"].includes(a.status) &&
    new Date(a.starts_at) >= today && new Date(a.starts_at) <= addDays(today, 7));

  const stats = [
    { label: "Today",     value: today_.length,          sub: "appointments" },
    { label: "This Week", value: upcoming7.length,        sub: "upcoming" },
    { label: "Confirmed", value: today_.filter((a) => a.status === "confirmed").length, sub: "today" },
    { label: "Pending",   value: today_.filter((a) => a.status === "pending").length,   sub: "today" },
  ];

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
        <Link href="/dashboard/calendar"
          className="inline-flex items-center gap-1.5 text-sm text-primary border border-primary/30 hover:bg-primary/5 px-4 py-2 rounded-xl font-medium transition-colors">
          <CalendarDays className="w-4 h-4" /> Full Calendar
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="bg-background rounded-2xl border p-4 hover:shadow-sm transition-shadow">
            <div className="text-3xl font-bold">{s.value}</div>
            <div className="text-sm font-medium mt-0.5">{s.label}</div>
            <div className="text-xs text-muted-foreground">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Main two-column */}
      <div className="grid xl:grid-cols-5 gap-5 items-start">
        {/* Left: today's list */}
        <div className="xl:col-span-3 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Today&apos;s Appointments</h2>
            {today_.length > 0 && (
              <Link href="/dashboard/bookings" className="text-xs text-primary hover:underline">
                View all →
              </Link>
            )}
          </div>

          {today_.length === 0 ? (
            <div className="bg-background rounded-2xl border p-10 text-center space-y-2">
              <Sun className="w-10 h-10 text-amber-400 mx-auto" />
              <p className="font-medium">Clear day today</p>
              <p className="text-sm text-muted-foreground">No appointments scheduled.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {today_.map((appt) => {
                const doctor  = appt.doctors  as { full_name: string; title: string } | null;
                const patient = appt.patients as { first_name: string; last_name: string; mobile: string } | null;
                const service = appt.services as { name: string } | null;
                return (
                  <div key={appt.id}
                    className="glass-card bg-background rounded-2xl border p-4 flex items-start gap-3">
                    {/* Time block */}
                    <div className="bg-primary/10 rounded-xl px-3 py-2 text-center shrink-0">
                      <div className="text-xs font-bold text-primary font-mono">
                        {format(new Date(appt.starts_at), "HH:mm")}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm">{patient?.first_name} {patient?.last_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {service?.name} · {doctor?.title} {doctor?.full_name}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono mt-0.5">{appt.reference_number}</div>
                      {appt.notes && (
                        <div className="text-xs italic text-muted-foreground mt-1 bg-muted/40 rounded-lg px-2 py-1">
                          &ldquo;{appt.notes}&rdquo;
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <Badge variant={STATUS_VARIANT[appt.status] ?? "outline"} className="text-xs">
                        {appt.status}
                      </Badge>
                      <StatusUpdater appointmentId={appt.id} currentStatus={appt.status} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: calendar */}
        <div className="xl:col-span-2">
          <BookingCalendar
            appointments={all.map((a) => ({
              id: a.id,
              starts_at: a.starts_at,
              status: a.status,
              reference_number: a.reference_number,
              doctors: a.doctors as { full_name: string; title: string } | null,
              patients: a.patients as { first_name: string; last_name: string } | null,
              services: a.services as { name: string } | null,
            }))}
          />
        </div>
      </div>
    </div>
  );
}
