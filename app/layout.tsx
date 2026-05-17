import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    template: "%s | MediBook",
    default: "MediBook — Online Booking for SA Medical Practices",
  },
  description:
    "Reduce no-shows. Let patients book online 24/7. Automated WhatsApp and email reminders for South African medical practices.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
