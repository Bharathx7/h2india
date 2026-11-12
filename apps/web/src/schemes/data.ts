import config from "@payload-config";
import type { BadgeTone } from "@h2india/ui";
import { getPayload, type Where } from "payload";
import { STATE_OPTIONS } from "@/cms/records/common";
import { schemeStatus, tenderStatus } from "@/cms/records/status";
import { publicWhere, showSample } from "@/cms/sample";
import { summarise, type ArticleSummary } from "@/news/data";
import { daysLeft, toneOf } from "@/opportunities/views";
import { dayMonthYear } from "@/news/format";
import type { Scheme, SightTracker, Tender, TrackerHub, TrackerPolicy, TrackerProject } from "@/payload-types";

// Schemes, the SIGHT tracker and state pages (step 5.4). Only what readers may see: published, and not sample where
// samples are hidden (A37). Statuses follow the dates (step 4.3); applications always happen on the official portal.

const payload = () => getPayload({ config });
const and = (...parts: Where[]): Where => ({ and: [publicWhere(), ...parts] });

export const stateLabel = (value: string) => STATE_OPTIONS.find((o) => o.value === value)?.label ?? value;

/** The badge tone for a scheme or tender status (Status badge 20:96). */
export { toneOf };

/** The agency line: "MNRE / SECI", or just the agency when the ministry is the same. */
export const agencyOf = (s: Pick<Scheme, "ministry" | "runBy">) =>
  s.ministry && s.ministry !== s.runBy ? `${s.ministry} / ${s.runBy}` : s.runBy;

export const stateValues = (s: Pick<Scheme, "states">) => (s.states ?? []).filter((v) => v !== "all-india");
export const isCentral = (s: Pick<Scheme, "states">) => stateValues(s).length === 0;

export interface SchemeView {
  id: number;
  slug: string;
  href: string;
  level: string;
  status: { label: string; tone: BadgeTone };
  title: string;
  benefit: string;
  who: string[];
  deadline: string;
  verified: string | null;
  /** For sorting and the "closing in 14 days" count. */
  deadlineAt: string | null;
  central: boolean;
  states: string[];
  agencies: string[];
  benefitTypes: string[];
}

export function schemeView(s: Scheme, now = new Date()): SchemeView {
  const status = schemeStatus({ nextDeadline: s.nextDeadline, override: s.statusOverride }, now);
  const states = stateValues(s);
  // "CENTRAL · MNRE / SECI", "STATE · GUJARAT" (411:9).
  const level = states.length ? `State · ${states.map(stateLabel).join(", ")}` : `Central · ${agencyOf(s)}`;
  const open = status === "Open" || status === "Closing soon";
  const deadline =
    s.nextDeadline && open
      ? `${s.deadlineNote?.trim() ? `${s.deadlineNote.trim()} due` : "Next deadline"} ${dayMonthYear(s.nextDeadline)} · ${daysLeft(s.nextDeadline, now)}`
      : s.deadlineNote?.trim() ||
        (s.nextDeadline ? `Next deadline ${dayMonthYear(s.nextDeadline)}` : "No deadline published");
  return {
    id: s.id,
    slug: s.slug,
    href: `/opportunities/schemes/${s.slug}`,
    level,
    status: { label: status, tone: toneOf(status) },
    title: s.name,
    benefit: s.summary,
    who: s.whoCanApply ?? [],
    deadline,
    verified: s.verification?.at ? dayMonthYear(s.verification.at) : null,
    deadlineAt: s.nextDeadline ?? null,
    central: states.length === 0,
    states,
    agencies: [s.runBy, s.ministry].filter((x): x is string => Boolean(x)),
    benefitTypes: s.benefitTypes ?? [],
  };
}

/** Every scheme readers may see. The hub filters these in memory: there are tens of schemes, not thousands. */
export async function allSchemes(): Promise<Scheme[]> {
  const res = await (
    await payload()
  ).find({ collection: "schemes", where: publicWhere(), limit: 500, depth: 0, sort: "name" });
  return res.docs;
}

export async function getScheme(slug: string): Promise<Scheme | null> {
  const res = await (
    await payload()
  ).find({ collection: "schemes", where: and({ slug: { equals: slug } }), limit: 1, depth: 1 });
  return res.docs[0] ?? null;
}

export interface TenderView {
  issuer: string;
  status: { label: string; tone: BadgeTone };
  title: string;
  tenderId: string;
  place: string;
  due: string;
  money: string;
  category: string;
  href: string;
  documentsHref: string;
  trackHref: string;
}

function placeOf(states: string[] | null | undefined): string {
  const list = (states ?? []).filter(Boolean);
  if (!list.length || list.includes("all-india")) return "Pan-India";
  return list.map(stateLabel).join(", ");
}

export function tenderView(t: Tender, now = new Date()): TenderView {
  const status = tenderStatus(t, now);
  const page = `/opportunities/tenders/${t.slug}`;
  return {
    issuer: t.issuer,
    status: { label: status, tone: toneOf(status) },
    title: t.title,
    tenderId: t.tenderId,
    place: placeOf(t.states),
    due: `Bid due ${dayMonthYear(t.bidDueAt)} · ${daysLeft(t.bidDueAt, now)}`,
    money: `Est. value: ${t.value?.trim() || "not published"} · EMD: ${t.emd?.trim() || "not published"}`,
    category: t.category?.replace(/\s*›\s*/g, " · ") ?? "",
    href: page,
    documentsHref: t.sourceUrl,
    trackHref: `${page}#track`,
  };
}

/** Tenders linked to these schemes, open ones first (Related tenders, 416:1354; open rounds, 418:2079). */
export async function tendersForSchemes(ids: number[], limit = 3): Promise<Tender[]> {
  if (!ids.length) return [];
  const res = await (
    await payload()
  ).find({ collection: "tenders", where: and({ schemes: { in: ids } }), sort: "-bidDueAt", limit, depth: 0 });
  const now = Date.now();
  return [...res.docs].sort((a, b) => {
    const aOpen = new Date(a.bidDueAt).getTime() > now;
    const bOpen = new Date(b.bidDueAt).getTime() > now;
    return aOpen === bOpen ? a.bidDueAt.localeCompare(b.bidDueAt) : aOpen ? -1 : 1;
  });
}

/** Stories that share a topic with the scheme, newest first (Related news). */
export async function newsForTopics(topicIds: number[], limit = 3): Promise<ArticleSummary[]> {
  if (!topicIds.length) return [];
  const res = await (
    await payload()
  ).find({
    collection: "articles",
    where: and({ topics: { in: topicIds } }, { type: { not_equals: "press_release" } }),
    sort: "-publishedAt",
    limit,
    depth: 1,
  });
  return res.docs.map(summarise);
}

/** The SIGHT tracker, or null where its figures are sample and samples are hidden (F9). */
export async function sightTracker(): Promise<SightTracker | null> {
  const doc = await (await payload()).findGlobal({ slug: "sight-tracker", depth: 0 });
  if (!doc.intro) return null;
  if (doc.sample && !showSample()) return null;
  return doc;
}

/** The SIGHT schemes: those run by SECI whose name starts with SIGHT. */
export async function sightSchemes(): Promise<Scheme[]> {
  const res = await (
    await payload()
  ).find({ collection: "schemes", where: and({ name: { like: "SIGHT" } }), limit: 20, depth: 0 });
  return res.docs;
}

// ---------- states (751:7362, 751:7856, 751:8302)

export interface StateData {
  value: string;
  name: string;
  policy: TrackerPolicy | null;
  projects: TrackerProject[];
  projectCount: number;
  hubs: TrackerHub[];
  schemes: Scheme[];
  tenders: Tender[];
}

const inState = (value: string): Where => ({ or: [{ states: { in: [value] } }] });

export async function stateData(value: string, now = new Date()): Promise<StateData> {
  const p = await payload();
  const [policy, projects, hubs, schemes, tenders] = await Promise.all([
    p.find({ collection: "tracker-policies", where: and({ state: { equals: value } }), limit: 1, depth: 0 }),
    p.find({
      collection: "tracker-projects",
      where: and({ state: { equals: value } }),
      limit: 4,
      depth: 0,
      sort: "-updatedAt",
    }),
    p.find({ collection: "tracker-hubs", where: and({ state: { equals: value } }), limit: 10, depth: 0 }),
    p.find({ collection: "schemes", where: and(inState(value)), limit: 20, depth: 0 }),
    p.find({
      collection: "tenders",
      where: and(inState(value), { bidDueAt: { greater_than: now.toISOString() } }),
      limit: 20,
      depth: 0,
      sort: "bidDueAt",
    }),
  ]);
  return {
    value,
    name: stateLabel(value),
    policy: policy.docs[0] ?? null,
    projects: projects.docs,
    projectCount: projects.totalDocs,
    hubs: hubs.docs,
    schemes: schemes.docs,
    tenders: tenders.docs,
  };
}

/** The states with a policy in the tracker, for choosing what to compare. */
export async function policyStates(): Promise<{ value: string; name: string }[]> {
  const res = await (
    await payload()
  ).find({ collection: "tracker-policies", where: publicWhere(), limit: 100, depth: 0, sort: "name" });
  return res.docs.map((d) => ({ value: d.state, name: stateLabel(d.state) }));
}

export async function allHubs(): Promise<TrackerHub[]> {
  const res = await (
    await payload()
  ).find({ collection: "tracker-hubs", where: publicWhere(), limit: 100, depth: 0, sort: "name" });
  return res.docs;
}
