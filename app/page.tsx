import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      <nav className="border-b px-6 py-4 flex items-center justify-between">
        <div className="font-bold text-primary text-lg">MediBook SA</div>
        <Link href="/login">
          <Button variant="outline" size="sm">Staff Login</Button>
        </Link>
      </nav>

      <section className="max-w-3xl mx-auto px-6 py-24 text-center space-y-6">
        <div className="inline-flex items-center gap-2 text-sm bg-primary/10 text-primary px-3 py-1 rounded-full font-medium">
          Online Medical Bookings for South Africa
        </div>
        <h1 className="text-5xl font-bold tracking-tight leading-tight">
          Book a Doctor,<br />Anytime, Online
        </h1>
        <p className="text-xl text-muted-foreground max-w-xl mx-auto">
          Reduce no-shows. Let patients book 24/7 with automated WhatsApp &amp; email reminders.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link href="/signup">
            <Button size="lg" className="w-full sm:w-auto">
              Set Up Your Practice →
            </Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline" className="w-full sm:w-auto">
              Staff Login
            </Button>
          </Link>
        </div>
        <p className="text-sm text-muted-foreground">
          14-day free trial · No credit card required
        </p>
      </section>

      <section className="border-t bg-muted/30 px-6 py-16">
        <div className="max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
          <Feature icon="📅" title="Online Booking" desc="Patients book directly from your practice link, 24/7" />
          <Feature icon="🔔" title="Reminders" desc="Automated WhatsApp & email reminders cut no-shows" />
          <Feature icon="👩‍⚕️" title="Multi-doctor" desc="Manage multiple doctors, services, and schedules" />
        </div>
      </section>

      <footer className="border-t px-6 py-6 text-center text-sm text-muted-foreground">
        MediBook SA · POPIA Compliant · Data stored in South Africa
      </footer>
    </main>
  );
}

function Feature({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="space-y-2">
      <div className="text-3xl">{icon}</div>
      <div className="font-semibold">{title}</div>
      <div className="text-sm text-muted-foreground">{desc}</div>
    </div>
  );
}
