import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    // Supabase
    DATABASE_URL: z.string().url().optional(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    // Resend
    RESEND_API_KEY: z.string().min(1).optional(),
    RESEND_FROM_EMAIL: z.string().email().default("bookings@medibook.co.za"),
    // Sentry
    SENTRY_DSN: z.string().url().optional(),
    SENTRY_AUTH_TOKEN: z.string().optional(),
    // PostHog (server-side)
    POSTHOG_API_KEY: z.string().optional(),
    // Cloudflare Turnstile (booking form bot protection)
    TURNSTILE_SECRET_KEY: z.string().optional(),
  },
  client: {
    // Supabase (public — safe to expose)
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
    // PostHog
    NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
    NEXT_PUBLIC_POSTHOG_HOST: z.string().url().optional(),
    // Cloudflare Turnstile
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().optional(),
    // App URL
    NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  },
  runtimeEnv: {
    NODE_ENV: process.env["NODE_ENV"],
    DATABASE_URL: process.env["DATABASE_URL"],
    SUPABASE_SERVICE_ROLE_KEY: process.env["SUPABASE_SERVICE_ROLE_KEY"],
    RESEND_API_KEY: process.env["RESEND_API_KEY"],
    RESEND_FROM_EMAIL: process.env["RESEND_FROM_EMAIL"],
    SENTRY_DSN: process.env["SENTRY_DSN"],
    SENTRY_AUTH_TOKEN: process.env["SENTRY_AUTH_TOKEN"],
    POSTHOG_API_KEY: process.env["POSTHOG_API_KEY"],
    TURNSTILE_SECRET_KEY: process.env["TURNSTILE_SECRET_KEY"],
    NEXT_PUBLIC_SUPABASE_URL: process.env["NEXT_PUBLIC_SUPABASE_URL"],
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"],
    NEXT_PUBLIC_POSTHOG_KEY: process.env["NEXT_PUBLIC_POSTHOG_KEY"],
    NEXT_PUBLIC_POSTHOG_HOST: process.env["NEXT_PUBLIC_POSTHOG_HOST"],
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env["NEXT_PUBLIC_TURNSTILE_SITE_KEY"],
    NEXT_PUBLIC_APP_URL: process.env["NEXT_PUBLIC_APP_URL"],
  },
  skipValidation: !!process.env["SKIP_ENV_VALIDATION"],
  emptyStringAsUndefined: true,
});
