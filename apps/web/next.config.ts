import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvConfig } from "@next/env";
import { withPayload } from "@payloadcms/next/withPayload";
import type { NextConfig } from "next";
import { readFileSync } from "node:fs";

// Settings live in one .env.local at the repository root (playbook step 1.6), shared by web, worker and scripts.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
// forceReload: Next has already loaded apps/web; read the root files too.
loadEnvConfig(root, process.env.NODE_ENV !== "production", undefined, true);

/** The 301 redirects (step 5.10); the list and its test live with src/seo/redirects.ts. */
const REDIRECTS = JSON.parse(
  readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "src/seo/redirects.json"), "utf8"),
) as { from: string; to: string }[];

const nextConfig: NextConfig = {
  // Workspace packages ship TypeScript source; Next compiles them.
  transpilePackages: ["@h2india/config", "@h2india/core", "@h2india/ui", "@h2india/emails"],
  poweredByHeader: false,
  reactStrictMode: true,
  // app/global-not-found.tsx: the 404 for addresses that match no route, as the app has several root layouts.
  experimental: { globalNotFound: true },
  // 301 redirects (step 5.10).
  redirects: () =>
    Promise.resolve(REDIRECTS.map((r) => ({ source: r.from, destination: r.to, statusCode: 301 as const }))),
};

// Payload (step 4.1) adds the settings its admin and API need.
export default withPayload(nextConfig);
