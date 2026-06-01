import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { Navbar } from "@/components/navbar";
import { Badge } from "@/components/ui/badge";
import { CancelBookingBtn } from "@/components/patient/cancel-booking-btn";
import { format, isFuture, isPast } from "date-fns";

const STATUS_COLOR: Record<string, string> = {
  pending:   "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  confirmed: "bg-green-100  text-green-800  dark:bg-green-900/30  dark:text-green-300",
  completed: "bg-blue-100   text-blue-800   dark:bg-blue-900/30   dark:text-blue-300",
  cancelled: "bg-gray-100   text-gray-500   dark:bg-gray-800      dark:text-gray-400",
  no_show:   "bg-red-100    text-red-700    dark:bg-red-900/30    dark:text-red-400",
};

export default async function MyAppointmentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/my-appointments");

  const serviceSupabase = createServiceClient();

  // Find all patient records matching this user's email (across any practice)
  const { data: patientRecords } = await serviceSupabase
    .from("patients")
    .select("id")
    .eq("email", user.email ?? "");

  const patientIds = (patientRecords ?? []).map((p) => p.id);

  const { data: appointments } = patientIds.length > 0
    ? await serviceSupabase
        .from("appointments")
        .select(`
          id, starts_at, ends_at, status, reference_number, created_at, notes,
          doctors(full_name, title),
          services(name, price_cents),
          practices:practice_id(id, name, slug, phone, email)
        `)
        .in("patient_id", patientIds)
        .order("starts_at", { ascending: false })
    : { data: [] };

  const all = appointments ?? [];
  const upcoming = all.filter((a) => ["pending","confirmed"].includes(a.status) && isFuture(new Date(a.starts_at)));
  const past     = all.filter((a) => !["pending","confirmed"].includes(a.status) || isPast(new Date(a.starts_at)));

  // Check if user is also practice staff — show dashboard link
  const { data: practiceUser } = await supabase
    .from("practice_users")
    .select("role, practices(name, slug)")
    .eq("user_id", user.id)
    .maybeSingle();

  const email = user.email ?? "";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <div className="max-w-3xl mx-auto w-full px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold">My Appointments</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              All your personal bookings across any practice
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {practiceUser && (
              <Link
                href="/dashboard"
                className="text-sm border px-4 py-2 rounded-xl hover:bg-muted transition-colors"
              >
                📊 Practice Dashboard
              </Link>
            )}
            <Link
              href="/browse"
              className="text-sm bg-primary text-primary-foreground px-4 py-2 rounded-xl hover:bg-primary/90 transition-colors font-medium"
            >
              + Book Appointment
            </Link>
          </div>
        </div>

        {/* Dual-account banner */}
        {practiceUser && (
          <div className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-3 text-sm flex items-center gap-3">
            <span className="text-xl">🏥</span>
            <div>
              <span className="font-semibold">
                You&apos;re also {(practiceUser.practices as any)?.name} staff ({practiceUser.role}).
              </span>{" "}
              This page shows your <em>personal</em> appointments. Use the{" "}
              <Link href="/dashboard" className="text-primary hover:underline font-medium">dashboard</Link>{" "}
              to manage practice bookings.
            </div>
          </div>
        )}

        {/* Empty state */}
        {all.length === 0 && (
          <div className="text-center py-20 space-y-4">
            <div className="text-5xl">📅</div>
            <h3 className="text-xl font-semibold">No appointments yet</h3>
            <p className="text-muted-foreground">Find a doctor near you and book your first appointment.</p>
            <Link href="/browse"><button className="mt-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-semibold hover:bg-primary/90 transition-colors">Find a Doctor →</button></Link>
          </div>
        )}

        {/* Upcoming */}
        {upcoming.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Upcoming ({upcoming.length})
            </h2>
            {upcoming.map((a) => <AppointmentCard key={a.id} appt={a} email={email} upcoming />)}
          </section>
        )}

        {/* Past */}
        {past.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-muted-foreground flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-muted-foreground inline-block" /> Past Appointments
            </h2>
            {past.map((a) => <AppointmentCard key={a.id} appt={a} email={email} />)}
          </section>
        )}
      </div>
    </div>
  );
}

function AppointmentCard({ appt, email, upcoming }: { appt: Record<string, any>; email: string; upcoming?: boolean }) {
  const doc     = appt.doctors  as { full_name: string; title: string } | null;
  const svc     = appt.services as { name: string; price_cents: number } | null;
  const prc     = appt.practices as { id: string; name: string; slug: string; phone: string | null; email: string | null } | null;
  const start   = new Date(appt.starts_at);
  const booked  = appt.created_at ? new Date(appt.created_at) : null;
  const colorCls = STATUS_COLOR[appt.status] ?? STATUS_COLOR.pending;

  return (
    <div className={`glass-card bg-background rounded-2xl border p-5 space-y-3 ${!upcoming ? "opacity-75" : ""}`}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex gap-4 items-start">
          <div className="bg-primary/10 rounded-xl p-3 text-center shrink-0 min-w-[60px]">
            <div className="text-xs font-bold text-primary uppercase">{format(start, "MMM")}</div>
            <div className="text-2xl font-bold text-primary leading-tight">{format(start, "d")}</div>
            <div className="text-xs text-muted-foreground font-mono">{format(start, "HH:mm")}</div>
          </div>
          <div>
            <div className="font-bold text-base">{prc?.name ?? "—"}</div>
            <div className="text-sm text-muted-foreground">{doc?.title} {doc?.full_name} · {svc?.name}</div>
            {svc?.price_cents && svc.price_cents > 0 && (
              <div className="text-xs text-muted-foreground">R{(svc.price_cents / 100).toFixed(2)}</div>
            )}
            {booked && <div className="text-xs text-muted-foreground/60 mt-0.5">Booked {format(booked, "d MMM yyyy")}</div>}
          </div>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold capitalize ${colorCls}`}>
          {appt.status}
        </span>
      </div>

      {/* Reference */}
      <div className="font-mono text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-1.5 inline-block">
        Ref: {appt.reference_number}
      </div>

      {/* Notes */}
      {appt.notes && (
        <div className="text-sm italic text-muted-foreground bg-muted/20 rounded-xl px-3 py-2">
          &ldquo;{appt.notes}&rdquo;
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 flex-wrap pt-1">
        {/* Cancel — upcoming pending/confirmed */}
        {upcoming && ["pending","confirmed"].includes(appt.status) && prc && (
          <CancelBookingBtn
            referenceNumber={appt.reference_number}
            patientEmail={email}
            practiceName={prc.name}
            dateTime={`${format(start, "EEE d MMM")} at ${format(start, "HH:mm")}`}
          />
        )}

        {/* Reschedule — contact practice */}
        {upcoming && prc?.phone && (
          <a
            href={`https://wa.me/${prc.phone.replace(/\D/g, "")}?text=${encodeURIComponent(
              `Hi! I'd like to reschedule my appointment on ${format(start, "d MMMM")} at ${format(start, "HH:mm")}. Ref: ${appt.reference_number}`
            )}`}
            target="_blank" rel="noreferrer"
            className="text-xs px-3 py-1.5 rounded-xl border border-primary/30 text-primary hover:bg-primary/5 transition-colors font-medium"
          >
            💬 Request Reschedule
          </a>
        )}

        {/* Book again — completed or cancelled */}
        {!upcoming && prc && (
          <Link
            href={`/book/${prc.slug}`}
            className="text-xs px-3 py-1.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
          >
            Book Again →
          </Link>
        )}

        {/* View practice */}
        {prc && (
          <Link
            href={`/browse/${prc.slug}`}
            className="text-xs px-3 py-1.5 rounded-xl border hover:bg-muted transition-colors text-muted-foreground"
          >
            View Practice
          </Link>
        )}
      </div>
    </div>
  );
}
