import config from "@payload-config";
import { audit, getDb, nextReference } from "@h2india/core";
import { loadActor, type Actor } from "@h2india/core/authz";
import {
  checkJobPost,
  jobPosters,
  type JobPoster,
  type JobPostErrors,
  type JobPostInput,
  type JobPostValues,
} from "@h2india/core/opportunities";
import { getPayload } from "payload";
import { STATE_OPTIONS } from "@/cms/records/states";
import { slugify } from "@/cms/slug";
import type { Job } from "@/payload-types";
import { getSession } from "@/server/auth";
import { requestContext } from "@/server/request-context";

// Post a job (467:7472, step 5.5; A68). A company user's job is saved as a draft in the Jobs collection with the
// company it was posted for. Submitting it puts it in the editors' queue ("Submitted for review"); an editor
// publishing it is the approval. The poster can change it until then, and never sets Featured (A69).

const payload = () => getPayload({ config });

export interface Poster {
  actor: Actor;
  userId: string;
  companies: JobPoster[];
}

/** The signed-in person and the companies they may post for, or null when signed out. */
export async function currentPoster(): Promise<Poster | null> {
  const session = await getSession().catch(() => null);
  if (!session) return null;
  const db = getDb();
  const actor = await loadActor(db, session.user.id);
  return { actor, userId: session.user.id, companies: await jobPosters(db, actor) };
}

/** A job this person's companies posted that hasn't been published yet; null for anyone else's (no hint it exists). */
export async function ownJobPost(poster: Poster, id: number): Promise<Job | null> {
  const orgs = poster.companies.map((c) => c.organisationId);
  if (!orgs.length || !Number.isInteger(id)) return null;
  const res = await (
    await payload()
  ).find({
    collection: "jobs",
    where: { and: [{ id: { equals: id } }, { "post.organisationId": { in: orgs } }] },
    draft: true,
    overrideAccess: true,
    limit: 1,
    depth: 0,
  });
  const job = res.docs[0];
  return job && job._status !== "published" ? job : null;
}

/** Every job this person's companies posted, newest first ("View my jobs"). */
export async function ownJobPosts(poster: Poster): Promise<Job[]> {
  const orgs = poster.companies.map((c) => c.organisationId);
  if (!orgs.length) return [];
  const res = await (
    await payload()
  ).find({
    collection: "jobs",
    where: { "post.organisationId": { in: orgs } },
    draft: true,
    overrideAccess: true,
    sort: "-updatedAt",
    limit: 50,
    depth: 0,
  });
  return res.docs;
}

/** The state of "Ratnagiri, Maharashtra", for the location filter. */
function stateOf(location: string): string[] {
  const words = location.toLowerCase();
  const found = STATE_OPTIONS.find((o) => o.value !== "all-india" && words.includes(o.label.toLowerCase()));
  return found ? [found.value] : [];
}

async function freeSlug(base: string, id: number | null): Promise<string> {
  const p = await payload();
  for (let n = 1; n < 50; n += 1) {
    const slug = n === 1 ? base : `${base}-${String(n)}`;
    const res = await p.find({
      collection: "jobs",
      where: { slug: { equals: slug } },
      draft: true,
      overrideAccess: true,
      limit: 1,
      depth: 0,
    });
    const other = res.docs[0];
    if (!other || other.id === id) return slug;
  }
  return `${base}-${String(Date.now())}`;
}

export type SaveIntent = "draft" | "preview" | "submit";

export type SaveResult =
  { ok: true; id: number; reference: string | null } | { ok: false; errors: JobPostErrors; message?: string };

/** Saves a draft, or checks it fully and saves it (preview), or submits it for review. */
export async function saveJobPost(
  poster: Poster,
  input: JobPostInput & { id?: number | null; organisationId: string },
  intent: SaveIntent,
): Promise<SaveResult> {
  const company = poster.companies.find((c) => c.organisationId === input.organisationId);
  if (!company) return { ok: false, errors: {}, message: "You can post jobs only for your own company." };
  const existing = input.id ? await ownJobPost(poster, input.id) : null;
  if (input.id && !existing) return { ok: false, errors: {}, message: "This job can no longer be changed here." };

  const checked = checkJobPost(input, { complete: intent !== "draft" });
  if (!checked.ok) return { ok: false, errors: checked.errors };
  // A draft may be incomplete, so every value can still be missing here.
  const v: Partial<JobPostValues> = checked.values;
  if (!v.role) return { ok: false, errors: { role: "Enter the job title" } };

  const now = new Date();
  const submit = intent === "submit";
  const reference = existing?.post?.reference ?? (submit ? await nextReference(getDb(), "JOB", now) : null);
  const slug = existing?.slug ?? (await freeSlug(slugify(`${v.role} ${company.name}`), null));
  const data = {
    role: v.role,
    slug,
    company: company.name,
    companySlug: company.slug,
    companyLine: [company.kind === "supplier" ? "Supplier" : null, company.city].filter(Boolean).join(" · ") || null,
    function: v.function ?? null,
    jobType: v.jobType ?? null,
    experience: v.experience ?? null,
    description: v.description ?? "",
    skills: v.skills ?? [],
    location: v.location ?? "",
    workMode: v.workMode ?? null,
    states: stateOf(v.location ?? ""),
    salaryBand: v.salaryBand ?? null,
    howToApply: "link" as const,
    sourceUrl: v.sourceUrl ?? "",
    closesAt: v.closesAt ?? null,
    featured: existing?.featured ?? false,
    post: {
      state: submit ? ("Submitted for review" as const) : (existing?.post?.state ?? ("Draft" as const)),
      reference,
      organisationId: company.organisationId,
      submittedBy: poster.userId,
      submittedAt: submit ? now.toISOString() : (existing?.post?.submittedAt ?? null),
    },
    _status: "draft" as const,
  };
  const p = await payload();
  const doc = existing
    ? await p.update({ collection: "jobs", id: existing.id, data: data as never, draft: true, overrideAccess: true })
    : await p.create({ collection: "jobs", data: data as never, draft: true, overrideAccess: true });
  if (submit) {
    await audit(getDb(), {
      actorId: poster.userId,
      action: "job.submitted",
      resourceType: "jobs",
      resourceId: String(doc.id),
      companyId: company.organisationId,
      after: { reference, role: v.role, closesAt: v.closesAt },
      context: await requestContext(),
    });
  }
  return { ok: true, id: doc.id, reference };
}

/** The form's values from a saved job, for editing it again. */
export function inputOf(job: Job): JobPostInput & { id: number; organisationId: string } {
  const [from, to] = (job.salaryBand ?? "").split("–");
  return {
    id: job.id,
    organisationId: job.post?.organisationId ?? "",
    role: job.role,
    function: job.function ?? "",
    jobType: job.jobType ?? "Full-time",
    experience: job.experience ?? "",
    description: job.description,
    skills: job.skills ?? [],
    location: job.location,
    workMode: job.workMode ?? "On site",
    showSalary: Boolean(job.salaryBand),
    salaryFrom: from ?? "",
    salaryTo: to ?? from ?? "",
    applyBy: "link",
    careersUrl: job.sourceUrl,
    closesOn: job.closesAt
      ? new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date(job.closesAt))
      : "",
  };
}
