import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { PUBLIC, routesDoc, scanRoutes, staleAllowList, unguarded } from "./route-inventory";

// Step 12.1: every API route and server action has a permission check, or is public on purpose with a reason.

const src = fileURLToPath(new URL("..", import.meta.url));
const root = path.resolve(src, "../../..");
const entries = scanRoutes(src);

function files(dir: string, keep: (rel: string, text: string) => boolean, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) files(p, keep, out);
    else if (
      /\.tsx?$/.test(e.name) &&
      !/\.test\./.test(e.name) &&
      keep(path.relative(src, p), fs.readFileSync(p, "utf8"))
    )
      out.push(path.relative(src, p).split(path.sep).join("/"));
  }
  return out;
}

describe("route and server action inventory (step 12.1)", () => {
  it('reads every route.ts and every "use server" file', () => {
    const routes = files(path.join(src, "app"), (rel) => path.basename(rel) === "route.ts");
    const actions = files(src, (_, text) => /^\s*["']use server["']/.test(text));
    const scanned = new Set(entries.map((e) => e.file));
    expect(routes.length).toBeGreaterThan(30);
    expect(actions.length).toBeGreaterThan(30);
    expect([...routes, ...actions].filter((f) => !scanned.has(f))).toEqual([]);
  });

  it("finds a guard in every route and action that isn't public on purpose", () => {
    const missing = unguarded(entries).map((e) => `${e.file}#${e.name}`);
    expect(missing, "Call a guard (requireOperator, supplierActor, buyerOf, …) or add a reason to PUBLIC").toEqual([]);
  });

  it("keeps the public allow-list short and true: each key covers an unguarded entry and has a one-line reason", () => {
    expect(staleAllowList(entries)).toEqual([]);
    for (const [key, reason] of Object.entries(PUBLIC)) {
      expect(reason.trim().length, key).toBeGreaterThan(10);
      expect(reason.includes("\n"), key).toBe(false);
    }
  });

  it("recognises the guards in a few known places", () => {
    const guards = (file: string, name: string) => entries.find((e) => e.file === file && e.name === name)?.guards;
    expect(guards("supplier/orders/actions.ts", "acceptOrderAction")).toContain("supplierActor");
    expect(guards("buyer/orders/actions.ts", "approveAction")).toContain("cartBuyer");
    expect(guards("app/api/internal/search-sync/route.ts", "POST")).toContain("isInternalKey");
    expect(guards("app/api/v1/payments/webhook/route.ts", "POST")).toContain("receiveWebhook");
    // A helper defined in the same file is followed (member actions call a local me()).
    expect(guards("member/alert-actions.ts", "saveAlertAction")).toContain("getSession");
  });

  it("docs/security/routes.md is up to date (run pnpm tsx scripts/route-inventory.ts)", async () => {
    const docPath = path.join(root, "docs/security/routes.md");
    expect(fs.readFileSync(docPath, "utf8")).toBe(await routesDoc(entries, docPath));
  });
});
