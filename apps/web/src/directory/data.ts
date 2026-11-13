import config from "@payload-config";
import { getDb } from "@h2india/core";
import { directoryEntries, type DirectoryEntry } from "@h2india/core/directory";
import { listedMember, listedMembers, type ListedMember } from "@h2india/core/members";
import { getPayload, type Where } from "payload";
import { cache } from "react";
import { publicWhere, showSample } from "@/cms/sample";
import type { Association, Person } from "@/payload-types";
import { getSession } from "@/server/auth";

// Public reads for the directory (step 6.6). Companies come from core (company profiles); people and associations from
// the CMS. People are read only when their consent is recorded (M24 safe default), so no list, search or map can show
// anyone else.

export const companies = cache((): Promise<DirectoryEntry[]> =>
  directoryEntries(getDb(), { includeSample: showSample() }),
);

const payload = () => getPayload({ config });

const AFFILIATION: Record<string, Person["affiliation"]> = {
  researcher: "Research institution",
  student: "Research institution",
  professional: "Company",
};

/** A member who turned on "Public profile" (545:8), in the shape the people pages show. Never an email or phone. */
function memberAsPerson(m: ListedMember, i: number): Person {
  const place = m.location.split(",").map((x) => x.trim());
  const available: NonNullable<Person["availableFor"]> = [];
  if (m.labels.includes("Available for speaking")) available.push("Speaking");
  if (m.labels.includes("Available for consulting")) available.push("Consulting");
  if (m.labels.includes("Open to collaboration")) available.push("Research collaboration");
  const now = new Date().toISOString();
  return {
    id: -1 - i,
    name: m.name,
    slug: m.slug,
    role: m.headline || "Member",
    organisation: m.organisation || null,
    city: place.length > 1 ? (place[0] ?? null) : null,
    state: place.at(-1) || null,
    affiliation: AFFILIATION[m.persona ?? ""] ?? "Independent",
    expertise: [],
    topics: [...m.expertise, ...m.interests].slice(0, 6),
    availableFor: available,
    bio: m.labels.filter((l) => l.startsWith("Looking")).join(" · ") || null,
    updatedAt: now,
    createdAt: now,
  };
}

/**
 * Published people whose consent to be listed is recorded, and, for signed-in visitors only, members who chose to be
 * listed (M24 answered c, step 7.4: "signed-in members can see your name, headline, interests...").
 */
export async function people(): Promise<Person[]> {
  const p = await payload();
  const where: Where = { and: [publicWhere(), { consentRecorded: { equals: true } }] };
  const found = await p.find({ collection: "people", where, sort: "name", limit: 500, depth: 0 });
  const signedIn = Boolean(await getSession().catch(() => null));
  const members = signedIn ? (await listedMembers(getDb())).map(memberAsPerson) : [];
  return [...found.docs, ...members].sort((a, b) => a.name.localeCompare(b.name));
}

export async function person(slug: string): Promise<Person | null> {
  if (slug.startsWith("m-")) {
    if (!(await getSession().catch(() => null))) return null;
    const m = await listedMember(getDb(), slug);
    return m ? memberAsPerson(m, 0) : null;
  }
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
