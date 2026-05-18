import Link from "next/link";
import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/navbar";
import { BookingSteps } from "./booking-steps";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ date?: string }>;
}

export default async function BookPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { date: dateParam } = await searchParams;
  const supabase = createServiceClient();

  const { data: practice } = await supabase
    .from("practices")
    .select("id, name, slug, city, suburb, phone, settings")
    .eq("slug", slug)
    .maybeSingle();

  if (!practice) notFound();

  const settings = practice.settings as { booking_open?: boolean } | null;
  if (settings?.booking_open === false) {
    return (
      <div className="min-h-screen bg-muted/30 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center space-y-4">
            <div className="text-4xl">🔒</div>
            <h1 className="text-2xl font-bold">{practice.name}</h1>
            <p className="text-muted-foreground">Online booking is currently closed.</p>
            {practice.phone && (
              <p className="text-sm">Call us on <strong>{practice.phone}</strong></p>
            )}
            <div className="flex gap-3 justify-center pt-2">
              <Link href={`/browse/${slug}`} className="inline-flex items-center px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors">
                View Practice
              </Link>
              <Link href="/browse" className="inline-flex items-center px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
                Browse Practices
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const [{ data: doctors }, { data: services }, { data: { user } }] = await Promise.all([
    supabase
      .from("doctors")
      .select("id, full_name, title, specialty, bio, default_appointment_duration_minutes, color")
      .eq("practice_id", practice.id)
      .eq("active", true)
      .order("full_name"),
    supabase
      .from("services")
      .select("id, name, duration_minutes, price_cents, description, requires_referral")
      .eq("practice_id", practice.id)
      .eq("active", true)
      .order("display_order"),
    createClient().then((c) => c.auth.getUser()),
  ]);

  const prefill = user
    ? {
        firstName: (user.user_metadata?.first_name as string) ?? "",
        lastName: (user.user_metadata?.last_name as string) ?? "",
        email: user.email ?? "",
        mobile: (user.user_metadata?.mobile as string) ?? "",
      }
    : null;

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      <Navbar />

      {/* Practice context bar */}
      <div className="bg-background border-b sticky top-14 z-30">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link href={`/browse/${slug}`} className="text-muted-foreground hover:text-foreground text-sm shrink-0">←</Link>
            <div className="min-w-0">
              <p className="font-semibold leading-tight truncate text-sm">{practice.name}</p>
              <p className="text-xs text-muted-foreground">{practice.suburb}, {practice.city}</p>
            </div>
          </div>
          <Link href="/browse" className="text-sm text-muted-foreground hover:text-foreground shrink-0">
            All Practices
          </Link>
        </div>
      </div>

      <div className="max-w-3xl mx-auto w-full px-4 py-8">
        <BookingSteps
          practice={{ id: practice.id, name: practice.name, slug: practice.slug }}
          doctors={doctors ?? []}
          services={services ?? []}
          prefill={prefill}
          defaultDate={dateParam}
        />
      </div>
    </div>
  );
}
