import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { proxy } from "./proxy";

// Step 11.4 DONE WHEN: in view-as mode every write request is refused at the server.
const req = (method: string, path: string, viewAs: boolean) =>
  new NextRequest(new URL(path, "http://localhost:3000"), {
    method,
    headers: viewAs ? { cookie: "h2_view_as=abc" } : {},
  });

describe("view-as is read-only", () => {
  it("refuses every write while viewing as someone", () => {
    for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
      expect(proxy(req(method, "/buyer/company", true)).status).toBe(403);
      expect(proxy(req(method, "/api/v1/files", true)).status).toBe(403);
    }
  });
  it("lets reads through, ending view-as, and writes without it", () => {
    expect(proxy(req("GET", "/buyer", true)).status).toBe(200);
    expect(proxy(req("POST", "/api/view-as/end", true)).status).toBe(200);
    expect(proxy(req("POST", "/buyer/company", false)).status).toBe(200);
  });
});
