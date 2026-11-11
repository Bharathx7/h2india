import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";

// Settings live in one .env.local at the repository root (playbook step 1.6), shared by web, worker and scripts.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
// forceReload: Next has already loaded apps/web; read the root files too.
loadEnvConfig(root, process.env.NODE_ENV !== "production", undefined, true);

const nextConfig: NextConfig = {
  // Workspace packages ship TypeScript source; Next compiles them.
  transpilePackages: ["@h2india/config", "@h2india/core", "@h2india/ui", "@h2india/emails"],
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;
