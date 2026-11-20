import { describe, expect, it } from "vitest";
import { isSensitive, roleIsSensitive, roleWords } from "./role-words";

describe("roles in plain words", () => {
  it("say what a role can and can't do", () => {
    const words = roleWords(["content.view", "content.edit", "content.publish", "reports.view"]);
    expect(words.can).toEqual(["Content: see, change", "Reports: see", "Publish and schedule content"]);
    expect(words.cannot).toContain("Money");
    expect(words.cannot).not.toContain("Content");
  });

  it("flag access to money, people's data and who can do what", () => {
    expect(isSensitive("money.edit")).toBe(true);
    expect(isSensitive("money.view")).toBe(false);
    expect(isSensitive("roles.manage")).toBe(true);
    expect(isSensitive("content.edit")).toBe(false);
    expect(roleIsSensitive(["content.view", "users.edit"])).toBe(true);
  });
});
