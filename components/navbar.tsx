import Link from "next/link";
import { unstable_cache } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { env } from "@/lib/env";
import { NavbarAvatar } from "./navbar-avatar";
import { NavbarThemeToggle } from "./navbar-theme-toggle";
import { NotificationBell } from "./notification-bell";
import { Button } from "./ui/button";

// Cache notifications per user for 15s — avoids a DB round-trip on every page
const getCachedNotifications = (userId: string) =>
  unstable_cache(
    async () => {
      const supabase = createServiceClient();
      const { data } = await supabase
        .from("notifications")
        .select("id, type, title, body, href, read, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(30);
      return data ?? [];
    },
    [`notifications-${userId}`],
    { revalidate: 15 }
  )();

export async function Navbar() {
  // getSession() reads the JWT from the cookie — no network call to Supabase Auth.
  // Saves 100-300ms versus getUser() on every page load.
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;

  const adminEmails = (env.PLATFORM_ADMIN_EMAILS ?? "")
    .split(",").map((e) => e.trim()).filter(Boolean);
  const isPlatformAdmin = user && adminEmails.includes(user.email ?? "");

  // Fetch notifications from cache — near-instant after first load
  const notifications = user ? await getCachedNotifications(user.id) : [];

  return (
    <nav className="border-b bg-background/95 backdrop-blur-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-4">
        {/* Logo */}
        <Link href="/" prefetch className="font-bold text-primary text-lg shrink-0">
          MediBook SA
        </Link>

        {/* Nav links — prefetch so clicks feel instant */}
        <div className="hidden sm:flex items-center gap-1 flex-1">
          <Link prefetch href="/" className="text-sm text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-md hover:bg-muted transition-colors">
            Home
          </Link>
          <Link prefetch href="/browse" className="text-sm text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-md hover:bg-muted transition-colors">
            Find a Doctor
          </Link>
          <Link prefetch href="/pricing" className="text-sm text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-md hover:bg-muted transition-colors">
            Pricing
          </Link>
          <Link prefetch href="/signup/practice" className="text-sm text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-md hover:bg-muted transition-colors">
            For Practices
          </Link>
          {isPlatformAdmin && (
            <Link prefetch href="/admin" className="text-sm text-amber-700 hover:text-amber-900 px-3 py-1.5 rounded-md hover:bg-amber-50 transition-colors font-medium">
              🛡 Admin
            </Link>
          )}
        </div>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <>
              <NotificationBell notifications={notifications} />
              <NavbarAvatar
                user={{
                  id: user.id,
                  email: user.email ?? "",
                  fullName: user.user_metadata?.full_name,
                  avatarUrl: user.user_metadata?.avatar_url,
                  accountType: isPlatformAdmin ? "admin" : user.user_metadata?.account_type,
                }}
              />
            </>
          ) : (
            <>
              <NavbarThemeToggle />
              <Link prefetch href="/login"><Button variant="ghost" size="sm">Sign In</Button></Link>
              <Link prefetch href="/signup"><Button size="sm">Get Started</Button></Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
