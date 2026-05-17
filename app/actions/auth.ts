"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { redirect } from "next/navigation";

export async function login(_prev: { error: string } | null, formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { error: error.message };

  redirect("/dashboard");
}

export async function signup(_prev: { error: string } | null, formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const practiceName = formData.get("practiceName") as string;

  if (!name || !email || !password || !practiceName) {
    return { error: "All fields are required." };
  }

  const serviceClient = createServiceClient();

  // Create the auth user (auto-confirmed — no email confirmation step)
  const { data: userData, error: userError } = await serviceClient.auth.admin.createUser({
    email,
    password,
    user_metadata: { full_name: name },
    email_confirm: true,
  });

  if (userError || !userData.user) {
    return { error: userError?.message ?? "Failed to create account." };
  }

  const userId = userData.user.id;
  const slug = practiceName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

  // Create the practice
  const { data: practice, error: practiceError } = await serviceClient
    .from("practices")
    .insert({
      name: practiceName,
      slug,
      address_line1: "To be completed",
      suburb: "To be completed",
      city: "Johannesburg",
      province: "Gauteng",
      postal_code: "2000",
      phone: "+27000000000",
      email,
      trial_ends_at: trialEndsAt,
    })
    .select("id")
    .single();

  if (practiceError || !practice) {
    await serviceClient.auth.admin.deleteUser(userId);
    return { error: "Could not create practice. The name or slug may already be taken." };
  }

  // Link the user to the practice as owner
  const { error: linkError } = await serviceClient.from("practice_users").insert({
    practice_id: practice.id,
    user_id: userId,
    role: "owner",
  });

  if (linkError) {
    await serviceClient.auth.admin.deleteUser(userId);
    return { error: "Failed to set up practice access." };
  }

  // Sign the user in
  const client = await createClient();
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });

  if (signInError) {
    return { error: "Account created — please log in." };
  }

  redirect("/dashboard");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
