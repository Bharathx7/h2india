import { describe, expect, it } from "vitest";
import { pageNumber, pageOf, pageParams, pageRequest, pageSlice, pageWindow, pagingQuery } from "./paging";

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

describe("workspace paging (founder QC, 17 Nov 2026)", () => {
  it("reads the page from the address and falls back to page 1 of 25", () => {
    expect(pageRequest({})).toEqual({ page: 1, perPage: 25 });
    expect(pageRequest({ page: "3", perPage: "50" })).toEqual({ page: 3, perPage: 50 });
    expect(pageRequest({ page: "-2", perPage: "7" })).toEqual({ page: 1, perPage: 25 });
    expect(pageRequest({ page: "x" })).toEqual({ page: 1, perPage: 25 });
  });

  it("slices a loaded list, and a page past the end shows the last page", () => {
    const rows = Array.from({ length: 60 }, (_, i) => i);
    expect(pageOf(rows, { page: 2, perPage: 25 })).toMatchObject({ rows: rows.slice(25, 50), total: 60, page: 2 });
    expect(pageOf(rows, { page: 9, perPage: 25 })).toMatchObject({ rows: rows.slice(50), page: 3 });
    expect(pageOf([], { page: 4, perPage: 25 })).toMatchObject({ rows: [], total: 0, page: 1 });
  });

  it("gives offset and limit for queries that page themselves", () => {
    expect(pageWindow({ page: 3, perPage: 50 })).toEqual({ offset: 100, limit: 50 });
  });
});

describe("several lists on one page", () => {
  it("each list pages with its own parameters and keeps the others'", () => {
    expect(pageParams()).toEqual({ page: "page", perPage: "perPage" });
    expect(pageParams("holidays")).toEqual({ page: "holidaysPage", perPage: "holidaysPerPage" });
    const sp = { page: "3", holidaysPage: "2", holidaysPerPage: "50", tab: "x" };
    expect(pageRequest(sp, "holidays")).toEqual({ page: 2, perPage: 50 });
    expect(pageRequest(sp)).toEqual({ page: 3, perPage: 25 });
    expect(pagingQuery(sp, "holidays")).toEqual({ page: "3", tab: "x" });
    expect(pagingQuery(sp)).toEqual({ holidaysPage: "2", holidaysPerPage: "50", tab: "x" });
  });
});
