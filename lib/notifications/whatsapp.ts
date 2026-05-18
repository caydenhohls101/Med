import "server-only";

export interface AppointmentNotification {
  patientName: string;
  patientMobile: string;
  practiceName: string;
  doctorTitle: string;
  doctorName: string;
  date: string;
  time: string;
  referenceNumber: string;
  practicePhone?: string;
}

export function confirmationMessage(n: AppointmentNotification): string {
  return [
    `Hi ${n.patientName} 👋`,
    ``,
    `Your appointment has been *confirmed* ✅`,
    ``,
    `🏥 *${n.practiceName}*`,
    `👨‍⚕️ ${n.doctorTitle} ${n.doctorName}`,
    `📅 ${n.date}`,
    `🕐 ${n.time}`,
    `📋 Ref: *${n.referenceNumber}*`,
    ``,
    n.practicePhone ? `Need to reschedule? Call us on ${n.practicePhone}` : `Reply if you need to reschedule.`,
    ``,
    `_MediBook SA — Online Booking for SA Medical Practices_`,
  ].join("\n");
}

export function reminderMessage(n: AppointmentNotification): string {
  return [
    `Hi ${n.patientName} 👋`,
    ``,
    `Reminder: appointment *tomorrow* 📅`,
    ``,
    `🏥 *${n.practiceName}*`,
    `👨‍⚕️ ${n.doctorTitle} ${n.doctorName}`,
    `🕐 ${n.time}`,
    `📋 Ref: *${n.referenceNumber}*`,
    ``,
    `Reply *CONFIRM* to confirm or *CANCEL* to cancel.`,
    ``,
    `_MediBook SA_`,
  ].join("\n");
}

export type WhatsAppResult = { success: true } | { success: false; error: string };

/**
 * Send WhatsApp via Meta Cloud API (FREE — 1,000 conversations/month)
 *
 * Setup (5 minutes):
 *  1. Go to https://developers.facebook.com → Create App → Business
 *  2. Add "WhatsApp" product → get a test phone number
 *  3. Copy the Phone Number ID → WHATSAPP_PHONE_NUMBER_ID
 *  4. Copy the temporary token → WHATSAPP_ACCESS_TOKEN
 *  5. For production: create a permanent token in Meta Business Suite
 *
 * OR use 360dialog (https://www.360dialog.com) — set WHATSAPP_360_API_KEY instead.
 */
export async function sendWhatsApp(to: string, message: string): Promise<WhatsAppResult> {
  const metaToken = process.env["WHATSAPP_ACCESS_TOKEN"];
  const phoneId   = process.env["WHATSAPP_PHONE_NUMBER_ID"];
  const dialogKey = process.env["WHATSAPP_360_API_KEY"];

  // No credentials configured — log preview and continue (non-blocking)
  if ((!metaToken || !phoneId) && !dialogKey) {
    console.log(`[WhatsApp PREVIEW → ${to}]\n${message}\n---`);
    return { success: true };
  }

  const recipient = to.replace(/\s/g, "");

  try {
    // ── Meta Cloud API (preferred, free tier) ──────────────────────
    if (metaToken && phoneId) {
      const res = await fetch(
        `https://graph.facebook.com/v19.0/${phoneId}/messages`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${metaToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: recipient,
            type: "text",
            text: { preview_url: false, body: message },
          }),
        }
      );
      if (!res.ok) return { success: false, error: await res.text() };
      return { success: true };
    }

    // ── 360dialog fallback ────────────────────────────────────────
    if (dialogKey) {
      const res = await fetch("https://waba.360dialog.io/v1/messages", {
        method: "POST",
        headers: { "D360-API-KEY": dialogKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: recipient,
          type: "text",
          text: { preview_url: false, body: message },
        }),
      });
      if (!res.ok) return { success: false, error: await res.text() };
      return { success: true };
    }

    return { success: false, error: "No WhatsApp provider configured." };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}
