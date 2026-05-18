import { createClient } from "@/lib/supabase/server";
import { getCachedUser, getCachedPracticeUser } from "@/lib/supabase/cached";
import { WeekCalendar } from "@/components/dashboard/week-calendar";
import { format, subDays, addDays } from "date-fns";

export default async function CalendarPage() {
  const [user, practiceUser] = await Promise.all([getCachedUser(), getCachedPracticeUser()]);
  if (!user || !practiceUser) return null;

  const supabase = await createClient();
  const today = new Date();

  const [{ data: appointments }, { data: doctors }] = await Promise.all([
    supabase
      .from("appointments")
      .select(`
        id, starts_at, ends_at, status, reference_number, doctor_id,
        doctors(full_name, title, color),
        patients(first_name, last_name),
        services(name)
      `)
      .gte("starts_at", format(subDays(today, 1), "yyyy-MM-dd") + "T00:00:00+02:00")
      .lte("starts_at", format(addDays(today, 30), "yyyy-MM-dd") + "T23:59:59+02:00")
      .order("starts_at"),
    supabase.from("doctors").select("id, full_name, title, color").eq("active", true).order("full_name"),
  ]);

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Calendar</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Click any appointment to see details. Click a day header to switch to day view.</p>
      </div>

      <div className="flex-1 min-h-0">
        <WeekCalendar
          appointments={(appointments ?? []).map((a) => ({
            id: a.id,
            starts_at: a.starts_at,
            ends_at: a.ends_at,
            status: a.status,
            reference_number: a.reference_number,
            doctor_id: a.doctor_id,
            doctors: a.doctors as { full_name: string; title: string; color: string } | null,
            patients: a.patients as { first_name: string; last_name: string } | null,
            services: a.services as { name: string } | null,
          }))}
          doctors={(doctors ?? []).map((d) => ({
            id: d.id, full_name: d.full_name, title: d.title, color: d.color,
          }))}
        />
      </div>
    </div>
  );
}
