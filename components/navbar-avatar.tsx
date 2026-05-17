"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

interface NavUser {
  id: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
  accountType?: string;
}

export function NavbarAvatar({ user }: { user: NavUser }) {
  const [open, setOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const initials = user.fullName
    ? user.fullName.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : user.email[0].toUpperCase();

  async function handleUpload(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.storage
        .from("avatars")
        .upload(user.id, file, { upsert: true, contentType: file.type });

      if (error) { alert("Upload failed: " + error.message); return; }

      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(user.id);
      const bust = `${publicUrl}?t=${Date.now()}`;
      await supabase.auth.updateUser({ data: { avatar_url: bust } });
      setAvatarUrl(bust);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-full ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-label="Open profile menu"
      >
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={user.fullName ?? "User"}
            width={36}
            height={36}
            className="rounded-full object-cover border"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-semibold border-2 border-primary/20">
            {initials}
          </div>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 bg-background border rounded-xl shadow-lg overflow-hidden z-50">
          {/* User info header */}
          <div className="px-4 py-3 border-b bg-muted/30 flex items-center gap-3">
            {avatarUrl ? (
              <Image src={avatarUrl} alt="" width={40} height={40} className="rounded-full object-cover shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold shrink-0">
                {initials}
              </div>
            )}
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{user.fullName ?? "User"}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>

          {/* Change photo */}
          <label className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted cursor-pointer transition-colors">
            <span className="text-base">{uploading ? "⏳" : "📷"}</span>
            <span>{uploading ? "Uploading…" : "Change Photo"}</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              disabled={uploading}
              onChange={(e) => handleUpload(e.target.files?.[0])}
            />
          </label>

          {/* Dashboard link for staff */}
          {user.accountType !== "patient" && (
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted transition-colors"
            >
              <span className="text-base">📊</span> Dashboard
            </Link>
          )}

          {/* Find a doctor for patients */}
          {user.accountType === "patient" && (
            <Link
              href="/browse"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted transition-colors"
            >
              <span className="text-base">🔍</span> Find a Doctor
            </Link>
          )}

          {/* Sign out — uses route handler so cookies are reliably cleared */}
          <div className="border-t">
            <form action="/api/auth/signout" method="POST">
              <button
                type="submit"
                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm hover:bg-muted text-destructive transition-colors"
              >
                <span className="text-base">🚪</span> Sign Out
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
