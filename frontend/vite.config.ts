// `defineConfig` is imported from vitest rather than vite so the `test` block
// below is type-checked; it re-exports vite's own config type unchanged.
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    // Matchers and lifecycle helpers are imported explicitly in each file
    // rather than injected as globals, so a test that forgets an import
    // fails to compile instead of failing mysteriously at runtime.
    globals: false,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
