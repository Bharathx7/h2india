import { describe, expect, it } from "vitest";
import { countedPath } from "./pageviews";

describe("first-party page views (A176)", () => {
  it("counts public pages without their query", () => {
    expect(countedPath("/news/green-ammonia?utm_source=x")).toBe("/news/green-ammonia");
    expect(countedPath("/news/")).toBe("/news");
    expect(countedPath("/")).toBe("/");
  });
  it("never counts private or odd paths", () => {
    for (const p of [
      "/admin",
      "/buyer/orders/1",
      "/supplier",
      "/d/abc",
      "/checkout",
      "/api/v1/x",
      "//evil.com",
      "x",
      "/a<b",
    ])
      expect(countedPath(p)).toBeNull();
  });
});
