// pnpm db:seed (step 4.6, A40): the design's sample data for local and staging, all flagged sample (F9). Safe to run
// again: rows are matched on their keys. With FLAG_SAMPLE_CONTENT off, sample content can't be published, so it
// lands as drafts and stays hidden (A37).
import config from "../src/payload.config";
import { importCompanies } from "@h2india/core/companies";
import { formatReport } from "@h2india/core/importing";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getPayload, type Payload } from "payload";
import { importContent } from "../src/cms/import/run";
import type { ContentTypeName } from "../src/cms/import/types";
import { showSample } from "../src/cms/sample";

const here = path.dirname(fileURLToPath(import.meta.url));
const seedDir = path.resolve(here, "../seed");

const CONTENT: ContentTypeName[] = [
  "glossary",
  "tracker-projects",
  "tracker-factories",
  "tracker-pilots",
  "tracker-stations",
  "tracker-prices",
  "tracker-policies",
  "tracker-hubs",
];

async function rowsOf(name: string): Promise<Record<string, unknown>[]> {
  return JSON.parse(await readFile(path.join(seedDir, `${name}.json`), "utf8")) as Record<string, unknown>[];
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

async function main(): Promise<number> {
  const payload = await getPayload({ config });
  const publish = showSample();
  if (!publish) console.log("FLAG_SAMPLE_CONTENT is off: sample content is added as drafts and stays hidden (A37).");
  let problems = 0;

  const companies = await importCompanies(await rowsOf("companies"), { apply: true, firstRow: 1, sample: true });
  console.log(formatReport(companies));
  problems += companies.counts.error;

  for (const type of CONTENT) {
    const rows = (await rowsOf(type)).map((r) => (publish ? r : { ...r, publish: "no" }));
    const report = await importContent(payload, type, rows, { apply: true, firstRow: 1, sample: true });
    console.log(formatReport(report));
    problems += report.counts.error;
  }
  console.log(await seedReports(payload, publish));
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
