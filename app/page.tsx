import Link from "next/link";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BentoGrid, type BentoItem } from "@/components/ui/bento-grid";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { CancelBookingBtn } from "@/components/patient/cancel-booking-btn";
import { PatientBookingCalendar } from "@/components/patient/patient-booking-calendar";
import { Calendar, MessageCircle, Users, BadgeCheck, BarChart3, Shield } from "lucide-react";
import { format } from "date-fns";
import {
  Calendar, MessageCircle, Building2, ShieldCheck, BarChart3, Lock,
  Stethoscope, Check, X, CheckCircle2, Star, Gift, ArrowRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────
// Status colours are dark-mode-aware — defined in lib/status-colors.ts
const STATUS_CONFIG: Record<string, { label: string; color: string; actions: string[] }> = {
  pending:   { label: "Pending",   color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300", actions: ["cancel"] },
  confirmed: { label: "Confirmed", color: "bg-green-100  text-green-800  dark:bg-green-900/30  dark:text-green-300",  actions: ["cancel"] },
  completed: { label: "Completed", color: "bg-blue-100   text-blue-800   dark:bg-blue-900/30   dark:text-blue-300",   actions: ["book-again"] },
  cancelled: { label: "Cancelled", color: "bg-gray-100   text-gray-600   dark:bg-gray-800      dark:text-gray-400",   actions: ["book-again"] },
  no_show:   { label: "No Show",   color: "bg-red-100    text-red-700    dark:bg-red-900/30    dark:text-red-400",    actions: ["book-again"] },
};

const FEATURE_ITEMS: BentoItem[] = [
  {
    icon: <Calendar className="w-4 h-4 text-blue-500" />,
    title: "Real-time Online Booking",
    description: "Patients book directly from your practice profile — available 24/7, no phone calls needed.",
    status: "Live",
    tags: ["24/7", "Self-service"],
    colSpan: 2,
    hasPersistentHover: true,
    cta: "See how →",
  },
  {
    icon: <MessageCircle className="w-4 h-4 text-green-500" />,
    title: "WhatsApp Confirmations",
    description: "Automated WhatsApp & email reminders cut no-shows by up to 40%.",
    status: "Free",
    tags: ["WhatsApp", "Email"],
    cta: "Learn more →",
  },
  {
    icon: <Users className="w-4 h-4 text-purple-500" />,
    title: "Multi-doctor Support",
    description: "Manage every doctor, service, and schedule from one dashboard.",
    status: "Unlimited",
    tags: ["Doctors", "Roles"],
    cta: "Explore →",
  },
  {
    icon: <BadgeCheck className="w-4 h-4 text-emerald-500" />,
    title: "Verified Practice Badge",
    description: "Complete your profile and earn a Verified badge — patients book with confidence.",
    status: "Free",
    tags: ["Trust", "Visibility"],
    colSpan: 2,
    cta: "Get verified →",
  },
  {
    icon: <BarChart3 className="w-4 h-4 text-orange-500" />,
    title: "Booking Analytics",
    description: "See your busiest days, most popular services, and no-show rates at a glance.",
    status: "Pro",
    tags: ["Reports", "Insights"],
    cta: "View plans →",
  },
  {
    icon: <Shield className="w-4 h-4 text-slate-500" />,
    title: "POPIA Compliant",
    description: "Patient data encrypted, stored securely, and fully compliant with SA privacy law.",
    status: "Certified",
    tags: ["POPIA", "Encryption"],
    cta: "Read more →",
  },
];

// ── Patient portal (logged-in patient home) ────────────────────────
async function PatientHome({ userId, name }: { userId: string; name: string }) {
  // Patients have no practice_users row, so the RLS appointments_select policy
  // blocks them. Use the service client and filter by their email instead.
  const authClient = await createClient();
  const { data: { user: authUser } } = await authClient.auth.getUser();
  const email = authUser?.email;

  const supabase = createServiceClient();

  // Find all patient records matching this email (across any practice)
  const { data: patientRows } = email
    ? await supabase.from("patients").select("id").eq("email", email)
    : { data: [] };

  const patientIds = (patientRows ?? []).map((p) => p.id);

  const { data: appointments } = patientIds.length > 0
    ? await supabase
        .from("appointments")
        .select(`
          id, starts_at, status, reference_number, created_at,
          doctors(full_name, title),
          services(name),
          practices:practice_id(name, slug)
        `)
        .in("patient_id", patientIds)
        .order("starts_at", { ascending: false })
        .limit(20)
    : { data: [] };

  // Inject the patient's email into each appointment record for the cancel button
  const appts = (appointments ?? []).map((a) => ({ ...a, _patientEmail: email ?? "" }));

  const upcoming = appts.filter(
    (a) => ["pending", "confirmed"].includes(a.status) && new Date(a.starts_at) > new Date()
  );
  const past = appts.filter(
    (a) => !["pending", "confirmed"].includes(a.status) || new Date(a.starts_at) <= new Date()
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="max-w-6xl mx-auto w-full px-6 py-8 space-y-8">
        {/* Welcome header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold">Welcome back, {name.split(" ")[0]} 👋</h1>
            <p className="text-muted-foreground mt-1">Manage your appointments below.</p>
          </div>
          <Link href="/browse">
            <Button>+ Book Appointment</Button>
          </Link>
        </div>

        {/* Booking calendar */}
        <PatientBookingCalendar
          previousPractices={[...new Map(
            appts
              .filter((a) => a.practices)
              .map((a) => [
                (a.practices as { slug: string } | null)?.slug,
                a.practices as { slug: string; name: string; suburb?: string; city?: string } | null,
              ])
          ).values()].filter(Boolean).slice(0, 3).map((p: any) => ({
            slug: p.slug, name: p.name, suburb: p.suburb ?? "", city: p.city ?? "",
          }))}
          appointments={appts.map((a) => ({
            id: a.id,
            starts_at: a.starts_at,
            status: a.status,
            reference_number: a.reference_number,
            practices: a.practices as { name: string; slug: string } | null,
            doctors: null,
            services: null,
          }))}
        />

        {/* Upcoming appointments */}
        {upcoming.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-base font-semibold">Upcoming</h2>
            {upcoming.map((appt) => <AppointmentCard key={appt.id} appt={appt} />)}
          </section>
        )}

        {past.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-muted-foreground">Past Appointments</h2>
            {past.map((appt) => <AppointmentCard key={appt.id} appt={appt} />)}
          </section>
        )}

        {/* Empty state */}
        {appts.length === 0 && (
          <div className="text-center py-20 space-y-4">
            <Calendar className="w-12 h-12 text-muted-foreground mx-auto" />
            <h3 className="text-xl font-semibold">No bookings yet</h3>
            <p className="text-muted-foreground">Find a doctor near you and book your first appointment.</p>
            <Link href="/browse">
              <Button size="lg" className="mt-2">Find a Doctor <ArrowRight className="w-4 h-4 ml-1" /></Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function AppointmentCard({ appt }: { appt: Record<string, any> }) {
  const cfg = STATUS_CONFIG[appt.status] ?? STATUS_CONFIG.pending;
  const doctor = appt.doctors as { full_name: string; title: string } | null;
  const service = appt.services as { name: string } | null;
  const practice = appt.practices as { name: string; slug: string } | null;
  const startDate = new Date(appt.starts_at);
  const bookedDate = appt.created_at ? new Date(appt.created_at) : null;
  const isPast = startDate < new Date();

  return (
    <div className={`rounded-xl border bg-background p-4 flex items-start justify-between gap-4 transition-opacity ${isPast ? "opacity-60" : ""}`}>
      <div className="flex gap-4 items-start">
        {/* Date block */}
        <div className="text-center bg-primary/10 rounded-xl p-2.5 shrink-0 min-w-[60px]">
          <div className="text-xs font-semibold text-primary uppercase">{format(startDate, "MMM")}</div>
          <div className="text-2xl font-bold text-primary leading-tight">{format(startDate, "d")}</div>
          <div className="text-xs text-muted-foreground">{format(startDate, "HH:mm")}</div>
        </div>
        <div className="min-w-0 space-y-0.5">
          <div className="font-semibold truncate">{practice?.name ?? "—"}</div>
          <div className="text-sm text-muted-foreground">{doctor?.title} {doctor?.full_name} · {service?.name}</div>
          <div className="text-xs text-muted-foreground font-mono">{appt.reference_number}</div>
          {bookedDate && (
            <div className="text-xs text-muted-foreground/60">Booked {format(bookedDate, "d MMM yyyy")}</div>
          )}
        </div>
      </div>
      <div className="flex flex-col items-end gap-2 shrink-0">
        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${cfg.color}`}>{cfg.label}</span>
        {practice?.slug && cfg.actions.includes("book-again") && (
          <Link href={`/book/${practice.slug}`} className="text-xs text-primary hover:underline">Book again</Link>
        )}
        {cfg.actions.includes("cancel") && appt.reference_number && (
          <CancelBookingBtn
            referenceNumber={appt.reference_number}
            patientEmail={appt._patientEmail ?? ""}
            practiceName={practice?.name ?? ""}
            dateTime={`${format(startDate, "EEE d MMM")} at ${format(startDate, "HH:mm")}`}
          />
        )}
      </div>
    </div>
  );
}

// ── Marketing page (not logged in) ────────────────────────────────
function MarketingPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-primary/10">
        <div className="max-w-6xl mx-auto px-6 py-20 md:py-32">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-sm font-semibold">
                🇿🇦 Built for South African Medical Practices
              </div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight">
                Your Practice,<br /><span className="text-primary">Fully Booked.</span>
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed">
                MediBook puts your practice on the map. Patients find you, book online, and get WhatsApp reminders. You get fewer no-shows and zero phone tag.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Link href="/signup/practice">
                  <Button size="lg" className="w-full sm:w-auto text-base px-8">
                    Start Free Trial <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
                <Link href="/browse">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto text-base">Find a Doctor</Button>
                </Link>
              </div>
              <p className="text-sm text-muted-foreground">14-day free trial · No credit card · Cancel anytime</p>
            </div>
            {/* Mock booking widget */}
            <div className="hidden md:block">
              <div className="bg-background rounded-2xl border shadow-2xl p-6 space-y-4 max-w-sm mx-auto">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Stethoscope className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-sm">Dr Jane Smith</div>
                    <div className="text-xs text-muted-foreground">General Practitioner · Sandton</div>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 font-semibold px-2 py-1 rounded-full">
                    <Check className="w-3 h-3" /> Verified
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {["08:00","08:30","09:00","09:30","10:00","10:30"].map((t, i) => (
                    <div key={t} className={`text-xs py-2 rounded-lg border font-mono text-center ${i === 2 ? "bg-primary text-primary-foreground border-primary" : "text-muted-foreground"}`}>{t}</div>
                  ))}
                </div>
                <div className="space-y-2">
                  <div className="text-xs border rounded-lg px-3 py-2 bg-muted/30 text-muted-foreground">Jane Smith</div>
                  <div className="text-xs border rounded-lg px-3 py-2 bg-muted/30 text-muted-foreground">0821234567</div>
                </div>
                <div className="w-full bg-primary text-primary-foreground text-sm font-semibold py-2.5 rounded-xl text-center">Confirm Booking</div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-green-50 dark:bg-green-950/40 rounded-lg p-2">
                  <span>💬</span><span>WhatsApp confirmation sent instantly</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Free Trial Banner — always visible */}
      <section className="bg-primary text-primary-foreground py-6">
        <div className="max-w-4xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div>
            <div className="flex items-center gap-2 font-bold text-lg justify-center sm:justify-start">
              <Gift className="w-5 h-5" />
              14-Day Free Trial — No Credit Card Required
            </div>
            <div className="text-primary-foreground/80 text-sm">Full Practice plan features. Setup in under 10 minutes.</div>
          </div>
          <Link href="/signup/practice" className="shrink-0">
            <Button variant="secondary" size="lg" className="font-semibold">
              Start Free Now <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12 space-y-3">
            <h2 className="text-3xl font-bold">Everything your practice needs</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              MedPages lists you. MediBook <em>books</em> you. Big difference.
            </p>
          </div>
          <BentoGrid items={FEATURE_ITEMS} cols={3} />
        </div>
      </section>

      {/* Verified badge section */}
      <section className="py-16 px-6 bg-gradient-to-br from-green-50 to-emerald-50 border-y">
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-10 items-center">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
              <CheckCircle2 className="w-4 h-4" /> Verified Practice Programme
            </div>
            <h2 className="text-3xl font-bold text-green-900">
              Build Patient Trust<br />From Day One
            </h2>
            <p className="text-green-800/80 leading-relaxed">
              Complete your MediBook profile — add your HPCSA numbers, photos, and services — and earn the <strong>Verified Practice</strong> badge. Verified practices appear first in search results and see higher booking rates.
            </p>
            <ul className="space-y-2 text-sm text-green-800">
              {["Appears first in directory search","Verified badge on all booking pages","Builds instant patient confidence","Free with any paid plan"].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-600 shrink-0" /> {item}
                </li>
              ))}
            </ul>
            <Link href="/signup/practice">
              <Button className="bg-green-700 hover:bg-green-800 text-white mt-2">
                Get Verified <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
          {/* Verified badge visual */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-56 h-56 rounded-3xl bg-white shadow-2xl flex flex-col items-center justify-center gap-3 border-4 border-green-500">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10 text-green-600" />
                </div>
                <div className="text-center">
                  <div className="font-bold text-green-800 text-lg">Verified</div>
                  <div className="text-xs text-green-600 font-medium">MediBook SA</div>
                </div>
                <div className="flex gap-1">
                  {[1,2,3,4,5].map((s) => (
                    <Star key={s} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
              </div>
              {/* Glow effect */}
              <div className="absolute inset-0 rounded-3xl bg-green-400/20 blur-xl -z-10 scale-110" />
            </div>
          </div>
        </div>
      </section>

      {/* Comparison table */}
      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">MediBook vs. just a directory</h2>
          <div className="rounded-2xl border overflow-hidden bg-background shadow-sm">
            <div className="grid grid-cols-3 bg-muted/40 text-sm font-semibold border-b">
              <div className="p-4">Feature</div>
              <div className="p-4 text-center text-primary">MediBook</div>
              <div className="p-4 text-center text-muted-foreground">Directory only</div>
            </div>
            {[
              { feat: "Listed on search map",       medibook: true as const,      dir: true  },
              { feat: "Online appointment booking", medibook: true as const,      dir: false },
              { feat: "WhatsApp confirmation",      medibook: true as const,      dir: false },
              { feat: "Patient reminders",          medibook: true as const,      dir: false },
              { feat: "Practice dashboard",         medibook: true as const,      dir: false },
              { feat: "Verified badge",             medibook: true as const,      dir: false },
              { feat: "Booking analytics",          medibook: true as const,      dir: false },
              { feat: "Patient payments",           medibook: "coming" as const,  dir: false },
            ].map(({ feat, medibook, dir }) => (
              <div key={feat} className="grid grid-cols-3 border-t text-sm hover:bg-muted/20 transition-colors">
                <div className="p-4 text-muted-foreground">{feat}</div>
                <div className="p-4 flex items-center justify-center">
                  {medibook === "coming"
                    ? <span className="text-xs font-medium text-primary">Coming</span>
                    : <Check className="w-5 h-5 text-primary" />}
                </div>
                <div className="p-4 flex items-center justify-center">
                  {dir
                    ? <Check className="w-5 h-5 text-muted-foreground" />
                    : <X className="w-4 h-4 text-muted-foreground/40" />}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ROI + Pricing CTA */}
      <section className="py-16 px-6 bg-primary text-primary-foreground">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <h2 className="text-3xl font-bold">Pays for itself in the first week</h2>
          <p className="text-primary-foreground/80 text-lg">
            4 prevented no-shows at R350 each = R1 400 recovered. Practice plan costs R599.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/signup/practice">
              <Button size="lg" variant="secondary" className="text-base px-10">
                Start Free Trial <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
            <Link href="/pricing">
              <Button size="lg" variant="outline" className="text-base bg-transparent border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground hover:border-primary-foreground/60">
                See Pricing
              </Button>
            </Link>
          </div>
          <p className="text-sm text-primary-foreground/60">14 days free · No card needed</p>
        </div>
      </section>

      <footer className="border-t bg-background px-6 py-8">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="font-semibold text-foreground">MediBook SA</div>
          <div className="flex gap-6">
            <Link href="/browse" className="hover:text-foreground">Find a Doctor</Link>
            <Link href="/pricing" className="hover:text-foreground">Pricing</Link>
            <Link href="/signup/practice" className="hover:text-foreground">For Practices</Link>
          </div>
          <div>POPIA Compliant · South Africa</div>
        </div>
      </footer>
    </div>
  );
}

// ── Root export ────────────────────────────────────────────────────
export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const accountType = user.user_metadata?.account_type as string | undefined;
    // Platform admins go to admin home — NOT /dashboard (they have no practice_users row)
    if (accountType === "admin") redirect("/admin");
    // Practice staff → send to their dashboard
    if (accountType === "practice") redirect("/dashboard");
    // Patients see their booking portal
    const name = (user.user_metadata?.full_name as string) ?? user.email ?? "there";
    return <PatientHome userId={user.id} name={name} />;
  }

  return <MarketingPage />;
}
