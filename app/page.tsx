import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/navbar";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center space-y-6">
        <div className="inline-flex items-center gap-2 text-sm bg-primary/10 text-primary px-3 py-1 rounded-full font-medium">
          South Africa&apos;s Medical Booking Platform
        </div>
        <h1 className="text-5xl font-bold tracking-tight leading-tight max-w-2xl">
          Find a Doctor.<br />Book Online. Anytime.
        </h1>
        <p className="text-xl text-muted-foreground max-w-xl">
          Browse practices near you, see real availability, and book appointments without calling.
        </p>

        {/* Two CTA paths */}
        <div className="grid sm:grid-cols-2 gap-4 max-w-2xl w-full pt-4">
          <Link href="/browse" className="block">
            <div className="border-2 border-primary rounded-xl p-6 hover:bg-primary/5 transition-colors text-left space-y-2 h-full">
              <div className="text-3xl">🔍</div>
              <div className="font-bold text-lg">I&apos;m a Patient</div>
              <div className="text-sm text-muted-foreground">Browse practices on the map, compare doctors, and book an appointment online.</div>
              <div className="text-primary font-semibold text-sm pt-1">Find a Doctor →</div>
            </div>
          </Link>
          <Link href="/signup/practice" className="block">
            <div className="border-2 rounded-xl p-6 hover:bg-muted transition-colors text-left space-y-2 h-full">
              <div className="text-3xl">🏥</div>
              <div className="font-bold text-lg">I Run a Practice</div>
              <div className="text-sm text-muted-foreground">Get listed, manage doctors and services, and reduce no-shows with automated reminders.</div>
              <div className="text-primary font-semibold text-sm pt-1">List Your Practice →</div>
            </div>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="border-t bg-muted/30 px-6 py-16">
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
          <Feature icon="🗺️" title="Browse the Map" desc="Find practices in your area on an interactive map" />
          <Feature icon="📅" title="Book Online" desc="See live availability and book in under 2 minutes" />
          <Feature icon="🔔" title="Get Reminders" desc="WhatsApp & email reminders so you never miss an appointment" />
        </div>
      </section>

      <footer className="border-t px-6 py-6 text-center text-sm text-muted-foreground">
        MediBook SA · POPIA Compliant · Data stored in EU (Supabase)
      </footer>
    </div>
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
