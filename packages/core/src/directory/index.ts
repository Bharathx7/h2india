import type { Executor } from "@h2india/db";
import { companyDocuments } from "../search/companies";
import type { DirectoryEntry } from "./rules";

export * from "./rules";

/** Every public company profile as a directory entry (pre-seeded ones included; sample ones only with the flag). */
export async function directoryEntries(db: Executor, opts: { includeSample: boolean }): Promise<DirectoryEntry[]> {
  const docs = await companyDocuments(db, opts);
  return docs.map((d) => ({
    id: d.id,
    name: d.name,
    href: d.href,
    initials: d.initials,
    types: d.types,
    categories: d.categories,
    summary: d.summary,
    city: d.city,
    state: d.state,
    verified: d.verified,
    claimStatus: d.claimStatus,
  }));
}
