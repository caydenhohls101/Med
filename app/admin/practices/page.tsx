import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import Link from "next/link";
import { VerifyToggle } from "./verify-toggle";

export default async function AdminPracticesPage() {
  const supabase = createServiceClient();

  const [{ data: practices }, { data: { user } }] = await Promise.all([
    supabase
      .from("practices")
      .select("id, name, slug, city, province, email, phone, subscription_status, subscription_plan, created_at, is_verified, latitude, longitude")
      .order("created_at", { ascending: false }),
    createClient().then((c) => c.auth.getUser()),
  ]);

  const total = practices?.length ?? 0;
  const verified = practices?.filter((p) => p.is_verified).length ?? 0;
  const withCoords = practices?.filter((p) => p.latitude && p.longitude).length ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">All Practices</h1>
        <p className="text-muted-foreground mt-1">Every practice registered on MediBook SA</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Practices", value: total },
          { label: "Verified", value: verified },
          { label: "On Map", value: withCoords },
        ].map((s) => (
          <div key={s.label} className="bg-background rounded-xl border p-5">
            <div className="text-3xl font-bold">{s.value}</div>
            <div className="text-sm text-muted-foreground mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-background rounded-xl border overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between">
          <span className="font-semibold text-sm">Registered Practices</span>
          <Link href="/admin/prospects" className="text-xs text-primary hover:underline">+ Find new prospects →</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                {["Practice", "Location", "Plan", "Verified", "Map", "Joined", "Actions"].map((h) => (
                  <th key={h} className="text-left py-3 px-4 font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(practices ?? []).map((p) => (
                <tr key={p.id} className="border-b hover:bg-muted/20 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground font-mono">/book/{p.slug}</div>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">
                    {p.city}, {p.province}
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant={p.subscription_status === "active" ? "success" : "outline"} className="text-xs capitalize">
                      {p.subscription_plan ?? "starter"}
                    </Badge>
                  </td>
                  <td className="py-3 px-4">
                    <VerifyToggle practiceId={p.id} isVerified={p.is_verified ?? false} />
                  </td>
                  <td className="py-3 px-4">
                    {p.latitude ? (
                      <span className="text-green-600 text-xs font-medium">✓ On map</span>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-muted-foreground text-xs">
                    {p.created_at ? format(new Date(p.created_at), "d MMM yyyy") : "—"}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2">
                      <Link href={`/browse/${p.slug}`} className="text-xs text-primary hover:underline">View</Link>
                      <Link href={`/dashboard`} className="text-xs text-muted-foreground hover:underline">Email</Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!practices || practices.length === 0) && (
            <div className="p-10 text-center text-muted-foreground text-sm">
              No practices registered yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
