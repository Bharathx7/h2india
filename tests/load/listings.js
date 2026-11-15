import { check, sleep } from "k6";
import http from "k6/http";
import { BASE, options, think } from "./common.js";

// Category listings with filters (step 6.3). Category paths come from the marketplace page so the test follows the
// real catalogue; filters are the listing's own query parameters.
export { options };

export function setup() {
  const html = http.get(`${BASE}/marketplace`).body || "";
  const paths = [...new Set([...html.matchAll(/href="(\/marketplace\/[a-z0-9-]+\/[a-z0-9-]+)"/g)].map((m) => m[1]))];
  if (!paths.length) throw new Error("No category links on /marketplace");
  return { paths: paths.slice(0, 20) };
}

export default function ({ paths }) {
  const path = paths[Math.floor(Math.random() * paths.length)];
  const plain = http.get(`${BASE}${path}`, { tags: { name: "listing" } });
  check(plain, { "listing 200": (x) => x.status === 200 });
  const filtered = http.get(`${BASE}${path}?madeInIndia=1&sort=newest&page=2`, { tags: { name: "listing filtered" } });
  check(filtered, { "filtered 200": (x) => x.status === 200 });
  sleep(think());
}
