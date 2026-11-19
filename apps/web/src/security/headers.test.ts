import { describe, expect, it } from "vitest";
import { contentSecurityPolicy, originOf, securityHeaders } from "./headers";

const prod = { dev: false, storageOrigins: ["https://h2economy.co"], pathname: "/" };
const directive = (csp: string, name: string) =>
  csp
    .split("; ")
    .find((d) => d.startsWith(`${name} `))
    ?.slice(name.length + 1)
    .split(" ") ?? [];

describe("security headers (step 12.1)", () => {
  it("blocks framing, plugins, foreign forms and foreign scripts", () => {
    const csp = contentSecurityPolicy(prod);
    expect(directive(csp, "frame-ancestors")).toEqual(["'none'"]);
    expect(directive(csp, "object-src")).toEqual(["'none'"]);
    expect(directive(csp, "form-action")).toEqual(["'self'"]);
    expect(directive(csp, "base-uri")).toEqual(["'self'"]);
    expect(directive(csp, "script-src")).toEqual(["'self'", "'unsafe-inline'"]);
    expect(csp).toContain("upgrade-insecure-requests");
  });

  it("lets the browser upload to storage and nowhere else", () => {
    const csp = contentSecurityPolicy({ ...prod, storageOrigins: ["http://localhost:9000", "http://localhost:9000"] });
    expect(directive(csp, "connect-src")).toEqual(["'self'", "http://localhost:9000"]);
  });

  it("allows eval only in development, on every page (the old /cms exception is gone)", () => {
    expect(directive(contentSecurityPolicy(prod), "script-src")).not.toContain("'unsafe-eval'");
    expect(directive(contentSecurityPolicy({ ...prod, dev: true }), "script-src")).toContain("'unsafe-eval'");
    const cms = contentSecurityPolicy({ ...prod, pathname: "/cms/collections/articles" });
    expect(directive(cms, "script-src")).toEqual(["'self'", "'unsafe-inline'"]);
  });

  it("frames only YouTube's privacy-enhanced player", () => {
    expect(directive(contentSecurityPolicy(prod), "frame-src")).toEqual(["'self'", "https://www.youtube-nocookie.com"]);
  });

  it("allows the analytics tool's origin once one is set", () => {
    const csp = contentSecurityPolicy({ ...prod, analyticsOrigin: "https://stats.example.org" });
    expect(directive(csp, "script-src")).toContain("https://stats.example.org");
    expect(directive(csp, "connect-src")).toContain("https://stats.example.org");
    expect(directive(contentSecurityPolicy(prod), "script-src")).toHaveLength(2);
  });

  it("sends the other headers", () => {
    const h = Object.fromEntries(securityHeaders(prod));
    expect(h["X-Content-Type-Options"]).toBe("nosniff");
    expect(h["X-Frame-Options"]).toBe("DENY");
    expect(h["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(h["Permissions-Policy"]).toContain("camera=()");
  });

  it("reads origins from settings", () => {
    expect(originOf("http://localhost:9000/bucket")).toBe("http://localhost:9000");
    expect(originOf("not a url")).toBeNull();
    expect(originOf(undefined)).toBeNull();
  });
});
