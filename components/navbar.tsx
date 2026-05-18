import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { NavbarAvatar } from "./navbar-avatar";
import { Button } from "./ui/button";

export async function Navbar() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const adminEmails = (env.PLATFORM_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  const isPlatformAdmin = user && adminEmails.includes(user.email ?? "");

  return (
    <nav className="border-b bg-background/95 backdrop-blur-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-4">
        {/* Logo */}
        <Link href="/" className="font-bold text-primary text-lg shrink-0">
          MediBook SA
        </Link>

        {/* Nav links */}
        <div className="hidden sm:flex items-center gap-1 flex-1">
          <Link
            href="/browse"
            className="text-sm text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-md hover:bg-muted transition-colors"
          >
            Find a Doctor
          </Link>
          <Link
            href="/pricing"
            className="text-sm text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-md hover:bg-muted transition-colors"
          >
            Pricing
          </Link>
          <Link
            href="/signup/practice"
            className="text-sm text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-md hover:bg-muted transition-colors"
          >
            For Practices
          </Link>
          {isPlatformAdmin && (
            <Link
              href="/admin/prospects"
              className="text-sm text-amber-700 hover:text-amber-900 px-3 py-1.5 rounded-md hover:bg-amber-50 transition-colors font-medium"
            >
              🛡 Admin
            </Link>
          )}
        </div>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <NavbarAvatar
              user={{
                id: user.id,
                email: user.email ?? "",
                fullName: user.user_metadata?.full_name,
                avatarUrl: user.user_metadata?.avatar_url,
                accountType: isPlatformAdmin ? "admin" : user.user_metadata?.account_type,
              }}
            />
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">Sign In</Button>
              </Link>
              <Link href="/signup">
                <Button size="sm">Get Started</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
