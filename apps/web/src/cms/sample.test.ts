import { describe, expect, it } from "vitest";
import { publicWhere, showSample } from "./sample";

describe("sample content (F9, A37)", () => {
  it("is hidden unless FLAG_SAMPLE_CONTENT is on", () => {
    expect(showSample({})).toBe(false);
    expect(showSample({ FLAG_SAMPLE_CONTENT: "true" })).toBe(true);
    expect(publicWhere({})).toEqual({
      and: [
        { _status: { equals: "published" } },
        { or: [{ sample: { equals: false } }, { sample: { exists: false } }] },
      ],
    });
    expect(publicWhere({ FLAG_SAMPLE_CONTENT: "true" })).toEqual({ _status: { equals: "published" } });
  });
});
