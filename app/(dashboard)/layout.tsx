import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/dashboard/logout-button";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: practiceUser } = await supabase
    .from("practice_users")
    .select("role, practices(id, name, slug)")
    .eq("user_id", user.id)
    .maybeSingle();

  const role = practiceUser?.role ?? "doctor";
  const practice = practiceUser?.practices as { id: string; name: string; slug: string } | null;
  const isAdmin = role === "owner" || role === "receptionist";

  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 bg-background border-r flex flex-col">
        <div className="p-6 border-b">
          <div className="font-bold text-primary text-lg">MediBook</div>
          {practice && (
            <div className="text-sm text-muted-foreground mt-0.5 truncate">{practice.name}</div>
          )}
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <NavLink href="/dashboard" label="Today" icon="📅" />
          <NavLink href="/dashboard/bookings" label="All Bookings" icon="📋" />
          {isAdmin && (
            <>
              <NavLink href="/dashboard/doctors" label="Doctors" icon="👨‍⚕️" />
              <NavLink href="/dashboard/services" label="Services" icon="🩺" />
            </>
          )}
        </nav>

        <div className="p-4 border-t space-y-2">
          {practice && (
            <div className="text-xs text-muted-foreground px-2">
              Booking link:{" "}
              <span className="font-mono">/book/{practice.slug}</span>
            </div>
          )}
          <div className="text-xs text-muted-foreground px-2 capitalize">
            Role: {role}
          </div>
          <LogoutButton />
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 p-8">{children}</main>
    </div>
  );
}

function NavLink({ href, label, icon }: { href: string; label: string; icon: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
    >
      <span>{icon}</span>
      {label}
    </Link>
  );
}
