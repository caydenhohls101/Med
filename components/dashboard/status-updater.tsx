"use client";

import { useState } from "react";
import { updateAppointmentStatus } from "@/app/actions/bookings";

const transitions: Record<string, { label: string; next: "confirmed" | "cancelled" | "completed" | "no_show" }[]> = {
  pending: [
    { label: "Confirm", next: "confirmed" },
    { label: "Cancel", next: "cancelled" },
  ],
  confirmed: [
    { label: "Complete", next: "completed" },
    { label: "No Show", next: "no_show" },
    { label: "Cancel", next: "cancelled" },
  ],
  completed: [],
  cancelled: [],
  no_show: [],
};

export function StatusUpdater({
  appointmentId,
  currentStatus,
}: {
  appointmentId: string;
  currentStatus: string;
}) {
  const [loading, setLoading] = useState(false);
  const actions = transitions[currentStatus] ?? [];
  if (actions.length === 0) return null;

  async function handleUpdate(next: "confirmed" | "cancelled" | "completed" | "no_show") {
    setLoading(true);
    await updateAppointmentStatus(appointmentId, next);
    setLoading(false);
  }

  return (
    <div className="flex gap-1">
      {actions.map((a) => (
        <button
          key={a.next}
          onClick={() => handleUpdate(a.next)}
          disabled={loading}
          className="text-xs px-2 py-1 rounded border border-input bg-background hover:bg-muted disabled:opacity-50 transition-colors"
        >
          {loading ? "…" : a.label}
        </button>
      ))}
    </div>
  );
}
