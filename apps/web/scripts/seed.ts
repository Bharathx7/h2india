// pnpm db:seed (step 4.6, A40): the design's sample data for local and staging, all flagged sample (F9). Safe to run
// again: rows are matched on their keys. With FLAG_SAMPLE_CONTENT off, sample content can't be published, so it
// lands as drafts and stays hidden (A37).
import config from "../src/payload.config";
import { getDb } from "@h2india/core";
import { seedCatalogueSamples } from "@h2india/core/catalogue/taxonomy";
import { importCompanies } from "@h2india/core/companies";
import { formatReport } from "@h2india/core/importing";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getPayload, type Payload } from "payload";
import { importContent } from "../src/cms/import/run";
import type { ContentTypeName } from "../src/cms/import/types";
import { showSample } from "../src/cms/sample";
import { parseDate } from "../src/cms/import/values";
import { ALWAYS_LEGAL } from "../src/cms/types";

const here = path.dirname(fileURLToPath(import.meta.url));
const seedDir = path.resolve(here, "../seed");

const CONTENT: ContentTypeName[] = [
  "glossary",
  "schemes",
  "tenders",
  "grants",
  "jobs",
  "standards",
  "events",
  "tracker-projects",
  "tracker-factories",
  "tracker-pilots",
  "tracker-stations",
  "tracker-prices",
  "tracker-policies",
  "tracker-hubs",
];

async function rowsOf(name: string): Promise<Record<string, unknown>[]> {
  const rows = JSON.parse(await readFile(path.join(seedDir, `${name}.json`), "utf8")) as Record<string, unknown>[];
  return rows.map((r) => relativeDates(r) as Record<string, unknown>);
}

const istDay = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/**
 * Home sample data (step 5.1) uses dates relative to today, so tenders stay open and events upcoming: "+5d 17:00" is
 * five days from today at 17:00 India time, "-2d" two days ago.
 */
function relativeDates(value: unknown): unknown {
  if (typeof value === "string") {
    const m = /^([+-]\d+)d(?: (\d{2}:\d{2}))?$/.exec(value);
    if (!m) return value;
    const day = istDay.format(new Date(Date.now() + Number(m[1]) * 86_400_000));
    // A full India-time ISO time, so dates inside arrays (key dates, steps) read the same as top-level fields.
    return `${day}T${m[2] ?? "00:00"}:00+05:30`;
  }
  if (Array.isArray(value)) return value.map(relativeDates);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, relativeDates(v)]));
  }
  return value;
}

/** The newsroom's sections, named and ordered as the news tabs (428:473, step 5.3, A57). Real sections, not samples. */
const TOPICS: { slug: string; name: string; order: number | null; description?: string }[] = [
  { slug: "policy", name: "Policy & regulation", order: 1 },
  { slug: "projects", name: "Projects & investment", order: 2 },
  { slug: "tenders-awards", name: "Tenders & awards", order: 3 },
  { slug: "technology", name: "Technology", order: 4 },
  { slug: "mobility", name: "Mobility", order: 5 },
  { slug: "markets", name: "Markets & prices", order: 6 },
  { slug: "global", name: "Global to India", order: 7 },
  // A topic page that isn't a news section (442:4049): no order, so it stays out of the tabs.
  {
    slug: "green-ammonia",
    name: "Green ammonia",
    order: null,
    description:
      "Ammonia made with green hydrogen instead of natural gas. India's fertiliser plants use millions of tonnes of ammonia a year, and SIGHT Mode 2A buys green ammonia for them on 10-year contracts. Everything on H2 India about it, in one place.",
  },
];

/** Bylines from the design (434:2844, 441:801). An author page shows only when readers can see one of their stories. */
const SAMPLE_AUTHORS = [
  { slug: "ananya-rao-sample", name: "Ananya Rao", title: "Senior correspondent, New Delhi" },
  { slug: "vikram-iyer-sample", name: "Vikram Iyer", title: "Markets editor, Mumbai" },
  { slug: "arjun-sharma-sample", name: "Arjun Sharma", title: "Technical editor, Pune" },
  {
    slug: "meera-kulkarni-sample",
    name: "Meera Kulkarni",
    title: "Technology reporter, Bengaluru",
    kind: "contributor" as const,
    organisation: "Freelance",
  },
];

const SAMPLE_TAGS = [
  { slug: "green-ammonia", name: "Green ammonia" },
  { slug: "sight", name: "SIGHT" },
  { slug: "seci", name: "SECI" },
  { slug: "tenders", name: "Tenders" },
  { slug: "fertilisers", name: "Fertilisers" },
  { slug: "peso", name: "PESO" },
];

/** The topics the home page's sample articles sit in (378:3895). */
async function seedTopics(payload: Payload): Promise<void> {
  for (const t of TOPICS) {
    const found = await payload.find({ collection: "topics", where: { slug: { equals: t.slug } }, limit: 1, depth: 0 });
    const doc = found.docs[0];
    if (!doc) await payload.create({ collection: "topics", data: t });
    else if (doc.name !== t.name || (doc.order ?? null) !== t.order) {
      await payload.update({ collection: "topics", id: doc.id, data: { name: t.name, order: t.order } });
    }
  }
  for (const t of SAMPLE_TAGS) {
    const found = await payload.find({ collection: "tags", where: { slug: { equals: t.slug } }, limit: 1, depth: 0 });
    if (!found.docs[0]) await payload.create({ collection: "tags", data: t });
  }
  for (const a of SAMPLE_AUTHORS) {
    const found = await payload.find({
      collection: "authors",
      where: { slug: { equals: a.slug } },
      limit: 1,
      depth: 0,
    });
    if (!found.docs[0]) {
      await payload.create({
        collection: "authors",
        data: { kind: "staff", ...a, bio: "Sample author from the newsroom design. Replace before launch." },
      });
    }
  }
  const author = await payload.find({
    collection: "authors",
    where: { slug: { equals: "h2-india-newsroom-sample" } },
    limit: 1,
    depth: 0,
  });
  if (!author.docs[0]) {
    await payload.create({
      collection: "authors",
      data: { name: "H2 India newsroom (sample)", slug: "h2-india-newsroom-sample", kind: "staff" },
    });
  }
}

/** Sample articles (378:3895) import as drafts like any article (A39); the seed then publishes them where allowed. */
async function seedArticles(payload: Payload, publish: boolean): Promise<string> {
  const rows = (await rowsOf("articles")).map(liveDates);
  const report = await importContent(
    payload,
    "articles",
    rows.map((r) => ({ ...r, publish: "no" })),
    { apply: true, firstRow: 1, sample: true },
  );
  console.log(formatReport(report));
  if (!publish) return "Articles: kept as drafts";
  let published = 0;
  for (const r of rows) {
    const found = await payload.find({
      collection: "articles",
      where: { slug: { equals: String(r.slug) } },
      draft: true,
      limit: 1,
      depth: 0,
    });
    const doc = found.docs[0];
    if (!doc || doc._status === "published") continue;
    // Sponsored and press-release pieces always need the legal check (A27); sample ones pass it here.
    const legal = ALWAYS_LEGAL.includes(doc.type) ? { legal: { passedAt: new Date().toISOString() } } : {};
    await payload.update({
      collection: "articles",
      id: doc.id,
      data: { _status: "published", workflow: "Published", ...legal },
      context: { workflow: true },
    });
    published += 1;
  }
  return `Articles: ${String(published)} published`;
}

/** Live explainer times inside the "live" group (801:7492) are India time, like every other seed date. */
function liveDates(row: Record<string, unknown>): Record<string, unknown> {
  const live = row.live as { summaryAt?: string; updates?: { at: string }[] } | undefined;
  if (!live) return row;
  const iso = (t: string | undefined) => (t ? (parseDate(t) ?? t) : t);
  return {
    ...row,
    live: { ...live, summaryAt: iso(live.summaryAt), updates: live.updates?.map((u) => ({ ...u, at: iso(u.at) })) },
  };
}

/**
 * Editorial samples (guides for Insights and buyer's guides 440:40, 472:2135; Hydrogen 101 471:1876; videos and
 * podcasts 273:22177, 736:1169): imported as drafts, as the workflow requires (A39), then published where sample
 * content may be.
 */
async function seedEditorial(
  payload: Payload,
  type: "guides" | "chapters" | "videos" | "podcasts",
  publish: boolean,
): Promise<string> {
  const rows = await rowsOf(type);
  const report = await importContent(
    payload,
    type,
    rows.map((r) => ({ ...r, publish: "no" })),
    { apply: true, firstRow: 1, sample: true },
  );
  console.log(formatReport(report));
  const label = type.charAt(0).toUpperCase() + type.slice(1);
  if (!publish) return `${label}: kept as drafts`;
  let published = 0;
  for (const r of rows) {
    const found = await payload.find({
      collection: type,
      where: { slug: { equals: String(r.slug) } },
      draft: true,
      limit: 1,
      depth: 0,
    });
    const doc = found.docs[0];
    if (!doc || doc._status === "published") continue;
    await payload.update({ collection: type, id: doc.id, data: { _status: "published" } as never });
    published += 1;
  }
  return `${label}: ${String(published)} published`;
}

/** Tracker overview figures (796:7867, step 5.6), flagged sample. Never overwrites an editor's figures. */
async function seedTrackerOverview(payload: Payload): Promise<string> {
  const current = await payload.findGlobal({ slug: "tracker-overview", depth: 0 });
  if ((current.figures ?? []).length && !current.sample) return "Tracker overview: kept the editors' figures";
  const data = relativeDates(
    JSON.parse(await readFile(path.join(seedDir, "tracker-overview.json"), "utf8")) as Record<string, unknown>,
  ) as { figures: { value: string; label: string; source: string; asOf: string }[]; dataAsOf?: string };
  await payload.updateGlobal({
    slug: "tracker-overview",
    data: {
      figures: data.figures.map((f) => ({ ...f, asOf: parseDate(f.asOf) ?? f.asOf })),
      dataAsOf: data.dataAsOf ? (parseDate(data.dataAsOf) ?? null) : null,
      sample: true,
    },
  });
  return "Tracker overview: sample figures set";
}

/** The SIGHT tracker (418:2079, step 5.4): sample figures, rounds and awardees. Never overwrites an editor's tracker. */
async function seedSight(payload: Payload): Promise<string> {
  const current = await payload.findGlobal({ slug: "sight-tracker", depth: 0 });
  if (current.intro && !current.sample) return "SIGHT tracker: kept the editors' tracker";
  const data = relativeDates(
    JSON.parse(await readFile(path.join(seedDir, "sight-tracker.json"), "utf8")) as Record<string, unknown>,
  ) as Record<string, unknown> & { verifiedAt?: string };
  await payload.updateGlobal({
    slug: "sight-tracker",
    data: { ...data, verifiedAt: data.verifiedAt ? (parseDate(data.verifiedAt) ?? null) : null, sample: true },
  });
  return "SIGHT tracker: sample tracker set";
}

/** Home figures (A45): the drawn figures with their sources, flagged sample. Never overwrites figures an editor set. */
async function seedHomeFigures(payload: Payload): Promise<string> {
  const current = await payload.findGlobal({ slug: "home-figures", depth: 0 });
  if ((current.figures ?? []).length && !current.sample) return "Home figures: kept the editors' figures";
  const data = JSON.parse(await readFile(path.join(seedDir, "home-figures.json"), "utf8")) as {
    figures: { value: string; label: string; source: string; asOf: string }[];
    sight: { asOf: string } & Record<string, unknown>;
  };
  const day = (d: string) => new Date(`${d}T00:00:00+05:30`).toISOString();
  await payload.updateGlobal({
    slug: "home-figures",
    data: {
      figures: data.figures.map((f) => ({ ...f, asOf: day(f.asOf) })),
      sight: { ...data.sight, asOf: day(data.sight.asOf) },
      sample: true,
    },
  });
  return "Home figures: sample figures set";
}

/** A one-page PDF standing in for a report file. */
function samplePdf(title: string): Buffer {
  const text = title.replace(/[()\\]/g, "");
  const content = `BT /F1 18 Tf 72 720 Td (${text}) Tj ET`;
  const objects = [
    "<</Type/Catalog/Pages 2 0 R>>",
    "<</Type/Pages/Kids[3 0 R]/Count 1>>",
    "<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>",
    `<</Length ${String(content.length)}>>stream\n${content}\nendstream`,
    "<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>",
  ];
  let body = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((o, i) => {
    offsets.push(body.length);
    body += `${String(i + 1)} 0 obj${o}endobj\n`;
  });
  const xref = body.length;
  body += `xref\n0 ${String(objects.length + 1)}\n0000000000 65535 f \n`;
  for (const off of offsets) body += `${String(off).padStart(10, "0")} 00000 n \n`;
  body += `trailer<</Size ${String(objects.length + 1)}/Root 1 0 R>>\nstartxref\n${String(xref)}\n%%EOF\n`;
  return Buffer.from(body, "latin1");
}

async function seedReports(payload: Payload, publish: boolean): Promise<string> {
  const rows = await rowsOf("reports");
  let created = 0;
  for (const r of rows) {
    const slug = String(r.slug);
    const exists = await payload.find({
      collection: "reports",
      where: { slug: { equals: slug } },
      draft: true,
      limit: 1,
      depth: 0,
    });
    if (exists.docs[0]) continue;
    const file = await payload.create({
      collection: "report-files",
      data: { pages: Number(r.pages) },
      file: { data: samplePdf(String(r.title)), mimetype: "application/pdf", name: `${slug}.pdf`, size: 0 },
    });
    const fields: Record<string, unknown> = { ...r };
    delete fields.pages;
    await payload.create({
      collection: "reports",
      data: {
        ...(fields as Record<string, never>),
        publishedOn: new Date(`${String(r.publishedOn)}T00:00:00+05:30`).toISOString(),
        findings: ((r.findings as string[] | undefined) ?? []).map((finding) => ({ finding })),
        contents: ((r.contents as string[] | undefined) ?? []).map((chapter) => ({ chapter })),
        file: file.id,
        sample: true,
        _status: publish ? "published" : "draft",
      } as never,
      draft: false,
    });
    created += 1;
  }
  return `Reports: ${String(created)} created, ${String(rows.length - created)} already there`;
}

/**
 * Company, legal and help content (step 5.8), flagged sample: settings figures and names, the team, the two legal
 * pages with drawn text (Terms 66:5004, Cookies 521:459), help articles (278:23978 in full; the rest as titles) and
 * the Pricing page's drawn prices (C1, C3, M16 still open). Never overwrites what editors entered.
 */
async function seedTrust(payload: Payload, publish: boolean): Promise<string> {
  type Doc = Record<string, unknown> & { slug?: string };
  const data = JSON.parse(await readFile(path.join(seedDir, "trust.json"), "utf8")) as {
    settings: Record<string, unknown>;
    team: Doc[];
    legal: Doc[];
    help: (Doc & { related?: string[]; sections?: { heading: string; steps?: string[] }[] })[];
    pricing: Record<string, unknown> & { plans: (Doc & { features: string[] })[] };
    faqs: Record<string, unknown>;
  };
  const status = publish ? "published" : "draft";
  const out: string[] = [];

  const settings = await payload.findGlobal({ slug: "trust-settings", depth: 0 });
  if (!settings.audience?.length || settings.sample) {
    await payload.updateGlobal({ slug: "trust-settings", data: { ...data.settings, sample: true } });
    out.push("settings");
  }
  const pricing = await payload.findGlobal({ slug: "pricing", depth: 0 });
  if (!pricing.plans?.length || pricing.sample) {
    await payload.updateGlobal({
      slug: "pricing",
      data: {
        ...data.pricing,
        plans: data.pricing.plans.map((p) => ({ ...p, features: p.features.map((text) => ({ text })) })),
        sample: true,
      },
    });
    out.push("pricing");
  }
  const faqs = await payload.findGlobal({ slug: "audience-faqs", depth: 0 });
  if (!faqs.buyers?.length) {
    await payload.updateGlobal({ slug: "audience-faqs", data: data.faqs });
    out.push("questions");
  }

  const exists = async (collection: "team-members" | "legal-pages" | "help-articles", where: Record<string, unknown>) =>
    (await payload.find({ collection, where: where as never, draft: true, limit: 1, depth: 0 })).docs[0];
  let created = 0;
  for (const m of data.team) {
    if (await exists("team-members", { name: { equals: m.name } })) continue;
    await payload.create({ collection: "team-members", data: { ...m, sample: true, _status: status } as never });
    created += 1;
  }
  for (const l of data.legal) {
    if (await exists("legal-pages", { slug: { equals: l.slug } })) continue;
    await payload.create({ collection: "legal-pages", data: { ...l, sample: true, _status: status } as never });
    created += 1;
  }
  const ids = new Map<string, number>();
  for (const h of data.help) {
    const found = await exists("help-articles", { slug: { equals: h.slug } });
    if (found) {
      ids.set(String(h.slug), found.id);
      continue;
    }
    const doc = await payload.create({
      collection: "help-articles",
      data: {
        ...h,
        related: [],
        intro: h.intro ?? "Sample article. The full text arrives with the feature it explains.",
        sections: (h.sections ?? []).map((s) => ({
          heading: s.heading,
          steps: (s.steps ?? []).map((text) => ({ text })),
        })),
        sample: true,
        _status: status,
      } as never,
    });
    ids.set(String(h.slug), doc.id);
    created += 1;
  }
  for (const h of data.help) {
    const related = (h.related ?? []).map((r) => ids.get(r)).filter((x): x is number => x !== undefined);
    const id = ids.get(String(h.slug));
    if (related.length && id) await payload.update({ collection: "help-articles", id, data: { related } });
  }
  return `Company and help: ${String(created)} records created${out.length ? `, ${out.join(", ")} set` : ""}`;
}

/** Sample past issues for the newsletter archive (445:5885, 446:6106), step 5.9. Sending arrives with step 11.3. */
async function seedNewsletterIssues(payload: Payload, publish: boolean): Promise<string> {
  const rows = JSON.parse(await readFile(path.join(seedDir, "newsletter-issues.json"), "utf8")) as {
    number: number;
    sentOn: string;
    title: string;
    highlights: string[];
    sections?: { heading: string; lines: string[] }[];
  }[];
  const paragraph = (text: string) => ({
    type: "paragraph",
    version: 1,
    format: "",
    indent: 0,
    direction: "ltr",
    children: [{ type: "text", version: 1, text, format: 0, detail: 0, mode: "normal", style: "" }],
  });
  let created = 0;
  for (const r of rows) {
    const slug = `india-h2-weekly-${String(r.number)}`;
    const found = await payload.find({
      collection: "newsletter-issues",
      where: { slug: { equals: slug } },
      draft: true,
      limit: 1,
      depth: 0,
    });
    if (found.docs.length) continue;
    await payload.create({
      collection: "newsletter-issues",
      data: {
        list: "weekly",
        number: r.number,
        sentOn: r.sentOn,
        title: r.title,
        slug,
        highlights: r.highlights.map((text) => ({ text })),
        sections: (r.sections ?? []).map((s) => ({
          heading: s.heading,
          body: {
            root: {
              type: "root",
              version: 1,
              format: "",
              indent: 0,
              direction: "ltr",
              children: s.lines.map(paragraph),
            },
          },
        })),
        sample: true,
        _status: publish ? "published" : "draft",
      } as never,
    });
    created += 1;
  }
  return `Newsletter issues: ${String(created)} created`;
}

async function main(): Promise<number> {
  const payload = await getPayload({ config });
  const publish = showSample();
  if (!publish) console.log("FLAG_SAMPLE_CONTENT is off: sample content is added as drafts and stays hidden (A37).");
  let problems = 0;

  const companies = await importCompanies(await rowsOf("companies"), { apply: true, firstRow: 1, sample: true });
  console.log(formatReport(companies));
  problems += companies.counts.error;
  console.log(await seedCatalogueSamples(getDb()));

  for (const type of CONTENT) {
    const rows = (await rowsOf(type)).map((r) => (publish ? r : { ...r, publish: "no" }));
    const report = await importContent(payload, type, rows, { apply: true, firstRow: 1, sample: true });
    console.log(formatReport(report));
    problems += report.counts.error;
  }
  console.log(await seedReports(payload, publish));
  await seedTopics(payload);
  console.log(await seedArticles(payload, publish));
  for (const type of ["guides", "chapters", "videos", "podcasts"] as const) {
    console.log(await seedEditorial(payload, type, publish));
  }
  console.log(await seedTrackerOverview(payload));
  console.log(await seedHomeFigures(payload));
  console.log(await seedSight(payload));
  console.log(await seedTrust(payload, publish));
  console.log(await seedNewsletterIssues(payload, publish));
  return problems > 0 ? 1 : 0;
}

// `payload run` exits once the module has loaded, so the work is awaited at the top level.
let code = 1;
try {
  code = await main();
} catch (error) {
  console.error(error);
}
process.exit(code);
