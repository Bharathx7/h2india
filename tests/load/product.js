import { check, sleep } from "k6";
import http from "k6/http";
import { BASE, options, think } from "./common.js";

// Product pages (step 6.3), found through search so only live listings are used.
export { options };

export function setup() {
  const html = http.get(`${BASE}/search?q=a`).body || "";
  const paths = [...new Set([...html.matchAll(/href="(\/marketplace\/products\/[a-z0-9-]+)"/g)].map((m) => m[1]))];
  if (!paths.length) throw new Error("No product links in search results");
  return { paths: paths.slice(0, 30) };
}

export default function ({ paths }) {
  const r = http.get(`${BASE}${paths[Math.floor(Math.random() * paths.length)]}`, { tags: { name: "product" } });
  check(r, { "product 200": (x) => x.status === 200 });
  sleep(think());
}
