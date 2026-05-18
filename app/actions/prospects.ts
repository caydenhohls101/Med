"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { env } from "@/lib/env";
import { revalidatePath } from "next/cache";

async function assertAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const adminEmails = (env.PLATFORM_ADMIN_EMAILS ?? "").split(",").map((e) => e.trim()).filter(Boolean);
  if (!user || !adminEmails.includes(user.email ?? "")) throw new Error("Forbidden");
  return user;
}

export async function addProspect(data: {
  osmId?: string;
  name: string;
  address?: string;
  phone?: string;
  website?: string;
  latitude?: number;
  longitude?: number;
  city?: string;
}) {
  const user = await assertAdmin();
  const supabase = createServiceClient();

  const { data: created, error } = await supabase
    .from("prospects")
    .upsert(
      {
        osm_id: data.osmId ?? null,
        name: data.name,
        address: data.address ?? null,
        phone: data.phone ?? null,
        website: data.website ?? null,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        city: data.city ?? null,
        status: "new",
        added_by: user.id,
      },
      { onConflict: "osm_id", ignoreDuplicates: false }
    )
    .select()
    .single();

  if (error) return { error: error.message };
  revalidatePath("/admin/prospects");
  return { success: true, prospect: created };
}

export async function updateProspectStatus(
  id: string,
  status: "new" | "contacted" | "interested" | "setup" | "declined",
  notes?: string
) {
  await assertAdmin();
  const supabase = createServiceClient();

  const { error } = await supabase
    .from("prospects")
    .update({ status, ...(notes !== undefined ? { notes } : {}) })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/admin/prospects");
  return { success: true };
}

export async function deleteProspect(id: string) {
  await assertAdmin();
  const supabase = createServiceClient();
  const { error } = await supabase.from("prospects").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/prospects");
  return { success: true };
}
