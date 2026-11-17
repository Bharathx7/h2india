import { describe, expect, it } from "vitest";
import { accountDetailsProblems } from "./rules";

describe("account details (founder QC, 17 Nov 2026)", () => {
  it("needs a real name and a role from the Join list", () => {
    expect(accountDetailsProblems({ name: "Anita Rao", jobRole: "Engineering" })).toEqual({});
    expect(accountDetailsProblems({ name: "Anita Rao", jobRole: null })).toEqual({});
    expect(accountDetailsProblems({ name: " ", jobRole: null }).name).toBe("Enter your full name");
    expect(accountDetailsProblems({ name: "x".repeat(121), jobRole: null }).name).toMatch(/at most 120/);
    expect(accountDetailsProblems({ name: "Anita Rao", jobRole: "Astronaut" }).jobRole).toBe(
      "Choose a role from the list",
    );
  });
});

describe("device labels", () => {
  it("names the browser and system in plain words", async () => {
    const { deviceLabel } = await import("./sessions");
    expect(
      deviceLabel("Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"),
    ).toBe("Chrome on Windows");
    expect(deviceLabel(null)).toBe("A browser on a device");
  });
});
