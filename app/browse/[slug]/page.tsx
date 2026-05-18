import { notFound } from "next/navigation";
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { LiquidCard, CardContent, CardHeader, CardTitle } from "@/components/ui/liquid-glass-card";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/navbar";
import { DetailMap } from "./practice-map-wrapper";

interface Props { params: Promise<{ slug: string }> }

export default async function PracticeDetailPage({ params }: Props) {
  const { slug } = await params;
  const supabase = createServiceClient();

  const { data: practice } = await supabase
    .from("practices")
    .select("id, name, slug, address_line1, suburb, city, province, postal_code, phone, email, latitude, longitude, settings")
    .eq("slug", slug)
    .maybeSingle();

  if (!practice) notFound();

  const [{ data: doctors }, { data: services }] = await Promise.all([
    supabase
      .from("doctors")
      .select("id, full_name, title, specialty, bio, color")
      .eq("practice_id", practice.id)
      .eq("active", true)
      .order("full_name"),
    supabase
      .from("services")
      .select("id, name, duration_minutes, price_cents, description, requires_referral")
      .eq("practice_id", practice.id)
      .eq("active", true)
      .order("display_order"),
  ]);

  const serverClient = await createClient();
  const { data: { user } } = await serverClient.auth.getUser();

  const bookingUrl = `/book/${slug}`;
  const loginUrl = `/login?next=${encodeURIComponent(bookingUrl)}`;
  const canBook = !!(practice.settings as { booking_open?: boolean })?.booking_open ?? true;

  const mapPractice = practice.latitude && practice.longitude
    ? {
        id: practice.id, name: practice.name, slug: practice.slug,
        suburb: practice.suburb, city: practice.city,
        latitude: practice.latitude as number, longitude: practice.longitude as number,
      }
    : null;

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      <Navbar />

      <div className="max-w-4xl mx-auto w-full px-4 py-8 space-y-6">
        {/* Practice header */}
        <div className="bg-background rounded-xl border p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="text-sm text-muted-foreground mb-1">
                <Link href="/browse" className="hover:text-foreground">← Directory</Link>
              </div>
              <h1 className="text-2xl font-bold">{practice.name}</h1>
              <p className="text-muted-foreground mt-1">
                {practice.address_line1}, {practice.suburb}, {practice.city}, {practice.province}
              </p>
              <div className="flex gap-4 mt-3 text-sm text-muted-foreground flex-wrap">
                {practice.phone && <span>📞 {practice.phone}</span>}
                {practice.email && <span>✉️ {practice.email}</span>}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              {canBook ? (
                <Link href={user ? bookingUrl : loginUrl}>
                  <Button size="lg">
                    {user ? "Book Appointment" : "Sign in to Book"}
                  </Button>
                </Link>
              ) : (
                <Button size="lg" disabled>Booking Closed</Button>
              )}
              {!user && canBook && (
                <Link
                  href={`/signup/patient?next=${encodeURIComponent(bookingUrl)}`}
                  className="text-xs text-primary hover:underline"
                >
                  New patient? Create free account
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Map */}
        {mapPractice && (
          <div className="bg-background rounded-xl border overflow-hidden">
            <DetailMap practice={mapPractice} />
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {/* Doctors */}
          <LiquidCard className="rounded-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <CardHeader>
              <CardTitle>Our Doctors ({doctors?.length ?? 0})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!doctors || doctors.length === 0 ? (
                <p className="text-sm text-muted-foreground">No doctors listed yet.</p>
              ) : (
                doctors.map((doc) => (
                  <div key={doc.id} className="flex items-start gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 mt-0.5"
                      style={{ backgroundColor: doc.color }}
                    >
                      {doc.full_name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-medium">{doc.title} {doc.full_name}</div>
                      {doc.specialty && <div className="text-sm text-muted-foreground">{doc.specialty}</div>}
                      {doc.bio && <p className="text-sm text-muted-foreground mt-1">{doc.bio}</p>}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </LiquidCard>

          {/* Services */}
          <LiquidCard className="rounded-xl animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
            <CardHeader>
              <CardTitle>Services ({services?.length ?? 0})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!services || services.length === 0 ? (
                <p className="text-sm text-muted-foreground">No services listed yet.</p>
              ) : (
                services.map((svc) => (
                  <div key={svc.id} className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-medium text-sm">{svc.name}</div>
                      {svc.description && <div className="text-xs text-muted-foreground">{svc.description}</div>}
                      <div className="flex gap-2 mt-1.5 flex-wrap">
                        <Badge variant="secondary" className="text-xs">{svc.duration_minutes} min</Badge>
                        {svc.requires_referral && <Badge variant="outline" className="text-xs">Referral needed</Badge>}
                      </div>
                    </div>
                    {svc.price_cents > 0 && (
                      <div className="text-sm font-semibold shrink-0">R{(svc.price_cents / 100).toFixed(2)}</div>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </LiquidCard>
        </div>

        {/* Bottom CTA */}
        {canBook && (
          <div className="text-center py-6">
            <Link href={user ? bookingUrl : loginUrl}>
              <Button size="lg" className="px-12">
                {user ? "Book Appointment Now" : "Sign in to Book"}
              </Button>
            </Link>
            {!user && (
              <p className="text-sm text-muted-foreground mt-3">
                New patient?{" "}
                <Link href={`/signup/patient?next=${encodeURIComponent(bookingUrl)}`} className="text-primary hover:underline">
                  Create a free account
                </Link>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
