import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AddDoctorForm } from "./add-doctor-form";
import { UserRound } from "lucide-react";

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
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Doctors</h1>
        <p className="text-muted-foreground mt-1">Manage the doctors in your practice</p>
      </div>

      <div className="grid xl:grid-cols-2 gap-8 items-start">
        {/* Current doctors */}
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-muted-foreground uppercase tracking-wide text-xs">
            Current Doctors ({doctors?.length ?? 0})
          </h2>
          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">
              Could not load doctors. Run database migrations first.
            </p>
          )}
          {!error && (!doctors || doctors.length === 0) && (
            <div className="text-center py-12 border rounded-xl bg-background text-muted-foreground">
              <UserRound className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No doctors added yet.</p>
              <p className="text-xs mt-1">Add your first doctor using the form.</p>
            </div>
          )}
          <div className="space-y-3">
            {doctors?.map((doc) => (
              <Card key={doc.id} className="rounded-xl">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold shrink-0"
                      style={{ backgroundColor: doc.color }}
                    >
                      {doc.full_name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold">{doc.title} {doc.full_name}</div>
                      {doc.specialty && <div className="text-sm text-muted-foreground">{doc.specialty}</div>}
                      <div className="flex gap-2 mt-1.5 flex-wrap text-xs text-muted-foreground">
                        {doc.hpcsa_number && <span>HPCSA: {doc.hpcsa_number}</span>}
                        <span>{doc.default_appointment_duration_minutes} min slots</span>
                      </div>
                    </div>
                    <Badge variant={doc.active ? "success" : "outline"} className="shrink-0">
                      {doc.active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Add doctor form */}
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-muted-foreground uppercase tracking-wide text-xs">
            Add Doctor
          </h2>
          <Card className="rounded-xl">
            <CardContent className="pt-6">
              <AddDoctorForm practiceId={practiceUser?.practice_id ?? ""} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
