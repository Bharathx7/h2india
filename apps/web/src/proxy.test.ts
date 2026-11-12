import { NextRequest } from "next/server";
import { afterEach, describe, expect, it } from "vitest";
import { proxy } from "./proxy";

// Step 5.10: with FLAG_MAINTENANCE on, public pages show the maintenance page with a 503 and Retry-After; the CMS,
// APIs, sign-in and the newsletter stay reachable. Off, nothing changes.

const req = (path: string) => new NextRequest(new URL(path, "http://localhost:3000"));

describe("maintenance switch", () => {
  afterEach(() => {
    delete process.env.FLAG_MAINTENANCE;
  });

  it("shows the maintenance page with a 503 while the flag is on", () => {
    process.env.FLAG_MAINTENANCE = "true";
    const res = proxy(req("/about"));
    expect(res.status).toBe(503);
    expect(res.headers.get("retry-after")).toBe("3600");
    expect(res.headers.get("x-middleware-rewrite")).toContain("/maintenance");
    for (const open of ["/api/health", "/sign-in", "/newsletter", "/maintenance"]) {
      expect(proxy(req(open)).status, open).toBe(200);
    }
  });

  it("changes nothing while the flag is off", () => {
    const res = proxy(req("/about"));
    expect(res.status).toBe(200);
    expect(res.headers.get("x-request-id")).toBeTruthy();
  });
});
