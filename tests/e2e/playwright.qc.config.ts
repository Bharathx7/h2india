import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

// QC screens (founder QC, 17 Nov 2026): the same browsers, app and worker as the test suite, run on the qc folder,
// with sample content shown so pages look as they will with real data. Run by .github/workflows/qc-screens.yml.
const servers = Array.isArray(base.webServer) ? base.webServer : [];

export default defineConfig({
  ...base,
  testDir: "./qc",
  retries: 0,
  reporter: [["list"]],
  use: { ...base.use, screenshot: "off", trace: "off", video: "off" },
  webServer: servers.length
    ? servers.map((s) => ({ ...s, env: { ...s.env, FLAG_SAMPLE_CONTENT: "true" } }))
    : undefined,
});
