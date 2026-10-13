import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": resolve(import.meta.dirname, "./src"),
      "@components": resolve(import.meta.dirname, "./src/components"),
      "@services": resolve(import.meta.dirname, "./src/services"),
      "@config": resolve(import.meta.dirname, "./src/config"),
      "@utils": resolve(import.meta.dirname, "./src/utils"),
    },
  },
  test: {
    globals: true,
    // Unit suites must never depend on an ignored developer .env file.
    // Network guard rejects unmocked calls, including this synthetic origin.
    env: {
      VITE_SUPABASE_URL: "http://127.0.0.1:55421",
      VITE_SUPABASE_ANON_KEY: "local-unit-placeholder",
    },
    // Bound worker startup and memory on local Windows hosts and small CI runners.
    maxWorkers: 2,
    testTimeout: 15000,
    environment: "jsdom",
    setupFiles: ["./src/tests/setup.ts", "./src/tests/local/network-guard.ts"],
    css: true,
    include: [
      "src/tests/unit/**/*.test.{ts,tsx}",
      "src/tests/local/**/*.test.{ts,tsx}",

    ],
    exclude: ["node_modules", "dist", "src/tests/e2e/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      exclude: [
        "node_modules/",
        "dist/",
        "src/tests/**",
        "src/config/supabase.ts", // runtime client; tested through injected handlers and local integration
        "**/*.d.ts",
        "vite.config.ts",
        "vitest.config.ts",
      ],
      thresholds: {
        // Línea base exigible actual. Se aumenta al añadir pruebas de servicios y UI.
        lines: 30,
        functions: 25,
        branches: 20,
        statements: 30,
      },
    },
  },
});
