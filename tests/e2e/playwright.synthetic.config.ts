import { defineConfig, devices } from "@playwright/test";

// The synthetic check (step 13.3): a search and an RFQ draft against the live site, every 15 minutes from outside
// the server (.github/workflows/uptime.yml). Reads only; nothing is sent or saved on the server.
export default defineConfig({
  testDir: "./synthetic",
  outputDir: "../../test-results/synthetic",
  retries: 1,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    ...devices["Desktop Chrome"],
    trace: "retain-on-failure",
  },
});
