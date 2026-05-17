"use client";

import { logout } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  return (
    <form action={logout}>
      <Button type="submit" variant="ghost" size="sm" className="w-full justify-start text-muted-foreground">
        Sign Out
      </Button>
    </form>
  );
}
