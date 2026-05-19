import Link from "next/link";
import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const STATUS_COLOR: Record<string, string> = {
  pending: "warning", confirmed: "success", cancelled: "destructive",
  completed: "secondary", no_show: "outline",
};

export default async function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServiceClient();

  const [{ data: patient }, { data: bookings }] = await Promise.all([
    supabase
      .from("patients")
      .select("id, first_name, last_name, email, mobile, date_of_birth, gender, address, medical_aid_scheme, medical_aid_number, allergies, chronic_conditions, created_at, practices:practice_id(name, slug)")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("appointments")
      .select(`
        id, starts_at, ends_at, status, reference_number, notes, created_at,
        doctors(full_name, title),
        services(name, price_cents),
        practices:practice_id(name, slug)
      `)
      .eq("patient_id", id)
      .order("starts_at", { ascending: false }),
  ]);

  if (!patient) notFound();

  const practice = patient.practices as { name: string; slug: string } | null;

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin" className="text-sm text-muted-foreground hover:text-foreground">← Admin Home</Link>
      </div>

      {/* Patient header */}
      <div className="bg-background rounded-2xl border p-6 flex items-start justify-between gap-4 flex-wrap shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary text-xl font-bold">
            {patient.first_name.charAt(0)}{patient.last_name.charAt(0)}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{patient.first_name} {patient.last_name}</h1>
            <div className="text-sm text-muted-foreground mt-0.5 space-y-0.5">
              {patient.email && <div>✉️ {patient.email}</div>}
              <div>📞 {patient.mobile}</div>
              {practice && (
                <div>🏥 <Link href={`/browse/${practice.slug}`} className="text-primary hover:underline">{practice.name}</Link></div>
              )}
            </div>
          </div>
        </div>
        <div className="text-xs text-muted-foreground text-right">
          <div>Patient since</div>
          <div className="font-semibold text-foreground">{patient.created_at ? format(new Date(patient.created_at), "d MMMM yyyy") : "—"}</div>
        </div>
      </div>

      {/* Medical info */}
      <div className="grid sm:grid-cols-2 gap-4">
        {[
          { label: "Date of Birth",    value: patient.date_of_birth ? format(new Date(patient.date_of_birth), "d MMM yyyy") : "—" },
          { label: "Gender",           value: patient.gender ?? "—" },
          { label: "Medical Aid",      value: patient.medical_aid_scheme ? `${patient.medical_aid_scheme} ${patient.medical_aid_number ?? ""}`.trim() : "—" },
          { label: "Address",          value: patient.address ?? "—" },
          { label: "Allergies",        value: patient.allergies ?? "None recorded" },
          { label: "Chronic Conditions", value: patient.chronic_conditions ?? "None recorded" },
        ].map((row) => (
          <div key={row.label} className="bg-background rounded-xl border p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1">{row.label}</div>
            <div className="text-sm font-medium capitalize">{row.value}</div>
          </div>
        ))}
      </div>

      {/* Bookings */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold">Booking History ({bookings?.length ?? 0})</h2>
        <div className="bg-background rounded-2xl border overflow-hidden shadow-sm">
          {(!bookings || bookings.length === 0) ? (
            <div className="p-10 text-center text-muted-foreground text-sm">No bookings on record.</div>
          ) : (
            <div className="divide-y">
              {bookings.map((b) => {
                const doc = b.doctors  as { full_name: string; title: string } | null;
                const svc = b.services as { name: string; price_cents: number } | null;
                const prc = b.practices as { name: string; slug: string } | null;
                return (
                  <div key={b.id} className="p-4 flex items-start justify-between gap-4 hover:bg-muted/20 transition-colors">
                    <div className="flex gap-3 items-start">
                      <div className="bg-primary/10 rounded-xl px-3 py-2 text-center shrink-0 min-w-[56px]">
                        <div className="text-[10px] font-bold text-primary uppercase">{format(new Date(b.starts_at), "MMM")}</div>
                        <div className="text-xl font-bold text-primary leading-tight">{format(new Date(b.starts_at), "d")}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">{format(new Date(b.starts_at), "HH:mm")}</div>
                      </div>
                      <div>
                        <div className="font-semibold text-sm">{prc?.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {doc?.title} {doc?.full_name} · {svc?.name}
                          {svc?.price_cents ? ` · R${(svc.price_cents / 100).toFixed(2)}` : ""}
                        </div>
                        <div className="font-mono text-[10px] text-muted-foreground mt-0.5">{b.reference_number}</div>
                        {b.notes && <div className="text-xs italic text-muted-foreground mt-1">"{b.notes}"</div>}
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          Booked: {b.created_at ? format(new Date(b.created_at), "d MMM yyyy") : "—"}
                        </div>
                      </div>
                    </div>
                    <Badge variant={(STATUS_COLOR[b.status] ?? "outline") as "warning" | "success" | "destructive" | "secondary" | "outline"} className="shrink-0 text-xs capitalize">
                      {b.status}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
