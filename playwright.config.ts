import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config para CMOR FLOW
 * Ver: https://playwright.dev/docs/test-configuration
 */
const baseURL=process.env.E2E_BASE_URL||"http://localhost:5173";
if(!["localhost","127.0.0.1","[::1]"].includes(new URL(baseURL).hostname))throw new Error("External E2E URL rejected.");
export default defineConfig({
  testDir: "./src/tests/e2e",
  testMatch: "local-*.spec.ts",
  fullyParallel: false, // Sequential para no interferir con DB
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ["html", { outputFolder: "playwright-report" }],
    ["list"],
  ],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: process.env.LOCAL_BROWSER_CHANNEL ? "off" : "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"],channel: process.env.LOCAL_BROWSER_CHANNEL },
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        env: {VITE_SUPABASE_URL:"http://127.0.0.1:55421",VITE_SUPABASE_ANON_KEY:"local-browser-fixture",VITE_SENTRY_DSN:""},
        url: "http://localhost:5173",
        reuseExistingServer: !process.env.CI,
        timeout: 30_000,
      },
});
