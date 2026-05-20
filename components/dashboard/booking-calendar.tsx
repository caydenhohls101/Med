"use client";

import { useState } from "react";
import Link from "next/link";
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, isToday,
  addMonths, subMonths, isPast, isFuture,
} from "date-fns";
import { Badge } from "@/components/ui/badge";

interface CalAppt {
  id: string;
  starts_at: string;
  status: string;
  reference_number: string;
  doctors: { full_name: string; title: string } | null;
  patients: { first_name: string; last_name: string } | null;
  services: { name: string } | null;
}

const STATUS_COLOR: Record<string, { bg: string; ring: string; label: string; badge: "warning"|"success"|"destructive"|"secondary"|"outline" }> = {
  confirmed: { bg: "bg-green-500",  ring: "ring-green-400", label: "Confirmed", badge: "success" },
  pending:   { bg: "bg-amber-400",  ring: "ring-amber-300", label: "Pending",   badge: "warning" },
  completed: { bg: "bg-blue-500",   ring: "ring-blue-400",  label: "Completed", badge: "secondary" },
  cancelled: { bg: "bg-gray-300",   ring: "ring-gray-200",  label: "Cancelled", badge: "destructive" },
  no_show:   { bg: "bg-red-500",    ring: "ring-red-400",   label: "No Show",   badge: "outline" },
};

// Dominant status colour for a day
function dayColour(appts: CalAppt[]) {
  if (!appts.length) return null;
  const order = ["no_show", "cancelled", "pending", "confirmed", "completed"];
  const dominant = order.find((s) => appts.some((a) => a.status === s)) ?? appts[0].status;
  return STATUS_COLOR[dominant] ?? STATUS_COLOR.pending;
}

export function BookingCalendar({ appointments, fullWidth = false }: { appointments: CalAppt[]; fullWidth?: boolean }) {
  const [month, setMonth] = useState(new Date());
  const [selected, setSelected] = useState<Date>(new Date());

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
    end:   endOfWeek(endOfMonth(month),   { weekStartsOn: 1 }),
  });

  const dayAppts = (d: Date) => appointments.filter((a) => isSameDay(new Date(a.starts_at), d));
  const selAppts = appointments
    .filter((a) => isSameDay(new Date(a.starts_at), selected))
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());

  return (
    <div className={fullWidth ? "grid md:grid-cols-2 gap-4 items-start" : "space-y-3"}>
      {/* ── Month calendar ── */}
      <div className="bg-background rounded-2xl border shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b">
          <button onClick={() => setMonth((m) => subMonths(m, 1))}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            ←
          </button>
          <span className="text-sm font-bold tracking-wide">{format(month, "MMMM yyyy")}</span>
          <button onClick={() => setMonth((m) => addMonths(m, 1))}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            →
          </button>
        </div>

        {/* Day-of-week */}
        <div className="grid grid-cols-7 px-3 pt-3">
          {["M","T","W","T","F","S","S"].map((d, i) => (
            <div key={i} className="text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wider py-1">{d}</div>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7 gap-1 px-3 pb-4">
          {days.map((day) => {
            const appts   = dayAppts(day);
            const inMonth = isSameMonth(day, month);
            const isSel   = isSameDay(day, selected);
            const isToday_ = isToday(day);
            const col     = dayColour(appts);
            const isLate  = appts.some((a) => a.status === "pending" && isPast(new Date(a.starts_at)));

            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelected(day)}
                className={`
                  relative flex flex-col items-center justify-start rounded-xl h-14 pt-1.5 transition-all
                  ${!inMonth ? "opacity-20 pointer-events-none" : "cursor-pointer"}
                  ${isSel ? "ring-2 ring-primary bg-primary/10 shadow-sm" : isToday_ ? "ring-2 ring-primary/40" : "hover:bg-muted/60"}
                  ${isLate && !isSel ? "bg-red-50" : ""}
                `}
              >
                {/* Day number */}
                <span className={`text-sm leading-none font-semibold ${isSel ? "text-primary" : isToday_ ? "text-primary" : isLate ? "text-red-600" : ""}`}>
                  {format(day, "d")}
                </span>

                {/* Appointment indicators */}
                {appts.length > 0 && inMonth && (
                  <div className="mt-1 flex flex-col items-center gap-0.5 w-full px-1">
                    {/* Count badge */}
                    <div className={`text-[9px] font-bold px-1 rounded-full text-white ${col?.bg ?? "bg-primary"}`}>
                      {appts.length}
                    </div>
                    {/* Status dots */}
                    <div className="flex gap-0.5 flex-wrap justify-center">
                      {appts.slice(0, 5).map((a, i) => {
                        const c = STATUS_COLOR[a.status];
                        return <span key={i} className={`w-1.5 h-1.5 rounded-full ${c?.bg ?? "bg-primary"} ${isSel ? "opacity-70" : ""}`} />;
                      })}
                    </div>
                  </div>
                )}
                {/* Late indicator */}
                {isLate && <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-red-500 ring-1 ring-white" />}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex gap-3 px-5 py-2.5 border-t bg-muted/20 flex-wrap">
          {Object.entries(STATUS_COLOR).filter(([k]) => k !== "cancelled").map(([status, c]) => (
            <div key={status} className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium">
              <span className={`w-2.5 h-2.5 rounded-full ${c.bg}`} />{c.label}
            </div>
          ))}
          <div className="flex items-center gap-1.5 text-[10px] text-red-600 font-medium ml-auto">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />Late/Overdue
          </div>
        </div>
      </div>

      {/* ── Selected day detail ── */}
      <div className="bg-background rounded-2xl border shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b bg-muted/10">
          <div>
            <span className="text-sm font-bold">
              {isToday(selected) ? "Today" : format(selected, "EEEE, d MMM")}
            </span>
            {isFuture(selected) && !isToday(selected) && (
              <span className="ml-2 text-xs text-primary font-medium">upcoming</span>
            )}
            {isPast(selected) && !isToday(selected) && (
              <span className="ml-2 text-xs text-muted-foreground">past</span>
            )}
          </div>
          <span className="text-xs font-semibold text-muted-foreground">
            {selAppts.length} appointment{selAppts.length !== 1 ? "s" : ""}
          </span>
        </div>

        {selAppts.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <div className="text-2xl mb-1.5">📅</div>
            <p className="text-xs text-muted-foreground">No appointments{isFuture(selected) ? " — schedule is clear" : ""}</p>
          </div>
        ) : (
          <div className="divide-y max-h-96 overflow-y-auto">
            {selAppts.map((appt) => {
              const doc = appt.doctors;
              const pat = appt.patients;
              const svc = appt.services;
              const col = STATUS_COLOR[appt.status];
              const late = appt.status === "pending" && isPast(new Date(appt.starts_at));
              return (
                // Click → All Bookings page; hover → rich card with all details
                <Link
                  key={appt.id}
                  href="/dashboard/bookings"
                  className={`group px-5 py-3 flex items-start gap-3 hover:bg-primary/5 transition-colors cursor-pointer relative ${
                    late ? "bg-red-50/50 dark:bg-red-950/20" : ""
                  }`}
                  title={`${pat?.first_name} ${pat?.last_name} — ${svc?.name} — ${appt.reference_number}`}
                >
                  {/* Status bar */}
                  <div className={`w-1 self-stretch rounded-full shrink-0 ${col?.bg ?? "bg-muted"}`} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold font-mono text-primary">
                        {format(new Date(appt.starts_at), "HH:mm")}
                      </span>
                      {late && (
                        <span className="text-[10px] bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 font-semibold px-1.5 py-0.5 rounded-full">
                          LATE
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-medium">{pat?.first_name} {pat?.last_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {svc?.name}{doc ? ` · ${doc.title} ${doc.full_name}` : ""}
                    </div>
                    <div className="text-[10px] text-muted-foreground/60 font-mono mt-0.5">{appt.reference_number}</div>
                  </div>

                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <Badge variant={col?.badge ?? "outline"} className="text-[10px]">
                      {col?.label ?? appt.status}
                    </Badge>
                    {/* "View" hint on hover */}
                    <span className="text-[10px] text-primary opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                      View →
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
        {selAppts.length > 0 && (
          <div className="px-5 py-2 border-t">
            <Link href="/dashboard/bookings" className="text-xs text-primary hover:underline font-medium">
              View all in bookings →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
