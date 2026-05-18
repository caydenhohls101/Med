import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const PLANS = [
  {
    name: "Starter",
    price: "R299",
    period: "/month",
    description: "Perfect for a solo practitioner just getting started.",
    color: "border-border",
    cta: "Start Free Trial",
    ctaVariant: "outline" as const,
    features: [
      "1 doctor profile",
      "Unlimited online bookings",
      "Email confirmations",
      "Basic analytics",
      "Directory listing",
      "Verified badge",
      "14-day free trial",
    ],
    missing: [
      "WhatsApp notifications",
      "Multiple doctors",
      "Medical aid integration",
    ],
  },
  {
    name: "Practice",
    price: "R599",
    period: "/month",
    description: "For growing practices with multiple doctors.",
    popular: true,
    color: "border-primary ring-2 ring-primary",
    cta: "Start Free Trial",
    ctaVariant: "default" as const,
    features: [
      "Up to 5 doctors",
      "Unlimited online bookings",
      "WhatsApp + email notifications",
      "No-show reminders",
      "Full analytics dashboard",
      "Priority directory listing",
      "Verified practice badge",
      "Custom booking page",
      "Receptionist + doctor roles",
      "14-day free trial",
    ],
    missing: ["API access", "White-label option"],
  },
  {
    name: "Group",
    price: "R1 499",
    period: "/month",
    description: "Multi-location groups and enterprise practices.",
    color: "border-border",
    cta: "Contact Us",
    ctaVariant: "outline" as const,
    features: [
      "Unlimited doctors",
      "Multiple locations",
      "WhatsApp + email + SMS",
      "Advanced analytics & reports",
      "Medical aid verification",
      "API access",
      "Dedicated account manager",
      "White-label option",
      "SLA guarantee",
      "Custom integrations",
    ],
    missing: [],
  },
];

const FAQ = [
  {
    q: "Is there a free trial?",
    a: "Yes — all paid plans include a 14-day free trial. No credit card required to start.",
  },
  {
    q: "How does billing work?",
    a: "We bill monthly via Paystack. You can cancel at any time before the next billing cycle.",
  },
  {
    q: "What happens to my data if I cancel?",
    a: "Your data is retained for 30 days after cancellation. You can export everything before leaving. We comply with POPIA.",
  },
  {
    q: "Do you charge per booking?",
    a: "No. All plans include unlimited bookings at no extra cost. We don't take a cut of your consultations.",
  },
  {
    q: "Does WhatsApp require anything extra?",
    a: "WhatsApp Business notifications are included from the Practice plan. We handle the WhatsApp Business API — no setup needed.",
  },
  {
    q: "Can patients pay online through MediBook?",
    a: "Online patient payments are coming soon. Practices on the Practice and Group plans will get early access.",
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      {/* Header */}
      <section className="py-16 px-6 text-center bg-gradient-to-b from-primary/5 to-background">
        <div className="max-w-2xl mx-auto space-y-4">
          <h1 className="text-4xl font-bold">Simple, honest pricing</h1>
          <p className="text-muted-foreground text-lg">
            No per-booking fees. No hidden charges. Just one flat monthly rate that pays for itself the first time a patient books online instead of calling.
          </p>
        </div>
      </section>

      {/* Plans */}
      <section className="px-6 pb-20">
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-6 items-start">
          {PLANS.map((plan) => (
            <div key={plan.name} className={`rounded-2xl border bg-background p-8 flex flex-col gap-6 relative ${plan.color}`}>
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground px-4 py-1 text-xs font-semibold">
                    Most Popular
                  </Badge>
                </div>
              )}

              <div>
                <h3 className="font-bold text-xl">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
              </div>

              <div className="flex items-end gap-1">
                <span className="text-4xl font-bold">{plan.price}</span>
                <span className="text-muted-foreground mb-1">{plan.period}</span>
              </div>

              <Link href={plan.ctaVariant === "default" ? "/signup/practice" : plan.name === "Group" ? "mailto:hello@medibook.co.za" : "/signup/practice"} className="w-full">
                <Button variant={plan.ctaVariant} className="w-full" size="lg">
                  {plan.cta}
                </Button>
              </Link>

              <ul className="space-y-2.5 text-sm">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <span className="text-green-600 font-bold mt-0.5 shrink-0">✓</span>
                    <span>{f}</span>
                  </li>
                ))}
                {plan.missing.map((f) => (
                  <li key={f} className="flex items-start gap-2 opacity-40">
                    <span className="font-bold mt-0.5 shrink-0">—</span>
                    <span className="line-through">{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-8">
          All prices exclude VAT · Billed monthly via Paystack · Cancel any time
        </p>
      </section>

      {/* Revenue for practices callout */}
      <section className="py-16 px-6 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">The maths work out</h2>
              <p className="text-muted-foreground">
                If MediBook prevents just <strong>4 no-shows per month</strong> at R350 per consultation, that&apos;s R1 400 recovered. The Practice plan costs R599.
              </p>
              <p className="text-muted-foreground">
                Most practices see a 30–40% reduction in no-shows from WhatsApp reminders alone. The system pays for itself.
              </p>
            </div>
            <div className="bg-background rounded-2xl border p-6 space-y-4">
              <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Monthly ROI Example</div>
              {[
                { label: "No-shows prevented", value: "4×", color: "text-green-600" },
                { label: "Avg consultation fee", value: "R350", color: "text-foreground" },
                { label: "Revenue recovered", value: "R1 400", color: "text-green-600 font-bold text-lg" },
                { label: "MediBook cost (Practice)", value: "−R599", color: "text-red-500" },
                { label: "Net gain", value: "R801", color: "text-green-600 font-bold text-xl" },
              ].map((row) => (
                <div key={row.label} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{row.label}</span>
                  <span className={row.color}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-6">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Frequently asked questions</h2>
          <div className="space-y-6">
            {FAQ.map((faq) => (
              <div key={faq.q} className="space-y-2">
                <h3 className="font-semibold">{faq.q}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 px-6 bg-primary text-primary-foreground">
        <div className="max-w-xl mx-auto text-center space-y-6">
          <h2 className="text-2xl font-bold">Start your 14-day free trial today</h2>
          <p className="text-primary-foreground/80">No credit card needed. Full Practice plan features. Cancel any time.</p>
          <Link href="/signup/practice">
            <Button size="lg" variant="secondary" className="px-10 text-base">
              Get Started Free →
            </Button>
          </Link>
        </div>
      </section>

      <footer className="border-t px-6 py-6 text-center text-sm text-muted-foreground">
        MediBook SA · Questions? Email <a href="mailto:hello@medibook.co.za" className="underline">hello@medibook.co.za</a>
      </footer>
    </div>
  );
}
