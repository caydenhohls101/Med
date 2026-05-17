import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    template: "%s | MediBook",
    default: "MediBook — Online Booking for SA Medical Practices",
  },
  description:
    "Reduce no-shows. Let patients book online 24/7. Automated WhatsApp and email reminders for South African medical practices.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
