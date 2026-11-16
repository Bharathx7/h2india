import { expect, test } from "../fixtures";
import { cms, signInOperator } from "../helpers/cms";
import { ownIp, withDb } from "../helpers/sign-in";

// Step 4.5 DONE WHEN: each tracker figure shows a source and date; editing a record adds a Recent changes entry;
// sample-flagged records do not appear when the production flag is on (FLAG_SAMPLE_CONTENT off, A37).
test.skip(!process.env.DATABASE_URL, "needs DATABASE_URL");
test.skip(({ isMobile }) => isMobile, "the CMS is checked at desktop width");

test.beforeEach(async ({ context }, info) => {
  await ownIp(context, info);
});

const unique = () => `${String(Date.now())}${String(Math.floor(Math.random() * 1000))}`;

type Change = { field: string; before: string; after: string; source: string; view: string };

async function changesFor(request: Parameters<typeof cms>[0], title: string): Promise<Change[]> {
  const res = await cms(
    request,
    "GET",
    `tracker-changes?where[recordTitle][equals]=${encodeURIComponent(title)}&sort=createdAt&limit=50`,
  );
  expect(res.status).toBe(200);
  return ((res.body as { docs?: Change[] }).docs ?? []).map(({ field, before, after, source, view }) => ({
    field,
    before,
    after,
    source,
    view,
  }));
}

test("editing a tracker record adds Recent changes entries, with its source and date", async ({ page, request }) => {
  await signInOperator(page, "Content editor");
  const name = `Green ammonia at Mundra ${unique()}`;
  const created = await cms(page.request, "POST", "tracker-projects", {
    name,
    company: "Kutch Ammonia Works",
    product: "Green ammonia",
    location: "Mundra, Kutch, Gujarat",
    state: "gujarat",
    capacityTpa: 25000,
    productCapacityTpa: 140000,
    electrolyserMw: 220,
    technology: "Alkaline",
    expectedStartYear: 2028,
    estimates: ["Product capacity", "Expected start-up"],
    stage: "Announced",
    statusDate: "2025-03-01T00:00:00.000Z",
    source: { name: "Company announcement", tier: "company", asOf: "2025-03-10T00:00:00.000Z" },
    _status: "published",
  });
  expect(created.status, JSON.stringify(created.body.errors)).toBe(201);
  const id = created.body.doc?.id ?? 0;
  // Readers see the new record in Recent changes.
  expect(await changesFor(request, name)).toEqual([
    { field: "Record", before: "—", after: "Added", source: "Company announcement", view: "Projects" },
  ]);

  // A draft changes nothing public.
  const draft = await cms(page.request, "PATCH", `tracker-projects/${String(id)}?draft=true`, {
    stage: "Awarded",
    statusDate: "2025-08-01T00:00:00.000Z",
    capacityTpa: 26000,
    source: { name: "SECI result notice", tier: "official", asOf: "2025-08-20T00:00:00.000Z" },
  });
  expect(draft.status, JSON.stringify(draft.body.errors)).toBe(200);
  expect(await changesFor(request, name)).toHaveLength(1);

  // Publishing logs each changed figure with before, after and the source.
  const published = await cms(page.request, "PATCH", `tracker-projects/${String(id)}`, { _status: "published" });
  expect(published.status, JSON.stringify(published.body.errors)).toBe(200);
  const changes = await changesFor(request, name);
  expect(changes.slice(1)).toEqual([
    { field: "Capacity (t/yr)", before: "25,000", after: "26,000", source: "SECI result notice", view: "Projects" },
    { field: "Status", before: "Announced", after: "Awarded", source: "SECI result notice", view: "Projects" },
    { field: "Status date", before: "Mar 2025", after: "Aug 2025", source: "SECI result notice", view: "Projects" },
    {
      field: "Source",
      before: "Company announcement",
      after: "SECI result notice",
      source: "SECI result notice",
      view: "Projects",
    },
  ]);

  // The status history gained a row, and the record knows who entered its figures.
  const doc = (await cms(page.request, "GET", `tracker-projects/${String(id)}`)).body as unknown as {
    statusHistory: { status: string; source: string }[];
    enteredBy: unknown;
  };
  expect(doc.statusHistory.map((h) => [h.status, h.source])).toEqual([
    ["Announced", "Company announcement"],
    ["Awarded", "SECI result notice"],
  ]);
  expect(doc.enteredBy).toBeTruthy();

  // The preview shows every figure with the source and as-of date, estimates marked, and the record's changes.
  await page.goto(`/cms-preview/tracker/tracker-projects/${String(id)}`);
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
  await expect(page.getByTestId("record-source")).toHaveText(
    "Source: SECI result notice (Official) · as of 20 Aug 2025",
  );
  await expect(page.getByText("2028 (official estimate)")).toBeVisible();
  await expect(page.getByText("26,000 t/yr")).toBeVisible();
  await expect(page.getByRole("complementary")).toContainText("Announced → Awarded");
});

test("a price is stored in paise and shown as typed", async ({ page }) => {
  await signInOperator(page, "Content editor");
  const name = `Green hydrogen supply to a refinery ${unique()}`;
  const created = await cms(page.request, "POST", "tracker-prices", {
    name,
    product: "Green H₂",
    price: "397.00",
    gstBasis: "Excl. GST",
    discoveredOn: "2026-09-01T00:00:00.000Z",
    winner: "Private developer",
    source: { name: "Tender portal", tier: "official", asOf: "2026-09-15T00:00:00.000Z" },
    _status: "published",
  });
  expect(created.status, JSON.stringify(created.body.errors)).toBe(201);
  expect((created.body.doc as { pricePaise?: number } | undefined)?.pricePaise).toBe(39700);
  const bad = await cms(page.request, "POST", "tracker-prices", {
    name: `${name} bad`,
    product: "Green H₂",
    price: "about 400",
    discoveredOn: "2026-09-01T00:00:00.000Z",
    source: { name: "Tender portal", tier: "official", asOf: "2026-09-15T00:00:00.000Z" },
  });
  expect(bad.status).toBe(400);
});

test("sample-flagged content is hidden and can't be published while samples are off", async ({ page, request }) => {
  await signInOperator(page, "Content editor");
  const base = {
    company: "Greenfield Hydrogen",
    capacityTpa: 20,
    stage: "Commissioned",
    source: { name: "Company", tier: "company", asOf: "2026-11-03T00:00:00.000Z" },
  };
  const sample = await cms(page.request, "POST", "tracker-projects", {
    ...base,
    name: `Talegaon demonstration plant ${unique()}`,
    sample: true,
    _status: "published",
  });
  test.skip(sample.status === 201, "FLAG_SAMPLE_CONTENT is on for this server");
  expect(sample.status).toBe(400);
  expect(sample.body.errors?.[0]?.message).toContain("Sample content can't be published here");

  // A published record that is (somehow) flagged sample disappears for readers, with its changes; editors still see it.
  const name = `Kandla port station ${unique()}`;
  const real = await cms(page.request, "POST", "tracker-projects", { ...base, name, _status: "published" });
  expect(real.status).toBe(201);
  const id = real.body.doc?.id ?? 0;
  expect((await request.get(`/api/cms/tracker-projects/${String(id)}`)).status()).toBe(200);
  await withDb(async (db) => {
    await db.query("UPDATE cms.tracker_projects SET sample = true WHERE id = $1", [id]);
    await db.query("UPDATE cms.tracker_changes SET sample = true WHERE record_title = $1", [name]);
  });
  expect((await request.get(`/api/cms/tracker-projects/${String(id)}`)).status()).not.toBe(200);
  const list = await request.get(`/api/cms/tracker-projects?where[name][equals]=${encodeURIComponent(name)}`);
  expect(((await list.json()) as { totalDocs: number }).totalDocs).toBe(0);
  expect(await changesFor(request, name)).toEqual([]);
  expect((await cms(page.request, "GET", `tracker-projects/${String(id)}`)).status).toBe(200);

  // The same rule holds for records and the knowledge library.
  const term = await cms(page.request, "POST", "glossary", {
    term: `Sampleterm${unique()}`,
    short: "a sample definition.",
    sample: true,
    _status: "published",
  });
  expect(term.status).toBe(400);
});

test("the methodology page's text is editable and starts with the drawn wording", async ({ request }) => {
  const res = await request.get("/api/cms/globals/tracker-methodology");
  expect(res.status()).toBe(200);
  const body = (await res.json()) as {
    statusMeanings: { status: string }[];
    sources: { text: string }[];
    updateNote: string;
  };
  expect(body.statusMeanings.map((s) => s.status)).toEqual([
    "Announced",
    "Awarded",
    "Contracted",
    "Under construction",
    "Commissioned",
  ]);
  expect(body.sources[0]?.text).toBe("Government notices, tender results and official statistics");
  expect(body.updateNote).toContain("Every Monday");
});
