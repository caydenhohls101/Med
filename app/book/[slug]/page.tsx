import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { BookingSteps } from "./booking-steps";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function BookPage({ params }: Props) {
  const { slug } = await params;
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
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold">{practice.name}</h1>
          <p className="text-muted-foreground mt-2">Online booking is currently closed.</p>
          <p className="text-sm mt-1">Please call us on {practice.phone}</p>
        </div>
      </div>
    );
  }

  const { data: doctors } = await supabase
    .from("doctors")
    .select("id, full_name, title, specialty, bio, default_appointment_duration_minutes, color")
    .eq("practice_id", practice.id)
    .eq("active", true)
    .order("full_name");

  const { data: services } = await supabase
    .from("services")
    .select("id, name, duration_minutes, price_cents, description, requires_referral")
    .eq("practice_id", practice.id)
    .eq("active", true)
    .order("display_order");

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="bg-background border-b">
        <div className="max-w-3xl mx-auto px-4 py-5">
          <h1 className="text-xl font-bold">{practice.name}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {practice.suburb}, {practice.city}
          </p>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <BookingSteps
          practice={{ id: practice.id, name: practice.name, slug: practice.slug }}
          doctors={doctors ?? []}
          services={services ?? []}
        />
      </div>
    </div>
  );
}
