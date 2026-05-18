"use client";

import { useState, useTransition } from "react";
import { cancelPatientBooking } from "@/app/actions/bookings";

interface Props {
  referenceNumber: string;
  patientEmail: string;
  practiceName: string;
  dateTime: string;
}

export function CancelBookingBtn({ referenceNumber, patientEmail, practiceName, dateTime }: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [result, setResult] = useState<{ success?: boolean; error?: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleCancel() {
    startTransition(async () => {
      const res = await cancelPatientBooking(referenceNumber, patientEmail, reason || undefined);
      setResult(res);
      if (res.success) setOpen(false);
    });
  }

  if (result?.success) {
    return <span className="text-xs text-muted-foreground">Cancelled ✓</span>;
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-destructive hover:underline"
      >
        Cancel booking
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-background rounded-2xl border shadow-2xl w-full max-w-sm p-6 space-y-4">
            {/* Header */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-2xl">⚠️</span>
                <h2 className="text-lg font-bold">Cancel Booking</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Are you sure you want to cancel your appointment at <strong>{practiceName}</strong>?
              </p>
              <p className="text-sm font-medium">{dateTime}</p>
            </div>

            {/* Urgent notice */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
              <strong>Important:</strong> The practice will be notified immediately. Please only cancel if necessary — late cancellations affect other patients.
            </div>

            {/* Reason */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Reason (optional)</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Feeling better, scheduling conflict…"
                rows={2}
                className="w-full text-sm border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>

            {result?.error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2 text-sm text-destructive">
                {result.error}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => { setOpen(false); setResult(null); }}
                className="flex-1 py-2.5 rounded-xl border text-sm font-medium hover:bg-muted transition-colors"
              >
                Keep Booking
              </button>
              <button
                onClick={handleCancel}
                disabled={isPending}
                className="flex-1 py-2.5 rounded-xl bg-destructive text-destructive-foreground text-sm font-semibold hover:bg-destructive/90 transition-colors disabled:opacity-50"
              >
                {isPending ? "Cancelling…" : "Yes, Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
