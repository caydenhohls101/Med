import Link from "next/link";
import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { VerifyToggle } from "../verify-toggle";

const STATUS_COLOR: Record<string, string> = {
  pending:   "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  confirmed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  cancelled: "bg-gray-100  text-gray-500  dark:bg-gray-800     dark:text-gray-400",
  completed: "bg-blue-100  text-blue-800  dark:bg-blue-900/30  dark:text-blue-300",
  no_show:   "bg-red-100   text-red-700   dark:bg-red-900/30   dark:text-red-400",
};

export default async function AdminPracticeDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = createServiceClient();

  const { data: practice } = await supabase
    .from("practices")
    .select("id, name, slug, address_line1, suburb, city, province, postal_code, phone, email, created_at, is_verified, verified_at, subscription_status, subscription_plan, trial_ends_at, latitude, longitude, settings, brand_color")
    .eq("slug", slug)
    .maybeSingle();

  if (!practice) notFound();

  const [{ data: doctors }, { data: services }, { data: bookings }, { data: patients }] = await Promise.all([
    supabase.from("doctors").select("id, full_name, title, specialty, hpcsa_number, active, default_appointment_duration_minutes, color").eq("practice_id", practice.id).order("full_name"),
    supabase.from("services").select("id, name, duration_minutes, price_cents, active").eq("practice_id", practice.id).order("display_order"),
    supabase.from("appointments").select(`
      id, starts_at, status, reference_number, created_at,
      doctors(full_name, title), patients(first_name, last_name), services(name)
    `).eq("practice_id", practice.id).order("starts_at", { ascending: false }).limit(50),
    supabase.from("patients").select("id, first_name, last_name, email, mobile, created_at").eq("practice_id", practice.id).is("deleted_at", null).order("created_at", { ascending: false }),
  ]);

  const settings = practice.settings as Record<string, boolean | number> | null;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/admin" className="hover:text-foreground">Admin</Link>
        <span>/</span>
        <span className="text-foreground font-medium">{practice.name}</span>
      </div>

      {/* Practice header */}
      <div className="bg-background rounded-2xl border p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-xl shrink-0" style={{ backgroundColor: practice.brand_color ?? "#2563EB" }}>
              {practice.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold">{practice.name}</h1>
                {practice.is_verified && <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-semibold">✅ Verified</span>}
              </div>
              <div className="text-sm text-muted-foreground mt-1 space-y-0.5">
                <div>📍 {practice.address_line1}, {practice.suburb}, {practice.city}, {practice.province} {practice.postal_code}</div>
                <div>📞 {practice.phone} · ✉️ {practice.email}</div>
                <div className="font-mono text-xs">/book/{practice.slug}</div>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <VerifyToggle practiceId={practice.id} isVerified={practice.is_verified ?? false} />
            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold capitalize ${
              practice.subscription_status === "active" ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"
            }`}>{practice.subscription_plan} · {practice.subscription_status}</span>
            <span className="text-xs text-muted-foreground">On map: {practice.latitude ? "✓" : "✗"}</span>
          </div>
        </div>
      </div>

      {/* Settings */}
      <div className="grid sm:grid-cols-4 gap-3">
        {[
          { label: "Booking Open",     value: settings?.booking_open ? "Yes" : "No" },
          { label: "Auto Confirm",     value: settings?.auto_confirm ? "Yes" : "No" },
          { label: "Notice (hours)",   value: String(settings?.booking_notice_hours ?? "—") },
          { label: "Max advance (days)",value: String(settings?.max_advance_days ?? "—") },
        ].map((s) => (
          <div key={s.label} className="bg-background rounded-xl border p-3 text-center">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">{s.label}</div>
            <div className="font-bold text-lg mt-0.5">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Doctors */}
        <section className="space-y-3">
          <h2 className="font-bold">Doctors ({doctors?.length ?? 0})</h2>
          <div className="bg-background rounded-2xl border divide-y shadow-sm">
            {(doctors ?? []).length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">No doctors added.</div>}
            {(doctors ?? []).map((d) => (
              <div key={d.id} className="p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0" style={{ backgroundColor: d.color }}>
                  {d.full_name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{d.title} {d.full_name}</div>
                  <div className="text-xs text-muted-foreground">{d.specialty} · {d.default_appointment_duration_minutes}min slots</div>
                  {d.hpcsa_number && <div className="text-xs text-muted-foreground font-mono">HPCSA: {d.hpcsa_number}</div>}
                </div>
                <Badge variant={d.active ? "success" : "outline"} className="shrink-0 text-xs">{d.active ? "Active" : "Inactive"}</Badge>
              </div>
            ))}
          </div>
        </section>

        {/* Services */}
        <section className="space-y-3">
          <h2 className="font-bold">Services ({services?.length ?? 0})</h2>
          <div className="bg-background rounded-2xl border divide-y shadow-sm">
            {(services ?? []).length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">No services added.</div>}
            {(services ?? []).map((s) => (
              <div key={s.id} className="p-4 flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium text-sm">{s.name}</div>
                  <div className="text-xs text-muted-foreground">{s.duration_minutes} min {s.price_cents > 0 ? `· R${(s.price_cents / 100).toFixed(2)}` : "· Free"}</div>
                </div>
                <Badge variant={s.active ? "success" : "outline"} className="shrink-0 text-xs">{s.active ? "Active" : "Off"}</Badge>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Patients */}
      <section className="space-y-3">
        <h2 className="font-bold">Patients ({patients?.length ?? 0})</h2>
        <div className="bg-background rounded-2xl border overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/20">
                {["Name","Email","Mobile","Registered",""].map((h) => (
                  <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(patients ?? []).map((p) => (
                <tr key={p.id} className="border-b hover:bg-muted/20 transition-colors">
                  <td className="py-3 px-4 font-medium">{p.first_name} {p.last_name}</td>
                  <td className="py-3 px-4 text-xs text-muted-foreground">{p.email ?? "—"}</td>
                  <td className="py-3 px-4 text-xs text-muted-foreground">{p.mobile}</td>
                  <td className="py-3 px-4 text-xs text-muted-foreground">{p.created_at ? format(new Date(p.created_at), "d MMM yyyy") : "—"}</td>
                  <td className="py-3 px-4"><Link href={`/admin/patients/${p.id}`} className="text-xs text-primary hover:underline">View bookings</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!patients || patients.length === 0) && <div className="p-8 text-center text-sm text-muted-foreground">No patients yet.</div>}
        </div>
      </section>

      {/* Recent bookings */}
      <section className="space-y-3">
        <h2 className="font-bold">Bookings ({bookings?.length ?? 0})</h2>
        <div className="bg-background rounded-2xl border overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/20">
                  {["Ref","Patient","Doctor","Service","Appointment","Booked","Status"].map((h) => (
                    <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(bookings ?? []).map((b) => {
                  const pat = b.patients as { first_name: string; last_name: string } | null;
                  const doc = b.doctors  as { full_name: string; title: string } | null;
                  const svc = b.services as { name: string } | null;
                  return (
                    <tr key={b.id} className="border-b hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-4 font-mono text-xs text-muted-foreground">{b.reference_number}</td>
                      <td className="py-3 px-4 font-medium text-sm">{pat?.first_name} {pat?.last_name}</td>
                      <td className="py-3 px-4 text-xs text-muted-foreground">{doc?.title} {doc?.full_name}</td>
                      <td className="py-3 px-4 text-xs text-muted-foreground">{svc?.name}</td>
                      <td className="py-3 px-4 text-xs font-mono">
                        <div>{format(new Date(b.starts_at), "d MMM yyyy")}</div>
                        <div className="text-muted-foreground">{format(new Date(b.starts_at), "HH:mm")}</div>
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground">{b.created_at ? format(new Date(b.created_at), "d MMM") : "—"}</td>
                      <td className="py-3 px-4">
                        <span className={`text-xs px-2 py-1 rounded-full font-semibold capitalize ${STATUS_COLOR[b.status] ?? "bg-muted text-muted-foreground"}`}>
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {(!bookings || bookings.length === 0) && <div className="p-8 text-center text-sm text-muted-foreground">No bookings yet.</div>}
          </div>
        </div>
      </section>
    </div>
  );
}
