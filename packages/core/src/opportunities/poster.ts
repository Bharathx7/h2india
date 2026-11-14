import { schema, type Executor } from "@h2india/db";
import { and, eq, isNull } from "drizzle-orm";
import { can, type Actor } from "../authz";
import { initialsOf } from "../search/companies";

// Who may post a job (step 5.5, A68): any signed-in person who belongs to a company, posting as that company. Jobs
// are free; an editor checks every job before it goes live.

const { organisations: o, companyProfiles: p } = schema;

export interface JobPoster {
  organisationId: string;
  name: string;
  initials: string;
  /** The public profile, when the company has one. */
  slug: string | null;
  city: string | null;
  state: string | null;
  verified: boolean;
  kind: string;
}

/** The companies this person may post jobs for, in the order they joined; empty when they may not post. */
export async function jobPosters(db: Executor, actor: Actor): Promise<JobPoster[]> {
  const ids = [...actor.companies.keys()].filter((id) => can(actor, "company.view", { organisationId: id }));
  const out: JobPoster[] = [];
  for (const id of ids) {
    const [row] = await db
      .select({
        legalName: o.legalName,
        kind: o.kind,
        state: o.state,
        verification: o.verification,
        tradeName: p.tradeName,
        slug: p.slug,
        city: p.city,
      })
      .from(o)
      .leftJoin(p, eq(p.organisationId, o.id))
      .where(and(eq(o.id, id), isNull(o.deletedAt)));
    if (!row) continue;
    const name = row.tradeName ?? row.legalName;
    out.push({
      organisationId: id,
      name,
      initials: initialsOf(name),
      slug: row.slug,
      city: row.city,
      state: row.state,
      verified: row.verification === "Verified",
      kind: row.kind,
    });
  }
  return out;
}

/** Whether this person may change a job posted for this company (drafts and submitted jobs only; editors do the rest). */
export function mayEditJobPost(actor: Actor, organisationId: string | null | undefined): boolean {
  return Boolean(organisationId) && can(actor, "company.view", { organisationId });
}
