import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AddServiceForm } from "./add-service-form";

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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Services</h1>
        <p className="text-muted-foreground mt-1">Manage what your practice offers</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <h2 className="text-base font-semibold">Current Services ({services?.length ?? 0})</h2>
          {error && <p className="text-sm text-destructive">Could not load services. Run migrations first.</p>}
          {!error && (!services || services.length === 0) && (
            <p className="text-sm text-muted-foreground">No services added yet.</p>
          )}
          {services?.map((svc) => (
            <Card key={svc.id}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium">{svc.name}</div>
                    {svc.description && <div className="text-sm text-muted-foreground">{svc.description}</div>}
                    <div className="flex gap-2 mt-2 flex-wrap">
                      <Badge variant="secondary">{svc.duration_minutes} min</Badge>
                      {svc.price_cents > 0 && (
                        <Badge variant="outline">R{(svc.price_cents / 100).toFixed(2)}</Badge>
                      )}
                      {svc.requires_referral && <Badge variant="outline">Referral</Badge>}
                    </div>
                  </div>
                  <Badge variant={svc.active ? "success" : "outline"}>
                    {svc.active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div>
          <h2 className="text-base font-semibold mb-4">Add Service</h2>
          <Card>
            <CardContent className="pt-6">
              <AddServiceForm practiceId={practiceUser?.practice_id ?? ""} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
