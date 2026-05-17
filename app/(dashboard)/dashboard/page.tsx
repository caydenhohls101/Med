import { createClient } from "@/lib/supabase/server";
import { getCachedUser, getCachedPracticeUser } from "@/lib/supabase/cached";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { StatusUpdater } from "@/components/dashboard/status-updater";

const statusVariant: Record<string, "default" | "success" | "warning" | "destructive" | "secondary" | "outline"> = {
  pending: "warning",
  confirmed: "success",
  cancelled: "destructive",
  completed: "secondary",
  no_show: "outline",
};

export default async function DashboardPage() {
  // Both cached — no extra network calls vs layout
  const [user, practiceUser] = await Promise.all([getCachedUser(), getCachedPracticeUser()]);
  if (!user || !practiceUser) return null;

  const role = practiceUser.role;
  const supabase = await createClient();
  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");

  // For doctors: resolve their doctor record in parallel with nothing else to wait on
  let doctorId: string | null = null;
  if (role === "doctor") {
    const { data: doctor } = await supabase
      .from("doctors")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    doctorId = doctor?.id ?? null;
  }

  let query = supabase
    .from("appointments")
    .select(`
      id, starts_at, ends_at, status, reference_number, notes,
      doctors(full_name, title),
      patients(first_name, last_name, mobile, email),
      services(name, duration_minutes)
    `)
    .gte("starts_at", `${todayStr}T00:00:00+02:00`)
    .lte("starts_at", `${todayStr}T23:59:59+02:00`)
    .order("starts_at");

  if (doctorId) query = query.eq("doctor_id", doctorId);

  const { data: appointments, error } = await query;

  const stats = {
    total: appointments?.length ?? 0,
    confirmed: appointments?.filter((a) => a.status === "confirmed").length ?? 0,
    pending: appointments?.filter((a) => a.status === "pending").length ?? 0,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Today — {format(today, "EEEE, d MMMM yyyy")}</h1>
        <p className="text-muted-foreground mt-1">
          {role === "doctor" ? "Your schedule" : "Practice schedule"}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total Today" value={stats.total} />
        <StatCard label="Confirmed" value={stats.confirmed} />
        <StatCard label="Pending" value={stats.pending} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Today&apos;s Appointments</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <p className="text-sm text-destructive">
              Could not load appointments. Ensure database migrations have been run.
            </p>
          )}
          {!error && (!appointments || appointments.length === 0) && (
            <p className="text-sm text-muted-foreground">No appointments scheduled for today.</p>
          )}
          {appointments && appointments.length > 0 && (
            <div className="space-y-3">
              {appointments.map((appt) => {
                const doctor = appt.doctors as { full_name: string; title: string } | null;
                const patient = appt.patients as { first_name: string; last_name: string; mobile: string; email: string } | null;
                const service = appt.services as { name: string; duration_minutes: number } | null;
                const time = format(new Date(appt.starts_at), "HH:mm");

                return (
                  <div key={appt.id} className="flex items-start justify-between gap-4 p-4 rounded-lg border bg-background">
                    <div className="flex gap-4 items-start">
                      <div className="text-sm font-mono font-bold text-primary w-12 shrink-0 pt-0.5">{time}</div>
                      <div>
                        <div className="font-medium">{patient?.first_name} {patient?.last_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {service?.name} · {doctor?.title} {doctor?.full_name}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {patient?.mobile} · {appt.reference_number}
                        </div>
                        {appt.notes && (
                          <div className="text-xs text-muted-foreground mt-1 italic">&ldquo;{appt.notes}&rdquo;</div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <Badge variant={statusVariant[appt.status] ?? "outline"}>{appt.status}</Badge>
                      <StatusUpdater appointmentId={appt.id} currentStatus={appt.status} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-3xl font-bold">{value}</div>
        <div className="text-sm text-muted-foreground mt-1">{label}</div>
      </CardContent>
    </Card>
  );
}
