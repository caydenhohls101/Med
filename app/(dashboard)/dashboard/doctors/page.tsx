import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AddDoctorForm } from "./add-doctor-form";

export default async function DoctorsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: practiceUser } = await supabase
    .from("practice_users")
    .select("role, practice_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (practiceUser?.role === "doctor") redirect("/dashboard");

  const { data: doctors, error } = await supabase
    .from("doctors")
    .select("id, full_name, title, specialty, hpcsa_number, active, default_appointment_duration_minutes, color")
    .order("full_name");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Doctors</h1>
        <p className="text-muted-foreground mt-1">Manage doctors in your practice</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <h2 className="text-base font-semibold">Current Doctors ({doctors?.length ?? 0})</h2>
          {error && <p className="text-sm text-destructive">Could not load doctors. Run migrations first.</p>}
          {!error && (!doctors || doctors.length === 0) && (
            <p className="text-sm text-muted-foreground">No doctors added yet.</p>
          )}
          {doctors?.map((doc) => (
            <Card key={doc.id}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                    style={{ backgroundColor: doc.color }}
                  >
                    {doc.full_name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{doc.title} {doc.full_name}</div>
                    {doc.specialty && <div className="text-sm text-muted-foreground">{doc.specialty}</div>}
                    {doc.hpcsa_number && <div className="text-xs text-muted-foreground">HPCSA: {doc.hpcsa_number}</div>}
                    <div className="text-xs text-muted-foreground">{doc.default_appointment_duration_minutes} min slots</div>
                  </div>
                  <Badge variant={doc.active ? "success" : "outline"}>
                    {doc.active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div>
          <h2 className="text-base font-semibold mb-4">Add Doctor</h2>
          <Card>
            <CardContent className="pt-6">
              <AddDoctorForm practiceId={practiceUser?.practice_id ?? ""} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
