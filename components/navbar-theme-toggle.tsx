"use client";

import { ThemeToggle } from "@/components/ui/curtain-theme-toggle";

export function NavbarThemeToggle() {
  return (
    <ThemeToggle
      buttonSize={34}
      duration={500}
      onThemeChange={(theme) => {
        try { localStorage.setItem("medibook-theme", theme); } catch { /* ignore */ }
      }}
    />
  );
}
