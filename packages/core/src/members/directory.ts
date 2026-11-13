import { schema, type Executor } from "@h2india/db";
import { and, eq } from "drizzle-orm";
import { topicLabel, type ProfileFields } from "./rules";

// Members in the people directory (M24 answered c, step 7.4): only members who turned on "Public profile" (545:8),
// shown only to signed-in visitors, as the profile page says. Never an email or a phone number.

const mp = schema.memberProfiles;
const u = schema.users;

export interface ListedMember {
  userId: string;
  /** "m-<user id>", the people directory address. */
  slug: string;
  name: string;
  persona: string | null;
  headline: string;
  location: string;
  /** Affiliation, institution or organisation. */
  organisation: string;
  interests: string[];
  expertise: string[];
  labels: string[];
  links: { title: string; url: string }[];
}

function view(row: {
  userId: string;
  name: string;
  persona: string | null;
  topics: string[];
  profile: unknown;
}): ListedMember {
  const f = (row.profile ?? {}) as ProfileFields;
  const labels = [
    f.openToCollaboration && row.persona === "researcher" ? "Open to collaboration" : null,
    f.internships && row.persona === "student" ? "Looking for internships" : null,
    f.speaking && row.persona === "professional" ? "Available for speaking" : null,
    f.consulting && row.persona === "professional" ? "Available for consulting" : null,
  ].filter((x): x is string => Boolean(x));
  return {
    userId: row.userId,
    slug: `m-${row.userId}`,
    name: row.name,
    persona: row.persona,
    headline: f.headline ?? "",
    location: f.location ?? "",
    organisation: f.affiliation ?? f.institution ?? f.organisation ?? "",
    interests: row.topics.map(topicLabel),
    expertise: row.persona === "researcher" || row.persona === "professional" ? (f.expertise ?? []) : [],
    labels,
    links: row.persona === "researcher" ? (f.links ?? []) : [],
  };
}

const columns = { userId: mp.userId, name: u.name, persona: mp.persona, topics: mp.topics, profile: mp.profile };

/** Members who chose to be listed. */
export async function listedMembers(db: Executor): Promise<ListedMember[]> {
  const rows = await db
    .select(columns)
    .from(mp)
    .innerJoin(u, eq(u.id, mp.userId))
    .where(eq(mp.listed, true))
    .orderBy(u.name);
  return rows.map(view);
}

export async function listedMember(db: Executor, slug: string): Promise<ListedMember | null> {
  const id = slug.startsWith("m-") ? slug.slice(2) : "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [row] = await db
    .select(columns)
    .from(mp)
    .innerJoin(u, eq(u.id, mp.userId))
    .where(and(eq(mp.userId, id), eq(mp.listed, true)));
  return row ? view(row) : null;
}
