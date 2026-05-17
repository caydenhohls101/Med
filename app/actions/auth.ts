"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { env } from "@/lib/env";
import { redirect } from "next/navigation";

// ── Geocode a SA suburb + city using Nominatim (free, no API key) ──
async function geocode(suburb: string, city: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const q = encodeURIComponent(`${suburb}, ${city}, South Africa`);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&countrycodes=za`,
      { headers: { "User-Agent": "MediBook-SA/1.0 (medibook.co.za)" }, next: { revalidate: 86400 } }
    );
    const data = await res.json();
    if (data?.[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch { /* geocoding failure is non-fatal */ }
  return null;
}

// ── Practice owner signup ──────────────────────────────────────────
export async function signupPractice(
  _prev: { error: string } | null,
  formData: FormData
) {
  const name         = formData.get("name") as string;
  const email        = formData.get("email") as string;
  const password     = formData.get("password") as string;
  const practiceName = formData.get("practiceName") as string;
  const addressLine1 = formData.get("addressLine1") as string;
  const suburb       = formData.get("suburb") as string;
  const city         = formData.get("city") as string;
  const province     = formData.get("province") as string;
  const postalCode   = formData.get("postalCode") as string;
  const phone        = formData.get("phone") as string;

  if (!name || !email || !password || !practiceName || !addressLine1 || !suburb || !city || !province || !postalCode || !phone) {
    return { error: "All fields are required." };
  }

  const serviceClient = createServiceClient();

  const { data: userData, error: userError } = await serviceClient.auth.admin.createUser({
    email,
    password,
    user_metadata: { full_name: name, account_type: "practice" },
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

  // Geocode for map
  const coords = await geocode(suburb, city);

  const { data: practice, error: practiceError } = await serviceClient
    .from("practices")
    .insert({
      name: practiceName,
      slug,
      address_line1: addressLine1,
      suburb,
      city,
      province,
      postal_code: postalCode,
      phone,
      email,
      trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      ...(coords ? { latitude: coords.lat, longitude: coords.lng } : {}),
    })
    .select("id")
    .single();

  if (practiceError || !practice) {
    await serviceClient.auth.admin.deleteUser(userId);
    return { error: "Could not create practice. The name may already be taken." };
  }

  // accepted_at must be set so get_my_practice_ids() RLS function returns this practice
  const { error: linkError } = await serviceClient.from("practice_users").insert({
    practice_id: practice.id,
    user_id: userId,
    role: "owner",
    accepted_at: new Date().toISOString(),
  });

  if (linkError) {
    await serviceClient.auth.admin.deleteUser(userId);
    return { error: "Failed to set up practice access." };
  }

  const client = await createClient();
  await client.auth.signInWithPassword({ email, password });
  redirect("/dashboard");
}

// ── Patient signup ────────────────────────────────────────────────
export async function signupPatient(
  _prev: { error: string } | null,
  formData: FormData
) {
  const firstName = formData.get("firstName") as string;
  const lastName  = formData.get("lastName") as string;
  const email     = formData.get("email") as string;
  const password  = formData.get("password") as string;
  let   mobile    = ((formData.get("mobile") as string) ?? "").trim();
  const next      = (formData.get("next") as string || "").trim();

  if (!firstName || !lastName || !email || !password || !mobile) {
    return { error: "All fields are required." };
  }

  if (mobile.startsWith("0")) mobile = "+27" + mobile.slice(1);
  else if (mobile.startsWith("27")) mobile = "+" + mobile;

  if (!/^\+[1-9]\d{6,14}$/.test(mobile)) {
    return { error: "Enter a valid South African mobile number (e.g. 0821234567)." };
  }

  const serviceClient = createServiceClient();

  const { error: createError } = await serviceClient.auth.admin.createUser({
    email,
    password,
    user_metadata: {
      full_name: `${firstName} ${lastName}`,
      first_name: firstName,
      last_name: lastName,
      mobile,
      account_type: "patient",
    },
    email_confirm: true,
  });

  if (createError) {
    const msg = createError.message.toLowerCase().includes("already")
      ? "An account with this email already exists. Please sign in."
      : createError.message;
    return { error: msg };
  }

  const client = await createClient();
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });

  if (signInError) return { error: "Account created — please sign in." };

  // Use || not ?? so an empty string also falls back to /browse
  redirect(next || "/browse");
}

// ── Platform admin signup ─────────────────────────────────────────
export async function signupAdmin(
  _prev: { error: string } | null,
  formData: FormData
) {
  const name       = formData.get("name") as string;
  const email      = formData.get("email") as string;
  const password   = formData.get("password") as string;
  const adminCode  = formData.get("adminCode") as string;

  const expectedCode = env.PLATFORM_ADMIN_CODE;
  if (!expectedCode || adminCode.trim() !== expectedCode.trim()) {
    return { error: "Invalid admin access code." };
  }
  if (!name || !email || !password) return { error: "All fields are required." };

  const serviceClient = createServiceClient();
  const { error: createError } = await serviceClient.auth.admin.createUser({
    email,
    password,
    user_metadata: { full_name: name, account_type: "admin" },
    email_confirm: true,
  });

  if (createError) return { error: createError.message };

  // Sign them in immediately
  const client = await createClient();
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) return { error: "Account created — please sign in." };

  redirect("/admin/prospects");
}

// ── Unified login ─────────────────────────────────────────────────
export async function login(_prev: { error: string } | null, formData: FormData) {
  const email    = formData.get("email") as string;
  const password = formData.get("password") as string;
  const next     = formData.get("next") as string | null;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { error: error.message };

  const accountType = data.user.user_metadata?.account_type as string | undefined;

  // Platform admins go to the prospects tool
  const adminEmails = (env.PLATFORM_ADMIN_EMAILS ?? "").split(",").map((e) => e.trim()).filter(Boolean);
  if (adminEmails.includes(data.user.email ?? "")) {
    redirect(next || "/admin/prospects");
  }

  // Practice staff → dashboard, patients → next or /browse
  const { data: pu } = await supabase
    .from("practice_users")
    .select("id")
    .eq("user_id", data.user.id)
    .maybeSingle();

  redirect(pu ? "/dashboard" : (next || "/browse"));
}

// ── Logout ────────────────────────────────────────────────────────
export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
