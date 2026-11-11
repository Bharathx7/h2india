import { defineConfig } from "vitest/config";

// Unit tests live next to the code they test, as *.test.ts, in packages/* and apps/*.
export default defineConfig({
  test: {
    globalSetup: ["./vitest.global-setup.ts"],
    // Integration tests share one database; run files one at a time.
    fileParallelism: false,
    include: ["packages/*/src/**/*.test.{ts,tsx}", "apps/*/src/**/*.test.{ts,tsx}"],
    environment: "node",
  },
});
