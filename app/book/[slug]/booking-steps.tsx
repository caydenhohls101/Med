"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getAvailableSlots, createBooking } from "@/app/actions/bookings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DateWheelPicker } from "@/components/ui/date-wheel-picker";
import { format } from "date-fns";

interface Doctor {
  id: string; full_name: string; title: string;
  specialty: string | null; bio: string | null;
  default_appointment_duration_minutes: number; color: string;
}
interface Service {
  id: string; name: string; duration_minutes: number;
  price_cents: number; description: string | null; requires_referral: boolean;
}
interface Prefill { firstName: string; lastName: string; email: string; mobile: string }

interface Props {
  practice: { id: string; name: string; slug: string };
  doctors: Doctor[];
  services: Service[];
  prefill?: Prefill | null;
  defaultDate?: string;        // YYYY-MM-DD from ?date= param
  isLoggedIn?: boolean;        // passed from server — blocks booking if false
}

type Step = "doctor" | "service" | "datetime" | "details" | "success";
const STEPS: Step[] = ["doctor", "service", "datetime", "details", "success"];

function dateStrToDate(str: string): Date {
  return str ? new Date(str + "T12:00:00") : new Date();
}
function dateToStr(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

const todayStr = format(new Date(), "yyyy-MM-dd");
const todayDate = new Date();

export function BookingSteps({ practice, doctors, services, prefill, defaultDate, isLoggedIn = false }: Props) {
  const router = useRouter();

  const [step, setStep]             = useState<Step>("doctor");
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate]     = useState(defaultDate ?? "");
  const [wheelDate, setWheelDate]           = useState<Date>(defaultDate ? dateStrToDate(defaultDate) : todayDate);
  const [slots, setSlots]           = useState<{ time: string; startsAt: string; endsAt: string }[]>([]);
  const [selectedSlot, setSelectedSlot]     = useState<{ time: string; startsAt: string; endsAt: string } | null>(null);
  const [loadingSlots, setLoadingSlots]     = useState(false);
  const [referenceNumber, setReferenceNumber] = useState("");
  const [error, setError]           = useState("");
  const [isPending, startTransition] = useTransition();

  const stepIndex = STEPS.indexOf(step);

  async function loadSlots(date: string, doctorId: string, durationMinutes: number) {
    setLoadingSlots(true);
    setSelectedSlot(null);
    setSlots([]);
    const result = await getAvailableSlots(doctorId, date, durationMinutes);
    setSlots(result.slots);
    setLoadingSlots(false);
  }

  function handleDateChange(date: string) {
    setSelectedDate(date);
    setWheelDate(dateStrToDate(date));
    if (date && selectedDoctor && selectedService) {
      loadSlots(date, selectedDoctor.id, selectedService.duration_minutes);
    }
  }

  function handleWheelChange(d: Date) {
    const str = dateToStr(d);
    if (str < todayStr) return; // no past dates
    setWheelDate(d);
    setSelectedDate(str);
    if (selectedDoctor && selectedService) {
      loadSlots(str, selectedDoctor.id, selectedService.duration_minutes);
    }
  }

  function handleContinueToDetails() {
    if (!isLoggedIn) {
      const next = encodeURIComponent(`/book/${practice.slug}${defaultDate ? `?date=${defaultDate}` : ""}`);
      router.push(`/login?next=${next}`);
      return;
    }
    setStep("details");
  }

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const form = e.currentTarget;
    const firstName = (form.elements.namedItem("firstName") as HTMLInputElement).value;
    const lastName  = (form.elements.namedItem("lastName") as HTMLInputElement).value;
    const email     = (form.elements.namedItem("email") as HTMLInputElement).value;
    const mobile    = (form.elements.namedItem("mobile") as HTMLInputElement).value;
    const notes     = (form.elements.namedItem("notes") as HTMLTextAreaElement).value;

    if (!selectedDoctor || !selectedService || !selectedSlot) return;

    startTransition(async () => {
      const result = await createBooking({
        practiceId: practice.id,
        doctorId: selectedDoctor.id,
        serviceId: selectedService.id,
        startsAt: selectedSlot.startsAt,
        endsAt: selectedSlot.endsAt,
        firstName, lastName, email, mobile,
        ...(notes ? { notes } : {}),
      });
      if (result.error) { setError(result.error); } else {
        setReferenceNumber(result.referenceNumber!);
        setStep("success");
      }
    });
  }

  /* ── Success ── */
  if (step === "success") {
    return (
      <Card>
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          <div className="text-5xl">✅</div>
          <div>
            <h2 className="text-xl font-bold">Booking Confirmed!</h2>
            <p className="text-muted-foreground mt-1">Your reference number is</p>
            <p className="text-2xl font-mono font-bold text-primary mt-2">{referenceNumber}</p>
          </div>
          <div className="text-sm text-muted-foreground bg-muted rounded-lg p-4 text-left space-y-1">
            <p><strong>Doctor:</strong> {selectedDoctor?.title} {selectedDoctor?.full_name}</p>
            <p><strong>Service:</strong> {selectedService?.name}</p>
            <p><strong>Date:</strong> {selectedDate}</p>
            <p><strong>Time:</strong> {selectedSlot?.time}</p>
          </div>
          <p className="text-xs text-muted-foreground">Keep your reference number safe. The practice will confirm shortly.</p>
          <div className="flex flex-col gap-2 pt-2">
            <Link href="/" className="inline-flex items-center justify-center w-full px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">Back to Home</Link>
            <Link href="/browse" className="inline-flex items-center justify-center w-full px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Browse More Practices</Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="flex items-center gap-2">
        {["Doctor","Service","Date & Time","Your Details"].map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
              i < stepIndex ? "bg-primary text-primary-foreground" :
              i === stepIndex ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2" :
              "bg-muted text-muted-foreground"
            }`}>{i < stepIndex ? "✓" : i + 1}</div>
            <span className={`text-sm hidden sm:block ${i === stepIndex ? "font-medium" : "text-muted-foreground"}`}>{label}</span>
            {i < 3 && <div className="w-8 h-px bg-border" />}
          </div>
        ))}
      </div>

      {/* ── Select Doctor ── */}
      {step === "doctor" && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Choose a Doctor</h2>
          {doctors.length === 0 && <p className="text-muted-foreground text-sm">No doctors available at this time.</p>}
          <div className="grid gap-3">
            {doctors.map((doctor) => (
              <button key={doctor.id}
                onClick={() => { setSelectedDoctor(doctor); setStep("service"); }}
                className="glass-card text-left p-4 rounded-2xl border bg-background w-full"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: doctor.color }}>
                    {doctor.full_name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-medium">{doctor.title} {doctor.full_name}</div>
                    {doctor.specialty && <div className="text-sm text-muted-foreground">{doctor.specialty}</div>}
                  </div>
                </div>
                {doctor.bio && <p className="text-sm text-muted-foreground mt-2">{doctor.bio}</p>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Select Service ── */}
      {step === "service" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setStep("doctor")}>← Back</Button>
            <h2 className="text-lg font-semibold">Choose a Service</h2>
          </div>
          {services.length === 0 && <p className="text-muted-foreground text-sm">No services available at this time.</p>}
          <div className="grid gap-3">
            {services.map((service) => (
              <button key={service.id}
                onClick={() => {
                  setSelectedService(service);
                  setStep("datetime");
                  if (selectedDate && selectedDoctor) loadSlots(selectedDate, selectedDoctor.id, service.duration_minutes);
                }}
                className="glass-card text-left p-4 rounded-2xl border bg-background w-full"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium">{service.name}</div>
                    {service.description && <div className="text-sm text-muted-foreground mt-0.5">{service.description}</div>}
                    <div className="flex gap-2 mt-2">
                      <Badge variant="secondary">{service.duration_minutes} min</Badge>
                      {service.requires_referral && <Badge variant="outline">Referral required</Badge>}
                    </div>
                  </div>
                  {service.price_cents > 0 && (
                    <div className="text-sm font-semibold shrink-0 ml-4">R{(service.price_cents / 100).toFixed(2)}</div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Select Date & Time ── */}
      {step === "datetime" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setStep("service")}>← Back</Button>
            <h2 className="text-lg font-semibold">Choose a Date & Time</h2>
          </div>

          {defaultDate && selectedDate === defaultDate && (
            <div className="flex items-center gap-2 text-sm bg-primary/5 border border-primary/20 rounded-xl px-4 py-2.5 text-primary">
              <span>📅</span>
              <span>Date pre-selected from your calendar — <strong>{new Date(defaultDate + "T12:00:00").toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long" })}</strong>.</span>
            </div>
          )}

          <Card>
            <CardContent className="pt-6 space-y-6">
              {/* DateWheelPicker — matches patient dashboard */}
              <div>
                <p className="text-sm font-medium mb-1">
                  {selectedDate
                    ? format(dateStrToDate(selectedDate), "EEEE, d MMMM yyyy")
                    : "Select a date"}
                </p>
                <div className="border rounded-xl overflow-hidden">
                  <DateWheelPicker
                    value={wheelDate}
                    onChange={handleWheelChange}
                    minYear={todayDate.getFullYear()}
                    maxYear={todayDate.getFullYear() + 2}
                    size="md"
                    locale="en-ZA"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1.5 text-center">Scroll or drag to change date</p>
              </div>

              {/* Time slots */}
              {selectedDate && (
                <div>
                  <p className="text-sm font-medium mb-3">
                    {loadingSlots ? "Loading available times…" : `Available times (${slots.length} slots)`}
                  </p>
                  {!loadingSlots && slots.length === 0 && (
                    <p className="text-sm text-muted-foreground">No slots available on this date. Try another day.</p>
                  )}
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {slots.map((slot) => (
                      <button key={slot.startsAt} onClick={() => setSelectedSlot(slot)}
                        className={`py-2 px-3 text-sm rounded-xl border font-mono transition-all ${
                          selectedSlot?.startsAt === slot.startsAt
                            ? "bg-primary text-primary-foreground border-primary shadow-lg scale-105"
                            : "glass-btn bg-background"
                        }`}>
                        {slot.time}
                      </button>
                    ))}
                  </div>

                  {selectedSlot && (
                    <Button className="mt-6" onClick={handleContinueToDetails}>
                      Continue with {selectedSlot.time} →
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Patient Details ── */}
      {step === "details" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setStep("datetime")}>← Back</Button>
            <h2 className="text-lg font-semibold">Your Details</h2>
          </div>

          {/* Booking summary */}
          <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 text-sm space-y-1">
            <p><strong>{selectedDoctor?.title} {selectedDoctor?.full_name}</strong> — {selectedService?.name}</p>
            <p className="text-muted-foreground">{selectedDate} at {selectedSlot?.time}</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contact Information</CardTitle>
              <CardDescription>We&apos;ll use these details to confirm your appointment</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">{error}</div>
                )}
                {prefill && (
                  <div className="rounded-xl bg-primary/5 border border-primary/20 px-3 py-2 text-xs text-primary flex items-center gap-2">
                    <span>✓</span> Details pre-filled from your account — update if needed.
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" name="firstName" required placeholder="Jane" defaultValue={prefill?.firstName} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" name="lastName" required placeholder="Smith" defaultValue={prefill?.lastName} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" required placeholder="jane@email.com" defaultValue={prefill?.email} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="mobile">Mobile Number</Label>
                  <Input id="mobile" name="mobile" type="tel" required placeholder="0821234567" defaultValue={prefill?.mobile} />
                  <p className="text-xs text-muted-foreground">South African number (0xx or +27xx)</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="notes">Notes for the Doctor (optional)</Label>
                  <textarea id="notes" name="notes" rows={3}
                    placeholder="Reason for visit, symptoms, etc."
                    className="flex w-full rounded-xl border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                </div>
                <p className="text-xs text-muted-foreground">By booking you consent to your information being used to manage your appointment (POPIA).</p>
                <Button type="submit" className="w-full" disabled={isPending}>
                  {isPending ? "Booking…" : "Confirm Booking"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
