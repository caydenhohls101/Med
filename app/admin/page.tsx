import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/service";
import { BentoGrid } from "@/components/ui/bento-grid";
import { AdminOverview } from "./admin-overview-client";
import { Building2, BadgeCheck, AlertTriangle, Users, CalendarDays, Clock } from "lucide-react";

export default async function AdminHomePage() {
  const supabase = createServiceClient();

  const [
    { data: practicesRaw },
    { data: patientsRaw },
    { data: bookingsRaw },
  ] = await Promise.all([
    supabase
      .from("practices")
      .select("id, name, slug, city, province, email, phone, created_at, is_verified, subscription_status, subscription_plan, latitude, longitude")
      .order("created_at", { ascending: false }),
    supabase
      .from("patients")
      .select("id, first_name, last_name, email, mobile, created_at, practices:practice_id(name, slug)")
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("appointments")
      .select(`
        id, starts_at, status, reference_number, created_at,
        doctors(full_name, title),
        patients(first_name, last_name),
        services(name),
        practices:practice_id(name, slug)
      `)
      .order("starts_at", { ascending: false })
      .limit(200),
  ]);

  const practices = practicesRaw ?? [];
  const patients  = patientsRaw  ?? [];
  const bookings  = bookingsRaw  ?? [];

  const verifiedCount   = practices.filter((p) => p.is_verified).length;
  const unverifiedCount = practices.filter((p) => !p.is_verified).length;
  const pendingCount    = bookings.filter((b) => b.status === "pending").length;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-10">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Platform Overview</h1>
          <p className="text-muted-foreground mt-1 text-sm">All practices, patients and bookings across MediBook SA</p>
        </div>
        <Link href="/admin/prospects" className="text-sm text-primary border border-primary/30 px-4 py-2 rounded-xl font-medium glass-btn">
          🔍 Find New Practices
        </Link>
      </div>

      {/* Stats — BentoGrid (no persistent hover) */}
      <BentoGrid
        cols={3}
        items={[
          {
            icon: <Building2 className="w-4 h-4 text-blue-500" />,
            title: String(practices.length),
            description: "practices registered on MediBook SA",
            meta: "Total",
            status: "Practices",
            href: "#practices",
          },
          {
            icon: <BadgeCheck className="w-4 h-4 text-green-500" />,
            title: String(verifiedCount),
            description: "practices have completed verification",
            meta: "Verified",
            status: "Trusted",
            href: "#practices",
          },
          {
            icon: <AlertTriangle className="w-4 h-4 text-amber-500" />,
            title: String(unverifiedCount),
            description: "practices awaiting verification review",
            meta: "Unverified",
            status: unverifiedCount > 0 ? "Action needed" : "All clear",
            href: "#practices",
          },
          {
            icon: <Users className="w-4 h-4 text-purple-500" />,
            title: String(patients.length),
            description: "patients registered across all practices",
            meta: "Total",
            status: "Patients",
            href: "#patients",
          },
          {
            icon: <CalendarDays className="w-4 h-4 text-indigo-500" />,
            title: String(bookings.length),
            description: "appointments booked across all practices",
            meta: "Recent 200",
            status: "Bookings",
            href: "#bookings",
          },
          {
            icon: <Clock className="w-4 h-4 text-orange-500" />,
            title: String(pendingCount),
            description: "bookings awaiting confirmation",
            meta: "Pending",
            status: pendingCount > 0 ? "Needs action" : "All clear",
            href: "#bookings",
          },
        ]}
      />

      {/* Filterable tables */}
      <AdminOverview
        practices={practices as any[]}
        patients={patients as any[]}
        bookings={bookings as any[]}
      />
    </div>
  );
}
