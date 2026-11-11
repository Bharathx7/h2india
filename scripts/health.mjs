#!/usr/bin/env node
// Playbook step 1.3: checks each local service and prints OK or the error.  Run: pnpm health
import { readFileSync } from "node:fs";
import pg from "pg";
import Redis from "ioredis";

function loadEnv(file) {
  try {
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
      if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^"(.*)"$/, "$1");
    }
  } catch {
    console.error(`Could not read ${file}. Copy .env.example to .env.local first.`);
    process.exit(1);
  }
}
loadEnv(".env.local");
const env = process.env;

async function check(name, fn) {
  try {
    await fn();
    console.log(`OK    ${name}`);
    return true;
  } catch (e) {
    console.log(`FAIL  ${name}  ${e instanceof Error ? e.message : String(e)}`);
    return false;
  }
}

async function http(url, init) {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
}

const results = await Promise.all([
  check("PostgreSQL", async () => {
    const client = new pg.Client({ connectionString: env.DATABASE_URL, connectionTimeoutMillis: 5000 });
    await client.connect();
    await client.query("select 1");
    await client.end();
  }),
  check("Redis", async () => {
    const redis = new Redis(env.REDIS_URL, { lazyConnect: true, connectTimeout: 5000, maxRetriesPerRequest: 0 });
    await redis.connect();
    const pong = await redis.ping();
    redis.disconnect();
    if (pong !== "PONG") throw new Error(`unexpected reply ${pong}`);
  }),
  check("Meilisearch", () => http(`${env.MEILI_HOST}/health`)),
  check("File storage (MinIO)", () => http(`${env.S3_ENDPOINT}/minio/health/live`)),
  check("Mail catcher (Mailpit)", () => http("http://localhost:8025/readyz")),
]);
process.exit(results.every(Boolean) ? 0 : 1);
