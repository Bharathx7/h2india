import { defineConfig, devices } from "@playwright/test";

// Core Web Vitals on a throttled mid-range Android profile (step 12.5). Run against staging, not a dev server:
//   E2E_BASE_URL=https://staging.example pnpm --filter @h2india/e2e exec playwright test -c playwright.perf.config.ts
export default defineConfig({
  testDir: "./perf",
  outputDir: "../../test-results/perf",
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    ...devices["Pixel 7"],
    browserName: "chromium",
  },
});
