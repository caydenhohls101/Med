"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format, addDays, subDays, startOfWeek, isSameDay, isToday } from "date-fns";

const HOUR_PX  = 72;   // pixels per hour
const START_HR = 7;    // 7am
const END_HR   = 19;   // 7pm
const HOURS    = Array.from({ length: END_HR - START_HR }, (_, i) => START_HR + i);

const STATUS_CLASSES: Record<string, string> = {
  confirmed: "bg-green-100 border-l-4 border-green-500 text-green-900",
  pending:   "bg-amber-50  border-l-4 border-amber-400 text-amber-900",
  completed: "bg-blue-50   border-l-4 border-blue-500  text-blue-900",
  cancelled: "bg-gray-100  border-l-4 border-gray-400  text-gray-500 opacity-60",
  no_show:   "bg-red-50    border-l-4 border-red-500   text-red-900",
};

interface WAppt {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  reference_number: string;
  doctor_id: string;
  doctors: { full_name: string; title: string; color: string } | null;
  patients: { first_name: string; last_name: string } | null;
  services: { name: string } | null;
}

interface Doctor { id: string; full_name: string; title: string; color: string }

function apptTop(appt: WAppt): number {
  const d = new Date(appt.starts_at);
  return ((d.getHours() + d.getMinutes() / 60 - START_HR) * HOUR_PX);
}
function apptHeight(appt: WAppt): number {
  const mins = (new Date(appt.ends_at).getTime() - new Date(appt.starts_at).getTime()) / 60000;
  return Math.max((mins / 60) * HOUR_PX, 28);
}

export function WeekCalendar({
  appointments, doctors, defaultView = "week",
}: {
  appointments: WAppt[];
  doctors: Doctor[];
  defaultView?: "week" | "day";
}) {
  const [weekStart, setWeekStart] = useState(
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [view, setView] = useState<"week" | "day">(defaultView);
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [selectedDoc, setSelectedDoc] = useState<string | "all">("all");
  const [hovered, setHovered] = useState<string | null>(null);
  const router = useRouter();

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const viewDays = view === "week" ? weekDays : [selectedDay];
  const visibleDocs = selectedDoc === "all" ? doctors : doctors.filter((d) => d.id === selectedDoc);

  function apptForCell(day: Date, docId: string) {
    return appointments.filter(
      (a) => isSameDay(new Date(a.starts_at), day) && a.doctor_id === docId
    );
  }

  return (
    <div className="flex flex-col h-full bg-background rounded-2xl border shadow-sm overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-5 py-3 border-b bg-muted/10 flex-wrap">
        <div className="flex gap-1">
          <button
            onClick={() => { setWeekStart((w) => subDays(w, 7)); setSelectedDay((d) => subDays(d, 7)); }}
            className="px-3 py-1.5 text-sm rounded-lg border hover:bg-muted transition-colors">←</button>
          <button
            onClick={() => { setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 })); setSelectedDay(new Date()); }}
            className="px-3 py-1.5 text-sm rounded-lg border hover:bg-muted transition-colors font-medium">Today</button>
          <button
            onClick={() => { setWeekStart((w) => addDays(w, 7)); setSelectedDay((d) => addDays(d, 7)); }}
            className="px-3 py-1.5 text-sm rounded-lg border hover:bg-muted transition-colors">→</button>
        </div>

        <span className="text-sm font-semibold">
          {view === "week"
            ? `${format(weekStart, "d MMM")} – ${format(addDays(weekStart, 6), "d MMM yyyy")}`
            : format(selectedDay, "EEEE, d MMMM yyyy")}
        </span>

        <div className="ml-auto flex items-center gap-2 flex-wrap">
          {/* Doctor filter */}
          <select
            value={selectedDoc}
            onChange={(e) => setSelectedDoc(e.target.value)}
            className="text-xs border rounded-lg px-2 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Doctors</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>{d.title} {d.full_name}</option>
            ))}
          </select>

          {/* View toggle */}
          <div className="flex rounded-lg border overflow-hidden">
            {(["week","day"] as const).map((v) => (
              <button key={v} onClick={() => setView(v)}
                className={`px-3 py-1.5 text-xs font-medium capitalize transition-colors ${view === v ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Week-day headers */}
      <div className="flex border-b bg-muted/5">
        <div className="w-16 shrink-0" />
        {viewDays.map((day) => (
          <div
            key={day.toISOString()}
            className={`flex-1 text-center py-2.5 border-l cursor-pointer transition-colors hover:bg-muted/30 ${isToday(day) ? "bg-primary/5" : ""}`}
            onClick={() => { setSelectedDay(day); setView("day"); }}
          >
            <div className={`text-xs uppercase tracking-wide font-medium ${isToday(day) ? "text-primary" : "text-muted-foreground"}`}>
              {format(day, "EEE")}
            </div>
            <div className={`text-lg font-bold leading-tight ${isToday(day) ? "text-primary" : ""}`}>
              {format(day, "d")}
            </div>
          </div>
        ))}
      </div>

      {/* Scrollable time grid */}
      <div className="overflow-auto flex-1">
        <div className="flex min-w-0">
          {/* Time gutter */}
          <div className="w-16 shrink-0 border-r bg-muted/5">
            {HOURS.map((h) => (
              <div key={h} className="border-b text-right pr-2" style={{ height: HOUR_PX }}>
                <span className="text-[10px] text-muted-foreground relative -top-2">
                  {h < 12 ? `${h}am` : h === 12 ? "12pm" : `${h - 12}pm`}
                </span>
              </div>
            ))}
          </div>

          {/* Day × Doctor columns */}
          {viewDays.map((day) => (
            <div key={day.toISOString()} className={`flex-1 flex min-w-0 border-l ${isToday(day) ? "bg-primary/3" : ""}`}>
              {visibleDocs.length > 0 ? visibleDocs.map((doc) => {
                const dayDocAppts = apptForCell(day, doc.id);
                return (
                  <div key={doc.id} className="flex-1 relative border-r" style={{ height: HOUR_PX * HOURS.length }}>
                    {/* Hour lines */}
                    {HOURS.map((h) => (
                      <div key={h} className="absolute w-full border-b border-dashed border-muted/40"
                        style={{ top: (h - START_HR) * HOUR_PX, height: HOUR_PX }} />
                    ))}
                    {/* Half-hour lines */}
                    {HOURS.map((h) => (
                      <div key={`h-${h}`} className="absolute w-full border-b border-muted/20"
                        style={{ top: (h - START_HR) * HOUR_PX + HOUR_PX / 2, height: 0 }} />
                    ))}
                    {/* Appointment blocks */}
                    {dayDocAppts.map((appt) => {
                      const top    = apptTop(appt);
                      const height = apptHeight(appt);
                      if (top < 0 || top > HOUR_PX * HOURS.length) return null;
                      const isHov = hovered === appt.id;
                      return (
                        <div
                          key={appt.id}
                          onMouseEnter={() => setHovered(appt.id)}
                          onMouseLeave={() => setHovered(null)}
                          onClick={() => router.push("/dashboard/bookings")}
                          className={`absolute left-0.5 right-0.5 rounded-lg px-1.5 py-1 text-[10px] overflow-visible cursor-pointer transition-all z-10
                            ${STATUS_CLASSES[appt.status] ?? STATUS_CLASSES.pending}
                            ${isHov ? "shadow-xl scale-[1.03] z-30" : "shadow-sm"}
                          `}
                          style={{ top, height }}
                        >
                          {/* Rich hover tooltip */}
                          {isHov && (
                            <div className="absolute left-full top-0 ml-2 z-40 w-52 bg-background border rounded-xl shadow-2xl p-3 pointer-events-none animate-in fade-in slide-in-from-left-1 duration-150">
                              <div className="font-bold text-sm text-foreground">
                                {format(new Date(appt.starts_at), "HH:mm")} – {format(new Date(appt.ends_at), "HH:mm")}
                              </div>
                              <div className="font-semibold text-xs text-foreground mt-1">
                                {appt.patients?.first_name} {appt.patients?.last_name}
                              </div>
                              <div className="text-xs text-muted-foreground">{appt.services?.name}</div>
                              <div className="text-xs text-muted-foreground">{doc.title} {doc.full_name}</div>
                              <div className="text-[10px] font-mono text-muted-foreground/70 mt-1">{appt.reference_number}</div>
                              <div className="mt-2 text-[10px] text-primary font-semibold">Click to manage →</div>
                            </div>
                          )}
                          <div className="font-bold">{format(new Date(appt.starts_at), "HH:mm")}</div>
                          {height > 36 && (
                            <div className="truncate font-medium leading-tight">
                              {appt.patients?.first_name} {appt.patients?.last_name}
                            </div>
                          )}
                          {height > 52 && (
                            <div className="truncate opacity-70 leading-tight">{appt.services?.name}</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              }) : (
                <div className="flex-1 relative border-r" style={{ height: HOUR_PX * HOURS.length }}>
                  {HOURS.map((h) => <div key={h} className="border-b border-dashed border-muted/40" style={{ height: HOUR_PX }} />)}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Doctor header row (shown below day headers for week view) */}
        {view === "week" && visibleDocs.length > 1 && (
          <div className="flex border-t border-b bg-muted/5 sticky bottom-0">
            <div className="w-16 shrink-0" />
            {viewDays.map((day) => (
              <div key={day.toISOString()} className="flex-1 flex border-l">
                {visibleDocs.map((doc) => (
                  <div key={doc.id} className="flex-1 px-1 py-1.5 border-r text-center">
                    <div className="text-[9px] text-muted-foreground truncate">{doc.title} {doc.full_name}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
