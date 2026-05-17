import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NavbarAvatar } from "@/components/navbar-avatar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: practiceUser } = await supabase
    .from("practice_users")
    .select("role, practices(id, name, slug)")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!practiceUser) redirect("/browse");

  const role = practiceUser?.role ?? "doctor";
  const practice = practiceUser?.practices as { id: string; name: string; slug: string } | null;
  const isAdmin = role === "owner" || role === "receptionist";

  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 bg-background border-r flex flex-col">
        {/* Brand */}
        <div className="p-5 border-b">
          <Link href="/" className="font-bold text-primary text-lg">MediBook SA</Link>
          {practice && (
            <div className="text-sm text-muted-foreground mt-0.5 truncate">{practice.name}</div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5">
          <NavLink href="/dashboard" label="Today" icon="📅" />
          <NavLink href="/dashboard/bookings" label="All Bookings" icon="📋" />
          {isAdmin && (
            <>
              <NavLink href="/dashboard/doctors" label="Doctors" icon="👨‍⚕️" />
              <NavLink href="/dashboard/services" label="Services" icon="🩺" />
            </>
          )}
        </nav>

        {/* Profile footer */}
        <div className="p-4 border-t space-y-3">
          {practice && (
            <div className="text-xs text-muted-foreground px-2 bg-muted/50 rounded py-2">
              <span className="block font-medium text-foreground mb-0.5">Booking link</span>
              <span className="font-mono">/book/{practice.slug}</span>
            </div>
          )}
          <div className="flex items-center gap-3 px-2">
            <NavbarAvatar
              user={{
                id: user.id,
                email: user.email ?? "",
                fullName: user.user_metadata?.full_name,
                avatarUrl: user.user_metadata?.avatar_url,
                accountType: user.user_metadata?.account_type ?? "practice",
              }}
            />
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{user.user_metadata?.full_name ?? user.email}</div>
              <div className="text-xs text-muted-foreground capitalize">{role}</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 overflow-auto">
        <div className="max-w-5xl mx-auto px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}

function NavLink({ href, label, icon }: { href: string; label: string; icon: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
    >
      <span className="text-base">{icon}</span>
      {label}
    </Link>
  );
}
