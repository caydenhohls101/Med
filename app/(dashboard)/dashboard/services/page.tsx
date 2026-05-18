import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AddServiceForm } from "./add-service-form";
import { Stethoscope } from "lucide-react";

export default async function ServicesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: practiceUser } = await supabase
    .from("practice_users")
    .select("role, practice_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (practiceUser?.role === "doctor") redirect("/dashboard");

  const { data: services, error } = await supabase
    .from("services")
    .select("id, name, duration_minutes, price_cents, description, active, requires_referral")
    .order("display_order");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Services</h1>
        <p className="text-muted-foreground mt-1">What your practice offers to patients</p>
      </div>

      <div className="grid xl:grid-cols-2 gap-8 items-start">
        {/* Current services */}
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-muted-foreground uppercase tracking-wide text-xs">
            Current Services ({services?.length ?? 0})
          </h2>
          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">
              Could not load services. Run database migrations first.
            </p>
          )}
          {!error && (!services || services.length === 0) && (
            <div className="text-center py-12 border rounded-xl bg-background text-muted-foreground">
              <Stethoscope className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No services added yet.</p>
              <p className="text-xs mt-1">Add services so patients can choose when booking.</p>
            </div>
          )}
          <div className="space-y-3">
            {services?.map((svc) => (
              <Card key={svc.id} className="rounded-xl">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold">{svc.name}</div>
                      {svc.description && (
                        <div className="text-sm text-muted-foreground mt-0.5">{svc.description}</div>
                      )}
                      <div className="flex gap-2 mt-2 flex-wrap">
                        <Badge variant="secondary">{svc.duration_minutes} min</Badge>
                        {svc.price_cents > 0 && (
                          <Badge variant="outline">R{(svc.price_cents / 100).toFixed(2)}</Badge>
                        )}
                        {svc.requires_referral && (
                          <Badge variant="outline">Referral needed</Badge>
                        )}
                      </div>
                    </div>
                    <Badge variant={svc.active ? "success" : "outline"} className="shrink-0 mt-0.5">
                      {svc.active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Add service form */}
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-muted-foreground uppercase tracking-wide text-xs">
            Add Service
          </h2>
          <Card className="rounded-xl">
            <CardContent className="pt-6">
              <AddServiceForm practiceId={practiceUser?.practice_id ?? ""} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
