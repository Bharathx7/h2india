import { afterEach, describe, expect, it } from "vitest";
import { siteUrl } from "./origin";

// Founder QC, 17 Nov 2026: Log out sent people to http://localhost:3000 because the redirect was built from the
// container's own address. Redirects use the app's public address instead.
describe("siteUrl", () => {
  const before = process.env.APP_URL;
  afterEach(() => {
    if (before === undefined) delete process.env.APP_URL;
    else process.env.APP_URL = before;
  });

  it("builds redirects on the public address, never the container's", () => {
    process.env.APP_URL = "https://h2economy.co";
    expect(siteUrl("/").toString()).toBe("https://h2economy.co/");
    expect(siteUrl("/forgot-access/email?confirmed=1").toString()).toBe(
      "https://h2economy.co/forgot-access/email?confirmed=1",
    );
  });

  it("keeps the admin domain on the admin domain", () => {
    process.env.APP_URL = "https://admin.h2economy.co";
    expect(siteUrl("/admin/users").origin).toBe("https://admin.h2economy.co");
  });
});
