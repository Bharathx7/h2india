import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

// Every flow runs at the two widths the design uses: 1440 (desktop) and 390 (mobile).
export default defineConfig({
  testDir: "./specs",
  outputDir: "../../test-results/e2e",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [
        ["html", { open: "never", outputFolder: "../../playwright-report" }],
        // The nightly summary (step 12.3) reads passed, failed, flaky and duration from here.
        ["json", { outputFile: "../../playwright-report/results.json" }],
        ["list"],
      ]
    : [["list"]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    // The nightly run (step 12.3) keeps a video of every failed test.
    video: process.env.E2E_VIDEO ? "retain-on-failure" : "off",
    // Animations make elements move; tests see the final state, as users with reduced motion do.
    reducedMotion: "reduce",
    // Locally you can use an installed Chrome instead of downloading Playwright's browser: PW_CHANNEL=chrome
    ...(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {}),
  },
  projects: [
    { name: "desktop-1440", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    {
      name: "mobile-390",
      use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
    },
  ],
  // Locally, start the app yourself (pnpm dev and pnpm dev:worker). In CI the workflow starts the built app and
  // the worker, which finishes background GSTIN checks (step 3.3).
  webServer: process.env.E2E_START_SERVER
    ? [
        {
          command: "pnpm --filter @h2india/web start",
          url: `${baseURL}/api/health`,
          // Production behaviour: sample content hidden (A37).
          env: { FLAG_SAMPLE_CONTENT: "false" },
          reuseExistingServer: false,
          timeout: 120_000,
        },
        {
          // A second copy of the app with Coming soon switched on (step 5.1, A44).
          command: "pnpm --filter @h2india/web exec next start -p 3001",
          url: "http://localhost:3001/api/health",
          env: { FLAG_SAMPLE_CONTENT: "false", FLAG_COMING_SOON: "true" },
          reuseExistingServer: false,
          timeout: 120_000,
        },
        {
          command: "pnpm --filter @h2india/worker start",
          wait: { stdout: /worker ready/ },
          reuseExistingServer: false,
          timeout: 60_000,
        },
      ]
    : undefined,
});
