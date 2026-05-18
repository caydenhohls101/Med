import { createClient } from "@/lib/supabase/server";
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

export default async function BookingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: practiceUser } = await supabase
    .from("practice_users")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  let doctorId: string | null = null;
  if (practiceUser?.role === "doctor") {
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
      id, starts_at, ends_at, status, reference_number, notes, created_at,
      doctors(full_name, title),
      patients(first_name, last_name, mobile, email),
      services(name, duration_minutes)
    `)
    .order("starts_at", { ascending: false })
    .limit(100);

  if (doctorId) {
    query = query.eq("doctor_id", doctorId);
  }

  const { data: appointments, error } = await query;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">All Bookings</h1>
        <p className="text-muted-foreground mt-1">
          {practiceUser?.role === "doctor" ? "Your appointments" : "All practice appointments"} — most recent first
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Appointments ({appointments?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <p className="text-sm text-destructive">
              Could not load appointments. Ensure database migrations have been run.
            </p>
          )}
          {!error && (!appointments || appointments.length === 0) && (
            <p className="text-sm text-muted-foreground">No appointments yet.</p>
          )}
          {appointments && appointments.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Appointment</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Patient</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Doctor</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Service</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Booked</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Ref</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Status</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((appt) => {
                    const doctor = appt.doctors as { full_name: string; title: string } | null;
                    const patient = appt.patients as { first_name: string; last_name: string; mobile: string } | null;
                    const service = appt.services as { name: string } | null;

                    return (
                      <tr key={appt.id} className="border-b hover:bg-muted/50 transition-colors">
                        <td className="py-3 px-2">
                          <div className="font-semibold text-sm">{format(new Date(appt.starts_at), "d MMM yyyy")}</div>
                          <div className="text-muted-foreground text-xs font-mono">{format(new Date(appt.starts_at), "HH:mm")}</div>
                        </td>
                        <td className="py-3 px-2">
                          <div className="font-medium text-sm">{patient?.first_name} {patient?.last_name}</div>
                          <div className="text-muted-foreground text-xs">{patient?.mobile}</div>
                        </td>
                        <td className="py-3 px-2 text-sm">
                          {doctor?.title} {doctor?.full_name}
                        </td>
                        <td className="py-3 px-2 text-sm">{service?.name}</td>
                        <td className="py-3 px-2 text-xs text-muted-foreground">
                          {appt.created_at ? format(new Date(appt.created_at), "d MMM yyyy") : "—"}
                        </td>
                        <td className="py-3 px-2 font-mono text-xs text-muted-foreground">{appt.reference_number}</td>
                        <td className="py-3 px-2">
                          <Badge variant={statusVariant[appt.status] ?? "outline"}>
                            {appt.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-2">
                          <StatusUpdater appointmentId={appt.id} currentStatus={appt.status} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
