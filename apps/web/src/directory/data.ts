import config from "@payload-config";
import { getDb } from "@h2india/core";
import { directoryEntries, type DirectoryEntry } from "@h2india/core/directory";
import { getPayload, type Where } from "payload";
import { cache } from "react";
import { publicWhere, showSample } from "@/cms/sample";
import type { Association, Person } from "@/payload-types";

// Public reads for the directory (step 6.6). Companies come from core (company profiles); people and associations from
// the CMS. People are read only when their consent is recorded (M24 safe default), so no list, search or map can show
// anyone else.

export const companies = cache((): Promise<DirectoryEntry[]> =>
  directoryEntries(getDb(), { includeSample: showSample() }),
);

const payload = () => getPayload({ config });

/** Published people whose consent to be listed is recorded. */
export async function people(): Promise<Person[]> {
  const p = await payload();
  const where: Where = { and: [publicWhere(), { consentRecorded: { equals: true } }] };
  const found = await p.find({ collection: "people", where, sort: "name", limit: 500, depth: 0 });
  return found.docs;
}

export async function person(slug: string): Promise<Person | null> {
  const p = await payload();
  const where: Where = { and: [publicWhere(), { consentRecorded: { equals: true } }, { slug: { equals: slug } }] };
  const found = await p.find({ collection: "people", where, limit: 1, depth: 0 });
  return found.docs[0] ?? null;
}

export async function associations(): Promise<Association[]> {
  const p = await payload();
  const found = await p.find({ collection: "associations", where: publicWhere(), sort: "name", limit: 500, depth: 0 });
  return found.docs;
}
