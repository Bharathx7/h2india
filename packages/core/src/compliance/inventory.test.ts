import { schema } from "@h2india/db";
import { is } from "drizzle-orm";
import { getTableConfig, PgTable } from "drizzle-orm/pg-core";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ERASURE_TABLES } from "./data-rights";
import { inventoryMarkdown, NOT_PERSONAL_TABLES, PERSONAL_TABLES } from "./inventory";

// Step 12.2, "the inventory covers every personal field in the schema (a script checks for unlisted columns)".

const tables = (Object.values(schema) as unknown[])
  .filter((t): t is PgTable => is(t, PgTable))
  .map((t) => getTableConfig(t))
  .filter((c) => c.schema === "core");

/** Column names that usually hold personal data. A match must be listed as a field or as not personal. */
const LOOKS_PERSONAL =
  /(^|_)(name|email|mobile|phone|address|ip|ip_address|user_agent|pan|account_number|account_cipher|ifsc|holder_name|received_by|receiver_\w+|recipient|contact\w*|comment|notes?|details|description|body|payload|password|token|consent\w*|image|photo\w*|birth\w*)($|_)/;

/** On a table classified as not personal, these must never appear. */
const ALWAYS_PERSONAL = /(email|mobile|phone|ip_address|user_agent|holder_name|receiver_name|received_by|^pan$)/;

describe("personal data inventory (step 12.2)", () => {
  const personal = new Map(PERSONAL_TABLES.map((p) => [p.table, p]));

  it("classifies every core table", () => {
    const unclassified = tables.map((t) => t.name).filter((n) => !personal.has(n) && !NOT_PERSONAL_TABLES.includes(n));
    expect(unclassified, "Add each to PERSONAL_TABLES or NOT_PERSONAL_TABLES in inventory.ts").toEqual([]);
  });

  it("lists only tables that exist, once", () => {
    const names = new Set(tables.map((t) => t.name));
    const listed = [...PERSONAL_TABLES.map((p) => p.table), ...NOT_PERSONAL_TABLES];
    expect(listed.filter((n) => !names.has(n))).toEqual([]);
    expect(listed.length).toBe(new Set(listed).size);
  });

  it("lists every personal-looking column of a personal table", () => {
    const missing = tables.flatMap((t) => {
      const entry = personal.get(t.name);
      if (!entry) return [];
      const known = new Set([...entry.fields, ...(entry.notPersonal ?? [])]);
      return t.columns
        .map((c) => c.name)
        .filter((c) => LOOKS_PERSONAL.test(c) && !known.has(c))
        .map((c) => `${t.name}.${c}`);
    });
    expect(missing, "List them as fields (or notPersonal) in inventory.ts").toEqual([]);
  });

  it("lists only columns that exist", () => {
    const wrong = PERSONAL_TABLES.flatMap((p) => {
      const t = tables.find((x) => x.name === p.table);
      const cols = new Set(t?.columns.map((c) => c.name));
      return [...p.fields, ...(p.notPersonal ?? [])].filter((f) => !cols.has(f)).map((f) => `${p.table}.${f}`);
    });
    expect(wrong).toEqual([]);
  });

  it("finds no contact details on a table marked not personal", () => {
    const leaks = tables
      .filter((t) => NOT_PERSONAL_TABLES.includes(t.name))
      .flatMap((t) => t.columns.filter((c) => ALWAYS_PERSONAL.test(c.name)).map((c) => `${t.name}.${c.name}`));
    expect(leaks).toEqual([]);
  });

  it("has erasure cover for every table keyed by a person", () => {
    // A table with a user_id column holds a person's own data; erasure (data-rights.ts STEPS) must say what happens.
    const keyed = tables
      .filter((t) => personal.has(t.name) && t.columns.some((c) => c.name === "user_id"))
      .map((t) => t.name);
    expect(keyed.filter((n) => !ERASURE_TABLES.includes(n))).toEqual([]);
  });

  it("matches docs/privacy/inventory.md (run pnpm privacy:inventory)", () => {
    const doc = readFileSync(new URL("../../../../docs/privacy/inventory.md", import.meta.url), "utf8");
    expect(doc).toBe(inventoryMarkdown());
  });
});
