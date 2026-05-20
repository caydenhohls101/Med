"use client";

import { useState } from "react";
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, isToday,
  addMonths, subMonths, isPast, isFuture,
} from "date-fns";
import Link from "next/link";
import { DateWheelPicker } from "@/components/ui/date-wheel-picker";
import { Search, CalendarDays, Pin, ChevronLeft, ChevronRight, Clock } from "lucide-react";

interface PreviousPractice { slug: string; name: string; suburb: string; city: string }
interface PatientAppt {
  id: string; starts_at: string; status: string; reference_number: string;
  practices: { name: string; slug: string } | null;
  doctors: { full_name: string; title: string } | null;
  services: { name: string } | null;
}

const STATUS_DOT: Record<string, string> = {
  confirmed: "bg-green-500", pending: "bg-amber-400",
  completed: "bg-blue-400",  cancelled: "bg-gray-300", no_show: "bg-red-400",
};
const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  confirmed: { text: "Confirmed", cls: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" },
  pending:   { text: "Pending",   cls: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" },
  completed: { text: "Completed", cls: "bg-blue-100  text-blue-800  dark:bg-blue-900/30  dark:text-blue-300"  },
  cancelled: { text: "Cancelled", cls: "bg-gray-100  text-gray-500  dark:bg-gray-800     dark:text-gray-400"  },
  no_show:   { text: "No Show",   cls: "bg-red-100   text-red-700   dark:bg-red-900/30   dark:text-red-400"   },
};

export function PatientBookingCalendar({ previousPractices, appointments }: {
  previousPractices: PreviousPractice[];
  appointments: PatientAppt[];
}) {
  const today = new Date();
  const [selected, setSelected] = useState<Date>(today);
  const [month, setMonth] = useState(today);

  // Synced handler — both pickers call this
  function pick(d: Date) {
    const clamped = d < today && !isToday(d) ? today : d;
    setSelected(clamped);
    if (!isSameMonth(clamped, month)) setMonth(clamped);
  }

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
    end:   endOfWeek(endOfMonth(month),   { weekStartsOn: 1 }),
  });

  const dayAppts  = (d: Date) => appointments.filter((a) => isSameDay(new Date(a.starts_at), d));
  const selAppts  = appointments.filter((a) => isSameDay(new Date(a.starts_at), selected));

  const upcoming  = appointments.filter((a) => ["pending","confirmed"].includes(a.status) && isFuture(new Date(a.starts_at)));
  const past      = appointments.filter((a) => !["pending","confirmed"].includes(a.status) || isPast(new Date(a.starts_at))).sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime()).slice(0, 5);

  const selDateStr  = format(selected, "yyyy-MM-dd");
  const isSelFuture = !isPast(selected) || isToday(selected);

  return (
    <div className="grid xl:grid-cols-5 gap-5 items-start">

      {/* ══ LEFT: unified calendar card (3/5) ══════════════════════ */}
      <div className="xl:col-span-3">
        <div className="rounded-2xl border bg-background shadow-md overflow-hidden">

          {/* ── Header with selected date ── */}
          <div className="px-6 pt-5 pb-3 border-b bg-gradient-to-b from-primary/5 to-transparent">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">Selected Date</p>
            <p className="text-2xl font-bold text-primary leading-tight">
              {isToday(selected) ? "Today — " : ""}{format(selected, "EEEE, d MMMM yyyy")}
            </p>
          </div>

          {/* ── Wheel picker (embedded, no separate card) ── */}
          <div className="border-b bg-muted/10">
            <DateWheelPicker
              value={selected}
              onChange={pick}
              minYear={today.getFullYear()}
              maxYear={today.getFullYear() + 2}
              size="md"
              locale="en-ZA"
              className="py-2"
            />
            <p className="text-center text-[11px] text-muted-foreground pb-2.5">
              Scroll wheels · or click a date below
            </p>
          </div>

          {/* ── Month navigation ── */}
          <div className="flex items-center justify-between px-5 py-2.5 border-b">
            <button onClick={() => setMonth((m) => subMonths(m, 1))}
              className="glass-btn w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-bold">{format(month, "MMMM yyyy")}</span>
            <button onClick={() => setMonth((m) => addMonths(m, 1))}
              className="glass-btn w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* ── Day headers ── */}
          <div className="grid grid-cols-7 px-4 pt-3">
            {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d) => (
              <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wider pb-1">
                {d}
              </div>
            ))}
          </div>

          {/* ── Day grid ── */}
          <div className="grid grid-cols-7 gap-1 px-4 pb-5">
            {days.map((day) => {
              const appts   = dayAppts(day);
              const inMonth = isSameMonth(day, month);
              const isSel   = isSameDay(day, selected);
              const today_  = isToday(day);
              const isPastDay = isPast(day) && !today_;

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => inMonth && !isPastDay && pick(day)}
                  disabled={!inMonth || isPastDay}
                  title={inMonth ? format(day, "d MMMM yyyy") : undefined}
                  className={[
                    "relative flex flex-col items-center justify-start rounded-xl h-14 pt-2 transition-all duration-150",
                    !inMonth ? "invisible" : "",
                    isPastDay ? "opacity-30 cursor-not-allowed" : "cursor-pointer",
                    isSel
                      ? "bg-primary text-primary-foreground shadow-lg ring-2 ring-primary ring-offset-2 scale-105"
                      : today_
                      ? "ring-2 ring-primary/50 font-bold glass-btn"
                      : "glass-btn hover:scale-105",
                  ].join(" ")}
                >
                  <span className={`text-sm font-semibold leading-none ${isSel ? "text-primary-foreground" : today_ ? "text-primary" : ""}`}>
                    {format(day, "d")}
                  </span>

                  {/* Appointment dots */}
                  {appts.length > 0 && inMonth && (
                    <div className="absolute bottom-1.5 flex gap-0.5">
                      {appts.slice(0, 4).map((a, i) => (
                        <span key={i} className={`w-1.5 h-1.5 rounded-full ${isSel ? "bg-primary-foreground/70" : STATUS_DOT[a.status] ?? "bg-primary"}`} />
                      ))}
                    </div>
                  )}

                  {/* Count badge when 3+ */}
                  {appts.length >= 3 && !isSel && inMonth && (
                    <span className={`absolute top-1 right-1 text-[8px] font-bold px-1 rounded-full text-white ${STATUS_DOT[appts[0]?.status ?? ""] ?? "bg-primary"}`}>
                      {appts.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* ── Selected day summary (if has appointments) ── */}
          {selAppts.length > 0 && (
            <div className="border-t px-5 py-3 bg-muted/10">
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                {format(selected, "d MMM")} — {selAppts.length} appointment{selAppts.length !== 1 ? "s" : ""}
              </p>
              <div className="space-y-1.5">
                {selAppts.map((a) => (
                  <div key={a.id} className="flex items-center gap-2 text-sm">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[a.status] ?? "bg-primary"}`} />
                    <span className="font-medium">{format(new Date(a.starts_at), "HH:mm")}</span>
                    <span className="text-muted-foreground truncate">{a.practices?.name} · {a.services?.name}</span>
                    <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded-full font-semibold shrink-0 ${STATUS_LABEL[a.status]?.cls ?? ""}`}>
                      {STATUS_LABEL[a.status]?.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══ RIGHT: Bookings + actions (2/5) ════════════════════════ */}
      <div className="xl:col-span-2 space-y-4">

        {/* ── BOOK FOR SELECTED DATE (when future date selected) ── */}
        {isSelFuture && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs font-bold text-primary uppercase tracking-widest shrink-0">
                Book for {isToday(selected) ? "Today" : format(selected, "d MMM")}
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>

            {previousPractices.map((p, i) => (
              <Link
                key={p.slug}
                href={`/book/${p.slug}?date=${selDateStr}`}
                className="glass-card flex items-center gap-3 bg-background rounded-2xl border p-4 block"
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0 transition-transform duration-200 group-hover:scale-110"
                  style={{ background: `hsl(${(i * 60 + 221) % 360}, 70%, 55%)` }}
                >
                  {p.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-foreground">{p.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {[p.suburb, p.city].filter(Boolean).join(", ") || "South Africa"}
                  </div>
                  <div className="text-xs text-primary font-medium mt-0.5">
                    Tap to book for {format(selected, "d MMM")} →
                  </div>
                </div>
                <span className="text-[10px] bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800 px-2 py-1 rounded-full font-semibold shrink-0">
                  Returning
                </span>
              </Link>
            ))}

            <Link
              href={`/browse?date=${selDateStr}`}
              className="glass-card flex items-center gap-3 bg-background rounded-2xl border-2 border-dashed border-primary/25 p-4 block"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0"><Search className="w-5 h-5 text-primary" /></div>
              <div className="flex-1">
                <div className="font-semibold text-sm text-foreground">Find a Doctor Near You</div>
                <div className="text-xs text-muted-foreground">Browse all practices on the map</div>
              </div>
              <span className="text-primary text-lg font-bold">→</span>
            </Link>
          </div>
        )}

        {/* ── UPCOMING (active) — TOP, most important ── */}
        {upcoming.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-border" />
              <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 uppercase tracking-widest shrink-0">
                <Pin className="w-3 h-3" /> Upcoming ({upcoming.length})
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>
            {upcoming.map((a) => (
              <AppointmentCard key={a.id} appt={a} />
            ))}
          </div>
        )}

        {/* ── PAST — bottom ── */}
        {past.length > 0 && (
          <details className="group" open={upcoming.length === 0}>
            <summary className="flex items-center gap-2 cursor-pointer list-none">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest shrink-0 select-none">
                Past bookings ({past.length}) {upcoming.length > 0 ? "▼" : "▲"}
              </span>
              <div className="h-px flex-1 bg-border" />
            </summary>
            <div className="mt-2 space-y-2">
              {past.map((a) => (
                <AppointmentCard key={a.id} appt={a} faded />
              ))}
            </div>
          </details>
        )}

        {upcoming.length === 0 && past.length === 0 && !isSelFuture && (
          <div className="text-center py-12 text-muted-foreground">
            <CalendarDays className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No bookings yet — pick a date above to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function AppointmentCard({ appt, faded }: { appt: PatientAppt; faded?: boolean }) {
  const d    = new Date(appt.starts_at);
  const sl   = STATUS_LABEL[appt.status];
  const prac = appt.practices as { name: string; slug: string } | null;

  return (
    <div className={`glass-card bg-background rounded-2xl border p-4 flex items-start gap-3 ${faded ? "opacity-60" : ""}`}>
      {/* Date block */}
      <div className="bg-primary/8 rounded-xl px-3 py-2 text-center shrink-0 min-w-[52px]">
        <div className="text-[10px] font-bold text-primary uppercase">{format(d, "MMM")}</div>
        <div className="text-xl font-bold text-primary leading-tight">{format(d, "d")}</div>
        <div className="text-[10px] text-muted-foreground font-mono">{format(d, "HH:mm")}</div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm text-foreground truncate">{prac?.name ?? "—"}</div>
        <div className="text-xs text-muted-foreground">
          {appt.doctors ? `${appt.doctors.title} ${appt.doctors.full_name}` : ""}
          {appt.services ? ` · ${appt.services.name}` : ""}
        </div>
        <div className="text-[10px] font-mono text-muted-foreground/70 mt-0.5">{appt.reference_number}</div>
        {appt.status === "pending" && isFuture(d) && (
          <div className="inline-flex items-center gap-1 text-[10px] text-amber-600 font-medium mt-0.5"><Clock className="w-3 h-3" /> Awaiting confirmation</div>
        )}
      </div>

      <div className="flex flex-col items-end gap-2 shrink-0">
        <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${sl?.cls ?? "bg-muted text-muted-foreground"}`}>
          {sl?.text ?? appt.status}
        </span>
        {prac?.slug && ["completed","cancelled"].includes(appt.status) && (
          <Link
            href={`/book/${prac.slug}`}
            className="text-[10px] text-primary hover:underline glass-btn px-2 py-1 rounded-lg"
          >
            Book again
          </Link>
        )}
      </div>
    </div>
  );
}
