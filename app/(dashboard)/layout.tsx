import Link from "next/link";
import { redirect } from "next/navigation";
import { getCachedPracticeUser, getCachedUser } from "@/lib/supabase/cached";
import { NavbarAvatar } from "@/components/navbar-avatar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [practiceUser, user] = await Promise.all([getCachedPracticeUser(), getCachedUser()]);
  if (!practiceUser || !user) redirect("/login");

  const role = practiceUser.role ?? "doctor";
  const practice = practiceUser.practices as { id: string; name: string; slug: string } | null;
  const isAdmin = role === "owner" || role === "receptionist";

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      {/* ── Sticky top bar — consistent with public navbar ────────── */}
      <header className="sticky top-0 z-40 h-14 bg-background border-b flex items-center px-4 gap-4">
        <Link href="/" className="font-bold text-primary text-lg shrink-0">
          MediBook SA
        </Link>
        {practice && (
          <span className="text-sm text-muted-foreground hidden sm:block truncate">
            / {practice.name}
          </span>
        )}
        <div className="ml-auto flex items-center gap-3">
          {practice && (
            <a
              href={`/book/${practice.slug}`}
              target="_blank"
              rel="noreferrer"
              className="hidden md:inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary border rounded-lg px-3 py-1.5 hover:border-primary transition-colors"
            >
              🔗 Patient booking link
            </a>
          )}
          <NavbarAvatar
            user={{
              id: user.id,
              email: user.email ?? "",
              fullName: user.user_metadata?.full_name,
              avatarUrl: user.user_metadata?.avatar_url,
              accountType: user.user_metadata?.account_type ?? "practice",
            }}
          />
        </div>
      </header>

      {/* ── Body: sidebar + main ─────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <aside className="w-56 shrink-0 bg-background border-r flex flex-col">
          <nav className="flex-1 p-3 pt-4 space-y-0.5">
            <NavLink href="/dashboard"           label="Today"        icon="📅" />
            <NavLink href="/dashboard/bookings"  label="All Bookings" icon="📋" />
            {isAdmin && (
              <>
                <NavLink href="/dashboard/doctors"  label="Doctors"  icon="👨‍⚕️" />
                <NavLink href="/dashboard/services" label="Services" icon="🩺" />
              </>
            )}
          </nav>

          {/* Sidebar footer */}
          <div className="p-3 border-t">
            <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold shrink-0">
                {(user.user_metadata?.full_name as string ?? user.email ?? "U")
                  .split(" ")
                  .map((n: string) => n[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-medium truncate">{user.user_metadata?.full_name ?? user.email}</div>
                <div className="text-xs text-muted-foreground capitalize">{role}</div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 overflow-auto">
          <div className="max-w-5xl mx-auto px-6 py-8">
            {children}
          </div>
        </main>
      </div>
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
