import config from "@payload-config";
import { getDb } from "@h2india/core";
import type { Actor } from "@h2india/core/authz";
import { categoryRequestQueue } from "@h2india/core/catalogue/taxonomy";
import { claimsFor, companiesBrief, submitters, supplierQueue, type QueueKey } from "@h2india/core/queues";
import { getPayload } from "payload";

// Queue items that live in the CMS (step 11.2): content (press releases and pitches), events (submitted through the
// public form) and jobs companies post. Suppliers come from core; listings and RFQs have their own pages.

export interface QueueItem {
  id: string;
  title: string;
  line: string;
  submitter: string;
  organisation: string;
  submittedAt: Date | null;
  claimedBy: string | null;
  claimer: string | null;
  href: string;
}

export interface Check {
  label: string;
  ok: boolean;
  detail?: string;
}

const CONTENT_KINDS = ["press_release", "pitch"];
const KIND_LABEL: Record<string, string> = {
  press_release: "Press release",
  pitch: "Contributor article",
  event: "Event",
};

const s = (v: unknown) => (typeof v === "string" ? v : "");

export async function queueItems(actor: Actor, queue: QueueKey): Promise<QueueItem[]> {
  const db = getDb();
  if (queue === "suppliers") {
    const rows = await supplierQueue(db, actor);
    const claims = await claimsFor(
      db,
      queue,
      rows.map((r) => r.id),
    );
    return rows.map((r) => ({
      id: r.id,
      title: r.company,
      line: "Supplier review",
      submitter: r.submitter ?? "",
      organisation: r.company,
      submittedAt: r.submittedAt,
      claimedBy: claims.get(r.id)?.claimedBy ?? null,
      claimer: claims.get(r.id)?.name ?? null,
      href: `/admin/verification?org=${r.organisationId}`,
    }));
  }
  if (queue === "categories") {
    // Supplier QC, 16 Nov 2026: categories suppliers asked for; decided on their own page.
    const rows = await categoryRequestQueue(db, actor);
    const claims = await claimsFor(
      db,
      queue,
      rows.map((r) => r.id),
    );
    return rows.map((r) => ({
      id: r.id,
      title: r.label,
      line: "Category request",
      submitter: r.requester ?? "",
      organisation: r.company,
      submittedAt: r.createdAt,
      claimedBy: claims.get(r.id)?.claimedBy ?? null,
      claimer: claims.get(r.id)?.name ?? null,
      href: `/admin/queues/categories/${r.id}`,
    }));
  }
  if (queue === "comments") return []; // Public comments are off at launch (C9).
  const payload = await getPayload({ config });
  const docs: { id: string; title: string; kind: string; by: string; org: string; at: string | null }[] = [];
  if (queue === "jobs") {
    const res = await payload.find({
      collection: "jobs",
      where: { "post.state": { equals: "Submitted for review" } },
      draft: true,
      depth: 0,
      limit: 200,
      sort: "post.submittedAt",
      overrideAccess: true,
    });
    for (const j of res.docs)
      docs.push({
        id: String(j.id),
        title: j.role,
        kind: "Job",
        by: j.post?.submittedBy ?? "",
        org: j.post?.organisationId ?? "",
        at: j.post?.submittedAt ?? null,
      });
  } else {
    const res = await payload.find({
      collection: "submissions",
      where: {
        and: [
          { status: { equals: "Under review" } },
          queue === "events" ? { kind: { equals: "event" } } : { kind: { in: CONTENT_KINDS } },
        ],
      },
      depth: 0,
      limit: 200,
      sort: "createdAt",
      overrideAccess: true,
    });
    for (const d of res.docs)
      docs.push({
        id: String(d.id),
        title: d.title,
        kind: KIND_LABEL[d.kind] ?? d.kind,
        by: d.submittedBy ?? "",
        org: d.organisationId ?? "",
        at: d.createdAt,
      });
  }
  const [people, companies, claims] = await Promise.all([
    submitters(
      db,
      actor,
      docs.map((d) => d.by),
    ),
    companiesBrief(
      db,
      actor,
      docs.map((d) => d.org),
    ),
    claimsFor(
      db,
      queue,
      docs.map((d) => d.id),
    ),
  ]);
  return docs.map((d) => {
    const org = companies.get(d.org)?.name ?? "";
    return {
      id: d.id,
      title: d.title,
      line: [d.kind, org].filter(Boolean).join(" · "),
      submitter: people.get(d.by)?.name ?? "",
      organisation: org,
      submittedAt: d.at ? new Date(d.at) : null,
      claimedBy: claims.get(d.id)?.claimedBy ?? null,
      claimer: claims.get(d.id)?.name ?? null,
      href: `/admin/queues/${queue}/${d.id}`,
    };
  });
}

export interface ItemDetail {
  queue: QueueKey;
  id: string;
  title: string;
  reference: string;
  status: string;
  submitter: { id: string; name: string; email: string; verified: boolean } | null;
  organisation: string;
  submittedAt: Date | null;
  rows: [string, string][];
  checks: Check[];
  /** What the approved item is called in the outcome note. */
  listed: string;
}

export async function itemDetail(actor: Actor, queue: QueueKey, id: string): Promise<ItemDetail | null> {
  if (!/^\d+$/.test(id) || (queue !== "content" && queue !== "events" && queue !== "jobs")) return null;
  const db = getDb();
  const payload = await getPayload({ config });
  if (queue === "jobs") {
    const j = await payload
      .findByID({ collection: "jobs", id: Number(id), draft: true, depth: 0, overrideAccess: true })
      .catch(() => null);
    if (!j?.post?.reference) return null;
    const by = j.post.submittedBy ?? "";
    const org = j.post.organisationId ?? "";
    const [people, companies, dupes] = await Promise.all([
      submitters(db, actor, [by]),
      companiesBrief(db, actor, [org]),
      payload.count({
        collection: "jobs",
        where: {
          and: [
            { role: { equals: j.role } },
            { company: { equals: j.company } },
            { id: { not_equals: j.id } },
            { _status: { equals: "published" } },
          ],
        },
        overrideAccess: true,
      }),
    ]);
    const company = companies.get(org);
    const p = people.get(by);
    return {
      queue,
      id,
      title: j.role,
      reference: j.post.reference,
      status: j._status === "published" ? "Published" : (j.post.state ?? "Draft"),
      submitter: p ? { id: by, ...p } : null,
      organisation: company?.name ?? j.company,
      submittedAt: j.post.submittedAt ? new Date(j.post.submittedAt) : null,
      listed: "publish",
      rows: [
        ["Employment", j.jobType ?? ""],
        ["Location", [j.location, j.workMode].filter(Boolean).join(" · ")],
        ["Pay", j.salaryBand ?? "Not given"],
        ["Experience", j.experience ?? ""],
        ["How to apply", s(j.sourceUrl) || s(j.applyEmail)],
        [
          "Closes",
          j.closesAt
            ? new Date(j.closesAt).toLocaleDateString("en-IN", {
                timeZone: "Asia/Kolkata",
                day: "numeric",
                month: "short",
                year: "numeric",
              })
            : "",
        ],
      ],
      checks: [
        { label: "Company is a verified supplier", ok: company?.verified ?? false, detail: company?.name },
        { label: "Pay range given", ok: Boolean(j.salaryBand) },
        { label: "Location given", ok: Boolean(j.location) },
        { label: "Apply link given", ok: /^https:\/\//.test(s(j.sourceUrl)) || Boolean(s(j.applyEmail)) },
        { label: "Not a duplicate post", ok: dupes.totalDocs === 0 },
      ],
    };
  }
  const d = await payload
    .findByID({ collection: "submissions", id: Number(id), depth: 0, overrideAccess: true })
    .catch(() => null);
  if (!d) return null;
  if ((queue === "events") !== (d.kind === "event") || (queue === "content" && !CONTENT_KINDS.includes(d.kind)))
    return null;
  const v = (d.details ?? {}) as Record<string, unknown>;
  const by = d.submittedBy ?? "";
  const [people, companies] = await Promise.all([
    submitters(db, actor, [by]),
    companiesBrief(db, actor, [d.organisationId ?? ""]),
  ]);
  const p = people.get(by);
  const base = {
    queue,
    id,
    title: d.title,
    reference: d.reference,
    status: d.status,
    submitter: p ? { id: by, ...p } : null,
    organisation: companies.get(d.organisationId ?? "")?.name ?? "",
    submittedAt: new Date(d.createdAt),
  };
  if (queue === "events") {
    const venue = s(v.venue);
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
    return {
      ...base,
      listed: "list",
      rows: [
        ["Dates", [s(v.startDate), s(v.endDate)].filter(Boolean).join(" to ")],
        ["Format", [s(v.type), s(v.format)].filter(Boolean).join(" · ")],
        ["Venue", venue || "Online"],
        ["Organiser", [s(v.organiser), p?.email].filter(Boolean).join(" · ")],
        ["Registration link", s(v.link)],
        ["About", s(v.description)],
      ],
      checks: [
        { label: "Date is in the future", ok: s(v.startDate) >= today },
        {
          label: "Venue address given",
          ok: s(v.format) === "Online" || venue.includes(","),
          detail: s(v.format) !== "Online" && !venue.includes(",") ? "Only the city" : undefined,
        },
        { label: "Organiser contact verified", ok: p?.verified ?? false },
        { label: "Registration link given", ok: /^https:\/\//.test(s(v.link)), detail: s(v.link) },
      ],
    };
  }
  return {
    ...base,
    listed: "publish",
    rows: Object.entries(v)
      .filter(([k, x]) => typeof x === "string" && x && !["title", "logo"].includes(k))
      .map(
        ([k, x]) =>
          [
            k.charAt(0).toUpperCase() +
              k
                .slice(1)
                .replace(/([A-Z])/g, " $1")
                .toLowerCase(),
            String(x),
          ] as [string, string],
      ),
    checks: [
      { label: "Sender's company is verified", ok: companies.get(d.organisationId ?? "")?.verified ?? false },
      { label: "Sender's email and mobile verified", ok: p?.verified ?? false },
    ],
  };
}
