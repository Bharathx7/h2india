import { describe, expect, it } from "vitest";
import { pageNumber, pageSlice, pagingQuery } from "./paging";

const list = Array.from({ length: 45 }, (_, i) => i + 1);

describe("numbered pages on public lists", () => {
  it("shows 20 a page and the right slice", () => {
    expect(pageSlice(list, "2")).toEqual({ page: 2, total: 45, perPage: 20, items: list.slice(20, 40) });
    expect(pageSlice(list, "3").items).toEqual([41, 42, 43, 44, 45]);
  });

  it.each([undefined, "", "0", "-3", "abc", "1.9", ["x"]])("treats %p as page 1", (raw) => {
    expect(pageNumber(raw, 45)).toBe(1);
  });

  it("clamps a page past the end to the last page", () => {
    expect(pageNumber("99", 45)).toBe(3);
    expect(pageSlice([], "4")).toEqual({ page: 1, total: 0, perPage: 20, items: [] });
  });

  it("keeps the filters and drops page and perPage", () => {
    expect(
      pagingQuery({ type: "epc", page: "2", perPage: "20", empty: "", many: ["a", "b"], none: undefined }),
    ).toEqual({ type: "epc", many: "a" });
  });
});
