import { createDb, schema, type DbHandle } from "@h2india/db";
import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { useTestEnv } from "../testing/factory";
import { searchCompanies } from "./companies";
import { importCompanies } from "./import";

// Step 4.6 DONE WHEN (companies): a dry run changes nothing and lists every problem by row; running the same import
// twice creates no duplicates. Pre-seeded profiles are Unclaimed and stay out of Join search (A38).
const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("company import", () => {
  let h: DbHandle;
  const tag = `t${String(Date.now())}`;
  const rows: Record<string, unknown>[] = [
    {
      key: `${tag}-greenfield`,
      legal_name: `Greenfield Hydrogen ${tag} Private Limited`,
      trade_name: `Greenfield Hydrogen ${tag}`,
      kind: "supplier",
      types: "Manufacturer; Services",
      city: "Pune",
      state: "Maharashtra",
      website: "https://greenfield.example.in",
      categories: "PEM electrolysers; Hydrogen storage",
      summary: "PEM electrolysers and containerised plants.",
      founded: "2014",
      employees: "51–200",
    },
    { key: `${tag}-hydrotek`, legal_name: `Hydrotek Systems ${tag}`, kind: "both", state: "Gujarat" },
  ];
  const count = async () =>
    (
      await h.db
        .select()
        .from(schema.companyProfiles)
        .where(
          inArray(
            schema.companyProfiles.importKey,
            rows.map((r) => String(r.key)),
          ),
        )
    ).length;

  beforeAll(() => {
    useTestEnv(url ?? "");
    h = createDb(url ?? "", { max: 3 });
  });
  afterAll(async () => {
    await h.pool.end();
  });

  it("checks every row without writing, and names each problem by row", async () => {
    const report = await importCompanies(
      [
        ...rows,
        { key: "Bad Key", legal_name: "", kind: "seller", state: "Bombay", website: "greenfield.in" },
        rows[0] ?? {},
      ],
      { apply: true, firstRow: 2 },
    );
    expect(report.applied).toBe(false);
    expect(report.counts).toEqual({ create: 2, update: 0, unchanged: 0, error: 2 });
    const bad = report.rows.find((r) => r.row === 4);
    expect(bad?.errors).toEqual(
      expect.arrayContaining([
        "key: use lower-case letters, digits and dashes",
        "legal_name: required",
        "kind: supplier, buyer or both",
        "state: a state as GST writes it, for example Maharashtra",
        "website: a full address starting with https://",
      ]),
    );
    expect(report.rows.find((r) => r.row === 5)?.errors).toEqual(["key: appears twice in this file"]);
    expect(await count()).toBe(0);
  });

  it("creates unclaimed profiles once; the same import again changes nothing", async () => {
    const first = await importCompanies(rows, { apply: true, firstRow: 2, sample: true });
    expect(first.counts).toMatchObject({ create: 2, error: 0 });
    const second = await importCompanies(rows, { apply: true, firstRow: 2, sample: true });
    expect(second.counts).toEqual({ create: 0, update: 0, unchanged: 2, error: 0 });
    expect(await count()).toBe(2);

    const [profile] = await h.db
      .select()
      .from(schema.companyProfiles)
      .where(eq(schema.companyProfiles.importKey, `${tag}-greenfield`));
    expect(profile).toMatchObject({
      tradeName: `Greenfield Hydrogen ${tag}`,
      types: ["Manufacturer", "Services"],
      categories: ["PEM electrolysers", "Hydrogen storage"],
      foundedYear: 2014,
      claimStatus: "Unclaimed",
      sample: true,
    });

    const changed = await importCompanies([{ ...rows[1], city: "Vadodara" }], {
      apply: true,
      firstRow: 2,
      sample: true,
    });
    expect(changed.counts).toMatchObject({ update: 1, create: 0 });
    expect(await count()).toBe(2);

    // Nobody can ask to join a company that has not claimed its profile.
    expect(await searchCompanies(h.db, `Greenfield Hydrogen ${tag}`)).toEqual([]);
  });
});
