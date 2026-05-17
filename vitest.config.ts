import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    globals: true,
    // Integration tests against a real DB need a running Supabase local instance
    // Run: supabase start && pnpm test:integration
    include: ["**/*.{test,spec}.{ts,tsx}"],
    exclude: [
      "node_modules/**",
      ".next/**",
      "**/e2e/**",
      "**/*.e2e.*",
    ],
    // Keep availability engine and SA utility tests fast with no DB
    environmentOptions: {
      // tests in tests/integration/ get DATABASE_URL injected
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
