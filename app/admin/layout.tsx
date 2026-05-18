import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { Navbar } from "@/components/navbar";
import Link from "next/link";
import { Shield } from "lucide-react";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const adminEmails = (env.PLATFORM_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);

  if (!user || !adminEmails.includes(user.email ?? "")) {
    redirect("/");
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <div className="border-b bg-amber-50 px-4 py-2 flex items-center gap-4 text-sm">
        <span className="font-semibold text-amber-800 flex items-center gap-1.5"><Shield className="w-4 h-4" /> MediBook Admin</span>
        <Link href="/admin/practices" className="text-amber-700 hover:text-amber-900 hover:underline">
          All Practices
        </Link>
        <Link href="/admin/prospects" className="text-amber-700 hover:text-amber-900 hover:underline">
          Prospect Finder
        </Link>
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}
