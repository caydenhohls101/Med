import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Supabase Storage — practice logos and doctor photos
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  // Phase 3 hook: no-op so calendar sync drops in cleanly
  // experimental: {},
};

export default nextConfig;
